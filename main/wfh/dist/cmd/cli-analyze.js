"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const operators_1 = require("rxjs/operators");
const op = __importStar(require("rxjs/operators"));
const rxjs_1 = require("rxjs");
const log4js_1 = __importDefault(require("log4js"));
const chalk_1 = __importDefault(require("chalk"));
const dist_1 = require("../../../packages/thread-promise-pool/dist");
const misc_1 = require("../utils/misc");
const store_1 = require("../store");
const package_mgr_1 = require("../package-mgr");
const misc_2 = require("../utils/misc");
const utils_1 = require("./utils");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5emUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWFuYWx5emUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsb0RBQW9EO0FBQ3BELDhDQUEwRTtBQUMxRSxtREFBcUM7QUFDckMsK0JBQTJCO0FBQzNCLG9EQUE0QjtBQUM1QixrREFBMEI7QUFDMUIscUVBQWdFO0FBQ2hFLHdDQUE2QztBQUM3QyxvQ0FBeUU7QUFDekUsZ0RBQXdDO0FBQ3hDLHdDQUFnRDtBQUNoRCxtQ0FBNEM7QUFHNUMsa0NBQWtDO0FBRWxDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sSUFBSSxHQUFHLFlBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7QUFFOUIsbUJBQXdCLFFBQWtCLEVBQUUsSUFBb0I7SUFDOUQsTUFBTSxLQUFLLEdBQ1QsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3ZCLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztZQUNyQixJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUNwQixJQUFJO1lBQ0YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBbUMsQ0FBQztTQUMzRDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsQ0FBQztTQUNU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QUN0RCxRQUFRLEVBQUUsa0JBQWtCO1FBQzVCLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUM7S0FDckUsQ0FBQyxDQUFDO0FBRUwsQ0FBQztBQTlCRCxvQ0E4QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBpZ25vcmVFbGVtZW50cywgY2F0Y2hFcnJvciwgbWFwLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHttZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtQb29sfSBmcm9tICcuLi8uLi8uLi9wYWNrYWdlcy90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QnO1xuaW1wb3J0IHtjcmVhdGVDbGlUYWJsZX0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiwgY3JlYXRlUmVkdWNlcnMgfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQge2dldFN0YXRlfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge2dldFRzY0NvbmZpZ09mUGtnfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge0NvbnRleHR9IGZyb20gJy4vY2xpLWFuYWx5c2Utd29ya2VyJztcbmltcG9ydCB7QW5hbHl6ZU9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuLy8gaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5hbmFseXNlJyk7XG5jb25zdCBjcHVzID0gb3MuY3B1cygpLmxlbmd0aDtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24ocGFja2FnZXM6IHN0cmluZ1tdLCBvcHRzOiBBbmFseXplT3B0aW9ucykge1xuICBjb25zdCBhbGlhczogW3JlZzogc3RyaW5nLCByZXBsYWNlOiBzdHJpbmddW10gPVxuICAgIG9wdHMuYWxpYXMubWFwKGl0ZW0gPT4ge1xuICAgICAgaWYgKCFpdGVtLnN0YXJ0c1dpdGgoJ1snKSlcbiAgICAgICAgaXRlbSA9ICdbJyArIGl0ZW07XG4gICAgICBpZiAoIWl0ZW0uZW5kc1dpdGgoJ10nKSlcbiAgICAgICAgaXRlbSA9IGl0ZW0gKyAnXSc7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShpdGVtKSBhcyBbcmVnOiBzdHJpbmcsIHJlcGxhY2U6IHN0cmluZ107XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcignQ2FuIG5vdCBwYXJzZSBKU09OOiAnICsgaXRlbSk7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgaWYgKG9wdHMuZmlsZSAmJiBvcHRzLmZpbGUubGVuZ3RoID4gMCkge1xuICAgIGRpc3BhdGNoZXIuYW5hbHl6ZUZpbGUoe1xuICAgICAgZmlsZXM6IG9wdHMuZmlsZSxcbiAgICAgIGFsaWFzLFxuICAgICAgdHNjb25maWc6IG9wdHMudHNjb25maWcsXG4gICAgICBpZ25vcmU6IG9wdHMueFxuICAgIH0pO1xuICB9IGVsc2UgaWYgKG9wdHMuZGlyICYmIG9wdHMuZGlyLmxlbmd0aCA+IDApIHtcbiAgICBkaXNwYXRjaGVyLmFuYWx5emVGaWxlKHtcbiAgICAgIGZpbGVzOiBvcHRzLmRpci5tYXAoZGlyID0+IGRpci5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnLyoqLyonKSxcbiAgICAgIGFsaWFzLFxuICAgICAgdHNjb25maWc6IG9wdHMudHNjb25maWcsXG4gICAgICBpZ25vcmU6IG9wdHMueFxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIC8vIGxvZy53YXJuKCdTb3JyeSwgbm90IGltcGxlbWVudGVkIHlldCwgdXNlIHdpdGggYXJndW1lbnQgXCItZlwiIGZvciBub3cuJyk7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgcGtnIG9mIGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgcGFja2FnZXMpKSB7XG4gICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgICAgbG9nLmVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBcIiR7cGFja2FnZXNbaV19XCJgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBkaXJzID0gZ2V0VHNjQ29uZmlnT2ZQa2cocGtnLmpzb24pO1xuICAgICAgY29uc3QgcGF0dGVybnMgPSBbYCR7cGtnLnJlYWxQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKX0vJHtkaXJzLnNyY0Rpcn0vKiovKmBdO1xuICAgICAgaWYgKGRpcnMuaXNvbURpcikge1xuICAgICAgICBwYXR0ZXJucy5wdXNoKGAke3BrZy5yZWFsUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyl9LyR7ZGlycy5zcmNEaXJ9LyoqLyoudHNgKTtcbiAgICAgIH1cbiAgICAgIGRpc3BhdGNoZXIuYW5hbHl6ZUZpbGUoe2ZpbGVzOiBwYXR0ZXJucywgYWxpYXMsIGlnbm9yZTogb3B0cy54fSk7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnJlc3VsdCksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3Auc2tpcCgxKSxcbiAgICBvcC50YXAoKHJlc3VsdCkgPT4ge1xuICAgICAgcHJpbnRSZXN1bHQocmVzdWx0ISwgb3B0cyk7XG4gICAgfSksXG4gICAgb3AudGFrZSgxKVxuICApLnN1YnNjcmliZSgpO1xuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludFJlc3VsdChyZXN1bHQ6IE5vbk51bGxhYmxlPEFuYWx5emVTdGF0ZVsncmVzdWx0J10+LCBvcHRzOiB7ajogQW5hbHl6ZU9wdGlvbnNbJ2onXX0pIHtcbiAgaWYgKHJlc3VsdC5jYW5Ob3RSZXNvbHZlLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgdGFibGUucHVzaChbe2NvbFNwYW46IDIsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0NhbiBub3QgcmVzb2x2ZSBkZXBlbmRlY2llcycpLCBoQWxpZ246ICdjZW50ZXInfV0pO1xuICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgbGV0IGkgPSAxO1xuICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5jYW5Ob3RSZXNvbHZlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgSlNPTi5zdHJpbmdpZnkobXNnLCBudWxsLCAnICAnKV0pO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG5cbiAgaWYgKHJlc3VsdC5jeWNsaWMubGVuZ3RoID4gMCkge1xuICAgIGxldCBpID0gMTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgdGFibGUucHVzaChbe2NvbFNwYW46IDIsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0N5Y2xpYyBkZXBlbmRlY2llcycpLCBoQWxpZ246ICdjZW50ZXInfV0pO1xuICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0LmN5Y2xpYykge1xuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnXSk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cblxuICBpZiAocmVzdWx0LmV4dGVybmFsRGVwcy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IGkgPSAxO1xuICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogMiwgY29udGVudDogY2hhbGsuYm9sZCgnRXh0ZXJuYWwgZGVwZW5kZWNpZXMnKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICBpZiAoIW9wdHMuaikge1xuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5leHRlcm5hbERlcHMpIHtcbiAgICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnXSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQubm9kZU1vZHVsZURlcHMpIHtcbiAgICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnICsgJyAoTm9kZS5qcyknXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gICAgaWYgKG9wdHMuaikge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlc3VsdC5leHRlcm5hbERlcHMsIG51bGwsICcgICcpKTtcbiAgICB9XG4gIH1cblxuICBpZiAocmVzdWx0LnJlbGF0aXZlRGVwc091dFNpZGVEaXIubGVuZ3RoID4gMCkge1xuICAgIGxldCBpID0gMTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgdGFibGUucHVzaChbe1xuICAgICAgY29sU3BhbjogMixcbiAgICAgIGNvbnRlbnQ6IGNoYWxrLmJvbGQoYERlcGVuZGVuY2llcyBvdXRzaWRlIG9mICR7cmVzdWx0LmNvbW1vbkRpcn1gKSxcbiAgICAgIGhBbGlnbjogJ2NlbnRlcidcbiAgICB9XSk7XG4gICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQucmVsYXRpdmVEZXBzT3V0U2lkZURpcikge1xuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnXSk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cblxuICBpZiAocmVzdWx0Py5tYXRjaEFsaWFzICYmIHJlc3VsdC5tYXRjaEFsaWFzLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaSA9IDE7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tcbiAgICAgIGNvbFNwYW46IDIsXG4gICAgICBjb250ZW50OiBjaGFsay5ib2xkKCdBbGlhcyByZXNvbHZlZCcpLFxuICAgICAgaEFsaWduOiAnY2VudGVyJ1xuICAgIH1dKTtcbiAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5tYXRjaEFsaWFzKSB7XG4gICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiBpKyt9LCBtc2ddKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxufVxuaW50ZXJmYWNlIEFuYWx5emVTdGF0ZSB7XG4gIGlucHV0RmlsZXM/OiBzdHJpbmdbXTtcbiAgcmVzdWx0PzogUmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+IHwgbnVsbDtcbn1cblxuY29uc3QgaW5pdFN0YXRlOiBBbmFseXplU3RhdGUgPSB7XG59O1xuXG5jb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdhbmFseXplJyxcbiAgaW5pdGlhbFN0YXRlOiBpbml0U3RhdGUsXG4gIHJlZHVjZXJzOiBjcmVhdGVSZWR1Y2Vycyh7XG4gICAgLyoqIHBheWxvYWQ6IGdsb2IgcGF0dGVybnMgKi9cbiAgICBhbmFseXplRmlsZShkOiBBbmFseXplU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgIGZpbGVzOiBzdHJpbmdbXTsgdHNjb25maWc/OiBzdHJpbmc7IGFsaWFzOiBbcGF0dGVybjogc3RyaW5nLCByZXBsYWNlOiBzdHJpbmddW107IGlnbm9yZT86IHN0cmluZztcbiAgICB9KSB7XG4gICAgICBkLmlucHV0RmlsZXMgPSBwYXlsb2FkLmZpbGVzO1xuICAgIH1cbiAgfSlcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljPHthbmFseXplOiBBbmFseXplU3RhdGV9PigoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYW5hbHl6ZUZpbGUpLFxuICAgICAgbWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4gYW5hbHlzZUZpbGVzKHBheWxvYWQuZmlsZXMsIHBheWxvYWQudHNjb25maWcsIHBheWxvYWQuYWxpYXMsIHBheWxvYWQuaWdub3JlKSksXG4gICAgICBtYXAocmVzdWx0ID0+IHtcbiAgICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gcy5yZXN1bHQgPSByZXN1bHQpOyAvLyBUT0RPIG1lcmdlIHJlc3VsdCBpbnN0ZWFkIG9mICdhc3NpZ24nIHJlc3VsdFxuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBjYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIHNyYztcbiAgICB9KSxcbiAgICBpZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYW5hbHlzZUZpbGVzKGZpbGVzOiBzdHJpbmdbXSxcbiAgdHNjb25maWdGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIGFsaWFzOiBbcGF0dGVybjogc3RyaW5nLCByZXBsYWNlOiBzdHJpbmddW10sXG4gIGlnbm9yZT86IHN0cmluZykge1xuICBjb25zdCBtYXRjaERvbmVzID0gZmlsZXMubWFwKHBhdHRlcm4gPT4gbmV3IFByb21pc2U8c3RyaW5nW10+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBnbG9iKHBhdHRlcm4sIHtub2RpcjogdHJ1ZX0sIChlcnIsIG1hdGNoZXMpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShtYXRjaGVzKTtcbiAgICB9KTtcbiAgfSkpO1xuICBmaWxlcyA9IF8uZmxhdHRlbigoYXdhaXQgUHJvbWlzZS5hbGwobWF0Y2hEb25lcykpKVxuICAuZmlsdGVyKGYgPT4gL1xcLltqdF1zeD8kLy50ZXN0KGYpKTtcblxuICBpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgbG9nLndhcm4oJ05vIHNvdXJjZSBmaWxlcyBhcmUgZm91bmQnKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCB0aHJlYWRQb29sID0gbmV3IFBvb2woY3B1cyAtIDEsIDAsIHtcbiAgICAvLyBpbml0aWFsaXplcjoge2ZpbGU6ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInfSxcbiAgICB2ZXJib3NlOiBmYWxzZVxuICB9KTtcblxuICByZXR1cm4gYXdhaXQgdGhyZWFkUG9vbC5zdWJtaXRQcm9jZXNzPFJldHVyblR5cGU8Q29udGV4dFsndG9QbGFpbk9iamVjdCddPj4oe1xuICAgIGZpbGU6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjbGktYW5hbHlzZS13b3JrZXIuanMnKSxcbiAgICBleHBvcnRGbjogJ2Rmc1RyYXZlcnNlRmlsZXMnLFxuICAgIGFyZ3M6IFtmaWxlcy5tYXAocCA9PiBQYXRoLnJlc29sdmUocCkpLCB0c2NvbmZpZ0ZpbGUsIGFsaWFzLCBpZ25vcmVdXG4gIH0pO1xuXG59XG4iXX0=