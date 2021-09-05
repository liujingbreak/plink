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
function saveCmdOptionsToEnv(pkgName, cmd, buildType) {
    const opts = cmd.opts();
    const completeName = [...(0, plink_1.findPackagesByNames)([pkgName])][0].name;
    const cmdOptions = {
        cmd: cmd.name(),
        buildType,
        buildTarget: completeName,
        watch: opts.watch,
        devMode: !!opts.dev,
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
    if (!(0, semver_1.gt)(craPackage.version, '3.4.0')) {
        throw new Error(`react-scripts version must be greater than 3.4.0, current installed version is ${craPackage.version}`);
    }
}
exports.craVersionCheck = craVersionCheck;
function runTsConfigHandlers(compilerOptions) {
    const { getConfigFileInPackage } = require('./cra-scripts-paths');
    const configFileInPackage = getConfigFileInPackage();
    const cmdOpt = getCmdOptions();
    const log = (0, plink_1.log4File)(__filename);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDZDQUFzQztBQUV0QyxnREFBd0I7QUFFeEIsbUNBQTBCO0FBRzFCLHNDQUFrRztBQUczRixNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUUsQ0FBQyxjQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBQXJFLFFBQUEsWUFBWSxnQkFBeUQ7QUFFbEYsU0FBZ0IsU0FBUyxDQUFDLE1BQWMsRUFBRSxPQUFnQjtJQUN4RCxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxHQUFHLHNDQUFzQyxDQUFDO0tBQ2pEO0lBRUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLElBQUk7UUFDL0IsTUFBTSxNQUFNLE1BQU07UUFDbEIsS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJO1FBQ25CLHdHQUF3RyxDQUFDLENBQUM7SUFDNUcsSUFBSSxPQUFPLEVBQUU7UUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3RCO0FBQ0gsQ0FBQztBQWJELDhCQWFDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLENBQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQztJQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQztJQUNoQixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDakMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxD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QUFDO0tBQzNDO0lBQ0QsT0FBTyxlQUFlLENBQUM7QUFDekIsQ0FBQztBQXhCRCxnRUF3QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgdXRpbCwgeyBpc1JlZ0V4cCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IHtDb21tYW5kT3B0aW9ufSBmcm9tICcuL2J1aWxkLW9wdGlvbnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtndH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnQ29tbWFuZGVyJztcbmltcG9ydCAqIGFzIF9jcmFQYXRocyBmcm9tICcuL2NyYS1zY3JpcHRzLXBhdGhzJztcbmltcG9ydCB7Y29uZmlnLCBQbGlua1NldHRpbmdzLCBsb2c0RmlsZSwgQ29uZmlnSGFuZGxlck1nciwgZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQge1JlYWN0U2NyaXB0c0hhbmRsZXJ9IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgY29uc3QgZ2V0UmVwb3J0RGlyID0gKCkgPT4gY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnY3JhLXNjcmlwdHMucmVwb3J0Jyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3UHVwcHkoc2xvZ29uOiBzdHJpbmcsIG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgaWYgKCFzbG9nb24pIHtcbiAgICBzbG9nb24gPSAnQ29uZ3JhZHMhIFRpbWUgdG8gcHVibGlzaCB5b3VyIHNoaXQhJztcbiAgfVxuXG4gIGNvbnN0IGxpbmUgPSAnLScucmVwZWF0KHNsb2dvbi5sZW5ndGgpO1xuICBjb25zb2xlLmxvZygnXFxuICAgJyArIGxpbmUgKyAnXFxuJyArXG4gICAgYCA8ICR7c2xvZ29ufSA+XFxuYCArXG4gICAgJyAgICcgKyBsaW5lICsgJ1xcbicgK1xuICAgICdcXHRcXFxcICAgXl9fXlxcblxcdCBcXFxcICAob28pXFxcXF9fX19fX19cXG5cXHQgICAgKF9fKVxcXFwgICAgICAgKVxcXFwvXFxcXFxcblxcdCAgICAgICAgfHwtLS0tdyB8XFxuXFx0ICAgICAgICB8fCAgICAgfHwnKTtcbiAgaWYgKG1lc3NhZ2UpIHtcbiAgICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRDb25maWcoYzogYW55LCBsZXZlbCA9IDApOiBzdHJpbmcge1xuICBjb25zdCBpbmRlbnQgPSAnICAnLnJlcGVhdChsZXZlbCk7XG4gIGxldCBvdXQgPSAne1xcbic7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhjKSkge1xuICAgIGNvbnN0IHZhbHVlID0gY1twcm9wXTtcbiAgICBvdXQgKz0gaW5kZW50ICsgYCAgJHtKU09OLnN0cmluZ2lmeShwcm9wKX06ICR7cHJpbnRDb25maWdWYWx1ZSh2YWx1ZSwgbGV2ZWwpfSxcXG5gO1xuICB9XG4gIG91dCArPSBpbmRlbnQgKyAnfSc7XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnVmFsdWUodmFsdWU6IGFueSwgbGV2ZWw6IG51bWJlcik6IHN0cmluZyB7XG4gIGxldCBvdXQgPSAnJztcbiAgY29uc3QgaW5kZW50ID0gJyAgJy5yZXBlYXQobGV2ZWwpO1xuICBpZiAodXRpbC5pc1N0cmluZyh2YWx1ZSkgfHwgdXRpbC5pc051bWJlcih2YWx1ZSkgfHwgdXRpbC5pc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgb3V0ICs9IEpTT04uc3RyaW5naWZ5KHZhbHVlKSArICcnO1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgb3V0ICs9ICdbXFxuJztcbiAgICB2YWx1ZS5mb3JFYWNoKChyb3c6IGFueSkgPT4ge1xuICAgICAgb3V0ICs9IGluZGVudCArICcgICAgJyArIHByaW50Q29uZmlnVmFsdWUocm93LCBsZXZlbCArIDEpO1xuICAgICAgb3V0ICs9ICcsXFxuJztcbiAgICB9KTtcbiAgICBvdXQgKz0gaW5kZW50ICsgJyAgXSc7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgb3V0ICs9IHZhbHVlLm5hbWUgKyAnKCknO1xuICB9IGVsc2UgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIG91dCArPSBgJHt2YWx1ZS50b1N0cmluZygpfWA7XG4gIH0gZWxzZSBpZiAodXRpbC5pc09iamVjdCh2YWx1ZSkpIHtcbiAgICBjb25zdCBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSk7XG4gICAgaWYgKHByb3RvICYmIHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcbiAgICAgIG91dCArPSBgbmV3ICR7cHJvdG8uY29uc3RydWN0b3IubmFtZSBhcyBzdHJpbmd9KClgO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gcHJpbnRDb25maWcodmFsdWUsIGxldmVsICsgMSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHVua25vd24nO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cblxuLy8gVE9ETzogbW92ZSB0byBhIFJlZHV4IHN0b3JlXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q21kT3B0aW9ucygpOiBDb21tYW5kT3B0aW9uIHtcbiAgY29uc3QgY21kT3B0aW9uOiBDb21tYW5kT3B0aW9uID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5SRUFDVF9BUFBfY3JhX2J1aWxkISk7XG4gIGlmIChjbWRPcHRpb24uZGV2TW9kZSB8fCBjbWRPcHRpb24ud2F0Y2gpIHtcbiAgICAocHJvY2Vzcy5lbnYgYXMgYW55KS5OT0RFX0VOViA9ICdkZXZlbG9wbWVudCc7XG4gIH1cbiAgcmV0dXJuIGNtZE9wdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVDbWRPcHRpb25zVG9FbnYocGtnTmFtZTogc3RyaW5nLCBjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBidWlsZFR5cGU6ICdhcHAnIHwgJ2xpYicpOiBDb21tYW5kT3B0aW9uIHtcbiAgY29uc3Qgb3B0cyA9IGNtZC5vcHRzKCkgYXMgTm9uTnVsbGFibGU8UGxpbmtTZXR0aW5nc1snY2xpT3B0aW9ucyddPiAmIHt3YXRjaDogYm9vbGVhbjsgaW5jbHVkZT86IHN0cmluZ1tdOyBwdWJsaWNVcmw/OiBzdHJpbmd9O1xuICBjb25zdCBjb21wbGV0ZU5hbWUgPSBbLi4uZmluZFBhY2thZ2VzQnlOYW1lcyhbcGtnTmFtZV0pXVswXSEubmFtZTtcbiAgY29uc3QgY21kT3B0aW9uczogQ29tbWFuZE9wdGlvbiA9IHtcbiAgICBjbWQ6IGNtZC5uYW1lKCksXG4gICAgYnVpbGRUeXBlLFxuICAgIGJ1aWxkVGFyZ2V0OiBjb21wbGV0ZU5hbWUsXG4gICAgd2F0Y2g6IG9wdHMud2F0Y2gsXG4gICAgZGV2TW9kZTogISFvcHRzLmRldixcbiAgICBwdWJsaWNVcmw6IG9wdHMucHVibGljVXJsLFxuICAgIC8vIGV4dGVybmFsOiBvcHRzLmV4dGVybmFsLFxuICAgIGluY2x1ZGVzOiBvcHRzLmluY2x1ZGUsXG4gICAgd2VicGFja0Vudjogb3B0cy5kZXYgPyAnZGV2ZWxvcG1lbnQnIDogJ3Byb2R1Y3Rpb24nXG4gIH07XG4gIGlmIChjbWQub3B0cygpLnB1YmxpY1VybCkge1xuICAgIChwcm9jZXNzLmVudiBhcyBhbnkpLlBVQkxJQ19VUkwgPSBjbWQub3B0cygpLnB1YmxpY1VybDtcbiAgfVxuICBwcm9jZXNzLmVudi5SRUFDVF9BUFBfY3JhX2J1aWxkID0gSlNPTi5zdHJpbmdpZnkoY21kT3B0aW9ucyk7XG5cbiAgLy8gc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG4gIC8vIGNvbmZpZy5pbml0U3luYyhjbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICByZXR1cm4gY21kT3B0aW9ucztcbn1cblxuLy8gZnVuY3Rpb24gd2l0aENsaWNPcHQoY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuLy8gICBjbWQub3B0aW9uKCctdywgLS13YXRjaCcsICdXYXRjaCBmaWxlIGNoYW5nZXMgYW5kIGNvbXBpbGUnLCBmYWxzZSlcbi8vICAgLm9wdGlvbignLS1kZXYnLCAnc2V0IE5PREVfRU5WIHRvIFwiZGV2ZWxvcG1lbnRcIiwgZW5hYmxlIHJlYWN0LXNjcmlwdHMgaW4gZGV2IG1vZGUnLCBmYWxzZSlcbi8vICAgLm9wdGlvbignLS1wdXJsLCAtLXB1YmxpY1VybCA8c3RyaW5nPicsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgUFVCTElDX1VSTCBmb3IgcmVhY3Qtc2NyaXB0cycsICcvJyk7XG4vLyAgIHdpdGhHbG9iYWxPcHRpb25zKGNtZCk7XG4vLyB9XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNyYVZlcnNpb25DaGVjaygpIHtcbiAgY29uc3QgY3JhUGFja2FnZSA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cy9wYWNrYWdlLmpzb24nKSkgYXMge3ZlcnNpb246IHN0cmluZ307XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgaWYgKCFndChjcmFQYWNrYWdlLnZlcnNpb24sICczLjQuMCcpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGByZWFjdC1zY3JpcHRzIHZlcnNpb24gbXVzdCBiZSBncmVhdGVyIHRoYW4gMy40LjAsIGN1cnJlbnQgaW5zdGFsbGVkIHZlcnNpb24gaXMgJHtjcmFQYWNrYWdlLnZlcnNpb259YCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJ1blRzQ29uZmlnSGFuZGxlcnMoY29tcGlsZXJPcHRpb25zOiBhbnkpIHtcbiAgY29uc3Qge2dldENvbmZpZ0ZpbGVJblBhY2thZ2V9ID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpIGFzIHR5cGVvZiBfY3JhUGF0aHM7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVJblBhY2thZ2UgPSBnZXRDb25maWdGaWxlSW5QYWNrYWdlKCk7XG4gIGNvbnN0IGNtZE9wdCA9IGdldENtZE9wdGlvbnMoKTtcbiAgY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci50c0NoZWNrQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFRTIGNvbXBpbGVyIG9wdGlvbiBvdmVycmlkZXMnLCBjZmdGaWxlKTtcbiAgICAgIGhhbmRsZXIudHNDaGVja0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgfVxuICB9LCAnY3JlYXRlLXJlYWN0LWFwcCB0cyBjb21waWxlciBjb25maWcnKSk7XG5cbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci50c0NoZWNrQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgVFMgY2hlY2tlciBjb21waWxlciBvcHRpb24gb3ZlcnJpZGVzIGZyb20gJywgY2ZnRmlsZSk7XG4gICAgICAgIGhhbmRsZXIudHNDaGVja0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgICB9XG4gICAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgdHMgY2hlY2tlciBjb21waWxlciBjb25maWcnKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuVHNDb25maWdIYW5kbGVyczRMaWJUc2QoKSB7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHtwYXRoczoge319O1xuICBjb25zdCB7Z2V0Q29uZmlnRmlsZUluUGFja2FnZX0gPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJykgYXMgdHlwZW9mIF9jcmFQYXRocztcbiAgY29uc3QgY29uZmlnRmlsZUluUGFja2FnZSA9IGdldENvbmZpZ0ZpbGVJblBhY2thZ2UoKTtcbiAgY29uc3QgY21kT3B0ID0gZ2V0Q21kT3B0aW9ucygpO1xuICBjb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuXG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCBfcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGhhbmRsZXIubGliVHNkQ29tcGlsZXJPcHRpb25zICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFRTRCBjb21waWxlciBvcHRpb24gb3ZlcnJpZGVzJywgY2ZnRmlsZSk7XG4gICAgICBoYW5kbGVyLmxpYlRzZENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgfVxuICB9LCAnY3JlYXRlLXJlYWN0LWFwcCB0cyBjb21waWxlciBjb25maWcnKSk7XG5cbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci5saWJUc2RDb21waWxlck9wdGlvbnMgIT0gbnVsbCkge1xuICAgICAgICBsb2cuaW5mbygnRXhlY3V0ZSBUU0QgY29tcGlsZXIgb3B0aW9uIG92ZXJyaWRlcyBmcm9tICcsIGNmZ0ZpbGUpO1xuICAgICAgICBoYW5kbGVyLmxpYlRzZENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIGNtZE9wdCk7XG4gICAgICB9XG4gICAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgdHMgY29tcGlsZXIgY29uZmlnJyk7XG4gIH1cbiAgcmV0dXJuIGNvbXBpbGVyT3B0aW9ucztcbn1cbiJdfQ==