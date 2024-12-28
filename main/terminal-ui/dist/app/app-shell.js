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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.useAppContext = useAppContext;
const node_readline_1 = __importDefault(require("node:readline"));
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const index_1 = require("../index");
const statusbar_1 = require("./statusbar");
const tableFor = ['onReady'];
const appServiceFac = new reactivizer_1.BaseReactorFactory({
    name: 'App',
    tableFor
}).defineReactor((init, mainComponent, canScroll, opts) => {
    var _a;
    const appService = init(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.core));
    const { r, ft, pt } = appService;
    const basePane = (0, index_1.createFlexContainer)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'basePane' }), opts === null || opts === void 0 ? void 0 : opts.main));
    basePane.ft.setDirection('col').dp();
    const statusbar = (0, statusbar_1.createStatusbar)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'Statusbar' }), opts === null || opts === void 0 ? void 0 : opts.statusbar));
    const keyEventService = (0, index_1.createKeyEventService)(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.keyService));
    let mainContainer = mainComponent;
    if (canScroll) {
        const scrollable = (0, index_1.createScrollable)(mainComponent, Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.scrollable), { default: Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'AppScrollable' }), (_a = opts === null || opts === void 0 ? void 0 : opts.scrollable) === null || _a === void 0 ? void 0 : _a.default) }));
        scrollable.ft.setFlexGrow(1).dp();
        // main.ft.addChild(scrollable, statusbar).dp();
        mainContainer = scrollable;
        statusbar.ft.trackScrollable(scrollable).dp();
    }
    const canvas = (0, index_1.createTerminalCanvas)(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.canvas));
    r('setFullScreen -> onReady', pt.setFullScreenMode.pipe(rx.exhaustMap(([m]) => {
        const blankLines = '\n'.repeat(process.stdout.rows - 1);
        return new rx.Observable(sub => {
            process.stdout.write(blankLines, () => sub.next());
        }).pipe(rx.take(1), rx.switchMap(() => {
            canvas.ft.setBounding(0, 0, process.stdout.columns, process.stdout.rows).dp(m);
            ft.onReady({
                canvas,
                main: basePane,
                app: appService,
                keyEventService,
                statusbar
            }).dp(m);
            return new rx.Observable(sub => {
                const handleResize = () => {
                    canvas.ft.setBounding(0, 0, process.stdout.columns, process.stdout.rows).dp(m);
                };
                process.stdout.on('resize', handleResize);
                return () => {
                    process.stdout.off('resize', handleResize);
                };
            });
        }));
    })));
    r('setSize -> onReady', pt.setSize.pipe(rx.switchMap(([m, w, h]) => {
        const cols = w > process.stdout.columns ? process.stdout.columns : w;
        const rows = h > process.stdout.rows ? process.stdout.rows : h;
        const blankLines = '\n'.repeat(rows - 1);
        return canvas.ft.reportCursor(keyEventService).re(m).od(canvas.pt.doneReportCursor).pipe(rx.take(1), rx.switchMap(([, , top]) => new rx.Observable(s => {
            process.stdout.write(blankLines, () => s.next(top));
        })), rx.map((top) => {
            if (top + rows > process.stdout.rows)
                top = process.stdout.rows - rows;
            canvas.ft.setBounding(0, top, cols, rows).dp(m);
            ft.onReady({
                canvas,
                main: basePane,
                app: appService,
                keyEventService,
                statusbar
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
    }), rx.switchMap(([, left, top, w, h]) => new rx.Observable(sink => {
        node_readline_1.default.cursorTo(process.stdout, left + w - 1, top + h - 1, () => sink.next());
    })), rx.map(() => {
        // process.stdout.write('\n');
        basePane.dispose();
        canvas.dispose();
        keyEventService.dispose();
        setImmediate(() => process.exit());
    })));
    r('onKeypress', keyEventService.pt.onKeypress.pipe(rx.filter(([, evt]) => evt.name === 'return'), rx.exhaustMap(([m]) => {
        appService.log('>>> on help');
        coverLayer.ft.setDisplay(index_1.DisplayMode.visible).dp(m);
        appService.ft.onHelp(coverLayer).dp(m);
        return keyEventService.pt.onBreak.pipe(rx.take(1), rx.map(([m]) => {
            coverLayer.ft.setDisplay(index_1.DisplayMode.none).dp(m);
        }));
    })));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const elevator = (0, index_1.createElevator)(keyEventService, Object.assign({ default: opts === null || opts === void 0 ? void 0 : opts.default }, opts === null || opts === void 0 ? void 0 : opts.elevator));
    const coverLayer = (0, index_1.createFlexContainer)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'coverLayer' }), opts === null || opts === void 0 ? void 0 : opts.cover));
    coverLayer.ft.alignItems('center').dp();
    coverLayer.ft.justifyContent('center').dp();
    // const helpBox = createFlexContainer();
    const helpNote = (0, index_1.createTextWidget)('Keyboard Help');
    const coverLayerBorder = (0, index_1.createBorderContainer)(helpNote, Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default));
    coverLayerBorder.ft.setPadding(5, 5, 5, 5).dp();
    coverLayerBorder.ft.setBackground('bgGrey').dp();
    coverLayerBorder.ft.setBorder('padding').dp();
    coverLayer.ft.addChild(coverLayerBorder).dp();
    mainContainer.ft.setFlexGrow(1).dp();
    elevator.ft.addChild(basePane, coverLayer).dp();
    coverLayer.ft.setDisplay(index_1.DisplayMode.none).dp();
});
function createApp(mainComponent, canScroll = true, opts) {
    return appServiceFac.create(mainComponent, canScroll, opts);
}
function useAppContext(currComp, m) {
    let fac = currComp.ft.queryContext('__appshell');
    if (m)
        fac = fac.re(m);
    return fac.od(currComp.pt.onContextChange).pipe(rx.map(([, , v]) => v));
}
//# sourceMappingURL=app-shell.js.map