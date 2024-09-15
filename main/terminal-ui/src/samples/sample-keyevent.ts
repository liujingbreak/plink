import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import * as rx from 'rxjs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas, KeyEventEnum, createTextWidget, createKeyEventService, createFlexContainer,
  createBorderContainer} from '../index';

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
const root = createFlexContainer({name: 'root', debug: false, log});
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootComponent(root.asBaseType.asBaseType).dp();
canvas.error$.subscribe(([err, label]) => {
  process.stdout.clearScreenDown();
  console.error(label, err);
  log('-----------------\n', label, util.inspect(err));
  process.exit(0);
});
root.s.ft.setDirection('col').dp();
root.s.ft.justifyContent('center').dp();
root.s.ft.alignItems('center').dp();

const label = createTextWidget('What you have typed', {name: 'label.1', debug: false, log});
const labelRecognized = createTextWidget('What system understands', {name: 'label.2', debug: true, log});
const border = createBorderContainer(label.asBaseType, {debug: true, log});

root.s.ft.addChild(border.asBaseType.asBaseType, labelRecognized.asBaseType).dp();
// root.s.ft.setBackground('bgGreen').dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
});

const keyService = createKeyEventService(canvas, {log, debug: true, debugExcludeTypes: []});
const {r, s, table} = keyService;

canvas.s.ft.setRenderOnRequest(true).dp();
canvas.s.ft.requestRender().dp();
canvas.s.ft.reportCursor(keyService).od(canvas.s.pt.doneReportCursor).pipe(
  rx.take(1)
).subscribe(([m, x, y]) => {
  labelRecognized.s.ft.setContent(`Current cursor position: ${x},${y}`).dp(m);
});

r('onExit', s.pt.onExit.pipe(
  rx.mergeMap(() => {
    return canvas.s.ft.reportCursor(keyService).od(canvas.s.pt.doneReportCursor).pipe(
      rx.take(1),
      rx.exhaustMap(([m, x, y]) => {
        labelRecognized.s.ft.setContent(`Current cursor position: ${x},${y}`).dp(m);
        return rx.timer(1000);
      }),
      rx.map(() => {
        keyService.dispose();
        canvas.dispose();
        root.dispose();
        process.nextTick(() => process.exit());
      })
    );
  })
));

r('onDisplayKeys', table.l.onDisplayKeys.pipe(
  // rx.distinctUntilChanged(([, a], [, b]) => a === b),
  rx.map(([m, text, completed, valid]) => {
    label.s.ft.setContent(text).dp(m);
    label.s.ft.setStyle(completed && valid ? ['green'] : []).dp(m);
  })
));
r('onLeft, onRight, onUp, onDown', rx.merge(
  s.pt.onLeft.pipe(rx.tap(([, times]) => labelRecognized.s.ft.setContent(times + ' left').dp())),
  s.pt.onRight.pipe(rx.tap(([, times]) => labelRecognized.s.ft.setContent(times + ' right').dp())),
  s.pt.onUp.pipe(rx.tap(([, times]) => labelRecognized.s.ft.setContent(times + ' up').dp())),
  s.pt.onDown.pipe(rx.tap(([, times]) => labelRecognized.s.ft.setContent(times + ' down').dp())),
  s.pt.didConsumeMultiKey.pipe(
    rx.filter(([, act]) => act != null),
    rx.tap(([m, act]) => labelRecognized.s.ft.setContent(KeyEventEnum[act!]).dp(m))
  )
));
