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
const fs_1 = __importDefault(require("fs"));
const rx = __importStar(require("rxjs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const debug = false;
const fout = fs_1.default.createWriteStream('terminal-table-sample.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, true, fout);
const table = (0, index_1.createTable)({
    default: {
        debug, log
    },
    core: {
        debug
    },
    optsForCellComponent: {
        debug
    },
    lazy: {
        // default: {debug},
        core: {
            debug: true,
            debugIncludeTypes: ['dp_didLoad', 'dp_onLoadPage', 'dp_onCancelLoad']
        }
        // headPlaceHolder: {debug: true},
        // tailPlaceHolder: {debug: true}
        // headPlaceHolderLabel: {
        //   debug: false
        // },
        // tailPlaceHolderLabel: {
        //   debug: false
        // }
    }
});
const SAMPLE_ROW_COUNT = 10;
const SAMPLE_COLUMN_CNT = 2;
table.ft.setLazyLoad(true, page => {
    table.log('*** handle onLoadPage', page);
    const out$ = new rx.Observable(sub => {
        if (page > 5) {
            sub.complete();
            return;
        }
        setTimeout(() => {
            for (let r = 0; r < SAMPLE_ROW_COUNT; r++) {
                const cells = [];
                for (let i = 0; i < SAMPLE_COLUMN_CNT; i++) {
                    cells.push(`page ${page}, ${r}:${i}`);
                }
                sub.next([page + ':' + r, cells]);
            }
            sub.complete();
        }, Math.round(Math.random() * 300));
    });
    return out$;
}).dp();
table.pt.onRowAdded.pipe(rx.map(([, _idx, _id, cells]) => {
    cells.map(cell => {
        // (cell as MultiLineTextWidget).ft.setStyle(['black']).dp();
        cell.ft.setFocusable(true).dp();
        cell.pt.onFocus.pipe(rx.switchMap(() => cell.table.l.setContent), rx.map(([, text]) => {
            log('--- focus label', text);
            // statusbar.ft.setMessage(' ' + text).dp();
        })).subscribe();
        cell.ft.setStyle(['rgb(0,0,0)']).dp();
    });
})).subscribe();
table.ft.setBorderType(index_1.TableBorderType.rowSeparator, true).dp();
table.ft.setBorderType(index_1.TableBorderType.border, true).dp();
const root = (0, index_1.createFlexContainer)({ name: 'root', debug, log });
root.ft.alignItems('center').dp();
root.ft.justifyContent('center').dp();
root.ft.addChild(table).dp();
const hueInterval = Math.round(360 / SAMPLE_ROW_COUNT);
const saturation = Math.round(50 / SAMPLE_COLUMN_CNT);
table.ft.setCellBackground((col, row) => {
    let hue;
    if (row > SAMPLE_ROW_COUNT)
        hue = hueInterval * (row % SAMPLE_ROW_COUNT);
    else
        hue = hueInterval * row;
    let sat;
    if (SAMPLE_COLUMN_CNT < col)
        sat = saturation * (col % SAMPLE_COLUMN_CNT);
    else
        sat = saturation * col;
    return `bgHsl(${hue},${30 + sat},70)`;
}).dp();
const { ft } = index_1.app.createApp(root, true, {
    default: {
        debug, log
    },
    elevator: {
        focusable: {
            debug: true
        },
        canvas: {
            debugIncludeTypes: ['render', 'requestRender', 'clearRect', 'copyRect']
        }
    },
    canvas: {
        name: 'outerCan',
        debugIncludeTypes: ['render', 'requestRender', 'clearRect']
    },
    keyService: { debug: true },
    scrollable: {
        container: { debug: true, log },
        focus: {
            debug: true,
            cache: { debug }
        }
        // default: {debug: true, log}
        // canvas: {
        //   debug
        // }
    }
});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
    ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
    ft.setFullScreenMode().dp();
//# sourceMappingURL=sample-app-table.js.map