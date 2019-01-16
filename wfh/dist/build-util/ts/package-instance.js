"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-classes-per-file */
const _ = tslib_1.__importStar(require("lodash"));
class PackageBrowserInstance {
    constructor(attrs) {
        if (!(this instanceof PackageBrowserInstance)) {
            return new PackageBrowserInstance(attrs);
        }
        if (attrs) {
            this.init(attrs);
        }
    }
    init(attrs) {
        _.assign(this, attrs);
        var parsedName = this.parsedName;
        if (parsedName) {
            this.shortName = parsedName.name;
            this.scopeName = parsedName.scope;
        }
    }
    toString() {
        return 'Package: ' + this.longName;
    }
}
exports.default = PackageBrowserInstance;
const Path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const dir_tree_1 = require("require-injector/dist/dir-tree");
const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');
class LazyPackageFactory {
    constructor() {
        this.packagePathMap = new dir_tree_1.DirTree();
    }
    getPackageByPath(file) {
        let currPath = file;
        let found;
        found = this.packagePathMap.getAllData(file);
        if (found.length > 0)
            return found[found.length - 1];
        while (true) {
            const dir = Path.dirname(currPath);
            if (dir === currPath)
                break; // Has reached root
            if (fs.existsSync(Path.join(dir, 'package.json'))) {
                const pkjson = require(Path.join(dir, 'package.json'));
                const pk = createPackage(dir, pkjson);
                this.packagePathMap.putData(dir, pk);
                return pk;
            }
            currPath = dir;
        }
        return null;
    }
}
exports.LazyPackageFactory = LazyPackageFactory;
function createPackage(packagePath, pkJson) {
    const name = pkJson.name;
    const instance = new PackageBrowserInstance({
        isVendor: false,
        bundle: null,
        longName: pkJson.name,
        shortName: packageUtils.parseName(pkJson.name).name,
        packagePath,
        realPackagePath: fs.realpathSync(packagePath)
    });
    let entryViews, entryPages;
    let isEntryServerTemplate = true;
    let noParseFiles;
    if (pkJson.dr) {
        if (pkJson.dr.entryPage) {
            isEntryServerTemplate = false;
            entryPages = [].concat(pkJson.dr.entryPage);
        }
        else if (pkJson.dr.entryView) {
            isEntryServerTemplate = true;
            entryViews = [].concat(pkJson.dr.entryView);
        }
        if (pkJson.dr.noParse) {
            noParseFiles = [].concat(pkJson.dr.noParse).map(trimNoParseSetting);
        }
        if (pkJson.dr.browserifyNoParse) {
            noParseFiles = [].concat(pkJson.dr.browserifyNoParse).map(trimNoParseSetting);
        }
    }
    const mainFile = pkJson.browser || pkJson.main;
    instance.init({
        file: mainFile ? fs.realpathSync(Path.resolve(packagePath, mainFile)) : null,
        main: pkJson.main,
        // style: pkJson.style ? resolveStyle(name, nodePaths) : null,
        parsedName: packageUtils.parseName(name),
        entryPages,
        entryViews,
        browserifyNoParse: noParseFiles,
        isEntryServerTemplate,
        translatable: !_.has(pkJson, 'dr.translatable') || _.get(pkJson, 'dr.translatable'),
        dr: pkJson.dr,
        json: pkJson,
        compiler: _.get(pkJson, 'dr.compiler'),
        browser: pkJson.browser,
        i18n: pkJson.dr && pkJson.dr.i18n ? pkJson.dr.i18n : null,
        appType: _.get(pkJson, 'dr.appType')
    });
    return instance;
}
function trimNoParseSetting(p) {
    p = p.replace(/\\/g, '/');
    if (p.startsWith('./')) {
        p = p.substring(2);
    }
    return p;
}
//# sourceMappingURL=package-instance.js.map