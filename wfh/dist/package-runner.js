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
const packageNodeInstance_1 = require("./packageNodeInstance");
const fs_1 = require("fs");
const path_1 = require("path");
const packageUtils = require('../lib/packageMgr/packageUtils');
// const {orderPackages} = require('../lib/packageMgr/packagePriorityHelper');
const log = require('log4js').getLogger('package-runner');
class ServerRunner {
    shutdownServer() {
        return __awaiter(this, void 0, void 0, function* () {
            log.info('shutting down');
            yield this._deactivatePackages(this.deactivatePackages);
        });
    }
    _deactivatePackages(comps) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const comp of comps) {
                const exp = require(comp.longName);
                if (_.isFunction(exp.deactivate)) {
                    log.info('deactivate', comp.longName);
                    yield Promise.resolve(exp.deactivate());
                }
            }
        });
    }
}
exports.ServerRunner = ServerRunner;
function runPackages(argv) {
    // const packageNames: string[] = argv.package;
    const pks = [];
    const hyPos = argv.fileExportFunc.indexOf('#');
    const fileToRun = argv.fileExportFunc.substring(0, hyPos);
    // const funcToRun = (argv.fileExportFunc as string).substring(hyPos + 1);
    packageUtils.findNodePackageByType('*', (name, entryPath, parsedName, pkJson, packagePath, isInstalled) => {
        const realPackagePath = fs_1.realpathSync(packagePath);
        const pkInstance = new packageNodeInstance_1.default({
            moduleName: name,
            shortName: parsedName.name,
            name,
            longName: name,
            scope: parsedName.scope,
            path: packagePath,
            json: pkJson,
            realPackagePath
        });
        console.log(path_1.join(packagePath, fileToRun));
        if (!fs_1.existsSync(path_1.join(packagePath, fileToRun)))
            return;
        pks.push(pkInstance);
    });
}
exports.runPackages = runPackages;
//# sourceMappingURL=package-runner.js.map