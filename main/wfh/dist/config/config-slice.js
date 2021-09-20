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
exports.getStore = exports.getState = exports.dispatcher = exports.configSlice = void 0;
const path_1 = __importDefault(require("path"));
const store_1 = require("../store");
const op = __importStar(require("rxjs/operators"));
const rx = __importStar(require("rxjs"));
const log4js_1 = __importDefault(require("log4js"));
const worker_threads_1 = require("worker_threads");
const network_util_1 = require("../utils/network-util");
const { distDir, rootDir } = JSON.parse(process.env.__plink);
const initialState = {
    port: 14333,
    localIP: (0, network_util_1.getLanIPv4)(),
    publicPath: '/',
    devMode: false,
    destDir: distDir,
    staticDir: path_1.default.resolve(distDir, 'static'),
    serverDir: path_1.default.resolve(distDir, 'server'),
    rootPath: rootDir,
    packageScopes: ['wfh', 'bk', 'bk-core', 'dr', 'dr-core', 'types'],
    nodeRoutePath: '/',
    staticAssetsURL: '',
    packageContextPathMapping: {},
    browserSideConfigProp: [],
    enableSourceMaps: true,
    outputPathMap: {},
    __filename
};
exports.configSlice = store_1.stateFactory.newSlice({
    name: 'config',
    initialState: initialState,
    reducers: {
        saveCliOption(s, { payload }) {
            if (payload.config) {
                // Later on process may change cwd by chdir(), make sure file paths are absolute, so that it remains correctly even in difference working directory
                payload.config = payload.config.map(entry => path_1.default.resolve(entry));
            }
            s.cliOptions = payload;
            s.devMode = payload.dev === true;
        }
    }
});
exports.dispatcher = store_1.stateFactory.bindActionCreators(exports.configSlice);
store_1.stateFactory.addEpic((action$, state$) => {
    return rx.merge(getStore().pipe(op.map(s => s.devMode), op.distinctUntilChanged(), op.map(devMode => {
        process.env.NODE_ENV = devMode ? 'development' : 'production';
    })), getStore().pipe(op.map(s => { var _a; return (_a = s.cliOptions) === null || _a === void 0 ? void 0 : _a.verbose; }), op.distinctUntilChanged(), op.filter(verbose => !!verbose), op.map(() => {
        // initial log configure is in store.ts
        let logPatternPrefix = '';
        if (process.send || !worker_threads_1.isMainThread)
            logPatternPrefix += `[P${process.pid}.T${worker_threads_1.threadId}] `;
        log4js_1.default.configure({
            appenders: {
                out: {
                    type: 'stdout',
                    layout: { type: 'pattern', pattern: logPatternPrefix + '%[[%p] %c%] - %m' }
                }
            },
            categories: {
                default: { appenders: ['out'], level: 'debug' },
                plink: { appenders: ['out'], level: 'debug' }
            }
        });
    }), op.take(1)), store_1.processExitAction$.pipe(op.tap(() => exports.dispatcher._change(s => {
        s.cliOptions = undefined;
        s.view = undefined;
    })))).pipe(op.catchError((ex, src) => {
        // eslint-disable-next-line no-console
        console.error(ex);
        return src;
    }), op.ignoreElements());
});
function getState() {
    return store_1.stateFactory.sliceState(exports.configSlice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(exports.configSlice);
}
exports.getStore = getStore;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0RBQXdCO0FBQ3hCLG9DQUEwRDtBQUMxRCxtREFBcUM7QUFDckMseUNBQTJCO0FBRzNCLG9EQUE0QjtBQUM1QixtREFBc0Q7QUFDdEQsd0RBQWlEO0FBRWpELE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBNkN4RSxNQUFNLFlBQVksR0FBMkI7SUFDM0MsSUFBSSxFQUFFLEtBQUs7SUFDWCxPQUFPLEVBQUUsSUFBQSx5QkFBVSxHQUFFO0lBQ3JCLFVBQVUsRUFBRSxHQUFHO0lBQ2YsT0FBTyxFQUFFLEtBQUs7SUFDZCxPQUFPLEVBQUUsT0FBTztJQUNoQixTQUFTLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO0lBQzFDLFNBQVMsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7SUFDMUMsUUFBUSxFQUFFLE9BQU87SUFDakIsYUFBYSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUM7SUFDakUsYUFBYSxFQUFFLEdBQUc7SUFDbEIsZUFBZSxFQUFFLEVBQUU7SUFDbkIseUJBQXlCLEVBQUUsRUFBRTtJQUM3QixxQkFBcUIsRUFBRSxFQUFFO0lBQ3pCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsYUFBYSxFQUFFLEVBQUU7SUFDakIsVUFBVTtDQUNYLENBQUM7QUFFVyxRQUFBLFdBQVcsR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUMvQyxJQUFJLEVBQUUsUUFBUTtJ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VSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3hCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2xCLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFGRCw0QkFFQztBQUVELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxtQkFBVyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUZELDRCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtzdGF0ZUZhY3RvcnksIHByb2Nlc3NFeGl0QWN0aW9uJH0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBHbG9iYWxPcHRpb25zIH0gZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCB7UGF5bG9hZEFjdGlvbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2lzTWFpblRocmVhZCwgdGhyZWFkSWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCB7Z2V0TGFuSVB2NH0gZnJvbSAnLi4vdXRpbHMvbmV0d29yay11dGlsJztcblxuY29uc3Qge2Rpc3REaXIsIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5leHBvcnQgaW50ZXJmYWNlIFBsaW5rU2V0dGluZ3Mge1xuICAvKiogTm9kZS5qcyBzZXJ2ZXIgcG9ydCBudW1iZXIgKi9cbiAgcG9ydDogbnVtYmVyIHwgc3RyaW5nO1xuICBwdWJsaWNQYXRoOiBzdHJpbmc7XG4gIGxvY2FsSVA6IHN0cmluZztcbiAgLyoqXG4gICAqIHByb2Nlc3MuZW52Lk5PREVfRU5WIHdpbGwgYmUgYXV0b21hdGljYWxseVxuICAgKiB1cGRhdGVkIHRvICdkZXZlbG9wZW1lbnQnIG9yICdwcm9kdWN0aW9uIGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBwcm9wZXJ0eVxuICAgKiAqL1xuICBkZXZNb2RlOiBib29sZWFuO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3QgKi9cbiAgZGVzdERpcjogc3RyaW5nO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3Qvc3RhdGljICovXG4gIHN0YXRpY0Rpcjogc3RyaW5nO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3Qvc2VydmVyIHNlcnZlciBzaWRlIHJlbmRlciByZXNvdXJjZSBkaXJlY3RvcnkgKi9cbiAgc2VydmVyRGlyOiBzdHJpbmc7XG4gIC8qKiBSZXBvc2l0b3J5IGRpcmVjdG9yeSAqL1xuICByb290UGF0aDogc3RyaW5nO1xuICAvKiogTm9kZSBwYWNrYWdlIHNjb3BlIG5hbWVzLCBvbWl0IGxlYWRpbmcgXCJAXCIgYW5kIHRhaWxpbmcgXCIvXCIgY2hhcmFjdGVyLFxuICAgKiB3aGVuIHdlIHR5cGUgcGFja2FnZSBuYW1lcyBpbiBjb21tYW5kIGxpbmUsIHdlIGNhbiBvbWl0IHNjb3BlIG5hbWUgcGFydCxcbiAgICogUGxpbmsgY2FuIGd1ZXNzIGNvbXBsZXRlIHBhY2thZ2UgbmFtZSBiYXNlZCBvbiB0aGlzIHByb3BlcnR5XG4gICAqL1xuICBwYWNrYWdlU2NvcGVzOiBzdHJpbmdbXTtcbiAgLyoqIFBsaW5rIGNvbW1hbmQgbGluZSBvcHRpb25zICovXG4gIGNsaU9wdGlvbnM/OiBHbG9iYWxPcHRpb25zO1xuICBsb2dnZXI/OiB7XG4gICAgbm9GaWxlTGltaXQ6IGJvb2xlYW47XG4gICAgb25seUZpbGVPdXQ6IGJvb2xlYW47XG4gIH07XG4gIC8qKiBjb21tYW5kIGxpbmUgXCItLXByb3AgPGpzb24tcGF0aD49PGpzb24tdmFsdWU+XCIgYXJndW1lbnRzICovXG4gIFtjbGlQcm9wOiBzdHJpbmddOiB1bmtub3duO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgb3V0cHV0UGF0aE1hcDoge1twa2dOYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAvKiogZGVmYXVsdCBpcyAnLycgKi9cbiAgbm9kZVJvdXRlUGF0aDogc3RyaW5nO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgc3RhdGljQXNzZXRzVVJMOiBzdHJpbmc7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nOiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ307XG4gIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogc3RyaW5nW107XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBlbmFibGVTb3VyY2VNYXBzOiBib29sZWFuO1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IFBhcnRpYWw8UGxpbmtTZXR0aW5ncz4gPSB7XG4gIHBvcnQ6IDE0MzMzLFxuICBsb2NhbElQOiBnZXRMYW5JUHY0KCksXG4gIHB1YmxpY1BhdGg6ICcvJyxcbiAgZGV2TW9kZTogZmFsc2UsXG4gIGRlc3REaXI6IGRpc3REaXIsXG4gIHN0YXRpY0RpcjogUGF0aC5yZXNvbHZlKGRpc3REaXIsICdzdGF0aWMnKSxcbiAgc2VydmVyRGlyOiBQYXRoLnJlc29sdmUoZGlzdERpciwgJ3NlcnZlcicpLFxuICByb290UGF0aDogcm9vdERpcixcbiAgcGFja2FnZVNjb3BlczogWyd3ZmgnLCAnYmsnLCAnYmstY29yZScsICdkcicsICdkci1jb3JlJywgJ3R5cGVzJ10sXG4gIG5vZGVSb3V0ZVBhdGg6ICcvJyxcbiAgc3RhdGljQXNzZXRzVVJMOiAnJyxcbiAgcGFja2FnZUNvbnRleHRQYXRoTWFwcGluZzoge30sXG4gIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogW10sXG4gIGVuYWJsZVNvdXJjZU1hcHM6IHRydWUsXG4gIG91dHB1dFBhdGhNYXA6IHt9LFxuICBfX2ZpbGVuYW1lXG59O1xuXG5leHBvcnQgY29uc3QgY29uZmlnU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY29uZmlnJyxcbiAgaW5pdGlhbFN0YXRlOiBpbml0aWFsU3RhdGUgYXMgUGxpbmtTZXR0aW5ncyxcbiAgcmVkdWNlcnM6IHtcbiAgICBzYXZlQ2xpT3B0aW9uKHMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxHbG9iYWxPcHRpb25zPikge1xuICAgICAgaWYgKHBheWxvYWQuY29uZmlnKSB7XG4gICAgICAgIC8vIExhdGVyIG9uIHByb2Nlc3MgbWF5IGNoYW5nZSBjd2QgYnkgY2hkaXIoKSwgbWFrZSBzdXJlIGZpbGUgcGF0aHMgYXJlIGFic29sdXRlLCBzbyB0aGF0IGl0IHJlbWFpbnMgY29ycmVjdGx5IGV2ZW4gaW4gZGlmZmVyZW5jZSB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAgICBwYXlsb2FkLmNvbmZpZyA9IHBheWxvYWQuY29uZmlnLm1hcChlbnRyeSA9PiBQYXRoLnJlc29sdmUoZW50cnkpKTtcbiAgICAgIH1cbiAgICAgIHMuY2xpT3B0aW9ucyA9IHBheWxvYWQ7XG4gICAgICBzLmRldk1vZGUgPSBwYXlsb2FkLmRldiA9PT0gdHJ1ZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY29uZmlnU2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx7Y29uZmlnOiBQbGlua1NldHRpbmdzfT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICByZXR1cm4gcngubWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgb3AubWFwKHMgPT4gcy5kZXZNb2RlKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLm1hcChkZXZNb2RlID0+IHtcbiAgICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPSBkZXZNb2RlID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJztcbiAgICAgIH0pXG4gICAgKSxcbiAgICBnZXRTdG9yZSgpLnBpcGUob3AubWFwKHMgPT4gcy5jbGlPcHRpb25zPy52ZXJib3NlKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLmZpbHRlcih2ZXJib3NlID0+ICEhdmVyYm9zZSksXG4gICAgICBvcC5tYXAoKCkgPT4ge1xuICAgICAgICAvLyBpbml0aWFsIGxvZyBjb25maWd1cmUgaXMgaW4gc3RvcmUudHNcbiAgICAgICAgbGV0IGxvZ1BhdHRlcm5QcmVmaXggPSAnJztcbiAgICAgICAgaWYgKHByb2Nlc3Muc2VuZCB8fCAhaXNNYWluVGhyZWFkKVxuICAgICAgICAgIGxvZ1BhdHRlcm5QcmVmaXggKz0gYFtQJHtwcm9jZXNzLnBpZH0uVCR7dGhyZWFkSWR9XSBgO1xuICAgICAgICBsb2c0anMuY29uZmlndXJlKHtcbiAgICAgICAgICBhcHBlbmRlcnM6IHtcbiAgICAgICAgICAgIG91dDoge1xuICAgICAgICAgICAgICB0eXBlOiAnc3Rkb3V0JyxcbiAgICAgICAgICAgICAgbGF5b3V0OiB7dHlwZTogJ3BhdHRlcm4nLCBwYXR0ZXJuOiBsb2dQYXR0ZXJuUHJlZml4ICsgJyVbWyVwXSAlYyVdIC0gJW0nfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2F0ZWdvcmllczoge1xuICAgICAgICAgICAgZGVmYXVsdDoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdkZWJ1Zyd9LFxuICAgICAgICAgICAgcGxpbms6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnZGVidWcnfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2UoMSlcbiAgICApLFxuICAgIHByb2Nlc3NFeGl0QWN0aW9uJC5waXBlKFxuICAgICAgb3AudGFwKCgpID0+IGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgcy5jbGlPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgICAgICBzLnZpZXcgPSB1bmRlZmluZWQ7XG4gICAgICB9KSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5jYXRjaEVycm9yKChleCwgc3JjKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pLFxuICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjb25maWdTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNvbmZpZ1NsaWNlKTtcbn1cbiJdfQ==