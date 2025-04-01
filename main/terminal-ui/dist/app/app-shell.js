import * as rx from 'rxjs';
import { BaseReactorFactory } from '@wfh/reactivizer';
import { createScrollable, createFlexContainer, createKeyEventService, createTerminalCanvas, createElevator, createTextWidget, createBorderContainer, DisplayMode } from '../index.js';
import { colorThemeFac, CONTEXT_KEY as colorThemeCtxKey, querySchemeForComponent } from './color-theme.js';
import { createStatusbar } from './statusbar.js';
const tableFor = ['onReady'];
const appServiceFac = new BaseReactorFactory({
    name: 'App',
    tableFor
}).defineReactor(({ init, setting: opts }, mainComponent, canScroll) => {
    var _a, _b;
    const appService = init(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.core));
    const { r, ft, pt } = appService;
    const basePane = createFlexContainer(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'main' }), opts === null || opts === void 0 ? void 0 : opts.main));
    basePane.ft.setDirection('col').dp();
    const statusbar = createStatusbar(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'Statusbar' }), opts === null || opts === void 0 ? void 0 : opts.statusbar));
    const keyEventService = createKeyEventService(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.keyService));
    let mainContainer = mainComponent;
    if (canScroll) {
        const scrollable = createScrollable(mainComponent, Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.scrollable), { debug: (_a = opts === null || opts === void 0 ? void 0 : opts.default) === null || _a === void 0 ? void 0 : _a.debug, log: (_b = opts === null || opts === void 0 ? void 0 : opts.default) === null || _b === void 0 ? void 0 : _b.log, name: 'AppScrollable' }));
        scrollable.ft.setFlexGrow(1).dp();
        // main.ft.addChild(scrollable, statusbar).dp();
        mainContainer = scrollable;
        statusbar.ft.trackScrollable(scrollable).dp();
    }
    const canvas = createTerminalCanvas(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.canvas));
    r('setFullScreen -> onReady', pt.setFullScreenMode.pipe(rx.exhaustMap(([m]) => {
        return canvas.ft.setFullScreenMode(keyEventService).re(m).od(canvas.pt.setBounding).pipe(rx.take(1), rx.map(() => {
            ft.onReady({
                canvas,
                main: basePane,
                app: appService,
                keyEventService,
                statusbar,
                colorTheme: colors
            }).dp(m);
        }));
    })));
    r('setSize... -> onReady', pt.setSize.pipe(rx.switchMap(([m, w, h]) => {
        return canvas.ft.setSize(w, h, keyEventService).re(m).od(canvas.pt.setBounding).pipe(rx.take(1), rx.map(() => {
            ft.onReady({
                canvas,
                main: basePane,
                app: appService,
                keyEventService,
                statusbar,
                colorTheme: colors
            }).dp(m);
        }));
    })));
    r('onReady', pt.onReady.pipe(rx.map(([m, ctx]) => {
        canvas.ft.setRenderOnRequest(true).dp(m);
        basePane.ft.addChild(mainContainer, statusbar).dp();
        canvas.ft.setRootComponent(elevator).dp();
        canvas.ft.requestRender().dp(m);
        elevator.ft.provideContext('__appshell', ctx).dp(m);
    })));
    canvas.ft.autoHideCursor().dp();
    statusbar.ft.trackKeypressService(keyEventService).dp();
    r('keyEventService.onExit', keyEventService.pt.onExit.pipe(rx.concatMap(() => rx.timer(32)), rx.exhaustMap(() => {
        appService.ft.onExit().dp();
        return canvas.table.l.setBounding.pipe(rx.take(1));
    }), rx.map(() => {
        basePane.dispose();
        canvas.dispose();
        keyEventService.dispose();
        setImmediate(() => process.exit());
    })));
    r('onKeypress', keyEventService.pt.onKeypress.pipe(rx.filter(([, evt]) => evt.name === 'return'), rx.exhaustMap(([m]) => {
        appService.log('>>> on help');
        coverLayer.ft.setDisplay(DisplayMode.visible).dp(m);
        appService.ft.onHelp(coverLayer).dp(m);
        return keyEventService.pt.onEsc.pipe(rx.take(1), rx.map(([m]) => {
            coverLayer.ft.setDisplay(DisplayMode.none).dp(m);
        }));
    })));
    r('"theming"', querySchemeForComponent(statusbar).pipe(rx.map(([colors, ...m]) => {
        mainContainer.ft.setForeground([`hex(${colors.onSurface})`]).dp(...m);
        mainContainer.ft.setBackground(`bgHex(${colors.surface})`).dp(...m);
    })));
    const colors = colorThemeFac.setting(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.colorTheme)).create();
    basePane.ft.provideContext(colorThemeCtxKey, colors).dp();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const elevator = createElevator(keyEventService, Object.assign({ default: opts === null || opts === void 0 ? void 0 : opts.default }, opts === null || opts === void 0 ? void 0 : opts.elevator));
    const coverLayer = createFlexContainer(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'coverLayer' }), opts === null || opts === void 0 ? void 0 : opts.cover));
    coverLayer.ft.alignItems('center').dp();
    coverLayer.ft.justifyContent('center').dp();
    // const helpBox = createFlexContainer();
    const helpNote = createTextWidget('Keyboard Help');
    const coverLayerBorder = createBorderContainer(helpNote, Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default));
    coverLayerBorder.ft.setPadding(5, 5, 5, 5).dp();
    coverLayerBorder.ft.setBackground('bgGrey').dp();
    coverLayerBorder.ft.setBorder('none').dp();
    coverLayer.ft.addChild(coverLayerBorder).dp();
    coverLayer.ft.setDisplay(DisplayMode.none).dp();
    mainContainer.ft.setFlexGrow(1).dp();
    elevator.ft.addChild(basePane, coverLayer).dp();
});
export function createApp(mainComponent, canScroll = true, opts) {
    return appServiceFac.setting(opts).create(mainComponent, canScroll);
}
export function queryAppContext(currComp, m) {
    let fac = currComp.ft.queryContext('__appshell');
    if (m)
        fac = fac.re(m);
    return fac.od(currComp.pt.onContextChange).pipe(rx.map(([, , v]) => v));
}
//# sourceMappingURL=app-shell.js.map