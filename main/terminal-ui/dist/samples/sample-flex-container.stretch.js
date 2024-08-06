"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
// import * as rx from 'rxjs';
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const terminal_canvas_1 = require("../terminal-canvas");
const terminal_text_1 = require("../terminal-text");
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
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootComponent(root.asBaseType.asBaseType).dp();
canvas.error$.subscribe(([err, label]) => {
    process.stdout.clearScreenDown();
    console.error(label, err);
    log('-----------------\n', label, util_1.default.inspect(err));
    process.exit(0);
});
const thinLabel = (0, terminal_text_1.createTextWidget)('label A', { debug: true, log });
const fatLabel = (0, terminal_text_1.createTextWidget)('Label B');
const border = (0, terminal_border_1.createBorderContainer)(fatLabel.asBaseType, { debug: true, log });
border.s.ft.setFlexGrow(1).dp();
root.s.ft.addChild(thinLabel.asBaseType, border.asBaseType.asBaseType).dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
    canvas.s.ft.render().dp();
});
canvas.s.ft.render().dp();
canvas.dispose();
root.dispose();
//# sourceMappingURL=sample-flex-container.stretch.js.map