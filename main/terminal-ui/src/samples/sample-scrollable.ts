import 'source-map-support/register';
import util from 'util';
import rl from 'readline';
import fs from 'fs';
import * as rx from 'rxjs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../terminal-canvas';
import {createTextWidget} from '../terminal-text';
import {createBorderContainer} from '../terminal-border';
import {createScrollable} from '../terminal-scrollable';
import {createKeyEventService} from '../terminal-keyEvent';

const screenWidth = process.argv[2];
const screenHeight = process.argv[3];

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

const label = createTextWidget('Hello border container', {debug: true, log});
const border = createBorderContainer(label.asBaseType, {debug: true, log});
const scrollable = createScrollable(border.asBaseType.asBaseType, {debug: true, log});
scrollable.s.ft.setScrollable(true, true).dp();
canvas.s.ft.setRootWidget(scrollable).dp();

canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns,
  screenHeight ? Number(screenHeight) : process.stdout.rows - 1).dp();
canvas.s.ft.render().dp();
const keyEventService = createKeyEventService(canvas, {debug: true, log});
keyEventService.s.ft.bindToScrollable(scrollable).dp();

keyEventService.r('keyEventService.onExit', keyEventService.s.pt.onExit.pipe(
  rx.map(() => {
    canvas.dispose();
    scrollable.dispose();
    process.nextTick(() => {
      process.exit();
    });
  })
));

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
  canvas.s.ft.render().dp();
});

rl.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

setTimeout(() => {
  const c = `To embrace Monorepo and Multiple-repo at same time.
Web (or Node.js) frameworks or libraries like Angular, React, Vue, NestJS, they all come up with command line tools which help developer to initialize web projects, most of them are like scaffolding tool. Most of the tools are limited at or totally not supporting monorepo/library authoring. Which brings a lot room for enterprise developer to improve for sharing and maintaining resuable modules or functions cross multiple projects.
We want to offer similar experience of developing Web appliactions like authoring Chrome extension for a Chrome browser, composing extension for Visual studio code. Easy to extend under certain standards.
We want our appliactions be able to share fundations of UI, state management, server side functions and tools while different application goes separate CI/CD process like microservice.`;
  label.s.ft.setContent(c).dp();
  canvas.log('================== sample rerender for new size');
  canvas.s.ft.render().dp();
}, 1000);
