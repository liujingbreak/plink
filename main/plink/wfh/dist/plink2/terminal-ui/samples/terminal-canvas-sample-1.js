"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("source-map-support/register");
const util_1 = tslib_1.__importDefault(require("util"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const reactivizer_1 = require("@wfh/reactivizer");
const terminal_canvas_1 = require("../terminal-canvas");
const terminal_text_1 = require("../terminal-text");
const terminal_featured_widget_1 = require("../terminal-featured-widget");
const index_1 = require("../index");
const screenWidth = process.argv[2];
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
const canvas = (0, terminal_canvas_1.createTerminalCanvas)();
canvas.config({ debug: true, log });
const root = (0, terminal_featured_widget_1.createListContainer)({ name: 'root', debug: true, log });
canvas.s.ft.setRootWidget(root).dp();
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
const layout1TitleLabel = (0, terminal_text_1.createTextWidget)('Demo dynamically updating text labels in a flex layout');
const titleBorder = (0, index_1.createBorderContainer)(layout1TitleLabel);
titleBorder.config({ name: 'title-border', debug: true, log });
layout1TitleLabel.config({ name: 'title', debug: true, log });
titleBorder.s.ft.setBorderStyle(['green']).dp();
layout1TitleLabel.s.ft.setStyle(['bold']).dp();
root.s.ft.addChild(titleBorder).dp();
const layoutDemoContainer = (0, terminal_featured_widget_1.createListContainer)({
    name: 'layoutDemo',
    debug: true,
    log
});
layoutDemoContainer.s.ft.justifyContent('center').dp();
layoutDemoContainer.s.ft.setBorderSpacing(2).dp();
const layoutDemoBorder = (0, index_1.createBorderContainer)(layoutDemoContainer);
layoutDemoBorder.s.ft.setBorder('padding').dp();
layoutDemoBorder.s.ft.setPadding(1, 1, 1, 1).dp();
layoutDemoBorder.s.ft.setBackground('bgHsl(200, 45, 10)').dp();
layoutDemoContainer.s.ft.setBackground('bgHsl(200, 45, 10)').dp();
root.s.ft.addChild(layoutDemoBorder).dp();
const scene = new reactivizer_1.SimplexReactor({
    name: 'scene',
    debug: true,
    log
});
const { r, s } = scene;
r('doneShowLablesLeftToRight', s.pt.doneShowLablesLeftToRight.pipe(rx.switchMap(() => layoutDemoContainer.table.l.allChildren.pipe(rx.take(1))), rx.mergeMap(([, labels]) => rx.from(labels).pipe(rx.concatMap((label, i) => s.ft.changeStaticLabelToClock(label, i, 5)
    .od(s.pt.doneChangeStaticLabelToClock).pipe(rx.take(1))), rx.finalize(() => {
    canvas.dispose();
    root.dispose();
})))));
r('showLablesLeftToRight', s.pt.showLablesLeftToRight.pipe(rx.concatMap(([m, num]) => {
    const hueInterval = Math.round(360 / num);
    return rx.timer(0, 1000).pipe(rx.map(i => {
        const text = (0, terminal_text_1.createTextWidget)();
        text.config({ debug: true, log, name: 'text-' + i });
        text.s.ft.setContent('This is label ' + (i + 1)).dp(m);
        text.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp(m);
        layoutDemoContainer.s.ft.addChild(text).dp(m);
        canvas.s.ft.render().dp(m);
    }), rx.take(num), rx.finalize(() => s.ft.doneShowLablesLeftToRight(num).dp(m)));
})));
r('changeStaticLabelToClock -> doneChangeStaticLabelToClock', s.pt.changeStaticLabelToClock.pipe(rx.mergeMap(([m, label, i, duration]) => rx.concat(rx.timer(16, 1000).pipe(rx.map(() => {
    const now = new Date();
    label.s.ft.setContent(`Current time: ${now.toLocaleTimeString()}`).dp(m);
    canvas.s.ft.render().dp(m);
}), rx.take(duration)), rx.timer(1000).pipe(rx.map(() => {
    label.s.ft.setContent(`This is label ${i + 1}`).dp(m);
    canvas.s.ft.render().dp(m);
    s.ft.doneChangeStaticLabelToClock().dp(m);
}))))));
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
// canvas.s.ft.render().dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
    canvas.s.ft.render().dp();
});
s.ft.showLablesLeftToRight(5).dp();
// const [children] = root.table.getData().allChildren;
// const timerLabel = children![children!.length - 1];
// rx.timer(1000, 1000).pipe(
//   rx.map(() => {
//     const date = new Date();
//     (timerLabel as MultiLineTextWidget).s.ft.setContent(`Current time: ${date.toLocaleTimeString()}`).dp();
//     canvas.s.ft.render().dp();
//   }),
//   rx.take(20)
// ).subscribe();
//# sourceMappingURL=terminal-canvas-sample-1.js.map