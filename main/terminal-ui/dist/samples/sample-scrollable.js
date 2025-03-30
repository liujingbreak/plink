import util from 'util';
import fs from 'fs';
import * as rx from 'rxjs';
import { createSimpleIndentLogger } from '@wfh/reactivizer/dist/nodejs-utils';
import { createTerminalCanvas } from '../index.js';
import { createTextWidget } from '../index.js';
import { createBorderContainer } from '../index.js';
import { createScrollable } from '../index.js';
import { createKeyEventService } from '../index.js';
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const debug = true;
const log = createSimpleIndentLogger(false, false, fout);
const canvas = createTerminalCanvas({ debug: true, log });
canvas.ft.autoHideCursor().dp();
canvas.error$.subscribe(([err, label]) => {
    process.stdout.clearScreenDown();
    console.error(label, err);
    fout.write('-----------------\n');
    fout.write(label);
    fout.write('\n');
    fout.write(util.inspect(err));
    fout.close();
    process.exit(0);
});
const label = createTextWidget('Hello border container', { debug: true, log });
const border = createBorderContainer(label, { debug, log });
const scrollable = createScrollable(border, { debug: true, log });
scrollable.ft.setScrollable(false, true).dp();
canvas.ft.setRootComponent(scrollable).dp();
canvas.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows - 1).dp();
const keyEventService = createKeyEventService({ debug, log });
keyEventService.ft.bindToScrollable(scrollable).dp();
keyEventService.r('keyEventService.onExit', keyEventService.pt.onExit.pipe(rx.map(() => {
    canvas.dispose();
    scrollable.dispose();
    process.nextTick(() => {
        process.exit();
    });
})));
process.stdout.on('resize', () => {
    canvas.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
});
canvas.ft.setRenderOnRequest(true).dp();
canvas.ft.requestRender().dp();
setTimeout(() => {
    const c = `To embrace Monorepo and Multiple-repo at same time.
Web (or Node.js) frameworks or libraries like Angular, React, Vue, NestJS, they all come up with command line tools which help developer to initialize web projects, most of them are like scaffolding tool. Most of the tools are limited at or totally not supporting monorepo/library authoring. Which brings a lot room for enterprise developer to improve for sharing and maintaining resuable modules or functions cross multiple projects.
We want to offer similar experience of developing Web appliactions like authoring Chrome extension for a Chrome browser, composing extension for Visual studio code. Easy to extend under certain standards.
We want our appliactions be able to share fundations of UI, state management, server side functions and tools while different application goes separate CI/CD process like microservice.`;
    label.ft.setContent(c).dp();
    canvas.log('================== sample rerender for new size');
}, 1000);
//# sourceMappingURL=sample-scrollable.js.map