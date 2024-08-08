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
function log(...args) {
    const date = new Date();
    fout.write(date.toLocaleTimeString());
    fout.write('.');
    fout.write(date.getMilliseconds() + ' - ');
    fout.write((0, nodejs_utils_1.formatToConciseNoColor)(...args));
    fout.write('\n');
}
const canvas = (0, index_1.createTerminalCanvas)({ debug, log });
const root = (0, index_1.createFlexContainer)({ name: 'root', debug, log });
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRenderOnRequest(true).dp();
const ev = (0, index_1.createElevator)({ debug, log });
const popupLayer = (0, index_1.createFlexContainer)({ name: 'popup', debug, log });
ev.s.ft.addChild(root.asBaseType.asBaseType, popupLayer.asBaseType.asBaseType).dp();
const popupMsg = (0, index_1.createTextWidget)('POPUP MESSAGE', { name: 'popupMsg', debug, log });
popupLayer.s.ft.justifyContent('center').dp();
popupLayer.s.ft.alignItems('center').dp();
popupLayer.s.ft.addChild(popupMsg.b).dp();
canvas.s.ft.setRootComponent(ev.b.b).dp();
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
const label = (0, index_1.createTextWidget)('ok', { debug, log });
root.s.ft.addChild(label.b).dp();
canvas.s.ft.requestRender().dp();
setTimeout(() => {
    popupLayer.s.ft.setDisplay(index_1.DisplayMode.none).dp();
}, 1000);
setTimeout(() => {
    popupLayer.s.ft.setDisplay(index_1.DisplayMode.visible).dp();
}, 2000);
//# sourceMappingURL=sample-elevator.js.map