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
const { distDir, rootDir } = JSON.parse(process.env.__plink);
const initialState = {
    port: 14333,
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
    initialState,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0RBQXdCO0FBQ3hCLG9DQUFzQztBQUN0QyxtREFBcUM7QUFDckMseUNBQTJCO0FBRzNCLG9EQUE0QjtBQUM1QixtREFBNEM7QUFFNUMsTUFBTSxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBUSxDQUFhLENBQUM7QUErQ3hFLE1BQU0sWUFBWSxHQUFzQjtJQUN0QyxJQUFJLEVBQUUsS0FBSztJQUNYLFVBQVUsRUFBRSxHQUFHO0lBQ2YsT0FBTyxFQUFFLEtBQUs7SUFDZCxPQUFPLEVBQUUsT0FBTztJQUNoQixTQUFTLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO0lBQzFDLFNBQVMsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7SUFDMUMsUUFBUSxFQUFFLE9BQU87SUFDakIsYUFBYSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUM7SUFDakUsYUFBYSxFQUFFLEdBQUc7SUFDbEIsZUFBZSxFQUFFLEVBQUU7SUFDbkIseUJBQXlCLEVBQUUsRUFBRTtJQUM3QixxQkFBcUIsRUFBRSxFQUFFO0lBQ3pCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsYUFBYSxFQUFFLEVBQUU7Q0FDbEIsQ0FBQztBQUVXLFFBQUEsV0FBVyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQy9DLElBQUksRUFBRSxRQUFRO0lBQ2QsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLGFBQWEsQ0FBQyxDQUFDLEVBQUUsRUFBQyxP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QyxDQUFDLENBQUM7QUFFSCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFGRCw0QkFFQztBQUVELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxtQkFBVyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUZELDRCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtzdGF0ZUZhY3Rvcnl9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgR2xvYmFsT3B0aW9ucyB9IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQge1BheWxvYWRBY3Rpb259IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtpc01haW5UaHJlYWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCB7UGFja2FnZXNDb25maWd9IGZyb20gJ19wYWNrYWdlLXNldHRpbmdzJztcbmNvbnN0IHtkaXN0RGlyLCByb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuZXhwb3J0IGludGVyZmFjZSBCYXNlUGxpbmtTZXR0aW5ncyB7XG4gIC8qKiBOb2RlLmpzIHNlcnZlciBwb3J0IG51bWJlciAqL1xuICBwb3J0OiBudW1iZXIgfCBzdHJpbmc7XG4gIHB1YmxpY1BhdGg6IHN0cmluZztcbiAgbG9jYWxJUD86IHN0cmluZztcbiAgLyoqXG4gICAqIHByb2Nlc3MuZW52Lk5PREVfRU5WIHdpbGwgYmUgYXV0b21hdGljYWxseVxuICAgKiB1cGRhdGVkIHRvICdkZXZlbG9wZW1lbnQnIG9yICdwcm9kdWN0aW9uIGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBwcm9wZXJ0eVxuICAgKiAqL1xuICBkZXZNb2RlOiBib29sZWFuO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3QgKi9cbiAgZGVzdERpcjogc3RyaW5nO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3Qvc3RhdGljICovXG4gIHN0YXRpY0Rpcjogc3RyaW5nO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3Qvc2VydmVyIHNlcnZlciBzaWRlIHJlbmRlciByZXNvdXJjZSBkaXJlY3RvcnkgKi9cbiAgc2VydmVyRGlyOiBzdHJpbmc7XG4gIC8qKiBSZXBvc2l0b3J5IGRpcmVjdG9yeSAqL1xuICByb290UGF0aDogc3RyaW5nO1xuICAvKiogTm9kZSBwYWNrYWdlIHNjb3BlIG5hbWVzLCBvbWl0IGxlYWRpbmcgXCJAXCIgYW5kIHRhaWxpbmcgXCIvXCIgY2hhcmFjdGVyLFxuICAgKiB3aGVuIHdlIHR5cGUgcGFja2FnZSBuYW1lcyBpbiBjb21tYW5kIGxpbmUsIHdlIGNhbiBvbWl0IHNjb3BlIG5hbWUgcGFydCxcbiAgICogUGxpbmsgY2FuIGd1ZXNzIGNvbXBsZXRlIHBhY2thZ2UgbmFtZSBiYXNlZCBvbiB0aGlzIHByb3BlcnR5XG4gICAqL1xuICBwYWNrYWdlU2NvcGVzOiBzdHJpbmdbXTtcbiAgLyoqIFBsaW5rIGNvbW1hbmQgbGluZSBvcHRpb25zICovXG4gIGNsaU9wdGlvbnM/OiBHbG9iYWxPcHRpb25zO1xuICBsb2dnZXI/OiB7XG4gICAgbm9GaWxlTGltaXQ6IGJvb2xlYW47XG4gICAgb25seUZpbGVPdXQ6IGJvb2xlYW47XG4gIH07XG4gIC8qKiBjb21tYW5kIGxpbmUgXCItLXByb3AgPGpzb24tcGF0aD49PGpzb24tdmFsdWU+XCIgYXJndW1lbnRzICovXG4gIFtjbGlQcm9wOiBzdHJpbmddOiB1bmtub3duO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgb3V0cHV0UGF0aE1hcDoge1twa2dOYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAvKiogZGVmYXVsdCBpcyAnLycgKi9cbiAgbm9kZVJvdXRlUGF0aDogc3RyaW5nO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgc3RhdGljQXNzZXRzVVJMOiBzdHJpbmc7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nOiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ307XG4gIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogc3RyaW5nW107XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBlbmFibGVTb3VyY2VNYXBzOiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBEcmNwU2V0dGluZ3MgPSBCYXNlUGxpbmtTZXR0aW5ncyAmIFBhY2thZ2VzQ29uZmlnO1xuXG5jb25zdCBpbml0aWFsU3RhdGU6IEJhc2VQbGlua1NldHRpbmdzID0ge1xuICBwb3J0OiAxNDMzMyxcbiAgcHVibGljUGF0aDogJy8nLFxuICBkZXZNb2RlOiBmYWxzZSxcbiAgZGVzdERpcjogZGlzdERpcixcbiAgc3RhdGljRGlyOiBQYXRoLnJlc29sdmUoZGlzdERpciwgJ3N0YXRpYycpLFxuICBzZXJ2ZXJEaXI6IFBhdGgucmVzb2x2ZShkaXN0RGlyLCAnc2VydmVyJyksXG4gIHJvb3RQYXRoOiByb290RGlyLFxuICBwYWNrYWdlU2NvcGVzOiBbJ3dmaCcsICdiaycsICdiay1jb3JlJywgJ2RyJywgJ2RyLWNvcmUnLCAndHlwZXMnXSxcbiAgbm9kZVJvdXRlUGF0aDogJy8nLFxuICBzdGF0aWNBc3NldHNVUkw6ICcnLFxuICBwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nOiB7fSxcbiAgYnJvd3NlclNpZGVDb25maWdQcm9wOiBbXSxcbiAgZW5hYmxlU291cmNlTWFwczogdHJ1ZSxcbiAgb3V0cHV0UGF0aE1hcDoge31cbn07XG5cbmV4cG9ydCBjb25zdCBjb25maWdTbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdjb25maWcnLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgc2F2ZUNsaU9wdGlvbihzLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248R2xvYmFsT3B0aW9ucz4pIHtcbiAgICAgIHMuY2xpT3B0aW9ucyA9IHBheWxvYWQ7XG4gICAgICBzLmRldk1vZGUgPSBwYXlsb2FkLmRldiA9PT0gdHJ1ZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY29uZmlnU2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx7Y29uZmlnOiBCYXNlUGxpbmtTZXR0aW5nc30+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIGdldFN0b3JlKCkucGlwZShcbiAgICAgIG9wLm1hcChzID0+IHMuZGV2TW9kZSksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5tYXAoZGV2TW9kZSA9PiB7XG4gICAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WID0gZGV2TW9kZSA/ICdkZXZlbG9wbWVudCcgOiAncHJvZHVjdGlvbic7XG4gICAgICB9KVxuICAgICksXG4gICAgZ2V0U3RvcmUoKS5waXBlKG9wLm1hcChzID0+IHMuY2xpT3B0aW9ucz8udmVyYm9zZSksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5maWx0ZXIodmVyYm9zZSA9PiAhIXZlcmJvc2UpLFxuICAgICAgb3AubWFwKCgpID0+IHtcbiAgICAgICAgLy8gaW5pdGlhbCBsb2cgY29uZmlndXJlIGlzIGluIHN0b3JlLnRzXG4gICAgICAgIGxldCBsb2dQYXR0ZXJuUHJlZml4ID0gJyc7XG4gICAgICAgIGlmIChwcm9jZXNzLnNlbmQpXG4gICAgICAgICAgbG9nUGF0dGVyblByZWZpeCA9ICdwaWQ6JXogJztcbiAgICAgICAgZWxzZSBpZiAoIWlzTWFpblRocmVhZClcbiAgICAgICAgICBsb2dQYXR0ZXJuUHJlZml4ID0gJ1t0aHJlYWRdJztcbiAgICAgICAgbG9nNGpzLmNvbmZpZ3VyZSh7XG4gICAgICAgICAgYXBwZW5kZXJzOiB7XG4gICAgICAgICAgICBvdXQ6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N0ZG91dCcsXG4gICAgICAgICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogbG9nUGF0dGVyblByZWZpeCArICclW1slcF0gJWMlXSAtICVtJ31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGNhdGVnb3JpZXM6IHtcbiAgICAgICAgICAgIGRlZmF1bHQ6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnZGVidWcnfSxcbiAgICAgICAgICAgIHBsaW5rOiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ31cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlKDEpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ0JFRk9SRV9TQVZFX1NUQVRFJyksXG4gICAgICBvcC50YXAoKCkgPT4gZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICBzLmNsaU9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gICAgICAgIHMudmlldyA9IHVuZGVmaW5lZDtcbiAgICAgIH0pKVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLmNhdGNoRXJyb3IoKGV4LCBzcmMpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIHJldHVybiBzcmM7XG4gICAgfSksXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKGNvbmZpZ1NsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoY29uZmlnU2xpY2UpO1xufVxuIl19