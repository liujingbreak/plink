"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const debug = true;
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
function log(...args) {
    const date = new Date();
    fout.write(date.toLocaleTimeString());
    fout.write('.');
    fout.write(date.getMilliseconds() + ' - ');
    fout.write((0, nodejs_utils_1.formatToConciseNoColor)(...args));
    fout.write('\n');
}
const canvas = (0, index_1.createTerminalCanvas)({ debug: false, log });
const root = (0, index_1.createFlexContainer)({ name: 'root', debug, log });
const border = (0, index_1.createBorderContainer)(root.b.b, { debug, log });
// const scrollable = createScrollable(border.b.b, {debug, log});
root.s.ft.alignItems('center').dp();
root.s.ft.justifyContent('space-between').dp();
root.s.ft.setBorderSeparator(index_1.FlexBorderSeparator.line).dp();
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootComponent(border.b.b).dp();
canvas.error$.subscribe(([err, label]) => {
    process.stdout.clearScreenDown();
    console.error(label, err);
    log('-----------------\n', label, util_1.default.inspect(err));
    process.exit(0);
});
const num = 10;
const hueInterval = Math.round(360 / num);
for (let i = 0; i < num; i++) {
    const label = (0, index_1.createTextWidget)('TEST LABEL ' + i, { name: 'LABEL ' + i, debug: false, log });
    label.s.ft.setStyle([`bgHsl(${hueInterval * i},65,70)`]).dp();
    root.s.ft.addChild(label.asBaseType).dp();
}
canvas.s.ft.setBounding(0, 0, process.stdout.columns, 10).dp();
canvas.s.ft.render().dp();
setTimeout(() => {
    // scrollable.s.ft.scroll(0, 5).dp();
    canvas.s.ft.render().dp();
    canvas.dispose();
    root.dispose();
}, 1000);
//# sourceMappingURL=sample-flex-container.sep.js.map