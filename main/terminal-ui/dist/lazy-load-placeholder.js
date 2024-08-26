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
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const flex_container_1 = require("./flex-container");
const text_1 = require("./text");
const tableFor = ['setExpandDir', 'setLabel', 'setAveragePageSize', 'onLoadedPageChanges',
    'onBeforePages', 'onAfterPages', 'beforePageRange', 'afterPageRange',
    'setTotalPageNum', 'maxLoadedPages'];
function createPlaceHolder(opts) {
    var _a, _b;
    const service = new reactivizer_1.SimplexReactor(Object.assign(Object.assign(Object.assign({ name: 'LazyPlaceHolder' }, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.core), { tableFor }));
    const before = (0, flex_container_1.createFlexContainer)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: ((_a = opts === null || opts === void 0 ? void 0 : opts.default) === null || _a === void 0 ? void 0 : _a.name) ? (opts === null || opts === void 0 ? void 0 : opts.default.name) + '.head' : 'LazyPlaceHolder.head' }), opts === null || opts === void 0 ? void 0 : opts.headPlaceHolder));
    const after = (0, flex_container_1.createFlexContainer)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: ((_b = opts === null || opts === void 0 ? void 0 : opts.default) === null || _b === void 0 ? void 0 : _b.name) ? (opts === null || opts === void 0 ? void 0 : opts.default.name) + '.tail' : 'LazyPlaceHolder.tail' }), opts === null || opts === void 0 ? void 0 : opts.tailPlaceHolder));
    const { r, s, table } = service;
    const labelBefore = (0, text_1.createTextWidget)('Loading...', Object.assign(Object.assign({ name: 'LazyPlaceHolder.headLabel' }, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.headPlaceHolderLabel));
    const labelAfter = (0, text_1.createTextWidget)('Loading...', Object.assign(Object.assign({ name: 'LazyPlaceHolder.headLabel' }, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.headPlaceHolderLabel));
    before.s.ft.addChild(labelBefore.b).dp();
    after.s.ft.addChild(labelAfter.b).dp();
    const loadedCompsByPage = new Map();
    r('setLabel -> lable.setContent', s.pt.setLabel.pipe(rx.map(([m, text]) => {
        labelBefore.s.ft.setContent(text).dp(m);
        labelAfter.s.ft.setContent(text).dp(m);
    })));
    r('setViewportSize -> maxLoadedPages', rx.combineLatest([
        s.pt.setViewportSize.pipe(rx.distinctUntilChanged(([, wa, ha], [, wb, hb]) => wa === wb && ha === hb)),
        s.pt.setAveragePageSize
    ]).pipe(rx.switchMap(([[m, w, h], [m2, pageSize]]) => table.l.setExpandDir.pipe(rx.take(1), rx.map(([m3, dir]) => {
        if (pageSize > Number.EPSILON)
            s.ft.maxLoadedPages(Math.round((dir === 'col' ? h : w) / pageSize) + 1)
                .dp(m, m2, m3);
    })))));
    r('setAveragePageSize... -> before.setPreferredSize, after.setPreferredSize', rx.combineLatest([
        s.pt.setAveragePageSize.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b)),
        table.l.setExpandDir, before.s.pt.onContentSizeChange,
        after.s.pt.onContentSizeChange, table.l.onBeforePages, table.l.onAfterPages
    ]).pipe(rx.map(([[m, size], [, dir], [, beforeW, beforeH], [, afterW, afterH], [, bPages], [, aPages]]) => {
        if (dir === 'col') {
            service.log(`+++ setAveragePageSize ${size} head ${beforeW},${beforeH}, tail ${afterW},${afterH}, aPages: ${aPages}`);
            before.s.ft.setPreferredSize(beforeW, bPages > 0 ? Math.max(size * bPages, beforeH) : 0).dp(m);
            after.s.ft.setPreferredSize(afterW, aPages > 0 ? Math.max(size * aPages, afterH) : 0).dp(m);
        }
        else {
            before.s.ft.setPreferredSize(bPages > 0 ? Math.max(size * bPages, beforeW) : 0, beforeH).dp(m);
            after.s.ft.setPreferredSize(aPages > 0 ? Math.max(size * aPages, afterW) : 0, afterH).dp(m);
        }
    })));
    r('before.onRender -> onLoadPage', before.s.pt.onRender.pipe(rx.withLatestFrom(table.l.setExpandDir, table.l.beforePageRange, before.table.l.onSize), rx.filter(([, , [, r0, r1], [, w, h]]) => r1 > r0 && w > 0 && h > 0), rx.concatMap(a => rx.timer(50).pipe(rx.map(() => a))), rx.map(([[m, , , _renderSelf, clips], [, dir], [, pageRangeOpen, pageRangeClose], [, w, h]]) => {
        const pageSize = (pageRangeClose - pageRangeOpen) / (dir === 'col' ? h : w);
        const [pIndex0, pIndex1] = clipRangeToPageIndex(dir, clips, pageSize);
        s.ft.onLoadPages(true, pIndex0 + pageRangeOpen, pIndex1 - pIndex0 + 1).dp(m);
    })));
    r('after.onRender -> onLoadPages', after.s.pt.onRender.pipe(rx.withLatestFrom(table.l.setExpandDir, table.l.afterPageRange, after.table.l.onSize), rx.filter(([, , [, r0, r1], [, w, h]]) => r1 > r0 && w > 0 && h > 0), rx.concatMap(a => rx.timer(50).pipe(rx.map(() => a))), rx.map(([[m, , , _renderSelf, clips], [, dir], [, pageRangeOpen, pageRangeClose], [, w, h]]) => {
        const sizeForEachPage = (dir === 'col' ? h : w) / (pageRangeClose - pageRangeOpen);
        const [pIndex0, pIndex1] = clipRangeToPageIndex(dir, clips, sizeForEachPage);
        s.ft.onLoadPages(false, pIndex0 + pageRangeOpen, pIndex1 - pIndex0 + 1).dp(m);
    })));
    r('beforePageRange, afterPageRange -> onLoadedPageChanges', rx.combineLatest([s.pt.beforePageRange, s.pt.afterPageRange]).pipe(rx.map(([[m1, bs, be], [m2, as, ae]]) => s.ft.onLoadedPageChanges(be, as).dp(m1, m2))));
    r('onLoadPages -> onLoadPage, beforePageRange, afterPageRange, "loadedCompsByPage"', s.pt.onLoadPages.pipe(rx.distinctUntilChanged(([, , s1, e1], [, , s2, e2]) => s1 === s2 && e1 === e2), rx.mergeMap(([m, isBefore, start, num]) => rx.range(start, num).pipe(rx.mergeMap((pageIdx, idx) => s.ft.onLoadPage(pageIdx, isBefore ? 'prepend' : 'append').re(m).od(s.pt.didLoad).pipe(rx.take(1), rx.map(([, comps]) => {
        if (comps.length > 0) {
            loadedCompsByPage.set(pageIdx, comps);
            return [idx, 'success'];
        }
        else {
            return [idx, 'empty'];
        }
    }), rx.timeout(2000), rx.catchError(err => {
        service.log(`>>> Waiting for page ${pageIdx} getting loaded timeout`);
        service.dispatchErrorFor(err, m);
        return rx.of([idx, 'error']);
    }))), rx.reduce((results, [idx, result]) => {
        results[idx] = result;
        return results;
    }, new Array(num)), rx.withLatestFrom(table.l.beforePageRange, table.l.afterPageRange, table.l.maxLoadedPages, table.l.setTotalPageNum), rx.take(1), rx.map(([loadResults, [, start1, end1], [, start2, end2], [, maxLoaded], [, totalPages]]) => {
        // service.log('>>> loadResults', loadResults);
        const endIdx = loadResults.findIndex(it => it === 'empty' || it === 'error');
        const end = endIdx >= 0 ? start + endIdx : start + num;
        if (isBefore) {
            s.ft.beforePageRange(start1, start).dp(m);
            if (end < end1) {
                // new ranges:  before: start1 - start, loaded: start - end, after: end - end2
                // pages of end - end1 are not loaded, merge it with "after" placeholder, and unload pages between end1 to start2
                for (let i = end1; i < start2; i++) {
                    s.ft.onUnload(i, loadedCompsByPage.get(i)).dp(m);
                    loadedCompsByPage.delete(i);
                }
                if (totalPages === 'unknown' && end2 === end)
                    end2++;
                s.ft.afterPageRange(end, end2).dp(m);
            }
            else { // end === end1
                // "before" placeholder's tail part is merged to previous "loaded" part, the "loaded" part gets bigger, "after" placeholder does not change
                // new ranges:  before: start1 - start, loaded: start - start2, after: start2 - end2
                if (start2 - start > maxLoaded) {
                    if (totalPages === 'unknown' && end2 === start + maxLoaded)
                        end2++;
                    s.ft.afterPageRange(start + maxLoaded, end2).dp(m);
                    rx.range(start + maxLoaded, start2).pipe(rx.map(pageIdx => {
                        s.ft.onUnload(pageIdx, loadedCompsByPage.get(pageIdx)).dp(m);
                        loadedCompsByPage.delete(pageIdx);
                    })).subscribe();
                }
            }
        }
        else {
            if (totalPages === 'unknown' && end2 === end)
                end2++;
            s.ft.afterPageRange(end, end2).dp(m);
            if (start > start2) {
                // new ranges:  before: start1 - start, loaded: start - end, after: end - end2
                // pages of start2 - start are not loaded, merge it with "before" placeholder, and unload pages between start2 to start
                for (let i = start2; i < start; i++) {
                    s.ft.onUnload(i, loadedCompsByPage.get(i)).dp(m);
                    loadedCompsByPage.delete(i);
                }
                s.ft.beforePageRange(start1, start).dp(m);
            }
            else { // start === start2
                // "after" placeholder's head part is merged to previous "loaded" part, the "loaded" part gets bigger, "before" placeholder does not change
                // new ranges:  before: start1 - end1, loaded: end1 - end, after: end - end2
                if (start - end1 > maxLoaded) {
                    s.ft.beforePageRange(start1, end1 + maxLoaded).dp(m);
                    rx.range(end1, end1 + maxLoaded).pipe(rx.map(pageIdx => {
                        s.ft.onUnload(pageIdx, loadedCompsByPage.get(pageIdx)).dp(m);
                        loadedCompsByPage.delete(pageIdx);
                    })).subscribe();
                }
            }
        }
        if (endIdx >= 0)
            s.ft.setTotalPageNum(end).dp(m);
    })))));
    r('afterPageRange -> onAfterPages', s.pt.afterPageRange.pipe(rx.map(([m, start, end]) => s.ft.onAfterPages(end - start).dp(m))));
    r('setTotalPageNum', s.pt.setTotalPageNum.pipe(rx.map(([m, num]) => {
        var _a;
        if (num !== 'unknown') {
            s.ft.afterPageRange((_a = table.getData().afterPageRange[0]) !== null && _a !== void 0 ? _a : 0, num).dp(m);
        }
        // return table.l.afterPageRange.pipe(
        //   rx.distinctUntilChanged(([, beginA], [, beginB]) => beginA === beginB),
        //   rx.filter(([, b, e]) => b >= e),
        //   rx.map(([m2, begin, end]) => {
        //     if (begin >= end)
        //       s.ft.afterPageRange(begin, begin + 1).dp(m, m2);
        //   })
        // );
    })));
    r('beforePageRange -> onBeforePages', s.pt.beforePageRange.pipe(rx.map(([m, start, end]) => s.ft.onBeforePages(end - start).dp(m))));
    before.s.ft.setDirection('col').dp();
    after.s.ft.setDirection('col').dp();
    before.s.ft.justifyContent('center').dp();
    before.s.ft.alignItems('center').dp();
    after.s.ft.justifyContent('center').dp();
    after.s.ft.alignItems('center').dp();
    s.ft.beforePageRange(0, 0).dp();
    s.ft.afterPageRange(0, 1).dp();
    s.ft.setLabel('Loading...').dp();
    s.ft.setExpandDir('col').dp();
    s.ft.setAveragePageSize(0).dp();
    s.ft.onBeforePages(0).dp();
    s.ft.maxLoadedPages(Number.MAX_VALUE).dp();
    s.ft.setTotalPageNum('unknown').dp();
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
        }, 0) :
        clips.reduce((minRight, [x, , w]) => {
            const r = x + w;
            return minRight < r ? minRight : r;
        }, 0);
    const pageIndex0 = Math.floor(clipRangeOpen / pageSize);
    const pageIndex1 = Math.floor(clipRangeClose / pageSize);
    return [pageIndex0, pageIndex1];
}
//# sourceMappingURL=lazy-load-placeholder.js.map