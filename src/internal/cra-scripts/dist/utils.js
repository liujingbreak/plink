"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cliLineWrapByWidth = exports.createCliPrinter = exports.runTsConfigHandlers4LibTsd = exports.runTsConfigHandlers = exports.craVersionCheck = exports.saveCmdOptionsToEnv = exports.getCmdOptions = exports.printConfig = exports.drawPuppy = exports.getReportDir = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
const util_1 = tslib_1.__importStar(require("util"));
const path_1 = tslib_1.__importDefault(require("path"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
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
function getCmdOptions() {
    const cmdOption = JSON.parse(process.env.REACT_APP_cra_build);
    if (cmdOption.devMode || cmdOption.watch) {
        process.env.NODE_ENV = 'development';
    }
    return cmdOption;
}
exports.getCmdOptions = getCmdOptions;
function saveCmdOptionsToEnv(cmdName, opts, buildType, entries) {
    const cmdOptions = {
        cmd: cmdName,
        buildType,
        buildTargets: entries,
        watch: opts.watch,
        refDllManifest: opts.refDll ? opts.refDll.map(item => path_1.default.isAbsolute(item) ? item : plink_1.config.resolve('destDir', item)) : undefined,
        devMode: !!opts.dev,
        publicUrl: opts.publicUrl,
        // external: opts.external,
        includes: opts.include,
        webpackEnv: opts.dev ? 'development' : 'production',
        usePoll: opts.poll,
        tsck: opts.tsck
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
function createCliPrinter(msgPrefix) {
    const flushed$ = new rx.Subject();
    const progressMsg$ = new rx.Subject();
    const [cols, rows] = process.stdout.getWindowSize();
    let linesOfLastMsg = 0;
    rx.combineLatest(import('string-width'), progressMsg$)
        .pipe(op.concatMap(([{ default: strWidth }, msg]) => {
        const textLines = cliLineWrapByWidth(util_1.default.format(msgPrefix, ...msg), cols, strWidth);
        const clearLinesDone = [];
        if (linesOfLastMsg > textLines.length) {
            const numOfRowsToClear = linesOfLastMsg - textLines.length;
            const rowIdx = rows - linesOfLastMsg;
            for (let i = 0; i < numOfRowsToClear; i++) {
                clearLinesDone.push(new Promise(resolve => process.stdout.cursorTo(0, i + rowIdx, resolve)), new Promise(resolve => process.stdout.clearLine(0, resolve)));
            }
        }
        linesOfLastMsg = textLines.length;
        return rx.merge(...clearLinesDone, ...textLines.map((text, lineIdx) => Promise.all([
            new Promise(resolve => process.stdout.cursorTo(0, rows - textLines.length + lineIdx, resolve)),
            new Promise(resolve => process.stdout.write(text, (_err) => resolve())),
            new Promise(resolve => process.stdout.clearLine(1, resolve))
        ])));
    }), op.map(() => flushed$.next())).subscribe();
    return (...s) => {
        const flushed = flushed$.pipe(op.take(1)).toPromise();
        progressMsg$.next(s);
        return flushed;
    };
}
exports.createCliPrinter = createCliPrinter;
function cliLineWrapByWidth(str, columns, calStrWidth) {
    return str.split(/\n\r?/).reduce((lines, line) => {
        lines.push(...cliLineWrap(line, columns, calStrWidth));
        return lines;
    }, []);
}
exports.cliLineWrapByWidth = cliLineWrapByWidth;
function cliLineWrap(str, columns, calStrWidth) {
    const lines = [];
    let offset = 0;
    let lastWidthData;
    while (offset < str.length) {
        // look for closest end position
        const end = findClosestEnd(str.slice(offset), columns) + 1;
        const lineEnd = offset + end;
        lines.push(str.slice(offset, lineEnd));
        offset = lineEnd;
    }
    function findClosestEnd(str, target) {
        let low = 0, high = str.length;
        while (high > low) {
            const mid = low + ((high - low) >> 1);
            const len = quickWidth(str, mid + 1);
            // console.log('binary range', str, 'low', low, 'high', high, 'mid', mid, 'len', len);
            if (target < len) {
                high = mid;
            }
            else if (len < target) {
                low = mid + 1;
            }
            else {
                return mid;
            }
        }
        // console.log('binary result', high);
        // Normal binary search should return "hight", because it returns the non-existing index for insertion,
        // but we are looking for an existing index number of whose value (ranking) is smaller than or equal to "target",
        // so "minus 1" is needed here
        return high - 1;
    }
    /**
     * @param end - excluded, same as parameter "end" in string.prototype.slice(start, end)
     */
    function quickWidth(str, end) {
        if (lastWidthData && lastWidthData[0] === str) {
            const lastEnd = lastWidthData[1];
            if (end > lastEnd) {
                lastWidthData[2] = lastWidthData[2] + calStrWidth(str.slice(lastEnd, end));
                lastWidthData[1] = end;
            }
            else if (end < lastEnd) {
                lastWidthData[2] = lastWidthData[2] - calStrWidth(str.slice(end, lastEnd));
                lastWidthData[1] = end;
            }
            return lastWidthData[2];
        }
        return calStrWidth(str.slice(0, end));
    }
    return lines;
}
//# sourceMappingURL=utils.js.map