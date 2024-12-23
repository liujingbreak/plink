import 'source-map-support/register';
import fs from 'fs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {app, createFlexContainer, createTextWidget, createBorderContainer} from '../index';

const debug = false;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);
const panel = createFlexContainer({name: 'contentPanel', debug: true, log});
const border = createBorderContainer(panel, {name: 'contentPanelBorder', debug: true, log});
const {canvas} = app.createApp(border, {
  default: {debug, log},
  core: {debug},
  main: {
    debug
  },
  elevator: {
    core: {debug, log},
    // canvas: {debug: true, log}
  },
  scrollable: {default: {debug: true}},
  statusbar: {
    debug: false
  },
  keyService: {
    debug: true,
    debugIncludeTypes: ['onRawKeyInput']
  },
  cover: {debug},
  canvas: {debug},
  // focusable: {debug: true}
});

const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});

setTimeout(() => {
  log('>>>>>>>>>>>>>>>>>>>>>> load data');
  panel.s.ft.removeChild(welcome).dp();
  panel.s.ft.setDirection('col').dp();
  const num = 60;
  const hueInterval = Math.round(360 / num);
  for (let i = 0; i < num; i++) {
    const label = createTextWidget('TEST LABEL ' + i, {name: 'LABEL ' + i, debug, log});
    label.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp();
    label.s.ft.setFocusable(true).dp();
    panel.s.ft.addChild(label).dp();
  }
}, 1000);

const welcome = createTextWidget('Hello...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();

