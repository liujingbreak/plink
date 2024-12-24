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
exports.scrollableFac = void 0;
exports.createScrollable = createScrollable;
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const container_1 = require("./container");
const canvas_1 = require("./canvas");
const focusable_1 = require("./focusable");
const tableFor = ['onValidScroll', 'setScrollable', 'onOverflow', 'onContent', 'isScrollNeeded',
    'setScrollbarStyle', 'onViewPortSize'];
/** Scrollable is a TerminalContainer which has an offline canvas, child components will only be "render"ed
 * when they are scrolled to become visible, and they are firstly rendered to the offline canvas then will be copied
 * to outsider canvas afterward
 */
exports.scrollableFac = container_1.baseContainerFac.forExtend({
    name: 'scrollable',
    tableFor
}).defineReactor((init, comp, opts) => {
    var _a, _b;
    const scrollable = init(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.core));
    const { r, s, table } = scrollable;
    const canvas = (0, canvas_1.createTerminalCanvas)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'scrollable.canvas' }), opts === null || opts === void 0 ? void 0 : opts.canvas));
    canvas.s.ft.setRootComponent(comp).dp();
    r('onRender,canvas.clearRect -> outerCanvas.clearRect', s.pt.onRender.pipe(rx.withLatestFrom(table.l.onValidScroll, table.l.onViewPortSize), rx.switchMap(([[, oCanvas], [, left, top], [, sw, sh]]) => canvas.s.pt.clearRect.pipe(rx.map(([m, x, y, w, h]) => {
        const x1 = x + left;
        const y1 = y + top;
        const w1 = sw - x1 > w ? w : sw - x1;
        const h1 = sh - y1 > h ? h : sh - y1;
        oCanvas.s.ft.clearRect(x1, y1, w1, h1).dp(m);
    })))));
    r('querySizeOf -> comp.querySizeOf', s.pt.querySizeOf.pipe(rx.mergeMap(([m, w, h]) => {
        if (w == null && h != null) {
            return comp.s.ft.querySizeOf(w, h).re(m).od(comp.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, width]) => s.ft.prefWidthFor(width, h).dp(m)));
        }
        else if (h == null && w != null) {
            return comp.s.ft.querySizeOf(w, h).re(m).od(comp.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , height]) => s.ft.prefHeightFor(w, height).dp(m)));
        }
        return rx.EMPTY;
    })));
    const renderData = [
        table.l.onValidScroll,
        table.l.onSize,
        table.l.onBgChangeWithParent,
        table.l.setDisplay,
        table.l.setScrollbarStyle
    ];
    r('onRender -> comp.render,...', s.pt.onRender.pipe(rx.withLatestFrom(...renderData, table.l.onOverflow, canvas.table.l.setBounding, table.l.onViewPortSize), rx.mergeMap(([[m, outerCanvas, trans, renderSelf, clips, masks], [, scLeft, scTop], [, width, height], , , [, barWidth, barHeight, barCol, barTrack], [, xOverflow, yOverflow], [, , , cw, ch], [, vpWidth, vpHeight]]) => {
        if (renderSelf) {
            s.ft.clear(outerCanvas, trans).dp(m);
            s.ft.renderSelf(outerCanvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
            // render scroll bar
            if (yOverflow) {
                const trackHeight = xOverflow ? height - barHeight : height;
                const leftTop = [width - barWidth, 0];
                let barBtnTop = Math.floor(trackHeight * scTop / ch);
                const barBtnHeight = Math.ceil(trackHeight * vpHeight / ch);
                if (scTop > 0 && barBtnTop === 0) {
                    // make scroll bar button position more obvious for non-zero value
                    barBtnTop = 1;
                }
                else if (scTop + vpHeight < ch && barBtnTop + barBtnHeight === trackHeight) {
                    // make scroll bar button position more obvious
                    barBtnTop = trackHeight - barBtnHeight - 1;
                }
                gl_matrix_1.vec2.transformMat4(leftTop, leftTop, trans);
                const barChars = '█'.repeat(barWidth);
                const trackChars = '░'.repeat(barWidth);
                scrollable.log('>> yScrollbar', 'top', barBtnTop, 'button height', barBtnHeight, 'track height', trackHeight);
                for (let i = 0; i < trackHeight; i++) {
                    const isButton = i >= barBtnTop && i < barBtnTop + barBtnHeight;
                    const style = isButton ? barCol : barTrack;
                    outerCanvas.s.ft.addString(leftTop[0], leftTop[1] + i, isButton ? barChars : trackChars, style).dp(m);
                }
            }
            if (xOverflow) {
                const trackWidth = yOverflow ? width - barWidth : width;
                const leftTop = [0, height - barHeight];
                let barBtnLeft = Math.floor(trackWidth * scLeft / cw);
                const barBtnWidth = Math.ceil(trackWidth * vpWidth / cw);
                if (scLeft > 0 && barBtnLeft === 0) {
                    // make scroll bar button position more obvious for non-zero value
                    barBtnLeft = 1;
                }
                else if (scLeft + vpWidth < cw && barBtnLeft + barBtnWidth === trackWidth) {
                    barBtnLeft = trackWidth - barBtnWidth;
                }
                gl_matrix_1.vec2.transformMat4(leftTop, leftTop, trans);
                const rightWidth = trackWidth - barBtnWidth - barBtnLeft;
                scrollable.log('>> trackWidth', trackWidth, 'barBtnLeft', barBtnLeft, 'barBtnWidth', barBtnWidth, 'rightWidth', rightWidth);
                for (let i = 0; i < barHeight; i++) {
                    const y = leftTop[1] + i;
                    if (barBtnLeft > 0)
                        outerCanvas.s.ft.addString(0, y, '░'.repeat(barBtnLeft), barTrack).dp(m);
                    outerCanvas.s.ft.addString(barBtnLeft, y, '█'.repeat(barBtnWidth), barCol).dp(m);
                    if (rightWidth > 0)
                        outerCanvas.s.ft.addString(barBtnLeft + barBtnWidth, y, '░'.repeat(rightWidth), barTrack).dp(m);
                }
            }
        }
        else {
            outerCanvas.s.ft.clearRect(0, 0, vpWidth, vpHeight).dp(m);
        }
        const clipsOfView = clips.map(c => {
            return (0, canvas_1.rectIntersection)([scLeft, scTop, width, height], [c[0] + scLeft, c[1] + scTop, c[2], c[3]]);
        }).filter((c) => c != null);
        const masksOfView = masks ?
            masks.map(c => {
                return (0, canvas_1.rectIntersection)([scLeft, scTop, width, height], [c[0] + scLeft, c[1] + scTop, c[2], c[3]]);
            }).filter((c) => c != null) :
            [];
        // scrollable.log('>>> clipOfView', clipsOfView.join(';'));
        comp.s.ft.render(canvas, gl_matrix_1.mat4.create(), clipsOfView, masksOfView).dp(m);
        return canvas.s.ft.copyRect(scLeft, scTop, vpWidth, vpHeight).re(m).od(canvas.s.pt.onCopyRect).pipe(rx.take(1), rx.map(([, paintables]) => {
            for (const [x, , y, units, style] of paintables) {
                const point = [x, y];
                gl_matrix_1.vec2.transformMat4(point, point, trans);
                outerCanvas.s.ft.addDisplayUnits(point[0], point[1], units, [style]).dp(m);
            }
        }));
    })));
    r('scrollTo, onSize, canvas.setBounding -> onValidScroll', rx.combineLatest([
        s.pt.scrollTo,
        s.pt.onViewPortSize,
        canvas.table.l.setBounding
    ]).pipe(rx.map(([[m, x, y], [m2, sWidth, sHeight], [m3, , , cWidth, cHeight]]) => {
        // base.log(sWidth, sHeight, cWidth, cHeight);
        if (x < 0)
            x = 0;
        if (y < 0)
            y = 0;
        const maxScrollX = cWidth - sWidth;
        if (x > maxScrollX)
            x = maxScrollX;
        const maxScrollY = cHeight - sHeight;
        if (y > maxScrollY)
            y = maxScrollY;
        if (x < 0)
            x = 0;
        if (y < 0)
            y = 0;
        return [x, y, m, m2, m3];
    }), rx.distinctUntilChanged(([aX, aY], [bX, bY]) => aX === bX && aY === bY), rx.map(([x, y, m1, m2, m3]) => s.ft.onValidScroll(x, y).dp(m1, m2, m3))));
    r('scroll -> scrollTo', s.pt.scroll.pipe(rx.withLatestFrom(table.l.onValidScroll), rx.map(([[m, x, y], [, currX, currY]]) => {
        s.ft.scrollTo(currX + x, currY + y).dp(m);
    })));
    r('reflow... -> canvas.setBounding, onOverflow', s.pt.reflow.pipe(rx.switchMap(() => rx.combineLatest([
        table.l.onSize, comp.table.l.preferredSize, table.l.setScrollable,
        table.l.setScrollbarStyle
    ]).pipe(rx.take(1), rx.switchMap(([[m1, w, h], [m2, pW, pH], [m3, xScrollable, yScrollable], [, barWidth, barHeight]]) => {
        let vpWidth = w;
        let vpHeight = h;
        if (xScrollable && yScrollable) {
            vpWidth -= barWidth;
            vpHeight -= barHeight;
            const hasYScrollBar = pH > h;
            const hasXScrollBar = pW > w;
            let compWidth = pW > w ? pW : w;
            let compHeight = pH > h ? pH : h;
            if (!hasYScrollBar || !hasXScrollBar) {
                if (hasYScrollBar)
                    compWidth = compWidth - barWidth;
                if (hasXScrollBar)
                    compHeight = compHeight - barHeight;
            }
            scrollable.log('>> hasYScrollBar', hasYScrollBar, 'hasXScrollBar', hasXScrollBar);
            canvas.s.ft.setBounding(0, 0, compWidth, compHeight).dp(m1, m2, m3);
            s.ft.onOverflow(w < pW, h < pH).dp(m1, m2, m3);
            return rx.EMPTY;
        }
        else if (yScrollable) {
            if (w < pW) {
                return comp.s.ft.querySizeOf(w, null)
                    .re(m1, m2, m3)
                    .od(comp.s.pt.prefHeightFor).pipe(rx.mergeMap(([, , newPrefH]) => {
                    if (newPrefH > h) {
                        return comp.s.ft.querySizeOf(w - barWidth, null)
                            .re(m1, m2, m3)
                            .od(comp.s.pt.prefHeightFor);
                    }
                    return rx.of([null, w, newPrefH]);
                }), rx.take(1), rx.map(([, w, newPrefH]) => {
                    canvas.s.ft.setBounding(0, 0, w, newPrefH > h ? newPrefH : h).dp(m1, m2, m3);
                    s.ft.onOverflow(false, newPrefH > h).dp(m1, m2, m3);
                }));
            }
            else {
                canvas.s.ft.setBounding(0, 0, w, pH > h ? pH : h).dp(m1, m2, m3);
                s.ft.onOverflow(false, h < pH).dp(m1, m2, m3);
                return rx.EMPTY;
            }
        }
        else { // xScrollable
            if (h < pH) {
                return comp.s.ft.querySizeOf(null, h).re(m1, m2, m3).od(comp.s.pt.prefWidthFor).pipe(rx.take(1), rx.mergeMap(([, newPrefWidth]) => {
                    if (newPrefWidth > w) {
                        return comp.s.ft.querySizeOf(null, h - barHeight).re(m1, m2, m3).od(comp.s.pt.prefWidthFor);
                    }
                    return rx.of([null, newPrefWidth, h]);
                }), rx.map(([, newPrefWidth, h]) => {
                    canvas.s.ft.setBounding(0, 0, newPrefWidth > w ? newPrefWidth : w, h).dp(m1, m2, m3);
                    s.ft.onOverflow(newPrefWidth > w, false).dp(m1, m2, m3);
                }));
            }
            else {
                canvas.s.ft.setBounding(0, 0, pW > w ? pW : w, h).dp(m1, m2, m3);
                s.ft.onOverflow(w < pW, false).dp(m1, m2, m3);
                return rx.EMPTY;
            }
        }
    })))));
    r('onOverflow...-> onViewPortSize', rx.combineLatest([
        s.pt.onOverflow, table.l.onSize, table.l.setScrollbarStyle
    ]).pipe(rx.map(([[m, xOverflow, yOverflow], [, w, h], [, barWidth, barHeight]]) => {
        s.ft.onViewPortSize(yOverflow ? w - barWidth : w, xOverflow ? h - barHeight : h).dp(m, m.r);
    })));
    r('onSize, comp.onSize -> isScrollNeeded', rx.combineLatest([
        table.l.onSize,
        comp.table.l.onSize
    ]).pipe(rx.map(([[m, w, h], [m2, w2, h2]]) => {
        s.ft.isScrollNeeded(w < w2 || h < h2).dp(m, m2);
    })));
    r('onChildPreferredSizeChange,... -> onContentSizeChange', table.l.onChildPreferredSizeChange.pipe(rx.map(([m, sizes]) => {
        if (sizes.length > 0)
            s.ft.onContentSizeChange(sizes[0][0], sizes[0][1]).dp(m);
        else
            s.ft.onContentSizeChange(0, 0).dp(m);
    })));
    r('canvas.error$', canvas.error$.pipe(rx.map(errInfo => s.ft.onChildError(canvas.s.logPrefix, errInfo))));
    const focusService = (0, focusable_1.createFocusService)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: ((_a = opts === null || opts === void 0 ? void 0 : opts.default) === null || _a === void 0 ? void 0 : _a.name) ? ((_b = opts === null || opts === void 0 ? void 0 : opts.default) === null || _b === void 0 ? void 0 : _b.name) + '.focusSvc' : 'scrollable.focusSvc' }), opts === null || opts === void 0 ? void 0 : opts.focusable));
    r('destory$ -> focusService.dispose', scrollable.destory$.pipe(rx.map(() => {
        focusService.dispose();
        canvas.dispose();
    })));
    const service = scrollable;
    service.focusService = focusService;
    r('rootService, rootService.onFocus', focusService.table.l.rootService.pipe(rx.switchMap(([, root]) => root.table.l.onFocus.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.filter(([, , c]) => c != null), rx.mergeMap(([m, , c]) => rx.combineLatest([
        c.s.ft.queryAbsBounding().re(m).od(c.s.pt.didQueryAbsBounding),
        scrollable.s.ft.queryAbsBounding().re(m).od(scrollable.s.pt.didQueryAbsBounding)
    ]).pipe(rx.take(1), rx.filter(([[, cb], [, sb]]) => cb != null && sb != null), rx.map(([[, cb], [, sb]]) => {
        const [x, y, w, h] = sb;
        return [m, cb, [x + 1, y + 1, w - 2, h - 2]];
    }))), rx.filter(([, , [, , w, h]]) => w > 2 && h > 2), rx.map(([m, cb, [px, py, pw, ph]]) => {
        const [x, y] = cb;
        service.log('<<< abs of scrollable', x, y, px, py, pw, ph);
        if (x < px || y < py) {
            const scrollX = x < px ? x - px : 0;
            const scrollY = y < px ? y - py : 0;
            s.ft.scroll(scrollX, scrollY).dp(m);
        }
        else {
            let toX = 0;
            let toY = 0;
            if (x >= px + pw) {
                toX = x - (px + pw) + 1;
            }
            if (y >= py + ph) {
                toY = y - (py + ph) + 1;
            }
            if (toX !== 0 || toY !== 0)
                s.ft.scroll(toX, toY).dp(m);
        }
    })))));
    r('findOverlaps -> didFindOverlaps', s.pt.findOverlaps.pipe(rx.withLatestFrom(comp.table.l.isContainer, table.l.onBoundingBox, table.l.onValidScroll), rx.mergeMap(([[m, ...rect0], [, isContainer], [, bounding], [, left, top]]) => {
        if (!isContainer) {
            s.ft.didFindOverlaps([comp]).dp(m);
            return rx.EMPTY;
        }
        const rect = (0, canvas_1.rectIntersection)(rect0, bounding);
        if (rect == null) {
            s.ft.didFindOverlaps([]).dp(m);
            return rx.EMPTY;
        }
        let [x, y] = rect;
        x = x - bounding[0] + left;
        y = y - bounding[1] + top;
        return comp.s.ft.findOverlaps(x, y, rect[2], rect[3])
            .re(m).od(comp.s.pt.didFindOverlaps).pipe(rx.take(1), rx.map(([m2, found]) => s.ft.didFindOverlaps(found.concat(comp)).dp(m, m2)));
    })));
    r('init', new rx.Observable(() => {
        s.ft.isOffsetParent(service).dp();
        s.ft.onContentSizeChange(2, 2).dp();
        s.ft.setPreferredSize(null, null).dp();
        s.ft.onValidScroll(0, 0).dp();
        s.ft.setScrollable(true, true).dp();
        s.ft.onOverflow(false, false).dp();
        s.ft.addChild(comp).dp();
        s.ft.onContent(comp).dp();
        s.ft.setRenderChanges(renderData).dp();
        s.ft.setScrollbarStyle(1, 1, ['rgb(150,150,150)'], []).dp();
        // s.ft.addReflowAction(s.at.onValidScroll).dp();
        // s.ft.addReflowAction(s.at.setScrollable).dp();
        s.ft.hasOfflineCanvas(true).dp();
    }));
}).interceptorForBaseByType(dispenser => {
    return rx.merge(rx.merge(dispenser.at.onRender, dispenser.at.findOverlaps).pipe(rx.ignoreElements()), dispenser.ofOtherTypes());
});
function createScrollable(comp, opts) {
    return exports.scrollableFac.create(comp, opts);
}
//# sourceMappingURL=scrollable.js.map