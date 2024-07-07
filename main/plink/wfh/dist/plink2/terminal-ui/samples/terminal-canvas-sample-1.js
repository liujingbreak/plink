"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const terminal_canvas_1 = require("../terminal-canvas");
const terminal_text_1 = require("../terminal-text");
const terminal_featured_widget_1 = require("../terminal-featured-widget");
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
function log(...args) {
    const date = new Date();
    fout.write(date.toLocaleTimeString());
    fout.write('.');
    fout.write(date.getMilliseconds() + ' - ');
    fout.write((0, nodejs_utils_1.formatToConciseNoColor)(...args));
    fout.write('\n');
}
const canvas = (0, terminal_canvas_1.createTerminalCanvas)();
canvas.config({ debug: true, log });
// canvas.s.ft.setAlwaysRerenderAll(true).dp();
const root = (0, terminal_featured_widget_1.createListContainer)({ debug: true, log });
canvas.s.ft.setRootWidget(root).dp();
root.s.ft.justifyContent('end').dp();
for (let i = 0; i < 2; i++) {
    const text = (0, terminal_text_1.createTextWidget)();
    text.config({ debug: true, log, name: 'text-' + i });
    text.s.ft.setContent('This is label ' + i).dp();
    text.s.ft.setStyle([i % 2 === 0 ? 'bgCyan' : 'bgMagenta', 'black']).dp();
    root.s.ft.addChild(text).dp();
}
const size = process.stdout.getWindowSize();
canvas.s.ft.setClientWindowSize(...size).dp();
canvas.s.ft.render().dp();
const [children] = root.table.getData().allChildren;
const timerLabel = children[children.length - 1];
rx.timer(1000, 1000).pipe(rx.map(() => {
    const date = new Date();
    timerLabel.s.ft.setContent(`Current time: ${date.toLocaleTimeString()}.${date.getMilliseconds()}`).dp();
    canvas.s.ft.render().dp();
}), rx.take(20)).subscribe();
//# sourceMappingURL=terminal-canvas-sample-1.js.map