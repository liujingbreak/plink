"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatcher = void 0;
exports.default = default_1;
exports.printResult = printResult;
exports.getStore = getStore;
exports.analyseFiles = analyseFiles;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const glob_1 = tslib_1.__importDefault(require("glob"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
// import { PayloadAction } from '@reduxjs/toolkit';
const operators_1 = require("rxjs/operators");
const op = tslib_1.__importStar(require("rxjs/operators"));
const rxjs_1 = require("rxjs");
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const misc_1 = require("../utils/misc");
const store_1 = require("../store");
const package_mgr_1 = require("../package-mgr");
const misc_2 = require("../utils/misc");
const utils_1 = require("./utils");
const cli_analyse_main_1 = tslib_1.__importDefault(require("./cli-analyse-main"));
const log = log4js_1.default.getLogger('plink.analyse');
function default_1(packages, opts) {
    const alias = opts.alias.map(item => {
        if (!item.startsWith('['))
            item = '[' + item;
        if (!item.endsWith(']'))
            item = item + ']';
        try {
            return JSON.parse(item);
        }
        catch (e) {
            log.error('Can not parse JSON: ' + item);
            throw e;
        }
    });
    if (opts.file && opts.file.length > 0) {
        exports.dispatcher.analyzeFile({
            files: opts.file,
            alias,
            tsconfig: opts.tsconfig,
            ignore: opts.x
        });
    }
    else if (opts.dir && opts.dir.length > 0) {
        exports.dispatcher.analyzeFile({
            files: opts.dir.map(dir => dir.replace(/\\/g, '/') + '/**/*'),
            alias,
            tsconfig: opts.tsconfig,
            ignore: opts.x
        });
    }
    else {
        // log.warn('Sorry, not implemented yet, use with argument "-f" for now.');
        let i = 0;
        for (const pkg of (0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), packages)) {
            if (pkg == null) {
                log.error(`Can not find package for name "${packages[i]}"`);
                continue;
            }
            const dirs = (0, misc_2.getTscConfigOfPkg)(pkg.json);
            const patterns = [`${pkg.realPath.replace(/\\/g, '/')}/${dirs.srcDir}/**/*`];
            if (dirs.isomDir) {
                patterns.push(`${pkg.realPath.replace(/\\/g, '/')}/${dirs.srcDir}/**/*.ts`);
            }
            exports.dispatcher.analyzeFile({ files: patterns, alias, ignore: opts.x });
            i++;
        }
    }
    getStore().pipe((0, operators_1.map)(s => s.result), op.distinctUntilChanged(), op.skip(1), op.tap((result) => {
        printResult(result, opts);
    }), op.take(1)).subscribe();
}
function printResult(result, opts) {
    if (result.canNotResolve.length > 0) {
        const table = (0, misc_1.createCliTable)({ horizontalLines: false });
        table.push([{ colSpan: 2, content: chalk_1.default.bold('Can not resolve dependecies'), hAlign: 'center' }]);
        table.push([{ hAlign: 'right', content: '--' }, '--------']);
        let i = 1;
        for (const msg of result.canNotResolve) {
            // eslint-disable-next-line no-console
            table.push([{ hAlign: 'right', content: i++ }, JSON.stringify(msg, null, '  ')]);
        }
        // eslint-disable-next-line no-console
        console.log(table.toString());
    }
    if (result.cyclic.length > 0) {
        let i = 1;
        const table = (0, misc_1.createCliTable)({ horizontalLines: false });
        table.push([{ colSpan: 2, content: chalk_1.default.bold('Cyclic dependecies'), hAlign: 'center' }]);
        table.push([{ hAlign: 'right', content: '--' }, '--------']);
        for (const msg of result.cyclic) {
            table.push([{ hAlign: 'right', content: i++ }, msg]);
        }
        // eslint-disable-next-line no-console
        console.log(table.toString());
    }
    if (result.externalDeps.length > 0) {
        let i = 1;
        const table = (0, misc_1.createCliTable)({ horizontalLines: false });
        table.push([{ colSpan: 2, content: chalk_1.default.bold('External dependecies'), hAlign: 'center' }]);
        if (!opts.j) {
            table.push([{ hAlign: 'right', content: '--' }, '--------']);
            for (const msg of result.externalDeps) {
                table.push([{ hAlign: 'right', content: i++ }, msg]);
            }
            for (const msg of result.nodeModuleDeps) {
                table.push([{ hAlign: 'right', content: i++ }, msg + ' (Node.js)']);
            }
        }
        // eslint-disable-next-line no-console
        console.log(table.toString());
        if (opts.j) {
            // eslint-disable-next-line no-console
            console.log(JSON.stringify(result.externalDeps, null, '  '));
        }
    }
    if (result.relativeDepsOutSideDir.length > 0) {
        let i = 1;
        const table = (0, misc_1.createCliTable)({ horizontalLines: false });
        table.push([{
                colSpan: 2,
                content: chalk_1.default.bold(`Dependencies outside of ${result.commonDir}`),
                hAlign: 'center'
            }]);
        table.push([{ hAlign: 'right', content: '--' }, '--------']);
        for (const msg of result.relativeDepsOutSideDir) {
            table.push([{ hAlign: 'right', content: i++ }, msg]);
        }
        // eslint-disable-next-line no-console
        console.log(table.toString());
    }
    if ((result === null || result === void 0 ? void 0 : result.matchAlias) && result.matchAlias.length > 0) {
        let i = 1;
        const table = (0, misc_1.createCliTable)({ horizontalLines: false });
        table.push([{
                colSpan: 2,
                content: chalk_1.default.bold('Alias resolved'),
                hAlign: 'center'
            }]);
        table.push([{ hAlign: 'right', content: '--' }, '--------']);
        for (const msg of result.matchAlias) {
            table.push([{ hAlign: 'right', content: i++ }, msg]);
        }
        // eslint-disable-next-line no-console
        console.log(table.toString());
    }
}
const initState = {};
const slice = store_1.stateFactory.newSlice({
    name: 'analyze',
    initialState: initState,
    reducers: (0, store_1.createReducers)({
        /** payload: glob patterns */
        analyzeFile(d, payload) {
            d.inputFiles = payload.files;
        }
    })
});
function getStore() {
    return store_1.stateFactory.sliceStore(slice);
}
exports.dispatcher = store_1.stateFactory.bindActionCreators(slice);
store_1.stateFactory.addEpic((action$, state$) => {
    return (0, rxjs_1.merge)(action$.pipe((0, store_1.ofPayloadAction)(slice.actions.analyzeFile), (0, operators_1.mergeMap)(({ payload }) => analyseFiles(payload.files, payload.tsconfig, payload.alias, payload.ignore)), (0, operators_1.map)(result => {
        exports.dispatcher._change(s => s.result = result); // TODO merge result instead of 'assign' result
    }))).pipe((0, operators_1.catchError)((err, src) => {
        console.error(err);
        return src;
    }), (0, operators_1.ignoreElements)());
});
const mainWorker = (0, cli_analyse_main_1.default)();
async function analyseFiles(files, tsconfigFile, alias, ignore) {
    const matchDones = files.map(pattern => new Promise((resolve, reject) => {
        (0, glob_1.default)(pattern, { nodir: true }, (err, matches) => {
            if (err) {
                return reject(err);
            }
            resolve(matches);
        });
    }));
    files = lodash_1.default.flatten((await Promise.all(matchDones)))
        .filter(f => /\.[mc]?[jt]sx?$/.test(f));
    if (files.length === 0) {
        log.warn('No source files are found');
        return null;
    }
    const [, result] = await (0, rxjs_1.firstValueFrom)(mainWorker.s.ft.forkDfsTraverseFiles(files.map(p => path_1.default.resolve(p)), tsconfigFile, alias, ignore).do(mainWorker.s.pt.doneDfsTraverseFiles));
    return result;
}
//# sourceMappingURL=cli-analyze.js.map