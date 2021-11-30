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
const worker_threads_1 = require("worker_threads");
const op = __importStar(require("rxjs/operators"));
const rx = __importStar(require("rxjs"));
const log4js_1 = __importDefault(require("log4js"));
const store_1 = require("../store");
const network_util_1 = require("../utils/network-util");
const { distDir, rootDir } = JSON.parse(process.env.__plink);
const initialState = {
    port: 14333,
    localIP: (0, network_util_1.getLanIPv4)(),
    publicPath: '/',
    devMode: false,
    useYarn: false,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLG1EQUFzRDtBQUN0RCxtREFBcUM7QUFDckMseUNBQTJCO0FBRTNCLG9EQUE0QjtBQUU1QixvQ0FBMEQ7QUFFMUQsd0RBQWlEO0FBRWpELE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBOEN4RSxNQUFNLFlBQVksR0FBMkI7SUFDM0MsSUFBSSxFQUFFLEtBQUs7SUFDWCxPQUFPLEVBQUUsSUFBQSx5QkFBVSxHQUFFO0lBQ3JCLFVBQVUsRUFBRSxHQUFHO0lBQ2YsT0FBTyxFQUFFLEtBQUs7SUFDZCxPQUFPLEVBQUUsS0FBSztJQUNkLE9BQU8sRUFBRSxPQUFPO0lBQ2hCLFNBQVMsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7SUFDMUMsU0FBUyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztJQUMxQyxRQUFRLEVBQUUsT0FBTztJQUNqQixhQUFhLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQztJQUNqRSxhQUFhLEVBQUUsR0FBRztJQUNsQixlQUFlLEVBQUUsRUFBRTtJQUNuQix5QkFBeUIsRUFBRSxFQUFFO0lBQzdCLHFCQUFxQixFQUFFLEVBQUU7SUFDekIsZ0JBQWdCLEVBQUUsSUFBSTtJQUN0QixhQUFhLEVBQUUsRUFBRTtJQUNqQixVQUFVO0NBQ1gsQ0FBQztBQUVXLFFBQUEsV0FBVyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lB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SSxDQUNKLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDeEIsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEIsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxtQkFBVyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUZELDRCQUVDO0FBRUQsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLG1CQUFXLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBRkQsNEJBRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7aXNNYWluVGhyZWFkLCB0aHJlYWRJZH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQge1BheWxvYWRBY3Rpb259IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCB7c3RhdGVGYWN0b3J5LCBwcm9jZXNzRXhpdEFjdGlvbiR9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IEdsb2JhbE9wdGlvbnMgfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICcuLi91dGlscy9uZXR3b3JrLXV0aWwnO1xuXG5jb25zdCB7ZGlzdERpciwgcm9vdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbmV4cG9ydCBpbnRlcmZhY2UgUGxpbmtTZXR0aW5ncyB7XG4gIC8qKiBOb2RlLmpzIHNlcnZlciBwb3J0IG51bWJlciAqL1xuICBwb3J0OiBudW1iZXIgfCBzdHJpbmc7XG4gIHB1YmxpY1BhdGg6IHN0cmluZztcbiAgbG9jYWxJUDogc3RyaW5nO1xuICB1c2VZYXJuOiBib29sZWFuO1xuICAvKipcbiAgICogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgd2lsbCBiZSBhdXRvbWF0aWNhbGx5XG4gICAqIHVwZGF0ZWQgdG8gJ2RldmVsb3BlbWVudCcgb3IgJ3Byb2R1Y3Rpb24gY29ycmVzcG9uZGluZyB0byB0aGlzIHByb3BlcnR5XG4gICAqICovXG4gIGRldk1vZGU6IGJvb2xlYW47XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdCAqL1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdC9zdGF0aWMgKi9cbiAgc3RhdGljRGlyOiBzdHJpbmc7XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdC9zZXJ2ZXIgc2VydmVyIHNpZGUgcmVuZGVyIHJlc291cmNlIGRpcmVjdG9yeSAqL1xuICBzZXJ2ZXJEaXI6IHN0cmluZztcbiAgLyoqIFJlcG9zaXRvcnkgZGlyZWN0b3J5ICovXG4gIHJvb3RQYXRoOiBzdHJpbmc7XG4gIC8qKiBOb2RlIHBhY2thZ2Ugc2NvcGUgbmFtZXMsIG9taXQgbGVhZGluZyBcIkBcIiBhbmQgdGFpbGluZyBcIi9cIiBjaGFyYWN0ZXIsXG4gICAqIHdoZW4gd2UgdHlwZSBwYWNrYWdlIG5hbWVzIGluIGNvbW1hbmQgbGluZSwgd2UgY2FuIG9taXQgc2NvcGUgbmFtZSBwYXJ0LFxuICAgKiBQbGluayBjYW4gZ3Vlc3MgY29tcGxldGUgcGFja2FnZSBuYW1lIGJhc2VkIG9uIHRoaXMgcHJvcGVydHlcbiAgICovXG4gIHBhY2thZ2VTY29wZXM6IHN0cmluZ1tdO1xuICAvKiogUGxpbmsgY29tbWFuZCBsaW5lIG9wdGlvbnMgKi9cbiAgY2xpT3B0aW9ucz86IEdsb2JhbE9wdGlvbnM7XG4gIGxvZ2dlcj86IHtcbiAgICBub0ZpbGVMaW1pdDogYm9vbGVhbjtcbiAgICBvbmx5RmlsZU91dDogYm9vbGVhbjtcbiAgfTtcbiAgLyoqIGNvbW1hbmQgbGluZSBcIi0tcHJvcCA8anNvbi1wYXRoPj08anNvbi12YWx1ZT5cIiBhcmd1bWVudHMgKi9cbiAgW2NsaVByb3A6IHN0cmluZ106IHVua25vd247XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBvdXRwdXRQYXRoTWFwOiB7W3BrZ05hbWU6IHN0cmluZ106IHN0cmluZ307XG4gIC8qKiBkZWZhdWx0IGlzICcvJyAqL1xuICBub2RlUm91dGVQYXRoOiBzdHJpbmc7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBzdGF0aWNBc3NldHNVUkw6IHN0cmluZztcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIHBhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmc6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nfTtcbiAgYnJvd3NlclNpZGVDb25maWdQcm9wOiBzdHJpbmdbXTtcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGVuYWJsZVNvdXJjZU1hcHM6IGJvb2xlYW47XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogUGFydGlhbDxQbGlua1NldHRpbmdzPiA9IHtcbiAgcG9ydDogMTQzMzMsXG4gIGxvY2FsSVA6IGdldExhbklQdjQoKSxcbiAgcHVibGljUGF0aDogJy8nLFxuICBkZXZNb2RlOiBmYWxzZSxcbiAgdXNlWWFybjogZmFsc2UsXG4gIGRlc3REaXI6IGRpc3REaXIsXG4gIHN0YXRpY0RpcjogUGF0aC5yZXNvbHZlKGRpc3REaXIsICdzdGF0aWMnKSxcbiAgc2VydmVyRGlyOiBQYXRoLnJlc29sdmUoZGlzdERpciwgJ3NlcnZlcicpLFxuICByb290UGF0aDogcm9vdERpcixcbiAgcGFja2FnZVNjb3BlczogWyd3ZmgnLCAnYmsnLCAnYmstY29yZScsICdkcicsICdkci1jb3JlJywgJ3R5cGVzJ10sXG4gIG5vZGVSb3V0ZVBhdGg6ICcvJyxcbiAgc3RhdGljQXNzZXRzVVJMOiAnJyxcbiAgcGFja2FnZUNvbnRleHRQYXRoTWFwcGluZzoge30sXG4gIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogW10sXG4gIGVuYWJsZVNvdXJjZU1hcHM6IHRydWUsXG4gIG91dHB1dFBhdGhNYXA6IHt9LFxuICBfX2ZpbGVuYW1lXG59O1xuXG5leHBvcnQgY29uc3QgY29uZmlnU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY29uZmlnJyxcbiAgaW5pdGlhbFN0YXRlOiBpbml0aWFsU3RhdGUgYXMgUGxpbmtTZXR0aW5ncyxcbiAgcmVkdWNlcnM6IHtcbiAgICBzYXZlQ2xpT3B0aW9uKHMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxHbG9iYWxPcHRpb25zPikge1xuICAgICAgaWYgKHBheWxvYWQuY29uZmlnKSB7XG4gICAgICAgIC8vIExhdGVyIG9uIHByb2Nlc3MgbWF5IGNoYW5nZSBjd2QgYnkgY2hkaXIoKSwgbWFrZSBzdXJlIGZpbGUgcGF0aHMgYXJlIGFic29sdXRlLCBzbyB0aGF0IGl0IHJlbWFpbnMgY29ycmVjdGx5IGV2ZW4gaW4gZGlmZmVyZW5jZSB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAgICBwYXlsb2FkLmNvbmZpZyA9IHBheWxvYWQuY29uZmlnLm1hcChlbnRyeSA9PiBQYXRoLnJlc29sdmUoZW50cnkpKTtcbiAgICAgIH1cbiAgICAgIHMuY2xpT3B0aW9ucyA9IHBheWxvYWQ7XG4gICAgICBzLmRldk1vZGUgPSBwYXlsb2FkLmRldiA9PT0gdHJ1ZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY29uZmlnU2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx7Y29uZmlnOiBQbGlua1NldHRpbmdzfT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICByZXR1cm4gcngubWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgb3AubWFwKHMgPT4gcy5kZXZNb2RlKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLm1hcChkZXZNb2RlID0+IHtcbiAgICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPSBkZXZNb2RlID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJztcbiAgICAgIH0pXG4gICAgKSxcbiAgICBnZXRTdG9yZSgpLnBpcGUob3AubWFwKHMgPT4gcy5jbGlPcHRpb25zPy52ZXJib3NlKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLmZpbHRlcih2ZXJib3NlID0+ICEhdmVyYm9zZSksXG4gICAgICBvcC5tYXAoKCkgPT4ge1xuICAgICAgICAvLyBpbml0aWFsIGxvZyBjb25maWd1cmUgaXMgaW4gc3RvcmUudHNcbiAgICAgICAgbGV0IGxvZ1BhdHRlcm5QcmVmaXggPSAnJztcbiAgICAgICAgaWYgKHByb2Nlc3Muc2VuZCB8fCAhaXNNYWluVGhyZWFkKVxuICAgICAgICAgIGxvZ1BhdHRlcm5QcmVmaXggKz0gYFtQJHtwcm9jZXNzLnBpZH0uVCR7dGhyZWFkSWR9XSBgO1xuICAgICAgICBsb2c0anMuY29uZmlndXJlKHtcbiAgICAgICAgICBhcHBlbmRlcnM6IHtcbiAgICAgICAgICAgIG91dDoge1xuICAgICAgICAgICAgICB0eXBlOiAnc3Rkb3V0JyxcbiAgICAgICAgICAgICAgbGF5b3V0OiB7dHlwZTogJ3BhdHRlcm4nLCBwYXR0ZXJuOiBsb2dQYXR0ZXJuUHJlZml4ICsgJyVbWyVwXSAlYyVdIC0gJW0nfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2F0ZWdvcmllczoge1xuICAgICAgICAgICAgZGVmYXVsdDoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdkZWJ1Zyd9LFxuICAgICAgICAgICAgcGxpbms6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnZGVidWcnfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2UoMSlcbiAgICApLFxuICAgIHByb2Nlc3NFeGl0QWN0aW9uJC5waXBlKFxuICAgICAgb3AudGFwKCgpID0+IGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgcy5jbGlPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgICAgICBzLnZpZXcgPSB1bmRlZmluZWQ7XG4gICAgICB9KSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5jYXRjaEVycm9yKChleCwgc3JjKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pLFxuICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjb25maWdTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNvbmZpZ1NsaWNlKTtcbn1cbiJdfQ==