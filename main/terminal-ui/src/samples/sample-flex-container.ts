import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import * as rx from 'rxjs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {SimplexReactor, SingleActionFactory} from '@wfh/reactivizer';
import {createTerminalCanvas} from '../terminal-canvas';
import {createTextWidget, MultiLineTextWidget} from '../terminal-text';
import {createFlexContainer, createBorderContainer} from '../index';

const screenWidth = process.argv[2];

const fout = fs.createWriteStream('terminal-canvas-sample.log');
function log(...args: any[]) {
  const date = new Date();
  fout.write(date.toLocaleTimeString());
  // console.log(formatToConciseNoColor(...args));
  fout.write('.');
  fout.write(date.getMilliseconds() + ' - ');
  fout.write(formatToConciseNoColor(...args));
  fout.write('\n');
}

const canvas = createTerminalCanvas({debug: true, log});
canvas.s.ft.autoHideCursor().dp();
const root = createFlexContainer({name: 'root', debug: true, log});
canvas.s.ft.setRootComponent(root.asBaseType.asBaseType).dp();
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
const titleBorder = createBorderContainer(layout1TitleLabel.asBaseType);
titleBorder.config({name: 'title-border', debug: true, log});
layout1TitleLabel.config({name: 'title', debug: true, log});
titleBorder.s.ft.setBorderStyle(['green']).dp();
layout1TitleLabel.s.ft.setStyle(['bold']).dp();
root.s.ft.addChild(titleBorder.asBaseType.asBaseType).dp();
const layoutDemoContainer = createFlexContainer({
  name: 'layoutDemo',
  debug: true,
  log
});

layoutDemoContainer.s.ft.justifyContent('center').dp();
layoutDemoContainer.s.ft.setBorderSpacing(2).dp();
const layoutDemoBorder = createBorderContainer(layoutDemoContainer.asBaseType.asBaseType);
layoutDemoBorder.config({debug: true, name: 'layoutDemoBorder', log});
layoutDemoBorder.s.ft.setBorder('padding').dp();
layoutDemoBorder.s.ft.setPadding(1, 1, 1, 1).dp();
layoutDemoBorder.s.ft.setBackground('bgHsl(200, 45, 10)').dp();
root.s.ft.addChild(layoutDemoBorder.asBaseType.asBaseType).dp();
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
  rx.switchMap(() => layoutDemoContainer.table.l.allChildren.pipe(rx.take(1))),
  rx.mergeMap(([, labels]) => rx.from(labels).pipe(
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
        const text = createTextWidget();
        text.config({debug: true, log, name: 'text-' + i});
        text.s.ft.setContent('This is label ' + (i + 1)).dp(m);
        text.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp(m);
        layoutDemoContainer.s.ft.addChild(text.asBaseType).dp(m);
      }),
      rx.take(num),
      rx.finalize(() => s.ft.doneShowLablesLeftToRight(num).dp(m))
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
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
});
s.ft.showLablesLeftToRight(5).dp();
