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
// tslint:disable: no-console
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
    plink_1.config.configHandlerMgrChanged(mgr => mgr.runEachSync((cfgFile, result, handler) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLDZDQUFzQztBQUV0QyxnREFBd0I7QUFFeEIsbUNBQTBCO0FBRzFCLHNDQUFtRjtBQUc1RSxNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUUsQ0FBQyxjQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBQXJFLFFBQUEsWUFBWSxnQkFBeUQ7QUFFbEYsU0FBZ0IsU0FBUyxDQUFDLE1BQWMsRUFBRSxPQUFnQjtJQUN4RCxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxHQUFHLHNDQUFzQyxDQUFDO0tBQ2pEO0lBRUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLElBQUk7UUFDL0IsTUFBTSxNQUFNLE1BQU07UUFDbEIsS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJO1FBQ25CLHdHQUF3RyxDQUFDLENBQUM7SUFDNUcsSUFBSSxPQUFPLEVBQUU7UUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3RCO0FBQ0gsQ0FBQztBQWJELDhCQWFDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLENBQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQztJQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQztJQUNoQixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDakMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxD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Iiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCB1dGlsLCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQge0NvbW1hbmRPcHRpb259IGZyb20gJy4vYnVpbGQtb3B0aW9ucyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2d0fSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdDb21tYW5kZXInO1xuaW1wb3J0ICogYXMgX2NyYVBhdGhzIGZyb20gJy4vY3JhLXNjcmlwdHMtcGF0aHMnO1xuaW1wb3J0IHtjb25maWcsIGxvZzRGaWxlLCBDb25maWdIYW5kbGVyTWdyLCBmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7UmVhY3RTY3JpcHRzSGFuZGxlcn0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBjb25zdCBnZXRSZXBvcnREaXIgPSAoKSA9PiBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdjcmEtc2NyaXB0cy5yZXBvcnQnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdQdXBweShzbG9nb246IHN0cmluZywgbWVzc2FnZT86IHN0cmluZykge1xuICBpZiAoIXNsb2dvbikge1xuICAgIHNsb2dvbiA9ICdDb25ncmFkcyEgVGltZSB0byBwdWJsaXNoIHlvdXIgc2hpdCEnO1xuICB9XG5cbiAgY29uc3QgbGluZSA9ICctJy5yZXBlYXQoc2xvZ29uLmxlbmd0aCk7XG4gIGNvbnNvbGUubG9nKCdcXG4gICAnICsgbGluZSArICdcXG4nICtcbiAgICBgIDwgJHtzbG9nb259ID5cXG5gICtcbiAgICAnICAgJyArIGxpbmUgKyAnXFxuJyArXG4gICAgJ1xcdFxcXFwgICBeX19eXFxuXFx0IFxcXFwgIChvbylcXFxcX19fX19fX1xcblxcdCAgICAoX18pXFxcXCAgICAgICApXFxcXC9cXFxcXFxuXFx0ICAgICAgICB8fC0tLS13IHxcXG5cXHQgICAgICAgIHx8ICAgICB8fCcpO1xuICBpZiAobWVzc2FnZSkge1xuICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludENvbmZpZyhjOiBhbnksIGxldmVsID0gMCk6IHN0cmluZyB7XG4gIGNvbnN0IGluZGVudCA9ICcgICcucmVwZWF0KGxldmVsKTtcbiAgbGV0IG91dCA9ICd7XFxuJztcbiAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKGMpKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjW3Byb3BdO1xuICAgIG91dCArPSBpbmRlbnQgKyBgICAke0pTT04uc3RyaW5naWZ5KHByb3ApfTogJHtwcmludENvbmZpZ1ZhbHVlKHZhbHVlLCBsZXZlbCl9LFxcbmA7XG4gIH1cbiAgb3V0ICs9IGluZGVudCArICd9JztcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWdWYWx1ZSh2YWx1ZTogYW55LCBsZXZlbDogbnVtYmVyKTogc3RyaW5nIHtcbiAgbGV0IG91dCA9ICcnO1xuICBjb25zdCBpbmRlbnQgPSAnICAnLnJlcGVhdChsZXZlbCk7XG4gIGlmICh1dGlsLmlzU3RyaW5nKHZhbHVlKSB8fCB1dGlsLmlzTnVtYmVyKHZhbHVlKSB8fCB1dGlsLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gSlNPTi5zdHJpbmdpZnkodmFsdWUpICsgJyc7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gJ1tcXG4nO1xuICAgICh2YWx1ZSBhcyBhbnlbXSkuZm9yRWFjaCgocm93OiBhbnkpID0+IHtcbiAgICAgIG91dCArPSBpbmRlbnQgKyAnICAgICcgKyBwcmludENvbmZpZ1ZhbHVlKHJvdywgbGV2ZWwgKyAxKTtcbiAgICAgIG91dCArPSAnLFxcbic7XG4gICAgfSk7XG4gICAgb3V0ICs9IGluZGVudCArICcgIF0nO1xuICB9IGVsc2UgaWYgKHV0aWwuaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gdmFsdWUubmFtZSArICcoKSc7XG4gIH0gZWxzZSBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgb3V0ICs9IGAke3ZhbHVlLnRvU3RyaW5nKCl9YDtcbiAgfSBlbHNlIGlmICh1dGlsLmlzT2JqZWN0KHZhbHVlKSkge1xuICAgIGNvbnN0IHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKTtcbiAgICBpZiAocHJvdG8gJiYgcHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgb3V0ICs9IGBuZXcgJHtwcm90by5jb25zdHJ1Y3Rvci5uYW1lfSgpYDtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9IHByaW50Q29uZmlnKHZhbHVlLCBsZXZlbCArIDEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB1bmtub3duJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5cbi8vIFRPRE86IG1vdmUgdG8gYSBSZWR1eCBzdG9yZVxuZXhwb3J0IGZ1bmN0aW9uIGdldENtZE9wdGlvbnMoKTogQ29tbWFuZE9wdGlvbiB7XG4gIGNvbnN0IGNtZE9wdGlvbjogQ29tbWFuZE9wdGlvbiA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuUkVBQ1RfQVBQX2NyYV9idWlsZCEpO1xuICBpZiAoY21kT3B0aW9uLmRldk1vZGUgfHwgY21kT3B0aW9uLndhdGNoKSB7XG4gICAgKHByb2Nlc3MuZW52IGFzIGFueSkuTk9ERV9FTlYgPSAnZGV2ZWxvcG1lbnQnO1xuICB9XG4gIHJldHVybiBjbWRPcHRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlQ21kT3B0aW9uc1RvRW52KHBrZ05hbWU6IHN0cmluZywgY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgYnVpbGRUeXBlOiAnYXBwJyB8ICdsaWInKTogQ29tbWFuZE9wdGlvbiB7XG4gIGNvbnN0IG9wdHMgPSBjbWQub3B0cygpO1xuICBjb25zdCBjb21wbGV0ZU5hbWUgPSBbLi4uZmluZFBhY2thZ2VzQnlOYW1lcyhbcGtnTmFtZV0pXVswXSEubmFtZTtcbiAgY29uc3QgY21kT3B0aW9uczogQ29tbWFuZE9wdGlvbiA9IHtcbiAgICBjbWQ6IGNtZC5uYW1lKCksXG4gICAgYnVpbGRUeXBlLFxuICAgIGJ1aWxkVGFyZ2V0OiBjb21wbGV0ZU5hbWUsXG4gICAgd2F0Y2g6IG9wdHMud2F0Y2gsXG4gICAgZGV2TW9kZTogb3B0cy5kZXYsXG4gICAgcHVibGljVXJsOiBvcHRzLnB1YmxpY1VybCxcbiAgICAvLyBleHRlcm5hbDogb3B0cy5leHRlcm5hbCxcbiAgICBpbmNsdWRlczogb3B0cy5pbmNsdWRlLFxuICAgIHdlYnBhY2tFbnY6IG9wdHMuZGV2ID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJ1xuICB9O1xuICBpZiAoY21kLm9wdHMoKS5wdWJsaWNVcmwpIHtcbiAgICAocHJvY2Vzcy5lbnYgYXMgYW55KS5QVUJMSUNfVVJMID0gY21kLm9wdHMoKS5wdWJsaWNVcmw7XG4gIH1cbiAgcHJvY2Vzcy5lbnYuUkVBQ1RfQVBQX2NyYV9idWlsZCA9IEpTT04uc3RyaW5naWZ5KGNtZE9wdGlvbnMpO1xuXG4gIC8vIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuICAvLyBjb25maWcuaW5pdFN5bmMoY21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgcmV0dXJuIGNtZE9wdGlvbnM7XG59XG5cbi8vIGZ1bmN0aW9uIHdpdGhDbGljT3B0KGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbi8vICAgY21kLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnV2F0Y2ggZmlsZSBjaGFuZ2VzIGFuZCBjb21waWxlJywgZmFsc2UpXG4vLyAgIC5vcHRpb24oJy0tZGV2JywgJ3NldCBOT0RFX0VOViB0byBcImRldmVsb3BtZW50XCIsIGVuYWJsZSByZWFjdC1zY3JpcHRzIGluIGRldiBtb2RlJywgZmFsc2UpXG4vLyAgIC5vcHRpb24oJy0tcHVybCwgLS1wdWJsaWNVcmwgPHN0cmluZz4nLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIFBVQkxJQ19VUkwgZm9yIHJlYWN0LXNjcmlwdHMnLCAnLycpO1xuLy8gICB3aXRoR2xvYmFsT3B0aW9ucyhjbWQpO1xuLy8gfVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmFWZXJzaW9uQ2hlY2soKSB7XG4gIGNvbnN0IGNyYVBhY2thZ2UgPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMvcGFja2FnZS5qc29uJykpO1xuICBpZiAoIWd0KGNyYVBhY2thZ2UudmVyc2lvbiwgJzMuNC4wJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHJlYWN0LXNjcmlwdHMgdmVyc2lvbiBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAzLjQuMCwgY3VycmVudCBpbnN0YWxsZWQgdmVyc2lvbiBpcyAke2NyYVBhY2thZ2UudmVyc2lvbn1gKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuVHNDb25maWdIYW5kbGVycyhjb21waWxlck9wdGlvbnM6IGFueSkge1xuICBjb25zdCB7Z2V0Q29uZmlnRmlsZUluUGFja2FnZX06IHR5cGVvZiBfY3JhUGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJyk7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVJblBhY2thZ2UgPSBnZXRDb25maWdGaWxlSW5QYWNrYWdlKCk7XG4gIGNvbnN0IGNtZE9wdCA9IGdldENtZE9wdGlvbnMoKTtcbiAgY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci50c0NoZWNrQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFRTIGNvbXBpbGVyIG9wdGlvbiBvdmVycmlkZXMnLCBjZmdGaWxlKTtcbiAgICAgIGhhbmRsZXIudHNDaGVja0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgfVxuICB9LCAnY3JlYXRlLXJlYWN0LWFwcCB0cyBjb21waWxlciBjb25maWcnKSk7XG5cbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci50c0NoZWNrQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgVFMgY2hlY2tlciBjb21waWxlciBvcHRpb24gb3ZlcnJpZGVzIGZyb20gJywgY2ZnRmlsZSk7XG4gICAgICAgIGhhbmRsZXIudHNDaGVja0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgICB9XG4gICAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgdHMgY2hlY2tlciBjb21waWxlciBjb25maWcnKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuVHNDb25maWdIYW5kbGVyczRMaWJUc2QoKSB7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHtwYXRoczoge319O1xuICBjb25zdCB7Z2V0Q29uZmlnRmlsZUluUGFja2FnZX06IHR5cGVvZiBfY3JhUGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJyk7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVJblBhY2thZ2UgPSBnZXRDb25maWdGaWxlSW5QYWNrYWdlKCk7XG4gIGNvbnN0IGNtZE9wdCA9IGdldENtZE9wdGlvbnMoKTtcbiAgY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci5saWJUc2RDb21waWxlck9wdGlvbnMgIT0gbnVsbCkge1xuICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgVFNEIGNvbXBpbGVyIG9wdGlvbiBvdmVycmlkZXMnLCBjZmdGaWxlKTtcbiAgICAgIGhhbmRsZXIubGliVHNkQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucywgY21kT3B0KTtcbiAgICB9XG4gIH0sICdjcmVhdGUtcmVhY3QtYXBwIHRzIGNvbXBpbGVyIGNvbmZpZycpKTtcblxuICBpZiAoY29uZmlnRmlsZUluUGFja2FnZSkge1xuICAgIGNvbnN0IGNmZ01nciA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFtjb25maWdGaWxlSW5QYWNrYWdlXSk7XG4gICAgY2ZnTWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLmxpYlRzZENvbXBpbGVyT3B0aW9ucyAhPSBudWxsKSB7XG4gICAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFRTRCBjb21waWxlciBvcHRpb24gb3ZlcnJpZGVzIGZyb20gJywgY2ZnRmlsZSk7XG4gICAgICAgIGhhbmRsZXIubGliVHNkQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucywgY21kT3B0KTtcbiAgICAgIH1cbiAgICB9LCAnY3JlYXRlLXJlYWN0LWFwcCB0cyBjb21waWxlciBjb25maWcnKTtcbiAgfVxuICByZXR1cm4gY29tcGlsZXJPcHRpb25zO1xufVxuIl19