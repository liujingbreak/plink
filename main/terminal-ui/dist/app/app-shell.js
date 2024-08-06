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
const index_1 = require("../index");
const statusbar_1 = require("./statusbar");
function createApp(mainComponent, opts) {
    const root = (0, index_1.createFlexContainer)(Object.assign({ name: 'AppShell' }, opts));
    root.s.ft.setDirection('col').dp();
    mainComponent.s.ft.setFlexGrow(1).dp();
    const statusbar = (0, statusbar_1.createStatusbar)(opts);
    const scrollable = (0, index_1.createScrollable)(mainComponent, opts);
    root.s.ft.addChild(scrollable.asBaseType.asBaseType, statusbar.asBaseType.asBaseType.asBaseType).dp();
    const canvas = (0, index_1.createTerminalCanvas)(opts);
    canvas.s.ft.autoHideCursor().dp();
    canvas.s.ft.setRootComponent(root.asBaseType.asBaseType).dp();
    const keyEventService = (0, index_1.createKeyEventService)(canvas, opts);
    keyEventService.s.ft.bindToScrollable(scrollable).dp();
    statusbar.s.ft.trackKeypressService(keyEventService).dp();
    statusbar.s.ft.trackScrollable(scrollable).dp();
    root.r('keyEventService.onExit', keyEventService.s.pt.onExit.pipe(rx.concatMap(() => rx.timer(32)), rx.map(() => {
        root.dispose();
        canvas.dispose();
        keyEventService.dispose();
        process.exit();
    })));
    canvas.s.ft.setRenderOnRequest(true).dp();
    canvas.s.ft.requestRender().dp();
    return { canvas, root };
}
//# sourceMappingURL=app-shell.js.map