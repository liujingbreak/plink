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
const log = log4js_1.default.getLogger('plink.analyse');
const cpus = os_1.default.cpus().length;
function default_1(packages, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const alias = 
        // tslint:disable-next-line: no-eval
        opts.alias.map(item => JSON.parse(item));
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
    });
}
exports.default = default_1;
function printResult(result, opts) {
    if (result.canNotResolve.length > 0) {
        const table = misc_1.createCliTable({ horizontalLines: false });
        table.push([{ colSpan: 2, content: chalk_1.default.bold('Can not resolve dependecies'), hAlign: 'center' }]);
        table.push([{ hAlign: 'right', content: '--' }, '--------']);
        let i = 1;
        for (const msg of result.canNotResolve) {
            // tslint:disable-next-line: no-console
            table.push([{ hAlign: 'right', content: i++ }, JSON.stringify(msg, null, '  ')]);
        }
        // tslint:disable-next-line: no-console
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
        // tslint:disable-next-line: no-console
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
        }
        // tslint:disable-next-line: no-console
        console.log(table.toString());
        if (opts.j) {
            // tslint:disable-next-line: no-console
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
        // tslint:disable-next-line: no-console
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
        // tslint:disable-next-line: no-console
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
            // .map(file => {
            //   console.log(file);
            //   return file;
            // })
            .filter(f => /\.[jt]sx?$/.test(f));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5emUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWFuYWx5emUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QixvREFBb0Q7QUFDcEQsb0NBQXlFO0FBQ3pFLDhDQUEwRTtBQUMxRSxtREFBcUM7QUFDckMsK0JBQTJCO0FBRTNCLHdDQUE2QztBQUM3QyxvREFBNEI7QUFDNUIsNERBQXVEO0FBQ3ZELGtEQUEwQjtBQUMxQixtQ0FBNEM7QUFDNUMsZ0RBQXdDO0FBQ3hDLHdDQUFnRDtBQUVoRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5QyxNQUFNLElBQUksR0FBRyxZQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO0FBRTlCLG1CQUE4QixRQUFrQixFQUFFLElBQW9COztRQUNwRSxNQUFNLEtBQUs7UUFDVCxvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFM0MsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNyQyxrQkFBVSxDQUFDLFdBQVcsQ0FBQztnQkFDckIsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNoQixLQUFLO2dCQUNMLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtnQkFDdkIsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ2YsQ0FBQyxDQUFDO1NBQ0o7YUFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FB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QkFBdUI7WUFDdkIsaUJBQWlCO1lBQ2pCLEtBQUs7YUFDSixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxXQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdkMsc0RBQXNEO1lBQ3RELE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsT0FBTyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQXVDO1lBQzFFLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQztZQUN0RCxRQUFRLEVBQUUsa0JBQWtCO1lBQzVCLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUM7U0FDckUsQ0FBQyxDQUFDO0lBRUwsQ0FBQztDQUFBO0FBN0JELG9DQTZCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QW5hbHl6ZU9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb24sIGNyZWF0ZVJlZHVjZXJzIH0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHsgaWdub3JlRWxlbWVudHMsIGNhdGNoRXJyb3IsIG1hcCwgbWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7bWVyZ2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtDb250ZXh0fSBmcm9tICcuL2NsaS1hbmFseXNlLXdvcmtlcic7XG5pbXBvcnQge2NyZWF0ZUNsaVRhYmxlfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnLi4vLi4vLi4vdGhyZWFkLXByb21pc2UtcG9vbC9kaXN0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZX0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZ30gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmFuYWx5c2UnKTtcbmNvbnN0IGNwdXMgPSBvcy5jcHVzKCkubGVuZ3RoO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihwYWNrYWdlczogc3RyaW5nW10sIG9wdHM6IEFuYWx5emVPcHRpb25zKSB7XG4gIGNvbnN0IGFsaWFzOiBbcmVnOiBzdHJpbmcsIHJlcGxhY2U6IHN0cmluZ11bXSA9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1ldmFsXG4gICAgb3B0cy5hbGlhcy5tYXAoaXRlbSA9PiBKU09OLnBhcnNlKGl0ZW0pKTtcblxuICBpZiAob3B0cy5maWxlICYmIG9wdHMuZmlsZS5sZW5ndGggPiAwKSB7XG4gICAgZGlzcGF0Y2hlci5hbmFseXplRmlsZSh7XG4gICAgICBmaWxlczogb3B0cy5maWxlLFxuICAgICAgYWxpYXMsXG4gICAgICB0c2NvbmZpZzogb3B0cy50c2NvbmZpZyxcbiAgICAgIGlnbm9yZTogb3B0cy54XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAob3B0cy5kaXIgJiYgb3B0cy5kaXIubGVuZ3RoID4gMCkge1xuICAgIGRpc3BhdGNoZXIuYW5hbHl6ZUZpbGUoe1xuICAgICAgZmlsZXM6IG9wdHMuZGlyLm1hcChkaXIgPT4gZGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvKiovKicpLFxuICAgICAgYWxpYXMsXG4gICAgICB0c2NvbmZpZzogb3B0cy50c2NvbmZpZyxcbiAgICAgIGlnbm9yZTogb3B0cy54XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gbG9nLndhcm4oJ1NvcnJ5LCBub3QgaW1wbGVtZW50ZWQgeWV0LCB1c2Ugd2l0aCBhcmd1bWVudCBcIi1mXCIgZm9yIG5vdy4nKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBwYWNrYWdlcykpIHtcbiAgICAgIGlmIChwa2cgPT0gbnVsbCkge1xuICAgICAgICBsb2cuZXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lIFwiJHtwYWNrYWdlc1tpXX1cImApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRpcnMgPSBnZXRUc2NDb25maWdPZlBrZyhwa2cuanNvbik7XG4gICAgICBjb25zdCBwYXR0ZXJucyA9IFtgJHtwa2cucmVhbFBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpfS8ke2RpcnMuc3JjRGlyfS8qKi8qYF07XG4gICAgICBpZiAoZGlycy5pc29tRGlyKSB7XG4gICAgICAgIHBhdHRlcm5zLnB1c2goYCR7cGtnLnJlYWxQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKX0vJHtkaXJzLnNyY0Rpcn0vKiovKi50c2ApO1xuICAgICAgfVxuICAgICAgZGlzcGF0Y2hlci5hbmFseXplRmlsZSh7ZmlsZXM6IHBhdHRlcm5zLCBhbGlhcywgaWdub3JlOiBvcHRzLnh9KTtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMucmVzdWx0KSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5za2lwKDEpLFxuICAgIG9wLnRhcCgocmVzdWx0KSA9PiB7XG4gICAgICBwcmludFJlc3VsdChyZXN1bHQhLCBvcHRzKTtcbiAgICB9KSxcbiAgICBvcC50YWtlKDEpXG4gICkuc3Vic2NyaWJlKCk7XG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50UmVzdWx0KHJlc3VsdDogTm9uTnVsbGFibGU8QW5hbHl6ZVN0YXRlWydyZXN1bHQnXT4sIG9wdHM6IHtqOiBBbmFseXplT3B0aW9uc1snaiddfSkge1xuICBpZiAocmVzdWx0LmNhbk5vdFJlc29sdmUubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogMiwgY29udGVudDogY2hhbGsuYm9sZCgnQ2FuIG5vdCByZXNvbHZlIGRlcGVuZGVjaWVzJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICBsZXQgaSA9IDE7XG4gICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0LmNhbk5vdFJlc29sdmUpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgSlNPTi5zdHJpbmdpZnkobXNnLCBudWxsLCAnICAnKV0pO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQuY3ljbGljLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaSA9IDE7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAyLCBjb250ZW50OiBjaGFsay5ib2xkKCdDeWNsaWMgZGVwZW5kZWNpZXMnKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdC5jeWNsaWMpIHtcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZ10pO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQuZXh0ZXJuYWxEZXBzLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaSA9IDE7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAyLCBjb250ZW50OiBjaGFsay5ib2xkKCdFeHRlcm5hbCBkZXBlbmRlY2llcycpLCBoQWxpZ246ICdjZW50ZXInfV0pO1xuICAgIGlmICghb3B0cy5qKSB7XG4gICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0LmV4dGVybmFsRGVwcykge1xuICAgICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiBpKyt9LCBtc2ddKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gICAgaWYgKG9wdHMuaikge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShyZXN1bHQuZXh0ZXJuYWxEZXBzLCBudWxsLCAnICAnKSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHJlc3VsdC5yZWxhdGl2ZURlcHNPdXRTaWRlRGlyLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaSA9IDE7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgIHRhYmxlLnB1c2goW3tcbiAgICAgIGNvbFNwYW46IDIsXG4gICAgICBjb250ZW50OiBjaGFsay5ib2xkKGBEZXBlbmRlbmNpZXMgb3V0c2lkZSBvZiAke3Jlc3VsdC5jb21tb25EaXJ9YCksXG4gICAgICBoQWxpZ246ICdjZW50ZXInXG4gICAgfV0pO1xuICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0LnJlbGF0aXZlRGVwc091dFNpZGVEaXIpIHtcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZ10pO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQ/Lm1hdGNoQWxpYXMgJiYgcmVzdWx0Lm1hdGNoQWxpYXMubGVuZ3RoID4gMCkge1xuICAgIGxldCBpID0gMTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgdGFibGUucHVzaChbe1xuICAgICAgY29sU3BhbjogMixcbiAgICAgIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0FsaWFzIHJlc29sdmVkJyksXG4gICAgICBoQWxpZ246ICdjZW50ZXInXG4gICAgfV0pO1xuICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgZm9yIChjb25zdCBtc2cgb2YgcmVzdWx0Lm1hdGNoQWxpYXMpIHtcbiAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIG1zZ10pO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxufVxuaW50ZXJmYWNlIEFuYWx5emVTdGF0ZSB7XG4gIGlucHV0RmlsZXM/OiBzdHJpbmdbXTtcbiAgcmVzdWx0PzogUmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+O1xufVxuXG5jb25zdCBpbml0U3RhdGU6IEFuYWx5emVTdGF0ZSA9IHtcbn07XG5cbmNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2FuYWx5emUnLFxuICBpbml0aWFsU3RhdGU6IGluaXRTdGF0ZSxcbiAgcmVkdWNlcnM6IGNyZWF0ZVJlZHVjZXJzKHtcbiAgICAvKiogcGF5bG9hZDogZ2xvYiBwYXR0ZXJucyAqL1xuICAgIGFuYWx5emVGaWxlKGQ6IEFuYWx5emVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgZmlsZXM6IHN0cmluZ1tdLCB0c2NvbmZpZz86IHN0cmluZywgYWxpYXM6IFtwYXR0ZXJuOiBzdHJpbmcsIHJlcGxhY2U6IHN0cmluZ11bXSwgaWdub3JlPzogc3RyaW5nXG4gICAgfSkge1xuICAgICAgZC5pbnB1dEZpbGVzID0gcGF5bG9hZC5maWxlcztcbiAgICB9XG4gIH0pXG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx7YW5hbHl6ZTogQW5hbHl6ZVN0YXRlfT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICByZXR1cm4gbWVyZ2UoXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmFuYWx5emVGaWxlKSxcbiAgICAgIG1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IGFuYWx5c2VGaWxlcyhwYXlsb2FkLmZpbGVzLCBwYXlsb2FkLnRzY29uZmlnLCBwYXlsb2FkLmFsaWFzLCBwYXlsb2FkLmlnbm9yZSkpLFxuICAgICAgbWFwKHJlc3VsdCA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHMucmVzdWx0ID0gcmVzdWx0KTsgLy8gVE9ETyBtZXJnZSByZXN1bHQgaW5zdGVhZCBvZiAnYXNzaWduJyByZXN1bHRcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIHJldHVybiBzcmM7XG4gICAgfSksXG4gICAgaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFuYWx5c2VGaWxlcyhmaWxlczogc3RyaW5nW10sXG4gIHRzY29uZmlnRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBhbGlhczogW3BhdHRlcm46IHN0cmluZywgcmVwbGFjZTogc3RyaW5nXVtdLFxuICBpZ25vcmU/OiBzdHJpbmcpIHtcbiAgY29uc3QgbWF0Y2hEb25lcyA9IGZpbGVzLm1hcChwYXR0ZXJuID0+IG5ldyBQcm9taXNlPHN0cmluZ1tdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZ2xvYihwYXR0ZXJuLCB7bm9kaXI6IHRydWV9LCAoZXJyLCBtYXRjaGVzKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUobWF0Y2hlcyk7XG4gICAgfSk7XG4gIH0pKTtcbiAgZmlsZXMgPSBfLmZsYXR0ZW4oKGF3YWl0IFByb21pc2UuYWxsKG1hdGNoRG9uZXMpKSlcbiAgLy8gLm1hcChmaWxlID0+IHtcbiAgLy8gICBjb25zb2xlLmxvZyhmaWxlKTtcbiAgLy8gICByZXR1cm4gZmlsZTtcbiAgLy8gfSlcbiAgLmZpbHRlcihmID0+IC9cXC5banRdc3g/JC8udGVzdChmKSk7XG4gIGNvbnN0IHRocmVhZFBvb2wgPSBuZXcgUG9vbChjcHVzIC0gMSwgMCwge1xuICAgIC8vIGluaXRpYWxpemVyOiB7ZmlsZTogJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcid9LFxuICAgIHZlcmJvc2U6IGZhbHNlXG4gIH0pO1xuXG4gIHJldHVybiBhd2FpdCB0aHJlYWRQb29sLnN1Ym1pdFByb2Nlc3M8UmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+Pih7XG4gICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2NsaS1hbmFseXNlLXdvcmtlci5qcycpLFxuICAgIGV4cG9ydEZuOiAnZGZzVHJhdmVyc2VGaWxlcycsXG4gICAgYXJnczogW2ZpbGVzLm1hcChwID0+IFBhdGgucmVzb2x2ZShwKSksIHRzY29uZmlnRmlsZSwgYWxpYXMsIGlnbm9yZV1cbiAgfSk7XG5cbn1cbiJdfQ==