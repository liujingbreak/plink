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
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const index_2 = require("../index");
const screenWidth = process.argv[2];
const debug = true;
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
const canvas = (0, index_1.createTerminalCanvas)({ debug, log });
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
const layoutDemoContainer = (0, index_2.createFlexContainer)({
    name: 'layoutDemo',
    debug,
    log
});
layoutDemoContainer.s.ft.justifyContent('center').dp();
layoutDemoContainer.s.ft.setBorderSpacing(2).dp();
const layoutDemoBorder = (0, index_2.createBorderContainer)(layoutDemoContainer, { debug, name: 'layoutDemoBorder', log });
layoutDemoBorder.s.ft.setBorder('padding').dp();
layoutDemoBorder.s.ft.setPadding(1, 1, 1, 1).dp();
layoutDemoBorder.s.ft.setBackground('bgHsl(200, 45, 10)').dp();
root.s.ft.addChild(layoutDemoBorder).dp();
canvas.s.ft.setRenderOnRequest(true).dp();
canvas.s.ft.requestRender().dp();
const scene = new reactivizer_1.SimplexReactor({
    name: 'scene',
    debug: true,
    log
});
const { r, s } = scene;
r('doneShowLablesLeftToRight', s.pt.doneShowLablesLeftToRight.pipe(rx.switchMap(() => layoutDemoContainer.table.l.allChildren.pipe(rx.take(1))), rx.mergeMap(([, labels]) => rx.from(labels).pipe(rx.map((label, i) => {
    if (i === 0) {
        (0, index_2.getBoundingOfCompTree)(root).pipe(rx.map(rects => {
            scene.log('>>>>>> Bounding boxies', rects.map(r => util_1.default.inspect(r)).join());
        }), rx.take(1)).subscribe();
    }
    return label;
}), rx.concatMap((label, i) => s.ft.changeStaticLabelToClock(label, i, 5)
    .od(s.pt.doneChangeStaticLabelToClock).pipe(rx.take(1))), rx.finalize(() => {
    canvas.dispose();
    root.dispose();
})))));
r('showLablesLeftToRight', s.pt.showLablesLeftToRight.pipe(rx.concatMap(([m, num]) => {
    const hueInterval = Math.round(360 / num);
    return rx.timer(0, 1000).pipe(rx.map(i => {
        const text = (0, index_2.createTextWidget)('This is label ' + (i + 1), { name: 'text-' + i, debug, log });
        text.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp(m);
        layoutDemoContainer.s.ft.addChild(text).dp(m);
    }), rx.take(num), rx.finalize(() => s.ft.doneShowLablesLeftToRight(num).dp(m)));
})));
r('changeStaticLabelToClock -> doneChangeStaticLabelToClock', s.pt.changeStaticLabelToClock.pipe(rx.mergeMap(([m, label, i, duration]) => rx.concat(rx.timer(16, 1000).pipe(rx.map(() => {
    const now = new Date();
    label.s.ft.setContent(`Current time: ${now.toLocaleTimeString()}`).dp(m);
}), rx.take(duration)), rx.timer(1000).pipe(rx.map(() => {
    label.s.ft.setContent(`This is label ${i + 1}`).dp(m);
    s.ft.doneChangeStaticLabelToClock().dp(m);
}))))));
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
});
s.ft.showLablesLeftToRight(5).dp();
//# sourceMappingURL=sample-flex-container.js.map