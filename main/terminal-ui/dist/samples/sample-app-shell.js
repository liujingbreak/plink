// import fs from 'fs';
import * as rx from 'rxjs';
// import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import { app, createFlexContainer, createTextWidget, createBorderContainer, bindToolTipsTo } from '../index.js';
import { useAsInitOption } from '@wfh/reactivizer/dist/sqlite-log';
const shutdownLog = useAsInitOption('terminal-canvas-sample.log.db');
const enableLog = false;
// const fout = fs.createWriteStream('terminal-canvas-sample.log');
// const log = createSimpleIndentLogger(false, false, fout);
const panel = createFlexContainer({ name: 'panel', enableLog });
const border = createBorderContainer(panel, { name: 'contentPanelBorder', enableLog });
const appService = app.createApp(border, true, {
    default: { enableLog },
    core: { enableLog },
    // main: {
    //   enableLog: true
    // },
    elevator: {
        core: { enableLog },
        canvas: { enableLog },
        focusable: { enableLog: true, cache: { enableLog } }
    },
    keyService: {
        enableLog: true
    },
    cover: { enableLog },
    canvas: { enableLog },
    colorTheme: { enableLog },
    statusbar: { enableLog },
    scrollable: {
        // container: {enableLog: true},
        focus: { enableLog: true, cache: { enableLog: false } }
    }
});
const { ft, pt } = appService;
pt.onExit.subscribe(() => {
    shutdownLog();
});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
    ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
    ft.setFullScreenMode().dp();
rx.combineLatest([
    rx.timer(1000),
    rx.from(import('@material/material-color-utilities'))
]).pipe(rx.take(1), rx.map(([, { Hct, hexFromArgb }]) => {
    appService.log('>>>>>>>>>>>>>>>>>>>>>> load... data');
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
            name: 'LABEL-' + i,
            enableLog
            // debugIncludeTypes: ['focus', 'onFocus', 'onLeave', 'onEnter', 'onBlur'],
        });
        if (i === 0) {
            panel.log('-- subscribe panel render');
            panel.postBase.pt.render.pipe(rx.map(() => {
                panel.log('-- panel render');
                label.ft.focus().dp();
            }), rx.take(1)).subscribe();
        }
        //   firstLable = label;
        label.s.ft.setForeground([`hex(${sColor})`]).dp();
        label.s.ft.setFocusable(true).dp();
        bindToolTipsTo(label, 'this is label ' + i, undefined, {
            enableLog,
            name: 'tipsFor#' + i,
            textOpts: { debug: false }
        });
        panel.ft.addChild(label).dp();
    }
})).subscribe();
const welcome = createTextWidget('loading...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();
//# sourceMappingURL=sample-app-shell.js.map