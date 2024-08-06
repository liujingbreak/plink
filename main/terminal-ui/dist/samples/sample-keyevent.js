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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const rx = __importStar(require("rxjs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const terminal_canvas_1 = require("../terminal-canvas");
const terminal_text_1 = require("../terminal-text");
const terminal_keyEvent_1 = require("../terminal-keyEvent");
const terminal_flex_container_1 = require("../terminal-flex-container");
const terminal_border_1 = require("../terminal-border");
const screenWidth = process.argv[2];
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
function log(...args) {
    const date = new Date();
    fout.write(date.toLocaleTimeString());
    // console.log(formatToConciseNoColor(...args));
    fout.write('.');
    fout.write(date.getMilliseconds() + ' - ');
    fout.write((0, nodejs_utils_1.formatToConciseNoColor)(...args));
    fout.write('\n');
}
const canvas = (0, terminal_canvas_1.createTerminalCanvas)({ debug: true, log });
const root = (0, terminal_flex_container_1.createFlexContainer)({ name: 'root', debug: false, log });
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootWidget(root).dp();
canvas.error$.subscribe(([err, label]) => {
    process.stdout.clearScreenDown();
    console.error(label, err);
    log('-----------------\n', label, util_1.default.inspect(err));
    process.exit(0);
});
root.s.ft.setDirection('col').dp();
root.s.ft.justifyContent('center').dp();
root.s.ft.alignItems('center').dp();
const label = (0, terminal_text_1.createTextWidget)('What you have typed', { name: 'label.1', debug: false, log });
const labelRecognized = (0, terminal_text_1.createTextWidget)('What system understands', { name: 'label.2', debug: true, log });
const border = (0, terminal_border_1.createBorderContainer)(label.asBaseType, { debug: true, log });
root.s.ft.addChild(border.asBaseType.asBaseType, labelRecognized.asBaseType).dp();
// root.s.ft.setBackground('bgGreen').dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
    canvas.s.ft.render().dp();
});
const keyService = (0, terminal_keyEvent_1.createKeyEventService)(canvas, { log, debug: true, debugExcludeTypes: [] });
const { r, s, table } = keyService;
canvas.s.ft.render().dp();
canvas.s.ft.reportCursor(keyService).od(canvas.s.pt.doneReportCursor).pipe(rx.take(1)).subscribe(([m, x, y]) => {
    labelRecognized.s.ft.setContent(`Current cursor position: ${x},${y}`).dp(m);
    canvas.s.ft.render().dp();
});
r('onExit', s.pt.onExit.pipe(rx.mergeMap(() => {
    return canvas.s.ft.reportCursor(keyService).od(canvas.s.pt.doneReportCursor).pipe(rx.take(1), rx.exhaustMap(([m, x, y]) => {
        labelRecognized.s.ft.setContent(`Current cursor position: ${x},${y}`).dp(m);
        canvas.s.ft.render().dp();
        return rx.timer(1000);
    }), rx.map(() => {
        keyService.dispose();
        canvas.dispose();
        root.dispose();
        process.nextTick(() => process.exit());
    }));
})));
r('onDisplayKeys', table.l.onDisplayKeys.pipe(
// rx.distinctUntilChanged(([, a], [, b]) => a === b),
rx.map(([m, text, completed, valid]) => {
    label.s.ft.setContent(text).dp(m);
    label.s.ft.setStyle(completed && valid ? ['green'] : []).dp(m);
    canvas.s.ft.render().dp(m);
})));
r('onLeft, onRight, onUp, onDown', rx.merge(s.pt.onLeft.pipe(rx.tap(([, times]) => labelRecognized.s.ft.setContent(times + ' left').dp())), s.pt.onRight.pipe(rx.tap(([, times]) => labelRecognized.s.ft.setContent(times + ' right').dp())), s.pt.onUp.pipe(rx.tap(([, times]) => labelRecognized.s.ft.setContent(times + ' up').dp())), s.pt.onDown.pipe(rx.tap(([, times]) => labelRecognized.s.ft.setContent(times + ' down').dp())), s.pt.doneConsumeMultiKeyAction.pipe(rx.filter(([, act]) => act != null), rx.tap(([m, act]) => labelRecognized.s.ft.setContent(act).dp(m)))).pipe(rx.map(([m]) => {
    canvas.s.ft.render().dp(m);
})));
//# sourceMappingURL=sample-keyevent.js.map