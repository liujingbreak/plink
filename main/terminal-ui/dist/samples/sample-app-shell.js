"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const fs_1 = __importDefault(require("fs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const debug = false;
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
const panel = (0, index_1.createFlexContainer)({ name: 'contentPanel', debug, log });
const border = (0, index_1.createBorderContainer)(panel, { name: 'contentPanelBorder', debug: true, log });
const { canvas } = index_1.app.createApp(border, {
    default: { debug, log },
    core: { debug },
    main: {
        debug: true
    },
    elevator: {
        core: { debug, log },
        canvas: { debug: true, log }
    },
    scrollable: {
        core: { debug: true },
        canvas: { debug: true }
    },
    statusbar: {
        debug: true
    },
    // keyService: {
    //   debug: true,
    //   debugIncludeTypes: ['onRawKeyInput']
    // },
    cover: { debug },
    canvas: { debug }
    // focusable: {debug: true}
});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});
setTimeout(() => {
    log('>>>>>>>>>>>>>>>>>>>>>> load data');
    panel.s.ft.removeChild(welcome).dp();
    panel.s.ft.setDirection('col').dp();
    const num = 60;
    const hueInterval = Math.round(360 / num);
    for (let i = 0; i < num; i++) {
        const label = (0, index_1.createTextWidget)('TEST LABEL ~~~~~~~~~~~ ' + i, { name: 'LABEL' + i, debug, log });
        label.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp();
        label.s.ft.setFocusable(true).dp();
        panel.s.ft.addChild(label).dp();
    }
}, 1000);
const welcome = (0, index_1.createTextWidget)('Hello...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();
//# sourceMappingURL=sample-app-shell.js.map