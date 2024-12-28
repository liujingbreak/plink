import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {app, createFlexContainer, createTextWidget, createBorderContainer} from '../index';

const debug = false;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);
const panel = createFlexContainer({name: 'contentPanel', debug: true, log});
const border = createBorderContainer(panel, {name: 'contentPanelBorder', debug, log});
const {ft} = app.createApp(border, true, {
  default: {debug, log},
  core: {debug: true},
  main: {
    debug
  },
  elevator: {
    core: {debug, log},
    canvas: {debug, log},
    focusable: {debug: true, cache: {debug}}
  },
  scrollable: {
    focus: {debug: true}
  },
  // statusbar: {
  //   debug: true
  // },
  keyService: {
    debug: true,
    debugIncludeTypes: ['onRawKeyInput']
  },
  cover: {debug},
  canvas: {debug}
});

const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
  ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
  ft.setFullScreenMode().dp();

setTimeout(() => {
  log('>>>>>>>>>>>>>>>>>>>>>> load data');
  panel.s.ft.removeChild(welcome).dp();
  panel.s.ft.setDirection('col').dp();
  const num = 60;
  const hueInterval = Math.round(360 / num);
  for (let i = 0; i < num; i++) {
    const label = createTextWidget('TEST LABEL ~~~~~~~~~~~ ' + i, {
      name: 'LABEL' + i,
      debug: i < 3,
      debugExcludeTypes: [],
      log
    });
    if (i === 2) {
      label.pt.onFocus.pipe(
        rx.map(([m, src]) => {
          label.ft.stopEventPropagation().dp(m);
        })
      ).subscribe();
    }
    label.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp();
    label.s.ft.setFocusable(true).dp();
    panel.s.ft.addChild(label).dp();
  }
}, 1000);

const welcome = createTextWidget('loading...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();

