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
const process_common_1 = require("../process-common");
const CHALK_NUMBER_FN = new Set(['rgb', 'bgRgb', 'bgHsl', 'hsl']);
const tableFor = ['setAlwaysRerenderAll', 'onSize', 'setHeight', 'setTop', 'setRootWidget'];
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
    r('setHeight, setClientWindowSize -> setTop"', s.pt.setHeight.pipe(rx.mergeMap(a => s.pt.setClientWindowSize.pipe(rx.take(1), rx.map(b => [a, b]))), rx.map(([[m, v], [, w, h]]) => {
        const numHeight = v === 'full' ? h : v;
        s.ft.setTop(h - numHeight).dp(m);
        s.ft.onSize(w, h).dp(m);
        return numHeight;
    }), rx.scan((prev, curr) => {
        if (curr < prev) {
            lines.splice(curr);
        }
        return curr;
    })));
    r('onSize -> rootWidget.setSize', s.pt.onSize.pipe(rx.switchMap(([m, w, h]) => table.l.setRootWidget.pipe(rx.map(([, rootWidget]) => {
        rootWidget.s.ft.setSize(w, h).dp(m);
    })))));
    r('addDisplayUnits', s.pt.addDisplayUnits.pipe(rx.map(([, x, y, units, style]) => {
        addCodePointsToCanvas(x, y, units, style ? style.sort() : []);
    })));
    r('addString -> ', s.pt.addString.pipe(rx.map(([, x, y, text, style]) => {
        const units = [...getTextDisplayUnits(text)];
        addCodePointsToCanvas(x, y, units, style ? style.sort() : []);
    })));
    // r('deleteLines', s.pt.deleteLines.pipe(
    //   rx.map(([, y1, y2]) => {
    //     for (let i = y1; i <= y2; i++) {
    //       lines[i] = undefined;
    //       dirtyLines.delete(i);
    //     }
    //   })
    // ));
    r('clearRect', s.pt.clearRect.pipe(rx.map(([, x, y, w, h]) => {
        for (let i = y, l = y + h; i < l; i++) {
            const dirtyRange = clearCodePointFromLine(x, i, w);
            if (dirtyRange) {
                const lastChange = dirtyLines.get(y);
                if (lastChange) {
                    lastChange[0] = Math.min(lastChange[0], dirtyRange[0]);
                    lastChange[1] = Math.max(lastChange[1], dirtyRange[1]);
                }
                else {
                    dirtyLines.set(i, [dirtyRange[0], dirtyRange[1]]);
                }
            }
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
    r('render -> onPrintText', s.pt.render.pipe(rx.withLatestFrom(table.l.setTop, table.l.setRootWidget, table.l.setAlwaysRerenderAll, table.l.onSize), rx.map(([[m], [, top], [, root], [, rerender], [, screenWidth]]) => {
        var _a;
        root.s.ft.render(canvas, gl_matrix_1.mat4.create()).dp(m);
        if (rerender) {
            node_readline_1.default.cursorTo(process.stdout, 0, top);
            node_readline_1.default.clearScreenDown(process.stdout);
            for (let i = 0, l = lines.length; i < l; i++) {
                const tree = lines[i];
                const y = i + top;
                if (tree) {
                    tree.inorderWalk(node => {
                        if (node.highValuesTree) {
                            node.highValuesTree.inorderWalk(n => {
                                const text = treeNodeToStyleText(n.value);
                                s.ft.onPrintText(node.int[0], y, text).dp(m);
                            });
                        }
                        else {
                            const text = treeNodeToStyleText(node.value);
                            s.ft.onPrintText(node.int[0], y, text).dp(m);
                        }
                    });
                }
            }
        }
        else {
            for (const [lineIdx, [low, high]] of dirtyLines) {
                const y = lineIdx + top;
                if ((screenWidth - low) < high) {
                    // consider direction of clearLine: low -> right edge of screen
                    s.ft.onClearLine(y, low, 1).dp(m);
                    const overlap = lines[y].searchSingleOverlap(low, low);
                    if (overlap === null || overlap === void 0 ? void 0 : overlap.int) {
                        const [start] = overlap.int;
                        const [units, style] = overlap.value;
                        // Only print part of the overlapped node
                        const text = treeNodeToStyleText([units.slice(low - start), style]);
                        s.ft.onPrintText(low, y, text).dp(m);
                        for (const node of lines[y].keysGreaterThan(low)) {
                            const text = treeNodeToStyleText(node.value);
                            s.ft.onPrintText(node.int[0], y, text).dp(m);
                        }
                    }
                    else {
                        const err = new Error('screen cache tree should not contain overlapped content:\n' + overlap);
                        canvas.dispatchErrorFor(err, m);
                        throw err;
                    }
                }
                else {
                    // consider direction of clearLine: left edge of screen -> high
                    s.ft.onClearLine(y, high, -1).dp(m);
                    const overlap = lines[y].searchSingleOverlap(high - 1, high - 1);
                    if (overlap === null || overlap === void 0 ? void 0 : overlap.int) {
                        const [start] = overlap.int;
                        const [units, style] = overlap.value;
                        // Only print part of the overlapped node
                        const text = treeNodeToStyleText([units.slice(0, high - start), style]);
                        s.ft.onPrintText(start, y, text).dp(m);
                        for (const node of lines[y].keysSmallererThan(start)) {
                            const text = treeNodeToStyleText(node.value);
                            s.ft.onPrintText(node.int[0], y, text).dp(m);
                        }
                    }
                    else {
                        (_a = canvas.opts) === null || _a === void 0 ? void 0 : _a.log('low', low, 'high', high, 'y', y);
                        lines[y].inorderWalk(node => {
                            var _a;
                            (_a = canvas.opts) === null || _a === void 0 ? void 0 : _a.log('line: ', y, 'node.int:', node.int);
                        });
                        const err = new Error('screen cache tree should not contain overlapped content:\n' + overlap);
                        canvas.dispatchErrorFor(err, m);
                        throw err;
                    }
                }
                // s.ft.onClearLine(y).dp(m);
                const tree = lines[lineIdx];
                if (tree) {
                    tree.inorderWalk(node => {
                        const text = treeNodeToStyleText(node.value);
                        s.ft.onPrintText(node.int[0], y, text).dp(m);
                    });
                }
            }
            dirtyLines.clear();
        }
    })));
    s.ft.setHeight('full').dp();
    s.ft.setAlwaysRerenderAll(false).dp();
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
        const newDisplayNodes = uniteDisplayUnits([x, endPos - 1, units, style.join(';')], overlaps.map(([l, h, [units, style]]) => [l, h, units, style]));
        for (const [low, high] of overlaps) {
            line.deleteInterval(low, high);
        }
        for (const [low, high, units, style] of newDisplayNodes) {
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
        const overlaps = [...line.searchMultipleOverlaps(x, endPos - 1)];
        if (overlaps.length === 0)
            return null;
        for (const [low, high] of overlaps) {
            line.deleteInterval(low, high);
        }
        const dirtyRange = [endPos, x];
        for (const overlap of overlaps) {
            const [low, high, [units, style]] = overlap;
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
                    oUnits.unshift(...prependUnits.slice(0, prependUnits.length - 1), SPACE_CODE_POINT);
                }
                else {
                    oUnits.unshift(...prependUnits);
                }
            }
            else {
                const choppedUnits = eUnits.slice(0, l - el);
                if ((0, process_common_1.isCodePointFullWidth)(choppedUnits[choppedUnits.length - 1])) {
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
                const appendUnits = eUnits.slice(h - el + 1, eUnits.length);
                if (appendUnits[0] === -1) {
                    // A full width character is being chopped in the middle by overlapped new text, replace that character with a space
                    oUnits.push(SPACE_CODE_POINT, ...appendUnits.slice(1));
                }
                else {
                    oUnits.push(...appendUnits);
                }
            }
            else {
                const choppedUnits = eUnits.slice(h - el + 1, eUnits.length);
                if (choppedUnits[0] === -1) {
                    choppedUnits.shift();
                    // create a separate node
                    choppedExistings.push([h + 2, eh, choppedUnits, eStyle]);
                }
                else {
                    // create a separate node
                    choppedExistings.push([h + 1, eh, choppedUnits, eStyle]);
                }
            }
        }
    }
    choppedExistings.push([finalLow, finalHigh, oUnits, style]);
    return choppedExistings;
}
//# sourceMappingURL=terminal-canvas.js.map