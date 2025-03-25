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
const panel = (0, index_1.createFlexContainer)({ name: 'contentPanel', debug, log });
const border = (0, index_1.createBorderContainer)(panel, { name: 'contentPanelBorder', debug, log });
const { ft, pt } = index_1.app.createApp(border, true, {
    default: { debug, log },
    core: { debug },
    main: {
        debug
    },
    elevator: {
        core: { debug: true, log },
        canvas: { debug, log },
        focusable: { debug, cache: { debug } }
    },
    keyService: {
        debug: true
    },
    cover: { debug },
    canvas: { debug },
    colorTheme: { debug: true },
    statusbar: { debug },
    scrollable: {
        focus: { debug }
    }
});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
    ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
    ft.setFullScreenMode().dp();
pt.onReady.pipe(rx.map(([, { colorTheme }]) => {
    const scheme = process.env.PLINK_TERM_COLOR;
    if (scheme)
        colorTheme.ft.setScheme(scheme).dp();
})).subscribe();
rx.combineLatest([
    rx.timer(1000),
    rx.from(import('@material/material-color-utilities'))
]).pipe(rx.take(1), rx.mergeMap(([, { Hct, hexFromArgb }]) => {
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
        const label = (0, index_1.createTextWidget)('TEST LABEL ~~~~~~~~~~~ ' + sColor, {
            name: 'LABEL' + i,
            debug: i === 0,
            debugIncludeTypes: ['onFocus', 'onLeave', 'onEnter', 'onBlur'],
            log
        });
        // if (i === 0)
        //   firstLable = label;
        if (i === 2) {
            label.pt.onFocus.pipe(rx.map(([m]) => {
                label.ft.stopEventPropagation().dp(m);
            })).subscribe();
        }
        label.s.ft.setForeground([`hex(${sColor})`]).dp();
        label.s.ft.setFocusable(true).dp();
        (0, index_1.bindToolTipsTo)(label, 'this is label ' + i, undefined, {
            debug: true,
            name: 'tipsFor#' + i,
            log,
            textOpts: { debug: false }
        });
        panel.ft.addChild(label).dp();
    }
    return panel.postBase.pt.render.pipe(rx.mergeMap(([m]) => {
        return (0, index_1.queryRootFocusService)(panel).pipe(rx.map(focusService => focusService.ft.findFocusable(index_1.FocusableSearchDir.down, 0).dp(m)));
    }), rx.take(1));
})).subscribe();
const welcome = (0, index_1.createTextWidget)('loading...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();
//# sourceMappingURL=sample-app-shell.js.map