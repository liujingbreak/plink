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
exports.createPlaceHolder = createPlaceHolder;
/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const flex_container_1 = require("./flex-container");
const text_1 = require("./text");
const tableFor = ['setExpandDir', 'setLabel', 'setAveragePageSize',
    'onBeforePages', 'onAfterPages', 'beforePageRange', 'afterPageRange',
    'dp_setTotalPageNum', 'setMaxLoadedPages'];
function createPlaceHolder(opts) {
    var _a, _b;
    const service = new reactivizer_1.SimplexReactor(Object.assign(Object.assign(Object.assign({ name: 'LazyPlaceHolder' }, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.core), { tableFor }));
    const before = (0, flex_container_1.createFlexContainer)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: ((_a = opts === null || opts === void 0 ? void 0 : opts.default) === null || _a === void 0 ? void 0 : _a.name) ? (opts === null || opts === void 0 ? void 0 : opts.default.name) + '.head' : 'LazyPlaceHolder.head' }), opts === null || opts === void 0 ? void 0 : opts.headPlaceHolder));
    const after = (0, flex_container_1.createFlexContainer)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: ((_b = opts === null || opts === void 0 ? void 0 : opts.default) === null || _b === void 0 ? void 0 : _b.name) ? (opts === null || opts === void 0 ? void 0 : opts.default.name) + '.tail' : 'LazyPlaceHolder.tail' }), opts === null || opts === void 0 ? void 0 : opts.tailPlaceHolder));
    const { r, s, table } = service;
    const labelBefore = (0, text_1.createTextWidget)('...', Object.assign(Object.assign({ name: 'LazyPlaceHolder.headLabel' }, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.headPlaceHolderLabel));
    const labelAfter = (0, text_1.createTextWidget)('Loading...', Object.assign(Object.assign({ name: 'LazyPlaceHolder.headLabel' }, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.headPlaceHolderLabel));
    const loadedCompsByPage = new Map();
    const loadingPages = new Map();
    const distinctAveragePageSize$ = s.pt.setAveragePageSize.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.share());
    r('setLabel -> lable.setContent', s.pt.setLabel.pipe(rx.map(([m, text]) => {
        labelBefore.s.ft.setContent(text).dp(m);
        labelAfter.s.ft.setContent(text).dp(m);
    })));
    r('setViewportSize -> setMaxLoadedPages', rx.combineLatest([
        s.pt.setViewportSize.pipe(rx.distinctUntilChanged(([, wa, ha], [, wb, hb]) => wa === wb && ha === hb)),
        distinctAveragePageSize$
    ]).pipe(rx.switchMap(([[m, w, h], [m2, pageSize]]) => table.l.setExpandDir.pipe(rx.take(1), rx.map(([m3, dir]) => {
        if (pageSize > Number.EPSILON)
            s.ft.setMaxLoadedPages(Math.ceil((dir === 'col' ? h : w) / pageSize) + 1)
                .dp(m, m2, m3);
    })))));
    r('requestPage -> dp_onLoadPage | dp_didLoad -> onPagesLoaded, dp_setTotalPageNum', s.pt.requestPage.pipe(rx.mergeMap(([m, isHead, pIdx]) => {
        const load$ = s.ft.dp_onLoadPage(pIdx, isHead ? 'prepend' : 'append')
            .re(m, m.r).od(s.pt.dp_didLoad).pipe(rx.take(1), rx.takeUntil(s.pt.cancelRequestPage.pipe(rx.filter(([, idx]) => idx === pIdx))), rx.map(([, results]) => {
            loadedCompsByPage.set(pIdx, results);
            const state = loadingPages.get(pIdx);
            if (state) {
                state.loaded = true;
                state.isEmpty = results.length === 0;
            }
            else {
                service.log(`Error: Why loadingPages misses page #${pIdx}`);
                throw new Error(`Why loadingPages misses page #${pIdx}`);
            }
        }), rx.takeUntil(s.pt.dp_onLoadError.pipe(rx.filter(([, , page]) => page === pIdx))), rx.catchError((err) => {
            loadingPages.delete(pIdx);
            return rx.EMPTY;
        }));
        return rx.concat(load$, rx.defer(() => {
            var _a;
            const states = [...loadingPages.entries()]
                .filter(([, { isHead: isHead0 }]) => isHead0 === isHead)
                .sort(([p], [p2]) => p - p2);
            service.log('<<< after dp_didLoad for', isHead ? 'head' : 'tail', 'filtered loadingPages', ...states.map(([p, state]) => `p: ${p} -> ${JSON.stringify(state)}`));
            if (states.length === 0 || !states.every(([, st]) => st.loaded)) {
                // wait for all loading pages are loaded
                return rx.EMPTY;
            }
            let done$ = rx.EMPTY;
            const emptyPageState = states.find(([, state]) => state.isEmpty);
            if (emptyPageState) {
                loadingPages.delete(emptyPageState[0]);
                done$ = table.l.dp_setTotalPageNum.pipe(rx.take(1), rx.map(([, totalPage]) => {
                    if (totalPage === 'unknown' || totalPage > emptyPageState[0])
                        s.ft.dp_setTotalPageNum(emptyPageState[0]).dp(m, m.r);
                }));
            }
            const startIdx = states[0][0];
            const endIdx = emptyPageState ? emptyPageState[0] : states[states.length - 1][0] + 1;
            const comps = [];
            for (const [i, state] of states) {
                if (state.isEmpty)
                    break;
                if (state.isHead !== isHead)
                    continue;
                comps.push(...((_a = loadedCompsByPage.get(i)) !== null && _a !== void 0 ? _a : []));
                loadingPages.delete(i);
            }
            // service.log('<<< startIdx', startIdx, 'endIdx', endIdx);
            if (comps.length > 0)
                s.ft.onPagesLoaded(isHead, startIdx, endIdx, comps).dp(m, m.r);
            return done$;
        }));
    })));
    r('onPagesLoaded... -> beforePageRange, afterPageRange, dp_onUnload', s.pt.onPagesLoaded.pipe(rx.withLatestFrom(table.l.beforePageRange, table.l.afterPageRange, table.l.setMaxLoadedPages, table.l.dp_setTotalPageNum), rx.map(([[m, isHead, start, end], [, start1, end1], [, start2, end2], [, maxLoaded], [, totalPages]]) => {
        if (!isHead) {
            s.ft.afterPageRange(end, totalPages === 'unknown' ? end + 1 : totalPages).dp(m);
            if (start > start2) {
                // In case the pages between start2 and start are skipped (not loaded)
                s.ft.beforePageRange(start1, start).dp(m);
                // Unload some of previously visible and loaded rows between end1 and start2
                rx.range(end1, start2 - end1).pipe(rx.map(pageIdx => {
                    const item = loadedCompsByPage.get(pageIdx);
                    s.ft.dp_onUnload(pageIdx, item).dp(m);
                    loadingPages.delete(pageIdx);
                    loadedCompsByPage.delete(pageIdx);
                })).subscribe();
            }
            else if (end - end1 > maxLoaded) {
                const changedEnd1 = end - maxLoaded;
                s.ft.beforePageRange(start1, changedEnd1).dp(m);
                rx.range(end1, changedEnd1 - end1).pipe(rx.map(pageIdx => {
                    const item = loadedCompsByPage.get(pageIdx);
                    s.ft.dp_onUnload(pageIdx, item).dp(m);
                    loadingPages.delete(pageIdx);
                    loadedCompsByPage.delete(pageIdx);
                })).subscribe();
            }
        }
        else {
            s.ft.beforePageRange(start1, start).dp(m);
            if (end < end1) {
                // In case the pages between end and end1 are skipped
                s.ft.afterPageRange(end, end2).dp(m);
                // Unload some of previously visible and loaded rows between end1 and start2
                rx.range(end1, start2 - end1).pipe(rx.map(pageIdx => {
                    const item = loadedCompsByPage.get(pageIdx);
                    s.ft.dp_onUnload(pageIdx, item).dp(m);
                    loadingPages.delete(pageIdx);
                    loadedCompsByPage.delete(pageIdx);
                })).subscribe();
            }
            else if (start2 - start > maxLoaded) {
                const changedStart2 = maxLoaded + start;
                s.ft.afterPageRange(changedStart2, end2).dp(m);
                rx.range(changedStart2, start2 - changedStart2).pipe(rx.map(pageIdx => {
                    const item = loadedCompsByPage.get(pageIdx);
                    s.ft.dp_onUnload(pageIdx, item).dp(m);
                    loadingPages.delete(pageIdx);
                    loadedCompsByPage.delete(pageIdx);
                })).subscribe();
            }
        }
    })));
    // Turn cancelRequestPage to "dp_onCancelLoad" with action meta of "dp_onLoadPage" message, it's
    // more convenient for outside consumer to subsribe on "dp_onLoadPage" in the context of "dp_onLoadPage"
    r('dp_onLoadPage, cancelRequestPage, dp_didLoad -> dp_onCancelLoad', s.pt.dp_onLoadPage.pipe(rx.mergeMap(([m, pIdx]) => s.pt.cancelRequestPage.pipe(rx.filter(([, i]) => i === pIdx), rx.take(1), rx.map(() => {
        s.ft.dp_onCancelLoad(pIdx).dp(m);
    }), rx.timeout(20000), rx.takeUntil(s.pt.dp_didLoad.pipe((0, reactivizer_1.actionRelatedToAction)(m))), rx.takeUntil(s.pt.dp_onLoadError.pipe(rx.filter(([, , page]) => page === pIdx))), rx.takeUntil(s.pt.__onError.pipe((0, reactivizer_1.actionRelatedToAction)(m)))))));
    // Avoid repeatitively request same page, also control to cancel abandonded request,
    // ensure there is only one ongoing request for each page
    r('requestPages, "loadingPages" -> requestPage, cancelRequestPage, "loadingPages"', s.pt.requestPages.pipe(rx.map(([m2, isHeadPlaceHolder, tIdx, tNum]) => {
        service.log('>>> requestPages handling', isHeadPlaceHolder, tIdx, tNum);
        for (let i = tIdx, l = tIdx + tNum; i < l; i++) {
            if (!loadingPages.has(i)) {
                loadingPages.set(i, { keep: true, isHead: isHeadPlaceHolder });
                s.ft.requestPage(isHeadPlaceHolder, i).dp(m2);
            }
            else {
                const state = loadingPages.get(i);
                state.keep = true;
                state.isHead = isHeadPlaceHolder;
            }
        }
        for (const [idx, state] of loadingPages.entries()) {
            if (state.isHead === isHeadPlaceHolder && !state.keep) {
                s.ft.cancelRequestPage(idx).dp(m2);
                loadingPages.delete(idx);
            }
            else {
                state.keep = isHeadPlaceHolder;
            }
        }
        service.log('requestPages >>> loadingPages', ...[...loadingPages.entries()].map(([p, obj]) => `${p}: ${JSON.stringify(obj)}`));
    })));
    r('onBeforePages, before.onRender -> requestPages', s.pt.onBeforePages.pipe(rx.map(([, pages]) => pages), rx.distinctUntilChanged(), rx.switchMap(pages => {
        return pages > 0 ? before.s.pt.onRender.pipe(rx.withLatestFrom(table.l.setExpandDir, table.l.beforePageRange, before.table.l.onSize), rx.filter(([, , [, r0, r1], [, w, h]]) => r1 > r0 && w > 0 && h > 0), rx.concatMap(a => rx.timer(50).pipe(rx.map(() => a))), rx.map(([[m, , , _renderSelf, clips], [, dir], [, pageRangeOpen, pageRangeClose], [, w, h]]) => {
            const pageSize = (dir === 'col' ? h : w) / (pageRangeClose - pageRangeOpen);
            const [pIndex0, pIndex1] = clipRangeToPageIndex(dir, clips, pageSize);
            // service.log('>>> head clipRangeToPageIndex(): pIndex0', pIndex0, 'pIndex1', pIndex1, 'pageSize', pageSize, 'clips', clips.join());
            return [pIndex0 + pageRangeOpen, pIndex1 - pIndex0 + 1, m];
        }), rx.distinctUntilChanged(([s1, e1], [s2, e2]) => s1 === s2 && e1 === e2), rx.map(([start, end, m]) => s.ft.requestPages(true, start, end).dp(m))) : rx.EMPTY;
    })));
    r('onAfterPages, after.onRender -> requestPages', s.pt.onAfterPages.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.switchMap(([, pages]) => {
        return pages > 0 ? after.s.pt.onRender.pipe(rx.withLatestFrom(table.l.setExpandDir, table.l.afterPageRange, after.table.l.onSize), rx.filter(([, , [, r0, r1], [, w, h]]) => r1 > r0 && w > 0 && h > 0), rx.concatMap(a => rx.timer(50).pipe(rx.map(() => a))), rx.map(([[m, , , _renderSelf, clips], [, dir], [, pageRangeOpen, pageRangeClose], [, w, h]]) => {
            const sizeForEachPage = (dir === 'col' ? h : w) / (pageRangeClose - pageRangeOpen);
            const [pIndex0, pIndex1] = clipRangeToPageIndex(dir, clips, sizeForEachPage);
            // service.log('>>> tail clipRangeToPageIndex(): pIndex0', pIndex0, 'pIndex1', pIndex1, 'pageSize', sizeForEachPage, 'clips', clips.join());
            return [pIndex0 + pageRangeOpen, pIndex1 - pIndex0 + 1, m];
        }), rx.distinctUntilChanged(([s1, e1], [s2, e2]) => s1 === s2 && e1 === e2), rx.map(([start, end, m]) => s.ft.requestPages(false, start, end).dp(m))) : rx.EMPTY;
    })));
    r('setAveragePageSize... -> before.setPreferredSize, after.setPreferredSize', rx.combineLatest([
        distinctAveragePageSize$,
        table.l.setExpandDir, before.s.pt.onContentSizeChange,
        after.s.pt.onContentSizeChange, table.l.onBeforePages, table.l.onAfterPages
    ]).pipe(rx.map(([[m, size], [, dir], [, beforeW, beforeH], [, afterW, afterH], [, bPages], [, aPages]]) => {
        if (dir === 'col') {
            // service.log(`+++ setAveragePageSize: ${size}, head [w:${beforeW}, h:${beforeH}], tail [w:${afterW}, h:${afterH}], aPages: ${aPages}`);
            before.s.ft.setPreferredSize(beforeW, bPages > 0 ? Math.max(size * bPages, beforeH) : 0).dp(m);
            after.s.ft.setPreferredSize(afterW, aPages > 0 ? Math.max(size * aPages, afterH) : 0).dp(m);
        }
        else {
            before.s.ft.setPreferredSize(bPages > 0 ? Math.max(size * bPages, beforeW) : 0, beforeH).dp(m);
            after.s.ft.setPreferredSize(aPages > 0 ? Math.max(size * aPages, afterW) : 0, afterH).dp(m);
        }
    })));
    r('afterPageRange -> onAfterPages', s.pt.afterPageRange.pipe(rx.map(([m, start, end]) => s.ft.onAfterPages(end - start).dp(m))));
    r('dp_setTotalPageNum', s.pt.dp_setTotalPageNum.pipe(rx.map(([m, num]) => {
        var _a;
        if (num !== 'unknown') {
            s.ft.afterPageRange((_a = table.getData().afterPageRange[0]) !== null && _a !== void 0 ? _a : 0, num).dp(m);
        }
    })));
    r('beforePageRange -> onBeforePages', s.pt.beforePageRange.pipe(rx.map(([m, start, end]) => s.ft.onBeforePages(end - start).dp(m))));
    before.s.ft.justifyContent('center').dp();
    before.s.ft.alignItems('end').dp();
    after.s.ft.justifyContent('center').dp();
    after.s.ft.alignItems('start').dp();
    // before.s.ft.setBackground('bgGreen').dp();
    // after.s.ft.setBackground('bgBlue').dp();
    before.s.ft.addChild(labelBefore.b).dp();
    after.s.ft.addChild(labelAfter.b).dp();
    s.ft.beforePageRange(0, 0).dp();
    s.ft.afterPageRange(0, 1).dp();
    s.ft.setLabel('...').dp();
    s.ft.setExpandDir('col').dp();
    s.ft.setAveragePageSize(0).dp();
    s.ft.onBeforePages(0).dp();
    s.ft.setMaxLoadedPages(Number.MAX_SAFE_INTEGER).dp();
    s.ft.dp_setTotalPageNum('unknown').dp();
    return { before, after, service };
}
function clipRangeToPageIndex(dir, clips, pageSize) {
    const clipRangeOpen = dir === 'col' ?
        clips.reduce((maxTop, [, y]) => maxTop > y ? maxTop : y, 0) :
        clips.reduce((maxLeft, [x]) => maxLeft > x ? maxLeft : x, 0);
    const clipRangeClose = dir === 'col' ?
        clips.reduce((minBottom, [, y, , h]) => {
            const b = y + h;
            return minBottom < b ? minBottom : b;
        }, Number.MAX_SAFE_INTEGER) :
        clips.reduce((minRight, [x, , w]) => {
            const r = x + w;
            return minRight < r ? minRight : r;
        }, Number.MAX_SAFE_INTEGER);
    const pageIndex0 = Math.floor(clipRangeOpen / pageSize);
    const pageIndex1 = Math.floor((clipRangeClose - 1) / pageSize);
    return [pageIndex0, pageIndex1];
}
//# sourceMappingURL=lazy-load-placeholder.js.map