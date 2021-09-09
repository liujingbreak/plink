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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5emUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWFuYWx5emUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QixvREFBb0Q7QUFDcEQsb0NBQXlFO0FBQ3pFLDhDQUEwRTtBQUMxRSxtREFBcUM7QUFDckMsK0JBQTJCO0FBRTNCLHdDQUE2QztBQUM3QyxvREFBNEI7QUFDNUIscUVBQWdFO0FBQ2hFLGtEQUEwQjtBQUMxQixtQ0FBNEM7QUFDNUMsZ0RBQXdDO0FBQ3hDLHdDQUFnRDtBQUNoRCxrQ0FBa0M7QUFFbEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUMsTUFBTSxJQUFJLEdBQUcsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUU5QixtQkFBd0IsUUFBa0IsRUFBRSxJQUFvQjtJQUM5RCxNQUFNLEtBQUssR0FDVCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFtQyxDQUFDLENBQUM7SUFFN0UsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNyQyxrQkFBVSxDQUFDLFdBQVcsQ0FBQztZQUNyQixLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDaEIsS0FBSztZQUNMLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDZixDQUFDLENBQUM7S0FDSjtTQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1B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LEVBQUU7b0JBQ1AsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ3BCO2dCQUNELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixLQUFLLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzthQUVqRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxXQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdkMsc0RBQXNEO1lBQ3RELE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzlDLE9BQU8sTUFBTSxVQUFVLENBQUMsYUFBYSxDQUF1QztZQUMxRSxJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUM7WUFDdEQsUUFBUSxFQUFFLGtCQUFrQjtZQUM1QixJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDO1NBQ3JFLENBQUMsQ0FBQztJQUVMLENBQUM7Q0FBQTtBQTNCRCxvQ0EyQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FuYWx5emVPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IHN0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9uLCBjcmVhdGVSZWR1Y2VycyB9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IGlnbm9yZUVsZW1lbnRzLCBjYXRjaEVycm9yLCBtYXAsIG1lcmdlTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge21lcmdlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Q29udGV4dH0gZnJvbSAnLi9jbGktYW5hbHlzZS13b3JrZXInO1xuaW1wb3J0IHtjcmVhdGVDbGlUYWJsZX0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge1Bvb2x9IGZyb20gJy4uLy4uLy4uL3BhY2thZ2VzL3RocmVhZC1wcm9taXNlLXBvb2wvZGlzdCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7Z2V0U3RhdGV9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2d9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5hbmFseXNlJyk7XG5jb25zdCBjcHVzID0gb3MuY3B1cygpLmxlbmd0aDtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24ocGFja2FnZXM6IHN0cmluZ1tdLCBvcHRzOiBBbmFseXplT3B0aW9ucykge1xuICBjb25zdCBhbGlhczogW3JlZzogc3RyaW5nLCByZXBsYWNlOiBzdHJpbmddW10gPVxuICAgIG9wdHMuYWxpYXMubWFwKGl0ZW0gPT4gSlNPTi5wYXJzZShpdGVtKSBhcyBbcmVnOiBzdHJpbmcsIHJlcGxhY2U6IHN0cmluZ10pO1xuXG4gIGlmIChvcHRzLmZpbGUgJiYgb3B0cy5maWxlLmxlbmd0aCA+IDApIHtcbiAgICBkaXNwYXRjaGVyLmFuYWx5emVGaWxlKHtcbiAgICAgIGZpbGVzOiBvcHRzLmZpbGUsXG4gICAgICBhbGlhcyxcbiAgICAgIHRzY29uZmlnOiBvcHRzLnRzY29uZmlnLFxuICAgICAgaWdub3JlOiBvcHRzLnhcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChvcHRzLmRpciAmJiBvcHRzLmRpci5sZW5ndGggPiAwKSB7XG4gICAgZGlzcGF0Y2hlci5hbmFseXplRmlsZSh7XG4gICAgICBmaWxlczogb3B0cy5kaXIubWFwKGRpciA9PiBkaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8qKi8qJyksXG4gICAgICBhbGlhcyxcbiAgICAgIHRzY29uZmlnOiBvcHRzLnRzY29uZmlnLFxuICAgICAgaWdub3JlOiBvcHRzLnhcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBsb2cud2FybignU29ycnksIG5vdCBpbXBsZW1lbnRlZCB5ZXQsIHVzZSB3aXRoIGFyZ3VtZW50IFwiLWZcIiBmb3Igbm93LicpO1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIHBhY2thZ2VzKSkge1xuICAgICAgaWYgKHBrZyA9PSBudWxsKSB7XG4gICAgICAgIGxvZy5lcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgZm9yIG5hbWUgXCIke3BhY2thZ2VzW2ldfVwiYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGlycyA9IGdldFRzY0NvbmZpZ09mUGtnKHBrZy5qc29uKTtcbiAgICAgIGNvbnN0IHBhdHRlcm5zID0gW2Ake3BrZy5yZWFsUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyl9LyR7ZGlycy5zcmNEaXJ9LyoqLypgXTtcbiAgICAgIGlmIChkaXJzLmlzb21EaXIpIHtcbiAgICAgICAgcGF0dGVybnMucHVzaChgJHtwa2cucmVhbFBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpfS8ke2RpcnMuc3JjRGlyfS8qKi8qLnRzYCk7XG4gICAgICB9XG4gICAgICBkaXNwYXRjaGVyLmFuYWx5emVGaWxlKHtmaWxlczogcGF0dGVybnMsIGFsaWFzLCBpZ25vcmU6IG9wdHMueH0pO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5yZXN1bHQpLCBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLnNraXAoMSksXG4gICAgb3AudGFwKChyZXN1bHQpID0+IHtcbiAgICAgIHByaW50UmVzdWx0KHJlc3VsdCEsIG9wdHMpO1xuICAgIH0pLFxuICAgIG9wLnRha2UoMSlcbiAgKS5zdWJzY3JpYmUoKTtcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRSZXN1bHQocmVzdWx0OiBOb25OdWxsYWJsZTxBbmFseXplU3RhdGVbJ3Jlc3VsdCddPiwgb3B0czoge2o6IEFuYWx5emVPcHRpb25zWydqJ119KSB7XG4gIGlmIChyZXN1bHQuY2FuTm90UmVzb2x2ZS5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAyLCBjb250ZW50OiBjaGFsay5ib2xkKCdDYW4gbm90IHJlc29sdmUgZGVwZW5kZWNpZXMnKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgIGxldCBpID0gMTtcbiAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQuY2FuTm90UmVzb2x2ZSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIEpTT04uc3RyaW5naWZ5KG1zZywgbnVsbCwgJyAgJyldKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQuY3ljbGljLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaSA9IDE7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAyLCBjb250ZW50OiBjaGFsay5ib2xkKCdDeWNsaWMgZGVwZW5kZWNpZXMnKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5jeWNsaWMpIHtcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZ10pO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG5cbiAgaWYgKHJlc3VsdC5leHRlcm5hbERlcHMubGVuZ3RoID4gMCkge1xuICAgIGxldCBpID0gMTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgdGFibGUucHVzaChbe2NvbFNwYW46IDIsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0V4dGVybmFsIGRlcGVuZGVjaWVzJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gICAgaWYgKCFvcHRzLmopIHtcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQuZXh0ZXJuYWxEZXBzKSB7XG4gICAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZ10pO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0Lm5vZGVNb2R1bGVEZXBzKSB7XG4gICAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZyArICcgKE5vZGUuanMpJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICAgIGlmIChvcHRzLmopIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShyZXN1bHQuZXh0ZXJuYWxEZXBzLCBudWxsLCAnICAnKSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHJlc3VsdC5yZWxhdGl2ZURlcHNPdXRTaWRlRGlyLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaSA9IDE7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tcbiAgICAgIGNvbFNwYW46IDIsXG4gICAgICBjb250ZW50OiBjaGFsay5ib2xkKGBEZXBlbmRlbmNpZXMgb3V0c2lkZSBvZiAke3Jlc3VsdC5jb21tb25EaXJ9YCksXG4gICAgICBoQWxpZ246ICdjZW50ZXInXG4gICAgfV0pO1xuICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0LnJlbGF0aXZlRGVwc091dFNpZGVEaXIpIHtcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZ10pO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG5cbiAgaWYgKHJlc3VsdD8ubWF0Y2hBbGlhcyAmJiByZXN1bHQubWF0Y2hBbGlhcy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IGkgPSAxO1xuICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgICB0YWJsZS5wdXNoKFt7XG4gICAgICBjb2xTcGFuOiAyLFxuICAgICAgY29udGVudDogY2hhbGsuYm9sZCgnQWxpYXMgcmVzb2x2ZWQnKSxcbiAgICAgIGhBbGlnbjogJ2NlbnRlcidcbiAgICB9XSk7XG4gICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQubWF0Y2hBbGlhcykge1xuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnXSk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cbn1cbmludGVyZmFjZSBBbmFseXplU3RhdGUge1xuICBpbnB1dEZpbGVzPzogc3RyaW5nW107XG4gIHJlc3VsdD86IFJldHVyblR5cGU8Q29udGV4dFsndG9QbGFpbk9iamVjdCddPjtcbn1cblxuY29uc3QgaW5pdFN0YXRlOiBBbmFseXplU3RhdGUgPSB7XG59O1xuXG5jb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdhbmFseXplJyxcbiAgaW5pdGlhbFN0YXRlOiBpbml0U3RhdGUsXG4gIHJlZHVjZXJzOiBjcmVhdGVSZWR1Y2Vycyh7XG4gICAgLyoqIHBheWxvYWQ6IGdsb2IgcGF0dGVybnMgKi9cbiAgICBhbmFseXplRmlsZShkOiBBbmFseXplU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgIGZpbGVzOiBzdHJpbmdbXTsgdHNjb25maWc/OiBzdHJpbmc7IGFsaWFzOiBbcGF0dGVybjogc3RyaW5nLCByZXBsYWNlOiBzdHJpbmddW107IGlnbm9yZT86IHN0cmluZztcbiAgICB9KSB7XG4gICAgICBkLmlucHV0RmlsZXMgPSBwYXlsb2FkLmZpbGVzO1xuICAgIH1cbiAgfSlcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljPHthbmFseXplOiBBbmFseXplU3RhdGV9PigoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYW5hbHl6ZUZpbGUpLFxuICAgICAgbWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4gYW5hbHlzZUZpbGVzKHBheWxvYWQuZmlsZXMsIHBheWxvYWQudHNjb25maWcsIHBheWxvYWQuYWxpYXMsIHBheWxvYWQuaWdub3JlKSksXG4gICAgICBtYXAocmVzdWx0ID0+IHtcbiAgICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gcy5yZXN1bHQgPSByZXN1bHQpOyAvLyBUT0RPIG1lcmdlIHJlc3VsdCBpbnN0ZWFkIG9mICdhc3NpZ24nIHJlc3VsdFxuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBjYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIHNyYztcbiAgICB9KSxcbiAgICBpZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYW5hbHlzZUZpbGVzKGZpbGVzOiBzdHJpbmdbXSxcbiAgdHNjb25maWdGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIGFsaWFzOiBbcGF0dGVybjogc3RyaW5nLCByZXBsYWNlOiBzdHJpbmddW10sXG4gIGlnbm9yZT86IHN0cmluZykge1xuICBjb25zdCBtYXRjaERvbmVzID0gZmlsZXMubWFwKHBhdHRlcm4gPT4gbmV3IFByb21pc2U8c3RyaW5nW10+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBnbG9iKHBhdHRlcm4sIHtub2RpcjogdHJ1ZX0sIChlcnIsIG1hdGNoZXMpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShtYXRjaGVzKTtcbiAgICB9KTtcbiAgfSkpO1xuICBmaWxlcyA9IF8uZmxhdHRlbigoYXdhaXQgUHJvbWlzZS5hbGwobWF0Y2hEb25lcykpKVxuXG4gIC5maWx0ZXIoZiA9PiAvXFwuW2p0XXN4PyQvLnRlc3QoZikpO1xuICBjb25zdCB0aHJlYWRQb29sID0gbmV3IFBvb2woY3B1cyAtIDEsIDAsIHtcbiAgICAvLyBpbml0aWFsaXplcjoge2ZpbGU6ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInfSxcbiAgICB2ZXJib3NlOiBmYWxzZVxuICB9KTtcblxuICAvLyBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPSAnLS1pbnNwZWN0LWJyayc7XG4gIHJldHVybiBhd2FpdCB0aHJlYWRQb29sLnN1Ym1pdFByb2Nlc3M8UmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+Pih7XG4gICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2NsaS1hbmFseXNlLXdvcmtlci5qcycpLFxuICAgIGV4cG9ydEZuOiAnZGZzVHJhdmVyc2VGaWxlcycsXG4gICAgYXJnczogW2ZpbGVzLm1hcChwID0+IFBhdGgucmVzb2x2ZShwKSksIHRzY29uZmlnRmlsZSwgYWxpYXMsIGlnbm9yZV1cbiAgfSk7XG5cbn1cbiJdfQ==