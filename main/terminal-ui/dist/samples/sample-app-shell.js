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
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
const panel = (0, index_1.createFlexContainer)({ name: 'contentPanel', debug: true, log });
const border = (0, index_1.createBorderContainer)(panel, { name: 'contentPanelBorder', debug, log });
const { ft } = index_1.app.createApp(border, true, {
    default: { debug, log },
    core: { debug: true },
    main: {
        debug
    },
    elevator: {
        core: { debug, log },
        canvas: { debug, log },
        focusable: { debug: true, cache: { debug } }
    },
    scrollable: {
        focus: { debug: true }
    },
    // statusbar: {
    //   debug: true
    // },
    keyService: {
        debug: true,
        debugIncludeTypes: ['onRawKeyInput']
    },
    cover: { debug },
    canvas: { debug }
});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
    ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
    ft.setFullScreenMode().dp();
setTimeout(() => {
    log('>>>>>>>>>>>>>>>>>>>>>> load data');
    panel.s.ft.removeChild(welcome).dp();
    panel.s.ft.setDirection('col').dp();
    const num = 60;
    const hueInterval = Math.round(360 / num);
    for (let i = 0; i < num; i++) {
        const label = (0, index_1.createTextWidget)('TEST LABEL ~~~~~~~~~~~ ' + i, {
            name: 'LABEL' + i,
            debug: i < 3,
            debugExcludeTypes: [],
            log
        });
        if (i === 2) {
            label.pt.onFocus.pipe(rx.map(([m, src]) => {
                label.ft.stopEventPropagation().dp(m);
            })).subscribe();
        }
        label.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp();
        label.s.ft.setFocusable(true).dp();
        panel.s.ft.addChild(label).dp();
    }
}, 1000);
const welcome = (0, index_1.createTextWidget)('loading...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();
//# sourceMappingURL=sample-app-shell.js.map