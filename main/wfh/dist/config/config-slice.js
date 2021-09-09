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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0RBQXdCO0FBQ3hCLG9DQUEwRDtBQUMxRCxtREFBcUM7QUFDckMseUNBQTJCO0FBRzNCLG9EQUE0QjtBQUM1QixtREFBc0Q7QUFDdEQsd0RBQWlEO0FBR2pELE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBK0N4RSxNQUFNLFlBQVksR0FBc0I7SUFDdEMsSUFBSSxFQUFFLEtBQUs7SUFDWCxPQUFPLEVBQUUsSUFBQSx5QkFBVSxHQUFFO0lBQ3JCLFVBQVUsRUFBRSxHQUFHO0lBQ2YsT0FBTyxFQUFFLEtBQUs7SUFDZCxPQUFPLEVBQUUsT0FBTztJQUNoQixTQUFTLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO0lBQzFDLFNBQVMsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7SUFDMUMsUUFBUSxFQUFFLE9BQU87SUFDakIsYUFBYSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUM7SUFDakUsYUFBYSxFQUFFLEdBQUc7SUFDbEIsZUFBZSxFQUFFLEVBQUU7SUFDbkIseUJBQXlCLEVBQUUsRUFBRTtJQUM3QixxQkFBcUIsRUFBRSxFQUFFO0lBQ3pCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsYUFBYSxFQUFFLEVBQUU7SUFDakIsVUFBVTtDQUNYLENBQUM7QUFFVyxRQUFBLFdBQVcsR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUMvQyxJQUFJLEVBQUUsUUFBUTtJQUNkLFlBQVksRUFBRSxZQUE0QjtJQUMxQyxRQUFRLEVBQUU7UUFDUixhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUErQjtZQUN0RCxDQUFDLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQztZQUN2QixDQUFDLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDO1FBQ25DLENBQUM7S0FDRjtDQUNGLENBQUMsQ0FBQztBQUVVLFFBQUEsVUFBVSxHQUFHLG9CQUFZLENBQUMsa0JBQWtCLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBRXZFLG9CQUFZLENBQUMsT0FBTyxDQUE4QixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtJQUNwRSxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQ2IsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNiLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ2pELEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDZixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO0lBQ2hFLENBQUMsQ0FBQyxDQUNILEVBQ0QsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBQyxPQUFBLE1BQUEsQ0FBQyxDQUFDLFVBQVUsMENBQUUsT0FBTyxDQUFBLEVBQUEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUMzRSxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUMvQixFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRTtRQUNWLHVDQUF1QztRQUN2QyxJQUFJLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztRQUMxQixJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyw2QkFBWTtZQUMvQixnQkFBZ0IsSUFBSSxLQUFLLE9BQU8sQ0FBQyxHQUFHLEtBQUsseUJBQVEsSUFBSSxDQUFDO1FBQ3hELGdCQUFNLENBQUMsU0FBUyxDQUFDO1lBQ2YsU0FBUyxFQUFFO2dCQUNULEdBQUcsRUFBRTtvQkFDSCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxNQUFNLEVBQUUsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsR0FBRyxrQkFBa0IsRUFBQztpQkFDMUU7YUFDRjtZQUNELFVBQVUsRUFBRTtnQkFDVixPQUFPLEVBQUUsRUFBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFDO2dCQUM3QyxLQUFLLEVBQUUsRUFBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFDO2FBQzVDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDWCxFQUNELDBCQUFrQixDQUFDLElBQUksQ0FDckIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNsQyxDQUFDLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUN6QixDQUFDLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUNyQixDQUFDLENBQUMsQ0FBQyxDQUNKLENBQ0YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUN4QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLG1CQUFXLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFGRCw0QkFFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7c3RhdGVGYWN0b3J5LCBwcm9jZXNzRXhpdEFjdGlvbiR9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgR2xvYmFsT3B0aW9ucyB9IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQge1BheWxvYWRBY3Rpb259IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtpc01haW5UaHJlYWQsIHRocmVhZElkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge2dldExhbklQdjR9IGZyb20gJy4uL3V0aWxzL25ldHdvcmstdXRpbCc7XG5pbXBvcnQge1BhY2thZ2VzQ29uZmlnfSBmcm9tICdwYWNrYWdlLXNldHRpbmdzJztcblxuY29uc3Qge2Rpc3REaXIsIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5leHBvcnQgdHlwZSBCYXNlUGxpbmtTZXR0aW5ncyA9IHtcbiAgLyoqIE5vZGUuanMgc2VydmVyIHBvcnQgbnVtYmVyICovXG4gIHBvcnQ6IG51bWJlciB8IHN0cmluZztcbiAgcHVibGljUGF0aDogc3RyaW5nO1xuICBsb2NhbElQOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBwcm9jZXNzLmVudi5OT0RFX0VOViB3aWxsIGJlIGF1dG9tYXRpY2FsbHlcbiAgICogdXBkYXRlZCB0byAnZGV2ZWxvcGVtZW50JyBvciAncHJvZHVjdGlvbiBjb3JyZXNwb25kaW5nIHRvIHRoaXMgcHJvcGVydHlcbiAgICogKi9cbiAgZGV2TW9kZTogYm9vbGVhbjtcbiAgLyoqIGRlZmF1bHQgZGlyZWN0b3J5IGlzIDxyb290RGlyPi9kaXN0ICovXG4gIGRlc3REaXI6IHN0cmluZztcbiAgLyoqIGRlZmF1bHQgZGlyZWN0b3J5IGlzIDxyb290RGlyPi9kaXN0L3N0YXRpYyAqL1xuICBzdGF0aWNEaXI6IHN0cmluZztcbiAgLyoqIGRlZmF1bHQgZGlyZWN0b3J5IGlzIDxyb290RGlyPi9kaXN0L3NlcnZlciBzZXJ2ZXIgc2lkZSByZW5kZXIgcmVzb3VyY2UgZGlyZWN0b3J5ICovXG4gIHNlcnZlckRpcjogc3RyaW5nO1xuICAvKiogUmVwb3NpdG9yeSBkaXJlY3RvcnkgKi9cbiAgcm9vdFBhdGg6IHN0cmluZztcbiAgLyoqIE5vZGUgcGFja2FnZSBzY29wZSBuYW1lcywgb21pdCBsZWFkaW5nIFwiQFwiIGFuZCB0YWlsaW5nIFwiL1wiIGNoYXJhY3RlcixcbiAgICogd2hlbiB3ZSB0eXBlIHBhY2thZ2UgbmFtZXMgaW4gY29tbWFuZCBsaW5lLCB3ZSBjYW4gb21pdCBzY29wZSBuYW1lIHBhcnQsXG4gICAqIFBsaW5rIGNhbiBndWVzcyBjb21wbGV0ZSBwYWNrYWdlIG5hbWUgYmFzZWQgb24gdGhpcyBwcm9wZXJ0eVxuICAgKi9cbiAgcGFja2FnZVNjb3Blczogc3RyaW5nW107XG4gIC8qKiBQbGluayBjb21tYW5kIGxpbmUgb3B0aW9ucyAqL1xuICBjbGlPcHRpb25zPzogR2xvYmFsT3B0aW9ucztcbiAgbG9nZ2VyPzoge1xuICAgIG5vRmlsZUxpbWl0OiBib29sZWFuO1xuICAgIG9ubHlGaWxlT3V0OiBib29sZWFuO1xuICB9O1xuICAvKiogY29tbWFuZCBsaW5lIFwiLS1wcm9wIDxqc29uLXBhdGg+PTxqc29uLXZhbHVlPlwiIGFyZ3VtZW50cyAqL1xuICBbY2xpUHJvcDogc3RyaW5nXTogdW5rbm93bjtcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIG91dHB1dFBhdGhNYXA6IHtbcGtnTmFtZTogc3RyaW5nXTogc3RyaW5nfTtcbiAgLyoqIGRlZmF1bHQgaXMgJy8nICovXG4gIG5vZGVSb3V0ZVBhdGg6IHN0cmluZztcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIHN0YXRpY0Fzc2V0c1VSTDogc3RyaW5nO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgcGFja2FnZUNvbnRleHRQYXRoTWFwcGluZzoge1twYXRoOiBzdHJpbmddOiBzdHJpbmd9O1xuICBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IHN0cmluZ1tdO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgZW5hYmxlU291cmNlTWFwczogYm9vbGVhbjtcbn07XG5cbmV4cG9ydCB0eXBlIERyY3BTZXR0aW5ncyA9IEJhc2VQbGlua1NldHRpbmdzICYgUGFja2FnZXNDb25maWc7XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQmFzZVBsaW5rU2V0dGluZ3MgPSB7XG4gIHBvcnQ6IDE0MzMzLFxuICBsb2NhbElQOiBnZXRMYW5JUHY0KCksXG4gIHB1YmxpY1BhdGg6ICcvJyxcbiAgZGV2TW9kZTogZmFsc2UsXG4gIGRlc3REaXI6IGRpc3REaXIsXG4gIHN0YXRpY0RpcjogUGF0aC5yZXNvbHZlKGRpc3REaXIsICdzdGF0aWMnKSxcbiAgc2VydmVyRGlyOiBQYXRoLnJlc29sdmUoZGlzdERpciwgJ3NlcnZlcicpLFxuICByb290UGF0aDogcm9vdERpcixcbiAgcGFja2FnZVNjb3BlczogWyd3ZmgnLCAnYmsnLCAnYmstY29yZScsICdkcicsICdkci1jb3JlJywgJ3R5cGVzJ10sXG4gIG5vZGVSb3V0ZVBhdGg6ICcvJyxcbiAgc3RhdGljQXNzZXRzVVJMOiAnJyxcbiAgcGFja2FnZUNvbnRleHRQYXRoTWFwcGluZzoge30sXG4gIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogW10sXG4gIGVuYWJsZVNvdXJjZU1hcHM6IHRydWUsXG4gIG91dHB1dFBhdGhNYXA6IHt9LFxuICBfX2ZpbGVuYW1lXG59O1xuXG5leHBvcnQgY29uc3QgY29uZmlnU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY29uZmlnJyxcbiAgaW5pdGlhbFN0YXRlOiBpbml0aWFsU3RhdGUgYXMgRHJjcFNldHRpbmdzLFxuICByZWR1Y2Vyczoge1xuICAgIHNhdmVDbGlPcHRpb24ocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPEdsb2JhbE9wdGlvbnM+KSB7XG4gICAgICBzLmNsaU9wdGlvbnMgPSBwYXlsb2FkO1xuICAgICAgcy5kZXZNb2RlID0gcGF5bG9hZC5kZXYgPT09IHRydWU7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKGNvbmZpZ1NsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8e2NvbmZpZzogQmFzZVBsaW5rU2V0dGluZ3N9PigoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiByeC5tZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICBvcC5tYXAocyA9PiBzLmRldk1vZGUpLCBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3AubWFwKGRldk1vZGUgPT4ge1xuICAgICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViA9IGRldk1vZGUgPyAnZGV2ZWxvcG1lbnQnIDogJ3Byb2R1Y3Rpb24nO1xuICAgICAgfSlcbiAgICApLFxuICAgIGdldFN0b3JlKCkucGlwZShvcC5tYXAocyA9PiBzLmNsaU9wdGlvbnM/LnZlcmJvc2UpLCBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3AuZmlsdGVyKHZlcmJvc2UgPT4gISF2ZXJib3NlKSxcbiAgICAgIG9wLm1hcCgoKSA9PiB7XG4gICAgICAgIC8vIGluaXRpYWwgbG9nIGNvbmZpZ3VyZSBpcyBpbiBzdG9yZS50c1xuICAgICAgICBsZXQgbG9nUGF0dGVyblByZWZpeCA9ICcnO1xuICAgICAgICBpZiAocHJvY2Vzcy5zZW5kIHx8ICFpc01haW5UaHJlYWQpXG4gICAgICAgICAgbG9nUGF0dGVyblByZWZpeCArPSBgW1Ake3Byb2Nlc3MucGlkfS5UJHt0aHJlYWRJZH1dIGA7XG4gICAgICAgIGxvZzRqcy5jb25maWd1cmUoe1xuICAgICAgICAgIGFwcGVuZGVyczoge1xuICAgICAgICAgICAgb3V0OiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdzdGRvdXQnLFxuICAgICAgICAgICAgICBsYXlvdXQ6IHt0eXBlOiAncGF0dGVybicsIHBhdHRlcm46IGxvZ1BhdHRlcm5QcmVmaXggKyAnJVtbJXBdICVjJV0gLSAlbSd9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBjYXRlZ29yaWVzOiB7XG4gICAgICAgICAgICBkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ30sXG4gICAgICAgICAgICBwbGluazoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdkZWJ1Zyd9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFrZSgxKVxuICAgICksXG4gICAgcHJvY2Vzc0V4aXRBY3Rpb24kLnBpcGUoXG4gICAgICBvcC50YXAoKCkgPT4gZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICBzLmNsaU9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gICAgICAgIHMudmlldyA9IHVuZGVmaW5lZDtcbiAgICAgIH0pKVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLmNhdGNoRXJyb3IoKGV4LCBzcmMpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIHJldHVybiBzcmM7XG4gICAgfSksXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKGNvbmZpZ1NsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoY29uZmlnU2xpY2UpO1xufVxuIl19