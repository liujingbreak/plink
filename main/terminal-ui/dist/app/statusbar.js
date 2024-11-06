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
exports.statusbarFac = void 0;
exports.createStatusbar = createStatusbar;
const rx = __importStar(require("rxjs"));
const index_1 = require("../index");
const tableFor = ['trackKeypressService', 'trackScrollable'];
exports.statusbarFac = index_1.borderFac.forExtend({
    name: 'statusbar',
    tableFor
}).defineReactor((init, opts) => {
    var _a, _b, _c, _d, _e;
    const container = (0, index_1.createFlexContainer)(Object.assign(Object.assign({}, opts), { name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : 'statusbar') + '.container' }));
    const statusbar = init(opts, container);
    statusbar.s.ft.setPadding(0, 1, 0, 1).dp();
    statusbar.s.ft.setBorder('padding').dp();
    statusbar.s.ft.setFlexShrink(0).dp();
    const { r, s, table } = statusbar;
    const labelScrollText = (0, index_1.createTextWidget)('scroll', {
        // ...opts as any,
        name: ((_b = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _b !== void 0 ? _b : 'statusbar') + '.container'
    });
    const labelScrollValue1 = (0, index_1.createTextWidget)('0%', {
        // ...opts as any,
        name: ((_c = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _c !== void 0 ? _c : 'statusbar') + '.v1'
    });
    const labelScrollValue2 = (0, index_1.createTextWidget)('0%', {
        // ...opts as any,
        name: ((_d = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _d !== void 0 ? _d : 'statusbar') + '.v2'
    });
    const HELP_KEY_HINT = 'Press <Enter> for help';
    const labelKeypress = (0, index_1.createTextWidget)(HELP_KEY_HINT, Object.assign(Object.assign({}, opts), { name: ((_e = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _e !== void 0 ? _e : 'statusbar') + '.key' }));
    labelKeypress.s.ft.setFlexGrow(1).dp();
    statusbar.s.ft.setBackground('bgHsl(120,50,80)').dp();
    labelKeypress.s.ft.setStyle(['hex(#000000)']).dp();
    // labelKeypress.s.ft.setBackground('bgHsl(90,50,80)').dp();
    labelScrollText.s.ft.setStyle(['hex(#000000)']).dp();
    labelScrollValue1.s.ft.setStyle(['hex(#000000)']).dp();
    labelScrollValue2.s.ft.setStyle(['hex(#000000)']).dp();
    container.s.ft.addChild(labelKeypress, labelScrollText, labelScrollValue1, labelScrollValue2).dp();
    r('trackScrollable, scrollable.onValidScroll -> onScrollStatus', table.l.trackScrollable.pipe(rx.switchMap(([, scrollable]) => {
        return rx.combineLatest([
            scrollable.table.l.onValidScroll,
            scrollable.table.l.onSize.pipe(rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH)),
            scrollable.table.l.onContent.pipe(rx.switchMap(([, compotent]) => compotent.table.l.onSize.pipe(rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH))))
        ]).pipe(rx.map(([[m1, sLeft, sTop], [m2, sWidth, sHeight], [m3, cWidth, cHeight]]) => {
            const scrollSpaceY = cHeight - sHeight;
            const vertRatio = scrollSpaceY < Number.EPSILON ? null : 1 - (cHeight - sTop - sHeight) / scrollSpaceY;
            const scrollSpaceX = cWidth - sWidth;
            const horizRatio = scrollSpaceX < Number.EPSILON ? null : 1 - (cWidth - sLeft - sWidth) / scrollSpaceX;
            s.ft.onScrollStatus(vertRatio != null ? vertRatio < Number.EPSILON ? 0 : vertRatio : null, horizRatio != null ? horizRatio < Number.EPSILON ? 0 : horizRatio : null).dp(m1, m2, m3);
        }));
    })));
    r('trackScrollable, scrollable.isScrollNeeded -> "labelScrollText"', table.l.trackScrollable.pipe(rx.switchMap(([, scrollable]) => scrollable.table.l.isScrollNeeded.pipe(rx.distinctUntilChanged(([, need0], [, need1]) => need0 === need1), rx.map(([m, need]) => {
        labelScrollText.s.ft.setDisplay(need ? index_1.DisplayMode.visible : index_1.DisplayMode.none).dp(m);
    })))));
    r('trackKeypressService, keyEventServcie.onDisplayKeys, keyEventServcie.onInputCompleted -> onKeypressStatus', table.l.trackKeypressService.pipe(rx.switchMap(([, keypress]) => {
        return rx.merge(keypress.table.l.onDisplayKeys.pipe(rx.map(([m, text, _isCompleted, isValid]) => {
            s.ft.onKeypressStatus(text, isValid).dp(m);
        })), keypress.s.pt.onExit.pipe(rx.map(([m]) => {
            s.ft.onKeypressStatus('Bye', true).dp(m);
        })));
    })));
    r('onScrollStatus', s.pt.onScrollStatus.pipe(rx.map(([m, v, h]) => {
        labelScrollValue1.s.ft.setContent(v != null ? 'row: ' + Math.floor(v * 100) + '%' : '').dp(m);
        labelScrollValue2.s.ft.setContent(h != null ? 'col: ' + Math.floor(h * 100) + '%' : '').dp(m);
    })));
    r('onKeypressStatus', s.pt.onKeypressStatus.pipe(rx.map(([m, text, valid]) => {
        labelKeypress.s.ft.setContent(text.length === 0 ? HELP_KEY_HINT : text).dp(m);
        return valid;
    }), rx.distinctUntilChanged(), rx.map(valid => {
        labelKeypress.s.ft.setStyle(valid ? ['green'] : ['hex(#000000)']).dp();
    })));
});
function createStatusbar(opts) {
    return exports.statusbarFac.create(opts);
}
//# sourceMappingURL=statusbar.js.map