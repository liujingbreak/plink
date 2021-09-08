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
    outputPathMap: {},
    __filename
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0RBQXdCO0FBQ3hCLG9DQUFzQztBQUN0QyxtREFBcUM7QUFDckMseUNBQTJCO0FBRzNCLG9EQUE0QjtBQUM1QixtREFBc0Q7QUFDdEQsd0RBQWlEO0FBRWpELE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBK0N4RSxNQUFNLFlBQVksR0FBc0I7SUFDdEMsSUFBSSxFQUFFLEtBQUs7SUFDWCxPQUFPLEVBQUUseUJBQVUsRUFBRTtJQUNyQixVQUFVLEVBQUUsR0FBRztJQUNmLE9BQU8sRUFBRSxLQUFLO0lBQ2QsT0FBTyxFQUFFLE9BQU87SUFDaEIsU0FBUyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztJQUMxQyxTQUFTLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO0lBQzFDLFFBQVEsRUFBRSxPQUFPO0lBQ2pCLGFBQWEsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDO0lBQ2pFLGFBQWEsRUFBRSxHQUFHO0lBQ2xCLGVBQWUsRUFBRSxFQUFFO0lBQ25CLHlCQUF5QixFQUFFLEVBQUU7SUFDN0IscUJBQXFCLEVBQUUsRUFBRTtJQUN6QixnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLGFBQWEsRUFBRSxFQUFFO0lBQ2pCLFVBQVU7Q0FDWCxDQUFDO0FBRVcsUUFBQSxXQUFXLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDL0MsSUFBSSxFQUFFLFFBQVE7SUFDZCxZ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O0lBQ2IsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFGRCw0QkFFQztBQUVELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxtQkFBVyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUZELDRCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtzdGF0ZUZhY3Rvcnl9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgR2xvYmFsT3B0aW9ucyB9IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQge1BheWxvYWRBY3Rpb259IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtpc01haW5UaHJlYWQsIHRocmVhZElkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge2dldExhbklQdjR9IGZyb20gJy4uL3V0aWxzL25ldHdvcmstdXRpbCc7XG5pbXBvcnQge1BhY2thZ2VzQ29uZmlnfSBmcm9tICdwYWNrYWdlLXNldHRpbmdzJztcbmNvbnN0IHtkaXN0RGlyLCByb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuZXhwb3J0IHR5cGUgQmFzZVBsaW5rU2V0dGluZ3MgPSB7XG4gIC8qKiBOb2RlLmpzIHNlcnZlciBwb3J0IG51bWJlciAqL1xuICBwb3J0OiBudW1iZXIgfCBzdHJpbmc7XG4gIHB1YmxpY1BhdGg6IHN0cmluZztcbiAgbG9jYWxJUDogc3RyaW5nO1xuICAvKipcbiAgICogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgd2lsbCBiZSBhdXRvbWF0aWNhbGx5XG4gICAqIHVwZGF0ZWQgdG8gJ2RldmVsb3BlbWVudCcgb3IgJ3Byb2R1Y3Rpb24gY29ycmVzcG9uZGluZyB0byB0aGlzIHByb3BlcnR5XG4gICAqICovXG4gIGRldk1vZGU6IGJvb2xlYW47XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdCAqL1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdC9zdGF0aWMgKi9cbiAgc3RhdGljRGlyOiBzdHJpbmc7XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdC9zZXJ2ZXIgc2VydmVyIHNpZGUgcmVuZGVyIHJlc291cmNlIGRpcmVjdG9yeSAqL1xuICBzZXJ2ZXJEaXI6IHN0cmluZztcbiAgLyoqIFJlcG9zaXRvcnkgZGlyZWN0b3J5ICovXG4gIHJvb3RQYXRoOiBzdHJpbmc7XG4gIC8qKiBOb2RlIHBhY2thZ2Ugc2NvcGUgbmFtZXMsIG9taXQgbGVhZGluZyBcIkBcIiBhbmQgdGFpbGluZyBcIi9cIiBjaGFyYWN0ZXIsXG4gICAqIHdoZW4gd2UgdHlwZSBwYWNrYWdlIG5hbWVzIGluIGNvbW1hbmQgbGluZSwgd2UgY2FuIG9taXQgc2NvcGUgbmFtZSBwYXJ0LFxuICAgKiBQbGluayBjYW4gZ3Vlc3MgY29tcGxldGUgcGFja2FnZSBuYW1lIGJhc2VkIG9uIHRoaXMgcHJvcGVydHlcbiAgICovXG4gIHBhY2thZ2VTY29wZXM6IHN0cmluZ1tdO1xuICAvKiogUGxpbmsgY29tbWFuZCBsaW5lIG9wdGlvbnMgKi9cbiAgY2xpT3B0aW9ucz86IEdsb2JhbE9wdGlvbnM7XG4gIGxvZ2dlcj86IHtcbiAgICBub0ZpbGVMaW1pdDogYm9vbGVhbjtcbiAgICBvbmx5RmlsZU91dDogYm9vbGVhbjtcbiAgfTtcbiAgLyoqIGNvbW1hbmQgbGluZSBcIi0tcHJvcCA8anNvbi1wYXRoPj08anNvbi12YWx1ZT5cIiBhcmd1bWVudHMgKi9cbiAgW2NsaVByb3A6IHN0cmluZ106IHVua25vd247XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBvdXRwdXRQYXRoTWFwOiB7W3BrZ05hbWU6IHN0cmluZ106IHN0cmluZ307XG4gIC8qKiBkZWZhdWx0IGlzICcvJyAqL1xuICBub2RlUm91dGVQYXRoOiBzdHJpbmc7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBzdGF0aWNBc3NldHNVUkw6IHN0cmluZztcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIHBhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmc6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nfTtcbiAgYnJvd3NlclNpZGVDb25maWdQcm9wOiBzdHJpbmdbXTtcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGVuYWJsZVNvdXJjZU1hcHM6IGJvb2xlYW47XG59O1xuXG5leHBvcnQgdHlwZSBEcmNwU2V0dGluZ3MgPSBCYXNlUGxpbmtTZXR0aW5ncyAmIFBhY2thZ2VzQ29uZmlnO1xuXG5jb25zdCBpbml0aWFsU3RhdGU6IEJhc2VQbGlua1NldHRpbmdzID0ge1xuICBwb3J0OiAxNDMzMyxcbiAgbG9jYWxJUDogZ2V0TGFuSVB2NCgpLFxuICBwdWJsaWNQYXRoOiAnLycsXG4gIGRldk1vZGU6IGZhbHNlLFxuICBkZXN0RGlyOiBkaXN0RGlyLFxuICBzdGF0aWNEaXI6IFBhdGgucmVzb2x2ZShkaXN0RGlyLCAnc3RhdGljJyksXG4gIHNlcnZlckRpcjogUGF0aC5yZXNvbHZlKGRpc3REaXIsICdzZXJ2ZXInKSxcbiAgcm9vdFBhdGg6IHJvb3REaXIsXG4gIHBhY2thZ2VTY29wZXM6IFsnd2ZoJywgJ2JrJywgJ2JrLWNvcmUnLCAnZHInLCAnZHItY29yZScsICd0eXBlcyddLFxuICBub2RlUm91dGVQYXRoOiAnLycsXG4gIHN0YXRpY0Fzc2V0c1VSTDogJycsXG4gIHBhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmc6IHt9LFxuICBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IFtdLFxuICBlbmFibGVTb3VyY2VNYXBzOiB0cnVlLFxuICBvdXRwdXRQYXRoTWFwOiB7fSxcbiAgX19maWxlbmFtZVxufTtcblxuZXhwb3J0IGNvbnN0IGNvbmZpZ1NsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2NvbmZpZycsXG4gIGluaXRpYWxTdGF0ZTogaW5pdGlhbFN0YXRlIGFzIERyY3BTZXR0aW5ncyxcbiAgcmVkdWNlcnM6IHtcbiAgICBzYXZlQ2xpT3B0aW9uKHMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxHbG9iYWxPcHRpb25zPikge1xuICAgICAgcy5jbGlPcHRpb25zID0gcGF5bG9hZDtcbiAgICAgIHMuZGV2TW9kZSA9IHBheWxvYWQuZGV2ID09PSB0cnVlO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhjb25maWdTbGljZSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljPHtjb25maWc6IEJhc2VQbGlua1NldHRpbmdzfT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICByZXR1cm4gcngubWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgb3AubWFwKHMgPT4gcy5kZXZNb2RlKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLm1hcChkZXZNb2RlID0+IHtcbiAgICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPSBkZXZNb2RlID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJztcbiAgICAgIH0pXG4gICAgKSxcbiAgICBnZXRTdG9yZSgpLnBpcGUob3AubWFwKHMgPT4gcy5jbGlPcHRpb25zPy52ZXJib3NlKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLmZpbHRlcih2ZXJib3NlID0+ICEhdmVyYm9zZSksXG4gICAgICBvcC5tYXAoKCkgPT4ge1xuICAgICAgICAvLyBpbml0aWFsIGxvZyBjb25maWd1cmUgaXMgaW4gc3RvcmUudHNcbiAgICAgICAgbGV0IGxvZ1BhdHRlcm5QcmVmaXggPSAnJztcbiAgICAgICAgaWYgKHByb2Nlc3Muc2VuZCB8fCAhaXNNYWluVGhyZWFkKVxuICAgICAgICAgIGxvZ1BhdHRlcm5QcmVmaXggKz0gYFtQJHtwcm9jZXNzLnBpZH0uVCR7dGhyZWFkSWR9XSBgO1xuICAgICAgICBsb2c0anMuY29uZmlndXJlKHtcbiAgICAgICAgICBhcHBlbmRlcnM6IHtcbiAgICAgICAgICAgIG91dDoge1xuICAgICAgICAgICAgICB0eXBlOiAnc3Rkb3V0JyxcbiAgICAgICAgICAgICAgbGF5b3V0OiB7dHlwZTogJ3BhdHRlcm4nLCBwYXR0ZXJuOiBsb2dQYXR0ZXJuUHJlZml4ICsgJyVbWyVwXSAlYyVdIC0gJW0nfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2F0ZWdvcmllczoge1xuICAgICAgICAgICAgZGVmYXVsdDoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdkZWJ1Zyd9LFxuICAgICAgICAgICAgcGxpbms6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnZGVidWcnfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2UoMSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnQkVGT1JFX1NBVkVfU1RBVEUnKSxcbiAgICAgIG9wLnRhcCgoKSA9PiBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgIHMuY2xpT3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgICAgICAgcy52aWV3ID0gdW5kZWZpbmVkO1xuICAgICAgfSkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuY2F0Y2hFcnJvcigoZXgsIHNyYykgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgcmV0dXJuIHNyYztcbiAgICB9KSxcbiAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoY29uZmlnU2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShjb25maWdTbGljZSk7XG59XG4iXX0=