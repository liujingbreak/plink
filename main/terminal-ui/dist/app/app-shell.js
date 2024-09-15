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
exports.createApp = createApp;
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const index_1 = require("../index");
const focusable_1 = require("../focusable");
const statusbar_1 = require("./statusbar");
function createApp(mainComponent, opts) {
    var _a, _b, _c;
    const appService = new reactivizer_1.SimplexReactor(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: (_b = (_a = opts === null || opts === void 0 ? void 0 : opts.default) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'App' }));
    const root = (0, index_1.createFlexContainer)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'root' }), opts === null || opts === void 0 ? void 0 : opts.root));
    root.s.ft.setDirection('col').dp();
    const statusbar = (0, statusbar_1.createStatusbar)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'Statusbar' }), opts === null || opts === void 0 ? void 0 : opts.statusbar));
    const scrollable = (0, index_1.createScrollable)(mainComponent, Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.scrollable), { default: Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'AppScrollable' }), (_c = opts === null || opts === void 0 ? void 0 : opts.scrollable) === null || _c === void 0 ? void 0 : _c.default) }));
    scrollable.s.ft.setFlexGrow(1).dp();
    root.s.ft.addChild(scrollable.b.b, statusbar.b.b.b).dp();
    const canvas = (0, index_1.createTerminalCanvas)(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.canvas));
    canvas.s.ft.autoHideCursor().dp();
    const keyEventService = (0, index_1.createKeyEventService)(canvas, Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.keyService));
    // keyEventService.config({debug: true});
    keyEventService.s.ft.bindToScrollable(scrollable).dp();
    statusbar.s.ft.trackKeypressService(keyEventService).dp();
    statusbar.s.ft.trackScrollable(scrollable).dp();
    root.r('keyEventService.onExit', keyEventService.s.pt.onExit.pipe(rx.concatMap(() => rx.timer(32)), rx.map(() => {
        root.dispose();
        canvas.dispose();
        keyEventService.dispose();
        process.exit();
    })));
    keyEventService.r('onKeypress', keyEventService.s.pt.onKeypress.pipe(rx.filter(([, evt]) => evt.name === 'return'), rx.exhaustMap(([m]) => {
        coverLayer.s.ft.setDisplay(index_1.DisplayMode.visible).dp(m);
        appService.s.ft.onHelp(coverLayer).dp(m);
        return keyEventService.s.pt.onBreak.pipe(rx.take(1), rx.map(([m]) => {
            coverLayer.s.ft.setDisplay(index_1.DisplayMode.none).dp(m);
        }));
    })));
    const elevator = (0, index_1.createElevator)(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.elevator));
    const coverLayer = (0, index_1.createFlexContainer)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'coverLayer' }), opts === null || opts === void 0 ? void 0 : opts.cover));
    const focusable = (0, focusable_1.createRootService)(keyEventService, Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.focusable));
    focusable.s.ft.forRootComp(elevator.b.b).dp();
    coverLayer.s.ft.alignItems('center').dp();
    coverLayer.s.ft.justifyContent('center').dp();
    // const helpBox = createFlexContainer();
    const helpNote = (0, index_1.createTextWidget)('Keyboard Help');
    const coverLayerBorder = (0, index_1.createBorderContainer)(helpNote.b, Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default));
    coverLayerBorder.s.ft.setPadding(5, 5, 5, 5).dp();
    coverLayerBorder.s.ft.setBackground('bgGrey').dp();
    coverLayerBorder.s.ft.setBorder('padding').dp();
    coverLayer.s.ft.addChild(coverLayerBorder.b.b).dp();
    elevator.s.ft.addChild(root.b.b, coverLayer.b.b).dp();
    coverLayer.s.ft.setDisplay(index_1.DisplayMode.none).dp();
    canvas.s.ft.setRootComponent(elevator.asBaseType.asBaseType).dp();
    canvas.s.ft.setRenderOnRequest(true).dp();
    canvas.s.ft.requestRender().dp();
    return { canvas, root, app: appService };
}
//# sourceMappingURL=app-shell.js.map