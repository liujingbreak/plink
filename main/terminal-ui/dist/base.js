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
exports.tableForBase = exports.DisplayMode = void 0;
exports.createBase = createBase;
exports.createContainerBase = createContainerBase;
/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
const canvas_1 = require("./canvas");
var DisplayMode;
(function (DisplayMode) {
    DisplayMode[DisplayMode["visible"] = 0] = "visible";
    DisplayMode[DisplayMode["none"] = 1] = "none";
    DisplayMode[DisplayMode["hidden"] = 2] = "hidden"; // it does take space in layout, but with empty content 
})(DisplayMode || (exports.DisplayMode = DisplayMode = {}));
exports.tableForBase = [
    'onSize', 'onTransform', 'onPosition', 'offsetParent', 'isOffsetParent', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender',
    'setPreferredSize', 'setFlexGrow', 'ofCanvas', 'setDisplay', 'onBoundingBox', 'onDettached', 'setFlexShrink',
    'setBackground', 'onBgChangeWithParent', 'bgCleared', 'setFocusable', 'latestRenderData', 'isContainer'
];
/** Do not prepend controller to returned service, otherwise interceptor won't work */
function createBase(opts) {
    var _a;
    const service = new reactivizer_1.SimplexReactor(Object.assign(Object.assign({}, opts), { tableFor: exports.tableForBase, debugExcludeTypes: ['ofCanvas', 'bgCleared', '_saveTransform', ...((_a = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _a !== void 0 ? _a : [])] }));
    const { s, r, table } = service;
    r('_saveTransform -> onTransform', rx.merge(s.pt._saveTransform.pipe(rx.distinctUntilChanged(([, t1], [, t2]) => gl_matrix_1.mat4.equals(t1, t2)), rx.map(([m, t]) => s.ft.onTransform(t).dp(m)))));
    r('setPreferredSize, onContentSizeChange -> preferredSize', rx.combineLatest([
        table.l.setPreferredSize, s.pt.onContentSizeChange
    ]).pipe(rx.map(([[, w, h], [, cW, cH]]) => {
        const override = [cW, cH];
        if (w != null && cW !== w)
            override[0] = w;
        if (h != null && cH !== h)
            override[1] = h;
        return override;
    }), rx.distinctUntilChanged((a, b) => a[0] === b[0] && a[1] === b[1]), rx.map(([w, h]) => {
        s.ft.preferredSize(w, h).dp();
    })));
    r('needRerender, latestRenderData -> needRerender', s.pt.needRerender.pipe(rx.map(([, need]) => need), rx.distinctUntilChanged(), rx.switchMap(need => need ? rx.EMPTY :
        table.l.latestRenderData.pipe(rx.switchMap(([, data$]) => data$), rx.skip(1), rx.take(1), rx.map(() => s.ft.needRerender(true).dp())))));
    r('addRerenderAction', rx.merge(s.pt.addRerenderAction.pipe(rx.mergeMap(([, action$]) => action$))).pipe(rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? actionOrPayload[0] : actionOrPayload;
        s.ft.needRerender(true).dp(m);
    })));
    r('setSize', s.pt.setSize.pipe(rx.switchMap(([m, w, h]) => {
        if (typeof w === 'string' && typeof h === 'string') {
            const percW = /(\d+)%/.exec(w)[0];
            const percH = /(\d+)%/.exec(h)[0];
            return table.l.setParent.pipe(rx.switchMap(([, p]) => p ?
                p.table.l.onSize.pipe(rx.map(([, w0, h0]) => {
                    s.ft.setPreferredSize(Math.round(w0 * Number(percW) / 100), Math.round(h0 * Number(percH) / 100)).dp(m);
                })) :
                rx.EMPTY));
        }
        else if (typeof w === 'string') {
            const percW = /(\d+)%/.exec(w)[0];
            return table.l.setParent.pipe(rx.switchMap(([, p]) => p ?
                p.table.l.onSize.pipe(rx.map(([, w0]) => {
                    s.ft.setPreferredSize(Math.round(w0 * Number(percW) / 100), h).dp(m);
                })) :
                rx.EMPTY));
        }
        else if (typeof h === 'string') {
            const percH = /(\d+)%/.exec(h)[0];
            return table.l.setParent.pipe(rx.switchMap(([, p]) => p ?
                p.table.l.onSize.pipe(rx.map(([, , h0]) => {
                    s.ft.setPreferredSize(w, Math.round(h0 * Number(percH) / 100)).dp(m);
                })) :
                rx.EMPTY));
        }
        else {
            s.ft.setPreferredSize(w, h).dp(m);
            return rx.EMPTY;
        }
    })));
    r('needRerender, ofCanvas', s.pt.needRerender.pipe(rx.withLatestFrom(table.l.ofCanvas), rx.map(([[m, need], [, canvas]]) => {
        if (canvas && need)
            canvas.s.ft.requestRender().dp(m);
    })));
    r('render -> needRerender, onRender, renderBackgroundFor, onBoundingBox', s.pt.render.pipe(rx.withLatestFrom(table.l.needRerender, table.l.setParent, table.l.onSize, table.l.setDisplay), rx.map(([[m, canvas, trans, clips, masks], [, renderSelf], [, parent], [, width, height], [, display]]) => {
        s.ft._saveTransform(trans).dp(m);
        if (renderSelf) {
            s.ft.needRerender(false).dp(m);
            if (parent)
                parent.s.ft.renderBackgroundFor(service).dp(m);
        }
        const pos = [0, 0];
        gl_matrix_1.vec2.transformMat4(pos, pos, trans);
        const bounding = [pos[0], pos[1], width, height];
        s.ft.onBoundingBox(bounding).dp(m);
        // if (renderSelf) {
        if (display === DisplayMode.hidden) {
            canvas.s.ft.clearRect(...bounding).dp(m);
            s.ft.bgCleared(true).dp(m);
        }
        else
            s.ft.onRender(canvas, trans, renderSelf, clips !== null && clips !== void 0 ? clips : [[0, 0, width, height]], masks).dp(m);
        // }
    })));
    r('setParent, error$, parent.destory$... -> parent.onChildError, dispose()...', table.l.setParent.pipe(rx.switchMap(([m, parent]) => {
        if (parent == null) {
            s.ft.ofCanvas(null).dp(m);
            s.ft.onDettached(true).dp(m);
            return rx.EMPTY;
        }
        return rx.merge(parent.table.l.onDettached.pipe(rx.map(([m, d]) => {
            s.ft.onDettached(d).dp(m);
        })), parent.s.pt.bgCleared.pipe(rx.map(([m, cleared]) => {
            if (cleared) {
                s.ft.bgCleared(true).dp(m);
                s.ft.needRerender(true).dp(m);
            }
        })), parent.table.l.ofCanvas.pipe(rx.map(([m, canvas]) => s.ft.ofCanvas(canvas).dp(m))), service.error$.pipe(rx.tap(errInfo => parent.s.ft.onChildError(service.s.logPrefix, errInfo))), parent.destory$.pipe(rx.map(() => service.dispose())));
    })));
    r('setParent, parent.onBgChangeWithParent -> onBgChangeWithParent', rx.combineLatest([
        table.l.setParent.pipe(rx.switchMap(([, parent]) => { var _a; return (_a = parent === null || parent === void 0 ? void 0 : parent.table.l.onBgChangeWithParent) !== null && _a !== void 0 ? _a : rx.of([null, null]); })),
        table.l.setBackground
    ]).pipe(rx.map(([[m, pBg], [m2, ownBg]]) => {
        if (ownBg)
            s.ft.onBgChangeWithParent(ownBg).dp(m2);
        else if (m && pBg)
            s.ft.onBgChangeWithParent(pBg).dp(m, m2);
        else
            s.ft.onBgChangeWithParent(null).dp(m2);
    })));
    // observe parent, when parent is a "offsetParent", set "offsetParent" to it,
    // otherwise set offsetParent to parent's offsetParent
    r('setParent, p.isOffsetParent, p.offsetParent -> offsetParent', s.pt.setParent.pipe(rx.switchMap(([m, p]) => {
        if (p) {
            return rx.combineLatest([
                p.table.l.isOffsetParent,
                p.table.l.offsetParent
            ]).pipe(rx.map(([[m1, ofp], [m2, op]]) => {
                if (ofp) {
                    s.ft.offsetParent(ofp).dp(m1);
                }
                else {
                    s.ft.offsetParent(op).dp(m1, m2);
                }
            }));
        }
        else {
            s.ft.offsetParent(null).dp(m);
            return rx.EMPTY;
        }
    })));
    // dispatch onRectChange to offsetParent when setFocusable is not false or "isOffsetParent" is true
    r('offsetParent, isOffsetParent, setFocusable -> onRectChange, removeFocusable', table.l.offsetParent.pipe(rx.switchMap(([m, op]) => {
        if (op) {
            return rx.combineLatest([
                table.l.setFocusable,
                table.l.isOffsetParent
            ]).pipe(rx.switchMap(([[m2, focusable], [m1, isOffsetParent]]) => {
                // service.log('dispatch onRectChange for', focusable, 'isOffsetParent', isOffsetParent);
                if (focusable) {
                    if (focusable === true) {
                        return rx.combineLatest([
                            table.l.onPosition.pipe(rx.filter(([, x]) => x != null)),
                            table.l.onSize
                        ]).pipe(rx.map(([[, x, y], [, w, h]]) => {
                            op.focusService.s.ft.onRectChange([x, y, w, h], service).dp(m1);
                        }));
                    }
                    else {
                        return table.l.onPosition.pipe(rx.filter(([, x]) => x != null), rx.map(([, x, y]) => {
                            const rect = focusable;
                            op.focusService.s.ft.onRectChange([rect[0] + x, rect[1] + y, rect[2], rect[3]], service).dp(m2);
                        }));
                    }
                }
                else if (isOffsetParent) {
                    return rx.combineLatest([
                        table.l.onPosition.pipe(rx.filter(([, x]) => x != null)),
                        table.l.onSize
                    ]).pipe(rx.map(([[, x, y], [, w, h]]) => {
                        op.focusService.s.ft.onRectChange([x, y, w, h], service).dp(m1);
                    }));
                }
                else {
                    op.focusService.s.ft.removeFocusable(service).dp(m);
                    return rx.EMPTY;
                }
            }), rx.finalize(() => {
                op.focusService.s.ft.removeFocusable(service).dp(m);
            }));
        }
        return rx.EMPTY;
    })));
    // Refer "rootService" to offset parent's focusService's "rootService"
    r('offsetParent, isOffsetParent... -> focusService.rootService', rx.combineLatest([
        s.pt.offsetParent,
        s.pt.isOffsetParent
    ]).pipe(rx.switchMap(([[, op], [, isOffsetParent]]) => {
        return op && isOffsetParent
            ? op.focusService.table.l.rootService.pipe(rx.map(([m, rootFocus]) => isOffsetParent.focusService.s.ft.rootService(rootFocus).dp(m)))
            : rx.EMPTY;
    })));
    r('queryAbsBounding -> didQueryAbsBounding', s.pt.queryAbsBounding.pipe(rx.mergeMap(([m]) => rx.combineLatest([
        table.l.setParent,
        table.l.onPosition,
        table.l.onSize
    ]).pipe(rx.take(1), rx.mergeMap(([[, op], [, x, y], [, w, h]]) => {
        if (x == null || y == null) {
            s.ft.didQueryAbsBounding(null).dp(m);
            return rx.EMPTY;
        }
        if (op == null) {
            s.ft.didQueryAbsBounding([x, y, w, h]).dp(m);
            return rx.EMPTY;
        }
        let left = x;
        let top = y;
        const p = op;
        return p.s.ft.queryAbsBounding().re(m).od(p.s.pt.didQueryAbsBounding).pipe(rx.take(1), rx.map(([m2, r]) => {
            if (r == null) {
                s.ft.didQueryAbsBounding([x, y, w, h]).dp(m);
                return rx.EMPTY;
            }
            const [px, py] = r;
            const scrollData = p.table.getData().onValidScroll;
            // service.log('queryAbsBounding()', s.logPrefix, 'has scrollData', scrollData);
            // eslint-disable-next-line prefer-const
            if ((scrollData === null || scrollData === void 0 ? void 0 : scrollData[0]) != null) {
                const [sx, sy] = scrollData;
                left -= sx;
                top -= sy;
            }
            const res = [left + px, top + py, w, h];
            s.ft.didQueryAbsBounding(res).dp(m, m2);
        }));
    })))));
    r('onDettached -> focusService.removeFocusable', s.pt.onDettached.pipe(rx.withLatestFrom(table.l.offsetParent), rx.map(([[m], [m2, op]]) => {
        if (op)
            op.focusService.s.ft.removeFocusable(service).dp(m, m2);
    })));
    const renderData = rx.combineLatest([
        table.l.setDisplay,
        table.l.onSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)),
        table.l.setBackground
    ]);
    r('init', new rx.Observable(() => {
        s.ft.bgCleared(false).dp();
        s.ft.onPosition(null, null).dp();
        s.ft.isOffsetParent(false).dp();
        s.ft.offsetParent(null).dp();
        s.ft.setFlexGrow(0).dp();
        s.ft.setFlexShrink(1).dp();
        s.ft.setPreferredSize(null, null).dp();
        s.ft.needRerender(true).dp();
        s.ft.setParent(null).dp();
        s.ft.ofCanvas(null).dp();
        s.ft.setDisplay(DisplayMode.visible).dp();
        s.ft.onBoundingBox([0, 0, 0, 0]).dp();
        s.ft.setFocusable(false).dp();
        s.ft.onDettached(true).dp();
        s.ft.setBackground(null).dp();
        s.ft.isContainer(false).dp();
        s.ft.latestRenderData(renderData).dp();
    }));
    return service;
}
const tableFor = [
    'allChildren', 'allDisplayChildren', 'setLayoutValid', 'onChildPreferredSizeChange', 'hasOfflineCanvas', 'onChildPositions',
    'isOpaque', 'latestReflowData'
];
function createContainerBase(opts) {
    const base = createBase(opts);
    const service = base.config({
        tableFor,
        debugExcludeTypes: ['renderBackgroundFor']
    });
    const { r, s, table } = service;
    const { ft } = s;
    const children = [];
    r('addChild -> child.setParent', s.pt.addChild.pipe(rx.map(([m, ...added]) => {
        children.push(...added);
        for (const child of added) {
            child.s.ft.setParent(service).dp(m);
        }
    })));
    r('insertChild', s.pt.insertChild.pipe(rx.map(([m, before, added]) => {
        children.splice(before, 0, ...added);
        for (const child of added) {
            child.s.ft.setParent(service).dp(m);
        }
    })));
    r('removeChild', s.pt.removeChild.pipe(rx.map(([m, ...widgets]) => {
        for (const w of widgets) {
            const idx = children.findIndex(c => c === w);
            if (idx >= 0)
                children.splice(idx, 1);
            w.s.ft.setParent(null).dp(m);
        }
    })));
    r('addChild, removeChild, allChildren, children.preferredSize, children.setDisplay -> onChildPreferredSizeChange, setLayoutValid, allDisplayChildren', rx.merge(s.pt.addChild, s.pt.insertChild, s.pt.removeChild).pipe(rx.switchMap(([m]) => table.l.allChildren.pipe(rx.switchMap(([, children]) => {
        return rx.merge(
        // -> allDisplayChildren
        rx.combineLatest(children.map(c => c.table.l.setDisplay.pipe(rx.map(([, d]) => d === DisplayMode.none ? null : c)))).pipe(rx.map(chdn => chdn.filter(c => c != null)), rx.switchMap(chdn => {
            ft.allDisplayChildren(chdn).dp();
            return rx.combineLatest(chdn.map(widget => {
                return widget.table.l.preferredSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2));
            }));
        }), rx.map(sizes => ft.onChildPreferredSizeChange(sizes.map(([, w, h]) => [w, h])).dp(m))), 
        // watch display property change of each child component, dispatch setLayoutValid(false)
        ...children.map(widget => widget.table.l.setDisplay.pipe(rx.scan(([, prev], curr) => {
            const [m, mode] = curr;
            if (!((prev === DisplayMode.hidden && mode === DisplayMode.visible) ||
                (mode === DisplayMode.hidden && prev === DisplayMode.visible))) {
                ft.setLayoutValid(false).dp(m);
            }
            return curr;
        }), service.labelError('children.setDisplay -> setLayoutValid'))));
    })))));
    r('addReflowAction -> needRerender, setLayoutValid, bgCleared', s.pt.addReflowAction.pipe(rx.mergeMap(([, action$]) => action$), rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? actionOrPayload[0] : actionOrPayload;
        ft.needRerender(true).dp(m);
        ft.setLayoutValid(false).dp(m);
        ft.bgCleared(false).dp(m);
    })));
    r('renderSelf, onBgChangeWithParent, onSize -> canvas.addString, canvas.clearRect', s.pt.renderSelf.pipe(rx.mergeMap(a => rx.combineLatest([
        table.l.onSize,
        table.l.onBgChangeWithParent,
        table.l.bgCleared
    ]).pipe(rx.take(1), rx.map(b => [a, ...b]))), rx.map(([[m, canvas, trans], [, width, height], [, bg], [, cleared]], _idx) => {
        const pos = [0, 0];
        gl_matrix_1.vec2.transformMat4(pos, pos, trans);
        if (bg) {
            const fill = ' '.repeat(width);
            for (let i = 0; i < height; i++) {
                canvas.s.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
            }
        }
        else if (!cleared) {
            canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
            s.ft.bgCleared(true).dp(m);
        }
    })));
    r('onChildPositions... -> children.onPosition', rx.combineLatest([
        table.l.onChildPositions,
        table.l.allDisplayChildren
    ]).pipe(rx.map(([[m, posMap], [m2, chrd]]) => {
        for (const c of chrd) {
            const pos = posMap.get(c);
            if (pos)
                c.s.ft.onPosition(...pos).dp(m, m2);
        }
    })));
    r('renderSelf -> reflow, setLayoutValid, child.needRerender', s.pt.renderSelf.pipe(rx.withLatestFrom(table.l.setLayoutValid), rx.mergeMap(([[m, , , clips, masks], [, valid]]) => {
        if (!valid) {
            return table.l.allDisplayChildren.pipe(rx.take(1), rx.map(([, allChildren]) => {
                s.ft.setLayoutValid(true).dp(m);
                s.ft.reflow(clips, masks).dp(m);
                for (const child of allChildren)
                    child.s.ft.needRerender(true).dp(m);
            }));
        }
        else {
            return rx.EMPTY;
        }
    })));
    r('onRender -> renderSelf, renderChild', s.pt.onRender.pipe(rx.observeOn(rx.queueScheduler), rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => table.l.allDisplayChildren.pipe(rx.take(1), rx.map(([, children]) => {
        if (renderSelf)
            s.ft.renderSelf(canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
        for (let i = 0, l = children.length; i < l; i++) {
            const chr = children[i];
            s.ft.renderChild(i, chr, canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
        }
    })))));
    r('renderChild, onChildPositions -> child.render', s.pt.renderChild.pipe(rx.switchMap(([m, , chr, canvas, trans, clips, masks]) => rx.combineLatest([
        chr.table.l.onSize,
        table.l.onChildPositions
    ]).pipe(rx.take(1), rx.map(([[, width, height], [, childrenPosition]]) => {
        // listContainer.log('.renderChild', index, ': childrenPosition:', ...childrenPosition[index]);
        const [x, y] = childrenPosition.get(chr);
        const clipsOfCh = clips.map(cp => {
            const intersection = (0, canvas_1.rectIntersection)([x, y, width, height], cp);
            if (intersection) {
                intersection[0] -= x;
                intersection[1] -= y;
            }
            return intersection;
        }).filter(c => c != null);
        const masksOfCh = masks.map(mk => {
            const intersection = (0, canvas_1.rectIntersection)([x, y, width, height], mk);
            if (intersection) {
                intersection[0] -= x;
                intersection[1] -= y;
            }
            return intersection;
        }).filter(c => c != null);
        if (clipsOfCh.length > 0) {
            const tranOfChild = gl_matrix_1.mat4.fromTranslation(gl_matrix_1.mat4.create(), [x, y, 0]);
            gl_matrix_1.mat4.mul(tranOfChild, trans, tranOfChild);
            chr.s.ft.render(canvas, tranOfChild, clipsOfCh, masksOfCh).re(m).dp();
        }
    })))));
    r('onChildError -> parent.onChildError', s.pt.onChildError.pipe(rx.withLatestFrom(s.pt.setParent), rx.map(([[, childId, errInfo], [, parent]]) => {
        if (parent)
            parent.s.ft.onChildError(childId, errInfo);
    })));
    r('setLayoutValid, latestReflowData -> setLayoutValid', s.pt.setLayoutValid.pipe(rx.map(([, valid]) => valid), rx.distinctUntilChanged(), rx.switchMap(isValid => isValid ? table.l.latestReflowData.pipe(rx.switchMap(([, data$]) => data$), rx.skip(1), rx.take(1), rx.map(() => {
        s.ft.setLayoutValid(false).dp();
        s.ft.needRerender(true).dp();
        s.ft.bgCleared(false).dp();
    })) : rx.EMPTY)));
    r('findOverlaps -> didFindOverlaps', s.pt.findOverlaps.pipe(rx.mergeMap(([m, ...rect]) => {
        return rx.combineLatest([
            table.l.isOffsetParent,
            table.l.onSize
        ]).pipe(rx.take(1), rx.switchMap(([[, asOp], [, w, h]]) => {
            if (asOp) {
                return table.l.onPosition.pipe(rx.filter(([, x]) => x != null), rx.take(1), rx.map(([, x, y]) => (0, canvas_1.rectIntersection)([x, y, w, h], [rect[0] - x, rect[1] - y, rect[2], rect[3]])));
            }
            else {
                return rx.of((0, canvas_1.rectIntersection)([0, 0, w, h], rect));
            }
        }), rx.mergeMap(rect => {
            if (rect != null)
                return table.l.allDisplayChildren.pipe(rx.take(1), rx.mergeMap(([, chd]) => chd), rx.mergeMap(chr => chr.table.l.onBoundingBox.pipe(rx.take(1), rx.filter(([, bRect]) => {
                    return (0, canvas_1.rectIntersection)(rect, bRect) != null;
                }), rx.map(() => chr))), rx.mergeMap(chr => chr.table.l.isContainer.pipe(rx.take(1), rx.mergeMap(isContainer => {
                    if (isContainer) {
                        return chr.s.ft.findOverlaps(...rect)
                            .re(m).od(chr.s.pt.didFindOverlaps).pipe(rx.take(1), rx.map(([, chdOfChd]) => chdOfChd), rx.endWith([chr]));
                    }
                    return rx.of([chr]);
                }))), rx.reduce((acc, it) => {
                    acc.push(...it);
                    return acc;
                }, []), rx.map(found => s.ft.didFindOverlaps(found).dp(m)));
            else {
                s.ft.didFindOverlaps([]).dp(m);
                return rx.EMPTY;
            }
        }));
    })));
    const reflowData = rx.combineLatest([
        table.l.onSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)),
        table.l.onChildPreferredSizeChange
    ]);
    r('init', new rx.Observable(() => {
        ft.latestReflowData(reflowData).dp();
        ft.isContainer(true).dp();
        ft.allChildren(children).dp();
        ft.onSize(0, 0).dp();
        ft.onContentSizeChange(0, 0).dp();
        ft.overflow(false).dp();
        ft.setLayoutValid(false).dp();
        ft.hasOfflineCanvas(false).dp();
        ft.onChildPositions(new Map()).dp();
        ft.allDisplayChildren([]).dp();
        ft.onChildPreferredSizeChange([]).dp();
        ft.isOpaque(false).dp();
    }));
    return service;
}
//# sourceMappingURL=base.js.map