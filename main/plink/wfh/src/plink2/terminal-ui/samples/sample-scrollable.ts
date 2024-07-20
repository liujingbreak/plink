import 'source-map-support/register';
import util from 'util';
import rl from 'readline';
import fs from 'fs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../terminal-canvas';
import {createTextWidget} from '../terminal-text';
import {createBorderContainer} from '../terminal-featured-widget';
import {createScrollable} from '../terminal-scrollable';

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

const canvas = createTerminalCanvas();
canvas.config({debug: true, log});
canvas.s.ft.autoHideCursor().dp();
// const root = createListContainer({name: 'root', debug: true, log});
// canvas.s.ft.setRootWidget(root).dp();
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
// root.s.ft.justifyContent('center').dp();
// root.s.ft.alignItems('center').dp();

const label = createTextWidget('Hello border container');
label.config({debug: true, log});
label.s.ft.init().dp();
label.s.ft.setStyle(['inverse']).dp();
const border = createBorderContainer(label.asBaseType);
border.config({debug: true, log});
border.s.ft.init().dp();
const scrollable = createScrollable(border.asBaseType.asBaseType);
scrollable.config({debug: true, log});
scrollable.s.ft.init().dp();
canvas.s.ft.setRootWidget(scrollable).dp();

// root.s.ft.addChild(border.asBaseType.asBaseType).dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
canvas.s.ft.render().dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
  canvas.s.ft.render().dp();
});


rl.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

function onKeypress(key: string, data: {name: string; sequence: string; ctrl: boolean; shift: boolean}) {
  // const str = data[0];
  log('input:', JSON.stringify(key), data);
  const kname = data.name;
  if (kname === 'l' || kname === 'right') {
    scrollable.s.ft.scroll(1, 0).dp();
    canvas.s.ft.render().dp();
  } else if (kname === 'h' || kname === 'left') {
    scrollable.s.ft.scroll(-1, 0).dp();
    canvas.s.ft.render().dp();
  } else if (key === 'q' || (data.ctrl && data.name === 'c')) {
    canvas.dispose();
    scrollable.dispose();
    // process.stdin.off('keypress', onKeypress);
    process.nextTick(() => {
      process.exit();
      // process.stdin.off('keypress', onKeypress);
    });
  }
}
process.stdin.on('keypress', onKeypress);
// canvas.dispose();
// scrollable.dispose();
setTimeout(() => {
  const c = `To embrace Monorepo and Multiple-repo at same time.
Web (or Node.js) frameworks or libraries like Angular, React, Vue, NestJS, they all come up with command line tools which help developer to initialize web projects, most of them are like scaffolding tool. Most of the tools are limited at or totally not supporting monorepo/library authoring. Which brings a lot room for enterprise developer to improve for sharing and maintaining resuable modules or functions cross multiple projects.
We want to offer similar experience of developing Web appliactions like authoring Chrome extension for a Chrome browser, composing extension for Visual studio code. Easy to extend under certain standards.
We want our appliactions be able to share fundations of UI, state management, server side functions and tools while different application goes separate CI/CD process like microservice.`;
  label.s.ft.setContent(c).dp();
  canvas.s.ft.render().dp();
}, 1000);
