import rl from 'node:readline';
import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor} from '@wfh/reactivizer';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {IntervalTree} from '@wfh/algorithms';
import {isCodePointFullWidth} from '../process-common';
import {BaseWidgetActions} from './terminal-widget';

export interface TerminalRootActions {
  render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  setSize: BaseWidgetActions['setSize'];
}

export interface TerminalCanvasInput {
  /** Set to `true` for rerender all lines even those lines are not changed, this way it clears terminal screen for every frame, default is `false` */
  setAlwaysRerenderAll(alwaysRerender: boolean): SingleActionFactory;
  setClientWindowSize(w: number, h: number): SingleActionFactory;
  setTop(y: number): SingleActionFactory;
  setHeight(h: number | 'full'): SingleActionFactory;
  setRootWidget(rootActions: TerminalRootActions): SingleActionFactory;
  addString(x: number, y: number, text: string): SingleActionFactory;
  addDisplayUnits(x: number, y: number, units: number[]): SingleActionFactory;
  clearLines(yBegin: number, yEndInclude: number): SingleActionFactory;
  render(): SingleActionFactory;
}

export interface TerminalCanvasOutput {
  onSize(x: number, y: number): SingleActionFactory;
  /** In context of "render", x, y are both absolute 0 based coordinates value */
  onPrintText(x: number, y: number, text: string): SingleActionFactory;
  onClearLine(y: number): SingleActionFactory;
}

const tableFor = ['setAlwaysRerenderAll', 'onSize', 'setHeight', 'setTop', 'setRootWidget'] as const;

export function createTerminalCanvas() {
  const reactor = new SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, typeof tableFor>({
    name: 'TerminalCanvas',
    log(...args) {
      // eslint-disable-next-line no-console
      console.log(formatToConciseNoColor(...args));
    },
    tableFor
  });
  const {r, s, table} = reactor;
  const dirtyLines = new Set<number>();
  // "lines" is an array of IntervalTree, each element of which represents a single line of display text of screen.
  // The intervalTree is a tree containing single or multiple discrete intervals which represents display text
  const lines = [] as (IntervalTree<number[]> | undefined)[];
  r('setHeight -> setTop"', s.pt.setHeight.pipe(
    rx.mergeMap(a => s.pt.setClientWindowSize.pipe(
      rx.take(1), rx.map(b => [a, b] as const)
    )),
    rx.map(([[m, v], [, w, h]]) => {
      const numHeight = v === 'full' ? h : v;
      s.ft.setTop(h - numHeight).dp(m);
      s.ft.onSize(w, h).dp(m);
      return numHeight;
    }),
    rx.scan((prev, curr) => {
      if (curr < prev) {
        lines.splice(curr);
      }
      return curr;
    })
  ));
  r('onSize -> rootWidget.setSize', s.pt.onSize.pipe(
    rx.switchMap(sizePayload => table.l.setRootWidget.pipe(
      rx.take(1),
      rx.map(rootWidget => [sizePayload, rootWidget] as const)
    )),
    rx.map(([[m, w, h], [, rootWidget]]) => {
      rootWidget.setSize(w, h).dp(m);
    })
  ));
  r('addDisplayUnits', s.pt.addDisplayUnits.pipe(
    rx.map(([, x, y, units]) => {
      addCodePointsToCanvas(x, y, units);
    })
  ));
  r('addString -> ', s.pt.addString.pipe(
    rx.map(([, x, y, text]) => {
      const units = [...getTextDisplayUnits(text)];
      addCodePointsToCanvas(x, y, units);
    })
  ));
  r('clearLines', s.pt.clearLines.pipe(
    rx.map(([, y1, y2]) => {
      for (let i = y1; i <= y2; i++) {
        lines[i] = undefined;
        dirtyLines.delete(i);
      }
    })
  ));
  r('onPrintText', s.pt.onPrintText.pipe(
    rx.map(([, x, y, text]) => {
      rl.cursorTo(process.stdout, x, y);
      process.stdout.write(text);
    })
  ));
  r('onClearLine', s.pt.onClearLine.pipe(
    rx.map(([, y]) => {
      rl.cursorTo(process.stdout, 0, y);
      rl.clearLine(process.stdout, 0);
    })
  ));
  r('render -> onPrintText', s.pt.render.pipe(
    rx.withLatestFrom(s.pt.setTop, table.l.setRootWidget, table.l.setAlwaysRerenderAll),
    rx.map(([[m], [, top], [, root], [, rerender]]) => {
      root.render(reactor, mat4.create()).dp(m);
      if (rerender) {
        rl.cursorTo(process.stdout, 0, top);
        rl.clearScreenDown(process.stdout);
        for (let i = 0, l = lines.length; i < l; i++) {
          const tree = lines[i];
          const y = i + top;
          if (tree) {
            tree.inorderWalk((node) => {
              s.ft.onPrintText(node.int![0], y, String.fromCodePoint(...node.value.filter(codePoint => codePoint >= 0))).dp(m);
            });
          }
        }
      } else {
        for (const lineIdx of dirtyLines) {
          const tree = lines[lineIdx]!;
          const y = lineIdx + top;
          s.ft.onClearLine(y).dp(m);
          tree.inorderWalk((node) => {
            s.ft.onPrintText(node.int![0], y, String.fromCodePoint(...node.value.filter(codePoint => codePoint >= 0))).dp(m);
          });
        }
        dirtyLines.clear();
      }
    })
  ));
  s.ft.setHeight('full').dp();
  s.ft.setAlwaysRerenderAll(false).dp();

  function addCodePointsToCanvas(x: number, y: number, units: number[]) {
    let line = lines[y];
    if (line == null) {
      line = new IntervalTree();
      lines[y] = line;
    }
    const endPos = units.length + x;
    const overlaps = [...line.searchMultipleOverlaps(x, units.length + x)];
    const [finalLow, finalHigh, unitedUnits] = uniteDisplayUnits([x, endPos, units], overlaps as any);
    for (const [low, high] of overlaps) {
      line.deleteInterval(low, high);
    }
    const node = line.insertInterval(finalLow, finalHigh);
    node.value = unitedUnits;
    dirtyLines.add(y);
  }
  return reactor;
}

export type TerminalCanvas = SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, typeof tableFor>;
export function* getTextDisplayUnits(text: string) {
  const screenLineBuffer = [] as number[];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (isCodePointFullWidth(code)) {
      yield code;
      yield -1;
    } else {
      yield code;
    }
  }
  return screenLineBuffer;
}

const SPACE_CODE_POINT = ' '.codePointAt(0)!;

function uniteDisplayUnits<T extends [low: number, high: number, units: number[]]>(overlap: T, exitings: T[]) {
  const [l, h, oUnits] = overlap;
  const exitingLower = exitings.find(([low]) => low < l);
  const exitingHigher = exitings.find(([, high]) => high > h);
  let finalLow = l, finalHigh = h;
  if (exitingLower) {
    const [pl, , pUnits] = exitingLower;
    finalLow = pl;
    const prependUnits = pUnits.slice(0, l - pl);
    if (isCodePointFullWidth(prependUnits[prependUnits.length - 1])) {
      // A full width character is being chopped in the middle by overlapped new text, replace that character with a space
      oUnits.unshift(...prependUnits.slice(0, prependUnits.length - 1), SPACE_CODE_POINT);
    } else {
      oUnits.unshift(...prependUnits);
    }
  }
  if (exitingHigher) {
    const [al, ah, aUnits] = exitingHigher;
    finalHigh = ah;
    const appendUnits = aUnits.slice(h - al, aUnits.length);
    if (appendUnits[0] === -1) {
      // A full width character is being chopped in the middle by overlapped new text, replace that character with a space
      oUnits.push(SPACE_CODE_POINT, ...appendUnits.slice(1));
    } else {
      oUnits.push(...appendUnits);
    }
  }
  return [finalLow, finalHigh, oUnits] as const;
}
