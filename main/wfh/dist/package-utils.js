"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllPackages = exports.lookForPackages = exports.createLazyPackageFileFinder = void 0;
const lru_cache_1 = __importDefault(require("lru-cache"));
const lazy_package_factory_1 = __importDefault(require("./build-util/ts/lazy-package-factory"));
const recipeMgr = __importStar(require("./recipe-manager"));
const Path = __importStar(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = __importDefault(require("log4js"));
const fs = __importStar(require("fs"));
const log = log4js_1.default.getLogger('wfh.package-utils');
const oldPu = require('../lib/packageMgr/packageUtils');
const lazyPackageFactory = new lazy_package_factory_1.default();
function createLazyPackageFileFinder() {
    const cache = new lru_cache_1.default({ max: 20, maxAge: 20000 });
    return function (file) {
        let found = cache.get(file);
        if (!found) {
            found = lazyPackageFactory.getPackageByPath(file);
            if (found)
                cache.set(file, found);
        }
        return found;
    };
}
exports.createLazyPackageFileFinder = createLazyPackageFileFinder;
function lookForPackages(packageList, cb) {
    return oldPu.lookForPackages(packageList, cb);
}
exports.lookForPackages = lookForPackages;
function findAllPackages(arg1, arg2, arg3, arg4) {
    oldPu.findAllPackages.apply(oldPu, arguments);
}
exports.findAllPackages = findAllPackages;
var recipe_manager_1 = require("./recipe-manager");
Object.defineProperty(exports, "eachRecipe", { enumerable: true, get: function () { return recipe_manager_1.eachRecipe; } });
class EntryFileFinder {
    constructor(resolveFn) {
        this.resolveFn = resolveFn;
        this.packageRecipeMap = {};
    }
    findByRecipeJson(recipePkjsonFile, isInstalled, eachCallback) {
        const resolveFn = this.resolveFn;
        const self = this;
        const pj = JSON.parse(fs.readFileSync(recipePkjsonFile, 'utf-8'));
        if (!pj.dependencies) {
            return;
        }
        lodash_1.default.forOwn(Object.assign({}, pj.dependencies, pj.devDependencies), function (version, name) {
            if (isInstalled) {
                if (lodash_1.default.has(self.packageRecipeMap, name)) {
                    log.warn('Duplicate component dependency "%s" found in "%s" and "%s"', name, self.packageRecipeMap[name], recipePkjsonFile);
                    return;
                }
                self.packageRecipeMap[name] = recipePkjsonFile;
            }
            var parsedName = parseName(name);
            var packagePath = resolveFn.findPackagePath(name);
            if (!packagePath) {
                log.debug('Package %s does not exist', chalk.cyan(name));
                return;
            }
            var packageJsonFile = Path.join(packagePath, 'package.json');
            var json = JSON.parse(fs.readFileSync(packageJsonFile, 'utf-8'));
            var entryPath;
            // if (typeof (json.browser || json.main)
            // 	entryPath = Path.resolve(packagePath, json.browser || json.main);
            // else
            // 	entryPath = null;
            eachCallback(name, entryPath, parsedName, json, packagePath);
        });
    }
}
function _findPackageByType(_types, callback, resolver, recipeType, projectDir) {
    const entryFileFindler = new EntryFileFinder(resolver);
    const types = [].concat(_types);
    const srcCompSet = new Map();
    // tslint:disable-next-line: max-line-length
    // To avoid return duplicate components, some times duplicate component in associated projects, installed recipe or peer
    // dependency (recipe)
    if (recipeType === 'src') {
        recipeMgr.eachRecipeSrc(projectDir, (src, recipeDir) => {
            if (recipeDir)
                findEntryFiles(Path.resolve(recipeDir, 'package.json'), false);
        });
    }
    else if (recipeType === 'installed') {
        recipeMgr.eachInstalledRecipe((dir, isInstalled, fileName) => {
            return findEntryFiles(Path.resolve(dir, fileName), true);
        });
    }
    else {
        recipeMgr.eachRecipe((recipeDir, isInstalled, fileName) => {
            findEntryFiles(Path.resolve(recipeDir, fileName), isInstalled);
        });
    }
    function findEntryFiles(recipe, isInstalled) {
        entryFileFindler.findByRecipeJson(recipe, isInstalled, function (name, entryPath, parsedName, pkJson, packagePath) {
            if (!lodash_1.default.has(pkJson, 'dr'))
                return;
            var packageType = lodash_1.default.get(pkJson, 'dr.type');
            packageType = packageType ? [].concat(packageType) : [];
            const existing = srcCompSet.get(name);
            if (existing && existing[0] === isInstalled && existing[1] !== recipe) {
                console.error('Duplicate package %s found in recipe "%s" and "%s"', name, recipe, srcCompSet.get(name));
            }
            if (existing)
                return;
            srcCompSet.set(name, [isInstalled, recipe]);
            if (lodash_1.default.includes(types, '*') || lodash_1.default.intersection(types, packageType).length > 0) {
                // _checkDuplicate(packageSet, name, parsedName, pkJson, packagePath);
                callback(name, entryPath, parsedName, pkJson, packagePath, isInstalled);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhY2thZ2UtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBEQUE0QjtBQUU1QixnR0FBc0U7QUFDdEUsNERBQThDO0FBQzlDLDJDQUE2QjtBQUM3QixvREFBdUI7QUFDdkIsb0RBQTRCO0FBQzVCLHVDQUF5QjtBQUN6QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBRXhELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSw4QkFBa0IsRUFBRSxDQUFDO0FBRXBELFNBQWdCLDJCQUEyQjtJQUN6QyxNQUFNLEtBQUssR0FBRyxJQUFJLG1CQUFHLENBQWlDLEVBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztJQUNoRixPQUFPLFVBQVMsSUFBWTtRQUMxQixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDVixLQUFLLEdBQUcsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFFLENBQUM7WUFDbkQsSUFBSSxLQUFLO2dCQUNQLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQzFCO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDLENBQUM7QUFDSixDQUFDO0FBWEQsa0VBV0M7QUFTRCxTQUFnQixlQUFlLENBQUMsV0FBcUIsRUFBRSxFQUFpQjtJQUN0RSxPQUFPLEtBQUssQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ2hELENBQUM7QUFGRCwwQ0FFQztBQVdE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Q0FBQztZQUN4RCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RDLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxXQUFXLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sRUFBRTtnQkFDckUsT0FBTyxDQUFDLEtBQUssQ0FBQyxvREFBb0QsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN6RztZQUNELElBQUksUUFBUTtnQkFDVixPQUFPO1lBQ1QsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM1QyxJQUFJLGdCQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxnQkFBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDM0Usc0VBQXNFO2dCQUN0RSxRQUFRLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQzthQUN6RTtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5pbXBvcnQgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSBmcm9tICcuL2J1aWxkLXV0aWwvdHMvcGFja2FnZS1pbnN0YW5jZSc7XG5pbXBvcnQgTGF6eVBhY2thZ2VGYWN0b3J5IGZyb20gJy4vYnVpbGQtdXRpbC90cy9sYXp5LXBhY2thZ2UtZmFjdG9yeSc7XG5pbXBvcnQgKiBhcyByZWNpcGVNZ3IgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC5wYWNrYWdlLXV0aWxzJyk7XG5jb25zdCBvbGRQdSA9IHJlcXVpcmUoJy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuXG5jb25zdCBsYXp5UGFja2FnZUZhY3RvcnkgPSBuZXcgTGF6eVBhY2thZ2VGYWN0b3J5KCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKSB7XG4gIGNvbnN0IGNhY2hlID0gbmV3IExSVTxzdHJpbmcsIFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KHttYXg6IDIwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIHJldHVybiBmdW5jdGlvbihmaWxlOiBzdHJpbmcpOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIHwgdW5kZWZpbmVkIHtcbiAgICBsZXQgZm91bmQgPSBjYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgZm91bmQgPSBsYXp5UGFja2FnZUZhY3RvcnkuZ2V0UGFja2FnZUJ5UGF0aChmaWxlKSE7XG4gICAgICBpZiAoZm91bmQpXG4gICAgICAgIGNhY2hlLnNldChmaWxlLCBmb3VuZCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbiAgfTtcbn1cblxuZXhwb3J0IHR5cGUgRmluZFBhY2thZ2VDYiA9IChmdWxsTmFtZTogc3RyaW5nLFxuICBlbnRyeVBhdGg6IHN0cmluZyxcbiAgcGFyc2VkTmFtZToge25hbWU6IHN0cmluZywgc2NvcGU6IHN0cmluZ30sXG4gIGpzb246IGFueSxcbiAgcGFja2FnZVBhdGg6IHN0cmluZyxcbiAgaXNJbnN0YWxsZWQ6IGJvb2xlYW4pID0+IHZvaWQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBsb29rRm9yUGFja2FnZXMocGFja2FnZUxpc3Q6IHN0cmluZ1tdLCBjYjogRmluZFBhY2thZ2VDYik6IHZvaWQge1xuICByZXR1cm4gb2xkUHUubG9va0ZvclBhY2thZ2VzKHBhY2thZ2VMaXN0LCBjYik7XG59XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VUeXBlID0gJyonIHwgJ2J1aWxkJyB8ICdjb3JlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlcyhjYWxsYmFjazogRmluZFBhY2thZ2VDYixcbiAgcmVjaXBlVHlwZT86ICdzcmMnIHwgJ2luc3RhbGxlZCcsXG4gIHByb2plY3REaXI/OiBzdHJpbmcgfCBzdHJpbmdbXSk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZmluZEFsbFBhY2thZ2VzKHBhY2thZ2VMaXN0OiBzdHJpbmdbXSB8IHN0cmluZyxcbiAgY2FsbGJhY2s6IEZpbmRQYWNrYWdlQ2IsXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLFxuICBwcm9qZWN0RGlyPzogc3RyaW5nIHwgc3RyaW5nW10pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlcyhhcmcxOiBzdHJpbmdbXSB8IHN0cmluZyB8IEZpbmRQYWNrYWdlQ2IsXG4gIGFyZzI/OiBGaW5kUGFja2FnZUNiIHwgJ3NyYycgfCAnaW5zdGFsbGVkJyxcbiAgYXJnMz86IHN0cmluZyB8IHN0cmluZ1tdLFxuICBhcmc0Pzogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgb2xkUHUuZmluZEFsbFBhY2thZ2VzLmFwcGx5KG9sZFB1LCBhcmd1bWVudHMpO1xufVxuXG5leHBvcnQge2VhY2hSZWNpcGV9IGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuXG5jbGFzcyBFbnRyeUZpbGVGaW5kZXIge1xuICBwcml2YXRlIHBhY2thZ2VSZWNpcGVNYXA6IHtba2V5OiBzdHJpbmddOiBhbnl9ID0ge307XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZXNvbHZlRm46IHVua25vd24pIHtcblxuICB9XG5cbiAgZmluZEJ5UmVjaXBlSnNvbihyZWNpcGVQa2pzb25GaWxlOiBzdHJpbmcsIGlzSW5zdGFsbGVkOiBib29sZWFuLFxuICAgIGVhY2hDYWxsYmFjazogKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHVua25vd24sIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4gdm9pZCkge1xuICAgIGNvbnN0IHJlc29sdmVGbiA9IHRoaXMucmVzb2x2ZUZuO1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IHBqID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocmVjaXBlUGtqc29uRmlsZSwgJ3V0Zi04JykpO1xuICAgIGlmICghcGouZGVwZW5kZW5jaWVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgXy5mb3JPd24oT2JqZWN0LmFzc2lnbih7fSwgcGouZGVwZW5kZW5jaWVzLCBwai5kZXZEZXBlbmRlbmNpZXMpLCBmdW5jdGlvbih2ZXJzaW9uLCBuYW1lKSB7XG4gICAgICBpZiAoaXNJbnN0YWxsZWQpIHtcbiAgICAgICAgaWYgKF8uaGFzKHNlbGYucGFja2FnZVJlY2lwZU1hcCwgbmFtZSkpIHtcbiAgICAgICAgICBsb2cud2FybignRHVwbGljYXRlIGNvbXBvbmVudCBkZXBlbmRlbmN5IFwiJXNcIiBmb3VuZCBpbiBcIiVzXCIgYW5kIFwiJXNcIicsXG4gICAgICAgICAgICBuYW1lLCBzZWxmLnBhY2thZ2VSZWNpcGVNYXBbbmFtZV0sIHJlY2lwZVBranNvbkZpbGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLnBhY2thZ2VSZWNpcGVNYXBbbmFtZV0gPSByZWNpcGVQa2pzb25GaWxlO1xuICAgICAgfVxuICAgICAgdmFyIHBhcnNlZE5hbWUgPSBwYXJzZU5hbWUobmFtZSk7XG4gICAgICB2YXIgcGFja2FnZVBhdGggPSByZXNvbHZlRm4uZmluZFBhY2thZ2VQYXRoKG5hbWUpO1xuICAgICAgaWYgKCFwYWNrYWdlUGF0aCkge1xuICAgICAgICBsb2cuZGVidWcoJ1BhY2thZ2UgJXMgZG9lcyBub3QgZXhpc3QnLCBjaGFsay5jeWFuKG5hbWUpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIHBhY2thZ2VKc29uRmlsZSA9IFBhdGguam9pbihwYWNrYWdlUGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgdmFyIGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvbkZpbGUsICd1dGYtOCcpKTtcbiAgICAgIHZhciBlbnRyeVBhdGg7XG4gICAgICAvLyBpZiAodHlwZW9mIChqc29uLmJyb3dzZXIgfHwganNvbi5tYWluKVxuICAgICAgLy8gXHRlbnRyeVBhdGggPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGpzb24uYnJvd3NlciB8fCBqc29uLm1haW4pO1xuICAgICAgLy8gZWxzZVxuICAgICAgLy8gXHRlbnRyeVBhdGggPSBudWxsO1xuXG4gICAgICBlYWNoQ2FsbGJhY2sobmFtZSwgZW50cnlQYXRoLCBwYXJzZWROYW1lLCBqc29uLCBwYWNrYWdlUGF0aCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2ZpbmRQYWNrYWdlQnlUeXBlKF90eXBlczogUGFja2FnZVR5cGUgfCBQYWNrYWdlVHlwZVtdLFxuICBjYWxsYmFjazogRmluZFBhY2thZ2VDYiwgcmVzb2x2ZXIsIHJlY2lwZVR5cGU6ICdzcmMnIHwgJ2luc3RhbGxlZCcsIHByb2plY3REaXI6IHN0cmluZykge1xuXG4gIGNvbnN0IGVudHJ5RmlsZUZpbmRsZXIgPSBuZXcgRW50cnlGaWxlRmluZGVyKHJlc29sdmVyKTtcbiAgY29uc3QgdHlwZXMgPSAoW10gYXMgUGFja2FnZVR5cGVbXSkuY29uY2F0KF90eXBlcyk7XG5cbiAgY29uc3Qgc3JjQ29tcFNldCA9IG5ldyBNYXAoKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgLy8gVG8gYXZvaWQgcmV0dXJuIGR1cGxpY2F0ZSBjb21wb25lbnRzLCBzb21lIHRpbWVzIGR1cGxpY2F0ZSBjb21wb25lbnQgaW4gYXNzb2NpYXRlZCBwcm9qZWN0cywgaW5zdGFsbGVkIHJlY2lwZSBvciBwZWVyXG4gIC8vIGRlcGVuZGVuY3kgKHJlY2lwZSlcblxuICBpZiAocmVjaXBlVHlwZSA9PT0gJ3NyYycpIHtcbiAgICByZWNpcGVNZ3IuZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyLCAoc3JjLCByZWNpcGVEaXIpID0+IHtcbiAgICAgIGlmIChyZWNpcGVEaXIpXG4gICAgICAgIGZpbmRFbnRyeUZpbGVzKFBhdGgucmVzb2x2ZShyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSwgZmFsc2UpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHJlY2lwZVR5cGUgPT09ICdpbnN0YWxsZWQnKSB7XG4gICAgcmVjaXBlTWdyLmVhY2hJbnN0YWxsZWRSZWNpcGUoKGRpciwgaXNJbnN0YWxsZWQsIGZpbGVOYW1lKSA9PiB7XG4gICAgICByZXR1cm4gZmluZEVudHJ5RmlsZXMoUGF0aC5yZXNvbHZlKGRpciwgZmlsZU5hbWUpLCB0cnVlKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZWNpcGVNZ3IuZWFjaFJlY2lwZSgocmVjaXBlRGlyLCBpc0luc3RhbGxlZCwgZmlsZU5hbWUpID0+IHtcbiAgICAgIGZpbmRFbnRyeUZpbGVzKFBhdGgucmVzb2x2ZShyZWNpcGVEaXIsIGZpbGVOYW1lKSwgaXNJbnN0YWxsZWQpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZEVudHJ5RmlsZXMocmVjaXBlOiBzdHJpbmcsIGlzSW5zdGFsbGVkOiBib29sZWFuKSB7XG4gICAgZW50cnlGaWxlRmluZGxlci5maW5kQnlSZWNpcGVKc29uKHJlY2lwZSwgaXNJbnN0YWxsZWQsIGZ1bmN0aW9uKG5hbWUsIGVudHJ5UGF0aCwgcGFyc2VkTmFtZSwgcGtKc29uLCBwYWNrYWdlUGF0aCkge1xuICAgICAgaWYgKCFfLmhhcyhwa0pzb24sICdkcicpKVxuICAgICAgICByZXR1cm47XG4gICAgICB2YXIgcGFja2FnZVR5cGUgPSBfLmdldChwa0pzb24sICdkci50eXBlJyk7XG4gICAgICBwYWNrYWdlVHlwZSA9IHBhY2thZ2VUeXBlID8gW10uY29uY2F0KHBhY2thZ2VUeXBlKSA6IFtdO1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBzcmNDb21wU2V0LmdldChuYW1lKTtcbiAgICAgIGlmIChleGlzdGluZyAmJiBleGlzdGluZ1swXSA9PT0gaXNJbnN0YWxsZWQgJiYgZXhpc3RpbmdbMV0gIT09IHJlY2lwZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdEdXBsaWNhdGUgcGFja2FnZSAlcyBmb3VuZCBpbiByZWNpcGUgXCIlc1wiIGFuZCBcIiVzXCInLCBuYW1lLCByZWNpcGUsIHNyY0NvbXBTZXQuZ2V0KG5hbWUpKTtcbiAgICAgIH1cbiAgICAgIGlmIChleGlzdGluZylcbiAgICAgICAgcmV0dXJuO1xuICAgICAgc3JjQ29tcFNldC5zZXQobmFtZSwgW2lzSW5zdGFsbGVkLCByZWNpcGVdKTtcbiAgICAgIGlmIChfLmluY2x1ZGVzKHR5cGVzLCAnKicpIHx8IF8uaW50ZXJzZWN0aW9uKHR5cGVzLCBwYWNrYWdlVHlwZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBfY2hlY2tEdXBsaWNhdGUocGFja2FnZVNldCwgbmFtZSwgcGFyc2VkTmFtZSwgcGtKc29uLCBwYWNrYWdlUGF0aCk7XG4gICAgICAgIGNhbGxiYWNrKG5hbWUsIGVudHJ5UGF0aCwgcGFyc2VkTmFtZSwgcGtKc29uLCBwYWNrYWdlUGF0aCwgaXNJbnN0YWxsZWQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG4iXX0=