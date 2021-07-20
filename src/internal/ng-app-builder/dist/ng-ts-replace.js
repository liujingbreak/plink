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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.string2buffer = void 0;
/* eslint-disable  max-len */
const ts_compiler_1 = require("@wfh/plink/wfh/dist/ts-compiler");
const fs = __importStar(require("fs"));
const _ = __importStar(require("lodash"));
const log4js = __importStar(require("log4js"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const __api_1 = __importDefault(require("__api"));
const ng_aot_assets_1 = require("./ng-aot-assets");
const ts_before_aot_1 = __importDefault(require("./utils/ts-before-aot"));
const upgrade_viewchild_ng8_1 = require("./utils/upgrade-viewchild-ng8");
const lru_cache_1 = __importDefault(require("lru-cache"));
const chalk = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName + '.ng-ts-replace');
const needLogFile = __api_1.default.config()['@wfh/ng-app-builder'].logChangedTsFile;
// const apiTmplTs = _.template('import __DrApi from \'@wfh/ng-app-builder/src/app/api\';\
// var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || new __DrApi(\'<%=packageName%>\');\
// __api.default = __api;');
Object.getPrototypeOf(__api_1.default).browserApiConfig = browserLegoConfig;
class TSReadHooker {
    constructor(tsconfigFile, preserveSymlinks = false) {
        this.templateFileCount = 0;
        this.tsFileCount = 0;
        this.realFileCache = new lru_cache_1.default({ max: 100, maxAge: 20000 });
        this.tsCache = new lru_cache_1.default({ max: 100, maxAge: 20000 });
        this.hookFunc = this.createTsReadHook(tsconfigFile, preserveSymlinks);
    }
    clear() {
        this.tsCache = new lru_cache_1.default({ max: 100, maxAge: 20000 });
        this.templateFileCount = 0;
        this.tsFileCount = 0;
    }
    logFileCount() {
        log.info(`Read template files: ${this.templateFileCount}, Typescript files: ${this.tsFileCount}`);
    }
    realFile(file, preserveSymlinks) {
        const realFile = this.realFileCache.get(file);
        if (realFile !== undefined)
            return realFile;
        if (fs.lstatSync(file).isSymbolicLink()) {
            if (!preserveSymlinks)
                log.warn(`Reading a symlink: ${file}, but "preserveSymlinks" is false.`);
            const rf = fs.realpathSync(file);
            this.realFileCache.set(file, rf);
            return rf;
        }
        else
            return file;
    }
    createTsReadHook(tsconfigFile, preserveSymlinks = false) {
        const tsCompilerOptions = ts_compiler_1.readTsConfig(tsconfigFile);
        const ng8Compliant = __api_1.default.config.get(__api_1.default.packageName + '.ng8Compliant', true);
        return (file, buf) => {
            try {
                if (file.endsWith('.component.html')) {
                    const cached = this.tsCache.get(this.realFile(file, preserveSymlinks));
                    if (cached != null)
                        return rxjs_1.of(cached);
                    this.templateFileCount++;
                    return ng_aot_assets_1.replaceHtml(file, Buffer.from(buf).toString())
                        .pipe(operators_1.map(output => string2buffer(output)));
                }
                else if (!file.endsWith('.ts') || file.endsWith('.d.ts')) {
                    return rxjs_1.of(buf);
                }
                const cached = this.tsCache.get(this.realFile(file, preserveSymlinks));
                if (cached != null)
                    return rxjs_1.of(cached);
                this.tsFileCount++;
                // const compPkg = api.findPackageByFile(file);
                let content = Buffer.from(buf).toString();
                // const tsSelector = new Selector(content, file);
                // const hasImportApi = tsSelector.findAll(':ImportDeclaration > .moduleSpecifier:StringLiteral').some(ast => {
                //   return (ast as ts.StringLiteral).text === '__api';
                // });
                // if (file.endsWith('project-modules.ts')) {
                //   const ij = api.browserInjector;
                //   console.log(ij.dirTree.traverse());
                // }
                let changed = __api_1.default.browserInjector.injectToFile(file, content);
                if (ng8Compliant)
                    changed = upgrade_viewchild_ng8_1.transform(changed, file);
                changed = new ts_before_aot_1.default(file, changed).parse(source => ts_compiler_1.transpileSingleTs(source, tsCompilerOptions));
                // if (hasImportApi && compPkg) {
                //   changed = apiTmplTs({packageName: compPkg.longName}) + '\n' + changed;
                //   log.warn('Deprecated usage: import ... from "__api" in ', file);
                // }
                if (needLogFile)
                    log.info(chalk.cyan(file) + ':\n' + changed);
                const bf = string2buffer(changed);
                this.tsCache.set(this.realFile(file, preserveSymlinks), bf);
                return rxjs_1.of(bf);
            }
            catch (ex) {
                log.error(ex);
                return rxjs_1.throwError(ex);
            }
        };
    }
}
exports.default = TSReadHooker;
function string2buffer(input) {
    const nodeBuf = Buffer.from(input);
    const len = nodeBuf.byteLength;
    const newBuf = new ArrayBuffer(len);
    const dataView = new DataView(newBuf);
    for (let i = 0; i < len; i++) {
        dataView.setUint8(i, nodeBuf.readUInt8(i));
    }
    return newBuf;
}
exports.string2buffer = string2buffer;
function browserLegoConfig() {
    var browserPropSet = {};
    var legoConfig = {}; // legoConfig is global configuration properties which apply to all entries and modules
    _.each([
        'staticAssetsURL', 'serverURL', 'packageContextPathMapping',
        'locales', 'devMode'
    ], prop => browserPropSet[prop] = 1);
    _.each(__api_1.default.config().browserSideConfigProp, prop => browserPropSet[prop] = true);
    _.forOwn(browserPropSet, (nothing, propPath) => _.set(legoConfig, propPath, _.get(__api_1.default.config(), propPath)));
    return legoConfig;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctdHMtcmVwbGFjZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5nLXRzLXJlcGxhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZCQUE2QjtBQUM3QixpRUFBa0Y7QUFDbEYsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1QiwrQ0FBaUM7QUFDakMsK0JBQWtEO0FBQ2xELDhDQUFtQztBQUNuQyxrREFBbUM7QUFDbkMsbURBQThDO0FBRTlDLDBFQUFtRDtBQUNuRCx5RUFBOEU7QUFDOUUsMERBQTRCO0FBQzVCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztBQUNqRSxNQUFNLFdBQVcsR0FBRyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztBQUN6RSwwRkFBMEY7QUFDMUYsZ0dBQWdHO0FBQ2hHLDRCQUE0QjtBQUUzQixNQUFNLENBQUMsY0FBYyxDQUFDLGVBQUcsQ0FBYSxDQUFDLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDO0FBRTdFLE1BQXFCLFlBQVk7SUFRL0IsWUFBWSxZQUFvQixFQUFFLGdCQUFnQixHQUFHLEtBQUs7UUFOMUQsc0JBQWlCLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ1Isa0JBQWEsR0FBRyxJQUFJLG1CQUFHLENBQWlCLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUNuRSxZQUFPLEdBQUcsSUFBSSxtQkFBRyxDQUFzQixFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7UUFJeEUsSUFBSSxDQUFDLFFBQVEs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QUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVHLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSAgbWF4LWxlbiAqL1xuaW1wb3J0IHsgcmVhZFRzQ29uZmlnLCB0cmFuc3BpbGVTaW5nbGVUcyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBvZiwgdGhyb3dFcnJvciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBhcGksIHtEcmNwQXBpfSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyByZXBsYWNlSHRtbCB9IGZyb20gJy4vbmctYW90LWFzc2V0cyc7XG5pbXBvcnQgeyBIb29rUmVhZEZ1bmMgfSBmcm9tICcuL3V0aWxzL3JlYWQtaG9vay12ZnNob3N0JztcbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuaW1wb3J0IHt0cmFuc2Zvcm0gYXMgdHJhbnNmb3JtVmlld0NoaWxkfSBmcm9tICcuL3V0aWxzL3VwZ3JhZGUtdmlld2NoaWxkLW5nOCc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5uZy10cy1yZXBsYWNlJyk7XG5jb25zdCBuZWVkTG9nRmlsZSA9IGFwaS5jb25maWcoKVsnQHdmaC9uZy1hcHAtYnVpbGRlciddLmxvZ0NoYW5nZWRUc0ZpbGU7XG4vLyBjb25zdCBhcGlUbXBsVHMgPSBfLnRlbXBsYXRlKCdpbXBvcnQgX19EckFwaSBmcm9tIFxcJ0B3ZmgvbmctYXBwLWJ1aWxkZXIvc3JjL2FwcC9hcGlcXCc7XFxcbi8vIHZhciBfX2FwaSA9IF9fRHJBcGkuZ2V0Q2FjaGVkQXBpKFxcJzwlPXBhY2thZ2VOYW1lJT5cXCcpIHx8IG5ldyBfX0RyQXBpKFxcJzwlPXBhY2thZ2VOYW1lJT5cXCcpO1xcXG4vLyBfX2FwaS5kZWZhdWx0ID0gX19hcGk7Jyk7XG5cbihPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSBhcyBEcmNwQXBpKS5icm93c2VyQXBpQ29uZmlnID0gYnJvd3NlckxlZ29Db25maWc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRTUmVhZEhvb2tlciB7XG4gIGhvb2tGdW5jOiBIb29rUmVhZEZ1bmM7XG4gIHRlbXBsYXRlRmlsZUNvdW50ID0gMDtcbiAgdHNGaWxlQ291bnQgPSAwO1xuICBwcml2YXRlIHJlYWxGaWxlQ2FjaGUgPSBuZXcgTFJVPHN0cmluZywgc3RyaW5nPih7bWF4OiAxMDAsIG1heEFnZTogMjAwMDB9KTtcbiAgcHJpdmF0ZSB0c0NhY2hlID0gbmV3IExSVTxzdHJpbmcsIEFycmF5QnVmZmVyPih7bWF4OiAxMDAsIG1heEFnZTogMjAwMDB9KTtcblxuXG4gIGNvbnN0cnVjdG9yKHRzY29uZmlnRmlsZTogc3RyaW5nLCBwcmVzZXJ2ZVN5bWxpbmtzID0gZmFsc2UpIHtcbiAgICB0aGlzLmhvb2tGdW5jID0gdGhpcy5jcmVhdGVUc1JlYWRIb29rKHRzY29uZmlnRmlsZSwgcHJlc2VydmVTeW1saW5rcyk7XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICB0aGlzLnRzQ2FjaGUgPSBuZXcgTFJVPHN0cmluZywgQXJyYXlCdWZmZXI+KHttYXg6IDEwMCwgbWF4QWdlOiAyMDAwMH0pO1xuICAgIHRoaXMudGVtcGxhdGVGaWxlQ291bnQgPSAwO1xuICAgIHRoaXMudHNGaWxlQ291bnQgPSAwO1xuICB9XG5cbiAgbG9nRmlsZUNvdW50KCkge1xuICAgIGxvZy5pbmZvKGBSZWFkIHRlbXBsYXRlIGZpbGVzOiAke3RoaXMudGVtcGxhdGVGaWxlQ291bnR9LCBUeXBlc2NyaXB0IGZpbGVzOiAke3RoaXMudHNGaWxlQ291bnR9YCk7XG4gIH1cblxuICBwcml2YXRlIHJlYWxGaWxlKGZpbGU6IHN0cmluZywgcHJlc2VydmVTeW1saW5rczogYm9vbGVhbik6IHN0cmluZyB7XG4gICAgY29uc3QgcmVhbEZpbGUgPSB0aGlzLnJlYWxGaWxlQ2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmIChyZWFsRmlsZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuIHJlYWxGaWxlO1xuICAgIGlmIChmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgaWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKVxuICAgICAgICBsb2cud2FybihgUmVhZGluZyBhIHN5bWxpbms6ICR7ZmlsZX0sIGJ1dCBcInByZXNlcnZlU3ltbGlua3NcIiBpcyBmYWxzZS5gKTtcbiAgICAgIGNvbnN0IHJmID0gZnMucmVhbHBhdGhTeW5jKGZpbGUpO1xuICAgICAgdGhpcy5yZWFsRmlsZUNhY2hlLnNldChmaWxlLCByZik7XG4gICAgICByZXR1cm4gcmY7XG4gICAgfSBlbHNlXG4gICAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlVHNSZWFkSG9vayh0c2NvbmZpZ0ZpbGU6IHN0cmluZywgcHJlc2VydmVTeW1saW5rcyA9IGZhbHNlKTogSG9va1JlYWRGdW5jIHtcbiAgICBjb25zdCB0c0NvbXBpbGVyT3B0aW9ucyA9IHJlYWRUc0NvbmZpZyh0c2NvbmZpZ0ZpbGUpO1xuICAgIGNvbnN0IG5nOENvbXBsaWFudCA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcubmc4Q29tcGxpYW50JywgdHJ1ZSk7XG5cbiAgICByZXR1cm4gKGZpbGU6IHN0cmluZywgYnVmOiBBcnJheUJ1ZmZlcik6IE9ic2VydmFibGU8QXJyYXlCdWZmZXI+ID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChmaWxlLmVuZHNXaXRoKCcuY29tcG9uZW50Lmh0bWwnKSkge1xuICAgICAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMudHNDYWNoZS5nZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSk7XG4gICAgICAgICAgaWYgKGNhY2hlZCAhPSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuIG9mKGNhY2hlZCk7XG4gICAgICAgICAgdGhpcy50ZW1wbGF0ZUZpbGVDb3VudCsrO1xuICAgICAgICAgIHJldHVybiByZXBsYWNlSHRtbChmaWxlLCBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCkpXG4gICAgICAgICAgICAucGlwZShtYXAob3V0cHV0ID0+IHN0cmluZzJidWZmZXIob3V0cHV0KSkpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoIWZpbGUuZW5kc1dpdGgoJy50cycpIHx8IGZpbGUuZW5kc1dpdGgoJy5kLnRzJykpIHtcbiAgICAgICAgICByZXR1cm4gb2YoYnVmKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMudHNDYWNoZS5nZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSk7XG4gICAgICAgIGlmIChjYWNoZWQgIT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gb2YoY2FjaGVkKTtcblxuICAgICAgICB0aGlzLnRzRmlsZUNvdW50Kys7XG5cbiAgICAgICAgLy8gY29uc3QgY29tcFBrZyA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCk7XG4gICAgICAgIFxuXG4gICAgICAgIC8vIGNvbnN0IHRzU2VsZWN0b3IgPSBuZXcgU2VsZWN0b3IoY29udGVudCwgZmlsZSk7XG4gICAgICAgIC8vIGNvbnN0IGhhc0ltcG9ydEFwaSA9IHRzU2VsZWN0b3IuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uID4gLm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJykuc29tZShhc3QgPT4ge1xuICAgICAgICAvLyAgIHJldHVybiAoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQgPT09ICdfX2FwaSc7XG4gICAgICAgIC8vIH0pO1xuICAgICAgICAvLyBpZiAoZmlsZS5lbmRzV2l0aCgncHJvamVjdC1tb2R1bGVzLnRzJykpIHtcbiAgICAgICAgLy8gICBjb25zdCBpaiA9IGFwaS5icm93c2VySW5qZWN0b3I7XG4gICAgICAgIC8vICAgY29uc29sZS5sb2coaWouZGlyVHJlZS50cmF2ZXJzZSgpKTtcbiAgICAgICAgLy8gfVxuICAgICAgICBsZXQgY2hhbmdlZCA9IGFwaS5icm93c2VySW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGNvbnRlbnQpO1xuXG4gICAgICAgIGlmIChuZzhDb21wbGlhbnQpXG4gICAgICAgICAgY2hhbmdlZCA9IHRyYW5zZm9ybVZpZXdDaGlsZChjaGFuZ2VkLCBmaWxlKTtcblxuICAgICAgICBjaGFuZ2VkID0gbmV3IEFwaUFvdENvbXBpbGVyKGZpbGUsIGNoYW5nZWQpLnBhcnNlKHNvdXJjZSA9PiB0cmFuc3BpbGVTaW5nbGVUcyhzb3VyY2UsIHRzQ29tcGlsZXJPcHRpb25zKSk7XG4gICAgICAgIC8vIGlmIChoYXNJbXBvcnRBcGkgJiYgY29tcFBrZykge1xuICAgICAgICAvLyAgIGNoYW5nZWQgPSBhcGlUbXBsVHMoe3BhY2thZ2VOYW1lOiBjb21wUGtnLmxvbmdOYW1lfSkgKyAnXFxuJyArIGNoYW5nZWQ7XG4gICAgICAgIC8vICAgbG9nLndhcm4oJ0RlcHJlY2F0ZWQgdXNhZ2U6IGltcG9ydCAuLi4gZnJvbSBcIl9fYXBpXCIgaW4gJywgZmlsZSk7XG4gICAgICAgIC8vIH1cblxuICAgICAgICBpZiAobmVlZExvZ0ZpbGUpXG4gICAgICAgICAgbG9nLmluZm8oY2hhbGsuY3lhbihmaWxlKSArICc6XFxuJyArIGNoYW5nZWQpO1xuICAgICAgICBjb25zdCBiZiA9IHN0cmluZzJidWZmZXIoY2hhbmdlZCk7XG4gICAgICAgIHRoaXMudHNDYWNoZS5zZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSwgYmYpO1xuICAgICAgICByZXR1cm4gb2YoYmYpO1xuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgbG9nLmVycm9yKGV4KTtcbiAgICAgICAgcmV0dXJuIHRocm93RXJyb3IoZXgpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nMmJ1ZmZlcihpbnB1dDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICBjb25zdCBub2RlQnVmID0gQnVmZmVyLmZyb20oaW5wdXQpO1xuICBjb25zdCBsZW4gPSBub2RlQnVmLmJ5dGVMZW5ndGg7XG4gIGNvbnN0IG5ld0J1ZiA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pO1xuICBjb25zdCBkYXRhVmlldyA9IG5ldyBEYXRhVmlldyhuZXdCdWYpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgZGF0YVZpZXcuc2V0VWludDgoaSwgbm9kZUJ1Zi5yZWFkVUludDgoaSkpO1xuICB9XG4gIHJldHVybiBuZXdCdWY7XG59XG5cbmZ1bmN0aW9uIGJyb3dzZXJMZWdvQ29uZmlnKCkge1xuICB2YXIgYnJvd3NlclByb3BTZXQ6IGFueSA9IHt9O1xuICB2YXIgbGVnb0NvbmZpZzogYW55ID0ge307IC8vIGxlZ29Db25maWcgaXMgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcyB3aGljaCBhcHBseSB0byBhbGwgZW50cmllcyBhbmQgbW9kdWxlc1xuICBfLmVhY2goW1xuICAgICdzdGF0aWNBc3NldHNVUkwnLCAnc2VydmVyVVJMJywgJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnLFxuICAgICdsb2NhbGVzJywgJ2Rldk1vZGUnXG4gIF0sIHByb3AgPT4gYnJvd3NlclByb3BTZXRbcHJvcF0gPSAxKTtcbiAgXy5lYWNoKGFwaS5jb25maWcoKS5icm93c2VyU2lkZUNvbmZpZ1Byb3AsIHByb3AgPT4gYnJvd3NlclByb3BTZXRbcHJvcF0gPSB0cnVlKTtcbiAgXy5mb3JPd24oYnJvd3NlclByb3BTZXQsIChub3RoaW5nLCBwcm9wUGF0aCkgPT4gXy5zZXQobGVnb0NvbmZpZywgcHJvcFBhdGgsIF8uZ2V0KGFwaS5jb25maWcoKSwgcHJvcFBhdGgpKSk7XG4gIHJldHVybiBsZWdvQ29uZmlnO1xufVxuXG4iXX0=