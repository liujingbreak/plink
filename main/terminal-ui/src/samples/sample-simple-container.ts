import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../core/terminal-canvas';
import {createTextWidget} from '../core/text';
import {createFlexContainer} from '../core/flex-container';
const fout = fs.createWriteStream('terminal-canvas-sample.log', {flush: true});
const log = createSimpleIndentLogger(false, true, fout);
const canvas = createTerminalCanvas({
  debug: true, log
});
const text = createTextWidget('long sentance', {debug: true, log});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
const container = createFlexContainer({debug: false, log});
container.ft.addChild(text).dp();
container.ft.justifyContent('center').dp();
container.ft.alignItems('center').dp();
// container.ft.setBackground('bgAnsi256(25)').dp();
canvas.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
canvas.ft.autoHideCursor().dp();
canvas.ft.setRootComponent(container).dp();
canvas.ft.setRenderOnRequest(true).dp();
canvas.ft.requestRender().dp();
rx.concat(
  rx.timer(1000),
  rx.merge(
    text.pt.render.pipe(
      rx.take(1)
    ),
    new rx.Observable(sub => {
      text.ft.setContent('short').dp();
      sub.complete();
    })
  ).pipe(
    rx.switchMap(() => new rx.Observable(sub => {
      setImmediate(() => sub.complete());
    })),
    rx.finalize(() => {
      canvas.dispose();
      process.stdout.write('\n');
    })
  )
).subscribe();
