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
// import stripAnsi from 'strip-ansi';
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const index_2 = require("../index");
const screenWidth = process.argv[2];
const debug = true;
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
const canvas = (0, index_1.createTerminalCanvas)({
    debug: true,
    log,
    debugExcludeTypes: ['addDisplayUnits', 'requestRender', 'onPrintText']
});
canvas.s.ft.autoHideCursor().dp();
const root = (0, index_2.createFlexContainer)({ name: 'root', debug, log });
canvas.s.ft.setRootComponent(root).dp();
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
root.s.ft.justifyContent('center').dp();
root.s.ft.alignItems('center').dp();
root.s.ft.setDirection('col').dp();
const layout1TitleLabel = (0, index_2.createTextWidget)('Demo dynamically updating text labels in a flex layout');
const titleBorder = (0, index_2.createBorderContainer)(layout1TitleLabel);
titleBorder.config({ name: 'title-border', debug, log });
layout1TitleLabel.config({ name: 'title', debug, log });
titleBorder.s.ft.setBorderStyle(['green']).dp();
layout1TitleLabel.s.ft.setStyle(['bold']).dp();
root.s.ft.addChild(titleBorder).dp();
const demoCtn = (0, index_2.createFlexContainer)({
    name: 'demoCtn',
    debug,
    log
});
demoCtn.s.ft.justifyContent('center').dp();
demoCtn.s.ft.setBorderSpacing(2).dp();
const demoCtnBorder = (0, index_2.createBorderContainer)(demoCtn, { debug, name: 'demoCtnBorder', log });
demoCtnBorder.s.ft.setBorder('none').dp();
demoCtnBorder.s.ft.setPadding(1, 1, 1, 1).dp();
demoCtnBorder.s.ft.setBackground('bgHsl(200, 45, 10)').dp();
root.s.ft.addChild(demoCtnBorder).dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
});
canvas.s.ft.setRenderOnRequest(true).dp();
canvas.s.ft.requestRender().dp();
const scene = new reactivizer_1.SimplexReactor({
    name: 'scene',
    debug,
    log
});
const { r, s } = scene;
r('doneShowLablesLeftToRight -> toClock', s.pt.doneShowLablesLeftToRight.pipe(rx.switchMap(() => demoCtn.table.l.allChildren), rx.concatMap(r => rx.timer(500).pipe(rx.map(() => r))), rx.mergeMap(([, labels]) => rx.from(labels).pipe(rx.concatMap((label, i) => s.ft.toClock(label, i, 5)
    .od(s.pt.doneToClock).pipe(rx.take(1))), rx.takeLast(1), rx.mergeMap(() => canvas.s.pt.render), rx.take(1), rx.finalize(() => {
    canvas.dispose();
    root.dispose();
})))));
r('showLablesLeftToRight', s.pt.showLablesLeftToRight.pipe(rx.concatMap(([m, num]) => {
    const hueInterval = Math.round(360 / num);
    return rx.timer(0, 1000).pipe(rx.map(i => {
        const text = (0, index_2.createTextWidget)('This is label ' + (i + 1), { name: 'text-' + i, debug, log });
        text.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp(m);
        demoCtn.s.ft.addChild(text).dp(m);
    }), rx.take(num), rx.finalize(() => s.ft.doneShowLablesLeftToRight(num).dp(m)));
})));
r('toClock -> doneToClock', s.pt.toClock.pipe(rx.mergeMap(([m, label, i, duration]) => rx.concat(rx.timer(16, 1000).pipe(rx.map(() => {
    const now = new Date();
    label.s.ft.setContent(`Current time: ${now.toLocaleTimeString()}`).dp(m);
}), rx.take(duration)), rx.timer(1000).pipe(rx.map(() => {
    label.s.ft.setContent(`This is label ${i + 1}`).dp(m);
    s.ft.doneToClock().dp(m);
}))))));
canvas.s.pt.render.pipe(rx.mergeMap(() => canvas.table.l.internalCache.pipe(rx.take(1))), rx.map(([, , proLines]) => {
    canvas.log('++ proLines', (0, index_2.debugLineTrees)(proLines));
})).subscribe();
// canvas.s.pt.addDisplayUnits.pipe(
//   rx.map(([, x, y, units]) => {
//     canvas.log('++ addDisplayUnits', x, y, treeNodeToStyleText([units]));
//   })
// ).subscribe();
// canvas.s.pt.onPrintText.pipe(
//   rx.map(([, x, y, text]) => {
//     canvas.log('++ onPrintText', x, y, stripAnsi(text));
//   })
// ).subscribe();
s.ft.showLablesLeftToRight(3).dp();
//# sourceMappingURL=sample-flex-container.js.map