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
function changeAngularCliOptions(config, browserOptions, configHandlers, builderConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const currPackageName = require('../../package.json').name;
        for (const prop of ['deployUrl', 'outputPath', 'styles']) {
            const value = config.get([currPackageName, prop]);
            if (value != null) {
                browserOptions[prop] = value;
                console.log(currPackageName + ' - override %s: %s', prop, value);
            }
        }
        for (const { file, handler } of configHandlers) {
            console.log('Run %s angularJson()', file);
            yield handler.angularJson(browserOptions, config);
        }
        reduceTsConfig(browserOptions);
    });
}
exports.default = changeAngularCliOptions;
const typescript_1 = require("typescript");
const Path = require("path");
const log = require('log4js').getLogger('reduceTsConfig');
// Hack ts.sys, so far it is used to read tsconfig.json
function reduceTsConfig(browserOptions) {
    const oldReadFile = typescript_1.sys.readFile;
    typescript_1.sys.readFile = function (path, encoding) {
        const res = oldReadFile.apply(typescript_1.sys, arguments);
        if (path === Path.resolve(browserOptions.tsConfig))
            log.warn(path + '\n' + res);
        return res;
    };
}

//# sourceMappingURL=change-cli-options.js.map
