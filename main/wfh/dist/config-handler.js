"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigHandlerMgr = void 0;
const tslib_1 = require("tslib");
/* eslint-disable  no-console */
const Path = tslib_1.__importStar(require("path"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const log4js_1 = require("log4js");
const misc_1 = require("./utils/misc");
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { cyan } = chalk_1.default;
const log = (0, log4js_1.getLogger)('plink.config-handler');
class ConfigHandlerMgr {
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
exports.ConfigHandlerMgr = ConfigHandlerMgr;
ConfigHandlerMgr._tsNodeRegistered = false;
//# sourceMappingURL=config-handler.js.map