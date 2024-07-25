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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTextWidget = createTextWidget;
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const terminal_canvas_1 = require("./terminal-canvas");
const terminal_widget_1 = require("./terminal-widget");
const text_split_1 = require("./text-split");
const tableForMultiLineText = ['setContent', 'setStyle', 'onDisplayLines', 'onDisplayLinesForWidth', 'onDisplayLinesForPrefSize', 'onStyleWithParentBg'];
function createTextWidget(initialText = '', opts) {
    const service = (0, terminal_widget_1.createBase)().config(Object.assign({ name: 'text', tableFor: tableForMultiLineText, log: nodejs_utils_1.conciseNocolorConsoleLogger }, opts));
    const spliter = (0, text_split_1.createWordSplitter)({ debug: false, log: opts === null || opts === void 0 ? void 0 : opts.log });
    const { r, s, table } = service;
    r('onRender', s.pt.onRender.pipe(rx.filter(([, , , needRerender]) => needRerender), rx.withLatestFrom(table.l.onDisplayLines, table.l.onStyleWithParentBg, table.l.onSize, table.l.overflow), rx.map(([[m, canvas, trans], [, lines], [, style], [, width, height], [, overflow]]) => {
        const leftop = [0, 0];
        const [x, y0] = gl_matrix_1.vec2.transformMat4(leftop, leftop, trans);
        const lineCnt = Math.min(height, lines.length);
        for (let i = 0, l = lineCnt; i < l; i++) {
            // canvas.log('>>>', String.fromCodePoint(...lines[i]));
            canvas.s.ft.addDisplayUnits(x, y0 + i, lines[i], style).dp(m);
        }
        if (overflow)
            canvas.s.ft.addString(x + width - 3, lineCnt - 1, '...').dp(m);
    })));
    r('querySizeOf, preferredSize -> prefHeightFor, prefWidthFor, onDisplayLinesForWidth', s.pt.querySizeOf.pipe(rx.withLatestFrom(table.l.preferredSize, table.l.setContent), rx.mergeMap(([[m, width, height], [, prefWidth, _prefHeight], [, content]]) => {
        if (height != null) {
            if (height < 0)
                throw new Error('querySizeOf can not accept negative parameter');
            s.ft.prefWidthFor(prefWidth, height).dp(m);
            return rx.EMPTY;
        }
        else if (width != null) {
            if (width < 0) {
                throw new Error('querySizeOf can not accept negative parameter');
            }
            const [prevWidth, prevLines] = table.getData().onDisplayLinesForWidth;
            if (prevWidth === width && prevLines) {
                s.ft.prefHeightFor(width, prevLines.length).dp(m);
                return rx.EMPTY;
            }
            else {
                return textInConstrainedWidth(width, content).pipe(rx.mergeMap(([countLines, lines$]) => {
                    s.ft.prefHeightFor(width, countLines).dp(m);
                    return lines$;
                }), rx.reduce((lines, it) => {
                    lines.push(it);
                    return lines;
                }, []), rx.map(lines => {
                    s.ft.onDisplayLinesForWidth(width, lines).dp(m);
                    return null;
                }));
            }
        }
        else {
            return rx.EMPTY;
        }
    })));
    r('onSize, setContent -> preferredSize, onDisplayLines, overflow, onDisplayLinesForWidth', rx.combineLatest([
        table.l.onSize.pipe(rx.distinctUntilChanged(([, aw, ah], [, bw, bh]) => aw === bw && ah === bh)),
        table.l.setContent.pipe(rx.map(([m, content]) => {
            const [lines, maxWidth] = preferLayoutText(content);
            s.ft.onDisplayLinesForWidth().dp(m);
            s.ft.preferredSize(maxWidth, lines.length).dp(m);
            const linesForPrefSize = lines.map(line => [...(0, terminal_canvas_1.getTextDisplayUnits)(line)]);
            s.ft.onDisplayLinesForPrefSize(linesForPrefSize).dp(m);
            return [m, maxWidth, lines.length, linesForPrefSize];
        }))
    ]).pipe(rx.mergeMap(([[m, width, height], [, prefWidth, prefHeight, linesOfPrefSize]]) => {
        // service.log('======', width, height, prefWidth, prefHeight, linesOfPrefSize);
        if (width === 0) {
            s.ft.onDisplayLines([]).dp(m);
            s.ft.overflow(false).dp(m);
            return rx.EMPTY;
        }
        const [cachedWidth, cachedLines] = table.getData().onDisplayLinesForWidth;
        if (cachedWidth === width && cachedLines) {
            s.ft.onDisplayLines(cachedLines).dp(m);
            s.ft.overflow(cachedLines.length > height).dp(m);
            return rx.EMPTY;
        }
        else if (width > prefWidth) {
            s.ft.onDisplayLines(linesOfPrefSize).dp(m);
            s.ft.overflow(prefHeight > height).dp(m);
            return rx.EMPTY;
        }
        else {
            return s.ft.querySizeOf(width, null).re(m).od(s.pt.onDisplayLinesForWidth).pipe(rx.map(([, , lines]) => {
                s.ft.overflow(lines.length > height).dp(m);
                s.ft.onDisplayLines(lines).dp(m);
            }));
        }
    })));
    r('setParent, setStyle, parent.setBackground -> onStyleWithParentBg', rx.combineLatest([
        table.l.setParent.pipe(rx.switchMap(([, parent]) => parent ? parent.table.l.onBgChangeWithParent : rx.of([null, null]))),
        table.l.setStyle
    ]).pipe(rx.map(([[m, pBg], [m2, style]]) => {
        if (m && pBg)
            s.ft.onStyleWithParentBg([...style, pBg]).dp(m, m2);
        else
            s.ft.onStyleWithParentBg(style).dp(m2);
    })));
    r('init', new rx.Observable(() => {
        s.ft.addRerenderAction(s.pt.setContent).dp();
        s.ft.addRerenderAction(s.pt.setStyle).dp();
        s.ft.preferredSize(0, 0).dp();
        s.ft.onSize(0, 0).dp();
        s.ft.setParent(null).dp();
        s.ft.overflow(false).dp();
        s.ft.setStyle([]).dp();
        s.ft.setContent(initialText).dp();
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
        return spliter.s.ft.setTextToSplit(content).od(spliter.s.pt.onWordRecorded).pipe(rx.take(1), rx.mergeMap(([, word$]) => word$), 
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
    return service;
}
//# sourceMappingURL=terminal-text.js.map