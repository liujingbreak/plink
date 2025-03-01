"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const index_2 = require("../index");
const index_3 = require("../index");
const rbush_1 = require("../core/rbush");
const flex_box_1 = require("../hoc/flex-box");
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
rbush_1.waitForImport$.subscribe(() => {
    const canvas = (0, index_1.createTerminalCanvas)({ debug: true, log });
    const root = flex_box_1.flexBoxFac.create({ name: 'root', debug: true, log });
    root.ft.setBorder('line').dp();
    root.ft.alignItems('center').dp();
    canvas.ft.autoHideCursor().dp();
    canvas.ft.setRootComponent(root).dp();
    canvas.error$.subscribe(([err, label]) => {
        process.stdout.clearScreenDown();
        console.error(label, err);
        log('-----------------\n', label, util_1.default.inspect(err));
        process.exit(0);
    });
    const thinLabel = (0, index_2.createTextWidget)('~~~~label A~~~~', { debug: true, log });
    thinLabel.ft.setStyle(['bgYellow', 'black']).dp();
    thinLabel.ft.setFlexShrink(1).dp();
    const fatLabel = (0, index_2.createTextWidget)('Label B');
    const border = (0, index_3.createBorderContainer)(fatLabel, { debug: true, log });
    border.ft.setFlexShrink(0).dp();
    root.ft.addChild(thinLabel, border).dp();
    canvas.ft.setBounding(0, 0, 20, process.stdout.rows - 1).dp();
    canvas.ft.render().dp();
    setTimeout(() => {
        canvas.dispose();
    }, 0);
});
//# sourceMappingURL=sample-flex-container.shrink.js.map