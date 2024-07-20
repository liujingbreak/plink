"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTerminalCanvas = createTerminalCanvas;
exports.getTextDisplayUnits = getTextDisplayUnits;
const tslib_1 = require("tslib");
const node_readline_1 = tslib_1.__importDefault(require("node:readline"));
const rx = tslib_1.__importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const algorithms_1 = require("@wfh/algorithms");
// import {stringifyRbTree} from '@wfh/algorithms/dist/utils';
const process_common_1 = require("../process-common");
const CHALK_NUMBER_FN = new Set(['rgb', 'bgRgb', 'bgHsl', 'hsl']);
const tableFor = ['setBounding', 'setRootWidget', 'onDirtyLineChange'];
function createTerminalCanvas() {
    const canvas = new reactivizer_1.SimplexReactor({
        name: 'TerminalCanvas',
        log(...args) {
            // eslint-disable-next-line no-console
            console.log((0, nodejs_utils_1.formatToConciseNoColor)(...args));
        },
        tableFor
    });
    const { r, s, table } = canvas;
    const dirtyLines = new Map();
    // "lines" is an array of IntervalTree, each element of which represents a single line of display text of screen.
    // The intervalTree is a tree containing single or multiple discrete intervals which represents display text
    const lines = [];
    r('autoHideCursor', s.pt.autoHideCursor.pipe(rx.map(() => {
        process.stdout.write('\x1B[?25l');
        const reset = () => process.stdout.write('\x1B[?25h');
        process.on('exit', reset);
        process.on('SIGINT', () => {
            reset();
            process.exit(0);
        });
    }), rx.take(1)));
    r('setBounding -> rootWidget.setSize', s.pt.setBounding.pipe(rx.switchMap(([m, , , w, h]) => {
        return table.l.setRootWidget.pipe(rx.map(([, root]) => {
            if (root)
                root.s.ft.setSize(w, h).dp(m);
        }));
    })));
    r('setBounding -> "lines"', s.pt.setBounding.pipe(rx.map(([, , , , h]) => h), rx.scan((prev, curr) => {
        if (curr < prev) {
            lines.splice(curr);
        }
        return curr;
    })));
    r('addDisplayUnits', s.pt.addDisplayUnits.pipe(rx.map(([, x, y, units, style]) => {
        addCodePointsToCanvas(x, y, units, style ? style.sort() : []);
    })));
    r('addString -> ', s.pt.addString.pipe(rx.map(([, x, y, text, style]) => {
        const units = [...getTextDisplayUnits(text)];
        addCodePointsToCanvas(x, y, units, style ? style.sort() : []);
    })));
    r('clearRect', s.pt.clearRect.pipe(rx.map(([, x, y, w, h]) => {
        for (let i = y, l = y + h; i < l; i++) {
            const dirtyRange = clearCodePointFromLine(x, i, w);
            if (dirtyRange) {
                const lastChange = dirtyLines.get(i);
                if (lastChange) {
                    lastChange[0] = Math.min(lastChange[0], dirtyRange[0]);
                    lastChange[1] = Math.max(lastChange[1], dirtyRange[1]);
                }
                else {
                    dirtyLines.set(i, [dirtyRange[0], dirtyRange[1]]);
                }
            }
            // canvas.log('#### clearRect line', i, dirtyLines.get(y));
        }
        // console.log('clearRect done', '#' + m.i);
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
    r('render -> onPrintText', s.pt.render.pipe(rx.withLatestFrom(table.l.setBounding, table.l.setRootWidget), rx.map(([[m], [, x, y], [, root]]) => {
        if (root)
            root.s.ft.render(canvas, gl_matrix_1.mat4.create()).dp(m);
        for (const [lineIdx, [left, right]] of dirtyLines) {
            const overlaps = [...lines[lineIdx].searchMultipleOverlaps(left, right - 1)];
            let offset = left;
            // canvas.log('#### dirty', left, right);
            const printingText = [];
            for (const [eLow, eHigh, data] of overlaps.sort(([a], [b]) => a - b)) {
                // canvas.log('offset', offset, 'eLow', eLow, 'eHigh', eHigh, 'len', data[0].length);
                let chopStart = 0;
                let chopEnd = data[0].length;
                if (offset < eLow) {
                    printingText.push(' '.repeat(eLow - offset));
                }
                else {
                    chopStart = offset - eLow;
                }
                if (eHigh < right) {
                    offset = eHigh + 1;
                }
                else {
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
        // canvas.log('### render -> clear dirtyLines');
    })));
    r('copyRect -> onCopyRect', s.pt.copyRect.pipe(rx.map(([m, x, y, w, h]) => {
        const result = [];
        lines.slice(y, y + h).forEach((lineTree, i) => {
            if (lineTree == null)
                return undefined;
            const overlaps = lineTree.searchMultipleOverlaps(x, x + h - 1);
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
                    if ((0, process_common_1.isCodePointFullWidth)(newUnits[newUnits.length - 1])) {
                        newUnits[newUnits.length - 1] = SPACE_CODE_POINT;
                    }
                }
                result.push([newLow - x, newHigh - x, i, newUnits, style]);
                // newTree.insertInterval(newLow, newHigh).value = [newUnits, style];
            }
        });
        s.ft.onCopyRect(result).dp(m);
    })));
    r('copyDirtyRectAndClear', s.pt.copyDirtyRectAndClear.pipe(rx.map(([m, x, y, w, h]) => {
        const result = [];
        for (const [lineIdx] of dirtyLines) {
            const overlaps = [...lines[lineIdx].searchMultipleOverlaps(x, x + h - 1)];
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
                    if ((0, process_common_1.isCodePointFullWidth)(newUnits[newUnits.length - 1])) {
                        newUnits[newUnits.length - 1] = SPACE_CODE_POINT;
                    }
                }
                result.push([newLow - x, newHigh - x, lineIdx, newUnits, style]);
                // newTree.insertInterval(newLow, newHigh).value = [newUnits, style];
            }
        }
        dirtyLines.clear();
        s.ft.onCopyRect(result).dp(m);
    })));
    s.ft.setRootWidget(null).dp();
    s.ft.onDirtyLineChange(dirtyLines).dp();
    function treeNodeToStyleText([codePoints, style]) {
        const text = String.fromCodePoint(...codePoints.filter(codePoint => codePoint >= 0));
        if (style) {
            const chalkFn = style.split(';').reduce((chalkInst, keyword) => {
                if (keyword.indexOf('(') < 0) {
                    return chalkInst[keyword];
                }
                else {
                    const match = /([^()]+)\(([^)]+)\)/.exec(keyword);
                    if (match) {
                        const fn = match[1];
                        if (CHALK_NUMBER_FN.has(fn)) {
                            const params = match[2].trim().split(',').map(v => Number(v));
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
    function addCodePointsToCanvas(x, y, units, style) {
        let line = lines[y];
        if (line == null) {
            line = new algorithms_1.IntervalTree();
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
        }
        else {
            dirtyLines.set(y, [x, endPos]);
        }
    }
    function clearCodePointFromLine(x, y, width) {
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
        let dirtyRange = null;
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
                if ((0, process_common_1.isCodePointFullWidth)(units[x - low - 1])) {
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
function* getTextDisplayUnits(text) {
    const screenLineBuffer = [];
    for (const char of text) {
        const code = char.codePointAt(0);
        if ((0, process_common_1.isCodePointFullWidth)(code)) {
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
    const [l, h, oUnits, style] = overlap;
    let finalLow = l, finalHigh = h;
    const choppedExistings = [];
    for (const existing of existings) {
        const [el, eh, eUnits, eStyle] = existing;
        if (el < l) {
            if (style === eStyle) {
                // case of same style, merge two unit
                finalLow = el;
                const prependUnits = eUnits.slice(0, l - el);
                if ((0, process_common_1.isCodePointFullWidth)(prependUnits[prependUnits.length - 1])) {
                    // A full width character is being chopped in the middle by overlapped new text, replace that character with a space
                    prependUnits[prependUnits.length - 1] = SPACE_CODE_POINT;
                }
                oUnits.unshift(...prependUnits);
            }
            else {
                const choppedUnits = eUnits.slice(0, l - el);
                if ((0, process_common_1.isCodePointFullWidth)(choppedUnits[choppedUnits.length - 1])) {
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
//# sourceMappingURL=terminal-canvas.js.map