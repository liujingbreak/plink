import rl from 'node:readline';
import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import chalk from 'chalk';
import {SingleActionFactory, SimplexReactor} from '@wfh/reactivizer';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {IntervalTree} from '@wfh/algorithms';
import {isCodePointFullWidth} from '../process-common';
import {BaseWidgetActions} from './terminal-widget';

export type TextStyle = (typeof chalk.Modifiers | typeof chalk.Color | `rgb(${number},${number},${number})` | `bgRgb(${number},${number},${number})` | `hex${string}` | `bgHex${string}`)[];
const CHALK_NUMBER_FN = new Set<string>(['rgb', 'bgRgb', 'bgHsl', 'hsl']);
export interface TerminalRootActions {
  render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  setSize: BaseWidgetActions['setSize'];
}

export interface TerminalCanvasInput {
  /** Set to `true` for rerender all lines even those lines are not changed, this way it clears terminal screen for every frame, default is `false` */
  setAlwaysRerenderAll(alwaysRerender: boolean): SingleActionFactory;
  /** render will not work until this message is dispatched */
  setClientWindowSize(w: number, h: number): SingleActionFactory;
  setTop(y: number): SingleActionFactory;
  setHeight(h: number | 'full'): SingleActionFactory;
  setRootWidget(rootActions: TerminalRootActions): SingleActionFactory;
  addString(x: number, y: number, text: string, style?: TextStyle): SingleActionFactory;
  addDisplayUnits(x: number, y: number, units: number[], style?: TextStyle): SingleActionFactory;
  clearRect(x: number, y: number, width: number, height: number): SingleActionFactory;
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
  const lines = [] as (IntervalTree<[units: number[], style: string]> | undefined)[];
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
    rx.map(([, x, y, units, style]) => {
      addCodePointsToCanvas(x, y, units, style ? style.sort() : []);
    })
  ));
  r('addString -> ', s.pt.addString.pipe(
    rx.map(([, x, y, text, style]) => {
      const units = [...getTextDisplayUnits(text)];
      addCodePointsToCanvas(x, y, units, style ? style.sort() : []);
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
  r('clearRect', s.pt.clearRect.pipe());
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
            tree.inorderWalk(node => {
              if (node.highValuesTree) {
                node.highValuesTree.inorderWalk(n => {
                  const text = treeNodeToStyleText(n.value);
                  s.ft.onPrintText(node.int![0], y, text).dp(m);
                });
              } else {
                const text = treeNodeToStyleText(node.value);
                s.ft.onPrintText(node.int![0], y, text).dp(m);
              }
            });
          }
        }
      } else {
        for (const lineIdx of dirtyLines) {
          const tree = lines[lineIdx]!;
          const y = lineIdx + top;
          s.ft.onClearLine(y).dp(m);
          tree.inorderWalk((node) => {
            const text = treeNodeToStyleText(node.value);
            s.ft.onPrintText(node.int![0], y, text).dp(m);
          });
        }
        dirtyLines.clear();
      }
    })
  ));
  s.ft.setHeight('full').dp();
  s.ft.setAlwaysRerenderAll(false).dp();

  function treeNodeToStyleText([codePoints, style]: [units: number[], style?: string]) {
    const text = String.fromCodePoint(...codePoints.filter(codePoint => codePoint >= 0));
    if (style) {
      const chalkFn = style.split(';').reduce((chalkInst, keyword) => {
        if (keyword.indexOf('(') < 0) {
          return chalkInst[keyword as keyof chalk.Chalk] as chalk.Chalk;
        } else {
          const match = /([^()]+)\(([^)]+)\)/.exec(keyword);
          if (match) {
            const fn = match[1];
            if (CHALK_NUMBER_FN.has(fn)) {
              const params = match[2].trim().split(',').map(v => Number(v));
              return chalkInst[fn as 'rgb'](...params as [number, number, number]);
            }
          }
        }
        throw new Error('TerminalCanvas does not support chalk style keyword: ' + keyword);
      }, chalk as chalk.Chalk);
      return chalkFn(text);
    } else {
      return text;
    }
  }
  function addCodePointsToCanvas(x: number, y: number, units: number[], style: TextStyle) {
    let line = lines[y];
    if (line == null) {
      line = new IntervalTree();
      lines[y] = line;
    }
    const endPos = units.length + x;
    const overlaps = [...line.searchMultipleOverlaps(x, endPos)];
    const newDisplayNodes = uniteDisplayUnits([x, endPos, units, style.join(';')], overlaps.map(([l, h, [units, style]]) => [l, h, units, style]));
    for (const [low, high] of overlaps) {
      line.deleteInterval(low, high);
    }
    for (const [low, high, units, style] of newDisplayNodes) {
      const node = line.insertInterval(low, high);
      node.value = [units, style];
    }
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

function uniteDisplayUnits<T extends [low: number, high: number, units: number[], style: string]>(overlap: T, existings: T[]) {
  const [l, h, oUnits, style] = overlap;
  let finalLow = l, finalHigh = h;
  const choppedExistings = [] as [low: number, high: number, units: number[], style: string][];
  for (const existing of existings) {
    const [el, eh, eUnits, eStyle] = existing;
    if (el < l) {
      if (style === eStyle) {
        // case of same style, merge two unit
        finalLow = el;
        const prependUnits = eUnits.slice(0, l - el);
        if (isCodePointFullWidth(prependUnits[prependUnits.length - 1])) {
          // A full width character is being chopped in the middle by overlapped new text, replace that character with a space
          oUnits.unshift(...prependUnits.slice(0, prependUnits.length - 1), SPACE_CODE_POINT);
        } else {
          oUnits.unshift(...prependUnits);
        }
      } else {
        const choppedUnits = eUnits.slice(0, l - el);
        if (isCodePointFullWidth(choppedUnits[choppedUnits.length - 1])) {
          // A full width character is being chopped in the middle by overlapped new text, remove that character
          choppedUnits.pop();
        }
        // create a separate node
        choppedExistings.push([el, l, choppedUnits, eStyle]);
      }
    }
    if (eh > h) {
      if (style === eStyle) {
        // case of same style, merge two unit
        finalHigh = eh;
        const appendUnits = eUnits.slice(h - el, eUnits.length);
        if (appendUnits[0] === -1) {
          // A full width character is being chopped in the middle by overlapped new text, replace that character with a space
          oUnits.push(SPACE_CODE_POINT, ...appendUnits.slice(1));
        } else {
          oUnits.push(...appendUnits);
        }
      } else {
        const choppedUnits = eUnits.slice(h - el, eUnits.length);
        if (choppedUnits[0] === -1) {
          choppedUnits.shift();
          // create a separate node
          choppedExistings.push([h + 1, eh, choppedUnits, eStyle]);
        } else {
          // create a separate node
          choppedExistings.push([h, eh, choppedUnits, eStyle]);
        }
      }
    }
  }
  choppedExistings.push([finalLow, finalHigh, oUnits, style]);
  return choppedExistings;
}
