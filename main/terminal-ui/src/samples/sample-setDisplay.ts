import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {DisplayMode, app, createFlexContainer, createTextWidget, createBorderContainer} from '../index';

const debug = false;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, true, fout);
const panel = createFlexContainer({name: 'contentPanel', debug: true, log});
const border = createBorderContainer(panel, {name: 'contentPanelBorder', debug: false, log});
const {canvas} = app.createApp(border, {
  default: {debug, log},
  scrollable: {
    default: {
      debug: true,
      debugIncludeTypes: ['clearRect', 'render']
    }
  },
  elevator: {
    default: {debug: false},
    canvas: {debug, log, debugIncludeTypes: ['clearRect', 'render']}
  },
  statusbar: {debug: false, log},
  canvas: {debug: true, log,
    debugIncludeTypes: ['clearRect', 'render']},
  focusable: {debug: false},
  keyService: {debug: false}
});

const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});

const welcome = createTextWidget('Hello...', {name: 'welcomLabel', debug: false, log});
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
// panel.s.ft.setBackground('bgGray').dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();

const labelA = createTextWidget('label A ', {name: 'Label A', debug: true, log});
const labelB = createTextWidget('Label B ', {name: 'Label B', debug: true, log});
const labelC = createTextWidget('Label C ', {name: 'Label C', debug: true, log});
const labelD = createTextWidget('Label D ', {name: 'Label D', debug: true, log});
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

canvas.s.ft.requestRender().dp();
