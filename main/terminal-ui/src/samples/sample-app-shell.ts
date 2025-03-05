import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {app, createFlexContainer, createTextWidget, createBorderContainer,
  textFac, FocusableSearchDir, queryRootFocusService, bindToolTipsTo} from '../index';

const debug = false;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);
const panel = createFlexContainer({name: 'contentPanel', debug, log});
const border = createBorderContainer(panel, {name: 'contentPanelBorder', debug, log});
const {ft} = app.createApp(border, true, {
  default: {debug, log},
  core: {debug},
  main: {
    debug
  },
  elevator: {
    core: {debug, log},
    canvas: {debug, log},
    focusable: {debug, cache: {debug}}
  },
  scrollable: {
    core: {debug},
    focus: {debug}
  },
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
  // let firstLable: BaseWidget;
  for (let i = 0; i < num; i++) {
    const label = createTextWidget('TEST LABEL ~~~~~~~~~~~ ' + i, {
      name: 'LABEL' + i,
      debug: true,
      debugIncludeTypes: ['onFocus', 'onLeave'],
      log
    });
    // if (i === 0)
    //   firstLable = label;
    if (i === 2) {
      label.pt.onFocus.pipe(
        rx.map(([m]) => {
          label.ft.stopEventPropagation().dp(m);
        })
      ).subscribe();
    }
    label.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp();
    label.s.ft.setFocusable(true).dp();
    const tips = textFac.create(`Hello, this is label #${i}`, {debug, log, name: 'tips'});
    tips.ft.setPadding(0, 1, 0, 1).dp();
    tips.ft.setBackground('bgBlue').dp();
    bindToolTipsTo(label, 'this is label ' + i);
    panel.ft.addChild(label).dp();
  }
  panel.postBase.pt.render.pipe(
    rx.mergeMap(([m]) => {
      return queryRootFocusService(panel).pipe(
        rx.map(focusService => focusService.ft.findFocusable(FocusableSearchDir.down, 0).dp(m))
      );
    }),
    rx.take(1)
  ).subscribe();
  // firstLable!.ft.focus().dp();
}, 1000);

const welcome = createTextWidget('loading...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();

