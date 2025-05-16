import util from 'util';
import fs from 'fs';
import { formatToConciseNoColor } from '@wfh/reactivizer/dist/nodejs-utils';
import { createTerminalCanvas } from '../index.js';
import { createTextWidget, createFlexContainer, createBorderContainer, createKeyEventService } from '../index.js';
const screenWidth = process.argv[2];
const fout = fs.createWriteStream('terminal-canvas-sample.log');
function log(...args) {
    const date = new Date();
    fout.write(date.toLocaleTimeString());
    // console.log(formatToConciseNoColor(...args));
    fout.write('.');
    fout.write(date.getMilliseconds() + ' - ');
    fout.write(formatToConciseNoColor(...args));
    fout.write('\n');
}
const canvas = createTerminalCanvas({ debug: true, log });
const root = createFlexContainer({ name: 'root', debug: true, log });
canvas.ft.setRootComponent(root).dp();
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
root.ft.justifyContent('center').dp();
root.ft.alignItems('center').dp();
const label = createTextWidget('8', { debug: true, log });
const border = createBorderContainer(label, { debug: true, log });
root.ft.addChild(border).dp();
canvas.ft.setSize(screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1, createKeyEventService()).dp();
canvas.ft.render().dp();
process.stdout.on('resize', () => {
    canvas.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
    canvas.ft.render().dp();
});
setTimeout(() => {
    label.log('HERE WE GO ---> 18');
    label.ft.setContent('18').dp();
    canvas.ft.render().dp();
    canvas.dispose();
    root.dispose();
}, 1000);
// setTimeout(() => {
//   label.ft.setContent('8').dp();
//   canvas.ft.render().dp();
// }, 1500);
// setTimeout(() => {
//   label.ft.setContent('12').dp();
//   canvas.ft.render().dp();
//   canvas.dispose();
//   root.dispose();
// }, 2000);
//# sourceMappingURL=border-sample.js.map