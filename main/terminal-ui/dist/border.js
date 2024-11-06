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
exports.borderFac = void 0;
exports.createBorderContainer = createBorderContainer;
exports.renderLineBorder = renderLineBorder;
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const container_1 = require("./container");
const tableForBorderContainer = ['setBorder', 'setBorderStyle', 'setPadding'];
// https://symbl.cc/en/unicode/blocks/box-drawing/
const BORDER_CHARS = ['╭─╮', '╰─╯', '│'];
exports.borderFac = container_1.baseContainerFac.forExtend({
    name: 'border',
    tableFor: tableForBorderContainer
}).defineReactor((init, child, opts) => {
    const service = init(opts);
    const { r, table, s } = service;
    const childPos = [0, 0];
    const positions = new Map([[child, childPos]]);
    r('querySizeOf -> prefWidthFor, prefHeightFor', s.pt.querySizeOf.pipe(rx.withLatestFrom(table.l.allChildren, table.l.setBorder, table.l.setPadding), rx.mergeMap(([[m, w, h], [, children], [, border], [, top, right, bottom, left]]) => {
        if (w == null && h != null) {
            const qh = h - top - bottom - (border === 'line' ? 2 : 0);
            if (qh < 0) {
                s.ft.prefWidthFor(0, h).dp(m);
                return rx.EMPTY;
            }
            return children[0].s.ft.querySizeOf(null, qh).re(m).od(children[0].s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, childWidth]) => {
                s.ft.prefWidthFor(childWidth + left + right + (border === 'line' ? 2 : 0), h).dp(m);
            }));
        }
        else if (h == null && w != null) {
            const qw = w - left - right - (border === 'line' ? 2 : 0);
            if (qw < 0) {
                s.ft.prefHeightFor(w, 0).dp(m);
                return rx.EMPTY;
            }
            return children[0].s.ft.querySizeOf(qw, null).re(m).od(children[0].s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , childHeight]) => {
                s.ft.prefHeightFor(w, childHeight + top + bottom + (border === 'line' ? 2 : 0)).dp(m);
            }));
        }
        return rx.EMPTY;
    })));
    r('onChildPreferredSizeChange,... -> onContentSizeChange', rx.combineLatest([
        s.pt.onChildPreferredSizeChange,
        table.l.setBorder, table.l.setPadding
    ]).pipe(rx.map(([[m, sizes], [m2, border], [m3, top, right, bottom, left]]) => {
        const line = border === 'line' ? 2 : 0;
        if (sizes.length > 0) {
            s.ft.onContentSizeChange(sizes[0][0] + line + right + left, sizes[0][1] + line + top + bottom).dp(m, m2, m3);
        }
        else {
            s.ft.onContentSizeChange(line + right + left, line + top + bottom).dp(m, m2, m3);
        }
    })));
    const reflowData = [
        table.l.onSize,
        table.l.setBorder,
        table.l.setPadding,
        table.l.allChildren
    ];
    r('reflow -> onSize, setLayoutValid', s.pt.reflow.pipe(rx.withLatestFrom(...reflowData), rx.map(([[m], [ms, w, h], [, border], [, top, right, bottom, left], [, children]]) => {
        s.ft.setLayoutValid(true).dp(m);
        childPos[0] = childPos[1] = 0;
        let borderLine = 0;
        if (border === 'line') {
            childPos[0] = 1;
            childPos[1] = 1;
            borderLine = 2;
        }
        childPos[0] += left;
        childPos[1] += top;
        const cWidth = w - left - right - borderLine;
        const cHeight = h - top - bottom - borderLine;
        if (cWidth > 0 && cHeight > 0) {
            children[0].s.ft.onSize(cWidth, cHeight).dp(m);
            s.ft.onChildPositions(positions).dp(m);
        }
    })));
    const renderData = rx.combineLatest([
        table.l.setBorder,
        rx.combineLatest([table.l.setBorderStyle, table.l.onBgChangeWithParent]).pipe(rx.map(([[, style], [, bg]]) => {
            return bg ? [bg, ...style] : style;
        })),
        table.l.onSize
    ]);
    r('renderSelf', s.pt.renderSelf.pipe(rx.withLatestFrom(renderData), rx.map(([[m, canvas, trans], [[, border], style, [, w, h]]]) => {
        const pos = [0, 0];
        if (border === 'line' && w > 2 && h > 2) {
            gl_matrix_1.vec2.transformMat4(pos, pos, trans);
            renderLineBorder(m, canvas, pos[0], pos[1], w, h, style);
        }
    })));
    r('init', new rx.Observable(() => {
        s.ft.latestReflowData(rx.merge(...reflowData)).dp();
        s.ft.setPadding(0, 1, 0, 1).dp();
        s.ft.setBorder('line').dp();
        s.ft.addChild(child).dp();
        s.ft.setBorderStyle([]).dp();
        s.ft.onChildPositions(positions).dp();
    }));
});
function createBorderContainer(child, opts) {
    return exports.borderFac.create(child, opts);
}
function renderLineBorder(m, canvas, x, y, w, h, style) {
    canvas.s.ft.addString(x, y, BORDER_CHARS[0][0] + BORDER_CHARS[0][1].repeat(w - 2) + BORDER_CHARS[0][2], style).dp(m);
    for (let i = 1, l = h - 2; i <= l; i++) {
        const top = y + i;
        canvas.s.ft.addString(x, top, BORDER_CHARS[2], style).dp(m);
        canvas.s.ft.addString(x + w - 1, top, BORDER_CHARS[2], style).dp(m);
    }
    canvas.s.ft.addString(x, y + h - 1, BORDER_CHARS[1][0] + BORDER_CHARS[1][1].repeat(w - 2) + BORDER_CHARS[1][2], style).dp(m);
}
//# sourceMappingURL=border.js.map