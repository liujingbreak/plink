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
const index_2 = require("../index");
// import {createScrollable} from '../index';
// import {createFlexContainer} from '../index';
const index_3 = require("../index");
const index_4 = require("../index");
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
const canvas = (0, index_1.createTerminalCanvas)({ debug: true, log });
const root = (0, index_3.createFlexContainer)({ name: 'root', debug: true, log });
canvas.s.ft.setRootComponent(root.asBaseType.asBaseType).dp();
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
const label = (0, index_2.createTextWidget)('8', { debug: true, log });
const border = (0, index_4.createBorderContainer)(label.asBaseType, { debug: true, log });
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