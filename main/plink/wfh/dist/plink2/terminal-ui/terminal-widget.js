"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyBase = void 0;
exports.createWidget = createWidget;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const tableForBase = ['setSize', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent'];
exports.applyBase = (0, reactivizer_1.defineParialSimplexReactor)(tableForBase);
const tableFor = ['allChildren'];
function createWidget() {
    const service0 = new reactivizer_1.SimplexReactor({
        tableFor,
        log: nodejs_utils_1.conciseNocolorConsoleLogger
    });
    const service = (0, exports.applyBase)(service0);
    const { r, s } = service;
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
    s.ft.allChildren(children).dp();
    s.ft.setSize(0, 0).dp();
    s.ft.preferredSize(0, 0).dp();
    s.ft.setParent(null).dp();
    s.ft.overflow(false).dp();
    return service;
}
//# sourceMappingURL=terminal-widget.js.map