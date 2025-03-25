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
exports.statusbarFac = void 0;
exports.createStatusbar = createStatusbar;
const rx = __importStar(require("rxjs"));
const index_1 = require("../index");
const text_1 = require("../hoc/text");
const tableFor = [
    'trackKeypressService', 'trackScrollable', 'setMessage',
    'setBgOnSurfaceColor', 'setBgSurfaceColor'
];
exports.statusbarFac = index_1.borderFac.forExtend({
    name: 'statusbar',
    tableFor
}).defineReactor((init, opts) => {
    var _a, _b, _c, _d, _e, _f;
    const container = (0, index_1.createFlexContainer)(Object.assign(Object.assign({}, opts), { name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : 'statusbar') + '.container' }));
    const statusbar = init(Object.assign(Object.assign({}, opts), { name: ((_b = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _b !== void 0 ? _b : 'statusbar') + '.border' }), container);
    statusbar.ft.setPadding(0, 0, 0, 1).dp();
    statusbar.ft.setBorder('none').dp();
    statusbar.ft.setFlexShrink(0).dp();
    const { r, pt, ft, latest } = statusbar;
    const labelScrollText = text_1.textFac.create('scroll', {
        // ...opts as any,
        name: ((_c = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _c !== void 0 ? _c : 'statusbar') + '.label'
    });
    const labelScrollValueR = text_1.textFac.create('0%', {
        name: ((_d = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _d !== void 0 ? _d : 'statusbar') + '.v1'
    });
    const labelScrollValueC = text_1.textFac.create('0%', {
        name: ((_e = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _e !== void 0 ? _e : 'statusbar') + '.v2'
    });
    const HELP_KEY_HINT = 'Press <Enter> for help';
    const labelKeypress = (0, index_1.createTextWidget)(HELP_KEY_HINT, Object.assign(Object.assign({}, opts), { name: ((_f = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _f !== void 0 ? _f : 'statusbar') + '.key' }));
    const customizedMsg = (0, index_1.createTextWidget)('', {
        name: statusbar.s.logPrefix + '.msg', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log
    });
    customizedMsg.ft.setFlexGrow(1).dp();
    container.ft.setBorderSpacing(0).dp();
    container.ft.addChild(labelKeypress, customizedMsg, labelScrollText, labelScrollValueR, labelScrollValueC).dp();
    r('trackScrollable, scrollable.onValidScroll -> onScrollStatus', latest.trackScrollable.pipe(rx.switchMap(([, scrollable]) => {
        return rx.combineLatest([
            scrollable.latest.onValidScroll,
            scrollable.latest.onSize.pipe(rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH)),
            scrollable.latest.onContent.pipe(rx.switchMap(([, compotent]) => compotent.latest.onSize.pipe(rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH))))
        ]).pipe(rx.map(([[m1, sLeft, sTop], [m2, sWidth, sHeight], [m3, cWidth, cHeight]]) => {
            const scrollSpaceY = cHeight - sHeight;
            const vertRatio = scrollSpaceY < Number.EPSILON ? null : 1 - (cHeight - sTop - sHeight) / scrollSpaceY;
            const scrollSpaceX = cWidth - sWidth;
            const horizRatio = scrollSpaceX < Number.EPSILON ? null : 1 - (cWidth - sLeft - sWidth) / scrollSpaceX;
            ft.onScrollStatus(vertRatio != null ? vertRatio < Number.EPSILON ? 0 : vertRatio : null, horizRatio != null ? horizRatio < Number.EPSILON ? 0 : horizRatio : null).dp(m1, m2, m3);
        }));
    })));
    r('trackScrollable, scrollable.isScrollNeeded -> "labelScrollText"', latest.trackScrollable.pipe(rx.switchMap(([, scrollable]) => scrollable.latest.isScrollNeeded.pipe(rx.distinctUntilChanged(([, need0], [, need1]) => need0 === need1), rx.map(([m, need]) => {
        labelScrollText.ft.setDisplay(need ? index_1.DisplayMode.visible : index_1.DisplayMode.none).dp(m);
    })))));
    r('trackKeypressService, keyEventServcie.onDisplayKeys, keyEventServcie.onInputCompleted -> onKeypressStatus', latest.trackKeypressService.pipe(rx.switchMap(([, keypress]) => {
        return rx.merge(keypress.latest.onDisplayKeys.pipe(rx.map(([m, text, _isCompleted, isValid]) => {
            ft.onKeypressStatus(text, isValid).dp(m);
        })), keypress.pt.onExit.pipe(rx.map(([m]) => {
            ft.onKeypressStatus('Bye', true).dp(m);
        })));
    })));
    r('onScrollStatus', pt.onScrollStatus.pipe(rx.map(([m, v, h]) => {
        labelScrollValueR.ft.setContent(v != null ? ' row: ' + Math.floor(v * 100) + '% ' : '').dp(m);
        labelScrollValueC.ft.setContent(h != null ? ' col: ' + Math.floor(h * 100) + '% ' : '').dp(m);
    })));
    const colors$ = (0, index_1.querySchemeForComponent)(statusbar);
    r('onKeypressStatus', pt.onKeypressStatus.pipe(rx.map(([m, text, valid]) => {
        labelKeypress.ft.setContent(text.length === 0 ? HELP_KEY_HINT : text).dp(m);
        return valid;
    }), rx.distinctUntilChanged(), rx.withLatestFrom(colors$), rx.map(([valid, [colors]]) => {
        labelKeypress.ft.setStyle(valid ?
            [`hex(${colors.onPrimary})`] :
            [`hex(${colors.onPrimaryContainer})`]).dp();
        statusbar.ft.setBackground(valid ?
            `bgHex(${colors.tertiary})` :
            `bgHex(${colors.tertiaryContainer})`).dp();
    })));
    r('setMessage', latest.setMessage.pipe(rx.map(([m, t]) => customizedMsg.ft.setContent(t).dp(m))));
    r('"theming"', colors$.pipe(rx.map(([colors, m1, m2]) => {
        statusbar.ft.setBackground(`bgHex(${colors.tertiary})`).dp(m1, m2);
        labelKeypress.ft.setForeground([`hex(${colors.onTertiary})`]).dp(m1, m2);
        labelScrollText.ft.setForeground([`hex(${colors.onTertiaryContainer})`]).dp(m1, m2);
        labelScrollText.ft.setBackground(`bgHex(${colors.tertiaryContainer})`).dp(m1, m2);
        labelScrollValueR.ft.setBackground(`bgHex(${colors.secondaryContainer})`).dp(m1, m2);
        labelScrollValueR.ft.setForeground([`hex(${colors.onSecondaryContainer})`]).dp(m1, m2);
        labelScrollValueC.ft.setBackground(`bgHex(${colors.secondaryContainer})`).dp(m1, m2);
        labelScrollValueC.ft.setForeground([`hex(${colors.onSecondaryContainer})`]).dp(m1, m2);
    })));
    labelScrollText.ft.setPadding(0, 1, 0, 1).dp();
});
function createStatusbar(opts) {
    return exports.statusbarFac.create(opts);
}
//# sourceMappingURL=statusbar.js.map