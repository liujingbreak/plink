import util from 'util';
import fs from 'fs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../index.js';
import {createTextWidget} from '../index.js';
import {createBorderContainer} from '../index.js';
import {waitForImport$} from '../core/rbush.js';
import {flexBoxFac} from '../hoc/flex-box.js';

const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);

waitForImport$.subscribe(() => {
  const canvas = createTerminalCanvas({debug: true, log});
  const root = flexBoxFac.setting({name: 'root', debug: true, log}).create();
  root.ft.setBorder('line').dp();
  root.ft.alignItems('center').dp();
  canvas.ft.autoHideCursor().dp();
  canvas.ft.setRootComponent(root).dp();
  canvas.error$.subscribe(([err, label]) => {
    process.stdout.clearScreenDown();
    console.error(label, err);
    log('-----------------\n', label, util.inspect(err));
    process.exit(0);
  });

  const thinLabel = createTextWidget('~~~~label A~~~~', {debug: true, log});
  thinLabel.ft.setStyle(['bgYellow', 'black']).dp();
  thinLabel.ft.setFlexShrink(1).dp();
  const fatLabel = createTextWidget('Label B');
  const border = createBorderContainer(fatLabel, {debug: true, log});
  border.ft.setFlexShrink(0).dp();
  root.ft.addChild(thinLabel, border).dp();

  canvas.ft.setBounding(0, 0, 20, process.stdout.rows - 1).dp();

  canvas.ft.render().dp();
  setTimeout(() => {
    canvas.dispose();
  }, 0);
});

