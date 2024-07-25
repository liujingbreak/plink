"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const terminal_canvas_1 = require("../terminal-canvas");
const terminal_text_1 = require("../terminal-text");
// import {createScrollable} from '../terminal-scrollable';
// import {createFlexContainer} from '../terminal-featured-widget';
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
const root = (0, terminal_flex_container_1.createFlexContainer)({ name: 'root', debug: true, log });
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
const label = (0, terminal_text_1.createTextWidget)('8', { debug: true, log });
const border = (0, terminal_border_1.createBorderContainer)(label.asBaseType, { debug: true, log });
root.s.ft.addChild(border.asBaseType.asBaseType).dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
canvas.s.ft.render().dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
    canvas.s.ft.render().dp();
});
setTimeout(() => {
    label.log('HERE WE GO ---> 18');
    label.s.ft.setContent('18').dp();
    canvas.s.ft.render().dp();
    canvas.dispose();
    root.dispose();
}, 1000);
// setTimeout(() => {
//   label.s.ft.setContent('8').dp();
//   canvas.s.ft.render().dp();
// }, 1500);
// setTimeout(() => {
//   label.s.ft.setContent('12').dp();
//   canvas.s.ft.render().dp();
//   canvas.dispose();
//   root.dispose();
// }, 2000);
//# sourceMappingURL=border-sample.js.map