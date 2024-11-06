import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import * as rx from 'rxjs';
import {SimplexReactor, SingleActionFactory} from '@wfh/reactivizer';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../index';
import {createFlexContainer, createBorderContainer, createTextWidget, MultiLineTextWidget, getBoundingOfCompTree} from '../index';

const screenWidth = process.argv[2];
const debug = true;

const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);

const canvas = createTerminalCanvas({debug, log});
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

  changeStaticLabelToClock(label: MultiLineTextWidget, labelIndex: number, durationMs: number): SingleActionFactory;
  doneChangeStaticLabelToClock(): SingleActionFactory;
}
const scene = new SimplexReactor<SceneActions>({
  name: 'scene',
  debug: true,
  log
});
const {r, s} = scene;
r('doneShowLablesLeftToRight', s.pt.doneShowLablesLeftToRight.pipe(
  rx.switchMap(() => demoCtn.table.l.allChildren.pipe(rx.take(1))),
  rx.mergeMap(([, labels]) => rx.from(labels).pipe(
    rx.map((label, i) => {
      if (i === 0) {
        getBoundingOfCompTree(root).pipe(
          rx.map(rects => {
            scene.log('>>>>>> Bounding boxies', rects.map(r => util.inspect(r)).join());
          }),
          rx.take(1)
        ).subscribe();
      }
      return label;
    }),
    rx.concatMap((label, i) => s.ft.changeStaticLabelToClock(label as MultiLineTextWidget, i, 5)
      .od(s.pt.doneChangeStaticLabelToClock).pipe(
        rx.take(1)
      )
    ),
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
      rx.take(num)
      // rx.finalize(() => s.ft.doneShowLablesLeftToRight(num).dp(m))
    );
  })
));
r('changeStaticLabelToClock -> doneChangeStaticLabelToClock', s.pt.changeStaticLabelToClock.pipe(
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
        s.ft.doneChangeStaticLabelToClock().dp(m);
      })
    )
  ))
));

s.ft.showLablesLeftToRight(5).dp();
