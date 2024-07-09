import rl from 'node:readline';
import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import chalk from 'chalk';
import {SingleActionFactory, SimplexReactor} from '@wfh/reactivizer';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {IntervalTree} from '@wfh/algorithms';
// import {stringifyRbTree} from '@wfh/algorithms/dist/utils';
import {isCodePointFullWidth} from '../process-common';
import {BaseWidgetActions} from './terminal-widget';

export type TextStyle = (typeof chalk.Modifiers | typeof chalk.Color | `rgb(${number},${number},${number})` | `hsl(${string})` | `bgHsl(${string})` | `bgRgb(${number},${number},${number})` | `hex(${string})` | `bgHex(${string})`)[];
export type BackgroundStyle = typeof chalk.BackgroundColor | `bgRgb(${number},${number},${number})` | `bgHex(${string})` | `bgHsl(${string})`;

const CHALK_NUMBER_FN = new Set<string>(['rgb', 'bgRgb', 'bgHsl', 'hsl']);
export interface TerminalRootActions {
  render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  setSize: BaseWidgetActions['setSize'];
}

enum RenderMode {dirty = 0, clearLine, clearScreen}

export interface TerminalCanvasInput {
  /** Set to `true` for rerender all lines even those lines are not changed, this way it clears terminal screen for every frame, default is `false` */
  setRenderMode(mode: RenderMode): SingleActionFactory;
  /** render will not work until this message is dispatched */
  setBounding(left: number, top: number, width: number, height: number): SingleActionFactory;
  setRootWidget<I extends TerminalRootActions>(rootWidget: SimplexReactor<I, any> | null): SingleActionFactory;
  addString(x: number, y: number, text: string, style?: TextStyle): SingleActionFactory;
  addDisplayUnits(x: number, y: number, units: number[], style?: TextStyle): SingleActionFactory;
  /** Unlike print ' ' (space), this action only remove existing "code point" from buffer for rendering */
  clearRect(x: number, y: number, width: number, height: number): SingleActionFactory;
  render(): SingleActionFactory;

  copyRect(x: number, y: number, width: number, height: number): SingleActionFactory;
  doneCopyRect(lines: (IntervalTree<readonly [units: number[], style: string]> | undefined)[]): SingleActionFactory;
}

export interface TerminalCanvasOutput {
  /** In context of "render", x, y are both absolute 0 based coordinates value */
  onPrintText(x: number, y: number, text: string): SingleActionFactory;
  onClearLine(y: number, x?: number, dir?: 0 | 1 | -1): SingleActionFactory;
}

const tableFor = ['setRenderMode', 'setBounding', 'setRootWidget'] as const;

export function createTerminalCanvas() {
  const canvas = new SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, typeof tableFor>({
    name: 'TerminalCanvas',
    log(...args) {
      // eslint-disable-next-line no-console
      console.log(formatToConciseNoColor(...args));
    },
    tableFor
  });
  const {r, s, table} = canvas;
  const dirtyLines = new Map<number, [lowColumn: number, highColumn: number]>();
  // "lines" is an array of IntervalTree, each element of which represents a single line of display text of screen.
  // The intervalTree is a tree containing single or multiple discrete intervals which represents display text
  const lines = [] as (IntervalTree<[units: number[], style: string]> | undefined)[];
  r('setBounding -> rootWidget.setSize', s.pt.setBounding.pipe(
    rx.switchMap(([m, , , w, h]) => {
      return table.l.setRootWidget.pipe(
        rx.map(([, root]) => {
          if (root)
            root.s.ft.setSize(w, h).dp(m);
        })
      );
    })
  ));
  r('setBounding -> "lines"', s.pt.setBounding.pipe(
    rx.map(([, , , , h]) => h),
    rx.scan((prev, curr) => {
      if (curr < prev) {
        lines.splice(curr);
      }
      return curr;
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
  r('clearRect', s.pt.clearRect.pipe(
    rx.map(([, x, y, w, h]) => {
      for (let i = y, l = y + h; i < l; i++) {
        const dirtyRange = clearCodePointFromLine(x, i, w);
        // console.log('after clearCodePointFromLine', x, i, w, h, dirtyRange);
        if (dirtyRange) {
          const lastChange = dirtyLines.get(y);
          if (lastChange) {
            lastChange[0] = Math.min(lastChange[0], dirtyRange[0]);
            lastChange[1] = Math.max(lastChange[1], dirtyRange[1]);
          } else {
            dirtyLines.set(i, [dirtyRange[0], dirtyRange[1]]);
          }
        }
      }
      // console.log('clearRect done', '#' + m.i);
    })
  ));
  r('onPrintText', s.pt.onPrintText.pipe(
    rx.map(([, x, y, text]) => {
      rl.cursorTo(process.stdout, x, y);
      process.stdout.write(text);
    })
  ));
  r('onClearLine', s.pt.onClearLine.pipe(
    rx.map(([, y, x, dir]) => {
      if (x != null) {
        rl.cursorTo(process.stdout, x, y);
        rl.clearLine(process.stdout, dir ?? 1);
      } else {
        rl.cursorTo(process.stdout, 0, y);
        rl.clearLine(process.stdout, 0);
      }
    })
  ));
  r('render -> onPrintText', s.pt.render.pipe(
    rx.withLatestFrom(table.l.setBounding, table.l.setRootWidget, table.l.setRenderMode),
    rx.map(([[m], [, x, y, screenWidth], [, root], [, renderMode]]) => {
      if (root)
        root.s.ft.render(canvas, mat4.create()).dp(m);
      if (renderMode === RenderMode.clearScreen) {
        rl.cursorTo(process.stdout, 0, y);
        rl.clearScreenDown(process.stdout);
        for (let i = 0, l = lines.length; i < l; i++) {
          const tree = lines[i];
          const top = i + y;
          if (tree) {
            tree.inorderWalk(node => {
              if (node.highValuesTree) {
                node.highValuesTree.inorderWalk(n => {
                  const text = treeNodeToStyleText(n.value);
                  s.ft.onPrintText(node.int![0], top, text).dp(m);
                });
              } else {
                const text = treeNodeToStyleText(node.value);
                s.ft.onPrintText(node.int[0], top, text).dp(m);
              }
            });
          }
        }
      } else if (renderMode === RenderMode.dirty) {
        for (const [lineIdx, [left, right]] of dirtyLines) {
          const overlaps = [...lines[lineIdx]!.searchMultipleOverlaps(left, right - 1)];
          let offset = left;
          // console.log('dirty', left, right);
          const printingText = [] as string[];
          for (const [eLow, eHigh, data] of overlaps.sort(([a], [b]) => a - b)) {
            // canvas.log('offset', offset, 'eLow', eLow, 'eHigh', eHigh, 'len', data[0].length);
            let chopStart = 0;
            let chopEnd = data[0].length;
            if (offset < eLow) {
              printingText.push(' '.repeat(eLow - offset));
            } else {
              chopStart = offset - eLow;
            }
            if (eHigh < right) {
              offset = eHigh + 1;
            } else {
              chopEnd -= eHigh + 1 - right;
              offset = right;
            }
            printingText.push(treeNodeToStyleText([data[0].slice(chopStart, chopEnd), data[1]]));
          }
          if (offset < right) {
            printingText.push(' '.repeat(right - offset));
          }
          s.ft.onPrintText(left + x, lineIdx + y, printingText.join('')).dp(m);
        }
        dirtyLines.clear();
      } else {
        for (const [lineIdx, [low, high]] of dirtyLines) {
          const top = lineIdx + y;
          if ((screenWidth - low) < high) {
            // consider direction of clearLine: low -> right edge of screen
            s.ft.onClearLine(top, low, 1).dp(m);
            const overlap = lines[lineIdx]!.searchSingleOverlap(low, low);
            if (overlap?.int) {
              const [start] = overlap.int;
              const [units, style] = overlap.value;
              // Only print part of the overlapped node
              const text = treeNodeToStyleText([units.slice(low - start), style]);
              s.ft.onPrintText(low, top, text).dp(m);
              for (const node of lines[lineIdx]!.keysGreaterThan(low)) {
                const text = treeNodeToStyleText(node.value);
                s.ft.onPrintText(node.int![0], y, text).dp(m);
              }
            } else {
              const err = new Error('screen cache tree should not contain overlapped content:\n' + overlap);
              canvas.dispatchErrorFor(err, m);
              throw err;
            }
          } else {
            // consider direction of clearLine: left edge of screen -> high
            s.ft.onClearLine(top, high, -1).dp(m);
            const overlap = lines[lineIdx]!.searchSingleOverlap(high - 1, high - 1);
            if (overlap?.int) {
              const [start] = overlap.int;
              const [units, style] = overlap.value;
              // Only print part of the overlapped node
              const text = treeNodeToStyleText([units.slice(0, high - start), style]);
              s.ft.onPrintText(start, top, text).dp(m);
              for (const node of lines[lineIdx]!.keysSmallererThan(start)) {
                const text = treeNodeToStyleText(node.value);
                s.ft.onPrintText(node.int![0], top, text).dp(m);
              }
            } else {
              const err = new Error('screen cache tree should not contain overlapped content:\n' + overlap);
              canvas.dispatchErrorFor(err, m);
              throw err;
            }
          }
          const tree = lines[lineIdx];
          if (tree) {
            tree.inorderWalk(node => {
              const text = treeNodeToStyleText(node.value);
              s.ft.onPrintText(node.int![0], top, text).dp(m);
            });
          }
        }
        dirtyLines.clear();
      }
    })
  ));
  r('copyRect -> doneCopyRect', s.pt.copyRect.pipe(
    rx.map(([m, x, y, w, h]) => {
      const copied = lines.slice(y, y + h).map((lineTree) => {
        if (lineTree == null)
          return undefined;
        const overlaps = lineTree.searchMultipleOverlaps(x, x + h - 1);
        const newTree = new IntervalTree<readonly [units: number[], style: string]>();
        for (const [low, high, [units, style]] of overlaps) {
          let newUnits = units;
          let newLow = low;
          let newHigh = high;
          if (low < x) {
            newLow = x;
            newUnits = units.slice(x - low);
            if (units[x - low] === -1) {
              // a full-width character it is
              newUnits[0] = SPACE_CODE_POINT;
            }
          }
          if (high >= x + w) {
            newHigh = x + w - 1;
            newUnits = newUnits.slice(newUnits.length - (high + 1 - x - w));
            if (isCodePointFullWidth(newUnits[newUnits.length - 1])) {
              newUnits[newUnits.length - 1] = SPACE_CODE_POINT;
            }
          }
          newTree.insertInterval(newLow, newHigh).value = [newUnits, style];
        }
        return newTree;
      });
      s.ft.doneCopyRect(copied).dp(m);
    })
  ));
  s.ft.setRenderMode(RenderMode.dirty).dp();
  s.ft.setRootWidget(null).dp();

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
    const overlaps = [...line.searchMultipleOverlaps(x, endPos - 1)];
    // canvas.log('>>> line\n', stringifyRbTree(line));
    // canvas.log('>>> overlaps', ...overlaps.map(([l, h]) => `${l}-${h}`));
    const newDisplayNodes = uniteDisplayUnits([x, endPos - 1, units, style.join(';')], overlaps.map(([l, h, [units, style]]) => [l, h, units, style]));

    for (const [low, high] of overlaps) {
      line.deleteInterval(low, high);
    }
    // canvas.log('>>> addCodePointsToCanvas', `y:${y} x: ${x} endPos: ${endPos} units.length:`, units.length);
    for (const [low, high, units, style] of newDisplayNodes) {
      // canvas.log('>>> addCodePointsToCanvas insert', `low:${low} high: ${high} units.length:`, units.length);
      const node = line.insertInterval(low, high);
      node.value = [units, style];
    }
    const lastChange = dirtyLines.get(y);
    if (lastChange) {
      lastChange[0] = Math.min(lastChange[0], x);
      lastChange[1] = Math.max(lastChange[1], endPos);
    } else {
      dirtyLines.set(y, [x, endPos]);
    }
  }

  function clearCodePointFromLine(x: number, y: number, width: number) {
    const line = lines[y];
    if (line == null)
      return null;
    const endPos = x + width;
    // console.log('\n' + stringifyRbTree(line, node => '-' + node.maxHighOfMulti));
    const overlaps = [...line.searchMultipleOverlaps(x, endPos - 1)];
    if (overlaps.length === 0)
      return null;
    for (const [low, high] of overlaps) {
      // console.log('clearCodePointFromLine delete', low, high);
      line.deleteInterval(low, high);
    }
    // console.log('clearCodePointFromLine middle deleted', overlaps.length);
    // const dirtyRange = [x, x + width - 1];
    let dirtyRange = null as [number, number] | null;
    for (const overlap of overlaps) {
      const [low, high, [units, style]] = overlap;
      if (dirtyRange == null) {
        dirtyRange = [low, high + 1];
      }
      if (low < dirtyRange[0])
        dirtyRange[0] = low;
      if (low < x) {
        dirtyRange[0] = x;
        let chopEnd = x;
        if (isCodePointFullWidth(units[x - low - 1])) {
          chopEnd = x - 1;
        }
        const choppedUnits = units.slice(0, chopEnd - low);
        const newNode = line.insertInterval(low, chopEnd - 1);
        newNode.value = [choppedUnits, style];
      }
      if (high >= dirtyRange[1])
        dirtyRange[1] = high + 1;
      if (high >= endPos) {
        dirtyRange[1] = endPos;
        let chopStart = endPos;
        if (units[0] === -1) {
          chopStart = endPos + 1;
        }
        const choppedUnits = units.slice(chopStart - low);
        const newNode = line.insertInterval(chopStart, high);
        newNode.value = [choppedUnits, style];
      }
    }
    return dirtyRange;
  }
  return canvas;
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

/** Inputed and returned "high" value is considered as an "included" value of range interval */
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
          prependUnits[prependUnits.length - 1] = SPACE_CODE_POINT;
        }
        oUnits.unshift(...prependUnits);
      } else {
        const choppedUnits = eUnits.slice(0, l - el);
        if (isCodePointFullWidth(choppedUnits[choppedUnits.length - 1])) {
          // A full width character is being chopped in the middle by overlapped new text, remove that character
          choppedUnits[choppedUnits.length - 1] = SPACE_CODE_POINT;
        }
        // create a separate node
        choppedExistings.push([el, l - 1, choppedUnits, eStyle]);
      }
    }
    if (eh > h) {
      if (style === eStyle) {
        // case of same style, merge two unit
        finalHigh = eh;
        const appendUnits = eUnits.slice(h - el + 1, eUnits.length);
        if (appendUnits[0] === -1) {
          // A full width character is being chopped in the middle by overlapped new text, replace that character with a space
          appendUnits[0] = SPACE_CODE_POINT;
        }
        oUnits.push(...appendUnits);
      } else {
        const choppedUnits = eUnits.slice(h - el + 1, eUnits.length);
        if (choppedUnits[0] === -1) {
          choppedUnits[0] = SPACE_CODE_POINT;
        }
        // create a separate node
        choppedExistings.push([h + 1, eh, choppedUnits, eStyle]);
      }
    }
  }
  choppedExistings.push([finalLow, finalHigh, oUnits, style]);
  return choppedExistings;
}
