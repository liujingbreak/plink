"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console */
const Path = tslib_1.__importStar(require("path"));
// import vm = require('vm');
// import * as fs from 'fs';
const ts_compiler_1 = require("./ts-compiler");
const { cyan, green } = require('chalk');
class ConfigHandlerMgr {
    static initConfigHandlers(files) {
        // const files = browserOptions.drcpConfig ? browserOptions.drcpConfig.split(/\s*[,;:]\s*/) : [];
        const exporteds = [];
        const compilerOpt = ts_compiler_1.readTsConfig(require.resolve('dr-comp-package/wfh/tsconfig.json'));
        delete compilerOpt.rootDir;
        delete compilerOpt.rootDirs;
        ts_compiler_1.registerExtension('.ts', compilerOpt);
        files.forEach(file => {
            const exp = require(Path.resolve(file));
            exporteds.push({ file, handler: exp.default ? exp.default : exp });
        });
        return exporteds;
    }
    constructor(files) {
        this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files);
    }
    /**
     *
     * @param func parameters: (filePath, last returned result, handler function),
     * returns the changed result, keep the last result, if resturns undefined
     * @returns last result
     */
    runEach(func) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let lastRes;
            for (const { file, handler } of this.configHandlers) {
                console.log(green(Path.basename(__filename, '.js') + ' - ') + ' run', cyan(file));
                const currRes = yield func(file, lastRes, handler);
                if (currRes !== undefined)
                    lastRes = currRes;
            }
            return lastRes;
        });
    }
}
exports.ConfigHandlerMgr = ConfigHandlerMgr;
//# sourceMappingURL=config-handler.js.map