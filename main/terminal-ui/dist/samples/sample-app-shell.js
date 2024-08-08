"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
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
const { canvas } = index_1.app.createApp(border.asBaseType.asBaseType, { debug, log });
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});
setTimeout(() => {
    panel.s.ft.removeChild(welcome.asBaseType).dp();
    panel.s.ft.setDirection('col').dp();
    const num = 40;
    const hueInterval = Math.round(360 / num);
    for (let i = 0; i < 40; i++) {
        const label = (0, index_1.createTextWidget)('TEST LABEL ' + i, { name: 'LABEL ' + i, debug, log });
        label.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp();
        panel.s.ft.addChild(label.asBaseType).dp();
    }
}, 1000);
const welcome = (0, index_1.createTextWidget)('Hello...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome.asBaseType).dp();
// panel.s.ft.setBackground('bgGray').dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();
//# sourceMappingURL=sample-app-shell.js.map