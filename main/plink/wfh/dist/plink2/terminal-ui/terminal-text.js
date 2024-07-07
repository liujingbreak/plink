"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTextWidget = createTextWidget;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const process_common_1 = require("../process-common");
const terminal_canvas_1 = require("./terminal-canvas");
const terminal_widget_1 = require("./terminal-widget");
const text_split_1 = require("./text-split");
const tableForMultiLineText = ['setContent', 'setStyle', 'onDisplayLines', 'onDisplayLinesForWidth', 'onDisplayLinesForPrefSize'];
function createTextWidget() {
    const service = (0, terminal_widget_1.createBase)().config({
        name: 'text', tableFor: tableForMultiLineText,
        log: nodejs_utils_1.conciseNocolorConsoleLogger
    });
    const { r, s, table } = service;
    const spliter = (0, text_split_1.createWordSplitter)();
    r('render', s.pt.render.pipe(rx.withLatestFrom(table.l.onDisplayLines, table.l.setStyle), rx.map(([[m, canvas, trans], [, lines], [, style]]) => {
        const leftop = [0, 0];
        const [x, y0] = gl_matrix_1.vec2.transformMat4(leftop, leftop, trans);
        for (let i = 0, l = lines.length; i < l; i++) {
            canvas.s.ft.addDisplayUnits(x, y0 + i, lines[i], style).dp(m);
        }
    })));
    r('querySizeOf, preferredSize -> prefHeightFor, prefWidthFor, onDisplayLinesForWidth', s.pt.querySizeOf.pipe(rx.withLatestFrom(s.pt.preferredSize, table.l.setContent), rx.mergeMap(([[m, width, height], [, prefWidth, _prefHeight], [, content]]) => {
        if (height != null) {
            s.ft.prefWidthFor(prefWidth, height).dp(m);
            return rx.EMPTY;
        }
        else if (width != null) {
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
    r('setSize, setContent -> preferredSize, onDisplayLines, overflow, onDisplayLinesForWidth', rx.combineLatest([
        s.pt.setSize.pipe(rx.distinctUntilChanged(([, aw, ah], [, bw, bh]) => aw === bw && ah === bh)),
        s.pt.setContent.pipe(rx.tap(([m, content]) => {
            const [lines, maxWidth] = preferLayoutText(content);
            s.ft.onDisplayLinesForWidth().dp(m);
            s.ft.preferredSize(maxWidth, lines.length).dp(m);
            s.ft.onDisplayLinesForPrefSize(lines.map(line => [...(0, terminal_canvas_1.getTextDisplayUnits)(line)])).dp(m);
        }))
    ]).pipe(rx.mergeMap(([setSize, [mSetContent]]) => rx.combineLatest([
        table.l.preferredSize.pipe((0, reactivizer_1.actionRelatedToAction)(mSetContent)),
        table.l.onDisplayLinesForPrefSize.pipe((0, reactivizer_1.actionRelatedToAction)(mSetContent))
    ]).pipe(rx.map(b => [setSize, ...b]), rx.take(1))), rx.mergeMap(([[m, width, height], [, prefWidth, prefHeight], [, linesOfPrefSize]]) => {
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
            return s.ft.querySizeOf(width, null).od(s.pt.onDisplayLinesForWidth).pipe(rx.map(([, , lines]) => {
                s.ft.overflow(lines.length > height).dp(m);
                s.ft.onDisplayLines(lines).dp(m);
            }));
        }
    })));
    s.ft.addRerenderAction(s.pt.setContent).dp();
    s.ft.addRerenderAction(s.pt.setStyle).dp();
    s.ft.preferredSize(0, 0).dp();
    s.ft.setSize(0, 0).dp();
    s.ft.setParent(null).dp();
    s.ft.overflow(false).dp();
    s.ft.setStyle([]).dp();
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
                width += codePoint ? ((0, process_common_1.isCodePointFullWidth)(codePoint) ? 2 : 1) : 0;
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
                return new rx.Observable(sub => {
                    let offset = 0;
                    const remainingWidth = displayLength - width;
                    while (offset < remainingWidth) {
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