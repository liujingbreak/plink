import * as rx from 'rxjs';
import {SingleActionFactory, SimplexReactor} from '@wfh/reactivizer';
import {IntervalTree} from '@wfh/algorithms';
import {isCodePointFullWidth} from '../process-common';

export interface TerminalCanvasInput {
  setTop(y: number): SingleActionFactory;
  setHeight(h: number): SingleActionFactory;
  addString(x: number, y: number, text: string): SingleActionFactory;
  clearLines(yBegin: number, yEndInclude: number): SingleActionFactory;
  render(): SingleActionFactory;
}

export interface TerminalCanvasOutput {
  boundingSize(x: number, y: number): SingleActionFactory;
  /** In context of "render", x, y are both absolute 0 based coordinates value */
  printText(x: number, y: number, text: string): SingleActionFactory;
}

const tableFor = ['boundingSize', 'setHeight', 'setTop'] as const;

export function createTerminalCanvas() {
  const reactor = new SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, typeof tableFor>({
    name: 'TerminalCanvas',
    tableFor
  });
  const {r, s} = reactor;
  const dirtyLines = new Set<number>();
  // "lines" is an array of IntervalTree, each element of which represents a single line of display text of screen.
  // The intervalTree is a tree containing single or multiple discrete intervals which represents display text
  const lines = [] as (IntervalTree<number[]> | undefined)[];
  r('setHeight', s.pt.setHeight.pipe(
    rx.map(([, v]) => v),
    rx.scan((prev, curr) => {
      if (curr < prev) {
        lines.splice(curr);
      }
      return curr;
    })
  ));
  // r('setTop', s.pt.setTop.pipe(
  //   rx.map(([, top]) => {

  //   })
  // ));

  r('addString -> ', s.pt.addString.pipe(
    rx.map(([, x, y, text]) => {
      let line = lines[y];
      if (line == null) {
        line = new IntervalTree();
        lines[y] = line;
      }
      const units = getTextDisplayUnits(text);
      const endPos = units.length + x;
      const overlaps = [...line.searchMultipleOverlaps(x, units.length + x)];
      const [finalLow, finalHigh, unitedUnits] = uniteDisplayUnits([x, endPos, units], overlaps as any);
      for (const [low, high] of overlaps) {
        line.deleteInterval(low, high);
      }
      const node = line.insertInterval(finalLow, finalHigh);
      node.value = unitedUnits;
      dirtyLines.add(y);
    })
  ));
  r('clearLine', s.pt.clearLines.pipe(
    rx.map(([, y1, y2]) => {
      for (let i = y1; i <= y2; i++) {
        lines[i] = undefined;
        dirtyLines.delete(i);
      }
    })
  ));
  r('render -> printText', s.pt.render.pipe(
    rx.map(([m]) => {
      for (const lineIdx of dirtyLines) {
        const tree = lines[lineIdx]!;
        tree.inorderWalk((node) => {
          s.ft.printText(node.int![0], lineIdx, String.fromCodePoint(...node.value.filter(codePoint => codePoint >= 0))).dp(m);
        });
      }
      dirtyLines.clear();
    })
  ));
  s.ft.setHeight(0).dp();
  return reactor;
}

export type TerminalCanvas = SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, typeof tableFor>;

function getTextDisplayUnits(text: string) {
  const screenLineBuffer = [] as number[];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (isCodePointFullWidth(code)) {
      screenLineBuffer.push(code, -1);
    } else {
      screenLineBuffer.push(code);
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
