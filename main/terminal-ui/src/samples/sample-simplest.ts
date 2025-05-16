// import fs from 'fs';
import * as rx from 'rxjs';
// import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {useAsInitOption} from '@wfh/reactivizer/dist/sqlite-log';
const shutdownLog = useAsInitOption('terminal-canvas-sample.log.db');
import {createTerminalCanvas} from '../core/terminal-canvas.js';
import {createTextWidget} from '../core/text.js';
// const fout = fs.createWriteStream('terminal-canvas-sample.log');
// const log = createSimpleIndentLogger(false, false, fout);
// log('pid', process.pid);
const canvas = createTerminalCanvas({
  enableLog: true
});
const text = createTextWidget('hello', {enableLog: true});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
    shutdownLog();
    return rx.timer(50);
  }).pipe(
    rx.map(() => {
      process.exit();
    })
  )
).subscribe();

