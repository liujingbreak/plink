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
    })), action$.pipe(op.filter(action => action.type === 'BEFORE_SAVE_STATE'), op.tap(() => exports.dispatcher._change(s => {
        s.cliOptions = undefined;
        s.view = undefined;
    })))).pipe(op.catchError((ex, src) => {
        // tslint:disable-next-line: no-console
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0RBQXdCO0FBQ3hCLG9DQUFzQztBQUN0QyxtREFBcUM7QUFDckMseUNBQTJCO0FBSTNCLE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBK0N4RSxNQUFNLFlBQVksR0FBc0I7SUFDdEMsSUFBSSxFQUFFLEtBQUs7SUFDWCxVQUFVLEVBQUUsR0FBRztJQUNmLE9BQU8sRUFBRSxLQUFLO0lBQ2QsT0FBTyxFQUFFLE9BQU87SUFDaEIsU0FBUyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztJQUMxQyxTQUFTLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO0lBQzFDLFFBQVEsRUFBRSxPQUFPO0lBQ2pCLGFBQWEsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDO0lBQ2pFLGFBQWEsRUFBRSxHQUFHO0lBQ2xCLGVBQWUsRUFBRSxFQUFFO0lBQ25CLHlCQUF5QixFQUFFLEVBQUU7SUFDN0IscUJBQXFCLEVBQUUsRUFBRTtJQUN6QixnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLGFBQWEsRUFBRSxFQUFFO0NBQ2xCLENBQUM7QUFFVyxRQUFBLFdBQVcsR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUMvQyxJQUFJLEVBQUUsUUFBUTtJQUNkLFlBQVk7SUFDWixRQUFRLEVBQUU7UUFDUixhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUErQjtZQUN0RCxDQUFDLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQztZQUN2QixDQUFDLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDO1FBQ25DLENBQUM7S0FDRjtDQUNGLENBQUMsQ0FBQztBQUVVLFFBQUEsVUFBVSxHQUFHLG9CQUFZLENBQUMsa0JBQWtCLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBRXZFLG9CQUFZLENBQUMsT0FBTyxDQUE4QixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtJQUNwRSxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQ2IsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNiLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ2pELEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDZixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO0lBQ2hFLENBQUMsQ0FBQyxDQUNILEVBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxtQkFBbUIsQ0FBQyxFQUNuRSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLGtCQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2xDLENBQUMsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQ0osQ0FDRixDQUFDLElBQUksQ0FDSixFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3hCLHVDQUF1QztRQUN2QyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2xCLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFGRCw0QkFFQztBQUVELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxtQkFBVyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUZELDRCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtzdGF0ZUZhY3Rvcnl9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgR2xvYmFsT3B0aW9ucyB9IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQge1BheWxvYWRBY3Rpb259IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHtQYWNrYWdlc0NvbmZpZ30gZnJvbSAnX3BhY2thZ2Utc2V0dGluZ3MnO1xuY29uc3Qge2Rpc3REaXIsIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5leHBvcnQgaW50ZXJmYWNlIEJhc2VQbGlua1NldHRpbmdzIHtcbiAgLyoqIE5vZGUuanMgc2VydmVyIHBvcnQgbnVtYmVyICovXG4gIHBvcnQ6IG51bWJlciB8IHN0cmluZztcbiAgcHVibGljUGF0aDogc3RyaW5nO1xuICBsb2NhbElQPzogc3RyaW5nO1xuICAvKipcbiAgICogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgd2lsbCBiZSBhdXRvbWF0aWNhbGx5XG4gICAqIHVwZGF0ZWQgdG8gJ2RldmVsb3BlbWVudCcgb3IgJ3Byb2R1Y3Rpb24gY29ycmVzcG9uZGluZyB0byB0aGlzIHByb3BlcnR5XG4gICAqICovXG4gIGRldk1vZGU6IGJvb2xlYW47XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdCAqL1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdC9zdGF0aWMgKi9cbiAgc3RhdGljRGlyOiBzdHJpbmc7XG4gIC8qKiBkZWZhdWx0IGRpcmVjdG9yeSBpcyA8cm9vdERpcj4vZGlzdC9zZXJ2ZXIgc2VydmVyIHNpZGUgcmVuZGVyIHJlc291cmNlIGRpcmVjdG9yeSAqL1xuICBzZXJ2ZXJEaXI6IHN0cmluZztcbiAgLyoqIFJlcG9zaXRvcnkgZGlyZWN0b3J5ICovXG4gIHJvb3RQYXRoOiBzdHJpbmc7XG4gIC8qKiBOb2RlIHBhY2thZ2Ugc2NvcGUgbmFtZXMsIG9taXQgbGVhZGluZyBcIkBcIiBhbmQgdGFpbGluZyBcIi9cIiBjaGFyYWN0ZXIsXG4gICAqIHdoZW4gd2UgdHlwZSBwYWNrYWdlIG5hbWVzIGluIGNvbW1hbmQgbGluZSwgd2UgY2FuIG9taXQgc2NvcGUgbmFtZSBwYXJ0LFxuICAgKiBQbGluayBjYW4gZ3Vlc3MgY29tcGxldGUgcGFja2FnZSBuYW1lIGJhc2VkIG9uIHRoaXMgcHJvcGVydHlcbiAgICovXG4gIHBhY2thZ2VTY29wZXM6IHN0cmluZ1tdO1xuICAvKiogUGxpbmsgY29tbWFuZCBsaW5lIG9wdGlvbnMgKi9cbiAgY2xpT3B0aW9ucz86IEdsb2JhbE9wdGlvbnM7XG4gIGxvZ2dlcj86IHtcbiAgICBub0ZpbGVMaW1pdDogYm9vbGVhbjtcbiAgICBvbmx5RmlsZU91dDogYm9vbGVhbjtcbiAgfTtcbiAgLyoqIGNvbW1hbmQgbGluZSBcIi0tcHJvcCA8anNvbi1wYXRoPj08anNvbi12YWx1ZT5cIiBhcmd1bWVudHMgKi9cbiAgW2NsaVByb3A6IHN0cmluZ106IHVua25vd247XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBvdXRwdXRQYXRoTWFwOiB7W3BrZ05hbWU6IHN0cmluZ106IHN0cmluZ307XG4gIC8qKiBkZWZhdWx0IGlzICcvJyAqL1xuICBub2RlUm91dGVQYXRoOiBzdHJpbmc7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBzdGF0aWNBc3NldHNVUkw6IHN0cmluZztcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIHBhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmc6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nfTtcbiAgYnJvd3NlclNpZGVDb25maWdQcm9wOiBzdHJpbmdbXTtcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGVuYWJsZVNvdXJjZU1hcHM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIERyY3BTZXR0aW5ncyA9IEJhc2VQbGlua1NldHRpbmdzICYgUGFja2FnZXNDb25maWc7XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQmFzZVBsaW5rU2V0dGluZ3MgPSB7XG4gIHBvcnQ6IDE0MzMzLFxuICBwdWJsaWNQYXRoOiAnLycsXG4gIGRldk1vZGU6IGZhbHNlLFxuICBkZXN0RGlyOiBkaXN0RGlyLFxuICBzdGF0aWNEaXI6IFBhdGgucmVzb2x2ZShkaXN0RGlyLCAnc3RhdGljJyksXG4gIHNlcnZlckRpcjogUGF0aC5yZXNvbHZlKGRpc3REaXIsICdzZXJ2ZXInKSxcbiAgcm9vdFBhdGg6IHJvb3REaXIsXG4gIHBhY2thZ2VTY29wZXM6IFsnd2ZoJywgJ2JrJywgJ2JrLWNvcmUnLCAnZHInLCAnZHItY29yZScsICd0eXBlcyddLFxuICBub2RlUm91dGVQYXRoOiAnLycsXG4gIHN0YXRpY0Fzc2V0c1VSTDogJycsXG4gIHBhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmc6IHt9LFxuICBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IFtdLFxuICBlbmFibGVTb3VyY2VNYXBzOiB0cnVlLFxuICBvdXRwdXRQYXRoTWFwOiB7fVxufTtcblxuZXhwb3J0IGNvbnN0IGNvbmZpZ1NsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2NvbmZpZycsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICBzYXZlQ2xpT3B0aW9uKHMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxHbG9iYWxPcHRpb25zPikge1xuICAgICAgcy5jbGlPcHRpb25zID0gcGF5bG9hZDtcbiAgICAgIHMuZGV2TW9kZSA9IHBheWxvYWQuZGV2ID09PSB0cnVlO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhjb25maWdTbGljZSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljPHtjb25maWc6IEJhc2VQbGlua1NldHRpbmdzfT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICByZXR1cm4gcngubWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgb3AubWFwKHMgPT4gcy5kZXZNb2RlKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLm1hcChkZXZNb2RlID0+IHtcbiAgICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPSBkZXZNb2RlID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJztcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ0JFRk9SRV9TQVZFX1NUQVRFJyksXG4gICAgICBvcC50YXAoKCkgPT4gZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICBzLmNsaU9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gICAgICAgIHMudmlldyA9IHVuZGVmaW5lZDtcbiAgICAgIH0pKVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLmNhdGNoRXJyb3IoKGV4LCBzcmMpID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pLFxuICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjb25maWdTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNvbmZpZ1NsaWNlKTtcbn1cbiJdfQ==