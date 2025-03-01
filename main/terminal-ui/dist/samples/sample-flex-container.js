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
const rbush_1 = require("../core/rbush");
const screenWidth = process.argv[2];
const debug = false;
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
rbush_1.waitForImport$.subscribe(() => {
    const canvas = (0, index_1.createTerminalCanvas)({
        debug,
        log,
        debugExcludeTypes: ['addDisplayUnits', 'onPrintText']
    });
    canvas.ft.autoHideCursor().dp();
    const root = (0, index_2.createFlexContainer)({ name: 'root', debug, log });
    canvas.ft.setRootComponent(root).dp();
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
    root.ft.justifyContent('center').dp();
    root.ft.alignItems('center').dp();
    root.ft.setDirection('col').dp();
    const layout1TitleLabel = (0, index_2.createTextWidget)('Demo dynamically updating text labels in a flex layout');
    const titleBorder = (0, index_2.createBorderContainer)(layout1TitleLabel, { name: 'title-border', debug: false, log });
    layout1TitleLabel.config({ name: 'title', debug: false, log });
    titleBorder.ft.setBorderStyle(['green']).dp();
    layout1TitleLabel.ft.setStyle(['bold']).dp();
    root.ft.addChild(titleBorder).dp();
    const demoCtn = (0, index_2.createFlexContainer)({
        name: 'demoCtn',
        debug: true,
        log
    });
    demoCtn.ft.justifyContent('center').dp();
    demoCtn.ft.setBorderSpacing(2).dp();
    const demoCtnBorder = (0, index_2.createBorderContainer)(demoCtn, { debug, name: 'demoCtnBorder', log });
    demoCtnBorder.ft.setBorder('none').dp();
    demoCtnBorder.ft.setPadding(1, 1, 1, 1).dp();
    demoCtnBorder.ft.setBackground('bgHsl(200, 45, 10)').dp();
    root.ft.addChild(demoCtnBorder).dp();
    canvas.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
    process.stdout.on('resize', () => {
        canvas.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
    });
    canvas.ft.setRenderOnRequest(true).dp();
    canvas.ft.requestRender().dp();
    const scene = new reactivizer_1.SimplexReactor({
        name: 'scene',
        debug: true,
        log
    });
    const { r, ft, pt } = scene;
    r('doneShowLablesLeftToRight -> toClock', pt.doneShowLablesLeftToRight.pipe(rx.switchMap(() => demoCtn.table.l.allChildren), rx.concatMap(r => rx.timer(500).pipe(rx.map(() => r))), rx.mergeMap(([, labels]) => rx.from(labels).pipe(rx.concatMap((label, i) => ft.toClock(label, i, 5)
        .od(pt.doneToClock).pipe(rx.take(1)))
    // rx.takeLast(1),
    // rx.mergeMap(() => canvas.pt.render),
    // rx.take(1),
    // rx.finalize(() => {
    //   canvas.dispose();
    //   root.dispose();
    // })
    ))));
    r('showLablesLeftToRight', pt.showLablesLeftToRight.pipe(rx.concatMap(([m, num]) => {
        const hueInterval = Math.round(360 / num);
        return rx.timer(0, 1000).pipe(rx.map(i => {
            const text = (0, index_2.createTextWidget)('This is label ' + (i + 1), { name: 'text-' + i, debug: true, log });
            text.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp(m);
            demoCtn.ft.addChild(text).dp(m);
        }), rx.take(num), rx.finalize(() => ft.doneShowLablesLeftToRight(num).dp(m)));
    })));
    r('toClock -> doneToClock', pt.toClock.pipe(rx.mergeMap(([m, label, i, duration]) => rx.concat(rx.timer(16, 1000).pipe(rx.map(() => {
        const now = new Date();
        label.ft.setContent(`Current time: ${now.toLocaleTimeString()}`).dp(m);
    }), rx.take(duration)), rx.timer(1000).pipe(rx.map(() => {
        label.ft.setContent(`This is label ${i + 1}`).dp(m);
        ft.doneToClock().dp(m);
    }))))));
    // canvas.pt.render.pipe(
    //   rx.mergeMap(() => canvas.table.l.internalCache.pipe(
    //     rx.take(1)
    //   )),
    //   rx.map(([, , proLines]) => {
    //     canvas.log('++ proLines', debugLineTrees(proLines));
    //   })
    // ).subscribe();
    ft.showLablesLeftToRight(3).dp();
});
//# sourceMappingURL=sample-flex-container.js.map