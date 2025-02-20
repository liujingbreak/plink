import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {app, flexBoxFac, textFac, DisplayMode, scrollableFac} from '../index';

const debug = true;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);
const panel = flexBoxFac.create({name: 'contentPanel', debug, log});
const text = textFac.create('Hello world', {debug, log});
// const border = createBorderContainer(panel, {name: 'contentPanelBorder', debug, log});
const {ft, pt} = app.createApp(panel, false, {
  default: {debug, log},
  core: {debug},
  main: {
    debug: true
  },
  elevator: {
    core: {debug, log},
    canvas: {debug, log},
    focusable: {debug: true, cache: {debug}}
  },
  scrollable: {
    focus: {debug: true}
  },
  statusbar: {
    debug: false
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
panel.ft.setDirection('row').dp();
panel.ft.alignItems('start').dp();
panel.ft.justifyContent('center').dp();
const scrollableText = textFac.create('longlonglong text\n'.repeat(80), {
  debug, log,
  border: {name: 'scrollableText'}
});
text.ft.setFlexShrink(0).dp();
text.ft.setFocusable(true).dp();
text.ft.setBorder('line').dp();
text.ft.setPadding(0, 2, 0, 0).dp();
const scrollable = scrollableFac.create(scrollableText);
scrollable.ft.setFocusable(true).dp();

panel.ft.addChild(text, scrollable).dp();
// const post = s.forkPostController();
pt.onReady.pipe(
  rx.take(1),
  rx.mergeMap(() => {
    return app.useAppContext(panel);
  }),
  rx.map(({statusbar}) => {
    statusbar.ft.setDisplay(DisplayMode.visible).dp();
  })
).subscribe();
