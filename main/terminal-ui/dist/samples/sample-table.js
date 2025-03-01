"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const rx = __importStar(require("rxjs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const debug = false;
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
function log(...args) {
    const date = new Date();
    fout.write(date.toLocaleTimeString());
    fout.write('.');
    fout.write(date.getMilliseconds() + ' - ');
    fout.write((0, nodejs_utils_1.formatToConciseNoColor)(...args));
    fout.write('\n');
}
const canvas = (0, index_1.createTerminalCanvas)({ debug, debugIncludeTypes: ['fillRect'], log });
const root = (0, index_1.createFlexContainer)({ name: 'root', debug, log });
root.ft.alignItems('center').dp();
const table = (0, index_1.createTable)({
    core: { name: 'table', debug: true, log, debugExcludeTypes: ['onCellBgRender'] },
    default: { debug: false, log }
});
const SAMPLE_ROW_COUNT = 6;
const SAMPLE_COLUMN_CNT = 7;
table.pt.onRowAdded.pipe(rx.map(([, idx, id, cells]) => {
    cells.map(cell => {
        cell.ft.setStyle(['black']).dp();
    });
})).subscribe();
for (let r = 0; r < SAMPLE_ROW_COUNT; r++) {
    const cells = [];
    for (let i = 0; i < 7; i++) {
        cells.push(`Cell ${r}:${i}`);
    }
    table.ft.addRow(cells).dp();
}
table.ft.setBorderType(index_1.TableBorderType.rowSeparator, true).dp();
table.ft.setBorderType(index_1.TableBorderType.border, true).dp();
const hueInterval = Math.round(360 / SAMPLE_ROW_COUNT);
const saturation = Math.round(50 / SAMPLE_COLUMN_CNT);
table.ft.setCellBackground((col, row) => `bgHsl(${hueInterval * row},${30 + saturation * col},70)`).dp();
root.ft.addChild(table).dp();
root.ft.setDirection('col').dp();
canvas.ft.autoHideCursor().dp();
canvas.ft.setRootComponent(root).dp();
canvas.error$.subscribe(([err, label]) => {
    process.stdout.clearScreenDown();
    console.error(label, err);
    log('-----------------\n', label, util_1.default.inspect(err));
    process.exit(0);
});
canvas.ft.setBounding(0, 0, process.stdout.columns, process.stdout.rows).dp();
canvas.ft.render().dp();
canvas.dispose();
root.dispose();
//# sourceMappingURL=sample-table.js.map