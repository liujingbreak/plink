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
exports.createStatusbar = createStatusbar;
const rx = __importStar(require("rxjs"));
const index_1 = require("../index");
const tableFor = ['trackKeypressService', 'trackScrollable'];
function createStatusbar(opts) {
    const container = (0, index_1.createFlexContainer)(opts);
    const statusbar = container.config({
        tableFor
    });
    const { r, s, table } = statusbar;
    const labelScrollText = (0, index_1.createTextWidget)('scroll:');
    const labelScrollValue1 = (0, index_1.createTextWidget)('');
    const labelScrollValue2 = (0, index_1.createTextWidget)('');
    const labelKeypress = (0, index_1.createTextWidget)('');
    s.ft.addChild(labelScrollText.asBaseType, labelScrollValue1.asBaseType, labelScrollValue2.asBaseType, labelKeypress.asBaseType).dp();
    r('trackScrollable, scrollable.onValidScroll', table.l.trackScrollable.pipe(rx.switchMap(([, scrollable]) => {
        return rx.combineLatest([
            scrollable.table.l.onValidScroll,
            scrollable.table.l.onSize.pipe(rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH)),
            scrollable.table.l.onContent.pipe(rx.switchMap(([, compotent]) => compotent.table.l.onSize.pipe(rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH))))
        ]).pipe(rx.map(([[m1, sLeft, sTop], [m2, sWidth, sHeight], [m3, cWidth, cHeight]]) => {
            const vertRatio = sTop / (cHeight - sHeight);
            const horizRatio = sLeft / (cWidth - sWidth);
            s.ft.onScrollStatus(vertRatio, horizRatio).dp(m1, m2, m3);
        }));
    })));
    r('onScrollStatus', s.pt.onScrollStatus.pipe(rx.map(([m, v, h]) => {
        labelScrollValue1.s.ft.setContent('v: ' + Math.floor(v * 100)).dp(m);
        labelScrollValue2.s.ft.setContent('h: ' + Math.floor(h * 100)).dp(m);
    })));
    return statusbar;
}
//# sourceMappingURL=statusbar.js.map