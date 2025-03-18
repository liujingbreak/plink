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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const rx = __importStar(require("rxjs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const index_2 = require("../index");
const index_3 = require("../index");
const index_4 = require("../index");
const index_5 = require("../index");
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
const debug = true;
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
const canvas = (0, index_1.createTerminalCanvas)({ debug: true, log });
canvas.ft.autoHideCursor().dp();
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
const label = (0, index_2.createTextWidget)('Hello border container', { debug: true, log });
const border = (0, index_3.createBorderContainer)(label, { debug, log });
const scrollable = (0, index_4.createScrollable)(border, { debug: true, log });
scrollable.ft.setScrollable(false, true).dp();
canvas.ft.setRootComponent(scrollable).dp();
canvas.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows - 1).dp();
const keyEventService = (0, index_5.createKeyEventService)({ debug, log });
keyEventService.ft.bindToScrollable(scrollable).dp();
keyEventService.r('keyEventService.onExit', keyEventService.pt.onExit.pipe(rx.map(() => {
    canvas.dispose();
    scrollable.dispose();
    process.nextTick(() => {
        process.exit();
    });
})));
process.stdout.on('resize', () => {
    canvas.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
});
canvas.ft.setRenderOnRequest(true).dp();
canvas.ft.requestRender().dp();
setTimeout(() => {
    const c = `To embrace Monorepo and Multiple-repo at same time.
Web (or Node.js) frameworks or libraries like Angular, React, Vue, NestJS, they all come up with command line tools which help developer to initialize web projects, most of them are like scaffolding tool. Most of the tools are limited at or totally not supporting monorepo/library authoring. Which brings a lot room for enterprise developer to improve for sharing and maintaining resuable modules or functions cross multiple projects.
We want to offer similar experience of developing Web appliactions like authoring Chrome extension for a Chrome browser, composing extension for Visual studio code. Easy to extend under certain standards.
We want our appliactions be able to share fundations of UI, state management, server side functions and tools while different application goes separate CI/CD process like microservice.`;
    label.ft.setContent(c).dp();
    canvas.log('================== sample rerender for new size');
}, 1000);
//# sourceMappingURL=sample-scrollable.js.map