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
    localIP: network_util_1.getLanIPv4(),
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
    outputPathMap: {}
};
exports.configSlice = store_1.stateFactory.newSlice({
    name: 'config',
    initialState: initialState,
    reducers: {
        saveCliOption(s, { payload }) {
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
        if (process.send)
            logPatternPrefix = 'pid:%z ';
        else if (!worker_threads_1.isMainThread)
            logPatternPrefix = '[thread]';
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
    }), op.take(1)), action$.pipe(op.filter(action => action.type === 'BEFORE_SAVE_STATE'), op.tap(() => exports.dispatcher._change(s => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0RBQXdCO0FBQ3hCLG9DQUFzQztBQUN0QyxtREFBcUM7QUFDckMseUNBQTJCO0FBRzNCLG9EQUE0QjtBQUM1QixtREFBNEM7QUFDNUMsd0RBQWlEO0FBRWpELE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBK0N4RSxNQUFNLFlBQVksR0FBc0I7SUFDdEMsSUFBSSxFQUFFLEtBQUs7SUFDWCxPQUFPLEVBQUUseUJBQVUsRUFBRTtJQUNyQixVQUFVLEVBQUUsR0FBRztJQUNmLE9BQU8sRUFBRSxLQUFLO0lBQ2QsT0FBTyxFQUFFLE9BQU87SUFDaEIsU0FBUyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztJQUMxQyxTQUFTLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO0lBQzFDLFFBQVEsRUFBRSxPQUFPO0lBQ2pCLGFBQWEsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDO0lBQ2pFLGFBQWEsRUFBRSxHQUFHO0lBQ2xCLGVBQWUsRUFBRSxFQUFFO0lBQ25CLHlCQUF5QixFQUFFLEVBQUU7SUFDN0IscUJBQXFCLEVBQUUsRUFBRTtJQUN6QixnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLGFBQWEsRUFBRSxFQUFFO0NBQ2xCLENBQUM7QUFFVyxRQUFBLFdBQVcsR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUMvQyxJQUFJLEVBQUUsUUFBUTtJQUNkLFlBQVksRUFBRSxZQUE0QjtJQUMxQyxRQUFRLEVBQUU7UUFDUixhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUErQjtZQUN0RCxDQUFDLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQztZQUN2QixDQUFDLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDO1FBQ25DLENBQUM7S0FDRjtDQUNGLENBQUMsQ0FBQztBQUVVLFFBQUEsVUFBVSxHQUFHLG9CQUFZLENBQUMsa0JBQWtCLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBRXZFLG9CQUFZLENBQUMsT0FBTyxDQUE4QixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtJQUNwRSxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQ2IsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNiLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ2pELEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDZixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO0lBQ2hFLENBQUMsQ0FBQyxDQUNILEVBQ0QsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsd0JBQUMsQ0FBQyxDQUFDLFVBQVUsMENBQUUsT0FBTyxHQUFBLENBQUMsRUFBRSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDM0UsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFDL0IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7UUFDVix1Q0FBdUM7UUFDdkMsSUFBSSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7UUFDMUIsSUFBSSxPQUFPLENBQUMsSUFBSTtZQUNkLGdCQUFnQixHQUFHLFNBQVMsQ0FBQzthQUMxQixJQUFJLENBQUMsNkJBQVk7WUFDcEIsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDO1FBQ2hDLGdCQUFNLENBQUMsU0FBUyxDQUFDO1lBQ2YsU0FBUyxFQUFFO2dCQUNULEdBQUcsRUFBRTtvQkFDSCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxNQUFNLEVBQUUsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsR0FBRyxrQkFBa0IsRUFBQztpQkFDMUU7YUFDRjtZQUNELFVBQVUsRUFBRTtnQkFDVixPQUFPLEVBQUUsRUFBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFDO2dCQUM3QyxLQUFLLEVBQUUsRUFBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFDO2FBQzVDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDWCxFQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssbUJBQW1CLENBQUMsRUFDbkUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNsQyxDQUFDLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUN6QixDQUFDLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUNyQixDQUFDLENBQUMsQ0FBQyxDQUNKLENBQ0YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUN4QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLG1CQUFXLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFGRCw0QkFFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7c3RhdGVGYWN0b3J5fSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCB7IEdsb2JhbE9wdGlvbnMgfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtQYXlsb2FkQWN0aW9ufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7aXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge2dldExhbklQdjR9IGZyb20gJy4uL3V0aWxzL25ldHdvcmstdXRpbCc7XG5pbXBvcnQge1BhY2thZ2VzQ29uZmlnfSBmcm9tICdwYWNrYWdlLXNldHRpbmdzJztcbmNvbnN0IHtkaXN0RGlyLCByb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuZXhwb3J0IGludGVyZmFjZSBCYXNlUGxpbmtTZXR0aW5ncyB7XG4gIC8qKiBOb2RlLmpzIHNlcnZlciBwb3J0IG51bWJlciAqL1xuICBwb3J0OiBudW1iZXIgfCBzdHJpbmc7XG4gIHB1YmxpY1BhdGg6IHN0cmluZztcbiAgbG9jYWxJUDogc3RyaW5nO1xuICAvKipcbiAgICogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgd2lsbCBiZSBhdXRvbWF0aWNhbGx5XG4gICAqIHVwZGF0ZWQgdG8gJ2RldmVsb3BlbWVudCcgb3IgJ3Byb2R1Y3Rpb24gY29ycmVzcG9uZGluZyB0byB0aGlzIHByb3BlcnR5XG4gICAqICovXG4gIGRldk1vZGU6IGJvb2xlYW47XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdCAqL1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdC9zdGF0aWMgKi9cbiAgc3RhdGljRGlyOiBzdHJpbmc7XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdC9zZXJ2ZXIgc2VydmVyIHNpZGUgcmVuZGVyIHJlc291cmNlIGRpcmVjdG9yeSAqL1xuICBzZXJ2ZXJEaXI6IHN0cmluZztcbiAgLyoqIFJlcG9zaXRvcnkgZGlyZWN0b3J5ICovXG4gIHJvb3RQYXRoOiBzdHJpbmc7XG4gIC8qKiBOb2RlIHBhY2thZ2Ugc2NvcGUgbmFtZXMsIG9taXQgbGVhZGluZyBcIkBcIiBhbmQgdGFpbGluZyBcIi9cIiBjaGFyYWN0ZXIsXG4gICAqIHdoZW4gd2UgdHlwZSBwYWNrYWdlIG5hbWVzIGluIGNvbW1hbmQgbGluZSwgd2UgY2FuIG9taXQgc2NvcGUgbmFtZSBwYXJ0LFxuICAgKiBQbGluayBjYW4gZ3Vlc3MgY29tcGxldGUgcGFja2FnZSBuYW1lIGJhc2VkIG9uIHRoaXMgcHJvcGVydHlcbiAgICovXG4gIHBhY2thZ2VTY29wZXM6IHN0cmluZ1tdO1xuICAvKiogUGxpbmsgY29tbWFuZCBsaW5lIG9wdGlvbnMgKi9cbiAgY2xpT3B0aW9ucz86IEdsb2JhbE9wdGlvbnM7XG4gIGxvZ2dlcj86IHtcbiAgICBub0ZpbGVMaW1pdDogYm9vbGVhbjtcbiAgICBvbmx5RmlsZU91dDogYm9vbGVhbjtcbiAgfTtcbiAgLyoqIGNvbW1hbmQgbGluZSBcIi0tcHJvcCA8anNvbi1wYXRoPj08anNvbi12YWx1ZT5cIiBhcmd1bWVudHMgKi9cbiAgW2NsaVByb3A6IHN0cmluZ106IHVua25vd247XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBvdXRwdXRQYXRoTWFwOiB7W3BrZ05hbWU6IHN0cmluZ106IHN0cmluZ307XG4gIC8qKiBkZWZhdWx0IGlzICcvJyAqL1xuICBub2RlUm91dGVQYXRoOiBzdHJpbmc7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBzdGF0aWNBc3NldHNVUkw6IHN0cmluZztcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIHBhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmc6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nfTtcbiAgYnJvd3NlclNpZGVDb25maWdQcm9wOiBzdHJpbmdbXTtcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGVuYWJsZVNvdXJjZU1hcHM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIERyY3BTZXR0aW5ncyA9IEJhc2VQbGlua1NldHRpbmdzICYgUGFja2FnZXNDb25maWc7XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQmFzZVBsaW5rU2V0dGluZ3MgPSB7XG4gIHBvcnQ6IDE0MzMzLFxuICBsb2NhbElQOiBnZXRMYW5JUHY0KCksXG4gIHB1YmxpY1BhdGg6ICcvJyxcbiAgZGV2TW9kZTogZmFsc2UsXG4gIGRlc3REaXI6IGRpc3REaXIsXG4gIHN0YXRpY0RpcjogUGF0aC5yZXNvbHZlKGRpc3REaXIsICdzdGF0aWMnKSxcbiAgc2VydmVyRGlyOiBQYXRoLnJlc29sdmUoZGlzdERpciwgJ3NlcnZlcicpLFxuICByb290UGF0aDogcm9vdERpcixcbiAgcGFja2FnZVNjb3BlczogWyd3ZmgnLCAnYmsnLCAnYmstY29yZScsICdkcicsICdkci1jb3JlJywgJ3R5cGVzJ10sXG4gIG5vZGVSb3V0ZVBhdGg6ICcvJyxcbiAgc3RhdGljQXNzZXRzVVJMOiAnJyxcbiAgcGFja2FnZUNvbnRleHRQYXRoTWFwcGluZzoge30sXG4gIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogW10sXG4gIGVuYWJsZVNvdXJjZU1hcHM6IHRydWUsXG4gIG91dHB1dFBhdGhNYXA6IHt9XG59O1xuXG5leHBvcnQgY29uc3QgY29uZmlnU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY29uZmlnJyxcbiAgaW5pdGlhbFN0YXRlOiBpbml0aWFsU3RhdGUgYXMgRHJjcFNldHRpbmdzLFxuICByZWR1Y2Vyczoge1xuICAgIHNhdmVDbGlPcHRpb24ocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPEdsb2JhbE9wdGlvbnM+KSB7XG4gICAgICBzLmNsaU9wdGlvbnMgPSBwYXlsb2FkO1xuICAgICAgcy5kZXZNb2RlID0gcGF5bG9hZC5kZXYgPT09IHRydWU7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKGNvbmZpZ1NsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8e2NvbmZpZzogQmFzZVBsaW5rU2V0dGluZ3N9PigoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiByeC5tZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICBvcC5tYXAocyA9PiBzLmRldk1vZGUpLCBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3AubWFwKGRldk1vZGUgPT4ge1xuICAgICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViA9IGRldk1vZGUgPyAnZGV2ZWxvcG1lbnQnIDogJ3Byb2R1Y3Rpb24nO1xuICAgICAgfSlcbiAgICApLFxuICAgIGdldFN0b3JlKCkucGlwZShvcC5tYXAocyA9PiBzLmNsaU9wdGlvbnM/LnZlcmJvc2UpLCBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3AuZmlsdGVyKHZlcmJvc2UgPT4gISF2ZXJib3NlKSxcbiAgICAgIG9wLm1hcCgoKSA9PiB7XG4gICAgICAgIC8vIGluaXRpYWwgbG9nIGNvbmZpZ3VyZSBpcyBpbiBzdG9yZS50c1xuICAgICAgICBsZXQgbG9nUGF0dGVyblByZWZpeCA9ICcnO1xuICAgICAgICBpZiAocHJvY2Vzcy5zZW5kKVxuICAgICAgICAgIGxvZ1BhdHRlcm5QcmVmaXggPSAncGlkOiV6ICc7XG4gICAgICAgIGVsc2UgaWYgKCFpc01haW5UaHJlYWQpXG4gICAgICAgICAgbG9nUGF0dGVyblByZWZpeCA9ICdbdGhyZWFkXSc7XG4gICAgICAgIGxvZzRqcy5jb25maWd1cmUoe1xuICAgICAgICAgIGFwcGVuZGVyczoge1xuICAgICAgICAgICAgb3V0OiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdzdGRvdXQnLFxuICAgICAgICAgICAgICBsYXlvdXQ6IHt0eXBlOiAncGF0dGVybicsIHBhdHRlcm46IGxvZ1BhdHRlcm5QcmVmaXggKyAnJVtbJXBdICVjJV0gLSAlbSd9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBjYXRlZ29yaWVzOiB7XG4gICAgICAgICAgICBkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ30sXG4gICAgICAgICAgICBwbGluazoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdkZWJ1Zyd9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFrZSgxKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdCRUZPUkVfU0FWRV9TVEFURScpLFxuICAgICAgb3AudGFwKCgpID0+IGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgcy5jbGlPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgICAgICBzLnZpZXcgPSB1bmRlZmluZWQ7XG4gICAgICB9KSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5jYXRjaEVycm9yKChleCwgc3JjKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pLFxuICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjb25maWdTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNvbmZpZ1NsaWNlKTtcbn1cbiJdfQ==