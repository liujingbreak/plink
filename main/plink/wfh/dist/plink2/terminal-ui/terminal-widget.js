"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBase = createBase;
exports.createContainerBase = createContainerBase;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const tableForBase = ['setSize', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender', 'clearBackground'];
/** Do not prepend controller to returned service, otherwise interceptor won't work */
function createBase() {
    const service = new reactivizer_1.SimplexReactor({ tableFor: tableForBase });
    const { s, r, table } = service;
    service.s.interceptor$.next(a$ => {
        const ad = new reactivizer_1.ActionDispenser(a$);
        return rx.merge(ad.at.render.pipe(rx.filter(() => service.table.getData().needRerender[0] === true)), ad.ofOtherTypes());
    });
    r('addRerenderAction', rx.merge(s.pt.setSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)), s.pt.addRerenderAction.pipe(rx.mergeMap(([, action$]) => action$)).pipe(rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? actionOrPayload[0] : actionOrPayload;
        s.ft.needRerender(true).dp(m);
    }))));
    r('render', s.pt.render.pipe(rx.tap(([m]) => s.ft.needRerender(false).dp(m)), rx.switchMap(r => rx.combineLatest([table.l.setSize, table.l.clearBackground]).pipe(rx.take(1), rx.map(b => [r, ...b]))), rx.map(([[m, canvas, trans], [, width, height], [, clearBg]]) => {
        if (clearBg) {
            const pos = [0, 0];
            gl_matrix_1.vec2.transformMat4(pos, pos, trans);
            canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
        }
    })));
    s.ft.needRerender(true).dp();
    s.ft.clearBackground(false).dp();
    return service;
}
const tableFor = ['allChildren', 'setLayoutValid'];
function createContainerBase() {
    const service = createBase().config({
        tableFor,
        log: nodejs_utils_1.conciseNocolorConsoleLogger
    });
    const { r, s, table } = service;
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
    r('render -> renderSelf, renderChild, rendered', s.pt.render.pipe(rx.map(([m, canvas, trans]) => {
        s.ft.renderSelf(canvas, trans).dp(m);
        for (let i = 0, l = children.length; i < l; i++) {
            const chr = children[i];
            s.ft.renderChild(i, chr, canvas, trans).dp(m);
        }
    })));
    r('renderChild -> child.render, canvas.addString', s.pt.renderChild.pipe(rx.map(([m, _index, chr, canvas, trans]) => {
        chr.s.ft.render(canvas, trans).re(m).dp();
    })));
    r('setParent, onChildError -> parent.onChildError', s.pt.setParent.pipe(rx.switchMap(([, parent]) => {
        return parent ?
            rx.merge(service.error$.pipe(rx.tap(errInfo => parent.s.ft.onChildError(service.s.logPrefix, errInfo))), s.pt.onChildError.pipe(rx.tap(([, childId, errInfo]) => parent.s.ft.onChildError(childId, errInfo)))) :
            rx.EMPTY;
    })));
    s.ft.addReflowAction(s.pt.setSize).dp();
    s.ft.allChildren(children).dp();
    s.ft.setSize(0, 0).dp();
    s.ft.preferredSize(0, 0).dp();
    s.ft.setParent(null).dp();
    s.ft.overflow(false).dp();
    s.ft.setLayoutValid(false).dp();
    s.ft.clearBackground(true).dp();
    return service;
}
//# sourceMappingURL=terminal-widget.js.map