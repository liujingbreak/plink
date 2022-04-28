"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY29uZmlnL2NvbmZpZy1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4QixtREFBc0Q7QUFDdEQsbURBQXFDO0FBQ3JDLHlDQUEyQjtBQUUzQixvREFBNEI7QUFFNUIsb0NBQTBEO0FBRTFELHdEQUFpRDtBQUVqRCxNQUFNLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQThDeEUsTUFBTSxZQUFZLEdBQTJCO0lBQzNDLElBQUksRUFBRSxLQUFLO0lBQ1gsT0FBTyxFQUFFLElBQUEseUJBQVUsR0FBRTtJQUNyQixVQUFVLEVBQUUsR0FBRztJQUNmLE9BQU8sRUFBRSxLQUFLO0lBQ2QsT0FBTyxFQUFFLEtBQUs7SUFDZCxPQUFPLEVBQUUsT0FBTztJQUNoQixTQUFTLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO0lBQzFDLFNBQVMsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7SUFDMUMsUUFBUSxFQUFFLE9BQU87SUFDakIsYUFBYSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUM7SUFDakUsYUFBYSxFQUFFLEdBQUc7SUFDbEIsZUFBZSxFQUFFLEVBQUU7SUFDbkIseUJBQXlCLEVBQUUsRUFBRTtJQUM3QixxQkFBcUIsRUFBRSxFQUFFO0lBQ3pCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsYUFBYSxFQUFFLEVBQUU7SUFDakIsVUFBVTtDQUNYLENBQUM7QUFFVyxRQUFBLFdBQVcsR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FB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LElBQUksQ0FDSixFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3hCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2xCLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsbUJBQVcsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFGRCw0QkFFQztBQUVELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxtQkFBVyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUZELDRCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2lzTWFpblRocmVhZCwgdGhyZWFkSWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtQYXlsb2FkQWN0aW9ufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQge3N0YXRlRmFjdG9yeSwgcHJvY2Vzc0V4aXRBY3Rpb24kfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgeyBHbG9iYWxPcHRpb25zIH0gZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCB7Z2V0TGFuSVB2NH0gZnJvbSAnLi4vdXRpbHMvbmV0d29yay11dGlsJztcblxuY29uc3Qge2Rpc3REaXIsIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5leHBvcnQgaW50ZXJmYWNlIFBsaW5rU2V0dGluZ3Mge1xuICAvKiogTm9kZS5qcyBzZXJ2ZXIgcG9ydCBudW1iZXIgKi9cbiAgcG9ydDogbnVtYmVyIHwgc3RyaW5nO1xuICBwdWJsaWNQYXRoOiBzdHJpbmc7XG4gIGxvY2FsSVA6IHN0cmluZztcbiAgdXNlWWFybjogYm9vbGVhbjtcbiAgLyoqXG4gICAqIHByb2Nlc3MuZW52Lk5PREVfRU5WIHdpbGwgYmUgYXV0b21hdGljYWxseVxuICAgKiB1cGRhdGVkIHRvICdkZXZlbG9wZW1lbnQnIG9yICdwcm9kdWN0aW9uIGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBwcm9wZXJ0eVxuICAgKiAqL1xuICBkZXZNb2RlOiBib29sZWFuO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3QgKi9cbiAgZGVzdERpcjogc3RyaW5nO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3Qvc3RhdGljICovXG4gIHN0YXRpY0Rpcjogc3RyaW5nO1xuICAvKiogZGVmYXVsdCBkaXJlY3RvcnkgaXMgPHJvb3REaXI+L2Rpc3Qvc2VydmVyIHNlcnZlciBzaWRlIHJlbmRlciByZXNvdXJjZSBkaXJlY3RvcnkgKi9cbiAgc2VydmVyRGlyOiBzdHJpbmc7XG4gIC8qKiBSZXBvc2l0b3J5IGRpcmVjdG9yeSAqL1xuICByb290UGF0aDogc3RyaW5nO1xuICAvKiogTm9kZSBwYWNrYWdlIHNjb3BlIG5hbWVzLCBvbWl0IGxlYWRpbmcgXCJAXCIgYW5kIHRhaWxpbmcgXCIvXCIgY2hhcmFjdGVyLFxuICAgKiB3aGVuIHdlIHR5cGUgcGFja2FnZSBuYW1lcyBpbiBjb21tYW5kIGxpbmUsIHdlIGNhbiBvbWl0IHNjb3BlIG5hbWUgcGFydCxcbiAgICogUGxpbmsgY2FuIGd1ZXNzIGNvbXBsZXRlIHBhY2thZ2UgbmFtZSBiYXNlZCBvbiB0aGlzIHByb3BlcnR5XG4gICAqL1xuICBwYWNrYWdlU2NvcGVzOiBzdHJpbmdbXTtcbiAgLyoqIFBsaW5rIGNvbW1hbmQgbGluZSBvcHRpb25zICovXG4gIGNsaU9wdGlvbnM/OiBHbG9iYWxPcHRpb25zO1xuICBsb2dnZXI/OiB7XG4gICAgbm9GaWxlTGltaXQ6IGJvb2xlYW47XG4gICAgb25seUZpbGVPdXQ6IGJvb2xlYW47XG4gIH07XG4gIC8qKiBjb21tYW5kIGxpbmUgXCItLXByb3AgPGpzb24tcGF0aD49PGpzb24tdmFsdWU+XCIgYXJndW1lbnRzICovXG4gIFtjbGlQcm9wOiBzdHJpbmddOiB1bmtub3duO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgb3V0cHV0UGF0aE1hcDoge1twa2dOYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAvKiogZGVmYXVsdCBpcyAnLycgKi9cbiAgbm9kZVJvdXRlUGF0aDogc3RyaW5nO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgc3RhdGljQXNzZXRzVVJMOiBzdHJpbmc7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nOiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ307XG4gIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogc3RyaW5nW107XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBlbmFibGVTb3VyY2VNYXBzOiBib29sZWFuO1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IFBhcnRpYWw8UGxpbmtTZXR0aW5ncz4gPSB7XG4gIHBvcnQ6IDE0MzMzLFxuICBsb2NhbElQOiBnZXRMYW5JUHY0KCksXG4gIHB1YmxpY1BhdGg6ICcvJyxcbiAgZGV2TW9kZTogZmFsc2UsXG4gIHVzZVlhcm46IGZhbHNlLFxuICBkZXN0RGlyOiBkaXN0RGlyLFxuICBzdGF0aWNEaXI6IFBhdGgucmVzb2x2ZShkaXN0RGlyLCAnc3RhdGljJyksXG4gIHNlcnZlckRpcjogUGF0aC5yZXNvbHZlKGRpc3REaXIsICdzZXJ2ZXInKSxcbiAgcm9vdFBhdGg6IHJvb3REaXIsXG4gIHBhY2thZ2VTY29wZXM6IFsnd2ZoJywgJ2JrJywgJ2JrLWNvcmUnLCAnZHInLCAnZHItY29yZScsICd0eXBlcyddLFxuICBub2RlUm91dGVQYXRoOiAnLycsXG4gIHN0YXRpY0Fzc2V0c1VSTDogJycsXG4gIHBhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmc6IHt9LFxuICBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IFtdLFxuICBlbmFibGVTb3VyY2VNYXBzOiB0cnVlLFxuICBvdXRwdXRQYXRoTWFwOiB7fSxcbiAgX19maWxlbmFtZVxufTtcblxuZXhwb3J0IGNvbnN0IGNvbmZpZ1NsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2NvbmZpZycsXG4gIGluaXRpYWxTdGF0ZTogaW5pdGlhbFN0YXRlIGFzIFBsaW5rU2V0dGluZ3MsXG4gIHJlZHVjZXJzOiB7XG4gICAgc2F2ZUNsaU9wdGlvbihzLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248R2xvYmFsT3B0aW9ucz4pIHtcbiAgICAgIGlmIChwYXlsb2FkLmNvbmZpZykge1xuICAgICAgICAvLyBMYXRlciBvbiBwcm9jZXNzIG1heSBjaGFuZ2UgY3dkIGJ5IGNoZGlyKCksIG1ha2Ugc3VyZSBmaWxlIHBhdGhzIGFyZSBhYnNvbHV0ZSwgc28gdGhhdCBpdCByZW1haW5zIGNvcnJlY3RseSBldmVuIGluIGRpZmZlcmVuY2Ugd29ya2luZyBkaXJlY3RvcnlcbiAgICAgICAgcGF5bG9hZC5jb25maWcgPSBwYXlsb2FkLmNvbmZpZy5tYXAoZW50cnkgPT4gUGF0aC5yZXNvbHZlKGVudHJ5KSk7XG4gICAgICB9XG4gICAgICBzLmNsaU9wdGlvbnMgPSBwYXlsb2FkO1xuICAgICAgcy5kZXZNb2RlID0gcGF5bG9hZC5kZXYgPT09IHRydWU7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKGNvbmZpZ1NsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8e2NvbmZpZzogUGxpbmtTZXR0aW5nc30+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIGdldFN0b3JlKCkucGlwZShcbiAgICAgIG9wLm1hcChzID0+IHMuZGV2TW9kZSksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5tYXAoZGV2TW9kZSA9PiB7XG4gICAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WID0gZGV2TW9kZSA/ICdkZXZlbG9wbWVudCcgOiAncHJvZHVjdGlvbic7XG4gICAgICB9KVxuICAgICksXG4gICAgZ2V0U3RvcmUoKS5waXBlKG9wLm1hcChzID0+IHMuY2xpT3B0aW9ucz8udmVyYm9zZSksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5maWx0ZXIodmVyYm9zZSA9PiAhIXZlcmJvc2UpLFxuICAgICAgb3AubWFwKCgpID0+IHtcbiAgICAgICAgLy8gaW5pdGlhbCBsb2cgY29uZmlndXJlIGlzIGluIHN0b3JlLnRzXG4gICAgICAgIGxldCBsb2dQYXR0ZXJuUHJlZml4ID0gJyc7XG4gICAgICAgIGlmIChwcm9jZXNzLnNlbmQgfHwgIWlzTWFpblRocmVhZClcbiAgICAgICAgICBsb2dQYXR0ZXJuUHJlZml4ICs9IGBbUCR7cHJvY2Vzcy5waWR9LlQke3RocmVhZElkfV0gYDtcbiAgICAgICAgbG9nNGpzLmNvbmZpZ3VyZSh7XG4gICAgICAgICAgYXBwZW5kZXJzOiB7XG4gICAgICAgICAgICBvdXQ6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N0ZG91dCcsXG4gICAgICAgICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogbG9nUGF0dGVyblByZWZpeCArICclW1slcF0gJWMlXSAtICVtJ31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGNhdGVnb3JpZXM6IHtcbiAgICAgICAgICAgIGRlZmF1bHQ6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnZGVidWcnfSxcbiAgICAgICAgICAgIHBsaW5rOiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ31cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlKDEpXG4gICAgKSxcbiAgICBwcm9jZXNzRXhpdEFjdGlvbiQucGlwZShcbiAgICAgIG9wLnRhcCgoKSA9PiBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgIHMuY2xpT3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgICAgICAgcy52aWV3ID0gdW5kZWZpbmVkO1xuICAgICAgfSkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuY2F0Y2hFcnJvcigoZXgsIHNyYykgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgcmV0dXJuIHNyYztcbiAgICB9KSxcbiAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoY29uZmlnU2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShjb25maWdTbGljZSk7XG59XG4iXX0=