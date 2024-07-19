"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableForBase = void 0;
exports.createBase = createBase;
exports.createContainerBase = createContainerBase;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
exports.tableForBase = ['setSize', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender'];
/** Do not prepend controller to returned service, otherwise interceptor won't work */
function createBase() {
    const service = new reactivizer_1.SimplexReactor({ tableFor: exports.tableForBase });
    const { s, r, table } = service;
    r('addRerenderAction', rx.merge(s.pt.setSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)), s.pt.addRerenderAction.pipe(rx.mergeMap(([, action$]) => action$)).pipe(rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? actionOrPayload[0] : actionOrPayload;
        s.ft.needRerender(true).dp(m);
    }))));
    r('render -> needRerender, onRender, renderBackgroundFor', s.pt.render.pipe(rx.withLatestFrom(table.l.needRerender, table.l.setParent), rx.map(([[m, canvas, trans], [, renderSelf], [, parent]]) => {
        if (renderSelf && parent) {
            parent.s.ft.renderBackgroundFor(service).dp(m);
        }
        s.ft.onRender(canvas, trans, renderSelf).dp(m);
        if (renderSelf)
            s.ft.needRerender(false).dp(m);
    })));
    r('setParent, onChildError, parent.destory$ -> parent.onChildError, dispose()', s.pt.setParent.pipe(rx.switchMap(([, parent]) => parent ?
        rx.merge(service.error$.pipe(rx.tap(errInfo => parent.s.ft.onChildError(service.s.logPrefix, errInfo))), parent.destory$.pipe(rx.map(() => service.dispose()))) :
        rx.EMPTY)));
    s.ft.needRerender(true).dp();
    return service;
}
const tableFor = ['allChildren', 'setLayoutValid', 'setBackground', 'onChildPreferredSizeChange'];
function createContainerBase() {
    const service = createBase().config({
        tableFor,
        log: nodejs_utils_1.conciseNocolorConsoleLogger
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
    r('addChild, removeChild, children.preferredSize -> onChildPreferredSizeChange', rx.merge(s.pt.addChild, s.pt.removeChild).pipe(rx.switchMap(() => table.l.allChildren.pipe(rx.switchMap(([, children]) => {
        return rx.combineLatest([...children].map(widget => {
            return widget.table.l.preferredSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2));
        }));
    }), rx.map(preferredSizeOfChildren => {
        ft.onChildPreferredSizeChange(preferredSizeOfChildren.map(([, w, h]) => [w, h])).dp();
    })))));
    r('addReflowAction', s.pt.addReflowAction.pipe(rx.mergeMap(([, action$]) => action$), rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? actionOrPayload[0] : actionOrPayload;
        s.ft.needRerender(true).dp(m);
        s.ft.setLayoutValid(false).dp(m);
    })));
    r('renderSelf -> reflow', s.pt.renderSelf.pipe(rx.withLatestFrom(table.l.setLayoutValid), rx.map(([[m], [, valid]]) => {
        if (!valid)
            s.ft.reflow().dp(m);
    })));
    r('reflow -> child.needRerender(true)', s.pt.reflow.pipe(rx.withLatestFrom(table.l.allChildren), rx.map(([[m], [, allChildren]]) => {
        for (const child of allChildren)
            child.s.ft.needRerender(true).dp(m);
    })));
    r('onRender -> renderSelf, renderChild, rendered', s.pt.onRender.pipe(rx.map(([m, canvas, trans, renderSelf]) => {
        if (renderSelf)
            s.ft.renderSelf(canvas, trans).dp(m);
        for (let i = 0, l = children.length; i < l; i++) {
            const chr = children[i];
            s.ft.renderChild(i, chr, canvas, trans).dp(m);
        }
    })));
    r('renderChild -> child.render, canvas.addString', s.pt.renderChild.pipe(rx.map(([m, _index, chr, canvas, trans]) => {
        chr.s.ft.render(canvas, trans).re(m).dp();
    })));
    r('onChildError', s.pt.onChildError.pipe(rx.withLatestFrom(s.pt.setParent), rx.map(([[, childId, errInfo], [, parent]]) => {
        if (parent)
            parent.s.ft.onChildError(childId, errInfo);
    })));
    r('renderSelf, setBackground, setSize -> canvas.addString', s.pt.renderSelf.pipe(rx.mergeMap(a => rx.combineLatest([
        table.l.setSize,
        table.l.setBackground
    ]).pipe(rx.take(1), rx.map(b => [a, ...b]))), rx.map(([[m, canvas, trans], [, width, height], [, bg]], idx) => {
        const pos = [0, 0];
        gl_matrix_1.vec2.transformMat4(pos, pos, trans);
        if (bg) {
            const fill = ' '.repeat(width);
            for (let i = 0; i < height; i++) {
                canvas.s.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
            }
        }
        else {
            if (idx === 0) {
                const fill = ' '.repeat(width);
                for (let i = 0; i < height; i++) {
                    canvas.s.ft.addString(pos[0], pos[1] + i, fill).dp(m);
                }
            }
            else {
                canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
            }
        }
    })));
    r('setParent, parent.setBackground -> setBackground', table.l.setParent.pipe(rx.switchMap(([, parent]) => parent ?
        parent.table.l.setBackground.pipe(rx.withLatestFrom(table.l.setBackground), rx.mergeMap(([[m, pBg], [, ownBg]]) => new rx.Observable(_sub => {
            if (pBg) {
                ft.setBackground(pBg).dp(m);
                return () => {
                    return ft.setBackground(ownBg).dp(m);
                };
            }
        }))) :
        rx.EMPTY)));
    ft.addReflowAction(s.pt.setSize).dp();
    ft.addReflowAction(s.pt.onChildPreferredSizeChange).dp();
    ft.allChildren(children).dp();
    ft.setSize(0, 0).dp();
    ft.preferredSize(0, 0).dp();
    ft.setParent(null).dp();
    ft.overflow(false).dp();
    ft.setLayoutValid(false).dp();
    ft.setBackground(null).dp();
    return service;
}
//# sourceMappingURL=terminal-widget.js.map