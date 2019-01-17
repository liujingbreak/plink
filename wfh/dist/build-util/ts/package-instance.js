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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbnN0YW5jZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL2J1aWxkLXV0aWwvdHMvcGFja2FnZS1pbnN0YW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx5Q0FBeUM7QUFDekMsa0RBQTRCO0FBRTVCLE1BQXFCLHNCQUFzQjtJQXVCMUMsWUFBWSxLQUFVO1FBQ3JCLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxzQkFBc0IsQ0FBQyxFQUFFO1lBQzlDLE9BQU8sSUFBSSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN6QztRQUNELElBQUksS0FBSyxFQUFFO1lBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNqQjtJQUNGLENBQUM7SUFDRCxJQUFJLENBQUMsS0FBVTtRQUNkLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RCLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDakMsSUFBSSxVQUFVLEVBQUU7WUFDZixJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDakMsSUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDO1NBQ2xDO0lBQ0YsQ0FBQztJQUNELFFBQVE7UUFDUCxPQUFPLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3BDLENBQUM7Q0FDRDtBQTFDRCx5Q0EwQ0M7QUFDRCxtREFBNkI7QUFDN0IsK0NBQXlCO0FBQ3pCLDZEQUF1RDtBQUN2RCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsaURBQWlELENBQUMsQ0FBQztBQUNoRixNQUFhLGtCQUFrQjtJQUEvQjtRQUNDLG1CQUFjLEdBQUcsSUFBSSxrQkFBTyxFQUEwQixDQUFDO0lBc0J4RCxDQUFDO0lBcEJBLGdCQUFnQixDQUFDLElBQVk7UUFDNUIsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLElBQUksS0FBK0IsQ0FBQztRQUNwQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDbkIsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNoQyxPQUFPLElBQUksRUFBRTtZQUNaLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbkMsSUFBSSxHQUFHLEtBQUssUUFBUTtnQkFDbkIsTUFBTSxDQUFDLG1CQUFtQjtZQUMzQixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsRUFBRTtnQkFDbEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZELE1BQU0sRUFBRSxHQUFHLGFBQWEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDckMsT0FBTyxFQUFFLENBQUM7YUFDVjtZQUNELFFBQVEsR0FBRyxHQUFHLENBQUM7U0FDZjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEO0FBdkJELGdEQXVCQztBQUVELFNBQVMsYUFBYSxDQUFDLFdBQW1CLEVBQUUsTUFBVztJQUN0RCxNQUFNLElBQUksR0FBVyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2pDLE1BQU0sUUFBUSxHQUFHLElBQUksc0JBQXNCLENBQUM7UUFDM0MsUUFBUSxFQUFFLEtBQUs7UUFDZixNQUFNLEVBQUUsSUFBSTtRQUNaLFFBQVEsRUFBRSxNQUFNLENBQUMsSUFBSTtRQUNyQixTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSTtRQUNuRCxXQUFXO1FBQ1gsZUFBZSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDO0tBQzdDLENBQUMsQ0FBQztJQUNILElBQUksVUFBb0IsRUFBRSxVQUFvQixDQUFDO0lBQy9DLElBQUkscUJBQXFCLEdBQUcsSUFBSSxDQUFDO0lBQ2pDLElBQUksWUFBc0IsQ0FBQztJQUMxQixJQUFJLE1BQU0sQ0FBQyxFQUFFLEVBQUU7UUFDZixJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFO1lBQ3hCLHFCQUFxQixHQUFHLEtBQUssQ0FBQztZQUM5QixVQUFVLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzVDO2FBQU0sSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRTtZQUMvQixxQkFBcUIsR0FBRyxJQUFJLENBQUM7WUFDN0IsVUFBVSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM1QztRQUNELElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUU7WUFDdEIsWUFBWSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztTQUNwRTtRQUNELElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRTtZQUNoQyxZQUFZLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7U0FDOUU7S0FDRDtJQUNELE1BQU0sUUFBUSxHQUFXLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQztJQUN2RCxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQ2IsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO1FBQzVFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtRQUNqQiw4REFBOEQ7UUFDOUQsVUFBVSxFQUFFLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ3hDLFVBQVU7UUFDVixVQUFVO1FBQ1YsaUJBQWlCLEVBQUUsWUFBWTtRQUMvQixxQkFBcUI7UUFDckIsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQztRQUNuRixFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7UUFDYixJQUFJLEVBQUUsTUFBTTtRQUNaLFFBQVEsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUM7UUFDdEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1FBQ3ZCLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSTtRQUN6RCxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDO0tBQ3BDLENBQUMsQ0FBQztJQUNILE9BQU8sUUFBUSxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLENBQVM7SUFDcEMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN2QixDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNuQjtJQUNELE9BQU8sQ0FBQyxDQUFDO0FBQ1YsQ0FBQyJ9