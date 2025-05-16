import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {DisplayMode, app, createFlexContainer, createTextWidget, createBorderContainer} from '../index.js';

const debug = false;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, true, fout);
const panel = createFlexContainer({name: 'contentPanel', debug: true, log});
const border = createBorderContainer(panel, {name: 'contentPanelBorder', debug: false, log});
const {ft} = app.createApp(border, true, {
  default: {debug, log},
  core: {debug: true},
  scrollable: {
    debug,
    canvas: {
      debugIncludeTypes: ['clearRect', 'render']
    }
  },
  elevator: {
    default: {debug: false},
    canvas: {debug, log, debugIncludeTypes: ['clearRect', 'render']}
  },
  statusbar: {debug, log},
  canvas: {debug: true, log,
    debugIncludeTypes: ['clearRect', 'render']}
  // keyService: {debug: false}
});

const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
  ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
  ft.setFullScreenMode().dp();

const welcome = createTextWidget('Hello...', {name: 'welcomLabel', debug, log});
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
// panel.s.ft.setBackground('bgGray').dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();

const labelA = createTextWidget('label A ', {name: 'Label A', debug: true, log});
const labelB = createTextWidget('Label B ', {name: 'Label B', debug, log});
const labelC = createTextWidget('Label C ', {name: 'Label C', debug, log});
const labelD = createTextWidget('Label D ', {name: 'Label D', debug, log});
border.s.ft.setFlexGrow(1).dp();
panel.s.ft.addChild(labelA, labelB, labelC, labelD).dp();

rx.timer(1000, 1500).pipe(
  rx.take(1),
  rx.map(i => {
    log('---- changing setDisplay ----', i);
    labelB.s.ft.setDisplay(i % 2 === 0 ? DisplayMode.none : DisplayMode.visible).dp();
    labelD.s.ft.setDisplay(i % 2 === 0 ? DisplayMode.hidden : DisplayMode.visible).dp();
  })
).subscribe();

