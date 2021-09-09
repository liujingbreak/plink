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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDZDQUFzQztBQUV0QyxnREFBd0I7QUFFeEIsbUNBQTBCO0FBRTFCLHNDQUE2RztBQUd0RyxNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUUsQ0FBQyxjQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBQXJFLFFBQUEsWUFBWSxnQkFBeUQ7QUFFbEYsU0FBZ0IsU0FBUyxDQUFDLE1BQWMsRUFBRSxPQUFnQjtJQUN4RCxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxHQUFHLHNDQUFzQyxDQUFDO0tBQ2pEO0lBRUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLElBQUk7UUFDL0IsTUFBTSxNQUFNLE1BQU07UUFDbEIsS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJO1FBQ25CLHdHQUF3RyxDQUFDLENBQUM7SUFDNUcsSUFBSSxPQUFPLEVBQUU7UUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3RCO0FBQ0gsQ0FBQztBQWJELDhCQWFDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLENBQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQztJQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQztJQUNoQixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDakMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxD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QUFDO0tBQzNDO0lBQ0QsT0FBTyxlQUFlLENBQUM7QUFDekIsQ0FBQztBQXhCRCxnRUF3QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgdXRpbCwgeyBpc1JlZ0V4cCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IHtDb21tYW5kT3B0aW9ufSBmcm9tICcuL2J1aWxkLW9wdGlvbnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtndH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCAqIGFzIF9jcmFQYXRocyBmcm9tICcuL2NyYS1zY3JpcHRzLXBhdGhzJztcbmltcG9ydCB7Y29uZmlnLCBQbGlua1NldHRpbmdzLCBsb2c0RmlsZSwgQ29uZmlnSGFuZGxlck1nciwgZmluZFBhY2thZ2VzQnlOYW1lcywgY29tbWFuZGVyfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7UmVhY3RTY3JpcHRzSGFuZGxlcn0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBjb25zdCBnZXRSZXBvcnREaXIgPSAoKSA9PiBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdjcmEtc2NyaXB0cy5yZXBvcnQnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdQdXBweShzbG9nb246IHN0cmluZywgbWVzc2FnZT86IHN0cmluZykge1xuICBpZiAoIXNsb2dvbikge1xuICAgIHNsb2dvbiA9ICdDb25ncmFkcyEgVGltZSB0byBwdWJsaXNoIHlvdXIgc2hpdCEnO1xuICB9XG5cbiAgY29uc3QgbGluZSA9ICctJy5yZXBlYXQoc2xvZ29uLmxlbmd0aCk7XG4gIGNvbnNvbGUubG9nKCdcXG4gICAnICsgbGluZSArICdcXG4nICtcbiAgICBgIDwgJHtzbG9nb259ID5cXG5gICtcbiAgICAnICAgJyArIGxpbmUgKyAnXFxuJyArXG4gICAgJ1xcdFxcXFwgICBeX19eXFxuXFx0IFxcXFwgIChvbylcXFxcX19fX19fX1xcblxcdCAgICAoX18pXFxcXCAgICAgICApXFxcXC9cXFxcXFxuXFx0ICAgICAgICB8fC0tLS13IHxcXG5cXHQgICAgICAgIHx8ICAgICB8fCcpO1xuICBpZiAobWVzc2FnZSkge1xuICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludENvbmZpZyhjOiBhbnksIGxldmVsID0gMCk6IHN0cmluZyB7XG4gIGNvbnN0IGluZGVudCA9ICcgICcucmVwZWF0KGxldmVsKTtcbiAgbGV0IG91dCA9ICd7XFxuJztcbiAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKGMpKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjW3Byb3BdO1xuICAgIG91dCArPSBpbmRlbnQgKyBgICAke0pTT04uc3RyaW5naWZ5KHByb3ApfTogJHtwcmludENvbmZpZ1ZhbHVlKHZhbHVlLCBsZXZlbCl9LFxcbmA7XG4gIH1cbiAgb3V0ICs9IGluZGVudCArICd9JztcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWdWYWx1ZSh2YWx1ZTogYW55LCBsZXZlbDogbnVtYmVyKTogc3RyaW5nIHtcbiAgbGV0IG91dCA9ICcnO1xuICBjb25zdCBpbmRlbnQgPSAnICAnLnJlcGVhdChsZXZlbCk7XG4gIGlmICh1dGlsLmlzU3RyaW5nKHZhbHVlKSB8fCB1dGlsLmlzTnVtYmVyKHZhbHVlKSB8fCB1dGlsLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gSlNPTi5zdHJpbmdpZnkodmFsdWUpICsgJyc7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gJ1tcXG4nO1xuICAgIHZhbHVlLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG4gICAgICBvdXQgKz0gaW5kZW50ICsgJyAgICAnICsgcHJpbnRDb25maWdWYWx1ZShyb3csIGxldmVsICsgMSk7XG4gICAgICBvdXQgKz0gJyxcXG4nO1xuICAgIH0pO1xuICAgIG91dCArPSBpbmRlbnQgKyAnICBdJztcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICBvdXQgKz0gdmFsdWUubmFtZSArICcoKSc7XG4gIH0gZWxzZSBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgb3V0ICs9IGAke3ZhbHVlLnRvU3RyaW5nKCl9YDtcbiAgfSBlbHNlIGlmICh1dGlsLmlzT2JqZWN0KHZhbHVlKSkge1xuICAgIGNvbnN0IHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKTtcbiAgICBpZiAocHJvdG8gJiYgcHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgb3V0ICs9IGBuZXcgJHtwcm90by5jb25zdHJ1Y3Rvci5uYW1lIGFzIHN0cmluZ30oKWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSBwcmludENvbmZpZyh2YWx1ZSwgbGV2ZWwgKyAxKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdW5rbm93bic7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuXG4vLyBUT0RPOiBtb3ZlIHRvIGEgUmVkdXggc3RvcmVcbmV4cG9ydCBmdW5jdGlvbiBnZXRDbWRPcHRpb25zKCk6IENvbW1hbmRPcHRpb24ge1xuICBjb25zdCBjbWRPcHRpb246IENvbW1hbmRPcHRpb24gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52LlJFQUNUX0FQUF9jcmFfYnVpbGQhKTtcbiAgaWYgKGNtZE9wdGlvbi5kZXZNb2RlIHx8IGNtZE9wdGlvbi53YXRjaCkge1xuICAgIChwcm9jZXNzLmVudiBhcyBhbnkpLk5PREVfRU5WID0gJ2RldmVsb3BtZW50JztcbiAgfVxuICByZXR1cm4gY21kT3B0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUNtZE9wdGlvbnNUb0Vudihwa2dOYW1lOiBzdHJpbmcsIGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGJ1aWxkVHlwZTogJ2FwcCcgfCAnbGliJyk6IENvbW1hbmRPcHRpb24ge1xuICBjb25zdCBvcHRzID0gY21kLm9wdHMoKSBhcyBOb25OdWxsYWJsZTxQbGlua1NldHRpbmdzWydjbGlPcHRpb25zJ10+ICYge3dhdGNoOiBib29sZWFuOyBpbmNsdWRlPzogc3RyaW5nW107IHB1YmxpY1VybD86IHN0cmluZ307XG4gIGNvbnN0IGNvbXBsZXRlTmFtZSA9IFsuLi5maW5kUGFja2FnZXNCeU5hbWVzKFtwa2dOYW1lXSldWzBdIS5uYW1lO1xuICBjb25zdCBjbWRPcHRpb25zOiBDb21tYW5kT3B0aW9uID0ge1xuICAgIGNtZDogY21kLm5hbWUoKSxcbiAgICBidWlsZFR5cGUsXG4gICAgYnVpbGRUYXJnZXQ6IGNvbXBsZXRlTmFtZSxcbiAgICB3YXRjaDogb3B0cy53YXRjaCxcbiAgICBkZXZNb2RlOiAhIW9wdHMuZGV2LFxuICAgIHB1YmxpY1VybDogb3B0cy5wdWJsaWNVcmwsXG4gICAgLy8gZXh0ZXJuYWw6IG9wdHMuZXh0ZXJuYWwsXG4gICAgaW5jbHVkZXM6IG9wdHMuaW5jbHVkZSxcbiAgICB3ZWJwYWNrRW52OiBvcHRzLmRldiA/ICdkZXZlbG9wbWVudCcgOiAncHJvZHVjdGlvbidcbiAgfTtcbiAgaWYgKGNtZC5vcHRzKCkucHVibGljVXJsKSB7XG4gICAgKHByb2Nlc3MuZW52IGFzIGFueSkuUFVCTElDX1VSTCA9IGNtZC5vcHRzKCkucHVibGljVXJsO1xuICB9XG4gIHByb2Nlc3MuZW52LlJFQUNUX0FQUF9jcmFfYnVpbGQgPSBKU09OLnN0cmluZ2lmeShjbWRPcHRpb25zKTtcblxuICAvLyBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcbiAgLy8gY29uZmlnLmluaXRTeW5jKGNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gIHJldHVybiBjbWRPcHRpb25zO1xufVxuXG4vLyBmdW5jdGlvbiB3aXRoQ2xpY09wdChjbWQ6IGNvbW1hbmRlci5Db21tYW5kKSB7XG4vLyAgIGNtZC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1dhdGNoIGZpbGUgY2hhbmdlcyBhbmQgY29tcGlsZScsIGZhbHNlKVxuLy8gICAub3B0aW9uKCctLWRldicsICdzZXQgTk9ERV9FTlYgdG8gXCJkZXZlbG9wbWVudFwiLCBlbmFibGUgcmVhY3Qtc2NyaXB0cyBpbiBkZXYgbW9kZScsIGZhbHNlKVxuLy8gICAub3B0aW9uKCctLXB1cmwsIC0tcHVibGljVXJsIDxzdHJpbmc+JywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBQVUJMSUNfVVJMIGZvciByZWFjdC1zY3JpcHRzJywgJy8nKTtcbi8vICAgd2l0aEdsb2JhbE9wdGlvbnMoY21kKTtcbi8vIH1cblxuXG5leHBvcnQgZnVuY3Rpb24gY3JhVmVyc2lvbkNoZWNrKCkge1xuICBjb25zdCBjcmFQYWNrYWdlID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzL3BhY2thZ2UuanNvbicpKSBhcyB7dmVyc2lvbjogc3RyaW5nfTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICBpZiAoIWd0KGNyYVBhY2thZ2UudmVyc2lvbiwgJzMuNC4wJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHJlYWN0LXNjcmlwdHMgdmVyc2lvbiBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAzLjQuMCwgY3VycmVudCBpbnN0YWxsZWQgdmVyc2lvbiBpcyAke2NyYVBhY2thZ2UudmVyc2lvbn1gKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuVHNDb25maWdIYW5kbGVycyhjb21waWxlck9wdGlvbnM6IGFueSkge1xuICBjb25zdCB7Z2V0Q29uZmlnRmlsZUluUGFja2FnZX0gPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJykgYXMgdHlwZW9mIF9jcmFQYXRocztcbiAgY29uc3QgY29uZmlnRmlsZUluUGFja2FnZSA9IGdldENvbmZpZ0ZpbGVJblBhY2thZ2UoKTtcbiAgY29uc3QgY21kT3B0ID0gZ2V0Q21kT3B0aW9ucygpO1xuICBjb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbiAgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkKG1nciA9PiBtZ3IucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIHJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLnRzQ2hlY2tDb21waWxlck9wdGlvbnMgIT0gbnVsbCkge1xuICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgVFMgY29tcGlsZXIgb3B0aW9uIG92ZXJyaWRlcycsIGNmZ0ZpbGUpO1xuICAgICAgaGFuZGxlci50c0NoZWNrQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucywgY21kT3B0KTtcbiAgICB9XG4gIH0sICdjcmVhdGUtcmVhY3QtYXBwIHRzIGNvbXBpbGVyIGNvbmZpZycpKTtcblxuICBpZiAoY29uZmlnRmlsZUluUGFja2FnZSkge1xuICAgIGNvbnN0IGNmZ01nciA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFtjb25maWdGaWxlSW5QYWNrYWdlXSk7XG4gICAgY2ZnTWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLnRzQ2hlY2tDb21waWxlck9wdGlvbnMgIT0gbnVsbCkge1xuICAgICAgICBsb2cuaW5mbygnRXhlY3V0ZSBUUyBjaGVja2VyIGNvbXBpbGVyIG9wdGlvbiBvdmVycmlkZXMgZnJvbSAnLCBjZmdGaWxlKTtcbiAgICAgICAgaGFuZGxlci50c0NoZWNrQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucywgY21kT3B0KTtcbiAgICAgIH1cbiAgICB9LCAnY3JlYXRlLXJlYWN0LWFwcCB0cyBjaGVja2VyIGNvbXBpbGVyIGNvbmZpZycpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5Uc0NvbmZpZ0hhbmRsZXJzNExpYlRzZCgpIHtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0ge3BhdGhzOiB7fX07XG4gIGNvbnN0IHtnZXRDb25maWdGaWxlSW5QYWNrYWdlfSA9IHJlcXVpcmUoJy4vY3JhLXNjcmlwdHMtcGF0aHMnKSBhcyB0eXBlb2YgX2NyYVBhdGhzO1xuICBjb25zdCBjb25maWdGaWxlSW5QYWNrYWdlID0gZ2V0Q29uZmlnRmlsZUluUGFja2FnZSgpO1xuICBjb25zdCBjbWRPcHQgPSBnZXRDbWRPcHRpb25zKCk7XG4gIGNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm5cbiAgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkKG1nciA9PiBtZ3IucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIF9yZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci5saWJUc2RDb21waWxlck9wdGlvbnMgIT0gbnVsbCkge1xuICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgVFNEIGNvbXBpbGVyIG9wdGlvbiBvdmVycmlkZXMnLCBjZmdGaWxlKTtcbiAgICAgIGhhbmRsZXIubGliVHNkQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucywgY21kT3B0KTtcbiAgICB9XG4gIH0sICdjcmVhdGUtcmVhY3QtYXBwIHRzIGNvbXBpbGVyIGNvbmZpZycpKTtcblxuICBpZiAoY29uZmlnRmlsZUluUGFja2FnZSkge1xuICAgIGNvbnN0IGNmZ01nciA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFtjb25maWdGaWxlSW5QYWNrYWdlXSk7XG4gICAgY2ZnTWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLmxpYlRzZENvbXBpbGVyT3B0aW9ucyAhPSBudWxsKSB7XG4gICAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFRTRCBjb21waWxlciBvcHRpb24gb3ZlcnJpZGVzIGZyb20gJywgY2ZnRmlsZSk7XG4gICAgICAgIGhhbmRsZXIubGliVHNkQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucywgY21kT3B0KTtcbiAgICAgIH1cbiAgICB9LCAnY3JlYXRlLXJlYWN0LWFwcCB0cyBjb21waWxlciBjb25maWcnKTtcbiAgfVxuICByZXR1cm4gY29tcGlsZXJPcHRpb25zO1xufVxuIl19