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
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, true, fout);
const panel = (0, index_1.createFlexContainer)({ name: 'contentPanel', debug: true, log });
const border = (0, index_1.createBorderContainer)(panel, { name: 'contentPanelBorder', debug: false, log });
const { ft } = index_1.app.createApp(border, true, {
    default: { debug, log },
    core: { debug: true },
    scrollable: {
        default: {
            debug,
            debugIncludeTypes: ['clearRect', 'render']
        }
    },
    elevator: {
        default: { debug: false },
        canvas: { debug, log, debugIncludeTypes: ['clearRect', 'render'] }
    },
    statusbar: { debug, log },
    canvas: { debug: true, log,
        debugIncludeTypes: ['clearRect', 'render'] }
    // keyService: {debug: false}
});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
    ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
    ft.setFullScreenMode().dp();
const welcome = (0, index_1.createTextWidget)('Hello...', { name: 'welcomLabel', debug, log });
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome).dp();
// panel.s.ft.setBackground('bgGray').dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();
const labelA = (0, index_1.createTextWidget)('label A ', { name: 'Label A', debug: true, log });
const labelB = (0, index_1.createTextWidget)('Label B ', { name: 'Label B', debug, log });
const labelC = (0, index_1.createTextWidget)('Label C ', { name: 'Label C', debug, log });
const labelD = (0, index_1.createTextWidget)('Label D ', { name: 'Label D', debug, log });
border.s.ft.setFlexGrow(1).dp();
panel.s.ft.addChild(labelA, labelB, labelC, labelD).dp();
rx.timer(1000, 1500).pipe(rx.take(1), rx.map(i => {
    log('---- changing setDisplay ----', i);
    labelB.s.ft.setDisplay(i % 2 === 0 ? index_1.DisplayMode.none : index_1.DisplayMode.visible).dp();
    labelD.s.ft.setDisplay(i % 2 === 0 ? index_1.DisplayMode.hidden : index_1.DisplayMode.visible).dp();
})).subscribe();
//# sourceMappingURL=sample-setDisplay.js.map