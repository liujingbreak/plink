import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../core/terminal-canvas';
import {createTextWidget} from '../core/text';
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);
const canvas = createTerminalCanvas({
  debug: true, log
});
const text = createTextWidget('hello', {debug: true, log});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
canvas.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
canvas.ft.autoHideCursor().dp();
canvas.ft.setRootComponent(text).dp();
canvas.ft.setRenderOnRequest(true).dp();
canvas.ft.requestRender().dp();
canvas.pt.render.pipe(
  rx.debounceTime(1000),
  rx.take(1),
  rx.tap(() => {
    canvas.dispose();
    text.dispose();
  })
).subscribe();

