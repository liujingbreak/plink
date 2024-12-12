import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import * as rx from 'rxjs';
// import stripAnsi from 'strip-ansi';
import {SimplexReactor, SingleActionFactory} from '@wfh/reactivizer';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../index';
import {createFlexContainer, createBorderContainer, createTextWidget, MultiLineTextWidget,
  debugLineTrees} from '../index';

const screenWidth = process.argv[2];
const debug = true;

const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);

const canvas = createTerminalCanvas({
  debug: true,
  log,
  debugExcludeTypes: ['addDisplayUnits', 'requestRender', 'onPrintText']
});
canvas.s.ft.autoHideCursor().dp();
const root = createFlexContainer({name: 'root', debug, log});
canvas.s.ft.setRootComponent(root).dp();
canvas.error$.subscribe(([err, label]) => {
  process.stdout.clearScreenDown();
  console.error(label, err);
  fout.write('-----------------\n');
  fout.write(label);
  fout.write('\n');
  fout.write(util.inspect(err));
  fout.close();
  process.exit(0);
});
root.s.ft.justifyContent('center').dp();
root.s.ft.alignItems('center').dp();
root.s.ft.setDirection('col').dp();
const layout1TitleLabel = createTextWidget('Demo dynamically updating text labels in a flex layout');
const titleBorder = createBorderContainer(layout1TitleLabel);
titleBorder.config({name: 'title-border', debug, log});
layout1TitleLabel.config({name: 'title', debug, log});
titleBorder.s.ft.setBorderStyle(['green']).dp();
layout1TitleLabel.s.ft.setStyle(['bold']).dp();
root.s.ft.addChild(titleBorder).dp();

const demoCtn = createFlexContainer({
  name: 'demoCtn',
  debug,
  log
});

demoCtn.s.ft.justifyContent('center').dp();
demoCtn.s.ft.setBorderSpacing(2).dp();
const demoCtnBorder = createBorderContainer(demoCtn, {debug, name: 'demoCtnBorder', log});
demoCtnBorder.s.ft.setBorder('padding').dp();
demoCtnBorder.s.ft.setPadding(1, 1, 1, 1).dp();
demoCtnBorder.s.ft.setBackground('bgHsl(200, 45, 10)').dp();
root.s.ft.addChild(demoCtnBorder).dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
});
canvas.s.ft.setRenderOnRequest(true).dp();
canvas.s.ft.requestRender().dp();

interface SceneActions {
  showLablesLeftToRight(numOfLabels: number): SingleActionFactory;
  doneShowLablesLeftToRight(numOfLabels: number): SingleActionFactory;

  toClock(label: MultiLineTextWidget, labelIndex: number, durationMs: number): SingleActionFactory;
  doneToClock(): SingleActionFactory;
}
const scene = new SimplexReactor<SceneActions>({
  name: 'scene',
  debug,
  log
});
const {r, s} = scene;
r('doneShowLablesLeftToRight -> toClock', s.pt.doneShowLablesLeftToRight.pipe(
  rx.switchMap(() => demoCtn.table.l.allChildren),
  rx.concatMap(r => rx.timer(500).pipe(
    rx.map(() => r)
  )),
  rx.mergeMap(([, labels]) => rx.from(labels).pipe(
    rx.concatMap((label, i) => s.ft.toClock(label as MultiLineTextWidget, i, 5)
      .od(s.pt.doneToClock).pipe(
        rx.take(1)
      )
    ),
    rx.takeLast(1),
    rx.mergeMap(() => canvas.s.pt.render),
    rx.take(1),
    rx.finalize(() => {
      canvas.dispose();
      root.dispose();
    })
  ))
));
r('showLablesLeftToRight', s.pt.showLablesLeftToRight.pipe(
  rx.concatMap(([m, num]) => {
    const hueInterval = Math.round(360 / num);
    return rx.timer(0, 1000).pipe(
      rx.map(i => {
        const text = createTextWidget('This is label ' + (i + 1), {name: 'text-' + i, debug, log});
        text.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp(m);
        demoCtn.s.ft.addChild(text).dp(m);
      }),
      rx.take(num),
      rx.finalize(() => s.ft.doneShowLablesLeftToRight(num).dp(m))
    );
  })
));
r('toClock -> doneToClock', s.pt.toClock.pipe(
  rx.mergeMap(([m, label, i, duration]) => rx.concat(
    rx.timer(16, 1000).pipe(
      rx.map(() => {
        const now = new Date();
        label.s.ft.setContent(`Current time: ${now.toLocaleTimeString()}`).dp(m);
      }),
      rx.take(duration)
    ),
    rx.timer(1000).pipe(
      rx.map(() => {
        label.s.ft.setContent(`This is label ${i + 1}`).dp(m);
        s.ft.doneToClock().dp(m);
      })
    )
  ))
));

canvas.s.pt.render.pipe(
  rx.mergeMap(() => canvas.table.l.internalCache.pipe(
    rx.take(1)
  )),
  rx.map(([, , proLines]) => {
    canvas.log('++ proLines', debugLineTrees(proLines));
  })
).subscribe();

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
