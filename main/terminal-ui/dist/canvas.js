"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPACE_CODE_POINT = exports.canvasFac = void 0;
exports.createTerminalCanvas = createTerminalCanvas;
exports.getTextDisplayUnits = getTextDisplayUnits;
exports.uniteDisplayUnits = uniteDisplayUnits;
exports.rectIntersection = rectIntersection;
exports.treeNodeToStyleText = treeNodeToStyleText;
exports.debugLineTrees = debugLineTrees;
exports.debugLineTree = debugLineTree;
/* eslint-disable multiline-ternary */
const node_readline_1 = __importDefault(require("node:readline"));
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const chalk_1 = __importDefault(require("chalk"));
const reactivizer_1 = require("@wfh/reactivizer");
const algorithms_1 = require("@wfh/algorithms");
const text_split_1 = require("./text-split");
const rectangle_overlap_tree_1 = require("./rectangle-overlap-tree");
const CHALK_NUMBER_FN = new Set(['rgb', 'bgRgb', 'bgHsl', 'hsl', 'hex', 'bgHex', 'ansi', 'bgAnsi', 'ansi256', 'bgAnsi256']);
const tableFor = ['setBounding', 'setRootComponent', 'internalCache'];
exports.canvasFac = new reactivizer_1.BaseReactorFactory({
    name: 'canvas', tableFor
}).defineReactor((init, opts) => {
    const canvas = init(opts);
    const { r, ft, pt, table } = canvas;
    // "lines" is an array of IntervalTree, each element of which represents a single line of display text of screen.
    // The intervalTree is a tree containing single or multiple discrete intervals which represents display text
    let lines = [];
    // screen lines for next frame
    const proLines = [];
    // A array of line cache to represent latest changes.
    // When "addDisplayUnits", "clearRect"... is handled, "uncommited" is created or updated,
    // in "render" phase, it is "merged" to "lines", and corresponding "onPrintText" will be dispatched,
    // handling "onPrintText" is actually where to invoke text output through stand output stream.
    // To avoid screen flickering, we use space character to clear screen instead of using API to clear lines.
    let uncommited = [];
    r('autoHideCursor', pt.autoHideCursor.pipe(rx.map(() => {
        process.stdout.write('\x1B[?25l');
        const reset = () => process.stdout.write('\x1B[?25h');
        process.on('exit', reset);
        process.on('SIGINT', () => {
            reset();
            process.exit(0);
        });
    }), rx.take(1)));
    r('scrollUp', pt.scrollUp.pipe(rx.map(([, lines]) => {
        process.stdout.write('\x1B[' + lines + 'S');
    })));
    r('scrollDown', pt.scrollDown.pipe(rx.map(([, lines]) => {
        process.stdout.write('\x1B[' + lines + 'T');
    })));
    // Refer to https://en.wikipedia.org/wiki/ANSI_escape_code
    r('reportCursor -> doneReportCursor', pt.reportCursor.pipe(rx.switchMap(([m, keyEventService]) => {
        return rx.merge(keyEventService.pt.onReportCursor.pipe(rx.take(1), rx.map(([, x, y]) => ft.doneReportCursor(x - 1, y - 1).dp(m))), new rx.Observable(sub => {
            process.stdout.write('\x1B[6n');
            sub.complete();
        }));
    })));
    r('setRootComponent', pt.setRootComponent.pipe(rx.switchMap(([m, root]) => {
        if (root)
            return new rx.Observable(() => {
                root.ft.ofCanvas(canvas).dp(m);
                root.ft.onDetached(false).dp(m);
                return () => root.ft.onDetached(true).dp(m);
            });
        return rx.EMPTY;
    })));
    r('setBounding -> rootComponent.onSize', pt.setBounding.pipe(rx.switchMap(([m, , , w, h]) => {
        return table.l.setRootComponent.pipe(rx.map(([, root]) => {
            if (root) {
                root.ft.onSize(w, h).dp(m);
                root.ft.onPosition(0, 0).dp(m);
            }
        }));
    })));
    r('setBounding -> "lines"', pt.setBounding.pipe(rx.map(([, , , , h]) => h), rx.scan((prev, curr) => {
        if (curr < prev) {
            lines.splice(curr);
        }
        return curr;
    })));
    r('addDisplayUnits', pt.addDisplayUnits.pipe(rx.map(([, x, y, units, style, byPassFilter]) => {
        if (units.length > 0)
            addCodePointsToCache(x, y, units, style ? style.sort() : [], byPassFilter === true);
    })));
    r('addString -> ', pt.addString.pipe(rx.map(([, x, y, text, style, byPassFilter]) => {
        const units = [...getTextDisplayUnits(text)];
        if (units.length > 0)
            addCodePointsToCache(x, y, units, style ? style.sort() : [], byPassFilter === true);
    })));
    r('fillRect', pt.fillRect.pipe(rx.map(([, x, y, w, h, bg]) => {
        const units = [...getTextDisplayUnits(' '.repeat(w))];
        const style = [bg];
        for (let i = y, l = y + h; i < l; i++) {
            addCodePointsToCache(x, i, units, style ? style.sort() : [], false);
        }
    })));
    r('clearRect', pt.clearRect.pipe(rx.mergeMap(([, x, y, w, h]) => {
        return rx.range(y, h).pipe(rx.mergeMap(i => clearCodePointsFromCache(x, i, w)));
    })));
    r('onPrintText', pt.onPrintText.pipe(rx.map(([, x, y, text]) => {
        node_readline_1.default.cursorTo(process.stdout, x, y);
        process.stdout.write(text);
    })));
    r('onClearLine', pt.onClearLine.pipe(rx.map(([, y, x, dir]) => {
        if (x != null) {
            node_readline_1.default.cursorTo(process.stdout, x, y);
            node_readline_1.default.clearLine(process.stdout, dir !== null && dir !== void 0 ? dir : 1);
        }
        else {
            node_readline_1.default.cursorTo(process.stdout, 0, y);
            node_readline_1.default.clearLine(process.stdout, 0);
        }
    })));
    r('render... -> onPrintText', pt.render.pipe(rx.withLatestFrom(table.l.setBounding, table.l.setRootComponent), rx.map(([[m, rects], [, x, y, w, h], [, root]], idx) => {
        // canvas.log('>> before uncommited', debugLineTrees(uncommited));
        if (root)
            root.ft.render(canvas, gl_matrix_1.mat4.create(), rects !== null && rects !== void 0 ? rects : [[0, 0, w, h]]).dp(m);
        // ft.takeSnapshot({noColor: true, type: 'uncommited'}).re(m).od(pt.didTakeSnapshot).pipe(
        //   rx.take(1),
        //   rx.map(([, lines]) => canvas.log('snapshot 1.5 uncommited\n' + [...lines].join('')))
        // ).subscribe();
        // ft.takeSnapshot({noColor: true, type: 'pro'}).re(m).od(pt.didTakeSnapshot).pipe(
        //   rx.take(1),
        //   rx.map(([, lines]) => canvas.log('snapshot 1.6 proLines\n' + [...lines].join('')))
        // ).subscribe();
        let lineIdx = 0;
        // canvas.log('>> after uncommited', debugLineTrees(uncommited));
        // canvas.log('>> lines', debugLineTrees(lines));
        // if (idx === 0) {
        //   for (let i = y, l = y + h; i < l; i++)
        //     ft.onClearLine(i, 0).dp(m);
        // }
        for (const line of uncommited) {
            if (line == null) {
                lineIdx++;
                continue;
            }
            let prevPrintable = '';
            let prevPrintEnd = 0;
            let prevPrintStart = 0;
            for (const [eLow, eHigh, data] of line.allIntervals()) {
                const text = treeNodeToStyleText(data);
                // canvas.log('- unc', eLow, eHigh, text);
                if (eLow === prevPrintEnd) {
                    // In case there are contiguous printables with different style (according
                    // to the logic of "uniteDisplayUnits()"),
                    // current printable is contiguous to previous one,
                    // concatenate them
                    prevPrintable += text;
                }
                else {
                    if (prevPrintable)
                        ft.onPrintText(x + prevPrintStart, y + lineIdx, prevPrintable).dp(m);
                    prevPrintable = text;
                    prevPrintStart = eLow;
                }
                prevPrintEnd = eHigh + 1;
            }
            if (prevPrintable)
                ft.onPrintText(x + prevPrintStart, y + lineIdx, prevPrintable).dp(m);
            lineIdx++;
        }
        uncommited = [];
        // clone proLines as new "lines"
        lines = new Array(proLines.length);
        for (let i = 0, l = lines.length; i < l; i++) {
            if (proLines[i]) {
                const line = lines[i] = new algorithms_1.IntervalTree();
                for (const [l, h, value] of proLines[i].allIntervals()) {
                    line.insertInterval(l, h).value = value;
                }
            }
            else {
                lines[i] = undefined;
            }
        }
        ft.internalCache(lines, proLines, uncommited).dp();
    })));
    r('takeSnapshot', pt.takeSnapshot.pipe(rx.map(([m, opts]) => {
        function* cachedLines() {
            let col = 0;
            const source = (opts === null || opts === void 0 ? void 0 : opts.type) === 'commited' ? lines :
                (opts === null || opts === void 0 ? void 0 : opts.type) === 'uncommited' ? uncommited : proLines;
            for (const line of source) {
                if (line == null) {
                    yield '\n';
                    continue;
                }
                col = 0;
                let outputLine = '';
                for (const [l, h, data] of line.allIntervals()) {
                    if (l > col)
                        outputLine += ' '.repeat(l - col);
                    outputLine += treeNodeToStyleText((opts === null || opts === void 0 ? void 0 : opts.noColor) ? [data[0], undefined] : data);
                    col = h + 1;
                }
                yield outputLine + '\n';
            }
        }
        ft.didTakeSnapshot(cachedLines()).dp(m);
    })));
    r('copyRect -> didCopyRect', pt.copyRect.pipe(rx.mergeMap(([m, x, y, w, h, fill]) => {
        const fillCharCode = fill === null || fill === void 0 ? void 0 : fill.codePointAt(0);
        const result = [];
        return rx.range(y, h).pipe(rx.map(i => {
            const lineTree = proLines[i];
            if (lineTree == null) {
                if (fill) {
                    canvas.log('-- copy empty line', y, i);
                    result.push([x, x + w - 1, i, new Array(w).fill(fillCharCode), '']);
                }
                return undefined;
            }
            let col = x;
            // canvas.log(`-- copyRect line begin ${i}`);
            const overlaps = lineTree.searchMultipleOverlaps(x, x + w - 1);
            for (const [low, high, [units, style]] of overlaps) {
                // canvas.log(`-- copyRect ${low} - ${high}, y: ${i}, col:${col}`);
                if (fill && low > col)
                    result.push([col, low - 1, i, new Array(low - col).fill(fillCharCode), '']);
                let newUnits = units;
                let newLow = low;
                let newHigh = high;
                if (low < x) {
                    newLow = x;
                    newUnits = units.slice(x - low);
                    if (newUnits[0] === -1) {
                        // a full-width character it is
                        newUnits[0] = exports.SPACE_CODE_POINT;
                    }
                }
                if (high >= x + w) {
                    newHigh = x + w - 1;
                    newUnits = newUnits.slice(0, newUnits.length - (high + 1 - x - w));
                    if ((0, text_split_1.isCodePointFullWidth)(newUnits[newUnits.length - 1])) {
                        newUnits[newUnits.length - 1] = exports.SPACE_CODE_POINT;
                    }
                }
                result.push([newLow, newHigh, i, newUnits, style]);
                col = newHigh + 1;
            }
            if (fill && col < x + w) {
                canvas.log('-- fill line', col, i);
                result.push([col, x + w - 1, i, new Array(x + w - col).fill(fillCharCode), '']);
            }
        })
        // rx.count(),
        // rx.tap(numLines => canvas.log('-- copy lines', numLines))
        ).pipe(rx.finalize(() => {
            // canvas.log('-- copied', result.map(([x, , y]) => `(${x},${y})`).join());
            ft.didCopyRect(result).dp(m);
        }));
    })));
    /*
    r('copyDirtyRectAndClear -> didCopyRect', pt.copyDirtyRectAndClear.pipe(
      rx.map(([m, x, y, w, h]) => {
        const result = [] as [xLow: number, xHigh: number, y: number, units: number[], style: string][];
        for (let lineIdx = y, l = y + h; lineIdx < l; lineIdx++) {
          const line = dirtyLines.get(lineIdx);
          if (line == null)
            continue;
  
          const overlaps = lines[lineIdx]!.searchMultipleOverlaps(x, x + w - 1);
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
              if (isFullWidth(newUnits[newUnits.length - 1])) {
                newUnits[newUnits.length - 1] = SPACE_CODE_POINT;
              }
            }
            result.push([newLow - x, newHigh - x, lineIdx - y, newUnits, style] as const);
            // newTree.insertInterval(newLow, newHigh).value = [newUnits, style];
          }
          dirtyLines.delete(lineIdx);
        }
        ft.didCopyRect(result).dp(m);
      })
    )); */
    r('setRenderOnRequest, requestRender -> render', pt.setRenderOnRequest.pipe(
    // rx.observeOn(rx.queueScheduler),
    rx.switchMap(([, enabled]) => {
        // let suspended: ActionMeta | false = false; // Has recursive render request?
        const rectTree = new rectangle_overlap_tree_1.RectangleOverlapTree();
        let hasWaitReq = false;
        // eslint-disable-next-line multiline-ternary
        return enabled ? pt.requestRender.pipe(
        // rx.observeOn(rx.queueScheduler),
        rx.mergeMap(([m, rect]) => {
            return table.l.setBounding.pipe(rx.take(1), rx.map(([, , , w, h]) => {
                hasWaitReq = true;
                rectTree.addOrUnionRectOnOverlap(rect !== null && rect !== void 0 ? rect : [0, 0, w, h], null);
                // canvas.log('rectTree', [...rectTree.allRectangles()].length);
                return m;
            }));
        }), rx.throttleTime(150, rx.queueScheduler, { leading: false, trailing: true }), rx.tap(() => hasWaitReq), rx.exhaustMap(m => new rx.Observable(sub => {
            const rects = [...rectTree.allRectangles()];
            rectTree.clear();
            ft.render(rects.map(([r]) => r)).dp(m);
            hasWaitReq = false;
            // If there are more request comes in during previous rendering phase (
            // meaning there is recursive "requestRender" during previous rendering
            // which is not ideal and problematic, orendering should not trigger more dirty checks
            // )
            // if (hasWaitReq) {
            //   hasWaitReq = false;
            //   const rects = [...rectTree.allRectangles()];
            //   rectTree.clear();
            //   ft.render(rects.map(([r]) => r)).dp(m);
            // }
            sub.complete();
        }))) : rx.EMPTY;
    })));
    const filters = new Map();
    r('addRenderFilter,filter.renderBypassFilter... -> copyRect,addDisplayUnits...', pt.addRenderFilter.pipe(rx.mergeMap(([m, rect, filter]) => {
        filters.set(m.i, [rect, filter]);
        return rx.merge(filter.pt.renderBypassFilter.pipe((0, reactivizer_1.actionRelatedToAction)(m), rx.map(([rm, x, y, units, style]) => ft.addDisplayUnits(x, y, units, style, true).dp(rm, m)), rx.takeUntil(pt.removeRenderFilter.pipe((0, reactivizer_1.actionRelatedToAction)(m)))), ft.copyRect(...rect, ' ').re(m).od(pt.didCopyRect).pipe(rx.take(1), rx.mergeMap(([, paintables]) => paintables), rx.map(([x, , y, units, style]) => filter.ft.onRenderForFilter(x, y, units, style.split(';')).dp(m))));
    })));
    r('updateRenderFilter', pt.updateRenderFilter.pipe(rx.map(([, addM, rect]) => {
        const entry = filters.get(addM.i);
        if (entry) {
            entry[0] = rect;
        }
    })));
    r('removeRenderFilter', pt.removeRenderFilter.pipe(rx.map(([, addM]) => {
        filters.delete(addM.i);
    })));
    r('init', new rx.Observable(() => {
        ft.internalCache(lines, proLines, uncommited).dp();
        ft.setRootComponent(null).dp();
    }));
    /** add code points to "uncommited" line cache */
    function addCodePointsToCache(x, y, units, style, byPassFilter) {
        if (y < 0)
            return;
        if (x < 0) {
            // units of negative coordinate should not be printed, so slice them
            const cutOffLen = 0 - x;
            units = units.slice(cutOffLen);
            if ((0, text_split_1.isCodePointFullWidth)(units[0])) {
                units[0] = exports.SPACE_CODE_POINT;
            }
            x = 0;
        }
        if (byPassFilter) {
            addCodePointsToLines(uncommited, x, y, units, style);
            addCodePointsToLines(proLines, x, y, units, style);
            return;
        }
        let toRender = [[x, y, units, style]];
        // check the rendering item agains each filter, if a filter's rectangle intersects,
        // chop rendering item to at most 3 pieces, the piece in the middle which overlaps with filter's
        // rectangle will be passed to filterFn function, other 2 pieces are added back to
        // a queue for being checked against rest of the filters.
        for (const [m, [[left, top, width, height], filter]] of filters) {
            const bottom = top + height;
            const right = left + width;
            const forNextFilter = [];
            // eslint-disable-next-line prefer-const
            for (let [x, y, units, style] of toRender) {
                const r = x + units.length;
                // check if it overlaps with the rectangle
                // canvas.log('>> check', 'x', x, 'r', r, 'y', y, 'left', left, 'top', top, 'right', right, 'bottom', bottom);
                if (y >= top && y < bottom && r > left && x < right) {
                    // canvas.log('>> intersect', 'x', x, 'r', r, 'y', y, 'left', left, 'right', right);
                    if (x < left) {
                        const fullWidthEnd = (0, text_split_1.isCodePointFullWidth)(units[left - x - 1]);
                        const leftChopped = units.slice(0, left - x);
                        units = units.slice(left - x);
                        if (fullWidthEnd) {
                            units[0] = exports.SPACE_CODE_POINT;
                            leftChopped[leftChopped.length - 1] = exports.SPACE_CODE_POINT;
                        }
                        forNextFilter.push([x, y, leftChopped, style]);
                        x = left;
                    }
                    if (r > right) {
                        const fullWidthStart = (0, text_split_1.isCodePointFullWidth)(units[right - x - 1]);
                        const rightChopped = units.slice(right - x);
                        units = units.slice(0, right - x);
                        if (fullWidthStart) {
                            units[units.length - 1] = exports.SPACE_CODE_POINT;
                            rightChopped[0] = exports.SPACE_CODE_POINT;
                        }
                        forNextFilter.push([right, y, rightChopped, style]);
                    }
                    filter.ft.onRenderForFilter(x, y, units, style).dp({ i: m });
                }
                else {
                    forNextFilter.push([x, y, units, style]);
                }
            }
            toRender = forNextFilter;
        }
        for (const [x, y, units, style] of toRender) {
            addCodePointsToLines(uncommited, x, y, units, style);
            addCodePointsToLines(proLines, x, y, units, style);
        }
    }
    function addCodePointsToLines(tLines, x, y, units, style) {
        let line = tLines[y];
        if (line == null) {
            if (tLines.length <= y) {
                for (let i = tLines.length; i < y; i++)
                    tLines.push(undefined);
            }
            line = new algorithms_1.IntervalTree();
            tLines[y] = line;
        }
        const endPos = units.length + x;
        // Make overlap search range 2 units bigger (1 unit expend at each end) than its actual size (x, endPos - 1),
        // so that, any existing contiguous intervals are considered as "overlap" as well.
        // if (y === 17)
        //   canvas.log('>> uniteDisplayUnits', x, endPos - 1, treeNodeToStyleText([units]));
        uniteDisplayUnits(line, [x, endPos - 1, units, style.join(';')]);
    }
    /**
     * 1) delete overlaps from "uncommited"
     * 2) fill white spaces to "uncommited" for all overlaps on "lines"
     */
    function clearCodePointsFromCache(x, y, w) {
        if (y < 0)
            return rx.EMPTY;
        if (x < 0) {
            w -= 0 - x;
            x = 0;
        }
        // delete or chop intervals from line tree
        const endPos = x + w;
        let toDel = [[x, y, x + w]];
        const toFilter = [];
        for (const [m, [[left, top, width, height], filter]] of filters.entries()) {
            const bottom = top + height;
            const right = left + width;
            const prevDel = toDel.slice(0);
            toDel = [];
            // eslint-disable-next-line prefer-const
            for (let [x, y, endPos] of prevDel) {
                if (y >= top && y < bottom && endPos > left && x < right) {
                    if (x < left) {
                        toDel.push([x, y, left]);
                        x = left;
                    }
                    if (endPos > right) {
                        toDel.push([right, y, endPos]);
                        endPos = right;
                    }
                    toFilter.push(filter.ft.onClearForFilter(x, y, endPos - x)
                        .re(m).od(filter.pt.allowClear).pipe(rx.take(1), rx.filter(([, need]) => need), rx.map(() => [x, y, endPos])));
                }
                else {
                    toDel.push([x, y, endPos]);
                }
            }
        }
        // eslint-disable-next-line multiline-ternary
        return (filters.size > 0 ? rx.merge(...toFilter, rx.from(toDel)) : rx.of([x, y, endPos])).pipe(rx.map(([x, y, endPos]) => {
            // canvas.log('>> clearCodePointsFromCache:', x, y, endPos);
            let uncLine = uncommited[y];
            const proLine = proLines[y];
            if (uncLine != null) {
                delCodePointsFromLine(x, endPos, uncLine);
                // canvas.log('>> after del uncline:', y, debugLineTree(uncLine));
            }
            if (proLine) {
                delCodePointsFromLine(x, endPos, proLine);
            }
            // To find out where to put white space
            // 1) look for overlaps in "lines"
            // 2) add "space" to "uncommited"
            const line = lines[y];
            if (line) {
                const overlaps = line.searchMultipleOverlaps(x, endPos - 1);
                for (const [low, high, [units]] of overlaps) {
                    // canvas.log('>> ovlp line', y, ':', low, '-', high);
                    let wsStart = low < x ? x : low;
                    if (low < x && (0, text_split_1.isCodePointFullWidth)(units[x - low - 1])) {
                        if ((uncLine === null || uncLine === void 0 ? void 0 : uncLine.searchSingleOverlap(x - 1, x - 1)) == null)
                            wsStart--;
                    }
                    let wsEnd = high >= endPos ? endPos : high + 1;
                    if (high >= endPos && units[wsEnd - low] === -1) {
                        // canvas.log('>> here', wsEnd, uncLine?.searchSingleOverlap(wsEnd, wsEnd));
                        if ((uncLine === null || uncLine === void 0 ? void 0 : uncLine.searchSingleOverlap(wsEnd, wsEnd)) == null)
                            wsEnd++;
                    }
                    if (uncLine) {
                        // canvas.log('>> overwrite uncLine', y, 'with ws:', wsStart, ',', wsEnd);
                        // look for overlaping or contiguous (2 characters wider than actual clear space, from "wsStart - 1" to "wsEnd")
                        uniteDisplayUnits(uncLine, [wsStart, wsEnd - 1, new Array(wsEnd - wsStart).fill(exports.SPACE_CODE_POINT), '']);
                    }
                    else {
                        // canvas.log('>> add ws to uncline', y, ':', wsStart, ',', wsEnd);
                        uncommited[y] = uncLine = new algorithms_1.IntervalTree();
                        // canvas.log('>>> clearCode insert line', wsStart, wsEnd - 1);
                        const node = uncLine.insertInterval(wsStart, wsEnd - 1);
                        node.value = [new Array(wsEnd - wsStart).fill(exports.SPACE_CODE_POINT), ''];
                    }
                }
            }
        }));
    }
    function delCodePointsFromLine(x, endPos, line) {
        const overlaps = line.searchMultipleOverlaps(x, endPos - 1);
        // canvas.log('>> delCodePointsFromLine', x, endPos, 'overlap', overlaps.length);
        for (const [low, high, [units, style]] of overlaps) {
            line.deleteInterval(low, high);
            // canvas.log('>> deleted', low, high, 'size', line.size());
            if (low < x) {
                let chopEnd = x - low;
                const isLastFw = (0, text_split_1.isCodePointFullWidth)(units[chopEnd - 1]);
                if (isLastFw)
                    chopEnd--;
                const chopped = units.slice(0, chopEnd);
                // canvas.log('>> insert low', low, 'chopEnd', chopEnd);
                const node = line.insertInterval(low, low + chopEnd - 1);
                node.value = [chopped, style];
            }
            if (high >= endPos) {
                let chopStart = endPos - low;
                const isFwEnd = units[chopStart] === -1;
                if (isFwEnd) {
                    chopStart++;
                }
                const chopped = units.slice(chopStart);
                const node = line.insertInterval(low + chopStart, high);
                node.value = [chopped, style];
            }
        }
    }
});
function createTerminalCanvas(opts) {
    return exports.canvasFac.create(opts);
}
function* getTextDisplayUnits(text) {
    const screenLineBuffer = [];
    for (const char of text) {
        const code = char.codePointAt(0);
        if ((0, text_split_1.isCodePointFullWidth)(code)) {
            yield code;
            yield -1;
        }
        else {
            yield code;
        }
    }
    return screenLineBuffer;
}
exports.SPACE_CODE_POINT = ' '.codePointAt(0);
/** Inputed and returned "high" value is considered as an "included" value of range interval */
function uniteDisplayUnits(line, target) {
    const [l, h, units, style] = target;
    const oUnits = [...units];
    const overlaps = line.searchMultipleOverlaps(l - 1, h + 1);
    for (const [l, h] of overlaps)
        line.deleteInterval(l, h);
    //  overlaps.map(([l, h, [units, style]]) => [l, h, units, style])
    let finalLow = l, finalHigh = h;
    for (const existing of overlaps) {
        const [el, eh, [eUnits, eStyle]] = existing;
        if (el < l) {
            const choppedUnits = eUnits.slice(0, l - el);
            if ((0, text_split_1.isCodePointFullWidth)(choppedUnits[choppedUnits.length - 1])) {
                // A full width character is being chopped in the middle by overlapped new text, remove that character
                choppedUnits[choppedUnits.length - 1] = exports.SPACE_CODE_POINT;
            }
            if (style === eStyle) {
                // case of same style, merge two unit
                finalLow = el;
                oUnits.unshift(...choppedUnits);
            }
            else {
                // create a separate node
                const n = line.insertInterval(el, l - 1);
                n.value = [choppedUnits, eStyle];
            }
        }
        if (eh > h) {
            const choppedUnits = eUnits.slice(h - el + 1, eUnits.length);
            if (choppedUnits[0] === -1) {
                choppedUnits[0] = exports.SPACE_CODE_POINT;
            }
            if (style === eStyle) {
                // case of same style, merge two unit
                finalHigh = eh;
                oUnits.push(...choppedUnits);
            }
            else {
                // create a separate node
                const n = line.insertInterval(h + 1, eh);
                n.value = [choppedUnits, eStyle];
            }
        }
    }
    const inserted = line.insertInterval(finalLow, finalHigh);
    inserted.value = [oUnits, style];
}
function rangeIntersection(low1, high1, low2, high2) {
    const overlap = [low1 > low2 ? low1 : low2, high1 > high2 ? high2 : high1];
    return overlap[0] <= overlap[1] ? overlap : null;
}
function rectIntersection([x1, y1, w1, h1], [x2, y2, w2, h2]) {
    const hoz = rangeIntersection(x1, x1 + w1, x2, x2 + w2);
    if (hoz == null)
        return null;
    const vert = rangeIntersection(y1, y1 + h1, y2, y2 + h2);
    if (vert == null)
        return null;
    return [hoz[0], vert[0], hoz[1] - hoz[0], vert[1] - vert[0]];
}
function treeNodeToStyleText([codePoints, style]) {
    const text = String.fromCodePoint(...codePoints.filter(codePoint => codePoint >= 0));
    if (style) {
        const chalkFn = style.split(';').reduce((chalkInst, keyword) => {
            if (keyword.indexOf('(') < 0) {
                return (chalkInst !== null && chalkInst !== void 0 ? chalkInst : chalk_1.default)[keyword];
            }
            else {
                const match = /([^()]+)\(([^)]+)\)/.exec(keyword);
                if (match) {
                    const fn = match[1];
                    if (CHALK_NUMBER_FN.has(fn)) {
                        const params = match[2].trim().split(',').map(v => v.startsWith('#') ? v : Number(v));
                        return chalkInst[fn](...params);
                    }
                }
            }
            throw new Error('TerminalCanvas does not support chalk style keyword: ' + keyword);
        }, chalk_1.default);
        return chalkFn(text);
    }
    else {
        return text;
    }
}
function debugLineTrees(lines, colorful = false) {
    return lines.map((els, i) => {
        if (els == null) {
            return '';
        }
        return `line ${i}\n` + debugLineTree(els, colorful);
    }).filter(line => line).join('\n');
}
function debugLineTree(tree, colorful = false) {
    return [...tree.allIntervals()].map(([l, h, d]) => `  ${l} - ${h}, "${colorful ? treeNodeToStyleText(d) : treeNodeToStyleText([d[0], ''])}"`).join('\n');
}
//# sourceMappingURL=canvas.js.map