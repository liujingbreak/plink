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
const lru_cache_1 = tslib_1.__importDefault(require("lru-cache"));
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
        this.realFileCache = new lru_cache_1.default({ max: 100, maxAge: 20000 });
        this.tsCache = new lru_cache_1.default({ max: 100, maxAge: 20000 });
        this.hookFunc = this.createTsReadHook(ngParam);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9DQUFvQztBQUNwQyxzRUFBdUY7QUFDdkYsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1Qix1REFBaUM7QUFDakMsK0JBQWtEO0FBQ2xELDhDQUFtQztBQUVuQywwREFBbUM7QUFDbkMsbURBQThDO0FBRzlDLGdGQUE0QztBQUM1QyxrRkFBbUQ7QUFDbkQseUVBQThFO0FBQzlFLGtFQUE0QjtBQUM1QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFL0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGdCQUFnQixDQUFDLENBQUM7QUFFakUsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQzs7dUJBRU4sQ0FBQyxDQUFDO0FBQ3pCLDhFQUE4RTtBQUU3RSxNQUFNLENBQUMsY0FBYyxDQUFDLGVBQUcsQ0FBYSxDQUFDLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDO0FBRTdFLE1BQXFCLFlBQVk7SUFRL0IsWUFBWSxPQUF3QjtRQU5wQyxzQkFBaUIsR0FBRyxDQUFDLENBQUM7UUFDdEIsZ0JBQVcsR0FBRyxDQUFDLENBQUM7UUFDUixrQkFBYSxHQUFHLElBQUksbUJBQUcsQ0FBaUIsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQ25FLFlBQU8sR0FBRyxJQUFJLG1CQUFHLENBQXNCLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUl4RSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsS0FBSztRQUNILElBQUksQ0FB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QUFFLENBQUM7SUFDckIsSUFBSSxXQUFXLEdBQWEsRUFBRSxDQUFDO0lBQy9CLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQzdCLElBQUksTUFBTSxHQUFHLGVBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdDLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxLQUFLLEVBQUU7WUFDekIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztTQUNyQjthQUFNO1lBQ0wsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN2QjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTztRQUNMLEtBQUssRUFBRSxXQUFXO1FBQ2xCLE9BQU8sRUFBRSxNQUFNO0tBQ2hCLENBQUM7QUFDSixDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLXRzLXJlcGxhY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCB7IHJlYWRUc0NvbmZpZywgdHJhbnNwaWxlU2luZ2xlVHMgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBvZiwgdGhyb3dFcnJvciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGFwaSwge0RyY3BBcGl9IGZyb20gJ19fYXBpJztcbmltcG9ydCB7IHJlcGxhY2VIdG1sIH0gZnJvbSAnLi9uZy1hb3QtYXNzZXRzJztcbmltcG9ydCB7IEFuZ3VsYXJDbGlQYXJhbSB9IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCB7IEhvb2tSZWFkRnVuYyB9IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuaW1wb3J0IHt0cmFuc2Zvcm0gYXMgdHJhbnNmb3JtVmlld0NoaWxkfSBmcm9tICcuL3V0aWxzL3VwZ3JhZGUtdmlld2NoaWxkLW5nOCc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5uZy10cy1yZXBsYWNlJyk7XG5cbmNvbnN0IGFwaVRtcGxUcyA9IF8udGVtcGxhdGUoJ2ltcG9ydCBfX0RyQXBpIGZyb20gXFwnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2FwcC9hcGlcXCc7XFxcbnZhciBfX2FwaSA9IF9fRHJBcGkuZ2V0Q2FjaGVkQXBpKFxcJzwlPXBhY2thZ2VOYW1lJT5cXCcpIHx8IG5ldyBfX0RyQXBpKFxcJzwlPXBhY2thZ2VOYW1lJT5cXCcpO1xcXG5fX2FwaS5kZWZhdWx0ID0gX19hcGk7Jyk7XG4vLyBjb25zdCBpbmNsdWRlVHNGaWxlID0gUGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ3NyYycsICdkcmNwLWluY2x1ZGUudHMnKTtcblxuKE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpIGFzIERyY3BBcGkpLmJyb3dzZXJBcGlDb25maWcgPSBicm93c2VyTGVnb0NvbmZpZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVFNSZWFkSG9va2VyIHtcbiAgaG9va0Z1bmM6IEhvb2tSZWFkRnVuYztcbiAgdGVtcGxhdGVGaWxlQ291bnQgPSAwO1xuICB0c0ZpbGVDb3VudCA9IDA7XG4gIHByaXZhdGUgcmVhbEZpbGVDYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBzdHJpbmc+KHttYXg6IDEwMCwgbWF4QWdlOiAyMDAwMH0pO1xuICBwcml2YXRlIHRzQ2FjaGUgPSBuZXcgTFJVPHN0cmluZywgQXJyYXlCdWZmZXI+KHttYXg6IDEwMCwgbWF4QWdlOiAyMDAwMH0pO1xuXG5cbiAgY29uc3RydWN0b3IobmdQYXJhbTogQW5ndWxhckNsaVBhcmFtKSB7XG4gICAgdGhpcy5ob29rRnVuYyA9IHRoaXMuY3JlYXRlVHNSZWFkSG9vayhuZ1BhcmFtKTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMudHNDYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBBcnJheUJ1ZmZlcj4oe21heDogMTAwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gICAgdGhpcy50ZW1wbGF0ZUZpbGVDb3VudCA9IDA7XG4gICAgdGhpcy50c0ZpbGVDb3VudCA9IDA7XG4gIH1cblxuICBsb2dGaWxlQ291bnQoKSB7XG4gICAgbG9nLmluZm8oYFJlYWQgdGVtcGxhdGUgZmlsZXM6ICR7dGhpcy50ZW1wbGF0ZUZpbGVDb3VudH0sIFR5cGVzY3JpcHQgZmlsZXM6ICR7dGhpcy50c0ZpbGVDb3VudH1gKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVhbEZpbGUoZmlsZTogc3RyaW5nLCBwcmVzZXJ2ZVN5bWxpbmtzOiBib29sZWFuKTogc3RyaW5nIHtcbiAgICBjb25zdCByZWFsRmlsZSA9IHRoaXMucmVhbEZpbGVDYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKHJlYWxGaWxlICE9PSB1bmRlZmluZWQpXG4gICAgICByZXR1cm4gcmVhbEZpbGU7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBpZiAoIXByZXNlcnZlU3ltbGlua3MpXG4gICAgICAgIGxvZy53YXJuKGBSZWFkaW5nIGEgc3ltbGluazogJHtmaWxlfSwgYnV0IFwicHJlc2VydmVTeW1saW5rc1wiIGlzIGZhbHNlLmApO1xuICAgICAgY29uc3QgcmYgPSBmcy5yZWFscGF0aFN5bmMoZmlsZSk7XG4gICAgICB0aGlzLnJlYWxGaWxlQ2FjaGUuc2V0KGZpbGUsIHJmKTtcbiAgICAgIHJldHVybiByZjtcbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVUc1JlYWRIb29rKG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSk6IEhvb2tSZWFkRnVuYyB7XG4gICAgLy8gbGV0IGRyY3BJbmNsdWRlQnVmOiBBcnJheUJ1ZmZlcjtcbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnRzQ29uZmlnO1xuXG4gICAgLy8gY29uc3QgaG1yRW5hYmxlZCA9IF8uZ2V0KG5nUGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuaG1yJykgfHwgYXBpLmFyZ3YuaG1yO1xuICAgIGNvbnN0IHByZXNlcnZlU3ltbGlua3MgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3MgIT0gbnVsbCA/IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyA6XG4gICAgICBmYWxzZTtcbiAgICBjb25zdCB0c0NvbXBpbGVyT3B0aW9ucyA9IHJlYWRUc0NvbmZpZyh0c2NvbmZpZ0ZpbGUpO1xuICAgIGNvbnN0IG5nOENvbXBsaWFudCA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcubmc4Q29tcGxpYW50JywgdHJ1ZSk7XG5cbiAgICByZXR1cm4gKGZpbGU6IHN0cmluZywgYnVmOiBBcnJheUJ1ZmZlcik6IE9ic2VydmFibGU8QXJyYXlCdWZmZXI+ID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChmaWxlLmVuZHNXaXRoKCcuY29tcG9uZW50Lmh0bWwnKSkge1xuICAgICAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMudHNDYWNoZS5nZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSk7XG4gICAgICAgICAgaWYgKGNhY2hlZCAhPSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuIG9mKGNhY2hlZCk7XG4gICAgICAgICAgdGhpcy50ZW1wbGF0ZUZpbGVDb3VudCsrO1xuICAgICAgICAgIHJldHVybiByZXBsYWNlSHRtbChmaWxlLCBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCkpXG4gICAgICAgICAgICAucGlwZShtYXAob3V0cHV0ID0+IHN0cmluZzJidWZmZXIob3V0cHV0KSkpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoIWZpbGUuZW5kc1dpdGgoJy50cycpIHx8IGZpbGUuZW5kc1dpdGgoJy5kLnRzJykpIHtcbiAgICAgICAgICByZXR1cm4gb2YoYnVmKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMudHNDYWNoZS5nZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSk7XG4gICAgICAgIGlmIChjYWNoZWQgIT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gb2YoY2FjaGVkKTtcblxuICAgICAgICB0aGlzLnRzRmlsZUNvdW50Kys7XG5cbiAgICAgICAgY29uc3QgY29tcFBrZyA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCk7XG4gICAgICAgIGxldCBuZWVkTG9nRmlsZSA9IGZhbHNlO1xuXG4gICAgICAgIGNvbnN0IHRzU2VsZWN0b3IgPSBuZXcgU2VsZWN0b3IoY29udGVudCwgZmlsZSk7XG4gICAgICAgIGNvbnN0IGhhc0ltcG9ydEFwaSA9IHRzU2VsZWN0b3IuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uPi5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcpLnNvbWUoYXN0ID0+IHtcbiAgICAgICAgICByZXR1cm4gKGFzdCBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0ID09PSAnX19hcGknO1xuICAgICAgICB9KTtcbiAgICAgICAgbGV0IGNoYW5nZWQgPSBhcGkuYnJvd3NlckluamVjdG9yLmluamVjdFRvRmlsZShmaWxlLCBjb250ZW50KTtcblxuICAgICAgICBpZiAobmc4Q29tcGxpYW50KVxuICAgICAgICAgIGNoYW5nZWQgPSB0cmFuc2Zvcm1WaWV3Q2hpbGQoY2hhbmdlZCwgZmlsZSk7XG5cbiAgICAgICAgY2hhbmdlZCA9IG5ldyBBcGlBb3RDb21waWxlcihmaWxlLCBjaGFuZ2VkKS5wYXJzZShzb3VyY2UgPT4gdHJhbnNwaWxlU2luZ2xlVHMoc291cmNlLCB0c0NvbXBpbGVyT3B0aW9ucykpO1xuICAgICAgICBpZiAoaGFzSW1wb3J0QXBpICYmIGNvbXBQa2cpIHtcbiAgICAgICAgICBjaGFuZ2VkID0gYXBpVG1wbFRzKHtwYWNrYWdlTmFtZTogY29tcFBrZy5sb25nTmFtZX0pICsgJ1xcbicgKyBjaGFuZ2VkO1xuICAgICAgICAgIGxvZy53YXJuKCdEZXByZWNhdGVkIHVzYWdlOiBpbXBvcnQgLi4uIGZyb20gXCJfX2FwaVwiIGluICcsIGZpbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5lZWRMb2dGaWxlKVxuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmN5YW4oZmlsZSkgKyAnOlxcbicgKyBjaGFuZ2VkKTtcbiAgICAgICAgY29uc3QgYmYgPSBzdHJpbmcyYnVmZmVyKGNoYW5nZWQpO1xuICAgICAgICB0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGJmKTtcbiAgICAgICAgcmV0dXJuIG9mKGJmKTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgIGxvZy5lcnJvcihleCk7XG4gICAgICAgIHJldHVybiB0aHJvd0Vycm9yKGV4KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZzJidWZmZXIoaW5wdXQ6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgY29uc3Qgbm9kZUJ1ZiA9IEJ1ZmZlci5mcm9tKGlucHV0KTtcbiAgY29uc3QgbGVuID0gbm9kZUJ1Zi5ieXRlTGVuZ3RoO1xuICBjb25zdCBuZXdCdWYgPSBuZXcgQXJyYXlCdWZmZXIobGVuKTtcbiAgY29uc3QgZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcobmV3QnVmKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGRhdGFWaWV3LnNldFVpbnQ4KGksIG5vZGVCdWYucmVhZFVJbnQ4KGkpKTtcbiAgfVxuICByZXR1cm4gbmV3QnVmO1xufVxuXG5mdW5jdGlvbiBicm93c2VyTGVnb0NvbmZpZygpIHtcbiAgdmFyIGJyb3dzZXJQcm9wU2V0OiBhbnkgPSB7fTtcbiAgdmFyIGxlZ29Db25maWc6IGFueSA9IHt9OyAvLyBsZWdvQ29uZmlnIGlzIGdsb2JhbCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMgd2hpY2ggYXBwbHkgdG8gYWxsIGVudHJpZXMgYW5kIG1vZHVsZXNcbiAgXy5lYWNoKFtcbiAgICAnc3RhdGljQXNzZXRzVVJMJywgJ3NlcnZlclVSTCcsICdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJyxcbiAgICAnbG9jYWxlcycsICdkZXZNb2RlJywgJ291dHB1dFBhdGhNYXAnXG4gIF0sIHByb3AgPT4gYnJvd3NlclByb3BTZXRbcHJvcF0gPSAxKTtcbiAgXy5lYWNoKGFwaS5jb25maWcoKS5icm93c2VyU2lkZUNvbmZpZ1Byb3AsIHByb3AgPT4gYnJvd3NlclByb3BTZXRbcHJvcF0gPSB0cnVlKTtcbiAgXy5mb3JPd24oYnJvd3NlclByb3BTZXQsIChub3RoaW5nLCBwcm9wUGF0aCkgPT4gXy5zZXQobGVnb0NvbmZpZywgcHJvcFBhdGgsIF8uZ2V0KGFwaS5jb25maWcoKSwgcHJvcFBhdGgpKSk7XG4gIHZhciBjb21wcmVzc2VkSW5mbyA9IGNvbXByZXNzT3V0cHV0UGF0aE1hcChsZWdvQ29uZmlnLm91dHB1dFBhdGhNYXApO1xuICBsZWdvQ29uZmlnLm91dHB1dFBhdGhNYXAgPSBjb21wcmVzc2VkSW5mby5kaWZmTWFwO1xuICBsZWdvQ29uZmlnLl9vdXRwdXRBc05hbWVzID0gY29tcHJlc3NlZEluZm8uc2FtZXM7XG4gIGxlZ29Db25maWcuYnVpbGRMb2NhbGUgPSBhcGkuZ2V0QnVpbGRMb2NhbGUoKTtcbiAgbG9nLmRlYnVnKCdEZWZpbmVQbHVnaW4gTEVHT19DT05GSUc6ICcsIGxlZ29Db25maWcpO1xuICByZXR1cm4gbGVnb0NvbmZpZztcbn1cblxuZnVuY3Rpb24gY29tcHJlc3NPdXRwdXRQYXRoTWFwKHBhdGhNYXA6IGFueSkge1xuICB2YXIgbmV3TWFwOiBhbnkgPSB7fTtcbiAgdmFyIHNhbWVBc05hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBfLmVhY2gocGF0aE1hcCwgKHZhbHVlLCBrZXkpID0+IHtcbiAgICB2YXIgcGFyc2VkID0gYXBpLnBhY2thZ2VVdGlscy5wYXJzZU5hbWUoa2V5KTtcbiAgICBpZiAocGFyc2VkLm5hbWUgIT09IHZhbHVlKSB7XG4gICAgICBuZXdNYXBba2V5XSA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzYW1lQXNOYW1lcy5wdXNoKGtleSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBzYW1lczogc2FtZUFzTmFtZXMsXG4gICAgZGlmZk1hcDogbmV3TWFwXG4gIH07XG59XG4iXX0=
