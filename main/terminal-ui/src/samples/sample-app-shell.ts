import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {app, createFlexContainer, createTextWidget, createBorderContainer,
  FocusableSearchDir, queryRootFocusService, bindToolTipsTo} from '../index';

const debug = false;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);
const panel = createFlexContainer({name: 'contentPanel', debug, log});
const border = createBorderContainer(panel, {name: 'contentPanelBorder', debug, log});
const {ft, pt} = app.createApp(border, true, {
  default: {debug, log},
  core: {debug},
  main: {
    debug
  },
  elevator: {
    core: {debug: true, log},
    canvas: {debug, log},
    focusable: {debug, cache: {debug}}
  },
  keyService: {
    debug: true
  },
  cover: {debug},
  canvas: {debug},
  colorTheme: {debug: true},
  statusbar: {debug},
  scrollable: {
    focus: {debug}
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
  rx.mergeMap(([, {Hct, hexFromArgb}]) => {
    log('>>>>>>>>>>>>>>>>>>>>>> load data');
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
        debug: i === 0,
        debugIncludeTypes: ['onFocus', 'onLeave', 'onEnter', 'onBlur'],
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
      label.s.ft.setStyle(['hex(' + sColor + ')' as any]).dp();
      label.s.ft.setFocusable(true).dp();
      bindToolTipsTo(label, 'this is label ' + i, undefined, {
        debug: true,
        name: 'tipsFor#' + i,
        log,
        textOpts: {debug: false}
      });
      panel.ft.addChild(label).dp();
    }
    return panel.postBase.pt.render.pipe(
      rx.mergeMap(([m]) => {
        return queryRootFocusService(panel).pipe(
          rx.map(focusService => focusService.ft.findFocusable(FocusableSearchDir.down, 0).dp(m))
        );
      }),
      rx.take(1)
    );
  })
).subscribe();

const welcome = createTextWidget('loading...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();

