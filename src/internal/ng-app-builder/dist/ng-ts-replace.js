"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
const ts_compiler_1 = require("dr-comp-package/wfh/dist/ts-compiler");
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const __api_1 = tslib_1.__importDefault(require("__api"));
const ng_aot_assets_1 = require("./ng-aot-assets");
const ts_ast_query_1 = tslib_1.__importDefault(require("./utils/ts-ast-query"));
const ts_before_aot_1 = tslib_1.__importDefault(require("./utils/ts-before-aot"));
const upgrade_viewchild_ng8_1 = require("./utils/upgrade-viewchild-ng8");
const chalk = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName + '.ng-ts-replace');
const apiTmplTs = _.template('import __DrApi from \'@dr-core/ng-app-builder/src/app/api\';\
var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || new __DrApi(\'<%=packageName%>\');\
__api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');
Object.getPrototypeOf(__api_1.default).browserApiConfig = browserLegoConfig;
class TSReadHooker {
    constructor(ngParam) {
        this.templateFileCount = 0;
        this.tsFileCount = 0;
        this.realFileCache = new Map();
        this.tsCache = new Map();
        this.hookFunc = this.createTsReadHook(ngParam);
    }
    clear() {
        this.tsCache.clear();
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
    createTsReadHook(ngParam) {
        // let drcpIncludeBuf: ArrayBuffer;
        const tsconfigFile = ngParam.browserOptions.tsConfig;
        // const hmrEnabled = _.get(ngParam, 'builderConfig.options.hmr') || api.argv.hmr;
        const preserveSymlinks = ngParam.browserOptions.preserveSymlinks != null ? ngParam.browserOptions.preserveSymlinks :
            false;
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
                const compPkg = __api_1.default.findPackageByFile(file);
                let content = Buffer.from(buf).toString();
                let needLogFile = false;
                const tsSelector = new ts_ast_query_1.default(content, file);
                const hasImportApi = tsSelector.findAll(':ImportDeclaration>.moduleSpecifier:StringLiteral').some(ast => {
                    return ast.text === '__api';
                });
                let changed = __api_1.default.browserInjector.injectToFile(file, content);
                if (ng8Compliant)
                    changed = upgrade_viewchild_ng8_1.transform(changed, file);
                changed = new ts_before_aot_1.default(file, changed).parse(source => ts_compiler_1.transpileSingleTs(source, tsCompilerOptions));
                if (hasImportApi && compPkg) {
                    changed = apiTmplTs({ packageName: compPkg.longName }) + '\n' + changed;
                    log.warn('Deprecated usage: import ... from "__api" in ', file);
                }
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
        'locales', 'devMode', 'outputPathMap'
    ], prop => browserPropSet[prop] = 1);
    _.each(__api_1.default.config().browserSideConfigProp, prop => browserPropSet[prop] = true);
    _.forOwn(browserPropSet, (nothing, propPath) => _.set(legoConfig, propPath, _.get(__api_1.default.config(), propPath)));
    var compressedInfo = compressOutputPathMap(legoConfig.outputPathMap);
    legoConfig.outputPathMap = compressedInfo.diffMap;
    legoConfig._outputAsNames = compressedInfo.sames;
    legoConfig.buildLocale = __api_1.default.getBuildLocale();
    log.debug('DefinePlugin LEGO_CONFIG: ', legoConfig);
    return legoConfig;
}
function compressOutputPathMap(pathMap) {
    var newMap = {};
    var sameAsNames = [];
    _.each(pathMap, (value, key) => {
        var parsed = __api_1.default.packageUtils.parseName(key);
        if (parsed.name !== value) {
            newMap[key] = value;
        }
        else {
            sameAsNames.push(key);
        }
    });
    return {
        sames: sameAsNames,
        diffMap: newMap
    };
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9DQUFvQztBQUNwQyxzRUFBdUY7QUFDdkYsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1Qix1REFBaUM7QUFDakMsK0JBQWtEO0FBQ2xELDhDQUFtQztBQUVuQywwREFBbUM7QUFDbkMsbURBQThDO0FBRzlDLGdGQUE0QztBQUM1QyxrRkFBbUQ7QUFDbkQseUVBQThFO0FBQzlFLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztBQUVqRSxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDOzt1QkFFTixDQUFDLENBQUM7QUFDekIsOEVBQThFO0FBRTdFLE1BQU0sQ0FBQyxjQUFjLENBQUMsZUFBRyxDQUFhLENBQUMsZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUM7QUFFN0UsTUFBcUIsWUFBWTtJQVEvQixZQUFZLE9BQXdCO1FBTnBDLHNCQUFpQixHQUFHLENBQUMsQ0FBQztRQUN0QixnQkFBVyxHQUFHLENBQUMsQ0FBQztRQUNSLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDMUMsWUFBTyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBSS9DLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCxLQUFLO1FBQ0gsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFF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UUFDN0MsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLEtBQUssRUFBRTtZQUN6QixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQ3JCO2FBQU07WUFDTCxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3ZCO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPO1FBQ0wsS0FBSyxFQUFFLFdBQVc7UUFDbEIsT0FBTyxFQUFFLE1BQU07S0FDaEIsQ0FBQztBQUNKLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctdHMtcmVwbGFjZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0IHsgcmVhZFRzQ29uZmlnLCB0cmFuc3BpbGVTaW5nbGVUcyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC90cy1jb21waWxlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7IE9ic2VydmFibGUsIG9mLCB0aHJvd0Vycm9yIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgYXBpLCB7RHJjcEFwaX0gZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgcmVwbGFjZUh0bWwgfSBmcm9tICcuL25nLWFvdC1hc3NldHMnO1xuaW1wb3J0IHsgQW5ndWxhckNsaVBhcmFtIH0gZnJvbSAnLi9uZy9jb21tb24nO1xuaW1wb3J0IHsgSG9va1JlYWRGdW5jIH0gZnJvbSAnLi91dGlscy9yZWFkLWhvb2stdmZzaG9zdCc7XG5pbXBvcnQgU2VsZWN0b3IgZnJvbSAnLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IEFwaUFvdENvbXBpbGVyIGZyb20gJy4vdXRpbHMvdHMtYmVmb3JlLWFvdCc7XG5pbXBvcnQge3RyYW5zZm9ybSBhcyB0cmFuc2Zvcm1WaWV3Q2hpbGR9IGZyb20gJy4vdXRpbHMvdXBncmFkZS12aWV3Y2hpbGQtbmc4JztcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLm5nLXRzLXJlcGxhY2UnKTtcblxuY29uc3QgYXBpVG1wbFRzID0gXy50ZW1wbGF0ZSgnaW1wb3J0IF9fRHJBcGkgZnJvbSBcXCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvYXBwL2FwaVxcJztcXFxudmFyIF9fYXBpID0gX19EckFwaS5nZXRDYWNoZWRBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJykgfHwgbmV3IF9fRHJBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJyk7XFxcbl9fYXBpLmRlZmF1bHQgPSBfX2FwaTsnKTtcbi8vIGNvbnN0IGluY2x1ZGVUc0ZpbGUgPSBQYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnc3JjJywgJ2RyY3AtaW5jbHVkZS50cycpO1xuXG4oT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSkgYXMgRHJjcEFwaSkuYnJvd3NlckFwaUNvbmZpZyA9IGJyb3dzZXJMZWdvQ29uZmlnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUU1JlYWRIb29rZXIge1xuICBob29rRnVuYzogSG9va1JlYWRGdW5jO1xuICB0ZW1wbGF0ZUZpbGVDb3VudCA9IDA7XG4gIHRzRmlsZUNvdW50ID0gMDtcbiAgcHJpdmF0ZSByZWFsRmlsZUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgcHJpdmF0ZSB0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIEFycmF5QnVmZmVyPigpO1xuXG5cbiAgY29uc3RydWN0b3IobmdQYXJhbTogQW5ndWxhckNsaVBhcmFtKSB7XG4gICAgdGhpcy5ob29rRnVuYyA9IHRoaXMuY3JlYXRlVHNSZWFkSG9vayhuZ1BhcmFtKTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMudHNDYWNoZS5jbGVhcigpO1xuICAgIHRoaXMudGVtcGxhdGVGaWxlQ291bnQgPSAwO1xuICAgIHRoaXMudHNGaWxlQ291bnQgPSAwO1xuICB9XG5cbiAgbG9nRmlsZUNvdW50KCkge1xuICAgIGxvZy5pbmZvKGBSZWFkIHRlbXBsYXRlIGZpbGVzOiAke3RoaXMudGVtcGxhdGVGaWxlQ291bnR9LCBUeXBlc2NyaXB0IGZpbGVzOiAke3RoaXMudHNGaWxlQ291bnR9YCk7XG4gIH1cblxuICBwcml2YXRlIHJlYWxGaWxlKGZpbGU6IHN0cmluZywgcHJlc2VydmVTeW1saW5rczogYm9vbGVhbik6IHN0cmluZyB7XG4gICAgY29uc3QgcmVhbEZpbGUgPSB0aGlzLnJlYWxGaWxlQ2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmIChyZWFsRmlsZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuIHJlYWxGaWxlO1xuICAgIGlmIChmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgaWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKVxuICAgICAgICBsb2cud2FybihgUmVhZGluZyBhIHN5bWxpbms6ICR7ZmlsZX0sIGJ1dCBcInByZXNlcnZlU3ltbGlua3NcIiBpcyBmYWxzZS5gKTtcbiAgICAgIGNvbnN0IHJmID0gZnMucmVhbHBhdGhTeW5jKGZpbGUpO1xuICAgICAgdGhpcy5yZWFsRmlsZUNhY2hlLnNldChmaWxlLCByZik7XG4gICAgICByZXR1cm4gcmY7XG4gICAgfSBlbHNlXG4gICAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlVHNSZWFkSG9vayhuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0pOiBIb29rUmVhZEZ1bmMge1xuICAgIC8vIGxldCBkcmNwSW5jbHVkZUJ1ZjogQXJyYXlCdWZmZXI7XG4gICAgY29uc3QgdHNjb25maWdGaWxlID0gbmdQYXJhbS5icm93c2VyT3B0aW9ucy50c0NvbmZpZztcblxuICAgIC8vIGNvbnN0IGhtckVuYWJsZWQgPSBfLmdldChuZ1BhcmFtLCAnYnVpbGRlckNvbmZpZy5vcHRpb25zLmhtcicpIHx8IGFwaS5hcmd2LmhtcjtcbiAgICBjb25zdCBwcmVzZXJ2ZVN5bWxpbmtzID0gbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzICE9IG51bGwgPyBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3MgOlxuICAgICAgZmFsc2U7XG4gICAgY29uc3QgdHNDb21waWxlck9wdGlvbnMgPSByZWFkVHNDb25maWcodHNjb25maWdGaWxlKTtcbiAgICBjb25zdCBuZzhDb21wbGlhbnQgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUgKyAnLm5nOENvbXBsaWFudCcsIHRydWUpO1xuXG4gICAgcmV0dXJuIChmaWxlOiBzdHJpbmcsIGJ1ZjogQXJyYXlCdWZmZXIpOiBPYnNlcnZhYmxlPEFycmF5QnVmZmVyPiA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoZmlsZS5lbmRzV2l0aCgnLmNvbXBvbmVudC5odG1sJykpIHtcbiAgICAgICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLnRzQ2FjaGUuZ2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcykpO1xuICAgICAgICAgIGlmIChjYWNoZWQgIT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybiBvZihjYWNoZWQpO1xuICAgICAgICAgIHRoaXMudGVtcGxhdGVGaWxlQ291bnQrKztcbiAgICAgICAgICByZXR1cm4gcmVwbGFjZUh0bWwoZmlsZSwgQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpKVxuICAgICAgICAgICAgLnBpcGUobWFwKG91dHB1dCA9PiBzdHJpbmcyYnVmZmVyKG91dHB1dCkpKTtcblxuICAgICAgICB9IGVsc2UgaWYgKCFmaWxlLmVuZHNXaXRoKCcudHMnKSB8fCBmaWxlLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgcmV0dXJuIG9mKGJ1Zik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLnRzQ2FjaGUuZ2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcykpO1xuICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgcmV0dXJuIG9mKGNhY2hlZCk7XG5cbiAgICAgICAgdGhpcy50c0ZpbGVDb3VudCsrO1xuXG4gICAgICAgIGNvbnN0IGNvbXBQa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICAgIGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuICAgICAgICBsZXQgbmVlZExvZ0ZpbGUgPSBmYWxzZTtcblxuICAgICAgICBjb25zdCB0c1NlbGVjdG9yID0gbmV3IFNlbGVjdG9yKGNvbnRlbnQsIGZpbGUpO1xuICAgICAgICBjb25zdCBoYXNJbXBvcnRBcGkgPSB0c1NlbGVjdG9yLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbj4ubW9kdWxlU3BlY2lmaWVyOlN0cmluZ0xpdGVyYWwnKS5zb21lKGFzdCA9PiB7XG4gICAgICAgICAgcmV0dXJuIChhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCA9PT0gJ19fYXBpJztcbiAgICAgICAgfSk7XG4gICAgICAgIGxldCBjaGFuZ2VkID0gYXBpLmJyb3dzZXJJbmplY3Rvci5pbmplY3RUb0ZpbGUoZmlsZSwgY29udGVudCk7XG5cbiAgICAgICAgaWYgKG5nOENvbXBsaWFudClcbiAgICAgICAgICBjaGFuZ2VkID0gdHJhbnNmb3JtVmlld0NoaWxkKGNoYW5nZWQsIGZpbGUpO1xuXG4gICAgICAgIGNoYW5nZWQgPSBuZXcgQXBpQW90Q29tcGlsZXIoZmlsZSwgY2hhbmdlZCkucGFyc2Uoc291cmNlID0+IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgdHNDb21waWxlck9wdGlvbnMpKTtcbiAgICAgICAgaWYgKGhhc0ltcG9ydEFwaSAmJiBjb21wUGtnKSB7XG4gICAgICAgICAgY2hhbmdlZCA9IGFwaVRtcGxUcyh7cGFja2FnZU5hbWU6IGNvbXBQa2cubG9uZ05hbWV9KSArICdcXG4nICsgY2hhbmdlZDtcbiAgICAgICAgICBsb2cud2FybignRGVwcmVjYXRlZCB1c2FnZTogaW1wb3J0IC4uLiBmcm9tIFwiX19hcGlcIiBpbiAnLCBmaWxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZWVkTG9nRmlsZSlcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5jeWFuKGZpbGUpICsgJzpcXG4nICsgY2hhbmdlZCk7XG4gICAgICAgIGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjaGFuZ2VkKTtcbiAgICAgICAgdGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG4gICAgICAgIHJldHVybiBvZihiZik7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBsb2cuZXJyb3IoZXgpO1xuICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihleCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmcyYnVmZmVyKGlucHV0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gIGNvbnN0IG5vZGVCdWYgPSBCdWZmZXIuZnJvbShpbnB1dCk7XG4gIGNvbnN0IGxlbiA9IG5vZGVCdWYuYnl0ZUxlbmd0aDtcbiAgY29uc3QgbmV3QnVmID0gbmV3IEFycmF5QnVmZmVyKGxlbik7XG4gIGNvbnN0IGRhdGFWaWV3ID0gbmV3IERhdGFWaWV3KG5ld0J1Zik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBkYXRhVmlldy5zZXRVaW50OChpLCBub2RlQnVmLnJlYWRVSW50OChpKSk7XG4gIH1cbiAgcmV0dXJuIG5ld0J1Zjtcbn1cblxuZnVuY3Rpb24gYnJvd3NlckxlZ29Db25maWcoKSB7XG4gIHZhciBicm93c2VyUHJvcFNldDogYW55ID0ge307XG4gIHZhciBsZWdvQ29uZmlnOiBhbnkgPSB7fTsgLy8gbGVnb0NvbmZpZyBpcyBnbG9iYWwgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzIHdoaWNoIGFwcGx5IHRvIGFsbCBlbnRyaWVzIGFuZCBtb2R1bGVzXG4gIF8uZWFjaChbXG4gICAgJ3N0YXRpY0Fzc2V0c1VSTCcsICdzZXJ2ZXJVUkwnLCAncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsXG4gICAgJ2xvY2FsZXMnLCAnZGV2TW9kZScsICdvdXRwdXRQYXRoTWFwJ1xuICBdLCBwcm9wID0+IGJyb3dzZXJQcm9wU2V0W3Byb3BdID0gMSk7XG4gIF8uZWFjaChhcGkuY29uZmlnKCkuYnJvd3NlclNpZGVDb25maWdQcm9wLCBwcm9wID0+IGJyb3dzZXJQcm9wU2V0W3Byb3BdID0gdHJ1ZSk7XG4gIF8uZm9yT3duKGJyb3dzZXJQcm9wU2V0LCAobm90aGluZywgcHJvcFBhdGgpID0+IF8uc2V0KGxlZ29Db25maWcsIHByb3BQYXRoLCBfLmdldChhcGkuY29uZmlnKCksIHByb3BQYXRoKSkpO1xuICB2YXIgY29tcHJlc3NlZEluZm8gPSBjb21wcmVzc091dHB1dFBhdGhNYXAobGVnb0NvbmZpZy5vdXRwdXRQYXRoTWFwKTtcbiAgbGVnb0NvbmZpZy5vdXRwdXRQYXRoTWFwID0gY29tcHJlc3NlZEluZm8uZGlmZk1hcDtcbiAgbGVnb0NvbmZpZy5fb3V0cHV0QXNOYW1lcyA9IGNvbXByZXNzZWRJbmZvLnNhbWVzO1xuICBsZWdvQ29uZmlnLmJ1aWxkTG9jYWxlID0gYXBpLmdldEJ1aWxkTG9jYWxlKCk7XG4gIGxvZy5kZWJ1ZygnRGVmaW5lUGx1Z2luIExFR09fQ09ORklHOiAnLCBsZWdvQ29uZmlnKTtcbiAgcmV0dXJuIGxlZ29Db25maWc7XG59XG5cbmZ1bmN0aW9uIGNvbXByZXNzT3V0cHV0UGF0aE1hcChwYXRoTWFwOiBhbnkpIHtcbiAgdmFyIG5ld01hcDogYW55ID0ge307XG4gIHZhciBzYW1lQXNOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgXy5lYWNoKHBhdGhNYXAsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgdmFyIHBhcnNlZCA9IGFwaS5wYWNrYWdlVXRpbHMucGFyc2VOYW1lKGtleSk7XG4gICAgaWYgKHBhcnNlZC5uYW1lICE9PSB2YWx1ZSkge1xuICAgICAgbmV3TWFwW2tleV0gPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2FtZUFzTmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiB7XG4gICAgc2FtZXM6IHNhbWVBc05hbWVzLFxuICAgIGRpZmZNYXA6IG5ld01hcFxuICB9O1xufVxuIl19
