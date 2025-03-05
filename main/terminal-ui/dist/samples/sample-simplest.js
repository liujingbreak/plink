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
const fs_1 = __importDefault(require("fs"));
const rx = __importStar(require("rxjs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const terminal_canvas_1 = require("../core/terminal-canvas");
const text_1 = require("../core/text");
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
log('pid', process.pid);
const canvas = (0, terminal_canvas_1.createTerminalCanvas)({
    debug: true, log
});
const text = (0, text_1.createTextWidget)('hello', { debug: true, log });
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth != null) {
    canvas.ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
}
else {
    canvas.ft.setFullScreenMode().dp();
}
canvas.ft.autoHideCursor().dp();
canvas.ft.setRootComponent(text).dp();
// canvas.ft.setRenderOnRequest(true).dp();
rx.concat(canvas.ft.render().odMono(canvas.pt.onWriteFlushed), canvas.ft.printDescentEnd().odMono(canvas.pt.onPrintDescentEndFlushed), rx.defer(() => {
    canvas.dispose();
    return rx.timer(50);
}).pipe(rx.map(() => {
    process.exit();
}))).subscribe();
//# sourceMappingURL=sample-simplest.js.map