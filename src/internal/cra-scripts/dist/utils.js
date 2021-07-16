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
    else if (util_1.default.isFunction(value)) {
        out += value.name + '()';
    }
    else if (util_1.isRegExp(value)) {
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
function saveCmdOptionsToEnv(pkgName, cmd, buildType) {
    const opts = cmd.opts();
    const completeName = [...plink_1.findPackagesByNames([pkgName])][0].name;
    const cmdOptions = {
        cmd: cmd.name(),
        buildType,
        buildTarget: completeName,
        watch: opts.watch,
        devMode: opts.dev,
        publicUrl: opts.publicUrl,
        // external: opts.external,
        includes: opts.include,
        webpackEnv: opts.dev ? 'development' : 'production'
    };
    if (cmd.opts().publicUrl) {
        process.env.PUBLIC_URL = cmd.opts().publicUrl;
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
    if (!semver_1.gt(craPackage.version, '3.4.0')) {
        throw new Error(`react-scripts version must be greater than 3.4.0, current installed version is ${craPackage.version}`);
    }
}
exports.craVersionCheck = craVersionCheck;
function runTsConfigHandlers(compilerOptions) {
    const { getConfigFileInPackage } = require('./cra-scripts-paths');
    const configFileInPackage = getConfigFileInPackage();
    const cmdOpt = getCmdOptions();
    const log = plink_1.log4File(__filename);
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
    const log = plink_1.log4File(__filename);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDZDQUFzQztBQUV0QyxnREFBd0I7QUFFeEIsbUNBQTBCO0FBRzFCLHNDQUFtRjtBQUc1RSxNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUUsQ0FBQyxjQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBQXJFLFFBQUEsWUFBWSxnQkFBeUQ7QUFFbEYsU0FBZ0IsU0FBUyxDQUFDLE1BQWMsRUFBRSxPQUFnQjtJQUN4RCxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxHQUFHLHNDQUFzQyxDQUFDO0tBQ2pEO0lBRUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLElBQUk7UUFDL0IsTUFBTSxNQUFNLE1BQU07UUFDbEIsS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJO1FBQ25CLHdHQUF3RyxDQUFDLENBQUM7SUFDNUcsSUFBSSxPQUFPLEVBQUU7UUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3RCO0FBQ0gsQ0FBQztBQWJELDhCQWFDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLENBQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQztJQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQztJQUNoQixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDakMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLEdBQUcsSUFBSSxNQUFNLEdBQUcsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLGdCQUFnQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDO0tBQ25GO0lBQ0QsR0FBRyxJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUM7SUFDcEIsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBVEQsa0NBU0M7QUFFRCxTQUFTLGdCQUFnQixDQUFDLEtBQVUsRUFBRSxLQUFhO0lBQ2pELElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUNiLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEMsSUFBSSxjQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLGNBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksY0FBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUN6RSxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7S0FDbkM7U0FBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDL0IsR0FBRyxJQUFJLEtBQUssQ0FBQztRQUNaLEtBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFRLEVBQUUsRUFBRTtZQUNwQyxHQUFHLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzFELEdBQUcsSUFBSSxLQUFLLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztRQUNILEdBQUcsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO0tBQ3ZCO1NBQU0sSUFBSSxjQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ2pDLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztLQUMxQjtTQUFNLElBQUksZUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzFCLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO0tBQzlCO1NBQU0sSUFBSSxjQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQy9CLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxNQUFNLEVBQUU7WUFDekMsR0FBRyxJQUFJLE9BQU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksQ0FBQztTQUMxQzthQUFNO1lBQ0wsR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3RDO0tBQ0Y7U0FBTTtRQUNMLEdBQUcsSUFBSSxVQUFVLENBQUM7S0FDbkI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFHRCw4QkFBOEI7QUFDOUIsU0FBZ0IsYUFBYTtJQUMzQixNQUFNLFNBQVMsR0FBa0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFvQixDQUFDLENBQUM7SUFDOUUsSUFBSSxTQUFTLENBQUMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUU7UUFDdkMsT0FBTyxDQUFDLEdBQVcsQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDO0tBQy9DO0lBQ0QsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQU5ELHNDQU1DO0FBRUQsU0FBZ0IsbUJBQW1CLENBQUMsT0FBZSxFQUFFLEdBQXNCLEVBQUUsU0FBd0I7SUFDbkcsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3hCLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBRywyQkFBbUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxJQUFJLENBQUM7SUFDbEUsTUFBTSxVQUFVLEdBQWtCO1FBQ2hDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFO1FBQ2YsU0FBUztRQUNULFdBQVcsRUFBRSxZQUFZO1FBQ3pCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztRQUNqQixPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDakIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1FBQ3pCLDJCQUEyQjtRQUMzQixRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU87UUFDdEIsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsWUFBWTtLQUNwRCxDQUFDO0lBQ0YsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFO1FBQ3ZCLE9BQU8sQ0FBQyxHQUFXLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDeEQ7SUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFN0QsaUNBQWlDO0lBQ2pDLGdEQUFnRDtJQUNoRCxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBdEJELGtEQXNCQztBQUVELGlEQUFpRDtBQUNqRCx1RUFBdUU7QUFDdkUsK0ZBQStGO0FBQy9GLDJHQUEyRztBQUMzRyw0QkFBNEI7QUFDNUIsSUFBSTtBQUdKLFNBQWdCLGVBQWU7SUFDN0IsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMseUNBQXlDLENBQUMsQ0FBc0IsQ0FBQztJQUN6RyxzRUFBc0U7SUFDdEUsSUFBSSxDQUFDLFdBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0ZBQWtGLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0tBQ3pIO0FBQ0gsQ0FBQztBQU5ELDBDQU1DO0FBRUQsU0FBZ0IsbUJBQW1CLENBQUMsZUFBb0I7SUFDdEQsTUFBTSxFQUFDLHNCQUFzQixFQUFDLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFxQixDQUFDO0lBQ3BGLE1BQU0sbUJBQW1CLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztJQUNyRCxNQUFNLE1BQU0sR0FBRyxhQUFhLEVBQUUsQ0FBQztJQUMvQixNQUFNLEdBQUcsR0FBRyxnQkFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2pDLGNBQU0sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQXNCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUN0RyxJQUFJLE9BQU8sQ0FBQyxzQkFBc0IsSUFBSSxJQUFJLEVBQUU7WUFDMUMsR0FBRyxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMxRCxPQUFPLENBQUMsc0JBQXNCLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3pEO0lBQ0gsQ0FBQyxFQUFFLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztJQUUzQyxJQUFJLG1CQUFtQixFQUFFO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQWdCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBc0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ25FLElBQUksT0FBTyxDQUFDLHNCQUFzQixJQUFJLElBQUksRUFBRTtnQkFDMUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvREFBb0QsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDeEUsT0FBTyxDQUFDLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUN6RDtRQUNILENBQUMsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFDO0tBQ25EO0FBQ0gsQ0FBQztBQXJCRCxrREFxQkM7QUFFRCxTQUFnQiwwQkFBMEI7SUFDeEMsTUFBTSxlQUFlLEdBQUcsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUM7SUFDcEMsTUFBTSxFQUFDLHNCQUFzQixFQUFDLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFxQixDQUFDO0lBQ3BGLE1BQU0sbUJBQW1CLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztJQUNyRCxNQUFNLE1BQU0sR0FBRyxhQUFhLEVBQUUsQ0FBQztJQUMvQixNQUFNLEdBQUcsR0FBRyxnQkFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2pDLCtEQUErRDtJQUMvRCxjQUFNLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFzQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDdkcsSUFBSSxPQUFPLENBQUMscUJBQXFCLElBQUksSUFBSSxFQUFFO1lBQ3pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUNBQXVDLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDM0QsT0FBTyxDQUFDLHFCQUFxQixDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUN4RDtJQUNILENBQUMsRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDLENBQUM7SUFFM0MsSUFBSSxtQkFBbUIsRUFBRTtRQUN2QixNQUFNLE1BQU0sR0FBRyxJQUFJLHdCQUFnQixDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQXNCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUNuRSxJQUFJLE9BQU8sQ0FBQyxxQkFBcUIsSUFBSSxJQUFJLEVBQUU7Z0JBQ3pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkNBQTZDLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ2pFLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDeEQ7UUFDSCxDQUFDLEVBQUUscUNBQXFDLENBQUMsQ0FBQztLQUMzQztJQUNELE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUF4QkQsZ0VBd0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHV0aWwsIHsgaXNSZWdFeHAgfSBmcm9tICd1dGlsJztcbmltcG9ydCB7Q29tbWFuZE9wdGlvbn0gZnJvbSAnLi9idWlsZC1vcHRpb25zJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z3R9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ0NvbW1hbmRlcic7XG5pbXBvcnQgKiBhcyBfY3JhUGF0aHMgZnJvbSAnLi9jcmEtc2NyaXB0cy1wYXRocyc7XG5pbXBvcnQge2NvbmZpZywgbG9nNEZpbGUsIENvbmZpZ0hhbmRsZXJNZ3IsIGZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtSZWFjdFNjcmlwdHNIYW5kbGVyfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGNvbnN0IGdldFJlcG9ydERpciA9ICgpID0+IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2NyYS1zY3JpcHRzLnJlcG9ydCcpO1xuXG5leHBvcnQgZnVuY3Rpb24gZHJhd1B1cHB5KHNsb2dvbjogc3RyaW5nLCBtZXNzYWdlPzogc3RyaW5nKSB7XG4gIGlmICghc2xvZ29uKSB7XG4gICAgc2xvZ29uID0gJ0NvbmdyYWRzISBUaW1lIHRvIHB1Ymxpc2ggeW91ciBzaGl0ISc7XG4gIH1cblxuICBjb25zdCBsaW5lID0gJy0nLnJlcGVhdChzbG9nb24ubGVuZ3RoKTtcbiAgY29uc29sZS5sb2coJ1xcbiAgICcgKyBsaW5lICsgJ1xcbicgK1xuICAgIGAgPCAke3Nsb2dvbn0gPlxcbmAgK1xuICAgICcgICAnICsgbGluZSArICdcXG4nICtcbiAgICAnXFx0XFxcXCAgIF5fX15cXG5cXHQgXFxcXCAgKG9vKVxcXFxfX19fX19fXFxuXFx0ICAgIChfXylcXFxcICAgICAgIClcXFxcL1xcXFxcXG5cXHQgICAgICAgIHx8LS0tLXcgfFxcblxcdCAgICAgICAgfHwgICAgIHx8Jyk7XG4gIGlmIChtZXNzYWdlKSB7XG4gICAgY29uc29sZS5sb2cobWVzc2FnZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50Q29uZmlnKGM6IGFueSwgbGV2ZWwgPSAwKTogc3RyaW5nIHtcbiAgY29uc3QgaW5kZW50ID0gJyAgJy5yZXBlYXQobGV2ZWwpO1xuICBsZXQgb3V0ID0gJ3tcXG4nO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgT2JqZWN0LmtleXMoYykpIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNbcHJvcF07XG4gICAgb3V0ICs9IGluZGVudCArIGAgICR7SlNPTi5zdHJpbmdpZnkocHJvcCl9OiAke3ByaW50Q29uZmlnVmFsdWUodmFsdWUsIGxldmVsKX0sXFxuYDtcbiAgfVxuICBvdXQgKz0gaW5kZW50ICsgJ30nO1xuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZ1ZhbHVlKHZhbHVlOiBhbnksIGxldmVsOiBudW1iZXIpOiBzdHJpbmcge1xuICBsZXQgb3V0ID0gJyc7XG4gIGNvbnN0IGluZGVudCA9ICcgICcucmVwZWF0KGxldmVsKTtcbiAgaWYgKHV0aWwuaXNTdHJpbmcodmFsdWUpIHx8IHV0aWwuaXNOdW1iZXIodmFsdWUpIHx8IHV0aWwuaXNCb29sZWFuKHZhbHVlKSkge1xuICAgIG91dCArPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgKyAnJztcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIG91dCArPSAnW1xcbic7XG4gICAgKHZhbHVlIGFzIGFueVtdKS5mb3JFYWNoKChyb3c6IGFueSkgPT4ge1xuICAgICAgb3V0ICs9IGluZGVudCArICcgICAgJyArIHByaW50Q29uZmlnVmFsdWUocm93LCBsZXZlbCArIDEpO1xuICAgICAgb3V0ICs9ICcsXFxuJztcbiAgICB9KTtcbiAgICBvdXQgKz0gaW5kZW50ICsgJyAgXSc7XG4gIH0gZWxzZSBpZiAodXRpbC5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIG91dCArPSB2YWx1ZS5uYW1lICsgJygpJztcbiAgfSBlbHNlIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gYCR7dmFsdWUudG9TdHJpbmcoKX1gO1xuICB9IGVsc2UgaWYgKHV0aWwuaXNPYmplY3QodmFsdWUpKSB7XG4gICAgY29uc3QgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpO1xuICAgIGlmIChwcm90byAmJiBwcm90by5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XG4gICAgICBvdXQgKz0gYG5ldyAke3Byb3RvLmNvbnN0cnVjdG9yLm5hbWV9KClgO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gcHJpbnRDb25maWcodmFsdWUsIGxldmVsICsgMSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHVua25vd24nO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cblxuLy8gVE9ETzogbW92ZSB0byBhIFJlZHV4IHN0b3JlXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q21kT3B0aW9ucygpOiBDb21tYW5kT3B0aW9uIHtcbiAgY29uc3QgY21kT3B0aW9uOiBDb21tYW5kT3B0aW9uID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5SRUFDVF9BUFBfY3JhX2J1aWxkISk7XG4gIGlmIChjbWRPcHRpb24uZGV2TW9kZSB8fCBjbWRPcHRpb24ud2F0Y2gpIHtcbiAgICAocHJvY2Vzcy5lbnYgYXMgYW55KS5OT0RFX0VOViA9ICdkZXZlbG9wbWVudCc7XG4gIH1cbiAgcmV0dXJuIGNtZE9wdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVDbWRPcHRpb25zVG9FbnYocGtnTmFtZTogc3RyaW5nLCBjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBidWlsZFR5cGU6ICdhcHAnIHwgJ2xpYicpOiBDb21tYW5kT3B0aW9uIHtcbiAgY29uc3Qgb3B0cyA9IGNtZC5vcHRzKCk7XG4gIGNvbnN0IGNvbXBsZXRlTmFtZSA9IFsuLi5maW5kUGFja2FnZXNCeU5hbWVzKFtwa2dOYW1lXSldWzBdIS5uYW1lO1xuICBjb25zdCBjbWRPcHRpb25zOiBDb21tYW5kT3B0aW9uID0ge1xuICAgIGNtZDogY21kLm5hbWUoKSxcbiAgICBidWlsZFR5cGUsXG4gICAgYnVpbGRUYXJnZXQ6IGNvbXBsZXRlTmFtZSxcbiAgICB3YXRjaDogb3B0cy53YXRjaCxcbiAgICBkZXZNb2RlOiBvcHRzLmRldixcbiAgICBwdWJsaWNVcmw6IG9wdHMucHVibGljVXJsLFxuICAgIC8vIGV4dGVybmFsOiBvcHRzLmV4dGVybmFsLFxuICAgIGluY2x1ZGVzOiBvcHRzLmluY2x1ZGUsXG4gICAgd2VicGFja0Vudjogb3B0cy5kZXYgPyAnZGV2ZWxvcG1lbnQnIDogJ3Byb2R1Y3Rpb24nXG4gIH07XG4gIGlmIChjbWQub3B0cygpLnB1YmxpY1VybCkge1xuICAgIChwcm9jZXNzLmVudiBhcyBhbnkpLlBVQkxJQ19VUkwgPSBjbWQub3B0cygpLnB1YmxpY1VybDtcbiAgfVxuICBwcm9jZXNzLmVudi5SRUFDVF9BUFBfY3JhX2J1aWxkID0gSlNPTi5zdHJpbmdpZnkoY21kT3B0aW9ucyk7XG5cbiAgLy8gc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG4gIC8vIGNvbmZpZy5pbml0U3luYyhjbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICByZXR1cm4gY21kT3B0aW9ucztcbn1cblxuLy8gZnVuY3Rpb24gd2l0aENsaWNPcHQoY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuLy8gICBjbWQub3B0aW9uKCctdywgLS13YXRjaCcsICdXYXRjaCBmaWxlIGNoYW5nZXMgYW5kIGNvbXBpbGUnLCBmYWxzZSlcbi8vICAgLm9wdGlvbignLS1kZXYnLCAnc2V0IE5PREVfRU5WIHRvIFwiZGV2ZWxvcG1lbnRcIiwgZW5hYmxlIHJlYWN0LXNjcmlwdHMgaW4gZGV2IG1vZGUnLCBmYWxzZSlcbi8vICAgLm9wdGlvbignLS1wdXJsLCAtLXB1YmxpY1VybCA8c3RyaW5nPicsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgUFVCTElDX1VSTCBmb3IgcmVhY3Qtc2NyaXB0cycsICcvJyk7XG4vLyAgIHdpdGhHbG9iYWxPcHRpb25zKGNtZCk7XG4vLyB9XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNyYVZlcnNpb25DaGVjaygpIHtcbiAgY29uc3QgY3JhUGFja2FnZSA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cy9wYWNrYWdlLmpzb24nKSkgYXMge3ZlcnNpb246IHN0cmluZ307XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgaWYgKCFndChjcmFQYWNrYWdlLnZlcnNpb24sICczLjQuMCcpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGByZWFjdC1zY3JpcHRzIHZlcnNpb24gbXVzdCBiZSBncmVhdGVyIHRoYW4gMy40LjAsIGN1cnJlbnQgaW5zdGFsbGVkIHZlcnNpb24gaXMgJHtjcmFQYWNrYWdlLnZlcnNpb259YCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJ1blRzQ29uZmlnSGFuZGxlcnMoY29tcGlsZXJPcHRpb25zOiBhbnkpIHtcbiAgY29uc3Qge2dldENvbmZpZ0ZpbGVJblBhY2thZ2V9ID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpIGFzIHR5cGVvZiBfY3JhUGF0aHM7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVJblBhY2thZ2UgPSBnZXRDb25maWdGaWxlSW5QYWNrYWdlKCk7XG4gIGNvbnN0IGNtZE9wdCA9IGdldENtZE9wdGlvbnMoKTtcbiAgY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci50c0NoZWNrQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFRTIGNvbXBpbGVyIG9wdGlvbiBvdmVycmlkZXMnLCBjZmdGaWxlKTtcbiAgICAgIGhhbmRsZXIudHNDaGVja0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgfVxuICB9LCAnY3JlYXRlLXJlYWN0LWFwcCB0cyBjb21waWxlciBjb25maWcnKSk7XG5cbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci50c0NoZWNrQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgVFMgY2hlY2tlciBjb21waWxlciBvcHRpb24gb3ZlcnJpZGVzIGZyb20gJywgY2ZnRmlsZSk7XG4gICAgICAgIGhhbmRsZXIudHNDaGVja0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgICB9XG4gICAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgdHMgY2hlY2tlciBjb21waWxlciBjb25maWcnKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuVHNDb25maWdIYW5kbGVyczRMaWJUc2QoKSB7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHtwYXRoczoge319O1xuICBjb25zdCB7Z2V0Q29uZmlnRmlsZUluUGFja2FnZX0gPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJykgYXMgdHlwZW9mIF9jcmFQYXRocztcbiAgY29uc3QgY29uZmlnRmlsZUluUGFja2FnZSA9IGdldENvbmZpZ0ZpbGVJblBhY2thZ2UoKTtcbiAgY29uc3QgY21kT3B0ID0gZ2V0Q21kT3B0aW9ucygpO1xuICBjb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuXG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCBfcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGhhbmRsZXIubGliVHNkQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFRTRCBjb21waWxlciBvcHRpb24gb3ZlcnJpZGVzJywgY2ZnRmlsZSk7XG4gICAgICBoYW5kbGVyLmxpYlRzZENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgfVxuICB9LCAnY3JlYXRlLXJlYWN0LWFwcCB0cyBjb21waWxlciBjb25maWcnKSk7XG5cbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci5saWJUc2RDb21waWxlck9wdGlvbnMgIT0gbnVsbCkge1xuICAgICAgICBsb2cuaW5mbygnRXhlY3V0ZSBUU0QgY29tcGlsZXIgb3B0aW9uIG92ZXJyaWRlcyBmcm9tICcsIGNmZ0ZpbGUpO1xuICAgICAgICBoYW5kbGVyLmxpYlRzZENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgICB9XG4gICAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgdHMgY29tcGlsZXIgY29uZmlnJyk7XG4gIH1cbiAgcmV0dXJuIGNvbXBpbGVyT3B0aW9ucztcbn1cbiJdfQ==