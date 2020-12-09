"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
exports.init = void 0;
const injector_factory_1 = require("@wfh/plink/wfh/dist/injector-factory");
const path_1 = __importDefault(require("path"));
const ngDevkitNode = __importStar(require("@angular-devkit/core/node"));
const ng_ts_replace_1 = __importDefault(require("../ng-ts-replace"));
const read_hook_vfshost_1 = __importDefault(require("../utils/read-hook-vfshost"));
const fs = __importStar(require("fs"));
function init() {
    const hooker = new ng_ts_replace_1.default(require.resolve('@wfh/plink/wfh/tsconfig-base.json'), false);
    class HackedHost extends read_hook_vfshost_1.default {
        constructor() {
            super(fs, hooker.hookFunc);
        }
    }
    injector_factory_1.nodeInjector.fromDir(path_1.default.resolve('node_modules/@ngtools/webpack'))
        .factory('@angular-devkit/core/node', (file) => {
        return Object.assign(Object.assign({}, ngDevkitNode), { NodeJsSyncHost: HackedHost });
    });
}
exports.init = init;

//# sourceMappingURL=hack-type-checker.js.map
