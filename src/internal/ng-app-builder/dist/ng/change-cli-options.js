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
const _ = require("lodash");
const Path = require("path");
const fs = require("fs");
const { cyan, green } = require('chalk');
function changeAngularCliOptions(config, browserOptions, builderConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const currPackageName = require('../../package.json').name;
        for (const prop of ['deployUrl', 'outputPath', 'styles']) {
            const value = config.get([currPackageName, prop]);
            if (value != null) {
                browserOptions[prop] = value;
                console.log(currPackageName + ' - override %s: %s', prop, value);
            }
        }
        config.configHandlerMgr().runEach((file, obj, handler) => {
            console.log(green('change-cli-options - ') + ' run', cyan(file));
            return handler.angularJson(browserOptions, builderConfig);
        });
        const pkJson = lookupEntryPackage(Path.resolve(builderConfig.root));
        if (pkJson) {
            console.log(green('change-cli-options - ') + `Set entry package ${cyan(pkJson.name)}'s output path to /`);
        }
        // config.set(['outputPathMap', ngEntryComponent.longName], '/');
        // Be compatible to old DRCP build tools
        const { deployUrl } = browserOptions;
        if (!config.get('staticAssetsURL'))
            config.set('staticAssetsURL', _.trimEnd(deployUrl, '/'));
        if (!config.get('publicPath'))
            config.set('publicPath', deployUrl);
        reduceTsConfig(browserOptions);
    });
}
exports.default = changeAngularCliOptions;
const typescript_1 = require("typescript");
// import Path = require('path');
// const log = require('log4js').getLogger('reduceTsConfig');
// Hack ts.sys, so far it is used to read tsconfig.json
function reduceTsConfig(browserOptions) {
    const oldReadFile = typescript_1.sys.readFile;
    typescript_1.sys.readFile = function (path, encoding) {
        const res = oldReadFile.apply(typescript_1.sys, arguments);
        // TODO:
        // if (path === Path.resolve(browserOptions.tsConfig))
        // 	log.warn(path + '\n' + res);
        return res;
    };
}
function lookupEntryPackage(lookupDir) {
    while (true) {
        const pk = Path.join(lookupDir, 'package.json');
        if (fs.existsSync(pk)) {
            return require(pk);
        }
        else if (lookupDir === Path.dirname(lookupDir)) {
            break;
        }
        lookupDir = Path.dirname(lookupDir);
    }
    return null;
}

//# sourceMappingURL=change-cli-options.js.map
