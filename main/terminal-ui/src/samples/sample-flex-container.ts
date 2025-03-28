import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import * as rx from 'rxjs';
// import stripAnsi from 'strip-ansi';
import {SimplexReactor, SingleActionFactory} from '@wfh/reactivizer';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../index.js';
import {createFlexContainer, createBorderContainer, createTextWidget, MultiLineTextWidget} from '../index.js';
import {waitForImport$} from '../core/rbush.js';

const screenWidth = process.argv[2];
const debug = false;

const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);

waitForImport$.subscribe(() => {
  const canvas = createTerminalCanvas({
    debug,
    log,
    debugExcludeTypes: ['addDisplayUnits', 'onPrintText']
  });
  canvas.ft.autoHideCursor().dp();
  const root = createFlexContainer({name: 'root', debug, log});
  canvas.ft.setRootComponent(root).dp();
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
  root.ft.justifyContent('center').dp();
  root.ft.alignItems('center').dp();
  root.ft.setDirection('col').dp();
  const layout1TitleLabel = createTextWidget('Demo dynamically updating text labels in a flex layout');
  const titleBorder = createBorderContainer(
    layout1TitleLabel,
    {name: 'title-border', debug: false, log}
  );
  layout1TitleLabel.config({name: 'title', debug: false, log});
  titleBorder.ft.setBorderStyle(['green']).dp();
  layout1TitleLabel.ft.setStyle(['bold']).dp();
  root.ft.addChild(titleBorder).dp();

  const demoCtn = createFlexContainer({
    name: 'demoCtn',
    debug: true,
    log
  });

  demoCtn.ft.justifyContent('center').dp();
  demoCtn.ft.setBorderSpacing(2).dp();
  const demoCtnBorder = createBorderContainer(demoCtn, {debug, name: 'demoCtnBorder', log});
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

  interface SceneActions {
    showLablesLeftToRight(numOfLabels: number): SingleActionFactory;
    doneShowLablesLeftToRight(numOfLabels: number): SingleActionFactory;

    toClock(label: MultiLineTextWidget, labelIndex: number, durationMs: number): SingleActionFactory;
    doneToClock(): SingleActionFactory;
  }
  const scene = new SimplexReactor<SceneActions>({
    name: 'scene',
    debug: true,
    log
  });
  const {r, ft, pt} = scene;
  r('doneShowLablesLeftToRight -> toClock', pt.doneShowLablesLeftToRight.pipe(
    rx.switchMap(() => demoCtn.table.l.allChildren),
    rx.concatMap(r => rx.timer(500).pipe(
      rx.map(() => r)
    )),
    rx.mergeMap(([, labels]) => rx.from(labels).pipe(
      rx.concatMap((label, i) => ft.toClock(label as MultiLineTextWidget, i, 5)
        .od(pt.doneToClock).pipe(
          rx.take(1)
        )
      )
      // rx.takeLast(1),
      // rx.mergeMap(() => canvas.pt.render),
      // rx.take(1),
      // rx.finalize(() => {
      //   canvas.dispose();
      //   root.dispose();
      // })
    ))
  ));
  r('showLablesLeftToRight', pt.showLablesLeftToRight.pipe(
    rx.concatMap(([m, num]) => {
      const hueInterval = Math.round(360 / num);
      return rx.timer(0, 1000).pipe(
        rx.map(i => {
          const text = createTextWidget('This is label ' + (i + 1), {name: 'text-' + i, debug: true, log});
          text.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp(m);
          demoCtn.ft.addChild(text).dp(m);
        }),
        rx.take(num),
        rx.finalize(() => ft.doneShowLablesLeftToRight(num).dp(m))
      );
    })
  ));
  r('toClock -> doneToClock', pt.toClock.pipe(
    rx.mergeMap(([m, label, i, duration]) => rx.concat(
      rx.timer(16, 1000).pipe(
        rx.map(() => {
          const now = new Date();
          label.ft.setContent(`Current time: ${now.toLocaleTimeString()}`).dp(m);
        }),
        rx.take(duration)
      ),
      rx.timer(1000).pipe(
        rx.map(() => {
          label.ft.setContent(`This is label ${i + 1}`).dp(m);
          ft.doneToClock().dp(m);
        })
      )
    ))
  ));

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
