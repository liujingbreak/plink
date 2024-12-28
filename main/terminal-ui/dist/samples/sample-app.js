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
const debug = true;
const fout = fs_1.default.createWriteStream('terminal-canvas-sample.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
const panel = (0, index_1.createFlexContainer)({ name: 'contentPanel', debug, log });
const text = (0, index_1.createTextWidget)('Hello world', { debug, log });
// const border = createBorderContainer(panel, {name: 'contentPanelBorder', debug, log});
const { ft, pt } = index_1.app.createApp(panel, false, {
    default: { debug, log },
    core: { debug },
    main: {
        debug: true
    },
    elevator: {
        core: { debug, log },
        canvas: { debug, log },
        focusable: { debug: true, cache: { debug } }
    },
    scrollable: {
        focus: { debug: true }
    },
    statusbar: {
        debug: false
    },
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
panel.ft.setDirection('row').dp();
panel.ft.alignItems('start').dp();
panel.ft.justifyContent('center').dp();
const scrollableText = (0, index_1.createTextWidget)('longlonglong text\n'.repeat(80));
text.ft.setFlexShrink(0).dp();
text.ft.setFocusable(true).dp();
const scrollable = index_1.scrollableFac.create(scrollableText);
scrollable.ft.setFocusable(true).dp();
panel.ft.addChild(text, scrollable).dp();
// const post = s.forkPostController();
pt.onReady.pipe(rx.take(1), rx.mergeMap(() => {
    return index_1.app.useAppContext(panel);
}), rx.map(({ statusbar }) => {
    statusbar.ft.setDisplay(index_1.DisplayMode.visible).dp();
})).subscribe();
//# sourceMappingURL=sample-app.js.map