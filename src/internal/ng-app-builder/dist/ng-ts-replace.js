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
/* tslint:disable max-line-length */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctdHMtcmVwbGFjZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5nLXRzLXJlcGxhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQyxpRUFBa0Y7QUFDbEYsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1QiwrQ0FBaUM7QUFDakMsK0JBQWtEO0FBQ2xELDhDQUFtQztBQUNuQyxrREFBbUM7QUFDbkMsbURBQThDO0FBRTlDLDBFQUFtRDtBQUNuRCx5RUFBOEU7QUFDOUUsMERBQTRCO0FBQzVCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztBQUNqRSxNQUFNLFdBQVcsR0FBRyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztBQUN6RSwwRkFBMEY7QUFDMUYsZ0dBQWdHO0FBQ2hHLDRCQUE0QjtBQUUzQixNQUFNLENBQUMsY0FBYyxDQUFDLGVBQUcsQ0FBYSxDQUFDLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDO0FBRTdFLE1BQXFCLFlBQVk7SUFRL0IsWUFBWSxZQUFvQixFQUFFLGdCQUFnQixHQUFHLEtBQUs7UUFOMUQsc0JBQWlCLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ1Isa0JBQWEsR0FBRyxJQUFJLG1CQUFHLENBQWlCLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUNuRSxZQUFPLEdBQUcsSUFBSSxtQkFBRyxDQUFzQixFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7UUFJeEUsSUFBSSxDQUFDLFFBQVEs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QUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVHLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCB7IHJlYWRUc0NvbmZpZywgdHJhbnNwaWxlU2luZ2xlVHMgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgb2YsIHRocm93RXJyb3IgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgYXBpLCB7RHJjcEFwaX0gZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgcmVwbGFjZUh0bWwgfSBmcm9tICcuL25nLWFvdC1hc3NldHMnO1xuaW1wb3J0IHsgSG9va1JlYWRGdW5jIH0gZnJvbSAnLi91dGlscy9yZWFkLWhvb2stdmZzaG9zdCc7XG5pbXBvcnQgQXBpQW90Q29tcGlsZXIgZnJvbSAnLi91dGlscy90cy1iZWZvcmUtYW90JztcbmltcG9ydCB7dHJhbnNmb3JtIGFzIHRyYW5zZm9ybVZpZXdDaGlsZH0gZnJvbSAnLi91dGlscy91cGdyYWRlLXZpZXdjaGlsZC1uZzgnO1xuaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcubmctdHMtcmVwbGFjZScpO1xuY29uc3QgbmVlZExvZ0ZpbGUgPSBhcGkuY29uZmlnKClbJ0B3ZmgvbmctYXBwLWJ1aWxkZXInXS5sb2dDaGFuZ2VkVHNGaWxlO1xuLy8gY29uc3QgYXBpVG1wbFRzID0gXy50ZW1wbGF0ZSgnaW1wb3J0IF9fRHJBcGkgZnJvbSBcXCdAd2ZoL25nLWFwcC1idWlsZGVyL3NyYy9hcHAvYXBpXFwnO1xcXG4vLyB2YXIgX19hcGkgPSBfX0RyQXBpLmdldENhY2hlZEFwaShcXCc8JT1wYWNrYWdlTmFtZSU+XFwnKSB8fCBuZXcgX19EckFwaShcXCc8JT1wYWNrYWdlTmFtZSU+XFwnKTtcXFxuLy8gX19hcGkuZGVmYXVsdCA9IF9fYXBpOycpO1xuXG4oT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSkgYXMgRHJjcEFwaSkuYnJvd3NlckFwaUNvbmZpZyA9IGJyb3dzZXJMZWdvQ29uZmlnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUU1JlYWRIb29rZXIge1xuICBob29rRnVuYzogSG9va1JlYWRGdW5jO1xuICB0ZW1wbGF0ZUZpbGVDb3VudCA9IDA7XG4gIHRzRmlsZUNvdW50ID0gMDtcbiAgcHJpdmF0ZSByZWFsRmlsZUNhY2hlID0gbmV3IExSVTxzdHJpbmcsIHN0cmluZz4oe21heDogMTAwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIHByaXZhdGUgdHNDYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBBcnJheUJ1ZmZlcj4oe21heDogMTAwLCBtYXhBZ2U6IDIwMDAwfSk7XG5cblxuICBjb25zdHJ1Y3Rvcih0c2NvbmZpZ0ZpbGU6IHN0cmluZywgcHJlc2VydmVTeW1saW5rcyA9IGZhbHNlKSB7XG4gICAgdGhpcy5ob29rRnVuYyA9IHRoaXMuY3JlYXRlVHNSZWFkSG9vayh0c2NvbmZpZ0ZpbGUsIHByZXNlcnZlU3ltbGlua3MpO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy50c0NhY2hlID0gbmV3IExSVTxzdHJpbmcsIEFycmF5QnVmZmVyPih7bWF4OiAxMDAsIG1heEFnZTogMjAwMDB9KTtcbiAgICB0aGlzLnRlbXBsYXRlRmlsZUNvdW50ID0gMDtcbiAgICB0aGlzLnRzRmlsZUNvdW50ID0gMDtcbiAgfVxuXG4gIGxvZ0ZpbGVDb3VudCgpIHtcbiAgICBsb2cuaW5mbyhgUmVhZCB0ZW1wbGF0ZSBmaWxlczogJHt0aGlzLnRlbXBsYXRlRmlsZUNvdW50fSwgVHlwZXNjcmlwdCBmaWxlczogJHt0aGlzLnRzRmlsZUNvdW50fWApO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFsRmlsZShmaWxlOiBzdHJpbmcsIHByZXNlcnZlU3ltbGlua3M6IGJvb2xlYW4pOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlYWxGaWxlID0gdGhpcy5yZWFsRmlsZUNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAocmVhbEZpbGUgIT09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybiByZWFsRmlsZTtcbiAgICBpZiAoZnMubHN0YXRTeW5jKGZpbGUpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIGlmICghcHJlc2VydmVTeW1saW5rcylcbiAgICAgICAgbG9nLndhcm4oYFJlYWRpbmcgYSBzeW1saW5rOiAke2ZpbGV9LCBidXQgXCJwcmVzZXJ2ZVN5bWxpbmtzXCIgaXMgZmFsc2UuYCk7XG4gICAgICBjb25zdCByZiA9IGZzLnJlYWxwYXRoU3luYyhmaWxlKTtcbiAgICAgIHRoaXMucmVhbEZpbGVDYWNoZS5zZXQoZmlsZSwgcmYpO1xuICAgICAgcmV0dXJuIHJmO1xuICAgIH0gZWxzZVxuICAgICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVRzUmVhZEhvb2sodHNjb25maWdGaWxlOiBzdHJpbmcsIHByZXNlcnZlU3ltbGlua3MgPSBmYWxzZSk6IEhvb2tSZWFkRnVuYyB7XG4gICAgY29uc3QgdHNDb21waWxlck9wdGlvbnMgPSByZWFkVHNDb25maWcodHNjb25maWdGaWxlKTtcbiAgICBjb25zdCBuZzhDb21wbGlhbnQgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUgKyAnLm5nOENvbXBsaWFudCcsIHRydWUpO1xuXG4gICAgcmV0dXJuIChmaWxlOiBzdHJpbmcsIGJ1ZjogQXJyYXlCdWZmZXIpOiBPYnNlcnZhYmxlPEFycmF5QnVmZmVyPiA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoZmlsZS5lbmRzV2l0aCgnLmNvbXBvbmVudC5odG1sJykpIHtcbiAgICAgICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLnRzQ2FjaGUuZ2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcykpO1xuICAgICAgICAgIGlmIChjYWNoZWQgIT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybiBvZihjYWNoZWQpO1xuICAgICAgICAgIHRoaXMudGVtcGxhdGVGaWxlQ291bnQrKztcbiAgICAgICAgICByZXR1cm4gcmVwbGFjZUh0bWwoZmlsZSwgQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpKVxuICAgICAgICAgICAgLnBpcGUobWFwKG91dHB1dCA9PiBzdHJpbmcyYnVmZmVyKG91dHB1dCkpKTtcblxuICAgICAgICB9IGVsc2UgaWYgKCFmaWxlLmVuZHNXaXRoKCcudHMnKSB8fCBmaWxlLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgcmV0dXJuIG9mKGJ1Zik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLnRzQ2FjaGUuZ2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcykpO1xuICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgcmV0dXJuIG9mKGNhY2hlZCk7XG5cbiAgICAgICAgdGhpcy50c0ZpbGVDb3VudCsrO1xuXG4gICAgICAgIC8vIGNvbnN0IGNvbXBQa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICAgIGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuICAgICAgICBcblxuICAgICAgICAvLyBjb25zdCB0c1NlbGVjdG9yID0gbmV3IFNlbGVjdG9yKGNvbnRlbnQsIGZpbGUpO1xuICAgICAgICAvLyBjb25zdCBoYXNJbXBvcnRBcGkgPSB0c1NlbGVjdG9yLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbiA+IC5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcpLnNvbWUoYXN0ID0+IHtcbiAgICAgICAgLy8gICByZXR1cm4gKGFzdCBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0ID09PSAnX19hcGknO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgLy8gaWYgKGZpbGUuZW5kc1dpdGgoJ3Byb2plY3QtbW9kdWxlcy50cycpKSB7XG4gICAgICAgIC8vICAgY29uc3QgaWogPSBhcGkuYnJvd3NlckluamVjdG9yO1xuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGlqLmRpclRyZWUudHJhdmVyc2UoKSk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgbGV0IGNoYW5nZWQgPSBhcGkuYnJvd3NlckluamVjdG9yLmluamVjdFRvRmlsZShmaWxlLCBjb250ZW50KTtcblxuICAgICAgICBpZiAobmc4Q29tcGxpYW50KVxuICAgICAgICAgIGNoYW5nZWQgPSB0cmFuc2Zvcm1WaWV3Q2hpbGQoY2hhbmdlZCwgZmlsZSk7XG5cbiAgICAgICAgY2hhbmdlZCA9IG5ldyBBcGlBb3RDb21waWxlcihmaWxlLCBjaGFuZ2VkKS5wYXJzZShzb3VyY2UgPT4gdHJhbnNwaWxlU2luZ2xlVHMoc291cmNlLCB0c0NvbXBpbGVyT3B0aW9ucykpO1xuICAgICAgICAvLyBpZiAoaGFzSW1wb3J0QXBpICYmIGNvbXBQa2cpIHtcbiAgICAgICAgLy8gICBjaGFuZ2VkID0gYXBpVG1wbFRzKHtwYWNrYWdlTmFtZTogY29tcFBrZy5sb25nTmFtZX0pICsgJ1xcbicgKyBjaGFuZ2VkO1xuICAgICAgICAvLyAgIGxvZy53YXJuKCdEZXByZWNhdGVkIHVzYWdlOiBpbXBvcnQgLi4uIGZyb20gXCJfX2FwaVwiIGluICcsIGZpbGUpO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgaWYgKG5lZWRMb2dGaWxlKVxuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmN5YW4oZmlsZSkgKyAnOlxcbicgKyBjaGFuZ2VkKTtcbiAgICAgICAgY29uc3QgYmYgPSBzdHJpbmcyYnVmZmVyKGNoYW5nZWQpO1xuICAgICAgICB0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGJmKTtcbiAgICAgICAgcmV0dXJuIG9mKGJmKTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgIGxvZy5lcnJvcihleCk7XG4gICAgICAgIHJldHVybiB0aHJvd0Vycm9yKGV4KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZzJidWZmZXIoaW5wdXQ6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgY29uc3Qgbm9kZUJ1ZiA9IEJ1ZmZlci5mcm9tKGlucHV0KTtcbiAgY29uc3QgbGVuID0gbm9kZUJ1Zi5ieXRlTGVuZ3RoO1xuICBjb25zdCBuZXdCdWYgPSBuZXcgQXJyYXlCdWZmZXIobGVuKTtcbiAgY29uc3QgZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcobmV3QnVmKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGRhdGFWaWV3LnNldFVpbnQ4KGksIG5vZGVCdWYucmVhZFVJbnQ4KGkpKTtcbiAgfVxuICByZXR1cm4gbmV3QnVmO1xufVxuXG5mdW5jdGlvbiBicm93c2VyTGVnb0NvbmZpZygpIHtcbiAgdmFyIGJyb3dzZXJQcm9wU2V0OiBhbnkgPSB7fTtcbiAgdmFyIGxlZ29Db25maWc6IGFueSA9IHt9OyAvLyBsZWdvQ29uZmlnIGlzIGdsb2JhbCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMgd2hpY2ggYXBwbHkgdG8gYWxsIGVudHJpZXMgYW5kIG1vZHVsZXNcbiAgXy5lYWNoKFtcbiAgICAnc3RhdGljQXNzZXRzVVJMJywgJ3NlcnZlclVSTCcsICdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJyxcbiAgICAnbG9jYWxlcycsICdkZXZNb2RlJ1xuICBdLCBwcm9wID0+IGJyb3dzZXJQcm9wU2V0W3Byb3BdID0gMSk7XG4gIF8uZWFjaChhcGkuY29uZmlnKCkuYnJvd3NlclNpZGVDb25maWdQcm9wLCBwcm9wID0+IGJyb3dzZXJQcm9wU2V0W3Byb3BdID0gdHJ1ZSk7XG4gIF8uZm9yT3duKGJyb3dzZXJQcm9wU2V0LCAobm90aGluZywgcHJvcFBhdGgpID0+IF8uc2V0KGxlZ29Db25maWcsIHByb3BQYXRoLCBfLmdldChhcGkuY29uZmlnKCksIHByb3BQYXRoKSkpO1xuICByZXR1cm4gbGVnb0NvbmZpZztcbn1cblxuIl19