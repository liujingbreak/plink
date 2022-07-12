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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doTsconfig = void 0;
const path_1 = __importDefault(require("path"));
const op = __importStar(require("rxjs/operators"));
const editor_helper_1 = require("../editor-helper");
// import {getLogger} from 'log4js';
const misc_1 = require("../utils/misc");
const store_1 = require("../store");
function doTsconfig(opts) {
    if (opts.hook && opts.hook.length > 0) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.hookTsconfig(opts.hook);
    }
    if (opts.unhook && opts.unhook.length > 0) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.unHookTsconfig(opts.unhook);
    }
    if (opts.unhookAll) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.unHookAll();
    }
    (0, editor_helper_1.getStore)().pipe(op.map(s => s.tsconfigByRelPath), op.distinctUntilChanged(), op.filter(datas => {
        if (datas.size > 0) {
            return true;
        }
        // eslint-disable-next-line no-console
        console.log('No hooked files found, hook file by command options "--hook <file>"');
        return false;
    }), op.debounceTime(0), // There will be two change events happening, let's get the last change result only
    op.tap((datas) => {
        // eslint-disable-next-line no-console
        console.log('Hooked tsconfig files:');
        for (const data of datas.values()) {
            // eslint-disable-next-line no-console
            console.log('  ' + path_1.default.resolve((0, misc_1.getRootDir)(), data.relPath));
        }
    })).subscribe();
}
exports.doTsconfig = doTsconfig;
//# sourceMappingURL=cli-tsconfig-hook.js.map