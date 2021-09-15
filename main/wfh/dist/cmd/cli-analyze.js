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
exports.analyseFiles = exports.dispatcher = exports.getStore = exports.printResult = void 0;
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const glob_1 = __importDefault(require("glob"));
const lodash_1 = __importDefault(require("lodash"));
// import { PayloadAction } from '@reduxjs/toolkit';
const store_1 = require("../store");
const operators_1 = require("rxjs/operators");
const op = __importStar(require("rxjs/operators"));
const rxjs_1 = require("rxjs");
const misc_1 = require("../utils/misc");
const log4js_1 = __importDefault(require("log4js"));
const dist_1 = require("../../../packages/thread-promise-pool/dist");
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("./utils");
const package_mgr_1 = require("../package-mgr");
const misc_2 = require("../utils/misc");
// import config from '../config';
const log = log4js_1.default.getLogger('plink.analyse');
const cpus = os_1.default.cpus().length;
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
exports.default = default_1;
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
exports.printResult = printResult;
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
exports.getStore = getStore;
exports.dispatcher = store_1.stateFactory.bindActionCreators(slice);
store_1.stateFactory.addEpic((action$, state$) => {
    return (0, rxjs_1.merge)(action$.pipe((0, store_1.ofPayloadAction)(slice.actions.analyzeFile), (0, operators_1.mergeMap)(({ payload }) => analyseFiles(payload.files, payload.tsconfig, payload.alias, payload.ignore)), (0, operators_1.map)(result => {
        exports.dispatcher._change(s => s.result = result); // TODO merge result instead of 'assign' result
    }))).pipe((0, operators_1.catchError)((err, src) => {
        console.error(err);
        return src;
    }), (0, operators_1.ignoreElements)());
});
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
        .filter(f => /\.[jt]sx?$/.test(f));
    if (files.length === 0) {
        log.warn('No source files are found');
        return null;
    }
    const threadPool = new dist_1.Pool(cpus - 1, 0, {
        // initializer: {file: 'source-map-support/register'},
        verbose: false
    });
    return await threadPool.submitProcess({
        file: path_1.default.resolve(__dirname, 'cli-analyse-worker.js'),
        exportFn: 'dfsTraverseFiles',
        args: [files.map(p => path_1.default.resolve(p)), tsconfigFile, alias, ignore]
    });
}
exports.analyseFiles = analyseFiles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5emUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWFuYWx5emUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QixvREFBb0Q7QUFDcEQsb0NBQXlFO0FBQ3pFLDhDQUEwRTtBQUMxRSxtREFBcUM7QUFDckMsK0JBQTJCO0FBRTNCLHdDQUE2QztBQUM3QyxvREFBNEI7QUFDNUIscUVBQWdFO0FBQ2hFLGtEQUEwQjtBQUMxQixtQ0FBNEM7QUFDNUMsZ0RBQXdDO0FBQ3hDLHdDQUFnRDtBQUNoRCxrQ0FBa0M7QUFFbEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUMsTUFBTSxJQUFJLEdBQUcsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUU5QixtQkFBd0IsUUFBa0IsRUFBRSxJQUFvQjtJQUM5RCxNQUFNLEtBQUssR0FDVCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDdkIsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO1lBQ3JCLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDO1FBQ3BCLElBQUk7WUFDRixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFtQyxDQUFDO1NBQzNEO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxDQUFDO1NBQ1Q7SUFD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LFFBQVEsRUFBRSxrQkFBa0I7UUFDNUIsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQztLQUNyRSxDQUFDLENBQUM7QUFFTCxDQUFDO0FBOUJELG9DQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QW5hbHl6ZU9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb24sIGNyZWF0ZVJlZHVjZXJzIH0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHsgaWdub3JlRWxlbWVudHMsIGNhdGNoRXJyb3IsIG1hcCwgbWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7bWVyZ2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtDb250ZXh0fSBmcm9tICcuL2NsaS1hbmFseXNlLXdvcmtlcic7XG5pbXBvcnQge2NyZWF0ZUNsaVRhYmxlfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnLi4vLi4vLi4vcGFja2FnZXMvdGhyZWFkLXByb21pc2UtcG9vbC9kaXN0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZX0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZ30gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG4vLyBpbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmFuYWx5c2UnKTtcbmNvbnN0IGNwdXMgPSBvcy5jcHVzKCkubGVuZ3RoO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihwYWNrYWdlczogc3RyaW5nW10sIG9wdHM6IEFuYWx5emVPcHRpb25zKSB7XG4gIGNvbnN0IGFsaWFzOiBbcmVnOiBzdHJpbmcsIHJlcGxhY2U6IHN0cmluZ11bXSA9XG4gICAgb3B0cy5hbGlhcy5tYXAoaXRlbSA9PiB7XG4gICAgICBpZiAoIWl0ZW0uc3RhcnRzV2l0aCgnWycpKVxuICAgICAgICBpdGVtID0gJ1snICsgaXRlbTtcbiAgICAgIGlmICghaXRlbS5lbmRzV2l0aCgnXScpKVxuICAgICAgICBpdGVtID0gaXRlbSArICddJztcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGl0ZW0pIGFzIFtyZWc6IHN0cmluZywgcmVwbGFjZTogc3RyaW5nXTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKCdDYW4gbm90IHBhcnNlIEpTT046ICcgKyBpdGVtKTtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICBpZiAob3B0cy5maWxlICYmIG9wdHMuZmlsZS5sZW5ndGggPiAwKSB7XG4gICAgZGlzcGF0Y2hlci5hbmFseXplRmlsZSh7XG4gICAgICBmaWxlczogb3B0cy5maWxlLFxuICAgICAgYWxpYXMsXG4gICAgICB0c2NvbmZpZzogb3B0cy50c2NvbmZpZyxcbiAgICAgIGlnbm9yZTogb3B0cy54XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAob3B0cy5kaXIgJiYgb3B0cy5kaXIubGVuZ3RoID4gMCkge1xuICAgIGRpc3BhdGNoZXIuYW5hbHl6ZUZpbGUoe1xuICAgICAgZmlsZXM6IG9wdHMuZGlyLm1hcChkaXIgPT4gZGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvKiovKicpLFxuICAgICAgYWxpYXMsXG4gICAgICB0c2NvbmZpZzogb3B0cy50c2NvbmZpZyxcbiAgICAgIGlnbm9yZTogb3B0cy54XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gbG9nLndhcm4oJ1NvcnJ5LCBub3QgaW1wbGVtZW50ZWQgeWV0LCB1c2Ugd2l0aCBhcmd1bWVudCBcIi1mXCIgZm9yIG5vdy4nKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBwYWNrYWdlcykpIHtcbiAgICAgIGlmIChwa2cgPT0gbnVsbCkge1xuICAgICAgICBsb2cuZXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lIFwiJHtwYWNrYWdlc1tpXX1cImApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRpcnMgPSBnZXRUc2NDb25maWdPZlBrZyhwa2cuanNvbik7XG4gICAgICBjb25zdCBwYXR0ZXJucyA9IFtgJHtwa2cucmVhbFBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpfS8ke2RpcnMuc3JjRGlyfS8qKi8qYF07XG4gICAgICBpZiAoZGlycy5pc29tRGlyKSB7XG4gICAgICAgIHBhdHRlcm5zLnB1c2goYCR7cGtnLnJlYWxQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKX0vJHtkaXJzLnNyY0Rpcn0vKiovKi50c2ApO1xuICAgICAgfVxuICAgICAgZGlzcGF0Y2hlci5hbmFseXplRmlsZSh7ZmlsZXM6IHBhdHRlcm5zLCBhbGlhcywgaWdub3JlOiBvcHRzLnh9KTtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMucmVzdWx0KSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5za2lwKDEpLFxuICAgIG9wLnRhcCgocmVzdWx0KSA9PiB7XG4gICAgICBwcmludFJlc3VsdChyZXN1bHQhLCBvcHRzKTtcbiAgICB9KSxcbiAgICBvcC50YWtlKDEpXG4gICkuc3Vic2NyaWJlKCk7XG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50UmVzdWx0KHJlc3VsdDogTm9uTnVsbGFibGU8QW5hbHl6ZVN0YXRlWydyZXN1bHQnXT4sIG9wdHM6IHtqOiBBbmFseXplT3B0aW9uc1snaiddfSkge1xuICBpZiAocmVzdWx0LmNhbk5vdFJlc29sdmUubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogMiwgY29udGVudDogY2hhbGsuYm9sZCgnQ2FuIG5vdCByZXNvbHZlIGRlcGVuZGVjaWVzJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICBsZXQgaSA9IDE7XG4gICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0LmNhbk5vdFJlc29sdmUpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiBpKyt9LCBKU09OLnN0cmluZ2lmeShtc2csIG51bGwsICcgICcpXSk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cblxuICBpZiAocmVzdWx0LmN5Y2xpYy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IGkgPSAxO1xuICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogMiwgY29udGVudDogY2hhbGsuYm9sZCgnQ3ljbGljIGRlcGVuZGVjaWVzJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQuY3ljbGljKSB7XG4gICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiBpKyt9LCBtc2ddKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQuZXh0ZXJuYWxEZXBzLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaSA9IDE7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAyLCBjb250ZW50OiBjaGFsay5ib2xkKCdFeHRlcm5hbCBkZXBlbmRlY2llcycpLCBoQWxpZ246ICdjZW50ZXInfV0pO1xuICAgIGlmICghb3B0cy5qKSB7XG4gICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0LmV4dGVybmFsRGVwcykge1xuICAgICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiBpKyt9LCBtc2ddKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5ub2RlTW9kdWxlRGVwcykge1xuICAgICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiBpKyt9LCBtc2cgKyAnIChOb2RlLmpzKSddKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgICBpZiAob3B0cy5qKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkocmVzdWx0LmV4dGVybmFsRGVwcywgbnVsbCwgJyAgJykpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChyZXN1bHQucmVsYXRpdmVEZXBzT3V0U2lkZURpci5sZW5ndGggPiAwKSB7XG4gICAgbGV0IGkgPSAxO1xuICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgICB0YWJsZS5wdXNoKFt7XG4gICAgICBjb2xTcGFuOiAyLFxuICAgICAgY29udGVudDogY2hhbGsuYm9sZChgRGVwZW5kZW5jaWVzIG91dHNpZGUgb2YgJHtyZXN1bHQuY29tbW9uRGlyfWApLFxuICAgICAgaEFsaWduOiAnY2VudGVyJ1xuICAgIH1dKTtcbiAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5yZWxhdGl2ZURlcHNPdXRTaWRlRGlyKSB7XG4gICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiBpKyt9LCBtc2ddKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQ/Lm1hdGNoQWxpYXMgJiYgcmVzdWx0Lm1hdGNoQWxpYXMubGVuZ3RoID4gMCkge1xuICAgIGxldCBpID0gMTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgdGFibGUucHVzaChbe1xuICAgICAgY29sU3BhbjogMixcbiAgICAgIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0FsaWFzIHJlc29sdmVkJyksXG4gICAgICBoQWxpZ246ICdjZW50ZXInXG4gICAgfV0pO1xuICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0Lm1hdGNoQWxpYXMpIHtcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZ10pO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG59XG5pbnRlcmZhY2UgQW5hbHl6ZVN0YXRlIHtcbiAgaW5wdXRGaWxlcz86IHN0cmluZ1tdO1xuICByZXN1bHQ/OiBSZXR1cm5UeXBlPENvbnRleHRbJ3RvUGxhaW5PYmplY3QnXT4gfCBudWxsO1xufVxuXG5jb25zdCBpbml0U3RhdGU6IEFuYWx5emVTdGF0ZSA9IHtcbn07XG5cbmNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2FuYWx5emUnLFxuICBpbml0aWFsU3RhdGU6IGluaXRTdGF0ZSxcbiAgcmVkdWNlcnM6IGNyZWF0ZVJlZHVjZXJzKHtcbiAgICAvKiogcGF5bG9hZDogZ2xvYiBwYXR0ZXJucyAqL1xuICAgIGFuYWx5emVGaWxlKGQ6IEFuYWx5emVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgZmlsZXM6IHN0cmluZ1tdOyB0c2NvbmZpZz86IHN0cmluZzsgYWxpYXM6IFtwYXR0ZXJuOiBzdHJpbmcsIHJlcGxhY2U6IHN0cmluZ11bXTsgaWdub3JlPzogc3RyaW5nO1xuICAgIH0pIHtcbiAgICAgIGQuaW5wdXRGaWxlcyA9IHBheWxvYWQuZmlsZXM7XG4gICAgfVxuICB9KVxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8e2FuYWx5emU6IEFuYWx5emVTdGF0ZX0+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5hbmFseXplRmlsZSksXG4gICAgICBtZXJnZU1hcCgoe3BheWxvYWR9KSA9PiBhbmFseXNlRmlsZXMocGF5bG9hZC5maWxlcywgcGF5bG9hZC50c2NvbmZpZywgcGF5bG9hZC5hbGlhcywgcGF5bG9hZC5pZ25vcmUpKSxcbiAgICAgIG1hcChyZXN1bHQgPT4ge1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzLnJlc3VsdCA9IHJlc3VsdCk7IC8vIFRPRE8gbWVyZ2UgcmVzdWx0IGluc3RlYWQgb2YgJ2Fzc2lnbicgcmVzdWx0XG4gICAgICB9KVxuICAgIClcbiAgKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pLFxuICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhbmFseXNlRmlsZXMoZmlsZXM6IHN0cmluZ1tdLFxuICB0c2NvbmZpZ0ZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgYWxpYXM6IFtwYXR0ZXJuOiBzdHJpbmcsIHJlcGxhY2U6IHN0cmluZ11bXSxcbiAgaWdub3JlPzogc3RyaW5nKSB7XG4gIGNvbnN0IG1hdGNoRG9uZXMgPSBmaWxlcy5tYXAocGF0dGVybiA9PiBuZXcgUHJvbWlzZTxzdHJpbmdbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGdsb2IocGF0dGVybiwge25vZGlyOiB0cnVlfSwgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgICByZXNvbHZlKG1hdGNoZXMpO1xuICAgIH0pO1xuICB9KSk7XG4gIGZpbGVzID0gXy5mbGF0dGVuKChhd2FpdCBQcm9taXNlLmFsbChtYXRjaERvbmVzKSkpXG4gIC5maWx0ZXIoZiA9PiAvXFwuW2p0XXN4PyQvLnRlc3QoZikpO1xuXG4gIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHtcbiAgICBsb2cud2FybignTm8gc291cmNlIGZpbGVzIGFyZSBmb3VuZCcpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHRocmVhZFBvb2wgPSBuZXcgUG9vbChjcHVzIC0gMSwgMCwge1xuICAgIC8vIGluaXRpYWxpemVyOiB7ZmlsZTogJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcid9LFxuICAgIHZlcmJvc2U6IGZhbHNlXG4gIH0pO1xuXG4gIHJldHVybiBhd2FpdCB0aHJlYWRQb29sLnN1Ym1pdFByb2Nlc3M8UmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+Pih7XG4gICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2NsaS1hbmFseXNlLXdvcmtlci5qcycpLFxuICAgIGV4cG9ydEZuOiAnZGZzVHJhdmVyc2VGaWxlcycsXG4gICAgYXJnczogW2ZpbGVzLm1hcChwID0+IFBhdGgucmVzb2x2ZShwKSksIHRzY29uZmlnRmlsZSwgYWxpYXMsIGlnbm9yZV1cbiAgfSk7XG5cbn1cbiJdfQ==