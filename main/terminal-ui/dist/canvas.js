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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTerminalCanvas = createTerminalCanvas;
exports.getTextDisplayUnits = getTextDisplayUnits;
exports.rectIntersection = rectIntersection;
const node_readline_1 = __importDefault(require("node:readline"));
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const chalk_1 = __importDefault(require("chalk"));
const reactivizer_1 = require("@wfh/reactivizer");
const algorithms_1 = require("@wfh/algorithms");
// import {stringifyRbTree} from '@wfh/algorithms/dist/utils';
const text_split_1 = require("./text-split");
const rectangle_overlap_tree_1 = require("./rectangle-overlap-tree");
const CHALK_NUMBER_FN = new Set(['rgb', 'bgRgb', 'bgHsl', 'hsl', 'hex', 'bgHex', 'ansi', 'bgAnsi', 'ansi256', 'bgAnsi256']);
const tableFor = ['setBounding', 'setRootComponent', 'onDirtyLineChange'];
function createTerminalCanvas(opts) {
    const canvas = new reactivizer_1.SimplexReactor(Object.assign({ name: 'Canvas', 
        // debugExcludeTypes: ['requestRender'],
        tableFor }, opts));
    const { r, s, table } = canvas;
    const dirtyLines = new Map();
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
    r('autoHideCursor', s.pt.autoHideCursor.pipe(rx.map(() => {
        process.stdout.write('\x1B[?25l');
        const reset = () => process.stdout.write('\x1B[?25h');
        process.on('exit', reset);
        process.on('SIGINT', () => {
            reset();
            process.exit(0);
        });
    }), rx.take(1)));
    r('scrollUp', s.pt.scrollUp.pipe(rx.map(([, lines]) => {
        process.stdout.write('\x1B[' + lines + 'S');
    })));
    r('scrollDown', s.pt.scrollDown.pipe(rx.map(([, lines]) => {
        process.stdout.write('\x1B[' + lines + 'T');
    })));
    // Refer to https://en.wikipedia.org/wiki/ANSI_escape_code
    r('reportCursor', s.pt.reportCursor.pipe(rx.switchMap(([m, keyEventService]) => {
        return rx.merge(keyEventService.s.pt.onReportCursor.pipe(rx.take(1), rx.map(([, x, y]) => s.ft.doneReportCursor(x, y).dp(m))), new rx.Observable(sub => {
            process.stdout.write('\x1B[6n');
            sub.complete();
        }));
    })));
    r('setRootComponent', s.pt.setRootComponent.pipe(rx.switchMap(([m, root]) => {
        if (root)
            return new rx.Observable(() => {
                root.s.ft.ofCanvas(canvas).dp(m);
                root.s.ft.onDetached(false).dp(m);
                return () => root.s.ft.onDetached(true).dp(m);
            });
        return rx.EMPTY;
    })));
    r('setBounding -> rootComponent.onSize', s.pt.setBounding.pipe(rx.switchMap(([m, , , w, h]) => {
        return table.l.setRootComponent.pipe(rx.map(([, root]) => {
            if (root) {
                root.s.ft.onSize(w, h).dp(m);
                root.s.ft.onPosition(0, 0).dp(m);
            }
        }));
    })));
    r('setBounding -> "lines"', s.pt.setBounding.pipe(rx.map(([, , , , h]) => h), rx.scan((prev, curr) => {
        if (curr < prev) {
            lines.splice(curr);
        }
        return curr;
    })));
    r('addDisplayUnits', s.pt.addDisplayUnits.pipe(rx.map(([, x, y, units, style]) => {
        if (units.length > 0)
            addCodePointsToCache(x, y, units, style ? style.sort() : []);
    })));
    r('addString -> ', s.pt.addString.pipe(rx.map(([, x, y, text, style]) => {
        const units = [...getTextDisplayUnits(text)];
        if (units.length > 0)
            addCodePointsToCache(x, y, units, style ? style.sort() : []);
    })));
    r('fillRect', s.pt.fillRect.pipe(rx.map(([, x, y, w, h, bg]) => {
        const units = [...getTextDisplayUnits(' '.repeat(w))];
        const style = [bg];
        for (let i = y, l = y + h; i < l; i++) {
            addCodePointsToCache(x, i, units, style ? style.sort() : []);
        }
    })));
    r('clearRect', s.pt.clearRect.pipe(rx.map(([, x, y, w, h]) => {
        for (let i = y, l = y + h; i < l; i++) {
            clearCodePointsFromCache(x, i, w);
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
    })));
    r('onPrintText', s.pt.onPrintText.pipe(rx.map(([, x, y, text]) => {
        node_readline_1.default.cursorTo(process.stdout, x, y);
        process.stdout.write(text);
    })));
    r('onClearLine', s.pt.onClearLine.pipe(rx.map(([, y, x, dir]) => {
        if (x != null) {
            node_readline_1.default.cursorTo(process.stdout, x, y);
            node_readline_1.default.clearLine(process.stdout, dir !== null && dir !== void 0 ? dir : 1);
        }
        else {
            node_readline_1.default.cursorTo(process.stdout, 0, y);
            node_readline_1.default.clearLine(process.stdout, 0);
        }
    })));
    r('render -> onPrintText', s.pt.render.pipe(rx.withLatestFrom(table.l.setBounding, table.l.setRootComponent), rx.map(([[m, rects], [, x, y, w, h], [, root]]) => {
        if (root)
            root.s.ft.render(canvas, gl_matrix_1.mat4.create(), rects !== null && rects !== void 0 ? rects : [[0, 0, w, h]]).dp(m);
        let lineIdx = 0;
        for (const line of uncommited) {
            if (line == null) {
                lineIdx++;
                continue;
            }
            for (const [eLow, , data] of line.allIntervals()) {
                const text = treeNodeToStyleText(data);
                s.ft.onPrintText(x + eLow, y + lineIdx, text).dp(m);
            }
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
    })));
    r('copyRect -> onCopyRect', s.pt.copyRect.pipe(rx.map(([m, x, y, w, h]) => {
        const result = [];
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
                    if ((0, text_split_1.isCodePointFullWidth)(newUnits[newUnits.length - 1])) {
                        newUnits[newUnits.length - 1] = SPACE_CODE_POINT;
                    }
                }
                result.push([newLow - x, newHigh - x, i, newUnits, style]);
                // newTree.insertInterval(newLow, newHigh).value = [newUnits, style];
            }
        });
        s.ft.onCopyRect(result).dp(m);
    })));
    r('copyDirtyRectAndClear -> onCopyRect', s.pt.copyDirtyRectAndClear.pipe(rx.map(([m, x, y, w, h]) => {
        const result = [];
        for (let lineIdx = y, l = y + h; lineIdx < l; lineIdx++) {
            const line = dirtyLines.get(lineIdx);
            if (line == null)
                continue;
            const overlaps = lines[lineIdx].searchMultipleOverlaps(x, x + w - 1);
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
                    if ((0, text_split_1.isCodePointFullWidth)(newUnits[newUnits.length - 1])) {
                        newUnits[newUnits.length - 1] = SPACE_CODE_POINT;
                    }
                }
                result.push([newLow - x, newHigh - x, lineIdx - y, newUnits, style]);
                // newTree.insertInterval(newLow, newHigh).value = [newUnits, style];
            }
            dirtyLines.delete(lineIdx);
        }
        s.ft.onCopyRect(result).dp(m);
    })));
    r('setRenderOnRequest, requestRender -> render', s.pt.setRenderOnRequest.pipe(
    // rx.observeOn(rx.queueScheduler),
    rx.switchMap(([, enabled]) => {
        // let suspended: ActionMeta | false = false; // Has recursive render request?
        const rectTree = new rectangle_overlap_tree_1.RectangleOverlapTree();
        let hasWaitReq = false;
        // eslint-disable-next-line multiline-ternary
        return enabled ? s.pt.requestRender.pipe(
        // rx.observeOn(rx.queueScheduler),
        rx.mergeMap(([m, rect]) => {
            return table.l.setBounding.pipe(rx.take(1), rx.map(([, ...bounding]) => {
                hasWaitReq = true;
                rectTree.addOrUnionRectOnOverlap(rect !== null && rect !== void 0 ? rect : bounding, null);
                // canvas.log('rectTree', [...rectTree.allRectangles()].length);
                return m;
            }));
        }), rx.sampleTime(200), rx.filter(() => hasWaitReq), rx.exhaustMap(m => new rx.Observable(sub => {
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
        }))) : rx.EMPTY;
    })));
    r('init', new rx.Observable(() => {
        s.ft.setRootComponent(null).dp();
        s.ft.onDirtyLineChange(dirtyLines).dp();
    }));
    function treeNodeToStyleText([codePoints, style]) {
        const text = String.fromCodePoint(...codePoints.filter(codePoint => codePoint >= 0));
        if (style) {
            const chalkFn = style.split(';').reduce((chalkInst, keyword) => {
                if (keyword.indexOf('(') < 0) {
                    if (chalkInst == null)
                        throw new Error(`Chalk is null for keyword "${keyword}" of ` + style);
                    return chalkInst[keyword];
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
    /** add code points to "uncommited" line cache */
    function addCodePointsToCache(x, y, units, style) {
        if (y < 0)
            return;
        if (x < 0) {
            // units of negative coordinate should not be printed, so slice them
            const cutOffLen = 0 - x;
            units = units.slice(cutOffLen);
            if ((0, text_split_1.isCodePointFullWidth)(units[0])) {
                units[0] = SPACE_CODE_POINT;
            }
            x = 0;
        }
        addCodePointsToLines(uncommited, x, y, units, style);
        addCodePointsToLines(proLines, x, y, units, style);
    }
    function addCodePointsToLines(tLines, x, y, units, style) {
        let line = tLines[y];
        if (line == null) {
            line = new algorithms_1.IntervalTree();
            tLines[y] = line;
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
    }
    /**
     * 1) delete overlaps from "uncommited"
     * 2) fill white spaces to "uncommited" for all overlaps on "lines"
     */
    function clearCodePointsFromCache(x, y, width) {
        if (y < 0)
            return;
        if (x < 0) {
            width -= 0 - x;
            x = 0;
        }
        // delete or chop intervals from line tree
        const uncLine = uncommited[y];
        const endPos = x + width;
        const proLine = proLines[y];
        if (uncLine != null) {
            delCodePointsFromLine(x, endPos, uncLine);
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
                let wsStart = low < x ? x : low;
                if (low < x && (0, text_split_1.isCodePointFullWidth)(units[x - low - 1])) {
                    wsStart--;
                }
                const wsEnd = high >= endPos ? endPos : high + 1;
                if (uncLine) {
                    const ovlpUncommited = uncLine.searchMultipleOverlaps(wsStart, wsEnd - 1);
                    for (const [l, h] of ovlpUncommited)
                        uncLine.deleteInterval(l, h);
                    const united = uniteDisplayUnits([wsStart, wsEnd - 1, new Array(wsEnd - wsStart).fill(SPACE_CODE_POINT), ''], ovlpUncommited.map(([l, h, [units, style]]) => [l, h, units, style]));
                    for (const [low, high, units, style] of united) {
                        const node = line.insertInterval(low, high);
                        node.value = [units, style];
                    }
                }
                else {
                    const node = line.insertInterval(wsStart, wsEnd - 1);
                    node.value = [new Array(wsEnd - wsStart).fill(SPACE_CODE_POINT), ''];
                }
            }
        }
    }
    function delCodePointsFromLine(x, endPos, line) {
        const overlaps = line.searchMultipleOverlaps(x, endPos - 1);
        for (const [low, high, [units, style]] of overlaps) {
            line.deleteInterval(low, high);
            if (low < x) {
                let chopEnd = x - low;
                const isLastFw = (0, text_split_1.isCodePointFullWidth)(units[chopEnd - 1]);
                if (isLastFw)
                    chopEnd--;
                const chopped = units.slice(0, chopEnd);
                const node = line.insertInterval(low, chopEnd - 1);
                node.value = [chopped, style];
            }
            if (high >= endPos) {
                let chopStart = endPos - low;
                const isCwEnd = units[chopStart] === -1;
                if (isCwEnd) {
                    chopStart++;
                }
                const chopped = units.slice(chopStart);
                const node = line.insertInterval(chopStart, high);
                node.value = [chopped, style];
            }
        }
    }
    return canvas;
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
const SPACE_CODE_POINT = ' '.codePointAt(0);
/** Inputed and returned "high" value is considered as an "included" value of range interval */
function uniteDisplayUnits(overlap, existings) {
    const [l, h, units, style] = overlap;
    const oUnits = [...units];
    let finalLow = l, finalHigh = h;
    const choppedExistings = [];
    for (const existing of existings) {
        const [el, eh, eUnits, eStyle] = existing;
        if (el < l) {
            if (style === eStyle) {
                // case of same style, merge two unit
                finalLow = el;
                const prependUnits = eUnits.slice(0, l - el);
                if ((0, text_split_1.isCodePointFullWidth)(prependUnits[prependUnits.length - 1])) {
                    // A full width character is being chopped in the middle by overlapped new text, replace that character with a space
                    prependUnits[prependUnits.length - 1] = SPACE_CODE_POINT;
                }
                oUnits.unshift(...prependUnits);
            }
            else {
                const choppedUnits = eUnits.slice(0, l - el);
                if ((0, text_split_1.isCodePointFullWidth)(choppedUnits[choppedUnits.length - 1])) {
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
            }
            else {
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
//# sourceMappingURL=canvas.js.map