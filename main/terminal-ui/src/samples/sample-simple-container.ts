import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import {combineLastestRelated} from '@wfh/reactivizer';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../core/terminal-canvas';
import {createTextWidget} from '../core/text';
import {createFlexContainer} from '../core/flex-container';
// import {waitForImport$} from '../core/rbush';
const fout = fs.createWriteStream('terminal-canvas-sample.log', {flush: true});
const log = createSimpleIndentLogger(false, false, fout);
const canvas = createTerminalCanvas({
  debug: true, log
});
const text = createTextWidget('long sentance', {debug: true, log});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];

const container = createFlexContainer({debug: true, log});
container.ft.addChild(text).dp();
container.ft.justifyContent('center').dp();
container.ft.alignItems('center').dp();
// container.ft.setBackground('bgAnsi256(25)').dp();
if (screenWidth != null) {
  canvas.ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
} else {
  canvas.ft.setFullScreenMode().dp();
}
canvas.ft.autoHideCursor().dp();
canvas.ft.setRootComponent(container).dp();
canvas.ft.setRenderOnRequest(true).dp();

const rendered = combineLastestRelated(canvas.pt.render, canvas.pt.onWriteFlushed);
canvas.ft.requestRender().dp();
canvas.log('---------', process.pid);
rendered.pipe(
  rx.take(1),
  rx.mergeMap(() => {
    return rx.concat(
      rx.timer(1000),
      rx.merge(
        canvas.pt.onWriteFlushed.pipe(
          rx.take(1)
        ),
        new rx.Observable(sub => {
          text.ft.setContent('short').dp();
          sub.complete();
        })
      ).pipe(
        rx.concatMap(() => canvas.ft.printDescentEnd().odMono(
          canvas.pt.onPrintDescentEndFlushed
        )),
        rx.switchMap(() => new rx.Observable(sub => {
          setImmediate(() => sub.complete());
        })),
        rx.finalize(() => {
          canvas.dispose();
          setTimeout(() => {
            process.exit();
          }, 300);
        })
      )
    );
  })
).subscribe();
