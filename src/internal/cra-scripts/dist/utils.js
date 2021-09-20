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
exports.runTsConfigHandlers4LibTsd = exports.runTsConfigHandlers = exports.craVersionCheck = exports.saveCmdOptionsToEnv = exports.getCmdOptions = exports.printConfig = exports.drawPuppy = exports.getReportDir = void 0;
/* eslint-disable no-console */
const util_1 = __importStar(require("util"));
const path_1 = __importDefault(require("path"));
const semver_1 = require("semver");
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
const getReportDir = () => plink_1.config.resolve('destDir', 'cra-scripts.report');
exports.getReportDir = getReportDir;
function drawPuppy(slogon, message) {
    if (!slogon) {
        slogon = 'Congrads! Time to publish your shit!';
    }
    const line = '-'.repeat(slogon.length);
    console.log('\n   ' + line + '\n' +
        ` < ${slogon} >\n` +
        '   ' + line + '\n' +
        '\t\\   ^__^\n\t \\  (oo)\\_______\n\t    (__)\\       )\\/\\\n\t        ||----w |\n\t        ||     ||');
    if (message) {
        console.log(message);
    }
}
exports.drawPuppy = drawPuppy;
function printConfig(c, level = 0) {
    const indent = '  '.repeat(level);
    let out = '{\n';
    for (const prop of Object.keys(c)) {
        const value = c[prop];
        out += indent + `  ${JSON.stringify(prop)}: ${printConfigValue(value, level)},\n`;
    }
    out += indent + '}';
    return out;
}
exports.printConfig = printConfig;
function printConfigValue(value, level) {
    let out = '';
    const indent = '  '.repeat(level);
    if (util_1.default.isString(value) || util_1.default.isNumber(value) || util_1.default.isBoolean(value)) {
        out += JSON.stringify(value) + '';
    }
    else if (Array.isArray(value)) {
        out += '[\n';
        value.forEach((row) => {
            out += indent + '    ' + printConfigValue(row, level + 1);
            out += ',\n';
        });
        out += indent + '  ]';
    }
    else if (typeof value === 'function') {
        out += value.name + '()';
    }
    else if ((0, util_1.isRegExp)(value)) {
        out += `${value.toString()}`;
    }
    else if (util_1.default.isObject(value)) {
        const proto = Object.getPrototypeOf(value);
        if (proto && proto.constructor !== Object) {
            out += `new ${proto.constructor.name}()`;
        }
        else {
            out += printConfig(value, level + 1);
        }
    }
    else {
        out += ' unknown';
    }
    return out;
}
// TODO: move to a Redux store
function getCmdOptions() {
    const cmdOption = JSON.parse(process.env.REACT_APP_cra_build);
    if (cmdOption.devMode || cmdOption.watch) {
        process.env.NODE_ENV = 'development';
    }
    return cmdOption;
}
exports.getCmdOptions = getCmdOptions;
function saveCmdOptionsToEnv(pkgName, cmdName, opts, buildType) {
    const completeName = [...(0, plink_1.findPackagesByNames)([pkgName])][0].name;
    const cmdOptions = {
        cmd: cmdName,
        buildType,
        buildTarget: completeName,
        watch: opts.watch,
        devMode: !!opts.dev,
        publicUrl: opts.publicUrl,
        // external: opts.external,
        includes: opts.include,
        webpackEnv: opts.dev ? 'development' : 'production'
    };
    if (opts.publicUrl) {
        process.env.PUBLIC_URL = opts.publicUrl;
    }
    if (opts.sourceMap) {
        log.info('source map is enabled');
        process.env.GENERATE_SOURCEMAP = 'true';
    }
    process.env.REACT_APP_cra_build = JSON.stringify(cmdOptions);
    // stateFactory.configureStore();
    // config.initSync(cmd.opts() as GlobalOptions);
    return cmdOptions;
}
exports.saveCmdOptionsToEnv = saveCmdOptionsToEnv;
// function withClicOpt(cmd: commander.Command) {
//   cmd.option('-w, --watch', 'Watch file changes and compile', false)
//   .option('--dev', 'set NODE_ENV to "development", enable react-scripts in dev mode', false)
//   .option('--purl, --publicUrl <string>', 'set environment variable PUBLIC_URL for react-scripts', '/');
//   withGlobalOptions(cmd);
// }
function craVersionCheck() {
    const craPackage = require(path_1.default.resolve('node_modules/react-scripts/package.json'));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!(0, semver_1.gt)(craPackage.version, '3.4.0')) {
        throw new Error(`react-scripts version must be greater than 3.4.0, current installed version is ${craPackage.version}`);
    }
}
exports.craVersionCheck = craVersionCheck;
function runTsConfigHandlers(compilerOptions) {
    const { getConfigFileInPackage } = require('./cra-scripts-paths');
    const configFileInPackage = getConfigFileInPackage();
    const cmdOpt = getCmdOptions();
    plink_1.config.configHandlerMgrChanged(mgr => mgr.runEachSync((cfgFile, result, handler) => {
        if (handler.tsCheckCompilerOptions != null) {
            log.info('Execute TS compiler option overrides', cfgFile);
            handler.tsCheckCompilerOptions(compilerOptions, cmdOpt);
        }
    }, 'create-react-app ts compiler config'));
    if (configFileInPackage) {
        const cfgMgr = new plink_1.ConfigHandlerMgr([configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            if (handler.tsCheckCompilerOptions != null) {
                log.info('Execute TS checker compiler option overrides from ', cfgFile);
                handler.tsCheckCompilerOptions(compilerOptions, cmdOpt);
            }
        }, 'create-react-app ts checker compiler config');
    }
}
exports.runTsConfigHandlers = runTsConfigHandlers;
function runTsConfigHandlers4LibTsd() {
    const compilerOptions = { paths: {} };
    const { getConfigFileInPackage } = require('./cra-scripts-paths');
    const configFileInPackage = getConfigFileInPackage();
    const cmdOpt = getCmdOptions();
    const log = (0, plink_1.log4File)(__filename);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    plink_1.config.configHandlerMgrChanged(mgr => mgr.runEachSync((cfgFile, _result, handler) => {
        if (handler.libTsdCompilerOptions != null) {
            log.info('Execute TSD compiler option overrides', cfgFile);
            handler.libTsdCompilerOptions(compilerOptions, cmdOpt);
        }
    }, 'create-react-app ts compiler config'));
    if (configFileInPackage) {
        const cfgMgr = new plink_1.ConfigHandlerMgr([configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            if (handler.libTsdCompilerOptions != null) {
                log.info('Execute TSD compiler option overrides from ', cfgFile);
                handler.libTsdCompilerOptions(compilerOptions, cmdOpt);
            }
        }, 'create-react-app ts compiler config');
    }
    return compilerOptions;
}
exports.runTsConfigHandlers4LibTsd = runTsConfigHandlers4LibTsd;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDZDQUFzQztBQUV0QyxnREFBd0I7QUFFeEIsbUNBQTBCO0FBRTFCLHNDQUFrRztBQUVsRyxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFMUIsTUFBTSxZQUFZLEdBQUcsR0FBRyxFQUFFLENBQUMsY0FBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztBQUFyRSxRQUFBLFlBQVksZ0JBQXlEO0FBRWxGLFNBQWdCLFNBQVMsQ0FBQyxNQUFjLEVBQUUsT0FBZ0I7SUFDeEQsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE1BQU0sR0FBRyxzQ0FBc0MsQ0FBQztLQUNqRDtJQUVELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxJQUFJO1FBQy9CLE1BQU0sTUFBTSxNQUFNO1FBQ2xCLEtBQUssR0FBRyxJQUFJLEdBQUcsSUFBSTtRQUNuQix3R0FBd0csQ0FBQyxDQUFDO0lBQzVHLElBQUksT0FBTyxFQUFFO1FBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUN0QjtBQUNILENBQUM7QUFiRCw4QkFhQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxDQUFNLEVBQUUsS0FBSyxHQUFHLENBQUM7SUFDM0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsQyxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUM7SUFDaEIsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixHQUFHLElBQUksTUFBTSxHQUFHLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQztLQUNuRjtJQUNELEdBQUcsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQVRELGtDQVNDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFVLEVBQUUsS0FBYTtJQUNqRCxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDYixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksY0FBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxjQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLGNBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDekUsR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO0tBQ25DO1NBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQy9CLEdBQUcsSUFBSSxLQUFLLENBQUM7UUFDYixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBUSxFQUFFLEVBQUU7WUFDekIsR0FBRyxJQUFJLE1BQU0sR0FBRyxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMxRCxHQUFHLElBQUksS0FBSyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztLQUN2QjtTQUFNLElBQUksT0FBTyxLQUFLLEtBQUssVUFBVSxFQUFFO1FBQ3RDLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztLQUMxQjtTQUFNLElBQUksSUFBQSxlQUFRLEVBQUMsS0FBSyxDQUFDLEVBQUU7UUFDMUIsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7S0FDOUI7U0FBTSxJQUFJLGNBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDL0IsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLE1BQU0sRUFBRTtZQUN6QyxHQUFHLElBQUksT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQWMsSUFBSSxDQUFDO1NBQ3BEO2FBQU07WUFDTCxHQUFHLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDdEM7S0FDRjtTQUFNO1FBQ0wsR0FBRyxJQUFJLFVBQVUsQ0FBQztLQUNuQjtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUdELDhCQUE4QjtBQUM5QixTQUFnQixhQUFhO0lBQzNCLE1BQU0sU0FBUyxHQUFrQixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW9CLENBQUMsQ0FBQztJQUM5RSxJQUFJLFNBQVMsQ0FBQyxPQUFPLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRTtRQUN2QyxPQUFPLENBQUMsR0FBVyxDQUFDLFFBQVEsR0FBRyxhQUFhLENBQUM7S0FDL0M7SUFDRCxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDO0FBTkQsc0NBTUM7QUFTRCxTQUFnQixtQkFBbUIsQ0FBQyxPQUFlLEVBQUUsT0FBZSxFQUFFLElBQWtCLEVBQUUsU0FBd0I7SUFFaEgsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFHLElBQUEsMkJBQW1CLEVBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsSUFBSSxDQUFDO0lBQ2xFLE1BQU0sVUFBVSxHQUFrQjtRQUNoQyxHQUFHLEVBQUUsT0FBTztRQUNaLFNBQVM7UUFDVCxXQUFXLEVBQUUsWUFBWTtRQUN6QixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7UUFDakIsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRztRQUNuQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7UUFDekIsMkJBQTJCO1FBQzNCLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTztRQUN0QixVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxZQUFZO0tBQ3BELENBQUM7SUFDRixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7UUFDakIsT0FBTyxDQUFDLEdBQVcsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztLQUNsRDtJQUNELElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtRQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxNQUFNLENBQUM7S0FDekM7SUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFN0QsaUNBQWlDO0lBQ2pDLGdEQUFnRDtJQUNoRCxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBMUJELGtEQTBCQztBQUVELGlEQUFpRDtBQUNqRCx1RUFBdUU7QUFDdkUsK0ZBQStGO0FBQy9GLDJHQUEyRztBQUMzRyw0QkFBNEI7QUFDNUIsSUFBSTtBQUdKLFNBQWdCLGVBQWU7SUFDN0IsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMseUNBQXlDLENBQUMsQ0FBc0IsQ0FBQztJQUN6RyxzRUFBc0U7SUFDdEUsSUFBSSxDQUFDLElBQUEsV0FBRSxFQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUU7UUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrRkFBa0YsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7S0FDekg7QUFDSCxDQUFDO0FBTkQsMENBTUM7QUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxlQUFvQjtJQUN0RCxNQUFNLEVBQUMsc0JBQXNCLEVBQUMsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQXFCLENBQUM7SUFDcEYsTUFBTSxtQkFBbUIsR0FBRyxzQkFBc0IsRUFBRSxDQUFDO0lBQ3JELE1BQU0sTUFBTSxHQUFHLGFBQWEsRUFBRSxDQUFDO0lBRS9CLGNBQU0sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQXNCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUN0RyxJQUFJLE9BQU8sQ0FBQyxzQkFBc0IsSUFBSSxJQUFJLEVBQUU7WUFDMUMsR0FBRyxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMxRCxPQUFPLENBQUMsc0JBQXNCLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3pEO0lBQ0gsQ0FBQyxFQUFFLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztJQUUzQyxJQUFJLG1CQUFtQixFQUFFO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQWdCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBc0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ25FLElBQUksT0FBTyxDQUFDLHNCQUFzQixJQUFJLElBQUksRUFBRTtnQkFDMUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvREFBb0QsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDeEUsT0FBTyxDQUFDLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUN6RDtRQUNILENBQUMsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFDO0tBQ25EO0FBQ0gsQ0FBQztBQXJCRCxrREFxQkM7QUFFRCxTQUFnQiwwQkFBMEI7SUFDeEMsTUFBTSxlQUFlLEdBQUcsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUM7SUFDcEMsTUFBTSxFQUFDLHNCQUFzQixFQUFDLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFxQixDQUFDO0lBQ3BGLE1BQU0sbUJBQW1CLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztJQUNyRCxNQUFNLE1BQU0sR0FBRyxhQUFhLEVBQUUsQ0FBQztJQUMvQixNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7SUFDakMsK0RBQStEO0lBQy9ELGNBQU0sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQXNCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUN2RyxJQUFJLE9BQU8sQ0FBQyxxQkFBcUIsSUFBSSxJQUFJLEVBQUU7WUFDekMsR0FBRyxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMzRCxPQUFPLENBQUMscUJBQXFCLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3hEO0lBQ0gsQ0FBQyxFQUFFLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztJQUUzQyxJQUFJLG1CQUFtQixFQUFFO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQWdCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBc0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ25FLElBQUksT0FBTyxDQUFDLHFCQUFxQixJQUFJLElBQUksRUFBRTtnQkFDekMsR0FBRyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDakUsT0FBTyxDQUFDLHFCQUFxQixDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUN4RDtRQUNILENBQUMsRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDO0tBQzNDO0lBQ0QsT0FBTyxlQUFlLENBQUM7QUFDekIsQ0FBQztBQXhCRCxnRUF3QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgdXRpbCwgeyBpc1JlZ0V4cCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IHtDb21tYW5kT3B0aW9ufSBmcm9tICcuL2J1aWxkLW9wdGlvbnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtndH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCAqIGFzIF9jcmFQYXRocyBmcm9tICcuL2NyYS1zY3JpcHRzLXBhdGhzJztcbmltcG9ydCB7Y29uZmlnLCBQbGlua1NldHRpbmdzLCBsb2c0RmlsZSwgQ29uZmlnSGFuZGxlck1nciwgZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQge1JlYWN0U2NyaXB0c0hhbmRsZXJ9IGZyb20gJy4vdHlwZXMnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmV4cG9ydCBjb25zdCBnZXRSZXBvcnREaXIgPSAoKSA9PiBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdjcmEtc2NyaXB0cy5yZXBvcnQnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdQdXBweShzbG9nb246IHN0cmluZywgbWVzc2FnZT86IHN0cmluZykge1xuICBpZiAoIXNsb2dvbikge1xuICAgIHNsb2dvbiA9ICdDb25ncmFkcyEgVGltZSB0byBwdWJsaXNoIHlvdXIgc2hpdCEnO1xuICB9XG5cbiAgY29uc3QgbGluZSA9ICctJy5yZXBlYXQoc2xvZ29uLmxlbmd0aCk7XG4gIGNvbnNvbGUubG9nKCdcXG4gICAnICsgbGluZSArICdcXG4nICtcbiAgICBgIDwgJHtzbG9nb259ID5cXG5gICtcbiAgICAnICAgJyArIGxpbmUgKyAnXFxuJyArXG4gICAgJ1xcdFxcXFwgICBeX19eXFxuXFx0IFxcXFwgIChvbylcXFxcX19fX19fX1xcblxcdCAgICAoX18pXFxcXCAgICAgICApXFxcXC9cXFxcXFxuXFx0ICAgICAgICB8fC0tLS13IHxcXG5cXHQgICAgICAgIHx8ICAgICB8fCcpO1xuICBpZiAobWVzc2FnZSkge1xuICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludENvbmZpZyhjOiBhbnksIGxldmVsID0gMCk6IHN0cmluZyB7XG4gIGNvbnN0IGluZGVudCA9ICcgICcucmVwZWF0KGxldmVsKTtcbiAgbGV0IG91dCA9ICd7XFxuJztcbiAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKGMpKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjW3Byb3BdO1xuICAgIG91dCArPSBpbmRlbnQgKyBgICAke0pTT04uc3RyaW5naWZ5KHByb3ApfTogJHtwcmludENvbmZpZ1ZhbHVlKHZhbHVlLCBsZXZlbCl9LFxcbmA7XG4gIH1cbiAgb3V0ICs9IGluZGVudCArICd9JztcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWdWYWx1ZSh2YWx1ZTogYW55LCBsZXZlbDogbnVtYmVyKTogc3RyaW5nIHtcbiAgbGV0IG91dCA9ICcnO1xuICBjb25zdCBpbmRlbnQgPSAnICAnLnJlcGVhdChsZXZlbCk7XG4gIGlmICh1dGlsLmlzU3RyaW5nKHZhbHVlKSB8fCB1dGlsLmlzTnVtYmVyKHZhbHVlKSB8fCB1dGlsLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gSlNPTi5zdHJpbmdpZnkodmFsdWUpICsgJyc7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gJ1tcXG4nO1xuICAgIHZhbHVlLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG4gICAgICBvdXQgKz0gaW5kZW50ICsgJyAgICAnICsgcHJpbnRDb25maWdWYWx1ZShyb3csIGxldmVsICsgMSk7XG4gICAgICBvdXQgKz0gJyxcXG4nO1xuICAgIH0pO1xuICAgIG91dCArPSBpbmRlbnQgKyAnICBdJztcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICBvdXQgKz0gdmFsdWUubmFtZSArICcoKSc7XG4gIH0gZWxzZSBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgb3V0ICs9IGAke3ZhbHVlLnRvU3RyaW5nKCl9YDtcbiAgfSBlbHNlIGlmICh1dGlsLmlzT2JqZWN0KHZhbHVlKSkge1xuICAgIGNvbnN0IHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKTtcbiAgICBpZiAocHJvdG8gJiYgcHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgb3V0ICs9IGBuZXcgJHtwcm90by5jb25zdHJ1Y3Rvci5uYW1lIGFzIHN0cmluZ30oKWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSBwcmludENvbmZpZyh2YWx1ZSwgbGV2ZWwgKyAxKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdW5rbm93bic7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuXG4vLyBUT0RPOiBtb3ZlIHRvIGEgUmVkdXggc3RvcmVcbmV4cG9ydCBmdW5jdGlvbiBnZXRDbWRPcHRpb25zKCk6IENvbW1hbmRPcHRpb24ge1xuICBjb25zdCBjbWRPcHRpb246IENvbW1hbmRPcHRpb24gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52LlJFQUNUX0FQUF9jcmFfYnVpbGQhKTtcbiAgaWYgKGNtZE9wdGlvbi5kZXZNb2RlIHx8IGNtZE9wdGlvbi53YXRjaCkge1xuICAgIChwcm9jZXNzLmVudiBhcyBhbnkpLk5PREVfRU5WID0gJ2RldmVsb3BtZW50JztcbiAgfVxuICByZXR1cm4gY21kT3B0aW9uO1xufVxuXG5leHBvcnQgdHlwZSBCdWlsZENsaU9wdHMgPSB7XG4gIHdhdGNoOiBib29sZWFuO1xuICBpbmNsdWRlPzogc3RyaW5nW107XG4gIHB1YmxpY1VybD86IHN0cmluZztcbiAgc291cmNlTWFwPzogYm9vbGVhbjtcbn0gJiBOb25OdWxsYWJsZTxQbGlua1NldHRpbmdzWydjbGlPcHRpb25zJ10+O1xuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUNtZE9wdGlvbnNUb0Vudihwa2dOYW1lOiBzdHJpbmcsIGNtZE5hbWU6IHN0cmluZywgb3B0czogQnVpbGRDbGlPcHRzLCBidWlsZFR5cGU6ICdhcHAnIHwgJ2xpYicpOiBDb21tYW5kT3B0aW9uIHtcblxuICBjb25zdCBjb21wbGV0ZU5hbWUgPSBbLi4uZmluZFBhY2thZ2VzQnlOYW1lcyhbcGtnTmFtZV0pXVswXSEubmFtZTtcbiAgY29uc3QgY21kT3B0aW9uczogQ29tbWFuZE9wdGlvbiA9IHtcbiAgICBjbWQ6IGNtZE5hbWUsXG4gICAgYnVpbGRUeXBlLFxuICAgIGJ1aWxkVGFyZ2V0OiBjb21wbGV0ZU5hbWUsXG4gICAgd2F0Y2g6IG9wdHMud2F0Y2gsXG4gICAgZGV2TW9kZTogISFvcHRzLmRldixcbiAgICBwdWJsaWNVcmw6IG9wdHMucHVibGljVXJsLFxuICAgIC8vIGV4dGVybmFsOiBvcHRzLmV4dGVybmFsLFxuICAgIGluY2x1ZGVzOiBvcHRzLmluY2x1ZGUsXG4gICAgd2VicGFja0Vudjogb3B0cy5kZXYgPyAnZGV2ZWxvcG1lbnQnIDogJ3Byb2R1Y3Rpb24nXG4gIH07XG4gIGlmIChvcHRzLnB1YmxpY1VybCkge1xuICAgIChwcm9jZXNzLmVudiBhcyBhbnkpLlBVQkxJQ19VUkwgPSBvcHRzLnB1YmxpY1VybDtcbiAgfVxuICBpZiAob3B0cy5zb3VyY2VNYXApIHtcbiAgICBsb2cuaW5mbygnc291cmNlIG1hcCBpcyBlbmFibGVkJyk7XG4gICAgcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ3RydWUnO1xuICB9XG4gIHByb2Nlc3MuZW52LlJFQUNUX0FQUF9jcmFfYnVpbGQgPSBKU09OLnN0cmluZ2lmeShjbWRPcHRpb25zKTtcblxuICAvLyBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcbiAgLy8gY29uZmlnLmluaXRTeW5jKGNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gIHJldHVybiBjbWRPcHRpb25zO1xufVxuXG4vLyBmdW5jdGlvbiB3aXRoQ2xpY09wdChjbWQ6IGNvbW1hbmRlci5Db21tYW5kKSB7XG4vLyAgIGNtZC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1dhdGNoIGZpbGUgY2hhbmdlcyBhbmQgY29tcGlsZScsIGZhbHNlKVxuLy8gICAub3B0aW9uKCctLWRldicsICdzZXQgTk9ERV9FTlYgdG8gXCJkZXZlbG9wbWVudFwiLCBlbmFibGUgcmVhY3Qtc2NyaXB0cyBpbiBkZXYgbW9kZScsIGZhbHNlKVxuLy8gICAub3B0aW9uKCctLXB1cmwsIC0tcHVibGljVXJsIDxzdHJpbmc+JywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBQVUJMSUNfVVJMIGZvciByZWFjdC1zY3JpcHRzJywgJy8nKTtcbi8vICAgd2l0aEdsb2JhbE9wdGlvbnMoY21kKTtcbi8vIH1cblxuXG5leHBvcnQgZnVuY3Rpb24gY3JhVmVyc2lvbkNoZWNrKCkge1xuICBjb25zdCBjcmFQYWNrYWdlID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzL3BhY2thZ2UuanNvbicpKSBhcyB7dmVyc2lvbjogc3RyaW5nfTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICBpZiAoIWd0KGNyYVBhY2thZ2UudmVyc2lvbiwgJzMuNC4wJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHJlYWN0LXNjcmlwdHMgdmVyc2lvbiBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAzLjQuMCwgY3VycmVudCBpbnN0YWxsZWQgdmVyc2lvbiBpcyAke2NyYVBhY2thZ2UudmVyc2lvbn1gKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuVHNDb25maWdIYW5kbGVycyhjb21waWxlck9wdGlvbnM6IGFueSkge1xuICBjb25zdCB7Z2V0Q29uZmlnRmlsZUluUGFja2FnZX0gPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJykgYXMgdHlwZW9mIF9jcmFQYXRocztcbiAgY29uc3QgY29uZmlnRmlsZUluUGFja2FnZSA9IGdldENvbmZpZ0ZpbGVJblBhY2thZ2UoKTtcbiAgY29uc3QgY21kT3B0ID0gZ2V0Q21kT3B0aW9ucygpO1xuXG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci50c0NoZWNrQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFRTIGNvbXBpbGVyIG9wdGlvbiBvdmVycmlkZXMnLCBjZmdGaWxlKTtcbiAgICAgIGhhbmRsZXIudHNDaGVja0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgfVxuICB9LCAnY3JlYXRlLXJlYWN0LWFwcCB0cyBjb21waWxlciBjb25maWcnKSk7XG5cbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci50c0NoZWNrQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgVFMgY2hlY2tlciBjb21waWxlciBvcHRpb24gb3ZlcnJpZGVzIGZyb20gJywgY2ZnRmlsZSk7XG4gICAgICAgIGhhbmRsZXIudHNDaGVja0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgICB9XG4gICAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgdHMgY2hlY2tlciBjb21waWxlciBjb25maWcnKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuVHNDb25maWdIYW5kbGVyczRMaWJUc2QoKSB7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHtwYXRoczoge319O1xuICBjb25zdCB7Z2V0Q29uZmlnRmlsZUluUGFja2FnZX0gPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJykgYXMgdHlwZW9mIF9jcmFQYXRocztcbiAgY29uc3QgY29uZmlnRmlsZUluUGFja2FnZSA9IGdldENvbmZpZ0ZpbGVJblBhY2thZ2UoKTtcbiAgY29uc3QgY21kT3B0ID0gZ2V0Q21kT3B0aW9ucygpO1xuICBjb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuXG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCBfcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGhhbmRsZXIubGliVHNkQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFRTRCBjb21waWxlciBvcHRpb24gb3ZlcnJpZGVzJywgY2ZnRmlsZSk7XG4gICAgICBoYW5kbGVyLmxpYlRzZENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgfVxuICB9LCAnY3JlYXRlLXJlYWN0LWFwcCB0cyBjb21waWxlciBjb25maWcnKSk7XG5cbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci5saWJUc2RDb21waWxlck9wdGlvbnMgIT0gbnVsbCkge1xuICAgICAgICBsb2cuaW5mbygnRXhlY3V0ZSBUU0QgY29tcGlsZXIgb3B0aW9uIG92ZXJyaWRlcyBmcm9tICcsIGNmZ0ZpbGUpO1xuICAgICAgICBoYW5kbGVyLmxpYlRzZENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgICB9XG4gICAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgdHMgY29tcGlsZXIgY29uZmlnJyk7XG4gIH1cbiAgcmV0dXJuIGNvbXBpbGVyT3B0aW9ucztcbn1cbiJdfQ==