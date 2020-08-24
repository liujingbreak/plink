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
const package_mgr_1 = require("./package-mgr");
const Path = __importStar(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = __importDefault(require("log4js"));
const fs = __importStar(require("fs"));
const utils_1 = require("./cmd/utils");
const log = log4js_1.default.getLogger('wfh.package-utils');
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
    for (const pkg of utils_1.findPackagesByNames(package_mgr_1.getState(), packageList)) {
        if (pkg == null)
            continue;
        cb(pkg.name, '', { name: pkg.shortName, scope: pkg.scope }, pkg.json, pkg.realPath, pkg.isInstalled);
    }
}
exports.lookForPackages = lookForPackages;
function findAllPackages(packageList, callback, recipeType, projectDir) {
    // oldPu.findAllPackages.apply(oldPu, arguments);
    if (lodash_1.default.isFunction(callback) && packageList) {
        lookForPackages([].concat(packageList), callback);
        return;
    }
    else if (lodash_1.default.isFunction(packageList)) {
        // arguments.length <= 2
        projectDir = recipeType;
        recipeType = callback;
        callback = packageList;
    }
    return _findPackageByType('*', callback, recipeType, projectDir);
}
exports.findAllPackages = findAllPackages;
var recipe_manager_1 = require("./recipe-manager");
Object.defineProperty(exports, "eachRecipe", { enumerable: true, get: function () { return recipe_manager_1.eachRecipe; } });
class EntryFileFinder {
    constructor() {
        this.packageRecipeMap = new Map();
    }
    findByRecipeJson(recipePkjsonFile, isInstalled, eachCallback) {
        const pj = JSON.parse(fs.readFileSync(recipePkjsonFile, 'utf-8'));
        if (!pj.dependencies) {
            return;
        }
        lodash_1.default.forOwn(Object.assign({}, pj.dependencies, pj.devDependencies), (version, name) => {
            if (isInstalled) {
                if (this.packageRecipeMap.has(name)) {
                    log.warn('Duplicate component dependency "%s" found in "%s" and "%s"', name, this.packageRecipeMap.get(name), recipePkjsonFile);
                    return;
                }
                this.packageRecipeMap.set(name, recipePkjsonFile);
            }
            const srcPkg = package_mgr_1.getState().srcPackages.get(name);
            if (srcPkg) {
                return eachCallback(srcPkg);
            }
            const pkJsonFile = utils_1.findPackageJsonPath(name);
            if (pkJsonFile == null) {
                log.warn('Package %s does not exist', name);
                return;
            }
            const pkg = package_mgr_1.createPackageInfo(pkJsonFile);
            eachCallback(pkg);
        });
    }
}
function _findPackageByType(_types, callback, recipeType, projectDir) {
    const entryFileFindler = new EntryFileFinder();
    const types = [].concat(_types);
    const srcCompSet = new Map();
    // tslint:disable-next-line: max-line-length
    // To avoid return duplicate components, some times duplicate component in associated projects, installed recipe or peer
    // dependency (recipe)
    if (recipeType === 'src') {
        if (projectDir) {
            recipeMgr.eachRecipeSrc(projectDir, (src, recipeDir) => {
                if (recipeDir)
                    findEntryFiles(Path.resolve(recipeDir, 'package.json'), false);
            });
        }
        else {
            recipeMgr.eachRecipeSrc((src, recipeDir) => {
                if (recipeDir)
                    findEntryFiles(Path.resolve(recipeDir, 'package.json'), false);
            });
        }
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
        entryFileFindler.findByRecipeJson(recipe, isInstalled, pkg => {
            if (!lodash_1.default.has(pkg.json, 'dr'))
                return;
            const name = pkg.name;
            var packageType = lodash_1.default.get(pkg.json, 'dr.type');
            packageType = packageType ? [].concat(packageType) : [];
            const existing = srcCompSet.get(pkg.name);
            if (existing && existing[0] === isInstalled && existing[1] !== recipe) {
                console.error('Duplicate package %s found in recipe "%s" and "%s"', name, recipe, srcCompSet.get(name));
            }
            if (existing)
                return;
            srcCompSet.set(name, [isInstalled, recipe]);
            if (lodash_1.default.includes(types, '*') || lodash_1.default.intersection(types, packageType).length > 0) {
                // _checkDuplicate(packageSet, name, parsedName, pkJson, packagePath);
                callback(name, '', { name: pkg.shortName, scope: pkg.scope }, pkg.json, pkg.realPath, isInstalled);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhY2thZ2UtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBEQUE0QjtBQUU1QixnR0FBc0U7QUFDdEUsNERBQThDO0FBQzlDLCtDQUF1RTtBQUN2RSwyQ0FBNkI7QUFDN0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsdUNBQXFFO0FBRXJFLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFbEQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLDhCQUFrQixFQUFFLENBQUM7QUFFcEQsU0FBZ0IsMkJBQTJCO0lBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksbUJBQUcsQ0FBaUMsRUFBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO0lBQ2hGLE9BQU8sVUFBUyxJQUFZO1FBQzFCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUUsQ0FBQztZQUNuRCxJQUFJLEtBQUs7Z0JBQ1AsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDMUI7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMsQ0FBQztBQUNKLENBQUM7QUFYRCxrRUFXQztBQVVELFNBQWdCLGVBQWUsQ0FBQyxXQUFxQixFQUFFLEVBQWlCO0lBQ3RFLEtBQUssTUFBTSxHQUFHLElBQUksMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxFQUFFO1FBQzlELElBQUksR0FBRyxJQUFJLElBQUk7WUFDYixTQUFT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LEdBQUcsQ0FBQyxJQUFJLGdCQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUMzRSxzRUFBc0U7Z0JBQ3RFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7YUFDbEc7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9idWlsZC11dGlsL3RzL3BhY2thZ2UtaW5zdGFuY2UnO1xuaW1wb3J0IExhenlQYWNrYWdlRmFjdG9yeSBmcm9tICcuL2J1aWxkLXV0aWwvdHMvbGF6eS1wYWNrYWdlLWZhY3RvcnknO1xuaW1wb3J0ICogYXMgcmVjaXBlTWdyIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHtQYWNrYWdlSW5mbywgY3JlYXRlUGFja2FnZUluZm8sIGdldFN0YXRlfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtmaW5kUGFja2FnZUpzb25QYXRoLCBmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL2NtZC91dGlscyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC5wYWNrYWdlLXV0aWxzJyk7XG5cbmNvbnN0IGxhenlQYWNrYWdlRmFjdG9yeSA9IG5ldyBMYXp5UGFja2FnZUZhY3RvcnkoKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpIHtcbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oe21heDogMjAsIG1heEFnZTogMjAwMDB9KTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCB1bmRlZmluZWQge1xuICAgIGxldCBmb3VuZCA9IGNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBmb3VuZCA9IGxhenlQYWNrYWdlRmFjdG9yeS5nZXRQYWNrYWdlQnlQYXRoKGZpbGUpITtcbiAgICAgIGlmIChmb3VuZClcbiAgICAgICAgY2FjaGUuc2V0KGZpbGUsIGZvdW5kKTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBGaW5kUGFja2FnZUNiID0gKGZ1bGxOYW1lOiBzdHJpbmcsXG4gIC8qKiBARGVwcmVjYXRlZCBlbXB0eSBzdHJpbmcgKi9cbiAgZW50cnlQYXRoOiBzdHJpbmcsXG4gIHBhcnNlZE5hbWU6IHtuYW1lOiBzdHJpbmcsIHNjb3BlOiBzdHJpbmd9LFxuICBqc29uOiBhbnksXG4gIHBhY2thZ2VQYXRoOiBzdHJpbmcsXG4gIGlzSW5zdGFsbGVkOiBib29sZWFuKSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gbG9va0ZvclBhY2thZ2VzKHBhY2thZ2VMaXN0OiBzdHJpbmdbXSwgY2I6IEZpbmRQYWNrYWdlQ2IpOiB2b2lkIHtcbiAgZm9yIChjb25zdCBwa2cgb2YgZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBwYWNrYWdlTGlzdCkpIHtcbiAgICBpZiAocGtnID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBjYihwa2cubmFtZSwgJycsIHtuYW1lOiBwa2cuc2hvcnROYW1lLCBzY29wZTogcGtnLnNjb3BlfSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgcGtnLmlzSW5zdGFsbGVkKTtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBQYWNrYWdlVHlwZSA9ICcqJyB8ICdidWlsZCcgfCAnY29yZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWxsUGFja2FnZXMoY2FsbGJhY2s6IEZpbmRQYWNrYWdlQ2IsXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLFxuICBwcm9qZWN0RGlyPzogc3RyaW5nIHwgc3RyaW5nW10pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlcyhwYWNrYWdlTGlzdDogc3RyaW5nW10gfCBzdHJpbmcsXG4gIGNhbGxiYWNrOiBGaW5kUGFja2FnZUNiLFxuICByZWNpcGVUeXBlPzogJ3NyYycgfCAnaW5zdGFsbGVkJyxcbiAgcHJvamVjdERpcj86IHN0cmluZyB8IHN0cmluZ1tdKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWxsUGFja2FnZXMocGFja2FnZUxpc3Q6IHN0cmluZ1tdIHwgc3RyaW5nIHwgRmluZFBhY2thZ2VDYixcbiAgY2FsbGJhY2s/OiBGaW5kUGFja2FnZUNiIHwgJ3NyYycgfCAnaW5zdGFsbGVkJyxcbiAgcmVjaXBlVHlwZT86IHN0cmluZyB8IHN0cmluZ1tdLFxuICBwcm9qZWN0RGlyPzogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgLy8gb2xkUHUuZmluZEFsbFBhY2thZ2VzLmFwcGx5KG9sZFB1LCBhcmd1bWVudHMpO1xuXG4gIGlmIChfLmlzRnVuY3Rpb24oY2FsbGJhY2spICYmIHBhY2thZ2VMaXN0KSB7XG4gICAgbG9va0ZvclBhY2thZ2VzKChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHBhY2thZ2VMaXN0IGFzIChzdHJpbmdbXSB8IHN0cmluZykpLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuO1xuICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihwYWNrYWdlTGlzdCkpIHtcbiAgICAvLyBhcmd1bWVudHMubGVuZ3RoIDw9IDJcbiAgICBwcm9qZWN0RGlyID0gcmVjaXBlVHlwZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgcmVjaXBlVHlwZSA9IGNhbGxiYWNrIGFzICdzcmMnIHwgJ2luc3RhbGxlZCc7XG4gICAgY2FsbGJhY2sgPSBwYWNrYWdlTGlzdDtcbiAgfVxuXG4gIHJldHVybiBfZmluZFBhY2thZ2VCeVR5cGUoJyonLCBjYWxsYmFjayBhcyBGaW5kUGFja2FnZUNiLCByZWNpcGVUeXBlIGFzICdzcmMnIHwgJ2luc3RhbGxlZCcsXG4gICAgcHJvamVjdERpciBhcyBzdHJpbmcgfCB1bmRlZmluZWQpO1xufVxuXG5leHBvcnQge2VhY2hSZWNpcGV9IGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuXG5cblxuY2xhc3MgRW50cnlGaWxlRmluZGVyIHtcbiAgcHJpdmF0ZSBwYWNrYWdlUmVjaXBlTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBmaW5kQnlSZWNpcGVKc29uKHJlY2lwZVBranNvbkZpbGU6IHN0cmluZywgaXNJbnN0YWxsZWQ6IGJvb2xlYW4sXG4gICAgZWFjaENhbGxiYWNrOiAocGFja2FnZUluZm86IFBhY2thZ2VJbmZvKSA9PiB2b2lkKSB7XG4gICAgY29uc3QgcGogPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhyZWNpcGVQa2pzb25GaWxlLCAndXRmLTgnKSk7XG4gICAgaWYgKCFwai5kZXBlbmRlbmNpZXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfLmZvck93bihPYmplY3QuYXNzaWduKHt9LCBwai5kZXBlbmRlbmNpZXMsIHBqLmRldkRlcGVuZGVuY2llcyksICh2ZXJzaW9uLCBuYW1lKSA9PiB7XG4gICAgICBpZiAoaXNJbnN0YWxsZWQpIHtcbiAgICAgICAgaWYgKHRoaXMucGFja2FnZVJlY2lwZU1hcC5oYXMobmFtZSkpIHtcbiAgICAgICAgICBsb2cud2FybignRHVwbGljYXRlIGNvbXBvbmVudCBkZXBlbmRlbmN5IFwiJXNcIiBmb3VuZCBpbiBcIiVzXCIgYW5kIFwiJXNcIicsXG4gICAgICAgICAgICBuYW1lLCB0aGlzLnBhY2thZ2VSZWNpcGVNYXAuZ2V0KG5hbWUpLCByZWNpcGVQa2pzb25GaWxlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wYWNrYWdlUmVjaXBlTWFwLnNldChuYW1lLCByZWNpcGVQa2pzb25GaWxlKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNyY1BrZyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KG5hbWUpO1xuICAgICAgaWYgKHNyY1BrZykge1xuICAgICAgICByZXR1cm4gZWFjaENhbGxiYWNrKHNyY1BrZyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBrSnNvbkZpbGUgPSBmaW5kUGFja2FnZUpzb25QYXRoKG5hbWUpO1xuICAgICAgaWYgKHBrSnNvbkZpbGUgPT0gbnVsbCkge1xuICAgICAgICBsb2cud2FybignUGFja2FnZSAlcyBkb2VzIG5vdCBleGlzdCcsIG5hbWUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwa2cgPSBjcmVhdGVQYWNrYWdlSW5mbyhwa0pzb25GaWxlKTtcblxuICAgICAgZWFjaENhbGxiYWNrKHBrZyk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2ZpbmRQYWNrYWdlQnlUeXBlKF90eXBlczogUGFja2FnZVR5cGUgfCBQYWNrYWdlVHlwZVtdLFxuICBjYWxsYmFjazogRmluZFBhY2thZ2VDYiwgcmVjaXBlVHlwZTogJ3NyYycgfCAnaW5zdGFsbGVkJywgcHJvamVjdERpcj86IHN0cmluZykge1xuXG4gIGNvbnN0IGVudHJ5RmlsZUZpbmRsZXIgPSBuZXcgRW50cnlGaWxlRmluZGVyKCk7XG4gIGNvbnN0IHR5cGVzID0gKFtdIGFzIFBhY2thZ2VUeXBlW10pLmNvbmNhdChfdHlwZXMpO1xuXG4gIGNvbnN0IHNyY0NvbXBTZXQgPSBuZXcgTWFwPHN0cmluZywgW2Jvb2xlYW4sIHN0cmluZ10+KCk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gIC8vIFRvIGF2b2lkIHJldHVybiBkdXBsaWNhdGUgY29tcG9uZW50cywgc29tZSB0aW1lcyBkdXBsaWNhdGUgY29tcG9uZW50IGluIGFzc29jaWF0ZWQgcHJvamVjdHMsIGluc3RhbGxlZCByZWNpcGUgb3IgcGVlclxuICAvLyBkZXBlbmRlbmN5IChyZWNpcGUpXG5cbiAgaWYgKHJlY2lwZVR5cGUgPT09ICdzcmMnKSB7XG4gICAgaWYgKHByb2plY3REaXIpIHtcbiAgICAgIHJlY2lwZU1nci5lYWNoUmVjaXBlU3JjKHByb2plY3REaXIsIChzcmMsIHJlY2lwZURpcikgPT4ge1xuICAgICAgICBpZiAocmVjaXBlRGlyKVxuICAgICAgICAgIGZpbmRFbnRyeUZpbGVzKFBhdGgucmVzb2x2ZShyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSwgZmFsc2UpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlY2lwZU1nci5lYWNoUmVjaXBlU3JjKChzcmMsIHJlY2lwZURpcikgPT4ge1xuICAgICAgICBpZiAocmVjaXBlRGlyKVxuICAgICAgICAgIGZpbmRFbnRyeUZpbGVzKFBhdGgucmVzb2x2ZShyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSwgZmFsc2UpO1xuICAgICAgfSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHJlY2lwZVR5cGUgPT09ICdpbnN0YWxsZWQnKSB7XG4gICAgcmVjaXBlTWdyLmVhY2hJbnN0YWxsZWRSZWNpcGUoKGRpciwgaXNJbnN0YWxsZWQsIGZpbGVOYW1lKSA9PiB7XG4gICAgICByZXR1cm4gZmluZEVudHJ5RmlsZXMoUGF0aC5yZXNvbHZlKGRpciwgZmlsZU5hbWUpLCB0cnVlKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZWNpcGVNZ3IuZWFjaFJlY2lwZSgocmVjaXBlRGlyLCBpc0luc3RhbGxlZCwgZmlsZU5hbWUpID0+IHtcbiAgICAgIGZpbmRFbnRyeUZpbGVzKFBhdGgucmVzb2x2ZShyZWNpcGVEaXIsIGZpbGVOYW1lKSwgaXNJbnN0YWxsZWQpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZEVudHJ5RmlsZXMocmVjaXBlOiBzdHJpbmcsIGlzSW5zdGFsbGVkOiBib29sZWFuKSB7XG4gICAgZW50cnlGaWxlRmluZGxlci5maW5kQnlSZWNpcGVKc29uKHJlY2lwZSwgaXNJbnN0YWxsZWQsIHBrZyA9PiB7XG4gICAgICBpZiAoIV8uaGFzKHBrZy5qc29uLCAnZHInKSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY29uc3QgbmFtZSA9IHBrZy5uYW1lO1xuICAgICAgdmFyIHBhY2thZ2VUeXBlID0gXy5nZXQocGtnLmpzb24sICdkci50eXBlJyk7XG4gICAgICBwYWNrYWdlVHlwZSA9IHBhY2thZ2VUeXBlID8gW10uY29uY2F0KHBhY2thZ2VUeXBlKSA6IFtdO1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBzcmNDb21wU2V0LmdldChwa2cubmFtZSk7XG4gICAgICBpZiAoZXhpc3RpbmcgJiYgZXhpc3RpbmdbMF0gPT09IGlzSW5zdGFsbGVkICYmIGV4aXN0aW5nWzFdICE9PSByZWNpcGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRHVwbGljYXRlIHBhY2thZ2UgJXMgZm91bmQgaW4gcmVjaXBlIFwiJXNcIiBhbmQgXCIlc1wiJywgbmFtZSwgcmVjaXBlLCBzcmNDb21wU2V0LmdldChuYW1lKSk7XG4gICAgICB9XG4gICAgICBpZiAoZXhpc3RpbmcpXG4gICAgICAgIHJldHVybjtcbiAgICAgIHNyY0NvbXBTZXQuc2V0KG5hbWUsIFtpc0luc3RhbGxlZCwgcmVjaXBlXSk7XG4gICAgICBpZiAoXy5pbmNsdWRlcyh0eXBlcywgJyonKSB8fCBfLmludGVyc2VjdGlvbih0eXBlcywgcGFja2FnZVR5cGUpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gX2NoZWNrRHVwbGljYXRlKHBhY2thZ2VTZXQsIG5hbWUsIHBhcnNlZE5hbWUsIHBrSnNvbiwgcGFja2FnZVBhdGgpO1xuICAgICAgICBjYWxsYmFjayhuYW1lLCAnJywge25hbWU6IHBrZy5zaG9ydE5hbWUsIHNjb3BlOiBwa2cuc2NvcGV9LCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBpc0luc3RhbGxlZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==