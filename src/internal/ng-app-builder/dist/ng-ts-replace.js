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
const plink_1 = require("@wfh/plink");
const __api_1 = __importDefault(require("__api"));
const ng_aot_assets_1 = require("./ng-aot-assets");
const ts_before_aot_1 = __importDefault(require("./utils/ts-before-aot"));
const upgrade_viewchild_ng8_1 = require("./utils/upgrade-viewchild-ng8");
const lru_cache_1 = __importDefault(require("lru-cache"));
const chalk = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName + '.ng-ts-replace');
const needLogFile = plink_1.config()['@wfh/ng-app-builder'].logChangedTsFile;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctdHMtcmVwbGFjZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5nLXRzLXJlcGxhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZCQUE2QjtBQUM3QixpRUFBa0Y7QUFDbEYsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1QiwrQ0FBaUM7QUFDakMsK0JBQWtEO0FBQ2xELDhDQUFtQztBQUNuQyxzQ0FBa0M7QUFDbEMsa0RBQW1DO0FBQ25DLG1EQUE4QztBQUU5QywwRUFBbUQ7QUFDbkQseUVBQThFO0FBQzlFLDBEQUE0QjtBQUM1QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFL0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGdCQUFnQixDQUFDLENBQUM7QUFDakUsTUFBTSxXQUFXLEdBQUcsY0FBTSxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztBQUNyRSwwRkFBMEY7QUFDMUYsZ0dBQWdHO0FBQ2hHLDRCQUE0QjtBQUUzQixNQUFNLENBQUMsY0FBYyxDQUFDLGVBQUcsQ0FBYSxDQUFDLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDO0FBRTdFLE1BQXFCLFlBQVk7SUFRL0IsWUFBWSxZQUFvQixFQUFFLGdCQUFnQixHQUFHLEtBQUs7UUFOMUQsc0JBQWlCLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ1Isa0JBQWEsR0FBRyxJQUFJLG1CQUFHLENBQWlCLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUNuRSxZQUFPLEdBQUcsSUFBSSxtQkFBRyxDQUFzQixFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7UUFJeEUsSUFBSSxDQUFDLFFB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LEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVHLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSAgbWF4LWxlbiAqL1xuaW1wb3J0IHsgcmVhZFRzQ29uZmlnLCB0cmFuc3BpbGVTaW5nbGVUcyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBvZiwgdGhyb3dFcnJvciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBhcGksIHtEcmNwQXBpfSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyByZXBsYWNlSHRtbCB9IGZyb20gJy4vbmctYW90LWFzc2V0cyc7XG5pbXBvcnQgeyBIb29rUmVhZEZ1bmMgfSBmcm9tICcuL3V0aWxzL3JlYWQtaG9vay12ZnNob3N0JztcbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuaW1wb3J0IHt0cmFuc2Zvcm0gYXMgdHJhbnNmb3JtVmlld0NoaWxkfSBmcm9tICcuL3V0aWxzL3VwZ3JhZGUtdmlld2NoaWxkLW5nOCc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5uZy10cy1yZXBsYWNlJyk7XG5jb25zdCBuZWVkTG9nRmlsZSA9IGNvbmZpZygpWydAd2ZoL25nLWFwcC1idWlsZGVyJ10ubG9nQ2hhbmdlZFRzRmlsZTtcbi8vIGNvbnN0IGFwaVRtcGxUcyA9IF8udGVtcGxhdGUoJ2ltcG9ydCBfX0RyQXBpIGZyb20gXFwnQHdmaC9uZy1hcHAtYnVpbGRlci9zcmMvYXBwL2FwaVxcJztcXFxuLy8gdmFyIF9fYXBpID0gX19EckFwaS5nZXRDYWNoZWRBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJykgfHwgbmV3IF9fRHJBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJyk7XFxcbi8vIF9fYXBpLmRlZmF1bHQgPSBfX2FwaTsnKTtcblxuKE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpIGFzIERyY3BBcGkpLmJyb3dzZXJBcGlDb25maWcgPSBicm93c2VyTGVnb0NvbmZpZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVFNSZWFkSG9va2VyIHtcbiAgaG9va0Z1bmM6IEhvb2tSZWFkRnVuYztcbiAgdGVtcGxhdGVGaWxlQ291bnQgPSAwO1xuICB0c0ZpbGVDb3VudCA9IDA7XG4gIHByaXZhdGUgcmVhbEZpbGVDYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBzdHJpbmc+KHttYXg6IDEwMCwgbWF4QWdlOiAyMDAwMH0pO1xuICBwcml2YXRlIHRzQ2FjaGUgPSBuZXcgTFJVPHN0cmluZywgQXJyYXlCdWZmZXI+KHttYXg6IDEwMCwgbWF4QWdlOiAyMDAwMH0pO1xuXG5cbiAgY29uc3RydWN0b3IodHNjb25maWdGaWxlOiBzdHJpbmcsIHByZXNlcnZlU3ltbGlua3MgPSBmYWxzZSkge1xuICAgIHRoaXMuaG9va0Z1bmMgPSB0aGlzLmNyZWF0ZVRzUmVhZEhvb2sodHNjb25maWdGaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMudHNDYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBBcnJheUJ1ZmZlcj4oe21heDogMTAwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gICAgdGhpcy50ZW1wbGF0ZUZpbGVDb3VudCA9IDA7XG4gICAgdGhpcy50c0ZpbGVDb3VudCA9IDA7XG4gIH1cblxuICBsb2dGaWxlQ291bnQoKSB7XG4gICAgbG9nLmluZm8oYFJlYWQgdGVtcGxhdGUgZmlsZXM6ICR7dGhpcy50ZW1wbGF0ZUZpbGVDb3VudH0sIFR5cGVzY3JpcHQgZmlsZXM6ICR7dGhpcy50c0ZpbGVDb3VudH1gKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVhbEZpbGUoZmlsZTogc3RyaW5nLCBwcmVzZXJ2ZVN5bWxpbmtzOiBib29sZWFuKTogc3RyaW5nIHtcbiAgICBjb25zdCByZWFsRmlsZSA9IHRoaXMucmVhbEZpbGVDYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKHJlYWxGaWxlICE9PSB1bmRlZmluZWQpXG4gICAgICByZXR1cm4gcmVhbEZpbGU7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBpZiAoIXByZXNlcnZlU3ltbGlua3MpXG4gICAgICAgIGxvZy53YXJuKGBSZWFkaW5nIGEgc3ltbGluazogJHtmaWxlfSwgYnV0IFwicHJlc2VydmVTeW1saW5rc1wiIGlzIGZhbHNlLmApO1xuICAgICAgY29uc3QgcmYgPSBmcy5yZWFscGF0aFN5bmMoZmlsZSk7XG4gICAgICB0aGlzLnJlYWxGaWxlQ2FjaGUuc2V0KGZpbGUsIHJmKTtcbiAgICAgIHJldHVybiByZjtcbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVUc1JlYWRIb29rKHRzY29uZmlnRmlsZTogc3RyaW5nLCBwcmVzZXJ2ZVN5bWxpbmtzID0gZmFsc2UpOiBIb29rUmVhZEZ1bmMge1xuICAgIGNvbnN0IHRzQ29tcGlsZXJPcHRpb25zID0gcmVhZFRzQ29uZmlnKHRzY29uZmlnRmlsZSk7XG4gICAgY29uc3Qgbmc4Q29tcGxpYW50ID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lICsgJy5uZzhDb21wbGlhbnQnLCB0cnVlKTtcblxuICAgIHJldHVybiAoZmlsZTogc3RyaW5nLCBidWY6IEFycmF5QnVmZmVyKTogT2JzZXJ2YWJsZTxBcnJheUJ1ZmZlcj4gPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKSB7XG4gICAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gb2YoY2FjaGVkKTtcbiAgICAgICAgICB0aGlzLnRlbXBsYXRlRmlsZUNvdW50Kys7XG4gICAgICAgICAgcmV0dXJuIHJlcGxhY2VIdG1sKGZpbGUsIEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKSlcbiAgICAgICAgICAgIC5waXBlKG1hcChvdXRwdXQgPT4gc3RyaW5nMmJ1ZmZlcihvdXRwdXQpKSk7XG5cbiAgICAgICAgfSBlbHNlIGlmICghZmlsZS5lbmRzV2l0aCgnLnRzJykgfHwgZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIHJldHVybiBvZihidWYpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgaWYgKGNhY2hlZCAhPSBudWxsKVxuICAgICAgICAgIHJldHVybiBvZihjYWNoZWQpO1xuXG4gICAgICAgIHRoaXMudHNGaWxlQ291bnQrKztcblxuICAgICAgICAvLyBjb25zdCBjb21wUGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgICAgICBsZXQgY29udGVudCA9IEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKTtcbiAgICAgICAgXG5cbiAgICAgICAgLy8gY29uc3QgdHNTZWxlY3RvciA9IG5ldyBTZWxlY3Rvcihjb250ZW50LCBmaWxlKTtcbiAgICAgICAgLy8gY29uc3QgaGFzSW1wb3J0QXBpID0gdHNTZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24gPiAubW9kdWxlU3BlY2lmaWVyOlN0cmluZ0xpdGVyYWwnKS5zb21lKGFzdCA9PiB7XG4gICAgICAgIC8vICAgcmV0dXJuIChhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCA9PT0gJ19fYXBpJztcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIC8vIGlmIChmaWxlLmVuZHNXaXRoKCdwcm9qZWN0LW1vZHVsZXMudHMnKSkge1xuICAgICAgICAvLyAgIGNvbnN0IGlqID0gYXBpLmJyb3dzZXJJbmplY3RvcjtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhpai5kaXJUcmVlLnRyYXZlcnNlKCkpO1xuICAgICAgICAvLyB9XG4gICAgICAgIGxldCBjaGFuZ2VkID0gYXBpLmJyb3dzZXJJbmplY3Rvci5pbmplY3RUb0ZpbGUoZmlsZSwgY29udGVudCk7XG5cbiAgICAgICAgaWYgKG5nOENvbXBsaWFudClcbiAgICAgICAgICBjaGFuZ2VkID0gdHJhbnNmb3JtVmlld0NoaWxkKGNoYW5nZWQsIGZpbGUpO1xuXG4gICAgICAgIGNoYW5nZWQgPSBuZXcgQXBpQW90Q29tcGlsZXIoZmlsZSwgY2hhbmdlZCkucGFyc2Uoc291cmNlID0+IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgdHNDb21waWxlck9wdGlvbnMpKTtcbiAgICAgICAgLy8gaWYgKGhhc0ltcG9ydEFwaSAmJiBjb21wUGtnKSB7XG4gICAgICAgIC8vICAgY2hhbmdlZCA9IGFwaVRtcGxUcyh7cGFja2FnZU5hbWU6IGNvbXBQa2cubG9uZ05hbWV9KSArICdcXG4nICsgY2hhbmdlZDtcbiAgICAgICAgLy8gICBsb2cud2FybignRGVwcmVjYXRlZCB1c2FnZTogaW1wb3J0IC4uLiBmcm9tIFwiX19hcGlcIiBpbiAnLCBmaWxlKTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIGlmIChuZWVkTG9nRmlsZSlcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5jeWFuKGZpbGUpICsgJzpcXG4nICsgY2hhbmdlZCk7XG4gICAgICAgIGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjaGFuZ2VkKTtcbiAgICAgICAgdGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG4gICAgICAgIHJldHVybiBvZihiZik7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBsb2cuZXJyb3IoZXgpO1xuICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihleCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmcyYnVmZmVyKGlucHV0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gIGNvbnN0IG5vZGVCdWYgPSBCdWZmZXIuZnJvbShpbnB1dCk7XG4gIGNvbnN0IGxlbiA9IG5vZGVCdWYuYnl0ZUxlbmd0aDtcbiAgY29uc3QgbmV3QnVmID0gbmV3IEFycmF5QnVmZmVyKGxlbik7XG4gIGNvbnN0IGRhdGFWaWV3ID0gbmV3IERhdGFWaWV3KG5ld0J1Zik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBkYXRhVmlldy5zZXRVaW50OChpLCBub2RlQnVmLnJlYWRVSW50OChpKSk7XG4gIH1cbiAgcmV0dXJuIG5ld0J1Zjtcbn1cblxuZnVuY3Rpb24gYnJvd3NlckxlZ29Db25maWcoKSB7XG4gIHZhciBicm93c2VyUHJvcFNldDogYW55ID0ge307XG4gIHZhciBsZWdvQ29uZmlnOiBhbnkgPSB7fTsgLy8gbGVnb0NvbmZpZyBpcyBnbG9iYWwgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzIHdoaWNoIGFwcGx5IHRvIGFsbCBlbnRyaWVzIGFuZCBtb2R1bGVzXG4gIF8uZWFjaChbXG4gICAgJ3N0YXRpY0Fzc2V0c1VSTCcsICdzZXJ2ZXJVUkwnLCAncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsXG4gICAgJ2xvY2FsZXMnLCAnZGV2TW9kZSdcbiAgXSwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IDEpO1xuICBfLmVhY2goYXBpLmNvbmZpZygpLmJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IHRydWUpO1xuICBfLmZvck93bihicm93c2VyUHJvcFNldCwgKG5vdGhpbmcsIHByb3BQYXRoKSA9PiBfLnNldChsZWdvQ29uZmlnLCBwcm9wUGF0aCwgXy5nZXQoYXBpLmNvbmZpZygpLCBwcm9wUGF0aCkpKTtcbiAgcmV0dXJuIGxlZ29Db25maWc7XG59XG5cbiJdfQ==