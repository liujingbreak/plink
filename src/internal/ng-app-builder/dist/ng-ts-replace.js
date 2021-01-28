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
const ts_ast_query_1 = __importDefault(require("./utils/ts-ast-query"));
const ts_before_aot_1 = __importDefault(require("./utils/ts-before-aot"));
const upgrade_viewchild_ng8_1 = require("./utils/upgrade-viewchild-ng8");
const lru_cache_1 = __importDefault(require("lru-cache"));
const chalk = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName + '.ng-ts-replace');
const apiTmplTs = _.template('import __DrApi from \'@wfh/ng-app-builder/src/app/api\';\
var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || new __DrApi(\'<%=packageName%>\');\
__api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');
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
        // let drcpIncludeBuf: ArrayBuffer;
        // const tsconfigFile = ngParam.browserOptions.tsConfig;
        // const preserveSymlinks = ngParam.browserOptions.preserveSymlinks != null ? ngParam.browserOptions.preserveSymlinks :
        //   false;
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
                // if (file.endsWith('project-modules.ts')) {
                //   const ij = api.browserInjector;
                //   console.log(ij.dirTree.traverse());
                // }
                let changed = __api_1.default.browserInjector.injectToFile(file, content);
                // if (file.indexOf('app.module.ts') >= 0)
                //   log.warn(`${process.pid}, file: ${file},\n` + changed);
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
        'locales', 'devMode'
    ], prop => browserPropSet[prop] = 1);
    _.each(__api_1.default.config().browserSideConfigProp, prop => browserPropSet[prop] = true);
    _.forOwn(browserPropSet, (nothing, propPath) => _.set(legoConfig, propPath, _.get(__api_1.default.config(), propPath)));
    return legoConfig;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctdHMtcmVwbGFjZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5nLXRzLXJlcGxhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQyxpRUFBa0Y7QUFDbEYsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1QiwrQ0FBaUM7QUFDakMsK0JBQWtEO0FBQ2xELDhDQUFtQztBQUVuQyxrREFBbUM7QUFDbkMsbURBQThDO0FBRTlDLHdFQUE0QztBQUM1QywwRUFBbUQ7QUFDbkQseUVBQThFO0FBQzlFLDBEQUE0QjtBQUM1QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFL0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGdCQUFnQixDQUFDLENBQUM7QUFFakUsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQzs7dUJBRU4sQ0FBQyxDQUFDO0FBQ3pCLDhFQUE4RTtBQUU3RSxNQUFNLENBQUMsY0FBYyxDQUFDLGVBQUcsQ0FBYSxDQUFDLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDO0FBRTdFLE1BQXFCLFlBQVk7SUFRL0IsWUFBWSxZQUFvQixFQUFFLGdCQUFnQixHQUFHLEtBQUs7UUFOMUQsc0JBQWlCLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ1Isa0JBQWEsR0FBRyxJQUFJLG1CQUFHLENBQWlCLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUNuRSxZQUFPLEdBQUcsSUFBSSxtQkFBRyxDQUFzQixFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7UUFJeEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUVELEtBQUs7UUFDSCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksbUJBQUcsQ0FBc0IsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVELFlBQVk7UUFDVixHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixJQUFJLENBQUMsaUJBQWlCLHVCQUF1QixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztJQUNwRyxDQUFDO0lBRU8sUUFBUSxDQUFDLElBQVksRUFBRSxnQkFBeUI7UUFDdEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUMsSUFBSSxRQUFRLEtBQUssU0FBUztZQUN4QixPQUFPLFFBQVEsQ0FBQztRQUNsQixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7WUFDdkMsSUFBSSxDQUFDLGdCQUFnQjtnQkFDbkIsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsSUFBSSxvQ0FBb0MsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2pDLE9BQU8sRUFBRSxDQUFDO1NBQ1g7O1lBQ0MsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFlBQW9CLEVBQUUsZ0JBQWdCLEdBQUcsS0FBSztRQUNyRSxtQ0FBbUM7UUFDbkMsd0RBQXdEO1FBRXhELHVIQUF1SDtRQUN2SCxXQUFXO1FBQ1gsTUFBTSxpQkFBaUIsR0FBRywwQkFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JELE1BQU0sWUFBWSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTdFLE9BQU8sQ0FBQyxJQUFZLEVBQUUsR0FBZ0IsRUFBMkIsRUFBRTtZQUNqRSxJQUFJO2dCQUNGLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO29CQUNwQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZFLElBQUksTUFBTSxJQUFJLElBQUk7d0JBQ2hCLE9BQU8sU0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNwQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDekIsT0FBTywyQkFBVyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO3lCQUNsRCxJQUFJLENBQUMsZUFBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFFL0M7cUJBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDMUQsT0FBTyxTQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2hCO2dCQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztnQkFDdkUsSUFBSSxNQUFNLElBQUksSUFBSTtvQkFDaEIsT0FBTyxTQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRXBCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFFbkIsTUFBTSxPQUFPLEdBQUcsZUFBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM1QyxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7Z0JBRXhCLE1BQU0sVUFBVSxHQUFHLElBQUksc0JBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsbURBQW1ELENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3RHLE9BQVEsR0FBd0IsQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDO2dCQUNwRCxDQUFDLENBQUMsQ0FBQztnQkFDSCw2Q0FBNkM7Z0JBQzdDLG9DQUFvQztnQkFDcEMsd0NBQXdDO2dCQUN4QyxJQUFJO2dCQUNKLElBQUksT0FBTyxHQUFHLGVBQUcsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFFOUQsMENBQTBDO2dCQUMxQyw0REFBNEQ7Z0JBRTVELElBQUksWUFBWTtvQkFDZCxPQUFPLEdBQUcsaUNBQWtCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUU5QyxPQUFPLEdBQUcsSUFBSSx1QkFBYyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQywrQkFBaUIsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUMxRyxJQUFJLFlBQVksSUFBSSxPQUFPLEVBQUU7b0JBQzNCLE9BQU8sR0FBRyxTQUFTLENBQUMsRUFBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLE9BQU8sQ0FBQztvQkFDdEUsR0FBRyxDQUFDLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDakU7Z0JBRUQsSUFBSSxXQUFXO29CQUNiLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsT0FBTyxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sRUFBRSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUQsT0FBTyxTQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDZjtZQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUNYLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2QsT0FBTyxpQkFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZCO1FBQ0gsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUVGO0FBdkdELCtCQXVHQztBQUVELFNBQWdCLGFBQWEsQ0FBQyxLQUFhO0lBQ3pDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztJQUMvQixNQUFNLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzVCLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUM1QztJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFURCxzQ0FTQztBQUVELFNBQVMsaUJBQWlCO0lBQ3hCLElBQUksY0FBYyxHQUFRLEVBQUUsQ0FBQztJQUM3QixJQUFJLFVBQVUsR0FBUSxFQUFFLENBQUMsQ0FBQyx1RkFBdUY7SUFDakgsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNMLGlCQUFpQixFQUFFLFdBQVcsRUFBRSwyQkFBMkI7UUFDM0QsU0FBUyxFQUFFLFNBQVM7S0FDckIsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNyQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNoRixDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUcsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0IHsgcmVhZFRzQ29uZmlnLCB0cmFuc3BpbGVTaW5nbGVUcyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBvZiwgdGhyb3dFcnJvciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGFwaSwge0RyY3BBcGl9IGZyb20gJ19fYXBpJztcbmltcG9ydCB7IHJlcGxhY2VIdG1sIH0gZnJvbSAnLi9uZy1hb3QtYXNzZXRzJztcbmltcG9ydCB7IEhvb2tSZWFkRnVuYyB9IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuaW1wb3J0IHt0cmFuc2Zvcm0gYXMgdHJhbnNmb3JtVmlld0NoaWxkfSBmcm9tICcuL3V0aWxzL3VwZ3JhZGUtdmlld2NoaWxkLW5nOCc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5uZy10cy1yZXBsYWNlJyk7XG5cbmNvbnN0IGFwaVRtcGxUcyA9IF8udGVtcGxhdGUoJ2ltcG9ydCBfX0RyQXBpIGZyb20gXFwnQHdmaC9uZy1hcHAtYnVpbGRlci9zcmMvYXBwL2FwaVxcJztcXFxudmFyIF9fYXBpID0gX19EckFwaS5nZXRDYWNoZWRBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJykgfHwgbmV3IF9fRHJBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJyk7XFxcbl9fYXBpLmRlZmF1bHQgPSBfX2FwaTsnKTtcbi8vIGNvbnN0IGluY2x1ZGVUc0ZpbGUgPSBQYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnc3JjJywgJ2RyY3AtaW5jbHVkZS50cycpO1xuXG4oT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSkgYXMgRHJjcEFwaSkuYnJvd3NlckFwaUNvbmZpZyA9IGJyb3dzZXJMZWdvQ29uZmlnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUU1JlYWRIb29rZXIge1xuICBob29rRnVuYzogSG9va1JlYWRGdW5jO1xuICB0ZW1wbGF0ZUZpbGVDb3VudCA9IDA7XG4gIHRzRmlsZUNvdW50ID0gMDtcbiAgcHJpdmF0ZSByZWFsRmlsZUNhY2hlID0gbmV3IExSVTxzdHJpbmcsIHN0cmluZz4oe21heDogMTAwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIHByaXZhdGUgdHNDYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBBcnJheUJ1ZmZlcj4oe21heDogMTAwLCBtYXhBZ2U6IDIwMDAwfSk7XG5cblxuICBjb25zdHJ1Y3Rvcih0c2NvbmZpZ0ZpbGU6IHN0cmluZywgcHJlc2VydmVTeW1saW5rcyA9IGZhbHNlKSB7XG4gICAgdGhpcy5ob29rRnVuYyA9IHRoaXMuY3JlYXRlVHNSZWFkSG9vayh0c2NvbmZpZ0ZpbGUsIHByZXNlcnZlU3ltbGlua3MpO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy50c0NhY2hlID0gbmV3IExSVTxzdHJpbmcsIEFycmF5QnVmZmVyPih7bWF4OiAxMDAsIG1heEFnZTogMjAwMDB9KTtcbiAgICB0aGlzLnRlbXBsYXRlRmlsZUNvdW50ID0gMDtcbiAgICB0aGlzLnRzRmlsZUNvdW50ID0gMDtcbiAgfVxuXG4gIGxvZ0ZpbGVDb3VudCgpIHtcbiAgICBsb2cuaW5mbyhgUmVhZCB0ZW1wbGF0ZSBmaWxlczogJHt0aGlzLnRlbXBsYXRlRmlsZUNvdW50fSwgVHlwZXNjcmlwdCBmaWxlczogJHt0aGlzLnRzRmlsZUNvdW50fWApO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFsRmlsZShmaWxlOiBzdHJpbmcsIHByZXNlcnZlU3ltbGlua3M6IGJvb2xlYW4pOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlYWxGaWxlID0gdGhpcy5yZWFsRmlsZUNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAocmVhbEZpbGUgIT09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybiByZWFsRmlsZTtcbiAgICBpZiAoZnMubHN0YXRTeW5jKGZpbGUpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIGlmICghcHJlc2VydmVTeW1saW5rcylcbiAgICAgICAgbG9nLndhcm4oYFJlYWRpbmcgYSBzeW1saW5rOiAke2ZpbGV9LCBidXQgXCJwcmVzZXJ2ZVN5bWxpbmtzXCIgaXMgZmFsc2UuYCk7XG4gICAgICBjb25zdCByZiA9IGZzLnJlYWxwYXRoU3luYyhmaWxlKTtcbiAgICAgIHRoaXMucmVhbEZpbGVDYWNoZS5zZXQoZmlsZSwgcmYpO1xuICAgICAgcmV0dXJuIHJmO1xuICAgIH0gZWxzZVxuICAgICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVRzUmVhZEhvb2sodHNjb25maWdGaWxlOiBzdHJpbmcsIHByZXNlcnZlU3ltbGlua3MgPSBmYWxzZSk6IEhvb2tSZWFkRnVuYyB7XG4gICAgLy8gbGV0IGRyY3BJbmNsdWRlQnVmOiBBcnJheUJ1ZmZlcjtcbiAgICAvLyBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnRzQ29uZmlnO1xuXG4gICAgLy8gY29uc3QgcHJlc2VydmVTeW1saW5rcyA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyAhPSBudWxsID8gbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzIDpcbiAgICAvLyAgIGZhbHNlO1xuICAgIGNvbnN0IHRzQ29tcGlsZXJPcHRpb25zID0gcmVhZFRzQ29uZmlnKHRzY29uZmlnRmlsZSk7XG4gICAgY29uc3Qgbmc4Q29tcGxpYW50ID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lICsgJy5uZzhDb21wbGlhbnQnLCB0cnVlKTtcblxuICAgIHJldHVybiAoZmlsZTogc3RyaW5nLCBidWY6IEFycmF5QnVmZmVyKTogT2JzZXJ2YWJsZTxBcnJheUJ1ZmZlcj4gPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKSB7XG4gICAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gb2YoY2FjaGVkKTtcbiAgICAgICAgICB0aGlzLnRlbXBsYXRlRmlsZUNvdW50Kys7XG4gICAgICAgICAgcmV0dXJuIHJlcGxhY2VIdG1sKGZpbGUsIEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKSlcbiAgICAgICAgICAgIC5waXBlKG1hcChvdXRwdXQgPT4gc3RyaW5nMmJ1ZmZlcihvdXRwdXQpKSk7XG5cbiAgICAgICAgfSBlbHNlIGlmICghZmlsZS5lbmRzV2l0aCgnLnRzJykgfHwgZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIHJldHVybiBvZihidWYpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgaWYgKGNhY2hlZCAhPSBudWxsKVxuICAgICAgICAgIHJldHVybiBvZihjYWNoZWQpO1xuXG4gICAgICAgIHRoaXMudHNGaWxlQ291bnQrKztcblxuICAgICAgICBjb25zdCBjb21wUGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgICAgICBsZXQgY29udGVudCA9IEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKTtcbiAgICAgICAgbGV0IG5lZWRMb2dGaWxlID0gZmFsc2U7XG5cbiAgICAgICAgY29uc3QgdHNTZWxlY3RvciA9IG5ldyBTZWxlY3Rvcihjb250ZW50LCBmaWxlKTtcbiAgICAgICAgY29uc3QgaGFzSW1wb3J0QXBpID0gdHNTZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24+Lm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJykuc29tZShhc3QgPT4ge1xuICAgICAgICAgIHJldHVybiAoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQgPT09ICdfX2FwaSc7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBpZiAoZmlsZS5lbmRzV2l0aCgncHJvamVjdC1tb2R1bGVzLnRzJykpIHtcbiAgICAgICAgLy8gICBjb25zdCBpaiA9IGFwaS5icm93c2VySW5qZWN0b3I7XG4gICAgICAgIC8vICAgY29uc29sZS5sb2coaWouZGlyVHJlZS50cmF2ZXJzZSgpKTtcbiAgICAgICAgLy8gfVxuICAgICAgICBsZXQgY2hhbmdlZCA9IGFwaS5icm93c2VySW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGNvbnRlbnQpO1xuXG4gICAgICAgIC8vIGlmIChmaWxlLmluZGV4T2YoJ2FwcC5tb2R1bGUudHMnKSA+PSAwKVxuICAgICAgICAvLyAgIGxvZy53YXJuKGAke3Byb2Nlc3MucGlkfSwgZmlsZTogJHtmaWxlfSxcXG5gICsgY2hhbmdlZCk7XG5cbiAgICAgICAgaWYgKG5nOENvbXBsaWFudClcbiAgICAgICAgICBjaGFuZ2VkID0gdHJhbnNmb3JtVmlld0NoaWxkKGNoYW5nZWQsIGZpbGUpO1xuXG4gICAgICAgIGNoYW5nZWQgPSBuZXcgQXBpQW90Q29tcGlsZXIoZmlsZSwgY2hhbmdlZCkucGFyc2Uoc291cmNlID0+IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgdHNDb21waWxlck9wdGlvbnMpKTtcbiAgICAgICAgaWYgKGhhc0ltcG9ydEFwaSAmJiBjb21wUGtnKSB7XG4gICAgICAgICAgY2hhbmdlZCA9IGFwaVRtcGxUcyh7cGFja2FnZU5hbWU6IGNvbXBQa2cubG9uZ05hbWV9KSArICdcXG4nICsgY2hhbmdlZDtcbiAgICAgICAgICBsb2cud2FybignRGVwcmVjYXRlZCB1c2FnZTogaW1wb3J0IC4uLiBmcm9tIFwiX19hcGlcIiBpbiAnLCBmaWxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZWVkTG9nRmlsZSlcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5jeWFuKGZpbGUpICsgJzpcXG4nICsgY2hhbmdlZCk7XG4gICAgICAgIGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjaGFuZ2VkKTtcbiAgICAgICAgdGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG4gICAgICAgIHJldHVybiBvZihiZik7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBsb2cuZXJyb3IoZXgpO1xuICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihleCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmcyYnVmZmVyKGlucHV0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gIGNvbnN0IG5vZGVCdWYgPSBCdWZmZXIuZnJvbShpbnB1dCk7XG4gIGNvbnN0IGxlbiA9IG5vZGVCdWYuYnl0ZUxlbmd0aDtcbiAgY29uc3QgbmV3QnVmID0gbmV3IEFycmF5QnVmZmVyKGxlbik7XG4gIGNvbnN0IGRhdGFWaWV3ID0gbmV3IERhdGFWaWV3KG5ld0J1Zik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBkYXRhVmlldy5zZXRVaW50OChpLCBub2RlQnVmLnJlYWRVSW50OChpKSk7XG4gIH1cbiAgcmV0dXJuIG5ld0J1Zjtcbn1cblxuZnVuY3Rpb24gYnJvd3NlckxlZ29Db25maWcoKSB7XG4gIHZhciBicm93c2VyUHJvcFNldDogYW55ID0ge307XG4gIHZhciBsZWdvQ29uZmlnOiBhbnkgPSB7fTsgLy8gbGVnb0NvbmZpZyBpcyBnbG9iYWwgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzIHdoaWNoIGFwcGx5IHRvIGFsbCBlbnRyaWVzIGFuZCBtb2R1bGVzXG4gIF8uZWFjaChbXG4gICAgJ3N0YXRpY0Fzc2V0c1VSTCcsICdzZXJ2ZXJVUkwnLCAncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsXG4gICAgJ2xvY2FsZXMnLCAnZGV2TW9kZSdcbiAgXSwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IDEpO1xuICBfLmVhY2goYXBpLmNvbmZpZygpLmJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IHRydWUpO1xuICBfLmZvck93bihicm93c2VyUHJvcFNldCwgKG5vdGhpbmcsIHByb3BQYXRoKSA9PiBfLnNldChsZWdvQ29uZmlnLCBwcm9wUGF0aCwgXy5nZXQoYXBpLmNvbmZpZygpLCBwcm9wUGF0aCkpKTtcbiAgcmV0dXJuIGxlZ29Db25maWc7XG59XG5cbiJdfQ==