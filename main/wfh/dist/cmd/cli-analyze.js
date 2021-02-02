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
exports.dispatcher = exports.getStore = void 0;
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const glob_1 = __importDefault(require("glob"));
const lodash_1 = __importDefault(require("lodash"));
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
const log = log4js_1.default.getLogger('plink.analyse');
const cpus = os_1.default.cpus().length;
function default_1(packages, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        if (opts.file && opts.file.length > 0) {
            exports.dispatcher.analyzeFile(opts.file);
        }
        else if (opts.dir) {
            exports.dispatcher.analyzeFile([opts.dir.replace(/\\/g, '/') + '/**/*']);
        }
        else {
            // log.warn('Sorry, not implemented yet, use with argument "-f" for now.');
            let i = 0;
            for (const pkg of utils_1.findPackagesByNames(package_mgr_1.getState(), packages)) {
                if (pkg == null) {
                    log.error(`Can not find package for name "${packages[i]}"`);
                    continue;
                }
                exports.dispatcher.analyzeFile([pkg.realPath.replace(/\\/g, '/') + '/**/*']);
                i++;
            }
        }
        getStore().pipe(operators_1.map(s => s.result), op.distinctUntilChanged(), op.skip(1), op.tap((result) => {
            if (result.canNotResolve.length > 0) {
                const table = misc_1.createCliTable({ horizontalLines: false });
                table.push([{ colSpan: 2, content: chalk_1.default.bold('Can not resolve dependecies'), hAlign: 'center' }]);
                table.push([{ hAlign: 'right', content: '--' }, '--------']);
                let i = 1;
                for (const msg of result.canNotResolve) {
                    // tslint:disable-next-line: no-console
                    console.log(`Can not resolve dependecy: ${JSON.stringify(msg, null, '  ')}`);
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
        })).subscribe();
    });
}
exports.default = default_1;
const initState = {};
const slice = store_1.stateFactory.newSlice({
    name: 'analyze',
    initialState: initState,
    reducers: {
        /** payload: glob patterns */
        analyzeFile(d, { payload }) {
            d.inputFiles = payload;
        }
    }
});
function getStore() {
    return store_1.stateFactory.sliceStore(slice);
}
exports.getStore = getStore;
exports.dispatcher = store_1.stateFactory.bindActionCreators(slice);
store_1.stateFactory.addEpic((action$, state$) => {
    return rxjs_1.merge(action$.pipe(store_1.ofPayloadAction(slice.actions.analyzeFile), operators_1.concatMap((action) => rxjs_1.from(analyseFiles(action.payload))), operators_1.map(result => {
        exports.dispatcher._change(s => s.result = result);
    }))).pipe(operators_1.catchError((err, src) => {
        action$.pipe(store_1.ofPayloadAction(slice.actions.analyzeFile), operators_1.map(({ payload }) => {
            analyseFiles(payload);
        })),
            console.error(err);
        return src;
    }), operators_1.ignoreElements());
});
function analyseFiles(files) {
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
            args: [files.map(p => path_1.default.resolve(p))]
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5emUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWFuYWx5emUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUV2QixvQ0FBeUQ7QUFDekQsOENBQTJFO0FBQzNFLG1EQUFxQztBQUNyQywrQkFBaUM7QUFFakMsd0NBQTZDO0FBQzdDLG9EQUE0QjtBQUM1Qiw0REFBdUQ7QUFDdkQsa0RBQTBCO0FBQzFCLG1DQUE0QztBQUM1QyxnREFBd0M7QUFFeEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUMsTUFBTSxJQUFJLEdBQUcsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUU5QixtQkFBOEIsUUFBa0IsRUFBRSxJQUFvQjs7UUFDcEUsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNyQyxrQkFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbkM7YUFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDbkIsa0JBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNsRTthQUFNO1lBQ0wsMkVBQTJFO1lBQzNFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNWLEtBQUssTUFBTSxHQUFHLElBQUksMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFO2dCQUMzRCxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7b0JB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QUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QW5hbHl6ZU9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb24gfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgeyBpZ25vcmVFbGVtZW50cywgY2F0Y2hFcnJvciwgbWFwLCBjb25jYXRNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7bWVyZ2UsIGZyb219IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtDb250ZXh0fSBmcm9tICcuL2NsaS1hbmFseXNlLXdvcmtlcic7XG5pbXBvcnQge2NyZWF0ZUNsaVRhYmxlfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnLi4vLi4vLi4vdGhyZWFkLXByb21pc2UtcG9vbC9kaXN0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZX0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5hbmFseXNlJyk7XG5jb25zdCBjcHVzID0gb3MuY3B1cygpLmxlbmd0aDtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ocGFja2FnZXM6IHN0cmluZ1tdLCBvcHRzOiBBbmFseXplT3B0aW9ucykge1xuICBpZiAob3B0cy5maWxlICYmIG9wdHMuZmlsZS5sZW5ndGggPiAwKSB7XG4gICAgZGlzcGF0Y2hlci5hbmFseXplRmlsZShvcHRzLmZpbGUpO1xuICB9IGVsc2UgaWYgKG9wdHMuZGlyKSB7XG4gICAgZGlzcGF0Y2hlci5hbmFseXplRmlsZShbb3B0cy5kaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8qKi8qJ10pO1xuICB9IGVsc2Uge1xuICAgIC8vIGxvZy53YXJuKCdTb3JyeSwgbm90IGltcGxlbWVudGVkIHlldCwgdXNlIHdpdGggYXJndW1lbnQgXCItZlwiIGZvciBub3cuJyk7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgcGtnIG9mIGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgcGFja2FnZXMpKSB7XG4gICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgICAgbG9nLmVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBcIiR7cGFja2FnZXNbaV19XCJgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBkaXNwYXRjaGVyLmFuYWx5emVGaWxlKFtwa2cucmVhbFBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8qKi8qJ10pO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5yZXN1bHQpLCBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLnNraXAoMSksXG4gICAgb3AudGFwKChyZXN1bHQpID0+IHtcbiAgICAgIGlmIChyZXN1bHQhLmNhbk5vdFJlc29sdmUubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAyLCBjb250ZW50OiBjaGFsay5ib2xkKCdDYW4gbm90IHJlc29sdmUgZGVwZW5kZWNpZXMnKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICAgICAgbGV0IGkgPSAxO1xuICAgICAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQhLmNhbk5vdFJlc29sdmUpIHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQ2FuIG5vdCByZXNvbHZlIGRlcGVuZGVjeTogJHtKU09OLnN0cmluZ2lmeShtc2csIG51bGwsICcgICcpfWApO1xuICAgICAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6IGkrK30sIEpTT04uc3RyaW5naWZ5KG1zZywgbnVsbCwgJyAgJyldKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXN1bHQhLmN5Y2xpYy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGxldCBpID0gMTtcbiAgICAgICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgICAgICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogMiwgY29udGVudDogY2hhbGsuYm9sZCgnQ3ljbGljIGRlcGVuZGVjaWVzJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gICAgICAgIHRhYmxlLnB1c2goW3toQWxpZ246ICdyaWdodCcsIGNvbnRlbnQ6ICctLSd9LCAnLS0tLS0tLS0nXSk7XG4gICAgICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdCEuY3ljbGljKSB7XG4gICAgICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnXSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzdWx0IS5leHRlcm5hbERlcHMubGVuZ3RoID4gMCkge1xuICAgICAgICBsZXQgaSA9IDE7XG4gICAgICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgICAgICAgdGFibGUucHVzaChbe2NvbFNwYW46IDIsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0V4dGVybmFsIGRlcGVuZGVjaWVzJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gICAgICAgIGlmICghb3B0cy5qKSB7XG4gICAgICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogJy0tJ30sICctLS0tLS0tLSddKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQhLmV4dGVybmFsRGVwcykge1xuICAgICAgICAgICAgdGFibGUucHVzaChbe2hBbGlnbjogJ3JpZ2h0JywgY29udGVudDogaSsrfSwgbXNnXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgICAgICAgaWYgKG9wdHMuaikge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlc3VsdCEuZXh0ZXJuYWxEZXBzLCBudWxsLCAnICAnKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdCEucmVsYXRpdmVEZXBzT3V0U2lkZURpci5sZW5ndGggPiAwKSB7XG4gICAgICAgIGxldCBpID0gMTtcbiAgICAgICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgICAgICB0YWJsZS5wdXNoKFt7XG4gICAgICAgICAgY29sU3BhbjogMixcbiAgICAgICAgICBjb250ZW50OiBjaGFsay5ib2xkKGBEZXBlbmRlbmNpZXMgb3V0c2lkZSBvZiAke3Jlc3VsdCEuY29tbW9uRGlyfWApLFxuICAgICAgICAgIGhBbGlnbjogJ2NlbnRlcidcbiAgICAgICAgfV0pO1xuICAgICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiAnLS0nfSwgJy0tLS0tLS0tJ10pO1xuICAgICAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQhLnJlbGF0aXZlRGVwc091dFNpZGVEaXIpIHtcbiAgICAgICAgICB0YWJsZS5wdXNoKFt7aEFsaWduOiAncmlnaHQnLCBjb250ZW50OiBpKyt9LCBtc2ddKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gICAgICB9XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxufVxuaW50ZXJmYWNlIEFuYWx5emVTdGF0ZSB7XG4gIGlucHV0RmlsZXM/OiBzdHJpbmdbXTtcbiAgcmVzdWx0PzogUmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+O1xufVxuXG5jb25zdCBpbml0U3RhdGU6IEFuYWx5emVTdGF0ZSA9IHtcbn07XG5cbmNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2FuYWx5emUnLFxuICBpbml0aWFsU3RhdGU6IGluaXRTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICAvKiogcGF5bG9hZDogZ2xvYiBwYXR0ZXJucyAqL1xuICAgIGFuYWx5emVGaWxlKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGQuaW5wdXRGaWxlcyA9IHBheWxvYWQ7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx7YW5hbHl6ZTogQW5hbHl6ZVN0YXRlfT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICByZXR1cm4gbWVyZ2UoXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmFuYWx5emVGaWxlKSxcbiAgICAgIGNvbmNhdE1hcCgoYWN0aW9uKSA9PiBmcm9tKGFuYWx5c2VGaWxlcyhhY3Rpb24ucGF5bG9hZCkpKSxcbiAgICAgIG1hcChyZXN1bHQgPT4ge1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzLnJlc3VsdCA9IHJlc3VsdCk7XG4gICAgICB9KVxuICAgIClcbiAgKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYW5hbHl6ZUZpbGUpLFxuICAgICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIGFuYWx5c2VGaWxlcyhwYXlsb2FkKTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pLFxuICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5cbmFzeW5jIGZ1bmN0aW9uIGFuYWx5c2VGaWxlcyhmaWxlczogc3RyaW5nW10pIHtcbiAgY29uc3QgbWF0Y2hEb25lcyA9IGZpbGVzLm1hcChwYXR0ZXJuID0+IG5ldyBQcm9taXNlPHN0cmluZ1tdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZ2xvYihwYXR0ZXJuLCB7bm9kaXI6IHRydWV9LCAoZXJyLCBtYXRjaGVzKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUobWF0Y2hlcyk7XG4gICAgfSk7XG4gIH0pKTtcbiAgZmlsZXMgPSBfLmZsYXR0ZW4oKGF3YWl0IFByb21pc2UuYWxsKG1hdGNoRG9uZXMpKSlcbiAgLy8gLm1hcChmaWxlID0+IHtcbiAgLy8gICBjb25zb2xlLmxvZyhmaWxlKTtcbiAgLy8gICByZXR1cm4gZmlsZTtcbiAgLy8gfSlcbiAgLmZpbHRlcihmID0+IC9cXC5banRdc3g/JC8udGVzdChmKSk7XG4gIGNvbnN0IHRocmVhZFBvb2wgPSBuZXcgUG9vbChjcHVzIC0gMSwgMCwge1xuICAgIC8vIGluaXRpYWxpemVyOiB7ZmlsZTogJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcid9LFxuICAgIHZlcmJvc2U6IGZhbHNlXG4gIH0pO1xuXG4gIHJldHVybiBhd2FpdCB0aHJlYWRQb29sLnN1Ym1pdFByb2Nlc3M8UmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+Pih7XG4gICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2NsaS1hbmFseXNlLXdvcmtlci5qcycpLFxuICAgIGV4cG9ydEZuOiAnZGZzVHJhdmVyc2VGaWxlcycsXG4gICAgYXJnczogW2ZpbGVzLm1hcChwID0+IFBhdGgucmVzb2x2ZShwKSldXG4gIH0pO1xuXG59XG4iXX0=