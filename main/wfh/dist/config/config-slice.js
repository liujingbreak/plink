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
        log4js_1.default.configure({
            appenders: {
                out: {
                    type: 'stdout',
                    layout: { type: 'pattern', pattern: (process.send ? '%z' : '') + '%[[%p] %c%] - %m' }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0RBQXdCO0FBQ3hCLG9DQUFzQztBQUN0QyxtREFBcUM7QUFDckMseUNBQTJCO0FBRzNCLG9EQUE0QjtBQUU1QixNQUFNLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQStDeEUsTUFBTSxZQUFZLEdBQXNCO0lBQ3RDLElBQUksRUFBRSxLQUFLO0lBQ1gsVUFBVSxFQUFFLEdBQUc7SUFDZixPQUFPLEVBQUUsS0FBSztJQUNkLE9BQU8sRUFBRSxPQUFPO0lBQ2hCLFNBQVMsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7SUFDMUMsU0FBUyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztJQUMxQyxRQUFRLEVBQUUsT0FBTztJQUNqQixhQUFhLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQztJQUNqRSxhQUFhLEVBQUUsR0FBRztJQUNsQixlQUFlLEVBQUUsRUFBRTtJQUNuQix5QkFBeUIsRUFBRSxFQUFFO0lBQzdCLHFCQUFxQixFQUFFLEVBQUU7SUFDekIsZ0JBQWdCLEVBQUUsSUFBSTtJQUN0QixhQUFhLEVBQUUsRUFBRTtDQUNsQixDQUFDO0FBRVcsUUFBQSxXQUFXLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDL0MsSUFBSSxFQUFFLFFBQVE7SUFDZCxZQUFZO0lBQ1osUUFBUSxFQUFFO1FBQ1IsYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBK0I7WUFDdEQsQ0FBQyxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUM7WUFDdkIsQ0FBQyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQztRQUNuQyxDQUFDO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFFVSxRQUFBLFVBQVUsR0FBRyxvQkFBWSxDQUFDLGtCQUFrQixDQUFDLG1CQUFXLENBQUMsQ0FBQztBQUV2RSxvQkFBWSxDQUFDLE9BQU8sQ0FBOEIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7SUFDcEUsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUNiLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUNqRCxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztJQUNoRSxDQUFDLENBQUMsQ0FDSCxFQUNELFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLHdCQUFDLENBQUMsQ0FBQyxVQUFVLDBDQUFFLE9BQU8sR0FBQSxDQUFDLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQzNFLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQy9CLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO1FBQ1YsZ0JBQU0sQ0FBQyxTQUFTLENBQUM7WUFDZixTQUFTLEVBQUU7Z0JBQ1QsR0FBRyxFQUFFO29CQUNILElBQUksRUFBRSxRQUFRO29CQUNkLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxrQkFBa0IsRUFBQztpQkFDcEY7YUFDRjtZQUNELFVBQVUsRUFBRTtnQkFDVixPQUFPLEVBQUUsRUFBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFDO2dCQUM3QyxLQUFLLEVBQUUsRUFBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFDO2FBQzVDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDWCxFQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssbUJBQW1CLENBQUMsRUFDbkUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNsQyxDQUFDLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUN6QixDQUFDLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUNyQixDQUFDLENBQUMsQ0FBQyxDQUNKLENBQ0YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUN4QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLG1CQUFXLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFGRCw0QkFFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7c3RhdGVGYWN0b3J5fSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCB7IEdsb2JhbE9wdGlvbnMgfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtQYXlsb2FkQWN0aW9ufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7UGFja2FnZXNDb25maWd9IGZyb20gJ19wYWNrYWdlLXNldHRpbmdzJztcbmNvbnN0IHtkaXN0RGlyLCByb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuZXhwb3J0IGludGVyZmFjZSBCYXNlUGxpbmtTZXR0aW5ncyB7XG4gIC8qKiBOb2RlLmpzIHNlcnZlciBwb3J0IG51bWJlciAqL1xuICBwb3J0OiBudW1iZXIgfCBzdHJpbmc7XG4gIHB1YmxpY1BhdGg6IHN0cmluZztcbiAgbG9jYWxJUD86IHN0cmluZztcbiAgLyoqXG4gICAqIHByb2Nlc3MuZW52Lk5PREVfRU5WIHdpbGwgYmUgYXV0b21hdGljYWxseVxuICAgKiB1cGRhdGVkIHRvICdkZXZlbG9wZW1lbnQnIG9yICdwcm9kdWN0aW9uIGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBwcm9wZXJ0eVxuICAgKiAqL1xuICBkZXZNb2RlOiBib29sZWFuO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3QgKi9cbiAgZGVzdERpcjogc3RyaW5nO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3Qvc3RhdGljICovXG4gIHN0YXRpY0Rpcjogc3RyaW5nO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3Qvc2VydmVyIHNlcnZlciBzaWRlIHJlbmRlciByZXNvdXJjZSBkaXJlY3RvcnkgKi9cbiAgc2VydmVyRGlyOiBzdHJpbmc7XG4gIC8qKiBSZXBvc2l0b3J5IGRpcmVjdG9yeSAqL1xuICByb290UGF0aDogc3RyaW5nO1xuICAvKiogTm9kZSBwYWNrYWdlIHNjb3BlIG5hbWVzLCBvbWl0IGxlYWRpbmcgXCJAXCIgYW5kIHRhaWxpbmcgXCIvXCIgY2hhcmFjdGVyLFxuICAgKiB3aGVuIHdlIHR5cGUgcGFja2FnZSBuYW1lcyBpbiBjb21tYW5kIGxpbmUsIHdlIGNhbiBvbWl0IHNjb3BlIG5hbWUgcGFydCxcbiAgICogUGxpbmsgY2FuIGd1ZXNzIGNvbXBsZXRlIHBhY2thZ2UgbmFtZSBiYXNlZCBvbiB0aGlzIHByb3BlcnR5XG4gICAqL1xuICBwYWNrYWdlU2NvcGVzOiBzdHJpbmdbXTtcbiAgLyoqIFBsaW5rIGNvbW1hbmQgbGluZSBvcHRpb25zICovXG4gIGNsaU9wdGlvbnM/OiBHbG9iYWxPcHRpb25zO1xuICBsb2dnZXI/OiB7XG4gICAgbm9GaWxlTGltaXQ6IGJvb2xlYW47XG4gICAgb25seUZpbGVPdXQ6IGJvb2xlYW47XG4gIH07XG4gIC8qKiBjb21tYW5kIGxpbmUgXCItLXByb3AgPGpzb24tcGF0aD49PGpzb24tdmFsdWU+XCIgYXJndW1lbnRzICovXG4gIFtjbGlQcm9wOiBzdHJpbmddOiB1bmtub3duO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgb3V0cHV0UGF0aE1hcDoge1twa2dOYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAvKiogZGVmYXVsdCBpcyAnLycgKi9cbiAgbm9kZVJvdXRlUGF0aDogc3RyaW5nO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgc3RhdGljQXNzZXRzVVJMOiBzdHJpbmc7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nOiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ307XG4gIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogc3RyaW5nW107XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBlbmFibGVTb3VyY2VNYXBzOiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBEcmNwU2V0dGluZ3MgPSBCYXNlUGxpbmtTZXR0aW5ncyAmIFBhY2thZ2VzQ29uZmlnO1xuXG5jb25zdCBpbml0aWFsU3RhdGU6IEJhc2VQbGlua1NldHRpbmdzID0ge1xuICBwb3J0OiAxNDMzMyxcbiAgcHVibGljUGF0aDogJy8nLFxuICBkZXZNb2RlOiBmYWxzZSxcbiAgZGVzdERpcjogZGlzdERpcixcbiAgc3RhdGljRGlyOiBQYXRoLnJlc29sdmUoZGlzdERpciwgJ3N0YXRpYycpLFxuICBzZXJ2ZXJEaXI6IFBhdGgucmVzb2x2ZShkaXN0RGlyLCAnc2VydmVyJyksXG4gIHJvb3RQYXRoOiByb290RGlyLFxuICBwYWNrYWdlU2NvcGVzOiBbJ3dmaCcsICdiaycsICdiay1jb3JlJywgJ2RyJywgJ2RyLWNvcmUnLCAndHlwZXMnXSxcbiAgbm9kZVJvdXRlUGF0aDogJy8nLFxuICBzdGF0aWNBc3NldHNVUkw6ICcnLFxuICBwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nOiB7fSxcbiAgYnJvd3NlclNpZGVDb25maWdQcm9wOiBbXSxcbiAgZW5hYmxlU291cmNlTWFwczogdHJ1ZSxcbiAgb3V0cHV0UGF0aE1hcDoge31cbn07XG5cbmV4cG9ydCBjb25zdCBjb25maWdTbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdjb25maWcnLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgc2F2ZUNsaU9wdGlvbihzLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248R2xvYmFsT3B0aW9ucz4pIHtcbiAgICAgIHMuY2xpT3B0aW9ucyA9IHBheWxvYWQ7XG4gICAgICBzLmRldk1vZGUgPSBwYXlsb2FkLmRldiA9PT0gdHJ1ZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY29uZmlnU2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx7Y29uZmlnOiBCYXNlUGxpbmtTZXR0aW5nc30+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIGdldFN0b3JlKCkucGlwZShcbiAgICAgIG9wLm1hcChzID0+IHMuZGV2TW9kZSksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5tYXAoZGV2TW9kZSA9PiB7XG4gICAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WID0gZGV2TW9kZSA/ICdkZXZlbG9wbWVudCcgOiAncHJvZHVjdGlvbic7XG4gICAgICB9KVxuICAgICksXG4gICAgZ2V0U3RvcmUoKS5waXBlKG9wLm1hcChzID0+IHMuY2xpT3B0aW9ucz8udmVyYm9zZSksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5maWx0ZXIodmVyYm9zZSA9PiAhIXZlcmJvc2UpLFxuICAgICAgb3AubWFwKCgpID0+IHtcbiAgICAgICAgbG9nNGpzLmNvbmZpZ3VyZSh7XG4gICAgICAgICAgYXBwZW5kZXJzOiB7XG4gICAgICAgICAgICBvdXQ6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N0ZG91dCcsXG4gICAgICAgICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogKHByb2Nlc3Muc2VuZCA/ICcleicgOiAnJykgKyAnJVtbJXBdICVjJV0gLSAlbSd9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBjYXRlZ29yaWVzOiB7XG4gICAgICAgICAgICBkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ30sXG4gICAgICAgICAgICBwbGluazoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdkZWJ1Zyd9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFrZSgxKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdCRUZPUkVfU0FWRV9TVEFURScpLFxuICAgICAgb3AudGFwKCgpID0+IGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgcy5jbGlPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgICAgICBzLnZpZXcgPSB1bmRlZmluZWQ7XG4gICAgICB9KSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5jYXRjaEVycm9yKChleCwgc3JjKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pLFxuICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjb25maWdTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNvbmZpZ1NsaWNlKTtcbn1cbiJdfQ==