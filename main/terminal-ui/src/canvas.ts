import rl from 'node:readline';
import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import chalk from 'chalk';
import {SingleActionFactory, SimplexReactor, SimplexReactorOptions} from '@wfh/reactivizer';
import {IntervalTree} from '@wfh/algorithms';
// import {stringifyRbTree} from '@wfh/algorithms/dist/utils';
import {isCodePointFullWidth} from './text-split';
import {BaseWidget} from './base';
import {KeyEventServcie} from './keyEvent';
import {RectangleOverlapTree} from './rectangle-overlap-tree';

export type TextStyle = (typeof chalk.Modifiers | typeof chalk.Color | `rgb(${number},${number},${number})` | `hsl(${string})` |
                         `bgHsl(${string})` | `bgRgb(${number},${number},${number})` | `hex(${string})` | `bgHex(${string})` |
                         `ansi(${string})` | `ansi256(${string})` | `bgAnsi(${string})` | `bgAnsi256(${string})`)[];
export type BackgroundStyle = typeof chalk.BackgroundColor | `bgRgb(${number},${number},${number})` | `bgHex(${string})` | `bgHsl(${string})` | `bgAnsi(${string})` | `bgAnsi256(${string})`;

const CHALK_NUMBER_FN = new Set<string>(['rgb', 'bgRgb', 'bgHsl', 'hsl', 'hex', 'bgHex', 'ansi', 'bgAnsi', 'ansi256', 'bgAnsi256']);

export interface TerminalCanvasInput {
  /** render will not work until this message is dispatched */
  setBounding(left: number, top: number, width: number, height: number): SingleActionFactory;
  setRootComponent(rootWidget: BaseWidget | null): SingleActionFactory;
  addString(x: number, y: number, text: string, style?: TextStyle): SingleActionFactory;
  addDisplayUnits(x: number, y: number, units: number[], style?: TextStyle): SingleActionFactory;
  /** Unlike print ' ' (space), this action only remove existing "code point" from buffer for rendering */
  clearRect(x: number, y: number, width: number, height: number): SingleActionFactory;
  /** Set to `true`, canvas will automatically execute render() in setImmediate phase as response to previous message "requestRender",
   * otherwise consumer must manually call render() to actually render buffered content to output stream,
   * default is `false`
   **/
  setRenderOnRequest(enabled: boolean): SingleActionFactory;
  /** request bundling rendering */
  requestRender(rect?: Rectangle): SingleActionFactory;
  /** render immediately */
  render(rect?: Rectangle[]): SingleActionFactory;
  fillRect(x: number, y: number, width: number, height: number, bg: BackgroundStyle): SingleActionFactory;
  copyRect(x: number, y: number, width: number, height: number): SingleActionFactory;
  /** Response: onCopyRect */
  copyDirtyRectAndClear(x: number, y: number, width: number, height: number): SingleActionFactory;
  autoHideCursor(): SingleActionFactory;
  scrollUp(lines: number): SingleActionFactory;
  scrollDown(lines: number): SingleActionFactory;
  /** Replied by "doneReportCursor", Terminal-keyEvent service must be enabled before dispatching this action */
  reportCursor(keyEventService: KeyEventServcie): SingleActionFactory;
}

export interface TerminalCanvasEvents extends TerminalCanvasInput {
  /** In context of "render", x, y are both absolute 0 based coordinates value */
  onPrintText(x: number, y: number, text: string): SingleActionFactory;
  onClearLine(y: number, x?: number, dir?: 0 | 1 | -1): SingleActionFactory;
  onCopyRect(paintables: Array<[xLow: number, xHigh: number, y: number, units: number[], style: string]>): SingleActionFactory;
  doneCopyRect(lines: (IntervalTree<readonly [units: number[], style: string]> | undefined)[]): SingleActionFactory;
  onDirtyLineChange(lines: Map<number, [lowColumn: number, highColumn: number]>): SingleActionFactory;
  /** In context of action "reportCursor" */
  doneReportCursor(row: number, col: number): SingleActionFactory;
}

const tableFor = ['setBounding', 'setRootComponent', 'onDirtyLineChange'] as const;

export type TerminalCanvas = SimplexReactor<TerminalCanvasInput & TerminalCanvasEvents, typeof tableFor>;
export type TerminalCanvasOptions = Partial<SimplexReactorOptions<TerminalCanvasInput & TerminalCanvasEvents, typeof tableFor>>;
export function createTerminalCanvas(opts?: TerminalCanvasOptions) {
  const canvas = new SimplexReactor<TerminalCanvasEvents, typeof tableFor>({
    name: 'Canvas',
    // debugExcludeTypes: ['requestRender'],
    tableFor,
    ...opts
  });
  const {r, s, table} = canvas;
  const dirtyLines = new Map<number, [lowColumn: number, highColumn: number]>();
  // "lines" is an array of IntervalTree, each element of which represents a single line of display text of screen.
  // The intervalTree is a tree containing single or multiple discrete intervals which represents display text
  const lines = [] as (IntervalTree<[units: number[], style: string]> | undefined)[];
  // A array of line cache to represent latest changes.
  // When "addDisplayUnits", "clearRect"... is handled, "uncommited" is created or updated,
  // in "render" phase, it is "merged" to "lines", and corresponding "onPrintText" will be dispatched,
  // handling "onPrintText" is actually where to invoke text output through stand output stream.
  // To avoid screen flickering, we use space character to clear screen instead of using API to clear lines.
  const uncommited = [] as (IntervalTree<[units: number[], style: string]> | undefined)[];
  r('autoHideCursor', s.pt.autoHideCursor.pipe(
    rx.map(() => {
      process.stdout.write('\x1B[?25l');
      const reset = () => process.stdout.write('\x1B[?25h');
      process.on('exit', reset);
      process.on('SIGINT', () => {
        reset();
        process.exit(0);
      });
    }),
    rx.take(1)
  ));
  r('scrollUp', s.pt.scrollUp.pipe(
    rx.map(([, lines]) => {
      process.stdout.write('\x1B[' + lines + 'S');
    })
  ));
  r('scrollDown', s.pt.scrollDown.pipe(
    rx.map(([, lines]) => {
      process.stdout.write('\x1B[' + lines + 'T');
    })
  ));
  // Refer to https://en.wikipedia.org/wiki/ANSI_escape_code
  r('reportCursor', s.pt.reportCursor.pipe(
    rx.switchMap(([m, keyEventService]) => {
      return rx.merge(
        keyEventService.s.pt.onReportCursor.pipe(
          rx.take(1),
          rx.map(([, x, y]) => s.ft.doneReportCursor(x, y).dp(m))
        ),
        new rx.Observable(sub => {
          process.stdout.write('\x1B[6n');
          sub.complete();
        }));
    })
  ));
  r('setRootComponent', s.pt.setRootComponent.pipe(
    rx.switchMap(([m, root]) => {
      if (root)
        return new rx.Observable(() => {
          root.s.ft.ofCanvas(canvas).dp(m);
          root.s.ft.onDetached(false).dp(m);
          return () => root.s.ft.onDetached(true).dp(m);
        });
      return rx.EMPTY;
    })
  ));
  r('setBounding -> rootComponent.onSize', s.pt.setBounding.pipe(
    rx.switchMap(([m, , , w, h]) => {
      return table.l.setRootComponent.pipe(
        rx.map(([, root]) => {
          if (root) {
            root.s.ft.onSize(w, h).dp(m);
            root.s.ft.onPosition(0, 0).dp(m);
          }
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
      if (units.length > 0)
        addCodePointsToCanvas(x, y, units, style ? style.sort() : []);
    })
  ));
  r('addString -> ', s.pt.addString.pipe(
    rx.map(([, x, y, text, style]) => {
      const units = [...getTextDisplayUnits(text)];
      if (units.length > 0)
        addCodePointsToCanvas(x, y, units, style ? style.sort() : []);
    })
  ));
  r('fillRect', s.pt.fillRect.pipe(
    rx.map(([, x, y, w, h, bg]) => {
      const units = [...getTextDisplayUnits(' '.repeat(w))];
      const style = [bg];
      for (let i = y, l = y + h; i < l; i++) {
        addCodePointsToCanvas(x, i, units, style ? style.sort() : []);
      }
    })
  ));
  r('clearRect', s.pt.clearRect.pipe(
    rx.map(([, x, y, w, h]) => {
      for (let i = y, l = y + h; i < l; i++) {
        clearCodePointFromLine(x, i, w);
        // if (dirtyRange) {
        //   const lastChange = dirtyLines.get(i);
        //   if (lastChange) {
        //     lastChange[0] = Math.min(lastChange[0], dirtyRange[0]);
        //     lastChange[1] = Math.max(lastChange[1], dirtyRange[1]);
        //   } else {
        //     dirtyLines.set(i, [dirtyRange[0], dirtyRange[1]]);
        //   }
        // }
        // canvas.log('#### clearRect line', i, dirtyLines.get(y));
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
    rx.withLatestFrom(table.l.setBounding, table.l.setRootComponent),
    rx.map(([[m, rects], [, x, y, w, h], [, root]]) => {
      if (root)
        root.s.ft.render(canvas, mat4.create(), rects ?? [[0, 0, w, h] as const]).dp(m);
      for (const [lineIdx, [left, right]] of dirtyLines) {
        const overlaps = [...lines[lineIdx]!.searchMultipleOverlaps(left, right - 1)];
        let offset = left;
        // canvas.log('#### dirty', left, right);
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
        // canvas.log('#### printingText', printingText);
        if (offset < right) {
          printingText.push(' '.repeat(right - offset));
        }
        s.ft.onPrintText(left + x, lineIdx + y, printingText.join('')).dp(m);
      }
      dirtyLines.clear();
    })
  ));
  r('copyRect -> onCopyRect', s.pt.copyRect.pipe(
    rx.map(([m, x, y, w, h]) => {
      const result = [] as [xLow: number, xHigh: number, y: number, units: number[], style: string][];
      lines.slice(y, y + h).forEach((lineTree, i) => {
        if (lineTree == null)
          return undefined;
        const overlaps = lineTree.searchMultipleOverlaps(x, x + w - 1);
        // const newTree = new IntervalTree<readonly [units: number[], style: string]>();
        for (const [low, high, [units, style]] of overlaps) {
          let newUnits = units;
          let newLow = low;
          let newHigh = high;
          if (low < x) {
            newLow = x;
            newUnits = units.slice(x - low);
            if (newUnits[0] === -1) {
              // a full-width character it is
              newUnits[0] = SPACE_CODE_POINT;
            }
          }
          if (high >= x + w) {
            newHigh = x + w - 1;
            newUnits = newUnits.slice(0, newUnits.length - (high + 1 - x - w));
            if (isCodePointFullWidth(newUnits[newUnits.length - 1])) {
              newUnits[newUnits.length - 1] = SPACE_CODE_POINT;
            }
          }
          result.push([newLow - x, newHigh - x, i, newUnits, style] as const);
          // newTree.insertInterval(newLow, newHigh).value = [newUnits, style];
        }
      });
      s.ft.onCopyRect(result).dp(m);
    })
  ));
  r('copyDirtyRectAndClear -> onCopyRect', s.pt.copyDirtyRectAndClear.pipe(
    rx.map(([m, x, y, w, h]) => {
      const result = [] as [xLow: number, xHigh: number, y: number, units: number[], style: string][];
      for (let lineIdx = y, l = y + h; lineIdx < l; lineIdx++) {
        const line = dirtyLines.get(lineIdx);
        if (line == null)
          continue;

        const overlaps = [...lines[lineIdx]!.searchMultipleOverlaps(x, x + w - 1)];
        for (const [low, high, [units, style]] of overlaps) {
          let newUnits = units;
          let newLow = low;
          let newHigh = high;
          if (low < x) {
            newLow = x;
            newUnits = units.slice(x - low);
            if (newUnits[0] === -1) {
              // a full-width character it is
              newUnits[0] = SPACE_CODE_POINT;
            }
          }
          if (high >= x + w) {
            newHigh = x + w - 1;
            newUnits = newUnits.slice(0, newUnits.length - (high + 1 - x - w));
            if (isCodePointFullWidth(newUnits[newUnits.length - 1])) {
              newUnits[newUnits.length - 1] = SPACE_CODE_POINT;
            }
          }
          result.push([newLow - x, newHigh - x, lineIdx - y, newUnits, style] as const);
          // newTree.insertInterval(newLow, newHigh).value = [newUnits, style];
        }
        dirtyLines.delete(lineIdx);
      }
      s.ft.onCopyRect(result).dp(m);
    })
  ));
  r('setRenderOnRequest, requestRender -> render', s.pt.setRenderOnRequest.pipe(
    // rx.observeOn(rx.queueScheduler),
    rx.switchMap(([, enabled]) => {
      // let suspended: ActionMeta | false = false; // Has recursive render request?
      const rectTree = new RectangleOverlapTree();
      let hasWaitReq = false;
      // eslint-disable-next-line multiline-ternary
      return enabled ? s.pt.requestRender.pipe(
        // rx.observeOn(rx.queueScheduler),
        rx.mergeMap(([m, rect]) => {
          return table.l.setBounding.pipe(
            rx.take(1),
            rx.map(([, ...bounding]) => {
              hasWaitReq = true;
              rectTree.addOrUnionRectOnOverlap(rect ?? bounding, null);
              // canvas.log('rectTree', [...rectTree.allRectangles()].length);
              return m;
            })
          );
        }),
        rx.sampleTime(200),
        rx.filter(() => hasWaitReq),
        rx.exhaustMap(m => new rx.Observable(sub => {
          const rects = [...rectTree.allRectangles()];
          rectTree.clear();
          s.ft.render(rects.map(([r]) => r)).dp(m);
          hasWaitReq = false;
          // If there are more recursive requests
          // if (hasWaitReq) {
          //   hasWaitReq = false;
          //   const rects = [...rectTree.allRectangles()];
          //   rectTree.clear();
          //   s.ft.render(rects.map(([r]) => r)).dp(m);
          // }
          sub.complete();
        }))
      ) : rx.EMPTY;
    })
  ));
  r('init', new rx.Observable<never>(() => {
    s.ft.setRootComponent(null).dp();
    s.ft.onDirtyLineChange(dirtyLines).dp();
  }));

  function treeNodeToStyleText([codePoints, style]: [units: number[], style?: string]) {
    const text = String.fromCodePoint(...codePoints.filter(codePoint => codePoint >= 0));
    if (style) {
      const chalkFn = style.split(';').reduce((chalkInst, keyword) => {
        if (keyword.indexOf('(') < 0) {
          if (chalkInst == null)
            throw new Error(`Chalk is null for keyword "${keyword}" of ` + style);
          return chalkInst[keyword as keyof chalk.Chalk] as chalk.Chalk;
        } else {
          const match = /([^()]+)\(([^)]+)\)/.exec(keyword);
          if (match) {
            const fn = match[1];
            if (CHALK_NUMBER_FN.has(fn)) {
              const params = match[2].trim().split(',').map(v => v.startsWith('#') ? v : Number(v));
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
  /** add code points to "uncommited" line cache */
  function addCodePointsToCanvas(x: number, y: number, units: number[], style: TextStyle) {
    if (y < 0)
      return;
    if (x < 0) {
      // units of negative coordinate should not be printed, so slice them
      const cutOffLen = 0 - x;
      units = units.slice(cutOffLen);
      if (isCodePointFullWidth(units[0])) {
        units[0] = SPACE_CODE_POINT;
      }
      x = 0;
    }
    let line = uncommited[y];
    if (line == null) {
      line = new IntervalTree();
      uncommited[y] = line;
    }
    const endPos = units.length + x;
    const overlaps = [...line.searchMultipleOverlaps(x, endPos - 1)];
    // canvas.log('>>> line\n', stringifyRbTree(line));
    // canvas.log('>>> overlaps', ...overlaps.map(([l, h]) => `${l}-${h}`));
    const newDisplayNodes = uniteDisplayUnits(
      [x, endPos - 1, units, style.join(';')],
      overlaps.map(([l, h, [units, style]]) => [l, h, units, style])
    );

    for (const [low, high] of overlaps) {
      line.deleteInterval(low, high);
    }
    // canvas.log('>>> addCodePointsToCanvas', `y:${y} x: ${x} endPos: ${endPos} units.length:`, units.length);
    for (const [low, high, units, style] of newDisplayNodes) {
      // canvas.log('>>> addCodePointsToCanvas insert', `low:${low} high: ${high} units.length:`, units.length);
      const node = line.insertInterval(low, high);
      node.value = [units, style];
    }
  }

  /**
   * 1) delete overlaps from "uncommited"
   * 2) fill white spaces to "uncommited" for all overlaps on "lines"
   */
  function clearCodePointFromLine(x: number, y: number, width: number) {
    if (y < 0)
      return;
    if (x < 0) {
      width -= 0 - x;
      x = 0;
    }
    const uncLine = uncommited[y];
    const endPos = x + width;
    if (uncLine != null) {
      // console.log('\n' + stringifyRbTree(uncLine, node => '-' + node.maxHighOfMulti));
      const overlaps = [...uncLine.searchMultipleOverlaps(x, endPos - 1)];
      for (const [low, high] of overlaps) {
        // console.log('clearCodePointFromLine delete', low, high);
        if (low >= x || high < endPos)
          uncLine.deleteInterval(low, high);
      }
      // deal with full-width character
      for (const overlap of overlaps) {
        const [low, high, [units, style]] = overlap;
        if (low < x) {
          const chopEnd = x - low;
          if (isCodePointFullWidth(units[chopEnd - 1])) {
            units[chopEnd - 1] = SPACE_CODE_POINT;
          }
          const choppedUnits = units.slice(0, chopEnd);
          const newNode = uncLine.insertInterval(low, x - 1);
          newNode.value = [choppedUnits, style];
        }
        if (high >= endPos) {
          if (units[endPos - low] === -1) {
            units[endPos - low] = SPACE_CODE_POINT;
          }
          const choppedUnits = units.slice(endPos - low);
          const newNode = uncLine.insertInterval(endPos, high);
          newNode.value = [choppedUnits, style];
        }
      }
    }
    // To find out where to put white space
    const line = lines[y];
    if (line) {
      const overlaps = [...line.searchMultipleOverlaps(x, endPos - 1)];
      for (const [low, high] of overlaps) {
        const wsStart = low < x ? x : low;
        const wsEnd = high >= endPos ? endPos : high + 1;
        if (uncLine) {
          const overlaps = [...uncLine.searchMultipleOverlaps(wsStart, wsEnd - 1)];
          // TODO:
        }
      }
    }
  }
  return canvas;
}

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
function uniteDisplayUnits<T extends [low: number, high: number, units: number[], style: string]>(
  overlap: T, existings: T[]
) {
  const [l, h, units, style] = overlap;
  const oUnits = [...units];
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

function rangeIntersection(low1: number, high1: number, low2: number, high2: number) {
  const overlap = [low1 > low2 ? low1 : low2, high1 > high2 ? high2 : high1];
  return overlap[0] <= overlap[1] ? overlap as [number, number] : null;
}
export type Range = [low: number, high: number];
export type Rectangle = [x: number, y: number, w: number, h: number];

export function rectIntersection([x1, y1, w1, h1]: Rectangle, [x2, y2, w2, h2]: Rectangle): Rectangle | null {
  const hoz = rangeIntersection(x1, x1 + w1, x2, x2 + w2);
  if (hoz == null)
    return null;
  const vert = rangeIntersection(y1, y1 + h1, y2, y2 + h2);
  if (vert == null)
    return null;
  return [hoz[0], vert[0], hoz[1] - hoz[0], vert[1] - vert[0]];
}
