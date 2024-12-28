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
Object.defineProperty(exports, "__esModule", { value: true });
exports.canvasCacheFac = void 0;
const rx = __importStar(require("rxjs"));
const algorithms_1 = require("@wfh/algorithms");
const reactivizer_1 = require("@wfh/reactivizer");
const canvas_1 = require("./canvas");
const text_split_1 = require("./text-split");
const tableFor = ['cache'];
exports.canvasCacheFac = new reactivizer_1.BaseReactorFactory({
    name: 'canvasCache',
    tableFor
}).defineReactor((init, opts) => {
    let cache = new algorithms_1.RedBlackTree();
    const service = init(opts);
    const { r, s } = service;
    r('add', s.pt.add.pipe(rx.map(([, x, y, units, style]) => {
        let lineNode = cache.search(y);
        if (lineNode == null) {
            const newLine = cache.insert(y);
            newLine.value = new algorithms_1.IntervalTree();
            lineNode = newLine;
        }
        const line = lineNode.value;
        const cLeft = x;
        const cRight = cLeft + units.length;
        let newCLeft = cLeft;
        let newCRight = cRight;
        // make the search range 1 unit bigger than the actual content size on
        // both ends, so that the result will include adjacent interval elements,
        // it gives me a chance to combine contiguous elements, so expand search range
        // [cLeft, cRight - 1] to [cLeft - 1, cRight]
        const existings = line.searchMultipleOverlaps(cLeft - 1, cRight);
        for (const [l, h, data] of existings) {
            // Result condition: l <= cRight && h >= cLeft - 1
            // delete intersection part of the existing, insert new content, unite it with contiguous existings
            // All cases that a searchMultipleOverlaps() result is about:
            // - case 1, existings contains parts which is NOT covered by new content
            //  or new contents is just next to adjacent existings
            //    If same style and not a "clear", combine them
            // - case 2, existing contains part which is fully covered (intersection) by new content.
            //    Delete that part
            line.deleteInterval(l, h);
            if (l < cLeft) {
                if (data !== 'clear' && data[1] === style) {
                    // combine
                    const choppedUnits = data[0].slice(0, cLeft - l);
                    if ((0, text_split_1.isCodePointFullWidth)(choppedUnits[choppedUnits.length - 1]))
                        choppedUnits[choppedUnits.length - 1] = canvas_1.SPACE_CODE_POINT;
                    units.unshift(...choppedUnits);
                    newCLeft = l;
                }
                else {
                    // insert chopped exiting one separately
                    const node = line.insertInterval(l, cLeft - 1);
                    if (data === 'clear') {
                        node.value = data;
                    }
                    else {
                        const choppedUnits = data[0].slice(0, cLeft - l);
                        if ((0, text_split_1.isCodePointFullWidth)(choppedUnits[choppedUnits.length - 1]))
                            choppedUnits[choppedUnits.length - 1] = canvas_1.SPACE_CODE_POINT;
                        node.value = [choppedUnits, data[1]];
                    }
                }
            }
            if (h > cRight) {
                if (data !== 'clear' && data[1] === style) {
                    // combine
                    const choppedUnits = data[0].slice(cRight - l);
                    if (choppedUnits[0] === -1)
                        choppedUnits[0] = canvas_1.SPACE_CODE_POINT;
                    units.push(...choppedUnits);
                    newCRight = h;
                }
                else {
                    // insert separately
                    const node = line.insertInterval(cRight, h);
                    if (data === 'clear') {
                        node.value = data;
                    }
                    else {
                        const choppedUnits = data[0].slice(cRight - l);
                        if (choppedUnits[0] === -1)
                            choppedUnits[0] = canvas_1.SPACE_CODE_POINT;
                        node.value = [choppedUnits, data[1]];
                    }
                }
            }
        }
        const node = line.insertInterval(newCLeft, newCRight - 1);
        node.value = [units, style];
    })));
    r('addStr -> add', s.pt.addStr.pipe(rx.map(([m, x, y, str, style]) => s.ft.add(x, y, [...(0, canvas_1.getTextDisplayUnits)(str)], style !== null && style !== void 0 ? style : []).dp(m))));
    r('clear', s.pt.clear.pipe(rx.mergeMap(([, x, y, w, h]) => {
        return rx.range(y, h).pipe(rx.map(lineIdx => {
            let lineNode = cache.search(lineIdx);
            if (lineNode == null) {
                const newLine = cache.insert(y);
                newLine.value = new algorithms_1.IntervalTree();
                lineNode = newLine;
            }
            const line = lineNode.value;
            const cLeft = x;
            const cRight = cLeft + w;
            let newCLeft = cLeft;
            let newCRight = cRight;
            const existings = line.searchMultipleOverlaps(cLeft - 1, cRight);
            // delete all existings, only insert non-clear existing if they has
            // part which is not covered by new "clear" region
            for (const [l, h, data] of existings) {
                if (data === 'clear' && l < cLeft - 1 && h > cRight) {
                    // existing fully covers new clear region
                    continue;
                }
                line.deleteInterval(l, h);
                if (l < newCLeft) {
                    if (data === 'clear') {
                        newCLeft = l;
                    }
                    else {
                        const [units, style] = data;
                        const fullWidthEnd = (0, text_split_1.isCodePointFullWidth)(units[cLeft - l - 1]);
                        const choppedUnits = units.slice(0, fullWidthEnd ? cLeft - l - 1 : cLeft - l);
                        const node = line.insertInterval(l, fullWidthEnd ? cLeft - 2 : cLeft - 1);
                        node.value = [choppedUnits, style];
                    }
                }
                if (h > newCRight) {
                    if (data === 'clear') {
                        newCRight = h;
                    }
                    else {
                        const [units, style] = data;
                        const prevCharFullWidth = units[cRight - l] === -1;
                        const choppedUnits = units.slice(prevCharFullWidth ? cRight - l + 1 : cRight - l);
                        const node = line.insertInterval(prevCharFullWidth ? cRight + 1 : cRight, h);
                        node.value = [choppedUnits, style];
                    }
                }
            }
            // Insert new "clear" content, but exclude region which covers those non-clear existings.
            const existingAdded = existings.filter(([, , data]) => data !== 'clear')
                .sort(([la], [lb]) => la - lb);
            let p = newCLeft;
            for (const [l, h] of existingAdded) {
                // service.log('-- clear loop', '[', l, h, '], newCLeft:', newCLeft, 'newCRight', newCRight, 'p', p);
                if (p < l) {
                    // service.log('-- clear', '[', p, l, ']');
                    const node = line.insertInterval(p, l - 1);
                    node.value = 'clear';
                }
                p = h + 1;
            }
            if (p < newCRight) {
                const node = line.insertInterval(p, newCRight - 1);
                node.value = 'clear';
            }
        }));
    })));
    r('fetchLines -> didFetchLines', s.pt.fetchLines.pipe(rx.map(([m, noColor, showClearAsChar]) => {
        function* cachedLines() {
            let col = 0;
            let row = 0;
            for (const [{ key: y, value: line }] of cache.allChildNodeInorder()) {
                const emptyLines = y - row;
                for (let i = 0; i < emptyLines; i++)
                    yield '\n';
                row = y;
                col = 0;
                let outputLine = '';
                for (const [l, h, data] of line.allIntervals()) {
                    if (data === 'clear' && showClearAsChar == null)
                        continue;
                    if (l > col)
                        outputLine += ' '.repeat(l - col);
                    if (data === 'clear') {
                        if (showClearAsChar)
                            outputLine += showClearAsChar.repeat(h - l + 1);
                    }
                    else {
                        outputLine += (0, canvas_1.treeNodeToStyleText)(noColor ? [data[0], undefined] : [data[0], data[1].join()]);
                    }
                    col = h + 1;
                }
                yield outputLine + '\n';
            }
        }
        s.ft.didFetchLines(cachedLines()).dp(m);
    })));
    r('fetchItems -> onRenderItem,onClearItem,didFetchItems', s.pt.fetchItems.pipe(rx.map(([m, rel]) => {
        const rX = rel ? rel[0] : 0;
        const rY = rel ? rel[1] : 0;
        for (const [{ key: y, value: line }] of cache.allChildNodeInorder()) {
            if (line == null) {
                continue;
            }
            for (const [l, h, data] of line.allIntervals()) {
                if (data === 'clear')
                    s.ft.onClearItem(l + rX, y + rY, h - l + 1).dp(m);
                else
                    s.ft.onRenderItem(l + rX, y + rY, ...data).dp(m);
            }
        }
        s.ft.didFetchItems().dp(m);
    })));
    r('cleanup', s.pt.cleanup.pipe(rx.map(() => {
        cache = new algorithms_1.RedBlackTree();
    })));
    s.ft.cache(cache).dp();
});
//# sourceMappingURL=canvas-cache.js.map