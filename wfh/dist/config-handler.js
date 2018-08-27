"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const Path = require("path");
const vm = require("vm");
const fs = require("fs");
const ts_compiler_1 = require("./ts-compiler");
const { cyan, green } = require('chalk');
class ConfigHandlerMgr {
    static initConfigHandlers(files) {
        // const files = browserOptions.drcpConfig ? browserOptions.drcpConfig.split(/\s*[,;:]\s*/) : [];
        const exporteds = [];
        const compilerOpt = ts_compiler_1.readTsConfig(require.resolve('dr-comp-package/wfh/tsconfig.json'));
        files.forEach(file => {
            if (file.endsWith('.ts')) {
                console.log('ConfigHandlerMgr compile', file);
                const jscode = ts_compiler_1.transpileSingleTs(fs.readFileSync(Path.resolve(file), 'utf8'), compilerOpt);
                console.log(jscode);
                const mod = { exports: {} };
                const context = vm.createContext({ module: mod, exports: mod.exports, console, process, require });
                try {
                    vm.runInContext(jscode, context, { filename: file });
                }
                catch (ex) {
                    console.error(ex);
                    throw ex;
                }
                exporteds.push({ file, handler: mod.exports.default });
            }
            else if (file.endsWith('.js')) {
                const exp = require(Path.resolve(file));
                exporteds.push({ file, handler: exp.default ? exp.default : exp });
            }
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
     */
    runEach(func) {
        return __awaiter(this, void 0, void 0, function* () {
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