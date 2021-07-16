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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
const dist_1 = require("../../../thread-promise-pool/dist");
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("./utils");
const package_mgr_1 = require("../package-mgr");
const misc_2 = require("../utils/misc");
// import config from '../config';
const log = log4js_1.default.getLogger('plink.analyse');
const cpus = os_1.default.cpus().length;
function default_1(packages, opts) {
    const alias = opts.alias.map(item => JSON.parse(item));
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
        for (const pkg of utils_1.findPackagesByNames(package_mgr_1.getState(), packages)) {
            if (pkg == null) {
                log.error(`Can not find package for name "${packages[i]}"`);
                continue;
            }
            const dirs = misc_2.getTscConfigOfPkg(pkg.json);
            const patterns = [`${pkg.realPath.replace(/\\/g, '/')}/${dirs.srcDir}/**/*`];
            if (dirs.isomDir) {
                patterns.push(`${pkg.realPath.replace(/\\/g, '/')}/${dirs.srcDir}/**/*.ts`);
            }
            exports.dispatcher.analyzeFile({ files: patterns, alias, ignore: opts.x });
            i++;
        }
    }
    getStore().pipe(operators_1.map(s => s.result), op.distinctUntilChanged(), op.skip(1), op.tap((result) => {
        printResult(result, opts);
    }), op.take(1)).subscribe();
}
exports.default = default_1;
function printResult(result, opts) {
    if (result.canNotResolve.length > 0) {
        const table = misc_1.createCliTable({ horizontalLines: false });
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
        const table = misc_1.createCliTable({ horizontalLines: false });
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
        const table = misc_1.createCliTable({ horizontalLines: false });
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
        const table = misc_1.createCliTable({ horizontalLines: false });
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
        const table = misc_1.createCliTable({ horizontalLines: false });
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
    reducers: store_1.createReducers({
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
    return rxjs_1.merge(action$.pipe(store_1.ofPayloadAction(slice.actions.analyzeFile), operators_1.mergeMap(({ payload }) => analyseFiles(payload.files, payload.tsconfig, payload.alias, payload.ignore)), operators_1.map(result => {
        exports.dispatcher._change(s => s.result = result); // TODO merge result instead of 'assign' result
    }))).pipe(operators_1.catchError((err, src) => {
        console.error(err);
        return src;
    }), operators_1.ignoreElements());
});
function analyseFiles(files, tsconfigFile, alias, ignore) {
    return __awaiter(this, void 0, void 0, function* () {
        const matchDones = files.map(pattern => new Promise((resolve, reject) => {
            glob_1.default(pattern, { nodir: true }, (err, matches) => {
                if (err) {
                    return reject(err);
                }
                resolve(matches);
            });
        }));
        files = lodash_1.default.flatten((yield Promise.all(matchDones)))
            .filter(f => /\.[jt]sx?$/.test(f));
        const threadPool = new dist_1.Pool(cpus - 1, 0, {
            // initializer: {file: 'source-map-support/register'},
            verbose: false
        });
        // process.env.NODE_OPTIONS = '--inspect-brk';
        return yield threadPool.submitProcess({
            file: path_1.default.resolve(__dirname, 'cli-analyse-worker.js'),
            exportFn: 'dfsTraverseFiles',
            args: [files.map(p => path_1.default.resolve(p)), tsconfigFile, alias, ignore]
        });
    });
}
exports.analyseFiles = analyseFiles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5emUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWFuYWx5emUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QixvREFBb0Q7QUFDcEQsb0NBQXlFO0FBQ3pFLDhDQUEwRTtBQUMxRSxtREFBcUM7QUFDckMsK0JBQTJCO0FBRTNCLHdDQUE2QztBQUM3QyxvREFBNEI7QUFDNUIsNERBQXVEO0FBQ3ZELGtEQUEwQjtBQUMxQixtQ0FBNEM7QUFDNUMsZ0RBQXdDO0FBQ3hDLHdDQUFnRDtBQUNoRCxrQ0FBa0M7QUFFbEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUMsTUFBTSxJQUFJLEdBQUcsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUU5QixtQkFBd0IsUUFBa0IsRUFBRSxJQUFvQjtJQUM5RCxNQUFNLEtBQUssR0FDVCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFtQyxDQUFDLENBQUM7SUFFN0UsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNyQyxrQkFBVSxDQUFDLFdBQVcsQ0FBQztZQUNyQixLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDaEIsS0FBSztZQUNMLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDZixDQUFDLENBQUM7S0FDSjtTQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1B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LENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLEtBQUssR0FBRyxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2FBRWpELE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLFVBQVUsR0FBRyxJQUFJLFdBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUN2QyxzREFBc0Q7WUFDdEQsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDLENBQUM7UUFFSCw4Q0FBOEM7UUFDOUMsT0FBTyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQXVDO1lBQzFFLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQztZQUN0RCxRQUFRLEVBQUUsa0JBQWtCO1lBQzVCLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUM7U0FDckUsQ0FBQyxDQUFDO0lBRUwsQ0FBQztDQUFBO0FBM0JELG9DQTJCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QW5hbHl6ZU9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb24sIGNyZWF0ZVJlZHVjZXJzIH0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHsgaWdub3JlRWxlbWVudHMsIGNhdGNoRXJyb3IsIG1hcCwgbWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7bWVyZ2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtDb250ZXh0fSBmcm9tICcuL2NsaS1hbmFseXNlLXdvcmtlcic7XG5pbXBvcnQge2NyZWF0ZUNsaVRhYmxlfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnLi4vLi4vLi4vdGhyZWFkLXByb21pc2UtcG9vbC9kaXN0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZX0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZ30gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG4vLyBpbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmFuYWx5c2UnKTtcbmNvbnN0IGNwdXMgPSBvcy5jcHVzKCkubGVuZ3RoO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihwYWNrYWdlczogc3RyaW5nW10sIG9wdHM6IEFuYWx5emVPcHRpb25zKSB7XG4gIGNvbnN0IGFsaWFzOiBbcmVnOiBzdHJpbmcsIHJlcGxhY2U6IHN0cmluZ11bXSA9XG4gICAgb3B0cy5hbGlhcy5tYXAoaXRlbSA9PiBKU09OLnBhcnNlKGl0ZW0pIGFzIFtyZWc6IHN0cmluZywgcmVwbGFjZTogc3RyaW5nXSk7XG5cbiAgaWYgKG9wdHMuZmlsZSAmJiBvcHRzLmZpbGUubGVuZ3RoID4gMCkge1xuICAgIGRpc3BhdGNoZXIuYW5hbHl6ZUZpbGUoe1xuICAgICAgZmlsZXM6IG9wdHMuZmlsZSxcbiAgICAgIGFsaWFzLFxuICAgICAgdHNjb25maWc6IG9wdHMudHNjb25maWcsXG4gICAgICBpZ25vcmU6IG9wdHMueFxuICAgIH0pO1xuICB9IGVsc2UgaWYgKG9wdHMuZGlyICYmIG9wdHMuZGlyLmxlbmd0aCA+IDApIHtcbiAgICBkaXNwYXRjaGVyLmFuYWx5emVGaWxlKHtcbiAgICAgIGZpbGVzOiBvcHRzLmRpci5tYXAoZGlyID0+IGRpci5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnLyoqLyonKSxcbiAgICAgIGFsaWFzLFxuICAgICAgdHNjb25maWc6IG9wdHMudHNjb25maWcsXG4gICAgICBpZ25vcmU6IG9wdHMueFxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIC8vIGxvZy53YXJuKCdTb3JyeSwgbm90IGltcGxlbWVudGVkIHlldCwgdXNlIHdpdGggYXJndW1lbnQgXCItZlwiIGZvciBub3cuJyk7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgcGtnIG9mIGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgcGFja2FnZXMpKSB7XG4gICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgICAgbG9nLmVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBcIiR7cGFja2FnZXNbaV19XCJgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBkaXJzID0gZ2V0VHNjQ29uZmlnT2ZQa2cocGtnLmpzb24pO1xuICAgICAgY29uc3QgcGF0dGVybnMgPSBbYCR7cGtnLnJlYWxQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKX0vJHtkaXJzLnNyY0Rpcn0vKiovKmBdO1xuICAgICAgaWYgKGRpcnMuaXNvbURpcikge1xuICAgICAgICBwYXR0ZXJucy5wdXNoKGAke3BrZy5yZWFsUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyl9LyR7ZGlycy5zcmNEaXJ9LyoqLyoudHNgKTtcbiAgICAgIH1cbiAgICAgIGRpc3BhdGNoZXIuYW5hbHl6ZUZpbGUoe2ZpbGVzOiBwYXR0ZXJucywgYWxpYXMsIGlnbm9yZTogb3B0cy54fSk7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnJlc3VsdCksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3Auc2tpcCgxKSxcbiAgICBvcC50YXAoKHJlc3VsdCkgPT4ge1xuICAgICAgcHJpbnRSZXN1bHQocmVzdWx0ISwgb3B0cyk7XG4gICAgfSksXG4gICAgb3AudGFrZSgxKVxuICApLnN1YnNjcmliZSgpO1xuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludFJlc3VsdChyZXN1bHQ6IE5vbk51bGxhYmxlPEFuYWx5emVTdGF0ZVsncmVzdWx0J10+LCBvcHRzOiB7ajogQW5hbHl6ZU9wdGlvbnNbJ2onXX0pIHtcbiAgaWYgKHJlc3VsdC5jYW5Ob3RSZXNvbHZlLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgdGFibGUucHVzaChbe2NvbFNwYW46IDIsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0NhbiBub3QgcmVzb2x2ZSBkZXBlbmRlY2llcycpLCBoQWxpZ246ICdjZW50ZXInfV0pO1xuICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgbGV0IGkgPSAxO1xuICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5jYW5Ob3RSZXNvbHZlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgSlNPTi5zdHJpbmdpZnkobXNnLCBudWxsLCAnICAnKV0pO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG5cbiAgaWYgKHJlc3VsdC5jeWNsaWMubGVuZ3RoID4gMCkge1xuICAgIGxldCBpID0gMTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgdGFibGUucHVzaChbe2NvbFNwYW46IDIsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0N5Y2xpYyBkZXBlbmRlY2llcycpLCBoQWxpZ246ICdjZW50ZXInfV0pO1xuICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0LmN5Y2xpYykge1xuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnXSk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cblxuICBpZiAocmVzdWx0LmV4dGVybmFsRGVwcy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IGkgPSAxO1xuICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogMiwgY29udGVudDogY2hhbGsuYm9sZCgnRXh0ZXJuYWwgZGVwZW5kZWNpZXMnKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICBpZiAoIW9wdHMuaikge1xuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5leHRlcm5hbERlcHMpIHtcbiAgICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnXSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQubm9kZU1vZHVsZURlcHMpIHtcbiAgICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnICsgJyAoTm9kZS5qcyknXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gICAgaWYgKG9wdHMuaikge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlc3VsdC5leHRlcm5hbERlcHMsIG51bGwsICcgICcpKTtcbiAgICB9XG4gIH1cblxuICBpZiAocmVzdWx0LnJlbGF0aXZlRGVwc091dFNpZGVEaXIubGVuZ3RoID4gMCkge1xuICAgIGxldCBpID0gMTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgdGFibGUucHVzaChbe1xuICAgICAgY29sU3BhbjogMixcbiAgICAgIGNvbnRlbnQ6IGNoYWxrLmJvbGQoYERlcGVuZGVuY2llcyBvdXRzaWRlIG9mICR7cmVzdWx0LmNvbW1vbkRpcn1gKSxcbiAgICAgIGhBbGlnbjogJ2NlbnRlcidcbiAgICB9XSk7XG4gICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQucmVsYXRpdmVEZXBzT3V0U2lkZURpcikge1xuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnXSk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cblxuICBpZiAocmVzdWx0Py5tYXRjaEFsaWFzICYmIHJlc3VsdC5tYXRjaEFsaWFzLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaSA9IDE7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tcbiAgICAgIGNvbFNwYW46IDIsXG4gICAgICBjb250ZW50OiBjaGFsay5ib2xkKCdBbGlhcyByZXNvbHZlZCcpLFxuICAgICAgaEFsaWduOiAnY2VudGVyJ1xuICAgIH1dKTtcbiAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5tYXRjaEFsaWFzKSB7XG4gICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiBpKyt9LCBtc2ddKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxufVxuaW50ZXJmYWNlIEFuYWx5emVTdGF0ZSB7XG4gIGlucHV0RmlsZXM/OiBzdHJpbmdbXTtcbiAgcmVzdWx0PzogUmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+O1xufVxuXG5jb25zdCBpbml0U3RhdGU6IEFuYWx5emVTdGF0ZSA9IHtcbn07XG5cbmNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2FuYWx5emUnLFxuICBpbml0aWFsU3RhdGU6IGluaXRTdGF0ZSxcbiAgcmVkdWNlcnM6IGNyZWF0ZVJlZHVjZXJzKHtcbiAgICAvKiogcGF5bG9hZDogZ2xvYiBwYXR0ZXJucyAqL1xuICAgIGFuYWx5emVGaWxlKGQ6IEFuYWx5emVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgZmlsZXM6IHN0cmluZ1tdOyB0c2NvbmZpZz86IHN0cmluZzsgYWxpYXM6IFtwYXR0ZXJuOiBzdHJpbmcsIHJlcGxhY2U6IHN0cmluZ11bXTsgaWdub3JlPzogc3RyaW5nO1xuICAgIH0pIHtcbiAgICAgIGQuaW5wdXRGaWxlcyA9IHBheWxvYWQuZmlsZXM7XG4gICAgfVxuICB9KVxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8e2FuYWx5emU6IEFuYWx5emVTdGF0ZX0+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5hbmFseXplRmlsZSksXG4gICAgICBtZXJnZU1hcCgoe3BheWxvYWR9KSA9PiBhbmFseXNlRmlsZXMocGF5bG9hZC5maWxlcywgcGF5bG9hZC50c2NvbmZpZywgcGF5bG9hZC5hbGlhcywgcGF5bG9hZC5pZ25vcmUpKSxcbiAgICAgIG1hcChyZXN1bHQgPT4ge1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzLnJlc3VsdCA9IHJlc3VsdCk7IC8vIFRPRE8gbWVyZ2UgcmVzdWx0IGluc3RlYWQgb2YgJ2Fzc2lnbicgcmVzdWx0XG4gICAgICB9KVxuICAgIClcbiAgKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pLFxuICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhbmFseXNlRmlsZXMoZmlsZXM6IHN0cmluZ1tdLFxuICB0c2NvbmZpZ0ZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgYWxpYXM6IFtwYXR0ZXJuOiBzdHJpbmcsIHJlcGxhY2U6IHN0cmluZ11bXSxcbiAgaWdub3JlPzogc3RyaW5nKSB7XG4gIGNvbnN0IG1hdGNoRG9uZXMgPSBmaWxlcy5tYXAocGF0dGVybiA9PiBuZXcgUHJvbWlzZTxzdHJpbmdbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGdsb2IocGF0dGVybiwge25vZGlyOiB0cnVlfSwgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgICByZXNvbHZlKG1hdGNoZXMpO1xuICAgIH0pO1xuICB9KSk7XG4gIGZpbGVzID0gXy5mbGF0dGVuKChhd2FpdCBQcm9taXNlLmFsbChtYXRjaERvbmVzKSkpXG5cbiAgLmZpbHRlcihmID0+IC9cXC5banRdc3g/JC8udGVzdChmKSk7XG4gIGNvbnN0IHRocmVhZFBvb2wgPSBuZXcgUG9vbChjcHVzIC0gMSwgMCwge1xuICAgIC8vIGluaXRpYWxpemVyOiB7ZmlsZTogJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcid9LFxuICAgIHZlcmJvc2U6IGZhbHNlXG4gIH0pO1xuXG4gIC8vIHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA9ICctLWluc3BlY3QtYnJrJztcbiAgcmV0dXJuIGF3YWl0IHRocmVhZFBvb2wuc3VibWl0UHJvY2VzczxSZXR1cm5UeXBlPENvbnRleHRbJ3RvUGxhaW5PYmplY3QnXT4+KHtcbiAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnY2xpLWFuYWx5c2Utd29ya2VyLmpzJyksXG4gICAgZXhwb3J0Rm46ICdkZnNUcmF2ZXJzZUZpbGVzJyxcbiAgICBhcmdzOiBbZmlsZXMubWFwKHAgPT4gUGF0aC5yZXNvbHZlKHApKSwgdHNjb25maWdGaWxlLCBhbGlhcywgaWdub3JlXVxuICB9KTtcblxufVxuIl19