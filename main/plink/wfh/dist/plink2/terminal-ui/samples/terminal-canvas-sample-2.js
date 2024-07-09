"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("source-map-support/register");
const util_1 = tslib_1.__importDefault(require("util"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const terminal_canvas_1 = require("../terminal-canvas");
const terminal_text_1 = require("../terminal-text");
// import {createListContainer} from '../terminal-featured-widget';
const terminal_featured_widget_1 = require("../terminal-featured-widget");
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
const canvas = (0, terminal_canvas_1.createTerminalCanvas)();
canvas.config({ debug: true, log });
const root = (0, terminal_featured_widget_1.createListContainer)({ name: 'root', debug: true, log });
canvas.s.ft.setRootWidget(root).dp();
canvas.error$.subscribe(([err, label]) => {
    process.stdout.clearScreenDown();
    console.error(label, err);
    fout.write('-----------------\n');
    fout.write(label);
    fout.write('\n');
    fout.write(util_1.default.inspect(err));
    fout.close();
    process.exit(0);
});
root.s.ft.justifyContent('center').dp();
root.s.ft.alignItems('center').dp();
const label = (0, terminal_text_1.createTextWidget)('Hello border container');
label.config({ debug: true, log });
const border = (0, terminal_featured_widget_1.createBorderContainer)(label);
border.config({ debug: true, log });
root.s.ft.addChild(border).dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
canvas.s.ft.render().dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
    canvas.s.ft.render().dp();
});
setTimeout(() => {
    label.s.ft.setContent('ok'.repeat(20)).dp();
    canvas.s.ft.render().dp();
}, 1000);
setTimeout(() => {
    label.s.ft.setContent('long sentence').dp();
    canvas.s.ft.render().dp();
    canvas.dispose();
    root.dispose();
}, 2000);
//# sourceMappingURL=terminal-canvas-sample-2.js.map