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
exports.scrollableFac = void 0;
exports.createScrollable = createScrollable;
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const container_1 = require("./container");
const canvas_1 = require("./canvas");
const focusable_1 = require("./focusable");
const app_shell_1 = require("./app/app-shell");
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
    const { r, ft, pt, table } = scrollable;
    const canvas = (0, canvas_1.createTerminalCanvas)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'scrollable.canvas' }), opts === null || opts === void 0 ? void 0 : opts.canvas));
    canvas.ft.setRootComponent(comp).dp();
    r('onRender,canvas.clearRect -> outerCanvas.clearRect', pt.onRender.pipe(rx.withLatestFrom(table.l.onValidScroll, table.l.onViewPortSize), rx.switchMap(([[mR, oCanvas, trans], [, left, top], [, sw, sh]]) => canvas.pt.clearRect.pipe(rx.map(([m, x, y, w, h]) => {
        const x1 = x + left;
        const y1 = y + top;
        const p = gl_matrix_1.vec2.transformMat4([0, 0], [x1, y1], trans);
        const w1 = sw - x1 > w ? w : sw - x1;
        const h1 = sh - y1 > h ? h : sh - y1;
        oCanvas.ft.clearRect(p[0], p[1], w1, h1).dp(m, mR);
    })))));
    r('querySizeOf -> comp.querySizeOf', pt.querySizeOf.pipe(rx.mergeMap(([m, w, h]) => {
        if (w == null && h != null) {
            return rx.zip(comp.ft.querySizeOf(w, h).re(m).od(comp.pt.prefWidthFor), table.l.setScrollbarStyle, table.l.setScrollable, comp.table.l.preferredSize).pipe(rx.take(1), rx.map(([[, width], [, sw], [, , ys], [, , ph]]) => ft.prefWidthFor(ys && ph > h ? width + sw : width, h).dp(m)));
        }
        else if (h == null && w != null) {
            return rx.zip(comp.ft.querySizeOf(w, h).re(m).od(comp.pt.prefHeightFor), table.l.setScrollbarStyle, table.l.setScrollable, comp.table.l.preferredSize).pipe(rx.take(1), rx.map(([[, , height], [, , sh], [, xs], [, pw]]) => ft.prefHeightFor(w, xs && pw > w ? height - sh : height).dp(m)));
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
    let ButtonPixelType;
    (function (ButtonPixelType) {
        ButtonPixelType[ButtonPixelType["full"] = 0] = "full";
        ButtonPixelType[ButtonPixelType["topHalf"] = 1] = "topHalf";
        ButtonPixelType[ButtonPixelType["bottomHalf"] = 2] = "bottomHalf";
        ButtonPixelType[ButtonPixelType["no"] = 3] = "no";
    })(ButtonPixelType || (ButtonPixelType = {}));
    r('onRender -> comp.render,...', pt.onRender.pipe(rx.withLatestFrom(...renderData, table.l.onOverflow, canvas.table.l.setBounding, table.l.onViewPortSize), rx.mergeMap(([[m, outerCanvas, trans, renderSelf, clips, masks], [, scLeft, scTop], [, width, height], , , [, barWidth, barHeight, barCol, barTrack], [, xOverflow, yOverflow], [, , , cw, ch], [, vpWidth, vpHeight]]) => {
        if (renderSelf) {
            ft.clear(outerCanvas, trans).dp(m);
            ft.renderSelf(outerCanvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
            // render scroll bar
            if (yOverflow) {
                const trackHeight = xOverflow ? height - barHeight : height;
                const leftTop = [width - barWidth, 0];
                gl_matrix_1.vec2.transformMat4(leftTop, leftTop, trans);
                const barBtnTop = trackHeight * scTop / ch;
                const barBtnHeight = Math.ceil(trackHeight * vpHeight / ch);
                // if (scTop > 0 && barBtnTop === 0) {
                //   // make scroll bar button position more obvious for non-zero value
                //   barBtnTop = 1;
                // } else if (scTop + vpHeight < ch && barBtnTop + barBtnHeight === trackHeight) {
                //   // make scroll bar button position more obvious
                //   barBtnTop = trackHeight - barBtnHeight - 1;
                // }
                const barChars = '█'.repeat(barWidth);
                const trackChars = ' '.repeat(barWidth);
                const btnBottom = barBtnTop + barBtnHeight;
                const iBtnBottom = Math.floor(btnBottom);
                // scrollable.log('>> yScrollbar', 'top', barBtnTop, 'button height', barBtnHeight,
                //   'track height', trackHeight, 'barBtnTop', barBtnTop, 'btnBottom', btnBottom, iBtnBottom);
                for (let i = 0; i < trackHeight; i++) {
                    let isButton = ButtonPixelType.no;
                    if (i >= Math.ceil(barBtnTop) && i < iBtnBottom) {
                        isButton = ButtonPixelType.full;
                    }
                    else if (i >= barBtnTop - 0.7 && i < iBtnBottom) {
                        isButton = ButtonPixelType.bottomHalf;
                    }
                    else if (i >= Math.ceil(barBtnTop) && i < btnBottom - 0.3) {
                        isButton = ButtonPixelType.topHalf;
                    }
                    // scrollable.log('i', i, 'ButtonPixelType', ButtonPixelType[isButton]);
                    const style = isButton === ButtonPixelType.no ? barTrack : barCol;
                    outerCanvas.ft.addString(leftTop[0], leftTop[1] + i, isButton === ButtonPixelType.full ?
                        barChars :
                        isButton === ButtonPixelType.no ?
                            trackChars :
                            isButton === ButtonPixelType.topHalf ?
                                '▀'.repeat(barWidth) :
                                '▄'.repeat(barWidth), style).dp(m);
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
                scrollable.log('>> trackWidth', trackWidth, 'barBtnLeft', barBtnLeft, 'barBtnWidth', barBtnWidth, 'rightWidth', rightWidth, 'y', leftTop[1]);
                for (let i = 0; i < barHeight; i++) {
                    const y = leftTop[1] + i;
                    if (barBtnLeft > 0)
                        outerCanvas.ft.addString(leftTop[0], y, ' '.repeat(barBtnLeft), barTrack).dp(m);
                    outerCanvas.ft.addString(leftTop[0] + barBtnLeft, y, '█'.repeat(barBtnWidth), barCol).dp(m);
                    if (rightWidth > 0)
                        outerCanvas.ft.addString(leftTop[0] + barBtnLeft + barBtnWidth, y, ' '.repeat(rightWidth), barTrack).dp(m);
                }
            }
        }
        else {
            const p = [0, 0];
            gl_matrix_1.vec2.transformMat4(p, p, trans);
            outerCanvas.ft.clearRect(p[0], p[1], vpWidth, vpHeight).dp(m);
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
        comp.ft.render(canvas, gl_matrix_1.mat4.create(), clipsOfView, masksOfView).dp(m);
        return canvas.ft.copyRect(scLeft, scTop, vpWidth, vpHeight).re(m).od(canvas.pt.didCopyRect).pipe(rx.take(1), rx.map(([, paintables]) => {
            for (const [x, , y, units, style] of paintables) {
                const point = [x - scLeft, y - scTop];
                gl_matrix_1.vec2.transformMat4(point, point, trans);
                outerCanvas.ft.addDisplayUnits(point[0], point[1], units, [style]).dp(m);
            }
        }));
    })));
    r('scrollTo, onSize, canvas.setBounding -> onValidScroll', rx.combineLatest([
        pt.scrollTo,
        pt.onViewPortSize,
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
    }), rx.distinctUntilChanged(([aX, aY], [bX, bY]) => aX === bX && aY === bY), rx.map(([x, y, m1, m2, m3]) => ft.onValidScroll(x, y).dp(m1, m2, m3))));
    r('scroll -> scrollTo', pt.scroll.pipe(rx.withLatestFrom(table.l.onValidScroll), rx.map(([[m, x, y], [, currX, currY]]) => {
        ft.scrollTo(currX + x, currY + y).dp(m);
    })));
    r('reflow... -> canvas.setBounding, onOverflow', pt.reflow.pipe(rx.switchMap(() => rx.combineLatest([
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
            canvas.ft.setBounding(0, 0, compWidth, compHeight).dp(m1, m2, m3);
            ft.onOverflow(w < pW, h < pH).dp(m1, m2, m3);
            return rx.EMPTY;
        }
        else if (yScrollable) {
            if (w < pW) {
                return comp.ft.querySizeOf(w, null)
                    .re(m1, m2, m3)
                    .od(comp.pt.prefHeightFor).pipe(rx.mergeMap(([, , newPrefH]) => {
                    if (newPrefH > h) {
                        return comp.ft.querySizeOf(w - barWidth, null)
                            .re(m1, m2, m3)
                            .od(comp.pt.prefHeightFor);
                    }
                    return rx.of([null, w, newPrefH]);
                }), rx.take(1), rx.map(([, w, newPrefH]) => {
                    canvas.ft.setBounding(0, 0, w, newPrefH > h ? newPrefH : h).dp(m1, m2, m3);
                    ft.onOverflow(false, newPrefH > h).dp(m1, m2, m3);
                }));
            }
            else {
                canvas.ft.setBounding(0, 0, w, pH > h ? pH : h).dp(m1, m2, m3);
                ft.onOverflow(false, h < pH).dp(m1, m2, m3);
                return rx.EMPTY;
            }
        }
        else { // xScrollable
            if (h < pH) {
                return comp.ft.querySizeOf(null, h).re(m1, m2, m3).od(comp.pt.prefWidthFor).pipe(rx.take(1), rx.mergeMap(([, newPrefWidth]) => {
                    if (newPrefWidth > w) {
                        return comp.ft.querySizeOf(null, h - barHeight).re(m1, m2, m3).od(comp.pt.prefWidthFor);
                    }
                    return rx.of([null, newPrefWidth, h]);
                }), rx.map(([, newPrefWidth, h]) => {
                    canvas.ft.setBounding(0, 0, newPrefWidth > w ? newPrefWidth : w, h).dp(m1, m2, m3);
                    ft.onOverflow(newPrefWidth > w, false).dp(m1, m2, m3);
                }));
            }
            else {
                canvas.ft.setBounding(0, 0, pW > w ? pW : w, h).dp(m1, m2, m3);
                ft.onOverflow(w < pW, false).dp(m1, m2, m3);
                return rx.EMPTY;
            }
        }
    })))));
    r('onOverflow...-> onViewPortSize', rx.combineLatest([
        pt.onOverflow, table.l.onSize, table.l.setScrollbarStyle
    ]).pipe(rx.map(([[m, xOverflow, yOverflow], [, w, h], [, barWidth, barHeight]]) => {
        ft.onViewPortSize(yOverflow ? w - barWidth : w, xOverflow ? h - barHeight : h).dp(m, m.r);
    })));
    r('onSize, comp.onSize -> isScrollNeeded', rx.combineLatest([
        table.l.onSize,
        comp.table.l.onSize
    ]).pipe(rx.map(([[m, w, h], [m2, w2, h2]]) => {
        ft.isScrollNeeded(w < w2 || h < h2).dp(m, m2);
    })));
    r('onChildPreferredSizeChange,... -> onContentSizeChange', table.l.onChildPreferredSizeChange.pipe(rx.map(([m, sizes]) => {
        if (sizes.length > 0)
            ft.onContentSizeChange(sizes[0][0], sizes[0][1]).dp(m);
        else
            ft.onContentSizeChange(0, 0).dp(m);
    })));
    r('canvas.error$', canvas.error$.pipe(rx.map(errInfo => ft.onChildError(canvas.s.logPrefix, errInfo))));
    r('destory$ -> focusService.dispose', scrollable.destory$.pipe(rx.map(() => {
        canvas.dispose();
    })));
    // When decsendant is focused, scroll to ensure it is visible in viewport
    r('focusService,focusService.onFocus...-> scroll', pt.focusService.pipe(rx.switchMap(([m, focusService]) => focusService.pt.onFocus.pipe(rx.filter(([, , c]) => c != null), rx.mergeMap(([m, , c]) => rx.combineLatest([
        table.l.onViewPortSize,
        c.ft.queryAbsBounding(scrollable).re(m).od(c.pt.didQueryAbsBounding),
        table.l.onValidScroll
    ]).pipe(rx.take(1))), rx.filter(([[, sw, sh], [, cb]]) => sw > 2 && sh > 2 && cb != null), rx.map(([[, pw, ph], [, cb], [, scrollX, scrollY]]) => {
        const [x, y] = cb;
        scrollable.log('--- scrollable focus', x, y, 'viewport', pw, ph, 'scroll', scrollX, scrollY);
        const scrollSideOff = 1;
        let toX = scrollX;
        let toY = scrollY;
        if (x < scrollX + scrollSideOff) {
            toX = x - scrollSideOff;
        }
        else if (x >= scrollX + pw - scrollSideOff) {
            toX = x - pw + scrollSideOff + 1;
        }
        if (y < scrollY + scrollSideOff) {
            toY = y - scrollSideOff;
        }
        else if (y >= scrollY + ph - scrollSideOff) {
            toY = y - ph + scrollSideOff + 1;
        }
        if (toX !== scrollX || toY !== scrollY)
            ft.scrollTo(toX, toY).dp(m);
    })))));
    r('onFocus -> keyEventService.bindToScrollable', pt.onFocus.pipe(rx.switchMap(([m]) => (0, app_shell_1.useAppContext)(scrollable, m).pipe(rx.take(1), rx.map(({ keyEventService }) => {
        keyEventService.ft.bindToScrollable(scrollable).dp(m);
    })))));
    r('findOverlaps -> didFindOverlaps', pt.findOverlaps.pipe(rx.withLatestFrom(comp.table.l.isContainer, table.l.onBoundingBox, table.l.onValidScroll), rx.mergeMap(([[m, ...rect0], [, isContainer], [, bounding], [, left, top]]) => {
        if (!isContainer) {
            ft.didFindOverlaps([comp]).dp(m);
            return rx.EMPTY;
        }
        const rect = (0, canvas_1.rectIntersection)(rect0, bounding);
        if (rect == null) {
            ft.didFindOverlaps([]).dp(m);
            return rx.EMPTY;
        }
        let [x, y] = rect;
        x = x - bounding[0] + left;
        y = y - bounding[1] + top;
        const c = comp;
        return c.ft.findOverlaps(x, y, rect[2], rect[3])
            .re(m).od(c.pt.didFindOverlaps).pipe(rx.take(1), rx.map(([m2, found]) => ft.didFindOverlaps(found.concat(comp)).dp(m, m2)));
    })));
    const focusSvc = focusable_1.focusServiceFac.create(canvas, Object.assign({ name: scrollable.s.logPrefix + '.focus', debug: (_a = opts === null || opts === void 0 ? void 0 : opts.default) === null || _a === void 0 ? void 0 : _a.debug, log: (_b = opts === null || opts === void 0 ? void 0 : opts.default) === null || _b === void 0 ? void 0 : _b.log }, opts === null || opts === void 0 ? void 0 : opts.focus));
    focusSvc.ft.forRootComp(scrollable).dp();
    r('init', new rx.Observable(() => {
        ft.onContentSizeChange(2, 2).dp();
        ft.setPreferredSize(null, null).dp();
        ft.onValidScroll(0, 0).dp();
        ft.setScrollable(true, true).dp();
        ft.onOverflow(false, false).dp();
        ft.addChild(comp).dp();
        ft.onContent(comp).dp();
        ft.setRenderChanges(renderData).dp();
        ft.setScrollbarStyle(1, 1, ['rgb(150,150,150)', 'bgRgb(200,200,200)'], ['bgRgb(200,200,200)']).dp();
        // ft.addReflowAction(s.at.onValidScroll).dp();
        // ft.addReflowAction(s.at.setScrollable).dp();
        ft.hasOfflineCanvas(true).dp();
    }));
}).interceptorForBaseByType(dispenser => {
    return rx.merge(rx.merge(dispenser.at.onRender, dispenser.at.findOverlaps).pipe(rx.ignoreElements()), dispenser.ofOtherTypes());
});
function createScrollable(comp, opts) {
    return exports.scrollableFac.create(comp, opts);
}
//# sourceMappingURL=scrollable.js.map