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
exports.textWidgetFac = exports.tableForMultiLineText = void 0;
exports.createTextWidget = createTextWidget;
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const canvas_1 = require("./canvas");
const base_1 = require("./base");
const text_split_1 = require("./text-split");
exports.tableForMultiLineText = ['setContent', 'setStyle', 'onDisplayLines', 'onDisplayLinesForWidth', 'onDisplayLinesForPrefSize', 'onStyleWithParentBg'];
exports.textWidgetFac = base_1.baseComponentFac.forExtend({
    name: 'text',
    tableFor: exports.tableForMultiLineText
}).interceptorByType(ad => rx.merge(ad.at.setContent.pipe(rx.distinctUntilChanged(({ p: [a] }, { p: [b] }) => a === b)), ad.ofOtherTypes())).defineReactor((init, initialText, opts) => {
    const service = init(opts);
    const spliter = (0, text_split_1.createWordSplitter)({ debug: false, log: opts === null || opts === void 0 ? void 0 : opts.log });
    const { r, s, ft, pt, table } = service;
    r('onRender', pt.onRender.pipe(rx.filter(([, , , needRerender]) => needRerender), rx.withLatestFrom(table.l.onDisplayLines, table.l.onStyleWithParentBg, table.l.onSize, table.l.overflow, table.l.onBgChangeWithParent), rx.map(([[m, canvas, trans], [, lines], [, style], [, width, height], [, overflow], [, bg]]) => {
        const leftop = [0, 0];
        const [x, y0] = gl_matrix_1.vec2.transformMat4(leftop, leftop, trans);
        const lineCnt = Math.min(height, lines.length);
        for (let i = 0, l = lineCnt; i < l; i++) {
            // canvas.log('>>>', String.fromCodePoint(...lines[i]));
            const line = lines[i];
            if (line.length < width) {
                if (bg)
                    canvas.ft.addString(x + line.length, y0 + i, ' '.repeat(width - line.length), [bg]).dp(m);
                else
                    canvas.ft.clearRect(x + line.length, y0 + i, width - line.length, 1).dp(m);
            }
            canvas.ft.addDisplayUnits(x, y0 + i, lines[i], style).dp(m);
        }
        if (overflow)
            canvas.ft.addString(x + width - 3, y0 + lineCnt - 1, '...').dp(m);
    })));
    r('querySizeOf, preferredSize -> prefHeightFor, prefWidthFor, onDisplayLinesForWidth', pt.querySizeOf.pipe(rx.withLatestFrom(table.l.preferredSize, table.l.setContent), rx.mergeMap(([[m, width, height], [, prefWidth, _prefHeight], [, content]]) => {
        if (height != null) {
            if (height < 0)
                throw new Error('querySizeOf can not accept negative parameter');
            ft.prefWidthFor(prefWidth, height).dp(m);
            return rx.EMPTY;
        }
        else if (width != null) {
            if (width < 0) {
                throw new Error('querySizeOf can not accept negative parameter');
            }
            const [prevWidth, prevLines] = table.getData().onDisplayLinesForWidth;
            if (prevWidth === width && prevLines) {
                ft.prefHeightFor(width, prevLines.length).dp(m);
                return rx.EMPTY;
            }
            else {
                return textInConstrainedWidth(width, content).pipe(rx.mergeMap(([countLines, lines$]) => {
                    ft.prefHeightFor(width, countLines).dp(m);
                    return lines$;
                }), rx.reduce((lines, it) => {
                    lines.push(it);
                    return lines;
                }, []), rx.map(lines => {
                    ft.onDisplayLinesForWidth(width, lines).dp(m);
                    return null;
                }));
            }
        }
        else {
            return rx.EMPTY;
        }
    })));
    r('onSize, setContent -> preferredSize, onDisplayLines, overflow, onDisplayLinesForWidth', rx.combineLatest([
        table.l.onSize,
        table.l.setContent.pipe(rx.map(([m, content]) => {
            const [lines, maxWidth] = preferLayoutText(content);
            ft.onDisplayLinesForWidth().dp(m);
            ft.onContentSizeChange(maxWidth, lines.length).dp(m);
            const linesForPrefSize = lines.map(line => [...(0, canvas_1.getTextDisplayUnits)(line)]);
            ft.onDisplayLinesForPrefSize(linesForPrefSize).dp(m);
            return [m, maxWidth, lines.length, linesForPrefSize];
        }))
    ]).pipe(rx.mergeMap(([[m, width, height], [, prefWidth, prefHeight, linesOfPrefSize]]) => {
        if (width == null || height == null)
            throw new Error(`Error: ${width} or ${height} is not valid value of "onSize [i: ${m.i}, r: ${JSON.stringify(m.r)}]" of ${s.logPrefix}`);
        // service.log('======', width, height, prefWidth, prefHeight, linesOfPrefSize);
        if (width === 0) {
            ft.onDisplayLines([]).dp(m);
            ft.overflow(false).dp(m);
            return rx.EMPTY;
        }
        const [cachedWidth, cachedLines] = table.getData().onDisplayLinesForWidth;
        if (cachedWidth === width && cachedLines) {
            ft.onDisplayLines(cachedLines).dp(m);
            ft.overflow(cachedLines.length > height).dp(m);
            return rx.EMPTY;
        }
        else if (width > prefWidth) {
            ft.onDisplayLines(linesOfPrefSize).dp(m);
            ft.overflow(prefHeight > height).dp(m);
            return rx.EMPTY;
        }
        else {
            return ft.querySizeOf(width, null).re(m).od(pt.onDisplayLinesForWidth).pipe(rx.map(([, , lines]) => {
                ft.overflow(lines.length > height).dp(m);
                ft.onDisplayLines(lines).dp(m);
            }));
        }
    })));
    r('setParent, setStyle, parent.setBackground -> onStyleWithParentBg', rx.combineLatest([
        table.l.onBgChangeWithParent,
        table.l.setStyle
    ]).pipe(rx.map(([[m, pBg], [m2, style]]) => {
        if (m && pBg)
            ft.onStyleWithParentBg([...style, pBg]).dp(m, m2);
        else
            ft.onStyleWithParentBg(style).dp(m2);
    })));
    const renderData = [
        table.l.setDisplay,
        table.l.onSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)),
        table.l.setBackground,
        table.l.setContent, table.l.setStyle
    ];
    r('init', new rx.Observable(() => {
        ft.onContentSizeChange(0, 0).dp();
        ft.onSize(0, 0).dp();
        ft.setParent(null).dp();
        ft.overflow(false).dp();
        ft.setStyle([]).dp();
        ft.setContent(initialText).dp();
        ft.setRenderChanges(renderData).dp();
        ft.setFlexShrink(1).dp();
    }));
    function preferLayoutText(content) {
        const lines = content.split(/\r?\n/, 5000);
        let maxWidth = 0;
        let lineIdx = 0;
        for (const line of lines) {
            if (lineIdx > 5000)
                break;
            let width = 0;
            for (const char of line) {
                const codePoint = char.codePointAt(0);
                width += codePoint ? ((0, text_split_1.isCodePointFullWidth)(codePoint) ? 2 : 1) : 0;
            }
            if (width > maxWidth)
                maxWidth = width;
            lineIdx++;
        }
        return [lines, maxWidth];
    }
    function textInConstrainedWidth(width, content) {
        const lines$ = new rx.ReplaySubject();
        let columnOffset = 0;
        let currLine = [];
        return spliter.ft.setTextToSplit(content).od(spliter.pt.onWordRecorded).pipe(rx.take(1), rx.mergeMap(([, word$]) => word$), 
        // in case length of single word is bigger than constrained width
        rx.concatMap(word => {
            const [text, type, displayLength] = word;
            if (type === 'a' && displayLength > width) {
                if (width <= 1)
                    return rx.from(word[0].map(code => [[code], word[1], word[2]]));
                else
                    return new rx.Observable(sub => {
                        let offset = 0;
                        const remainingLen = displayLength - width;
                        while (offset < remainingLen) {
                            const chopped = text.slice(offset, offset + width - 1);
                            chopped.push('-'.codePointAt(0));
                            offset += width - 1;
                            sub.next([chopped, type, width]);
                        }
                        if (offset < (text.length - 1)) {
                            sub.next([text.slice(offset), type, text.length - offset]);
                        }
                        sub.complete();
                    });
            }
            else {
                return rx.of(word);
            }
        }), rx.reduce((countLines, [word, type, displayLength]) => {
            if (type === 'n') {
                countLines++;
                lines$.next(currLine);
                currLine = [];
                columnOffset = 0;
            }
            else if (columnOffset + displayLength > width) {
                countLines++;
                lines$.next(currLine);
                if (type === 's') {
                    currLine = [];
                    columnOffset = 0;
                }
                else {
                    currLine = word;
                    columnOffset = displayLength;
                }
            }
            else {
                currLine.push(...word);
                columnOffset += displayLength;
            }
            return countLines;
        }, 1), rx.map(countLines => {
            if (currLine)
                lines$.next(currLine);
            lines$.complete();
            return [countLines, lines$.asObservable()];
        }));
    }
});
function createTextWidget(initialText = '', opts) {
    const service = exports.textWidgetFac.create(initialText, opts);
    return service;
}
//# sourceMappingURL=text.js.map