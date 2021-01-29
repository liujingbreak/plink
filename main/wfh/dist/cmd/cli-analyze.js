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
const os_1 = __importDefault(require("os"));
const config_1 = __importDefault(require("../config"));
const path_1 = __importDefault(require("path"));
const glob_1 = __importDefault(require("glob"));
const lodash_1 = __importDefault(require("lodash"));
const store_1 = require("../store");
const operators_1 = require("rxjs/operators");
const op = __importStar(require("rxjs/operators"));
const rxjs_1 = require("rxjs");
const misc_1 = require("../utils/misc");
// import log4js from 'log4js';
const dist_1 = require("../../../thread-promise-pool/dist");
const chalk_1 = __importDefault(require("chalk"));
// const log = log4js.getLogger('plink.analyse');
const cpus = os_1.default.cpus().length;
function default_1(packages, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opts);
        if (opts.file) {
            dispatcher.analyzeFile(opts.file);
        }
        getStore().pipe(operators_1.map(s => s.result), op.distinctUntilChanged(), op.skip(1), op.tap((result) => {
            if (result.canNotResolve.length > 0) {
                const table = misc_1.createCliTable({ horizontalLines: false });
                table.push([{ colSpan: 2, content: chalk_1.default.bold('Can not resolve dependecies'), hAlign: 'center' }]);
                for (const msg of result.canNotResolve) {
                    // tslint:disable-next-line: no-console
                    console.log(`Can not resolve dependecy: ${JSON.stringify(msg, null, '  ')}`);
                    table.push(['', JSON.stringify(msg, null, '  ')]);
                }
                // tslint:disable-next-line: no-console
                console.log(table.toString());
            }
            if (result.cyclic.length > 0) {
                const table = misc_1.createCliTable({ horizontalLines: false });
                table.push([{ colSpan: 2, content: chalk_1.default.bold('Cyclic dependecies'), hAlign: 'center' }]);
                for (const msg of result.cyclic) {
                    table.push(['', msg]);
                }
                // tslint:disable-next-line: no-console
                console.log(table.toString());
            }
            if (result.externalDeps.length > 0) {
                const table = misc_1.createCliTable({ horizontalLines: false });
                table.push([{ colSpan: 2, content: chalk_1.default.bold('External dependecies'), hAlign: 'center' }]);
                for (const msg of result.externalDeps) {
                    table.push(['', msg]);
                }
                // tslint:disable-next-line: no-console
                console.log(table.toString());
            }
            if (result.relativeDepsOutSideDir.length > 0) {
                const table = misc_1.createCliTable({ horizontalLines: false });
                table.push([{
                        colSpan: 2,
                        content: chalk_1.default.bold(`Dependencies outside of ${result.commonDir}`),
                        hAlign: 'center'
                    }]);
                for (const msg of result.relativeDepsOutSideDir) {
                    table.push(['', msg]);
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
        analyzeFile(d, { payload }) {
            d.inputFiles = payload;
        }
    }
});
function getStore() {
    return store_1.stateFactory.sliceStore(slice);
}
const dispatcher = store_1.stateFactory.bindActionCreators(slice);
store_1.stateFactory.addEpic((action$, state$) => {
    return rxjs_1.merge(action$.pipe(store_1.ofPayloadAction(slice.actions.analyzeFile), operators_1.concatMap((action) => rxjs_1.from(analyseFiles(action.payload))), operators_1.map(result => {
        dispatcher._change(s => s.result = result);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5emUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWFuYWx5emUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNENBQW9CO0FBQ3BCLHVEQUErQjtBQUMvQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUV2QixvQ0FBeUQ7QUFDekQsOENBQTJFO0FBQzNFLG1EQUFxQztBQUNyQywrQkFBaUM7QUFFakMsd0NBQTZDO0FBQzdDLCtCQUErQjtBQUMvQiw0REFBdUQ7QUFDdkQsa0RBQTBCO0FBRTFCLGlEQUFpRDtBQUNqRCxNQUFNLElBQUksR0FBRyxZQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO0FBRTlCLG1CQUE4QixRQUFrQixFQUFFLElBQW9COztRQUNwRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNiLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ25DO1FBQ0QsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNiLGVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDN0MsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDVixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFFaEIsSUFBSSxNQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3BDLE1BQU0sS0FBSyxHQUFHLHFCQUFjLENBQUMsRUFBQyxlQUFlLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztnQkFDdkQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsT0FB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RSxDQUFDLEVBQUU7WUFDdkMsc0RBQXNEO1lBQ3RELE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsT0FBTyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQXVDO1lBQzFFLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQztZQUN0RCxRQUFRLEVBQUUsa0JBQWtCO1lBQzVCLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDeEMsQ0FBQyxDQUFDO0lBRUwsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBbmFseXplT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IGlnbm9yZUVsZW1lbnRzLCBjYXRjaEVycm9yLCBtYXAsIGNvbmNhdE1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHttZXJnZSwgZnJvbX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge0NvbnRleHR9IGZyb20gJy4vY2xpLWFuYWx5c2Utd29ya2VyJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGV9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtQb29sfSBmcm9tICcuLi8uLi8uLi90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuLy8gY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuYW5hbHlzZScpO1xuY29uc3QgY3B1cyA9IG9zLmNwdXMoKS5sZW5ndGg7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKHBhY2thZ2VzOiBzdHJpbmdbXSwgb3B0czogQW5hbHl6ZU9wdGlvbnMpIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0cyk7XG4gIGlmIChvcHRzLmZpbGUpIHtcbiAgICBkaXNwYXRjaGVyLmFuYWx5emVGaWxlKG9wdHMuZmlsZSk7XG4gIH1cbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMucmVzdWx0KSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5za2lwKDEpLFxuICAgIG9wLnRhcCgocmVzdWx0KSA9PiB7XG5cbiAgICAgIGlmIChyZXN1bHQhLmNhbk5vdFJlc29sdmUubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAyLCBjb250ZW50OiBjaGFsay5ib2xkKCdDYW4gbm90IHJlc29sdmUgZGVwZW5kZWNpZXMnKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcblxuICAgICAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQhLmNhbk5vdFJlc29sdmUpIHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQ2FuIG5vdCByZXNvbHZlIGRlcGVuZGVjeTogJHtKU09OLnN0cmluZ2lmeShtc2csIG51bGwsICcgICcpfWApO1xuICAgICAgICAgIHRhYmxlLnB1c2goWycnLCBKU09OLnN0cmluZ2lmeShtc2csIG51bGwsICcgICcpXSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCEuY3ljbGljLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgICAgICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogMiwgY29udGVudDogY2hhbGsuYm9sZCgnQ3ljbGljIGRlcGVuZGVjaWVzJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gICAgICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdCEuY3ljbGljKSB7XG4gICAgICAgICAgdGFibGUucHVzaChbJycsIG1zZ10pO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdCEuZXh0ZXJuYWxEZXBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICAgICAgICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogMiwgY29udGVudDogY2hhbGsuYm9sZCgnRXh0ZXJuYWwgZGVwZW5kZWNpZXMnKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcblxuICAgICAgICBmb3IgKGNvbnN0IG1zZyBvZiByZXN1bHQhLmV4dGVybmFsRGVwcykge1xuICAgICAgICAgIHRhYmxlLnB1c2goWycnLCBtc2ddKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXN1bHQhLnJlbGF0aXZlRGVwc091dFNpZGVEaXIubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gICAgICAgIHRhYmxlLnB1c2goW3tcbiAgICAgICAgICBjb2xTcGFuOiAyLFxuICAgICAgICAgIGNvbnRlbnQ6IGNoYWxrLmJvbGQoYERlcGVuZGVuY2llcyBvdXRzaWRlIG9mICR7cmVzdWx0IS5jb21tb25EaXJ9YCksXG4gICAgICAgICAgaEFsaWduOiAnY2VudGVyJ1xuICAgICAgICB9XSk7XG4gICAgICAgIGZvciAoY29uc3QgbXNnIG9mIHJlc3VsdCEucmVsYXRpdmVEZXBzT3V0U2lkZURpcikge1xuICAgICAgICAgIHRhYmxlLnB1c2goWycnLCBtc2ddKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gICAgICB9XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxufVxuaW50ZXJmYWNlIEFuYWx5emVTdGF0ZSB7XG4gIGlucHV0RmlsZXM/OiBzdHJpbmdbXTtcbiAgcmVzdWx0PzogUmV0dXJuVHlwZTxDb250ZXh0Wyd0b1BsYWluT2JqZWN0J10+O1xufVxuXG5jb25zdCBpbml0U3RhdGU6IEFuYWx5emVTdGF0ZSA9IHtcbn07XG5cbmNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2FuYWx5emUnLFxuICBpbml0aWFsU3RhdGU6IGluaXRTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICBhbmFseXplRmlsZShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBkLmlucHV0RmlsZXMgPSBwYXlsb2FkO1xuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5jb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljPHthbmFseXplOiBBbmFseXplU3RhdGV9PigoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYW5hbHl6ZUZpbGUpLFxuICAgICAgY29uY2F0TWFwKChhY3Rpb24pID0+IGZyb20oYW5hbHlzZUZpbGVzKGFjdGlvbi5wYXlsb2FkKSkpLFxuICAgICAgbWFwKHJlc3VsdCA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHMucmVzdWx0ID0gcmVzdWx0KTtcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5hbmFseXplRmlsZSksXG4gICAgICAgIG1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgYW5hbHlzZUZpbGVzKHBheWxvYWQpO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIHJldHVybiBzcmM7XG4gICAgfSksXG4gICAgaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cblxuYXN5bmMgZnVuY3Rpb24gYW5hbHlzZUZpbGVzKGZpbGVzOiBzdHJpbmdbXSkge1xuICBjb25zdCBtYXRjaERvbmVzID0gZmlsZXMubWFwKHBhdHRlcm4gPT4gbmV3IFByb21pc2U8c3RyaW5nW10+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBnbG9iKHBhdHRlcm4sIHtub2RpcjogdHJ1ZX0sIChlcnIsIG1hdGNoZXMpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShtYXRjaGVzKTtcbiAgICB9KTtcbiAgfSkpO1xuICBmaWxlcyA9IF8uZmxhdHRlbigoYXdhaXQgUHJvbWlzZS5hbGwobWF0Y2hEb25lcykpKVxuICAvLyAubWFwKGZpbGUgPT4ge1xuICAvLyAgIGNvbnNvbGUubG9nKGZpbGUpO1xuICAvLyAgIHJldHVybiBmaWxlO1xuICAvLyB9KVxuICAuZmlsdGVyKGYgPT4gL1xcLltqdF1zeD8kLy50ZXN0KGYpKTtcbiAgY29uc3QgdGhyZWFkUG9vbCA9IG5ldyBQb29sKGNwdXMgLSAxLCAwLCB7XG4gICAgLy8gaW5pdGlhbGl6ZXI6IHtmaWxlOiAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJ30sXG4gICAgdmVyYm9zZTogZmFsc2VcbiAgfSk7XG5cbiAgcmV0dXJuIGF3YWl0IHRocmVhZFBvb2wuc3VibWl0UHJvY2VzczxSZXR1cm5UeXBlPENvbnRleHRbJ3RvUGxhaW5PYmplY3QnXT4+KHtcbiAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnY2xpLWFuYWx5c2Utd29ya2VyLmpzJyksXG4gICAgZXhwb3J0Rm46ICdkZnNUcmF2ZXJzZUZpbGVzJyxcbiAgICBhcmdzOiBbZmlsZXMubWFwKHAgPT4gUGF0aC5yZXNvbHZlKHApKV1cbiAgfSk7XG5cbn1cbiJdfQ==