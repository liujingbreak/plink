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
const fs_1 = __importDefault(require("fs"));
const rx = __importStar(require("rxjs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const terminal_canvas_1 = require("../core/terminal-canvas");
const text_1 = require("../core/text");
const flex_container_1 = require("../core/flex-container");
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log', { flush: true });
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, true, fout);
const canvas = (0, terminal_canvas_1.createTerminalCanvas)({
    debug: true, log
});
const text = (0, text_1.createTextWidget)('long sentance', { debug: true, log });
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
const container = (0, flex_container_1.createFlexContainer)({ debug: false, log });
container.ft.addChild(text).dp();
container.ft.justifyContent('center').dp();
container.ft.alignItems('center').dp();
// container.ft.setBackground('bgAnsi256(25)').dp();
canvas.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
canvas.ft.autoHideCursor().dp();
canvas.ft.setRootComponent(container).dp();
canvas.ft.setRenderOnRequest(true).dp();
canvas.ft.requestRender().dp();
rx.concat(rx.timer(1000), rx.merge(text.pt.render.pipe(rx.take(1)), new rx.Observable(sub => {
    text.ft.setContent('short').dp();
    sub.complete();
})).pipe(rx.switchMap(() => new rx.Observable(sub => {
    setImmediate(() => sub.complete());
})), rx.finalize(() => {
    canvas.dispose();
    process.stdout.write('\n');
}))).subscribe();
//# sourceMappingURL=sample-simple-container.js.map