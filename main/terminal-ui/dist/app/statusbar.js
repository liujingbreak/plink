import * as rx from 'rxjs';
import { borderFac, createFlexContainer, DisplayMode, createTextWidget, querySchemeForComponent } from '../index.js';
import { textFac } from '../hoc/text.js';
const tableFor = [
    'trackKeypressService', 'trackScrollable', 'setMessage',
    'setBgOnSurfaceColor', 'setBgSurfaceColor'
];
export const statusbarFac = borderFac.forExtend({
    name: 'statusbar',
    tableFor
}).defineReactor(({ init, setting: opts }) => {
    var _a, _b, _c, _d, _e, _f;
    const container = createFlexContainer(Object.assign(Object.assign({}, opts), { name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : 'statusbar') + '.container' }));
    const statusbar = init(Object.assign(Object.assign({}, opts), { name: ((_b = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _b !== void 0 ? _b : 'statusbar') + '.border' }), container);
    statusbar.ft.setPadding(0, 0, 0, 1).dp();
    statusbar.ft.setBorder('none').dp();
    statusbar.ft.setFlexShrink(0).dp();
    const { r, pt, ft, latest } = statusbar;
    const labelScrollText = textFac.setting({
        // ...opts as any,
        name: ((_c = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _c !== void 0 ? _c : 'statusbar') + '.label'
    }).create('scroll');
    const labelScrollValueR = textFac.setting({
        name: ((_d = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _d !== void 0 ? _d : 'statusbar') + '.v1'
    }).create('0%');
    const labelScrollValueC = textFac.setting({
        name: ((_e = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _e !== void 0 ? _e : 'statusbar') + '.v2'
    }).create('0%');
    const HELP_KEY_HINT = 'Press <Enter> for help';
    const labelKeypress = createTextWidget(HELP_KEY_HINT, Object.assign(Object.assign({}, opts), { name: ((_f = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _f !== void 0 ? _f : 'statusbar') + '.key' }));
    const customizedMsg = createTextWidget('', {
        name: statusbar.s.logPrefix + '.msg', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log
    });
    customizedMsg.ft.setFlexGrow(1).dp();
    container.ft.setBorderSpacing(0).dp();
    container.ft.addChild(labelKeypress, customizedMsg, labelScrollText, labelScrollValueR, labelScrollValueC).dp();
    r('trackScrollable, scrollable.onValidScroll -> onScrollStatus', latest.trackScrollable.pipe(rx.switchMap(([, scrollable]) => {
        return rx.combineLatest([
            scrollable.latest.onValidScroll,
            scrollable.latest.onViewPortSize,
            scrollable.latest.onContent.pipe(rx.switchMap(([, comp]) => comp.latest.onSize.pipe(rx.distinctUntilChanged(([, aW, aH], [, bW, bH]) => aW === bW && aH === bH))))
        ]).pipe(rx.map(([[m1, sLeft, sTop], [m2, sWidth, sHeight], [m3, cWidth, cHeight]]) => {
            const scrollSpaceY = cHeight - sHeight;
            const vertRatio = scrollSpaceY < Number.EPSILON ? null : 1 - (scrollSpaceY - sTop) / scrollSpaceY;
            const scrollSpaceX = cWidth - sWidth;
            scrollable.log('-- scrollSpaceX', scrollSpaceX, 'sLeft', sLeft);
            const horizRatio = scrollSpaceX < Number.EPSILON ? null : 1 - (scrollSpaceX - sLeft) / scrollSpaceX;
            ft.onScrollStatus(vertRatio != null ? vertRatio < Number.EPSILON ? 0 : vertRatio : null, horizRatio != null ? horizRatio < Number.EPSILON ? 0 : horizRatio : null).dp(m1, m2, m3);
        }));
    })));
    r('trackScrollable, scrollable.isScrollNeeded -> "labelScrollText"', latest.trackScrollable.pipe(rx.switchMap(([, scrollable]) => scrollable.latest.isScrollNeeded.pipe(rx.distinctUntilChanged(([, need0], [, need1]) => need0 === need1), rx.map(([m, need]) => {
        labelScrollText.ft.setDisplay(need ? DisplayMode.visible : DisplayMode.none).dp(m);
    })))));
    r('trackKeypressService, keyEventServcie.onDisplayKeys, keyEventServcie.onInputCompleted -> onKeypressStatus', latest.trackKeypressService.pipe(rx.switchMap(([, keypress]) => {
        return rx.merge(keypress.latest.onDisplayKeys.pipe(rx.map(([m, text, , isValid]) => {
            ft.onKeypressStatus(text, isValid).dp(m);
        })), keypress.pt.onExit.pipe(rx.map(([m]) => {
            ft.onKeypressStatus('Bye', true).dp(m);
        })));
    })));
    r('onScrollStatus', pt.onScrollStatus.pipe(rx.map(([m, v, h]) => {
        labelScrollValueR.ft.setContent(v != null ? ' row: ' + Math.floor(v * 100) + '% ' : '').dp(m);
        labelScrollValueC.ft.setContent(h != null ? ' col: ' + Math.floor(h * 100) + '% ' : '').dp(m);
    })));
    const colors$ = querySchemeForComponent(statusbar);
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
export function createStatusbar(opts) {
    return statusbarFac.setting(opts).create();
}
//# sourceMappingURL=statusbar.js.map