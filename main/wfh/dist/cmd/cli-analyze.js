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
function analyseFiles(files, tsconfigFile, alias, ignore) {
    return __awaiter(this, void 0, void 0, function* () {
        const matchDones = files.map(pattern => new Promise((resolve, reject) => {
            (0, glob_1.default)(pattern, { nodir: true }, (err, matches) => {
                if (err) {
                    return reject(err);
                }
                resolve(matches);
            });
        }));
        files = lodash_1.default.flatten((yield Promise.all(matchDones)))
            .filter(f => /\.[jt]sx?$/.test(f));
        if (files.length === 0) {
            log.warn('No source files are found');
            return null;
        }
        const threadPool = new dist_1.Pool(cpus - 1, 0, {
            // initializer: {file: 'source-map-support/register'},
            verbose: false
        });
        return yield threadPool.submitProcess({
            file: path_1.default.resolve(__dirname, 'cli-analyse-worker.js'),
            exportFn: 'dfsTraverseFiles',
            args: [files.map(p => path_1.default.resolve(p)), tsconfigFile, alias, ignore]
        });
    });
}
exports.analyseFiles = analyseFiles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5emUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWFuYWx5emUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QixvREFBb0Q7QUFDcEQsb0NBQXlFO0FBQ3pFLDhDQUEwRTtBQUMxRSxtREFBcUM7QUFDckMsK0JBQTJCO0FBRTNCLHdDQUE2QztBQUM3QyxvREFBNEI7QUFDNUIscUVBQWdFO0FBQ2hFLGtEQUEwQjtBQUMxQixtQ0FBNEM7QUFDNUMsZ0RBQXdDO0FBQ3hDLHdDQUFnRDtBQUNoRCxrQ0FBa0M7QUFFbEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUMsTUFBTSxJQUFJLEdBQUcsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUU5QixtQkFBd0IsUUFBa0IsRUFBRSxJQUFvQjtJQUM5RCxNQUFNLEtBQUssR0FDVCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDdkIsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO1lBQ3JCLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDO1FBQ3BCLElBQUk7WUFDRixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFtQyxDQUFDO1NBQzNEO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxDQUFD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QUFDO1lBQ3RELFFBQVEsRUFBRSxrQkFBa0I7WUFDNUIsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQztTQUNyRSxDQUFDLENBQUM7SUFFTCxDQUFDO0NBQUE7QUE5QkQsb0NBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBbmFseXplT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiwgY3JlYXRlUmVkdWNlcnMgfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgeyBpZ25vcmVFbGVtZW50cywgY2F0Y2hFcnJvciwgbWFwLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHttZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge0NvbnRleHR9IGZyb20gJy4vY2xpLWFuYWx5c2Utd29ya2VyJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGV9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtQb29sfSBmcm9tICcuLi8uLi8uLi9wYWNrYWdlcy90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2dldFN0YXRlfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge2dldFRzY0NvbmZpZ09mUGtnfSBmcm9tICcuLi91dGlscy9taXNjJztcbi8vIGltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuYW5hbHlzZScpO1xuY29uc3QgY3B1cyA9IG9zLmNwdXMoKS5sZW5ndGg7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHBhY2thZ2VzOiBzdHJpbmdbXSwgb3B0czogQW5hbHl6ZU9wdGlvbnMpIHtcbiAgY29uc3QgYWxpYXM6IFtyZWc6IHN0cmluZywgcmVwbGFjZTogc3RyaW5nXVtdID1cbiAgICBvcHRzLmFsaWFzLm1hcChpdGVtID0+IHtcbiAgICAgIGlmICghaXRlbS5zdGFydHNXaXRoKCdbJykpXG4gICAgICAgIGl0ZW0gPSAnWycgKyBpdGVtO1xuICAgICAgaWYgKCFpdGVtLmVuZHNXaXRoKCddJykpXG4gICAgICAgIGl0ZW0gPSBpdGVtICsgJ10nO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoaXRlbSkgYXMgW3JlZzogc3RyaW5nLCByZXBsYWNlOiBzdHJpbmddO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoJ0NhbiBub3QgcGFyc2UgSlNPTjogJyArIGl0ZW0pO1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIGlmIChvcHRzLmZpbGUgJiYgb3B0cy5maWxlLmxlbmd0aCA+IDApIHtcbiAgICBkaXNwYXRjaGVyLmFuYWx5emVGaWxlKHtcbiAgICAgIGZpbGVzOiBvcHRzLmZpbGUsXG4gICAgICBhbGlhcyxcbiAgICAgIHRzY29uZmlnOiBvcHRzLnRzY29uZmlnLFxuICAgICAgaWdub3JlOiBvcHRzLnhcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChvcHRzLmRpciAmJiBvcHRzLmRpci5sZW5ndGggPiAwKSB7XG4gICAgZGlzcGF0Y2hlci5hbmFseXplRmlsZSh7XG4gICAgICBmaWxlczogb3B0cy5kaXIubWFwKGRpciA9PiBkaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8qKi8qJyksXG4gICAgICBhbGlhcyxcbiAgICAgIHRzY29uZmlnOiBvcHRzLnRzY29uZmlnLFxuICAgICAgaWdub3JlOiBvcHRzLnhcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBsb2cud2FybignU29ycnksIG5vdCBpbXBsZW1lbnRlZCB5ZXQsIHVzZSB3aXRoIGFyZ3VtZW50IFwiLWZcIiBmb3Igbm93LicpO1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIHBhY2thZ2VzKSkge1xuICAgICAgaWYgKHBrZyA9PSBudWxsKSB7XG4gICAgICAgIGxvZy5lcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgZm9yIG5hbWUgXCIke3BhY2thZ2VzW2ldfVwiYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGlycyA9IGdldFRzY0NvbmZpZ09mUGtnKHBrZy5qc29uKTtcbiAgICAgIGNvbnN0IHBhdHRlcm5zID0gW2Ake3BrZy5yZWFsUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyl9LyR7ZGlycy5zcmNEaXJ9LyoqLypgXTtcbiAgICAgIGlmIChkaXJzLmlzb21EaXIpIHtcbiAgICAgICAgcGF0dGVybnMucHVzaChgJHtwa2cucmVhbFBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpfS8ke2RpcnMuc3JjRGlyfS8qKi8qLnRzYCk7XG4gICAgICB9XG4gICAgICBkaXNwYXRjaGVyLmFuYWx5emVGaWxlKHtmaWxlczogcGF0dGVybnMsIGFsaWFzLCBpZ25vcmU6IG9wdHMueH0pO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5yZXN1bHQpLCBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLnNraXAoMSksXG4gICAgb3AudGFwKChyZXN1bHQpID0+IHtcbiAgICAgIHByaW50UmVzdWx0KHJlc3VsdCEsIG9wdHMpO1xuICAgIH0pLFxuICAgIG9wLnRha2UoMSlcbiAgKS5zdWJzY3JpYmUoKTtcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRSZXN1bHQocmVzdWx0OiBOb25OdWxsYWJsZTxBbmFseXplU3RhdGVbJ3Jlc3VsdCddPiwgb3B0czoge2o6IEFuYWx5emVPcHRpb25zWydqJ119KSB7XG4gIGlmIChyZXN1bHQuY2FuTm90UmVzb2x2ZS5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAyLCBjb250ZW50OiBjaGFsay5ib2xkKCdDYW4gbm90IHJlc29sdmUgZGVwZW5kZWNpZXMnKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgIGxldCBpID0gMTtcbiAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQuY2FuTm90UmVzb2x2ZSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIEpTT04uc3RyaW5naWZ5KG1zZywgbnVsbCwgJyAgJyldKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQuY3ljbGljLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaSA9IDE7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAyLCBjb250ZW50OiBjaGFsay5ib2xkKCdDeWNsaWMgZGVwZW5kZWNpZXMnKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5jeWNsaWMpIHtcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZ10pO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG5cbiAgaWYgKHJlc3VsdC5leHRlcm5hbERlcHMubGVuZ3RoID4gMCkge1xuICAgIGxldCBpID0gMTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgdGFibGUucHVzaChbe2NvbFNwYW46IDIsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0V4dGVybmFsIGRlcGVuZGVjaWVzJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gICAgaWYgKCFvcHRzLmopIHtcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQuZXh0ZXJuYWxEZXBzKSB7XG4gICAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZ10pO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0Lm5vZGVNb2R1bGVEZXBzKSB7XG4gICAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZyArICcgKE5vZGUuanMpJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICAgIGlmIChvcHRzLmopIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShyZXN1bHQuZXh0ZXJuYWxEZXBzLCBudWxsLCAnICAnKSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHJlc3VsdC5yZWxhdGl2ZURlcHNPdXRTaWRlRGlyLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaSA9IDE7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tcbiAgICAgIGNvbFNwYW46IDIsXG4gICAgICBjb250ZW50OiBjaGFsay5ib2xkKGBEZXBlbmRlbmNpZXMgb3V0c2lkZSBvZiAke3Jlc3VsdC5jb21tb25EaXJ9YCksXG4gICAgICBoQWxpZ246ICdjZW50ZXInXG4gICAgfV0pO1xuICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0LnJlbGF0aXZlRGVwc091dFNpZGVEaXIpIHtcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZ10pO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG5cbiAgaWYgKHJlc3VsdD8ubWF0Y2hBbGlhcyAmJiByZXN1bHQubWF0Y2hBbGlhcy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IGkgPSAxO1xuICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgICB0YWJsZS5wdXNoKFt7XG4gICAgICBjb2xTcGFuOiAyLFxuICAgICAgY29udGVudDogY2hhbGsuYm9sZCgnQWxpYXMgcmVzb2x2ZWQnKSxcbiAgICAgIGhBbGlnbjogJ2NlbnRlcidcbiAgICB9XSk7XG4gICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQubWF0Y2hBbGlhcykge1xuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnXSk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cbn1cbmludGVyZmFjZSBBbmFseXplU3RhdGUge1xuICBpbnB1dEZpbGVzPzogc3RyaW5nW107XG4gIHJlc3VsdD86IFJldHVyblR5cGU8Q29udGV4dFsndG9QbGFpbk9iamVjdCddPiB8IG51bGw7XG59XG5cbmNvbnN0IGluaXRTdGF0ZTogQW5hbHl6ZVN0YXRlID0ge1xufTtcblxuY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnYW5hbHl6ZScsXG4gIGluaXRpYWxTdGF0ZTogaW5pdFN0YXRlLFxuICByZWR1Y2VyczogY3JlYXRlUmVkdWNlcnMoe1xuICAgIC8qKiBwYXlsb2FkOiBnbG9iIHBhdHRlcm5zICovXG4gICAgYW5hbHl6ZUZpbGUoZDogQW5hbHl6ZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICBmaWxlczogc3RyaW5nW107IHRzY29uZmlnPzogc3RyaW5nOyBhbGlhczogW3BhdHRlcm46IHN0cmluZywgcmVwbGFjZTogc3RyaW5nXVtdOyBpZ25vcmU/OiBzdHJpbmc7XG4gICAgfSkge1xuICAgICAgZC5pbnB1dEZpbGVzID0gcGF5bG9hZC5maWxlcztcbiAgICB9XG4gIH0pXG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx7YW5hbHl6ZTogQW5hbHl6ZVN0YXRlfT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICByZXR1cm4gbWVyZ2UoXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmFuYWx5emVGaWxlKSxcbiAgICAgIG1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IGFuYWx5c2VGaWxlcyhwYXlsb2FkLmZpbGVzLCBwYXlsb2FkLnRzY29uZmlnLCBwYXlsb2FkLmFsaWFzLCBwYXlsb2FkLmlnbm9yZSkpLFxuICAgICAgbWFwKHJlc3VsdCA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHMucmVzdWx0ID0gcmVzdWx0KTsgLy8gVE9ETyBtZXJnZSByZXN1bHQgaW5zdGVhZCBvZiAnYXNzaWduJyByZXN1bHRcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIHJldHVybiBzcmM7XG4gICAgfSksXG4gICAgaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFuYWx5c2VGaWxlcyhmaWxlczogc3RyaW5nW10sXG4gIHRzY29uZmlnRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBhbGlhczogW3BhdHRlcm46IHN0cmluZywgcmVwbGFjZTogc3RyaW5nXVtdLFxuICBpZ25vcmU/OiBzdHJpbmcpIHtcbiAgY29uc3QgbWF0Y2hEb25lcyA9IGZpbGVzLm1hcChwYXR0ZXJuID0+IG5ldyBQcm9taXNlPHN0cmluZ1tdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZ2xvYihwYXR0ZXJuLCB7bm9kaXI6IHRydWV9LCAoZXJyLCBtYXRjaGVzKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUobWF0Y2hlcyk7XG4gICAgfSk7XG4gIH0pKTtcbiAgZmlsZXMgPSBfLmZsYXR0ZW4oKGF3YWl0IFByb21pc2UuYWxsKG1hdGNoRG9uZXMpKSlcbiAgLmZpbHRlcihmID0+IC9cXC5banRdc3g/JC8udGVzdChmKSk7XG5cbiAgaWYgKGZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgIGxvZy53YXJuKCdObyBzb3VyY2UgZmlsZXMgYXJlIGZvdW5kJyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgdGhyZWFkUG9vbCA9IG5ldyBQb29sKGNwdXMgLSAxLCAwLCB7XG4gICAgLy8gaW5pdGlhbGl6ZXI6IHtmaWxlOiAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJ30sXG4gICAgdmVyYm9zZTogZmFsc2VcbiAgfSk7XG5cbiAgcmV0dXJuIGF3YWl0IHRocmVhZFBvb2wuc3VibWl0UHJvY2VzczxSZXR1cm5UeXBlPENvbnRleHRbJ3RvUGxhaW5PYmplY3QnXT4+KHtcbiAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnY2xpLWFuYWx5c2Utd29ya2VyLmpzJyksXG4gICAgZXhwb3J0Rm46ICdkZnNUcmF2ZXJzZUZpbGVzJyxcbiAgICBhcmdzOiBbZmlsZXMubWFwKHAgPT4gUGF0aC5yZXNvbHZlKHApKSwgdHNjb25maWdGaWxlLCBhbGlhcywgaWdub3JlXVxuICB9KTtcblxufVxuIl19