import * as rx from 'rxjs';
import { mat4 } from 'gl-matrix';
import chalk from 'chalk';
import { BaseReactorFactory, actionRelatedToAction } from '@wfh/reactivizer';
import { IntervalTree } from '@wfh/algorithms';
import { createRtreeInstance } from '../core/rbush.js';
import { isCodePointFullWidth as isFullWidth } from './text-split.js';
const CHALK_NUMBER_FN = new Set(['rgb', 'bgRgb', 'bgHsl', 'hsl', 'hex', 'bgHex', 'ansi', 'bgAnsi', 'ansi256', 'bgAnsi256']);
const tableFor = ['setBounding', 'setRootComponent', 'internalCache'];
export const canvasFac = new BaseReactorFactory({
    name: 'canvas', tableFor
}).defineReactor(ctx => {
    const canvas = ctx.init();
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
    const rtree$ = createRtreeInstance();
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
            addCodePointsToCache(x, i, units, style.sort(), false);
        }
    })));
    r('clearRect', pt.clearRect.pipe(rx.mergeMap(([, x, y, w, h]) => {
        return rx.range(y, h).pipe(rx.mergeMap(i => clearCodePointsFromCache(x, i, w)));
    })));
    r('render... -> onPrintText', pt.render.pipe(rx.concatMap(([m, rects]) => rx.combineLatest([
        table.l.setBounding, table.l.setRootComponent, rtree$
    ]).pipe(rx.take(1), rx.map(([[, x, y, w, h], [, root]]) => {
        // canvas.log('>> before uncommited', debugLineTrees(uncommited));
        if (root)
            root.ft.render(canvas, mat4.create(), rects && rects.length > 0 ? rects : [[0, 0, w, h]]).dp(m);
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
                const line = lines[i] = new IntervalTree();
                for (const [l, h, value] of proLines[i].allIntervals()) {
                    line.insertInterval(l, h).value = value;
                }
            }
            else {
                lines[i] = undefined;
            }
        }
        ft.internalCache(lines, proLines, uncommited).dp();
        ft.onRendered().dp(m);
    })))));
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
    function mergeRTreeContent(a) {
        return a;
    }
    r('setRenderOnRequest,waitForRbushImport$,requestRender -> render', pt.setRenderOnRequest.pipe(rx.switchMap(([, enabled]) => {
        let requestRenderMetas = [];
        return enabled ?
            pt.requestRender.pipe(rx.mergeMap(([m, rect]) => {
                requestRenderMetas.push(m);
                return rx.combineLatest([table.l.setBounding, rtree$]).pipe(rx.take(1), rx.map(([[, , , w, h], rtree]) => {
                    rtree.addOrUnionRectOnOverlap(rect !== null && rect !== void 0 ? rect : [0, 0, w, h], null, mergeRTreeContent);
                    // canvas.log('rectTree', [...rectTree.allRectangles()].length);
                    return [m, rtree];
                }));
            }), rx.throttleTime(150, rx.queueScheduler, { leading: false, trailing: true }), rx.exhaustMap(([m, rtree]) => new rx.Observable(sub => {
                const rects = rtree.all();
                rtree.clear();
                const requestRenderMetas0 = requestRenderMetas;
                requestRenderMetas = [];
                ft.render(rects.map(([r]) => r)).dp(m, ...requestRenderMetas0);
                sub.complete();
            }))) : rx.EMPTY;
    })));
    const filters = new Map();
    r('addRenderFilter,filter.renderBypassFilter... -> copyRect,addDisplayUnits...', pt.addRenderFilter.pipe(rx.mergeMap(([m, rect, filter]) => {
        filters.set(m.i, [rect, filter]);
        return rx.merge(filter.pt.renderBypassFilter.pipe(actionRelatedToAction(m), rx.map(([rm, x, y, units, style]) => ft.addDisplayUnits(x, y, units, style, true).dp(rm, m)), rx.takeUntil(pt.removeRenderFilter.pipe(actionRelatedToAction(m)))), ft.copyRect(...rect, ' ').re(m).od(pt.didCopyRect).pipe(rx.take(1), rx.mergeMap(([, paintables]) => paintables), rx.map(([x, , y, units, style]) => filter.ft.onRenderForFilter(x, y, units, style.split(';')).dp(m))));
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
    canvas.destory$.pipe(rx.mergeMap(() => table.l.setRootComponent), rx.map(([, c]) => {
        if (c)
            c.dispose();
    }), rx.take(1)).subscribe();
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
            if (isFullWidth(units[0])) {
                units[0] = SPACE_CODE_POINT;
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
                        const fullWidthEnd = isFullWidth(units[left - x - 1]);
                        const leftChopped = units.slice(0, left - x);
                        units = units.slice(left - x);
                        if (fullWidthEnd) {
                            units[0] = SPACE_CODE_POINT;
                            leftChopped[leftChopped.length - 1] = SPACE_CODE_POINT;
                        }
                        forNextFilter.push([x, y, leftChopped, style]);
                        x = left;
                    }
                    if (r > right) {
                        const fullWidthStart = isFullWidth(units[right - x - 1]);
                        const rightChopped = units.slice(right - x);
                        units = units.slice(0, right - x);
                        if (fullWidthStart) {
                            units[units.length - 1] = SPACE_CODE_POINT;
                            rightChopped[0] = SPACE_CODE_POINT;
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
            line = new IntervalTree();
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
                    if (low < x && isFullWidth(units[x - low - 1])) {
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
                        uniteDisplayUnits(uncLine, [wsStart, wsEnd - 1, new Array(wsEnd - wsStart).fill(SPACE_CODE_POINT), '']);
                    }
                    else {
                        // canvas.log('>> add ws to uncline', y, ':', wsStart, ',', wsEnd);
                        uncommited[y] = uncLine = new IntervalTree();
                        // canvas.log('>>> clearCode insert line', wsStart, wsEnd - 1);
                        const node = uncLine.insertInterval(wsStart, wsEnd - 1);
                        node.value = [new Array(wsEnd - wsStart).fill(SPACE_CODE_POINT), ''];
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
                const isLastFw = isFullWidth(units[chopEnd - 1]);
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
export function* getTextDisplayUnits(text) {
    const screenLineBuffer = [];
    for (const char of text) {
        const code = char.codePointAt(0);
        if (isFullWidth(code)) {
            yield code;
            yield -1;
        }
        else {
            yield code;
        }
    }
    return screenLineBuffer;
}
export const SPACE_CODE_POINT = ' '.codePointAt(0);
/** Inputed and returned "high" value is considered as an "included" value of range interval */
export function uniteDisplayUnits(line, target) {
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
            if (isFullWidth(choppedUnits[choppedUnits.length - 1])) {
                // A full width character is being chopped in the middle by overlapped new text, remove that character
                choppedUnits[choppedUnits.length - 1] = SPACE_CODE_POINT;
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
                choppedUnits[0] = SPACE_CODE_POINT;
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
export function rectIntersection([x1, y1, w1, h1], [x2, y2, w2, h2]) {
    const hoz = rangeIntersection(x1, x1 + w1, x2, x2 + w2);
    if (hoz == null)
        return null;
    const vert = rangeIntersection(y1, y1 + h1, y2, y2 + h2);
    if (vert == null)
        return null;
    return [hoz[0], vert[0], hoz[1] - hoz[0], vert[1] - vert[0]];
}
export function treeNodeToStyleText([codePoints, style]) {
    const text = String.fromCodePoint(...codePoints.filter(codePoint => codePoint >= 0));
    if (style) {
        const chalkFn = style.split(';').reduce((chalkInst, keyword) => {
            if (!keyword.includes('(')) {
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
            throw new Error('Canvas does not support chalk style keyword: ' + keyword);
        }, chalk);
        return chalkFn(text);
    }
    else {
        return text;
    }
}
export function debugLineTrees(lines, colorful = false) {
    return lines.map((els, i) => {
        if (els == null) {
            return '';
        }
        return `line ${i}\n` + debugLineTree(els, colorful);
    }).filter(line => line).join('\n');
}
export function debugLineTree(tree, colorful = false) {
    return [...tree.allIntervals()].map(([l, h, d]) => `  ${l} - ${h}, "${colorful ? treeNodeToStyleText(d) : treeNodeToStyleText([d[0], ''])}"`).join('\n');
}
//# sourceMappingURL=canvas.js.map