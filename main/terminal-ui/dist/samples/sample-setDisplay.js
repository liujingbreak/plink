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
const fs_1 = __importDefault(require("fs"));
const rx = __importStar(require("rxjs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const debug = true;
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
const panel = (0, index_1.createFlexContainer)({ name: 'contentPanel', debug, log });
const border = (0, index_1.createBorderContainer)(panel.asBaseType.asBaseType, { name: 'contentPanelBorder', debug, log });
const { canvas } = index_1.app.createApp(border.asBaseType.asBaseType, { default: { debug, log } });
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});
const welcome = (0, index_1.createTextWidget)('Hello...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome.asBaseType).dp();
// panel.s.ft.setBackground('bgGray').dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();
const thinLabel = (0, index_1.createTextWidget)('label A', { debug: true, log });
const fatLabel = (0, index_1.createTextWidget)('Label B');
const hiddenLabel = (0, index_1.createTextWidget)('Label C');
border.s.ft.setFlexGrow(1).dp();
panel.s.ft.addChild(hiddenLabel.asBaseType, thinLabel.asBaseType, fatLabel.asBaseType).dp();
rx.timer(1000, 1000).pipe(rx.take(6), rx.map(i => {
    fatLabel.s.ft.setDisplay(i % 2 === 1 ? index_1.DisplayMode.none : index_1.DisplayMode.visible).dp();
    hiddenLabel.s.ft.setDisplay(i % 2 === 1 ? index_1.DisplayMode.hidden : index_1.DisplayMode.visible).dp();
})).subscribe();
canvas.s.ft.render().dp();
//# sourceMappingURL=sample-setDisplay.js.map