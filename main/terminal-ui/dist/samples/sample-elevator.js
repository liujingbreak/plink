"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const fs_1 = __importDefault(require("fs"));
// import * as rx from 'rxjs';
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const debug = true;
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
const canvas = (0, index_1.createTerminalCanvas)({ debug, log });
const root = (0, index_1.createFlexContainer)({ name: 'root', debug, log });
canvas.s.ft.autoHideCursor().dp();
const ev = (0, index_1.createElevator)({ default: { debug, log } });
const popupLayer = (0, index_1.createFlexContainer)({ name: 'popup', debug, log });
ev.s.ft.addChild(root, popupLayer).dp();
const popupMsg = (0, index_1.createTextWidget)('<POPUP MESSAGE>', { name: 'popupMsg', debug, log });
popupLayer.s.ft.justifyContent('center').dp();
popupLayer.s.ft.alignItems('center').dp();
popupLayer.s.ft.addChild(popupMsg).dp();
canvas.s.ft.setRootComponent(ev).dp();
canvas.error$.subscribe(([err, label]) => {
    process.stdout.clearScreenDown();
    console.error(label, err);
    process.exit(0);
});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});
root.s.ft.justifyContent('center').dp();
root.s.ft.alignItems('center').dp();
const label = (0, index_1.createTextWidget)('~~~ The bottom layer ~~~', { debug, log });
root.s.ft.addChild(label).dp();
canvas.s.ft.setRenderOnRequest(true).dp();
canvas.s.ft.requestRender().dp();
setTimeout(() => {
    popupLayer.log('--------------- change display ----');
    popupMsg.s.ft.setContent('xx').dp();
}, 1000);
setTimeout(() => {
    popupLayer.s.ft.setDisplay(index_1.DisplayMode.none).dp();
    label.s.ft.setContent('bottom layer').dp();
}, 3000);
//# sourceMappingURL=sample-elevator.js.map