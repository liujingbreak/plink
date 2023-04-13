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
exports.ConfigHandlerMgr = void 0;
/* eslint-disable  no-console */
const Path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = require("log4js");
const misc_1 = require("./utils/misc");
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { cyan } = chalk_1.default;
const log = (0, log4js_1.getLogger)('plink.config-handler');
class ConfigHandlerMgr {
    static initConfigHandlers(fileAndExports, rootPath) {
        const exporteds = [];
        if (!ConfigHandlerMgr._tsNodeRegistered) {
            ConfigHandlerMgr._tsNodeRegistered = true;
            require('./utils/tsc-util').registerNode();
        }
        for (const [file, exportName] of fileAndExports) {
            const absFile = Path.isAbsolute(file) ? file : Path.resolve(file);
            const exp = require(absFile);
            exporteds.push({ file, handler: exp[exportName] ? exp[exportName] : exp });
        }
        return exporteds;
    }
    /**
     *
     * @param files Array of string which is in form of "<file>[#<export name>]"
     */
    constructor(fileAndExports0) {
        const first = fileAndExports0[Symbol.iterator]().next();
        let fileAndExports;
        if (!first.done && typeof first.value === 'string') {
            fileAndExports = Array.from(fileAndExports0).map(file => [file, 'default']);
        }
        else {
            fileAndExports = fileAndExports0;
        }
        this.configHandlers = ConfigHandlerMgr.initConfigHandlers(fileAndExports, (0, misc_1.getRootDir)());
    }
    /**
       *
       * @param func parameters: (filePath, last returned result, handler function),
       * returns the changed result, keep the last result, if resturns undefined
       * @returns last result
       */
    async runEach(func, desc) {
        let lastRes;
        for (const { file, handler } of this.configHandlers) {
            log.debug(`Read ${desc || 'settings'}:\n  ` + cyan(file));
            const currRes = await func(file, lastRes, handler);
            if (currRes !== undefined)
                lastRes = currRes;
        }
        return lastRes;
    }
    runEachSync(func, desc) {
        let lastRes;
        const cwd = (0, misc_1.getWorkDir)();
        for (const { file, handler } of this.configHandlers) {
            log.debug(`Read ${desc || 'settings'}:\n  ` + cyan(Path.relative(cwd, file)));
            const currRes = func(file, lastRes, handler);
            if (currRes !== undefined)
                lastRes = currRes;
        }
        return lastRes;
    }
}
ConfigHandlerMgr._tsNodeRegistered = false;
exports.ConfigHandlerMgr = ConfigHandlerMgr;
//# sourceMappingURL=config-handler.js.map