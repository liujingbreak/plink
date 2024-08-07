"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
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
const panel = (0, index_1.createFlexContainer)({ name: 'contentPanel' });
const border = (0, index_1.createBorderContainer)(panel.asBaseType.asBaseType);
const { canvas } = index_1.app.createApp(border.asBaseType.asBaseType, { debug: true, log });
const screenWidth = process.argv[2];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
});
const welcome = (0, index_1.createTextWidget)('Hello...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome.asBaseType).dp();
// panel.s.ft.setBackground('bgGray').dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();
//# sourceMappingURL=sample-app-shell.js.map