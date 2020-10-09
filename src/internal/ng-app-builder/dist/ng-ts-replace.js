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
    // var compressedInfo = compressOutputPathMap(legoConfig.outputPathMap);
    // legoConfig.outputPathMap = compressedInfo.diffMap;
    // legoConfig._outputAsNames = compressedInfo.sames;
    return legoConfig;
}
// function compressOutputPathMap(pathMap: any) {
//   var newMap: any = {};
//   var sameAsNames: string[] = [];
//   _.each(pathMap, (value, key) => {
//     var parsed = api.packageUtils.parseName(key);
//     if (parsed.name !== value) {
//       newMap[key] = value;
//     } else {
//       sameAsNames.push(key);
//     }
//   });
//   return {
//     sames: sameAsNames,
//     diffMap: newMap
//   };
// }

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFDcEMsaUVBQWtGO0FBQ2xGLHVDQUF5QjtBQUN6QiwwQ0FBNEI7QUFDNUIsK0NBQWlDO0FBQ2pDLCtCQUFrRDtBQUNsRCw4Q0FBbUM7QUFFbkMsa0RBQW1DO0FBQ25DLG1EQUE4QztBQUc5Qyx3RUFBNEM7QUFDNUMsMEVBQW1EO0FBQ25ELHlFQUE4RTtBQUM5RSwwREFBNEI7QUFDNUIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRS9CLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRWpFLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7O3VCQUVOLENBQUMsQ0FBQztBQUN6Qiw4RUFBOEU7QUFFN0UsTUFBTSxDQUFDLGNBQWMsQ0FBQyxlQUFHLENBQWEsQ0FBQyxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQUU3RSxNQUFxQixZQUFZO0lBUS9CLFlBQVksT0FBd0I7UUFOcEMsc0JBQWlCLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ1Isa0JBQWEsR0FBRyxJQUFJLG1CQUFHLENBQWlCLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUNuRSxZQUFPLEdBQUcsSUFBSSxtQkFBRyxDQUFzQixFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7UUFJeEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxD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
