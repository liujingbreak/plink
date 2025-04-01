import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {app, createFlexContainer, createTextWidget, createBorderContainer,
  bindToolTipsTo} from '../index.js';

const debug = false;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);
const panel = createFlexContainer({name: 'panel', debug, log});
const border = createBorderContainer(panel, {name: 'contentPanelBorder', debug, log});
const {ft, pt} = app.createApp(border, true, {
  default: {debug, log},
  core: {debug},
  // main: {
  //   debug: true
  // },
  elevator: {
    core: {debug: true, log},
    canvas: {debug, log},
    focusable: {debug: true, cache: {debug}}
  },
  keyService: {
    debug: true
  },
  cover: {debug},
  canvas: {debug},
  colorTheme: {debug},
  statusbar: {debug},
  scrollable: {
    // container: {debug: true},
    focus: {debug: true}
  }
});

const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
  ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
  ft.setFullScreenMode().dp();
pt.onReady.pipe(
  rx.map(([, {colorTheme}]) => {
    const scheme = process.env.PLINK_TERM_COLOR;
    if (scheme)
      colorTheme.ft.setScheme(scheme as any).dp();
  })
).subscribe();
rx.combineLatest([
  rx.timer(1000),
  rx.from(import('@material/material-color-utilities'))
]).pipe(
  rx.take(1),
  rx.map(([, {Hct, hexFromArgb}]) => {
    log('>>>>>>>>>>>>>>>>>>>>>> load... data');
    panel.s.ft.removeChild(welcome).dp();
    panel.s.ft.setDirection('col').dp();
    const num = 60;
    const hueInterval = Math.round(360 / num);
    // let firstLable: BaseWidget;
    for (let i = 0; i < num; i++) {
      // Refer to https://m3.material.io/styles/color/system/how-the-system-works#e1e92a3b-8702-46b6-8132-58321aa600bd
      // Chroma is how colorful or neutral (grey, black or white) a color appears.
      // Chroma is quantified by a number ranging from 0 (completely grey, black or white) to infinity (most vibrant),
      // though Chroma values in HCT top out at roughly 120.
      const color = Hct.from(hueInterval * i, 120, 50);
      const sColor = hexFromArgb(color.toInt());

      const label = createTextWidget('TEST LABEL ~~~~~~~~~~~ ' + sColor, {
        name: 'LABEL' + i,
        debug,
        // debugIncludeTypes: ['focus', 'onFocus', 'onLeave', 'onEnter', 'onBlur'],
        log
      });
      if (i === 0) {
        panel.log('-- subscribe panel render');
        panel.postBase.pt.render.pipe(
          rx.map(() => {
            panel.log('-- panel render');
            label.ft.focus().dp();
          }),
          rx.take(1)
        ).subscribe();
      }
      //   firstLable = label;
      label.s.ft.setForeground([`hex(${sColor})`]).dp();
      label.s.ft.setFocusable(true).dp();
      bindToolTipsTo(label, 'this is label ' + i, undefined, {
        debug,
        name: 'tipsFor#' + i,
        log,
        textOpts: {debug: false}
      });
      panel.ft.addChild(label).dp();
    }
  })
).subscribe();

const welcome = createTextWidget('loading...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();

