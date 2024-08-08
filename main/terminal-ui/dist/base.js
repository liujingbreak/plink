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
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
var DisplayMode;
(function (DisplayMode) {
    DisplayMode[DisplayMode["visible"] = 0] = "visible";
    DisplayMode[DisplayMode["none"] = 1] = "none";
    DisplayMode[DisplayMode["hidden"] = 2] = "hidden"; // it does take space in layout, but with empty content 
})(DisplayMode || (exports.DisplayMode = DisplayMode = {}));
exports.tableForBase = [
    'onSize', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender',
    'setPreferredSize', 'setFlexGrow', 'ofCanvas', 'setDisplay', 'onBoundingBox', 'onDettached'
];
/** Do not prepend controller to returned service, otherwise interceptor won't work */
function createBase(opts) {
    const service = new reactivizer_1.SimplexReactor(Object.assign({ tableFor: exports.tableForBase }, opts));
    const { s, r, table } = service;
    // When table "setPreferredSize" contains non-null value, override corresponding "preferredSize" event, change or skip it
    service.s.prependInterceptor(up => {
        const disp = reactivizer_1.ActionDispenser.ofAction$(up);
        return rx.merge(disp.at.preferredSize.pipe(rx.withLatestFrom(table.l.setPreferredSize), rx.map(([a, [, w, h]]) => {
            if (w != null && a.p[0] !== w)
                a.p[0] = w;
            if (h != null && a.p[1] !== h)
                a.p[1] = h;
            return a;
        }), rx.distinctUntilChanged((a, b) => a.p[0] === b.p[0] && a.p[1] === b.p[1])), disp.ofOtherTypes());
    });
    r('addRerenderAction', rx.merge(s.pt.onSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)), s.pt.setDisplay.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b)), s.pt.addRerenderAction.pipe(rx.mergeMap(([, action$]) => action$)).pipe(rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? actionOrPayload[0] : actionOrPayload;
        s.ft.needRerender(true).dp(m);
    }))));
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
        if (renderSelf && parent) {
            parent.s.ft.renderBackgroundFor(service).dp(m);
        }
        const pos = [0, 0];
        gl_matrix_1.vec2.transformMat4(pos, pos, trans);
        const bounding = [pos[0], pos[1], width, height];
        s.ft.onBoundingBox(bounding).dp(m);
        if (display === DisplayMode.hidden) {
            canvas.s.ft.clearRect(...bounding).dp(m);
        }
        else
            s.ft.onRender(canvas, trans, renderSelf, clips !== null && clips !== void 0 ? clips : [[0, 0, width, height]], masks).dp(m);
        if (renderSelf)
            s.ft.needRerender(false).dp(m);
    })));
    r('setParent, error$, parent.destory$ -> parent.onChildError, dispose()', table.l.setParent.pipe(rx.switchMap(([m, parent]) => {
        if (parent == null) {
            s.ft.ofCanvas(null).dp(m);
            s.ft.onDettached(true).dp(m);
            return rx.EMPTY;
        }
        return rx.merge(parent.table.l.onDettached.pipe(rx.map(([m, d]) => {
            s.ft.onDettached(d).dp(m);
        })), parent.table.l.ofCanvas.pipe(rx.map(([m, canvas]) => s.ft.ofCanvas(canvas).dp(m))), service.error$.pipe(rx.tap(errInfo => parent.s.ft.onChildError(service.s.logPrefix, errInfo))), parent.destory$.pipe(rx.map(() => service.dispose())));
    })));
    r('init', new rx.Observable(() => {
        s.ft.setFlexGrow(0).dp();
        s.ft.setPreferredSize(null, null).dp();
        s.ft.needRerender(true).dp();
        s.ft.setParent(null).dp();
        s.ft.ofCanvas(null).dp();
        s.ft.setDisplay(DisplayMode.visible).dp();
        s.ft.onBoundingBox([0, 0, 0, 0]).dp();
        s.ft.onDettached(true).dp();
    }));
    return service;
}
const tableFor = ['allChildren', 'allDisplayChildren', 'setLayoutValid', 'setBackground', 'onBgChangeWithParent', 'onChildPreferredSizeChange'];
function createContainerBase(opts) {
    const base = createBase(opts);
    const service = base.config({
        tableFor
    });
    const { r, s, table } = service;
    const { ft } = s;
    const children = [];
    r('addChild -> child.setParent', s.pt.addChild.pipe(rx.map(([m, ...added]) => {
        children.push(...added);
        for (const child of children) {
            child.s.ft.setParent(service).dp(m);
        }
    })));
    r('removeChild', s.pt.removeChild.pipe(rx.map(([, ...widgets]) => {
        for (const w of widgets) {
            const idx = children.findIndex(c => c === w);
            if (idx >= 0)
                children.splice(idx, 1);
        }
    })));
    r('addChild, removeChild, allChildren, children.preferredSize, children.setDisplay -> onChildPreferredSizeChange, setLayoutValid, allDisplayChildren', rx.merge(s.pt.addChild, s.pt.removeChild).pipe(rx.switchMap(() => table.l.allChildren.pipe(rx.switchMap(([, children]) => {
        return rx.merge(
        // -> allDisplayChildren
        rx.combineLatest(children.map(c => c.table.l.setDisplay.pipe(rx.map(([, d]) => d === DisplayMode.none ? null : c)))).pipe(rx.map(chdn => chdn.filter(c => c != null)), rx.switchMap(chdn => {
            ft.allDisplayChildren(chdn).dp();
            return rx.combineLatest(chdn.map(widget => {
                return widget.table.l.preferredSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2));
            }));
        }), rx.map(sizes => ft.onChildPreferredSizeChange(sizes.map(([, w, h]) => [w, h])).dp())), rx.merge(children.map(widget => widget.table.l.setDisplay.pipe(rx.scan(([, prev], curr) => {
            const [m, mode] = curr;
            if (!((prev === DisplayMode.hidden && mode === DisplayMode.visible) ||
                (mode === DisplayMode.hidden && prev === DisplayMode.visible))) {
                ft.setLayoutValid(false).dp(m);
            }
            return curr;
        }), service.labelError('children.setDisplay -> setLayoutValid')))));
    })))));
    r('addReflowAction -> needRerender, setLayoutValid', s.pt.addReflowAction.pipe(rx.mergeMap(([, action$]) => action$), rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? actionOrPayload[0] : actionOrPayload;
        ft.needRerender(true).dp(m);
        ft.setLayoutValid(false).dp(m);
    })));
    r('renderSelf -> reflow, setLayoutValid, child.needRerender', s.pt.renderSelf.pipe(rx.withLatestFrom(table.l.setLayoutValid), rx.mergeMap(([[m], [, valid]]) => {
        if (!valid) {
            return table.l.allDisplayChildren.pipe(rx.take(1), rx.map(([, allChildren]) => {
                s.ft.reflow().dp(m);
                s.ft.setLayoutValid(true).dp(m);
                for (const child of allChildren)
                    child.s.ft.needRerender(true).dp(m);
            }));
        }
        else {
            return rx.EMPTY;
        }
    })));
    r('onRender -> renderSelf, renderChild', s.pt.onRender.pipe(rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => table.l.allDisplayChildren.pipe(rx.take(1), rx.map(([, children]) => {
        if (renderSelf)
            s.ft.renderSelf(canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
        for (let i = 0, l = children.length; i < l; i++) {
            const chr = children[i];
            s.ft.renderChild(i, chr, canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
        }
    })))));
    r('renderChild -> child.render, canvas.addString', s.pt.renderChild.pipe(rx.map(([m, _index, chr, canvas, trans, _renderArea]) => {
        chr.s.ft.render(canvas, trans).re(m).dp();
    })));
    r('onChildError -> parent.onChildError', s.pt.onChildError.pipe(rx.withLatestFrom(s.pt.setParent), rx.map(([[, childId, errInfo], [, parent]]) => {
        if (parent)
            parent.s.ft.onChildError(childId, errInfo);
    })));
    r('renderSelf, onBgChangeWithParent, onSize -> canvas.addString, canvas.clearRect', s.pt.renderSelf.pipe(rx.mergeMap(a => rx.combineLatest([
        table.l.onSize,
        table.l.onBgChangeWithParent
    ]).pipe(rx.take(1), rx.map(b => [a, ...b]))), rx.map(([[m, canvas, trans], [, width, height], [, bg]], _idx) => {
        const pos = [0, 0];
        gl_matrix_1.vec2.transformMat4(pos, pos, trans);
        if (bg) {
            const fill = ' '.repeat(width);
            for (let i = 0; i < height; i++) {
                canvas.s.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
            }
        }
        else {
            canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
            // if (idx === 0) {
            //   const fill = ' '.repeat(width);
            //   for (let i = 0; i < height; i++) {
            //     canvas.s.ft.addString(pos[0], pos[1] + i, fill).dp(m);
            //   }
            // } else {
            //   canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
            // }
        }
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
    r('init', new rx.Observable(() => {
        ft.addReflowAction(s.pt.onSize).dp();
        ft.addReflowAction(s.pt.onChildPreferredSizeChange).dp();
        ft.addRerenderAction(s.pt.onBgChangeWithParent).dp();
        ft.allChildren(children).dp();
        ft.onSize(0, 0).dp();
        ft.preferredSize(0, 0).dp();
        ft.overflow(false).dp();
        ft.setLayoutValid(false).dp();
        ft.setBackground(null).dp();
    }));
    return service;
}
//# sourceMappingURL=base.js.map