"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTerminalCanvas = createTerminalCanvas;
exports.getTextDisplayUnits = getTextDisplayUnits;
const tslib_1 = require("tslib");
const node_readline_1 = tslib_1.__importDefault(require("node:readline"));
const rx = tslib_1.__importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const algorithms_1 = require("@wfh/algorithms");
const process_common_1 = require("../process-common");
const tableFor = ['setAlwaysRerenderAll', 'onSize', 'setHeight', 'setTop', 'setRootWidget'];
function createTerminalCanvas() {
    const reactor = new reactivizer_1.SimplexReactor({
        name: 'TerminalCanvas',
        log(...args) {
            // eslint-disable-next-line no-console
            console.log((0, nodejs_utils_1.formatToConciseNoColor)(...args));
        },
        tableFor
    });
    const { r, s, table } = reactor;
    const dirtyLines = new Set();
    // "lines" is an array of IntervalTree, each element of which represents a single line of display text of screen.
    // The intervalTree is a tree containing single or multiple discrete intervals which represents display text
    const lines = [];
    r('setHeight -> setTop"', s.pt.setHeight.pipe(rx.mergeMap(a => s.pt.setClientWindowSize.pipe(rx.take(1), rx.map(b => [a, b]))), rx.map(([[m, v], [, w, h]]) => {
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
    r('onSize -> rootWidget.setSize', s.pt.onSize.pipe(rx.switchMap(sizePayload => table.l.setRootWidget.pipe(rx.take(1), rx.map(rootWidget => [sizePayload, rootWidget]))), rx.map(([[m, w, h], [, rootWidget]]) => {
        rootWidget.setSize(w, h).dp(m);
    })));
    r('addDisplayUnits', s.pt.addDisplayUnits.pipe(rx.map(([, x, y, units]) => {
        addCodePointsToCanvas(x, y, units);
    })));
    r('addString -> ', s.pt.addString.pipe(rx.map(([, x, y, text]) => {
        const units = [...getTextDisplayUnits(text)];
        addCodePointsToCanvas(x, y, units);
    })));
    r('clearLines', s.pt.clearLines.pipe(rx.map(([, y1, y2]) => {
        for (let i = y1; i <= y2; i++) {
            lines[i] = undefined;
            dirtyLines.delete(i);
        }
    })));
    r('onPrintText', s.pt.onPrintText.pipe(rx.map(([, x, y, text]) => {
        node_readline_1.default.cursorTo(process.stdout, x, y);
        process.stdout.write(text);
    })));
    r('onClearLine', s.pt.onClearLine.pipe(rx.map(([, y]) => {
        node_readline_1.default.cursorTo(process.stdout, 0, y);
        node_readline_1.default.clearLine(process.stdout, 0);
    })));
    r('render -> onPrintText', s.pt.render.pipe(rx.withLatestFrom(s.pt.setTop, table.l.setRootWidget, table.l.setAlwaysRerenderAll), rx.map(([[m], [, top], [, root], [, rerender]]) => {
        root.render(reactor, gl_matrix_1.mat4.create()).dp(m);
        if (rerender) {
            node_readline_1.default.cursorTo(process.stdout, 0, top);
            node_readline_1.default.clearScreenDown(process.stdout);
            for (let i = 0, l = lines.length; i < l; i++) {
                const tree = lines[i];
                const y = i + top;
                if (tree) {
                    tree.inorderWalk((node) => {
                        s.ft.onPrintText(node.int[0], y, String.fromCodePoint(...node.value.filter(codePoint => codePoint >= 0))).dp(m);
                    });
                }
            }
        }
        else {
            for (const lineIdx of dirtyLines) {
                const tree = lines[lineIdx];
                const y = lineIdx + top;
                s.ft.onClearLine(y).dp(m);
                tree.inorderWalk((node) => {
                    s.ft.onPrintText(node.int[0], y, String.fromCodePoint(...node.value.filter(codePoint => codePoint >= 0))).dp(m);
                });
            }
            dirtyLines.clear();
        }
    })));
    s.ft.setHeight('full').dp();
    s.ft.setAlwaysRerenderAll(false).dp();
    function addCodePointsToCanvas(x, y, units) {
        let line = lines[y];
        if (line == null) {
            line = new algorithms_1.IntervalTree();
            lines[y] = line;
        }
        const endPos = units.length + x;
        const overlaps = [...line.searchMultipleOverlaps(x, units.length + x)];
        const [finalLow, finalHigh, unitedUnits] = uniteDisplayUnits([x, endPos, units], overlaps);
        for (const [low, high] of overlaps) {
            line.deleteInterval(low, high);
        }
        const node = line.insertInterval(finalLow, finalHigh);
        node.value = unitedUnits;
        dirtyLines.add(y);
    }
    return reactor;
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
function uniteDisplayUnits(overlap, exitings) {
    const [l, h, oUnits] = overlap;
    const exitingLower = exitings.find(([low]) => low < l);
    const exitingHigher = exitings.find(([, high]) => high > h);
    let finalLow = l, finalHigh = h;
    if (exitingLower) {
        const [pl, , pUnits] = exitingLower;
        finalLow = pl;
        const prependUnits = pUnits.slice(0, l - pl);
        if ((0, process_common_1.isCodePointFullWidth)(prependUnits[prependUnits.length - 1])) {
            // A full width character is being chopped in the middle by overlapped new text, replace that character with a space
            oUnits.unshift(...prependUnits.slice(0, prependUnits.length - 1), SPACE_CODE_POINT);
        }
        else {
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
        }
        else {
            oUnits.push(...appendUnits);
        }
    }
    return [finalLow, finalHigh, oUnits];
}
//# sourceMappingURL=terminal-canvas.js.map