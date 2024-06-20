"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStaticTextLabel = exports.createWidget = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
const tableFor = ['setParent', 'allChildren', 'setTransform', 'setSize', 'preferredSize'];
function createWidget() {
    const service = new reactivizer_1.SimplexReactor({
        tableFor
    });
    const { r, s } = service;
    const children = [];
    r('addChild -> child.setParent', s.pt.addChild.pipe(rx.map(([m, ...added]) => {
        children.push(...added);
        for (const child of children) {
            if (child.s)
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
    r('render -> renderChild, rendered', s.pt.render.pipe(rx.withLatestFrom(s.pt.setTransform), rx.map(([[m, canvas, pTrans], [, trans]]) => {
        const absTrans = gl_matrix_1.mat4.mul(gl_matrix_1.mat4.create(), pTrans, trans);
        for (let i = 0, l = children.length; i < l; i++) {
            const chr = children[i];
            s.ft.renderChild(i, chr, canvas, absTrans).dp(m);
        }
        s.ft.rendered().dp(m);
    })));
    r('renderChild -> child.render, canvas.addString', s.pt.renderChild.pipe(rx.map(([m, _index, chr, canvas, trans]) => {
        if (isStaticTextLabel(chr)) {
            const vec = gl_matrix_1.vec2.create();
            gl_matrix_1.vec2.transformMat4(vec, vec, trans);
            canvas.s.ft.addString(vec[0], vec[1], chr.text).dp(m);
        }
        else {
            chr.s.ft.render(canvas, trans).re(m).dp();
        }
    })));
    s.ft.allChildren(children).dp();
    s.ft.setTransform(gl_matrix_1.mat4.create()).dp();
    s.ft.setSize(0, 0).dp();
    s.ft.preferredSize(0, 0).dp();
    return service;
}
exports.createWidget = createWidget;
function isStaticTextLabel(obj) {
    return obj.displayLength != null && obj.text != null;
}
exports.isStaticTextLabel = isStaticTextLabel;
//# sourceMappingURL=terminal-widget.js.map