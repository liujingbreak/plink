"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseName = void 0;
const tslib_1 = require("tslib");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const packageNodeInstance_1 = tslib_1.__importDefault(require("../packageNodeInstance"));
const misc_1 = require("../utils/misc");
const path_1 = require("path");
/**
 * @deprecated
 */
class LazyPackageFactory {
    constructor(packagesIterable) {
        this.packagesIterable = packagesIterable;
    }
    getPackageByPath(file) {
        if (this.packagePathMap == null) {
            this.packagePathMap = new dir_tree_1.DirTree();
            for (const info of this.packagesIterable) {
                const pk = createPackage(info);
                this.packagePathMap.putData(info.realPath, pk);
                this.packagePathMap.putData((0, path_1.resolve)(misc_1.plinkEnv.workDir, info.path), pk);
            }
        }
        let found;
        found = this.packagePathMap.getAllData(file);
        if (found.length > 0)
            return found[found.length - 1];
        return null;
    }
}
exports.default = LazyPackageFactory;
function parseName(longName) {
    const match = /^(?:@([^/]+)\/)?(\S+)/.exec(longName);
    if (match) {
        return {
            scope: match[1],
            name: match[2]
        };
    }
    return { name: longName };
}
exports.parseName = parseName;
function createPackage(info) {
    const instance = new packageNodeInstance_1.default({
        longName: info.name,
        shortName: parseName(info.name).name,
        path: (0, path_1.resolve)(misc_1.plinkEnv.workDir, info.path),
        realPath: info.realPath,
        json: info.json
    });
    // let noParseFiles: string[] | undefined;
    // if (info.json.dr) {
    //   if (info.json.dr.noParse) {
    //     noParseFiles = [].concat(info.json.dr.noParse).map(trimNoParseSetting);
    //   }
    //   if (info.json.dr.browserifyNoParse) {
    //     noParseFiles = [].concat(info.json.dr.browserifyNoParse).map(trimNoParseSetting);
    //   }
    // }
    return instance;
}
// function trimNoParseSetting(p: string) {
//   p = p.replace(/\\/g, '/');
//   if (p.startsWith('./')) {
//     p = p.substring(2);
//   }
//   return p;
// }
//# sourceMappingURL=lazy-package-factory.js.map