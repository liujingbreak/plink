import 'source-map-support/register';
import fs from 'fs';
import { createSimpleIndentLogger } from '@wfh/reactivizer/dist/nodejs-utils';
import { app, createBorderContainer, createScrollable, createFlexContainer, createTextWidget } from '../index.js';
const debug = false;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);
const panel = createFlexContainer({ name: 'mainPanel', debug, log });
const border = createBorderContainer(panel, { name: 'border', debug, log });
panel.ft.setDirection('row').dp();
const left = createFlexContainer({ name: 'left', debug, log });
left.ft.setDirection('col').dp();
const textLabel = createTextWidget('Hello world!', { debug, log });
left.ft.addChild(textLabel).dp();
left.ft.setFocusable(true).dp();
textLabel.ft.setStyle(['cyan']).dp();
textLabel.ft.setFlexShrink(0).dp();
left.ft.addChild(createTextWidget(' ', { debug, log })).dp();
left.ft.addChild(createTextWidget('------', { debug, log })).dp();
panel.ft.addChild(left).dp();
panel.ft.justifyContent('center').dp();
panel.ft.alignItems('start').dp();
const right = createFlexContainer({ name: 'list', debug: true, log });
right.ft.setDirection('col').dp();
const rightScroll = createScrollable(right, {
    debug,
    log,
    container: { debug: true, name: 'rightScroll' },
    focus: {
        debug: true,
        cache: {
            debug: true
        }
    },
    canvas: {
        debug: true
        // debugIncludeTypes: ['addRenderFilter', 'removeRenderFilter']
    }
});
// rightScroll.ft.setFocusable(true).dp();
panel.ft.addChild(rightScroll).dp();
const num = 60;
const hueInterval = Math.round(360 / num);
for (let i = 0; i < num; i++) {
    const label = createTextWidget('1234567890-' + i, { name: 'LABEL' + i, debug, log });
    label.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp();
    label.ft.setFocusable(true).dp();
    right.ft.addChild(label).dp();
}
const { ft } = app.createApp(border, false, {
    default: { debug, log },
    core: { debug: true },
    canvas: { debug: true },
    cover: { debug },
    keyService: {
        debug: true // , debugIncludeTypes: ['onFocusChange']
    },
    elevator: {
        // canvas: {debug: true},
        focusable: {
            debug: true,
            cache: {
                debug
            }
        }
    }
});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
    ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
    ft.setFullScreenMode().dp();
// setTimeout(() => {
//   log('>>>>>>>>>>>>>>>>>>>>>> load data');
//   panel.ft.removeChild(textLabel).dp();
//   panel.ft.setDirection('col').dp();
//   const num = 60;
//   const hueInterval = Math.round(360 / num);
//   for (let i = 0; i < num; i++) {
//     const label = createTextWidget('TEST LABEL ~~~~~~~~~~~ ' + i, {name: 'LABEL' + i, debug, log});
//     label.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp();
//     // label.ft.setFocusable(true).dp();
//     panel.ft.addChild(label).dp();
//   }
// }, 1000);
//# sourceMappingURL=sample-multi-focusables.js.map