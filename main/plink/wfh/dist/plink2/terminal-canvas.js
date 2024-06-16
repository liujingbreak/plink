"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTerminalCanvas = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const algorithms_1 = require("@wfh/algorithms");
const process_common_1 = require("./process-common");
const tableFor = ['boundingSize', 'setHeight'];
function createTerminalCanvas() {
    const reactor = new reactivizer_1.SimplexReactor({
        name: 'TerminalCanvas',
        tableFor
    });
    const { r, s } = reactor;
    const dirtyLines = new Set();
    // "lines" is an array of IntervalTree, each element of which represents a single line of display text of screen.
    // The intervalTree is a tree containing single or multiple discrete intervals which represents display text
    const lines = [];
    r('setHeight', s.pt.setHeight.pipe(rx.map(([, v]) => v), rx.scan((prev, curr) => {
        if (curr < prev) {
            lines.splice(curr);
        }
        return curr;
    })));
    r('addString -> ', s.pt.addString.pipe(rx.map(([, x, y, text]) => {
        let line = lines[y];
        if (line == null) {
            line = new algorithms_1.IntervalTree();
            lines[y] = line;
        }
        const units = getTextDisplayUnits(text);
        const overlaps = [...line.searchMultipleOverlaps(x, units.length + x)];
        const [finalLow, finalHigh, unitedUnits] = uniteDisplayUnits([x, y, units], overlaps);
        for (const [low, high] of overlaps) {
            line.deleteInterval(low, high);
        }
        const node = line.insertInterval(finalLow, finalHigh);
        node.value = unitedUnits;
        dirtyLines.add(y);
    })));
    r('render -> printText', s.pt.render.pipe(rx.map(([m]) => {
        for (const lineIdx of dirtyLines) {
            const tree = lines[lineIdx];
            tree.inorderWalk((node) => {
                s.ft.printText(node.int[0], lineIdx, String.fromCodePoint(...node.value.filter(codePoint => codePoint >= 0))).dp(m);
            });
        }
        dirtyLines.clear();
    })));
    s.ft.setHeight(0).dp();
    return reactor;
}
exports.createTerminalCanvas = createTerminalCanvas;
function getTextDisplayUnits(text) {
    const screenLineBuffer = [];
    for (const char of text) {
        const code = char.codePointAt(0);
        if ((0, process_common_1.isCodePointFullWidth)(code)) {
            screenLineBuffer.push(code, -1);
        }
        else {
            screenLineBuffer.push(code);
        }
    }
    return screenLineBuffer;
}
function uniteDisplayUnits(overlap, exitings) {
    const [l, h, oUnits] = overlap;
    const exitingLower = exitings.find(([low]) => low < l);
    const exitingHigher = exitings.find(([, high]) => high > h);
    let finalLow = l, finalHigh = h;
    if (exitingLower) {
        const [pl, , pUnits] = exitingLower;
        finalLow = pl;
        oUnits.unshift(...pUnits.slice(0, l - pl));
    }
    if (exitingHigher) {
        const [al, ah, aUnits] = exitingHigher;
        finalHigh = ah;
        oUnits.push(...aUnits.slice(h - al, aUnits.length));
    }
    return [finalLow, finalHigh, oUnits];
}
//# sourceMappingURL=terminal-canvas.js.map