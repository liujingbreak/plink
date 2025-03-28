import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../core/terminal-canvas.js';
import {createTextWidget} from '../core/text.js';
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);
log('pid', process.pid);
const canvas = createTerminalCanvas({
  debug: true, log
});
const text = createTextWidget('hello', {debug: true, log});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth != null) {
  canvas.ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
} else {
  canvas.ft.setFullScreenMode().dp();
}
canvas.ft.autoHideCursor().dp();
canvas.ft.setRootComponent(text).dp();
// canvas.ft.setRenderOnRequest(true).dp();
rx.concat(
  canvas.ft.render().odMono(
    canvas.pt.onWriteFlushed
  ),
  canvas.ft.printDescentEnd().odMono(
    canvas.pt.onPrintDescentEndFlushed
  ),
  rx.defer(() => {
    canvas.dispose();
    return rx.timer(50);
  }).pipe(
    rx.map(() => {
      process.exit();
    })
  )
).subscribe();


