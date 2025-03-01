"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const fs_1 = __importDefault(require("fs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const terminal_canvas_1 = require("../core/terminal-canvas");
const text_1 = require("../core/text");
const flex_container_1 = require("../core/flex-container");
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log', { flush: true });
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
const canvas = (0, terminal_canvas_1.createTerminalCanvas)({
    debug: true, log
});
const text = (0, text_1.createTextWidget)('hello', { debug: true, log });
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
const container = (0, flex_container_1.createFlexContainer)({
    debug: true,
    name: 'background',
    log
});
container.s.ft.addChild(text).dp();
container.s.ft.setBackground('bgHex(#303030)').dp();
text.s.ft.setStyle(['hex(#ffd0d0)']).dp();
// text.s.ft.setStyle(['white']).dp();
container.s.ft.justifyContent('center').dp();
container.s.ft.alignItems('center').dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootComponent(container).dp();
canvas.s.ft.setRenderOnRequest(true).dp();
canvas.s.ft.requestRender().dp();
setTimeout(() => {
    canvas.dispose();
    container.dispose();
}, 650);
//# sourceMappingURL=sample-simple-background.js.map