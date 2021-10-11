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
exports.ConfigHandlerMgr = void 0;
/* eslint-disable  no-console */
const Path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const ts_node_1 = require("ts-node");
const misc_1 = require("./utils/misc");
const log4js_1 = require("log4js");
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const typescript_1 = __importDefault(require("typescript"));
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
const fs_1 = __importDefault(require("fs"));
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { cyan } = chalk_1.default;
const log = (0, log4js_1.getLogger)('plink.config-handler');
class ConfigHandlerMgr {
    /**
     *
     * @param files Array of string which is in form of "<file>[#<export name>]"
     */
    constructor(fileAndExports0) {
        const first = fileAndExports0[Symbol.iterator]().next();
        let fileAndExports;
        if (!first.done && typeof first.value === 'string') {
            fileAndExports = Array.from(fileAndExports0).map(file => [file, 'default']);
        }
        else {
            fileAndExports = fileAndExports0;
        }
        this.configHandlers = ConfigHandlerMgr.initConfigHandlers(fileAndExports, (0, misc_1.getRootDir)());
    }
    static initConfigHandlers(fileAndExports, rootPath) {
        const exporteds = [];
        if (!ConfigHandlerMgr._tsNodeRegistered) {
            ConfigHandlerMgr._tsNodeRegistered = true;
            const internalTscfgFile = Path.resolve(__dirname, '../tsconfig-base.json');
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const { compilerOptions } = typescript_1.default.readConfigFile(internalTscfgFile, file => fs_1.default.readFileSync(file, 'utf8')).config;
            ConfigHandlerMgr.compilerOptions = compilerOptions;
            (0, package_list_helper_1.setTsCompilerOptForNodePath)(process.cwd(), './', compilerOptions, {
                enableTypeRoots: true,
                workspaceDir: (0, misc_1.getWorkDir)()
            });
            compilerOptions.module = 'commonjs';
            compilerOptions.noUnusedLocals = false;
            compilerOptions.diagnostics = true;
            compilerOptions.declaration = false;
            delete compilerOptions.rootDir;
            // console.log(compilerOptions);
            (0, ts_node_1.register)({
                typeCheck: true,
                compilerOptions,
                skipIgnore: true,
                compiler: require.resolve('typescript'),
                /**
                 * Important!! prevent ts-node looking for tsconfig.json from current working directory
                 */
                skipProject: true,
                transformers: {
                    before: [
                        context => (src) => {
                            // log.info('before ts-node compiles:', src.fileName);
                            // console.log(src.text);
                            return src;
                        }
                    ],
                    after: [
                        context => (src) => {
                            // log.info('ts-node compiles:', src.fileName);
                            // console.log(src.text);
                            return src;
                        }
                    ]
                }
            });
        }
        for (const [file, exportName] of fileAndExports) {
            const absFile = Path.isAbsolute(file) ? file : Path.resolve(file);
            const exp = require(absFile);
            exporteds.push({ file, handler: exp[exportName] ? exp[exportName] : exp });
        }
        return exporteds;
    }
    /**
       *
       * @param func parameters: (filePath, last returned result, handler function),
       * returns the changed result, keep the last result, if resturns undefined
       * @returns last result
       */
    async runEach(func, desc) {
        let lastRes;
        for (const { file, handler } of this.configHandlers) {
            log.debug(`Read ${desc || 'settings'}:\n  ` + cyan(file));
            const currRes = await func(file, lastRes, handler);
            if (currRes !== undefined)
                lastRes = currRes;
        }
        return lastRes;
    }
    runEachSync(func, desc) {
        let lastRes;
        const cwd = (0, misc_1.getWorkDir)();
        for (const { file, handler } of this.configHandlers) {
            log.debug(`Read ${desc || 'settings'}:\n  ` + cyan(Path.relative(cwd, file)));
            const currRes = func(file, lastRes, handler);
            if (currRes !== undefined)
                lastRes = currRes;
        }
        return lastRes;
    }
}
exports.ConfigHandlerMgr = ConfigHandlerMgr;
ConfigHandlerMgr._tsNodeRegistered = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0NBQWdDO0FBQ2hDLDJDQUE2QjtBQUM3QixrREFBMEI7QUFFMUIscUNBQW1EO0FBRW5ELHVDQUFvRDtBQUNwRCxtQ0FBaUM7QUFFakMsMkVBQThFO0FBRzlFLDREQUE0QjtBQUU1QiwwRUFBMEU7QUFDMUUsNENBQW9CO0FBQ3BCLG1FQUFtRTtBQUNuRSxNQUFNLEVBQUMsSUFBSSxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBaUQ5QyxNQUFhLGdCQUFnQjtJQW1FM0I7OztPQUdHO0lBQ0gsWUFBWSxlQUFnRjtRQUMxRixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEQsSUFBSSxjQUE0RCxDQUFDO1FBQ2pFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7WUFDbEQsY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBbUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDakc7YUFBTTtZQUNMLGNBQWMsR0FBRyxlQUErRCxDQUFDO1NBQ2xGO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsSUFBQSxpQkFBVSxHQUFFLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBNUVPLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxjQUE0RCxFQUFFLFFBQWdCO1FB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T0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBbUIsQ0FBQyxDQUFDO1lBQy9ELElBQUksT0FBTyxLQUFLLFNBQVM7Z0JBQ3ZCLE9BQU8sR0FBRyxPQUFPLENBQUM7U0FDckI7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0lBRUQsV0FBVyxDQUFJLElBQXVFLEVBQUUsSUFBYTtRQUNuRyxJQUFJLE9BQVksQ0FBQztRQUNqQixNQUFNLEdBQUcsR0FBRyxJQUFBLGlCQUFVLEdBQUUsQ0FBQztRQUN6QixLQUFLLE1BQU0sRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNqRCxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxJQUFJLFVBQVUsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBbUIsQ0FBQyxDQUFDO1lBQ3pELElBQUksT0FBTyxLQUFLLFNBQVM7Z0JBQ3ZCLE9BQU8sR0FBRyxPQUFPLENBQUM7U0FDckI7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDOztBQTdHSCw0Q0E4R0M7QUE1R2dCLGtDQUFpQixHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge3JlZ2lzdGVyIGFzIHJlZ2lzdGVyVHNOb2RlfSBmcm9tICd0cy1ub2RlJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuL2NtZC90eXBlcyc7XG5pbXBvcnQge2dldFJvb3REaXIsIGdldFdvcmtEaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7UGxpbmtTZXR0aW5nc30gZnJvbSAnLi9jb25maWcvY29uZmlnLXNsaWNlJztcbmltcG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtEcmFmdH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbi8vIGltcG9ydCB7cmVnaXN0ZXJFeHRlbnNpb24sIGpzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi90cy1jb21waWxlcic7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuY29uc3Qge2N5YW59ID0gY2hhbGs7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZy1oYW5kbGVyJyk7XG5cbmV4cG9ydCB7UGxpbmtTZXR0aW5nc307XG5leHBvcnQgaW50ZXJmYWNlIERyY3BDb25maWcge1xuICAvKipcbiAgICogVXNlZCB0byBydW4gY29tbWFuZCBsaW5lIG9wdGlvbiBcIi1jXCIgc3BlY2lmaWVkIFRTL0pTIGZpbGVzIG9uZSBieSBvbmUgXG4gICAqL1xuICBjb25maWdIYW5kbGVyTWdyOiBCZWhhdmlvclN1YmplY3Q8Q29uZmlnSGFuZGxlck1nciB8IHVuZGVmaW5lZD47XG4gIC8qKiBsb2Rhc2ggbGlrZSBnZXQgZnVuY3Rpb24sIHJldHVybiBzcGVjaWZpYyBzZXR0aW5nIHByb3BlcnR5IHZhbHVlXG4gICAqIEByZXR1cm4gXG4gICAqL1xuICBnZXQ8SyBleHRlbmRzIGtleW9mIFBsaW5rU2V0dGluZ3M+KHBhdGg6IEssIGRlZmF1bHRWYWx1ZT86IFBsaW5rU2V0dGluZ3NbS10pOiBQbGlua1NldHRpbmdzW0tdO1xuICBnZXQocGF0aDogc3RyaW5nIHwgc3RyaW5nW10sIGRlZmF1bHRWYWx1ZT86IGFueSk6IGFueTtcbiAgc2V0PEsgZXh0ZW5kcyBrZXlvZiBQbGlua1NldHRpbmdzPihwYXRoOiBLLCB2YWx1ZTogUGxpbmtTZXR0aW5nc1tLXSB8IGFueSk6IHZvaWQ7XG4gIHNldChwYXRoOiBzdHJpbmcgfCBzdHJpbmdbXSwgdmFsdWU6IGFueSk6IHZvaWQ7XG4gIGNoYW5nZShyZWR1Y2VyOiAoc2V0dGluZzogRHJhZnQ8UGxpbmtTZXR0aW5ncz4pID0+IHZvaWQpOiB2b2lkO1xuICAvKipcbiAgICogUmVzb2x2ZSBhIHBhdGggYmFzZWQgb24gYHJvb3RQYXRoYFxuICAgKiBAbmFtZSByZXNvbHZlXG4gICAqIEBtZW1iZXJvZiBjb25maWdcbiAgICogQHBhcmFtICB7c3RyaW5nfSBwcm9wZXJ0eSBuYW1lIG9yIHByb3BlcnR5IHBhdGgsIGxpa2UgXCJuYW1lXCIsIFwibmFtZS5jaGlsZFByb3BbMV1cIlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9ICAgICBhYnNvbHV0ZSBwYXRoXG4gICAqL1xuICByZXNvbHZlKGRpcjogJ3Jvb3RQYXRoJyB8ICdkZXN0RGlyJyB8ICdzdGF0aWNEaXInIHwgJ3NlcnZlckRpcicsIC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICByZXNvbHZlKC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICAvKiogQHJldHVybiBhbGwgc2V0dGluZ3MgaW4gYSBiaWcgSlNPTiBvYmplY3QgKi9cbiAgKCk6IFBsaW5rU2V0dGluZ3M7XG4gIHJlbG9hZCgpOiBQbGlua1NldHRpbmdzO1xuICAvLyBpbml0KGFyZ3Y6IENsaU9wdGlvbnMpOiBQcm9taXNlPFBsaW5rU2V0dGluZ3M+O1xuICBpbml0U3luYyhhcmd2OiBDbGlPcHRpb25zKTogUGxpbmtTZXR0aW5ncztcbiAgZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxQbGlua1NldHRpbmdzPjtcbiAgLyoqXG4gICAqIENvbmZpZ0hhbmRsZXJNZ3IgY2hhbmdlcyBldmVyeXRpbWUgUGxpbmsgc2V0dGluZ3MgYXJlIGluaXRpYWxpemVkIG9yIHJlbG9hZGVkLlxuICAgKiBDb25maWdIYW5kbGVyTWdyIGlzIHVzZWQgdG8gcnVuIGNvbW1hbmQgbGluZSBvcHRpb24gXCItY1wiIHNwZWNpZmllZCBUUy9KUyBmaWxlcyBvbmUgYnkgb25lLlxuICAgKiBcbiAgICovXG4gIGNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gdm9pZCk6IHZvaWQ7XG4gIC8vIGNvbmZpZ0hhbmRsZXJNZ3JDcmVhdGVkKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gUHJvbWlzZTxhbnk+IHwgdm9pZCk6IFByb21pc2U8dm9pZD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGNvbmZpZ1NldHRpbmcgT3ZlcnJpZGUgcHJvcGVydGllcyBmcm9tIGRpc3QvY29uZmlnLnlhbWwsIHdoaWNoIGlzIGFsc28geW91IGdldCBmcm9tIGBhcGkuY29uZmlnKClgXG5cdCAqIEBwYXJhbSBkcmNwQ2xpQXJndiAoZGVwcmVjYXRlZCkgT3ZlcnJpZGUgY29tbWFuZCBsaW5lIGFyZ3VtZW1udCBmb3IgRFJDUFxuXHQgKi9cbiAgb25Db25maWcoY29uZmlnU2V0dGluZzogUGxpbmtTZXR0aW5ncywgY2xpT3B0OiBDbGlPcHRpb25zKTogdm9pZDtcbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0hhbmRsZXJNZ3Ige1xuICBzdGF0aWMgY29tcGlsZXJPcHRpb25zOiBhbnk7XG4gIHByaXZhdGUgc3RhdGljIF90c05vZGVSZWdpc3RlcmVkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBzdGF0aWMgaW5pdENvbmZpZ0hhbmRsZXJzKGZpbGVBbmRFeHBvcnRzOiBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPiwgcm9vdFBhdGg6IHN0cmluZyk6XG4gIEFycmF5PHtmaWxlOiBzdHJpbmc7IGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiB7XG4gICAgY29uc3QgZXhwb3J0ZWRzOiBBcnJheTx7ZmlsZTogc3RyaW5nOyBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT4gPSBbXTtcblxuICAgIGlmICghQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCkge1xuICAgICAgQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCA9IHRydWU7XG5cbiAgICAgIGNvbnN0IGludGVybmFsVHNjZmdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgICBjb25zdCB7Y29tcGlsZXJPcHRpb25zfSA9IHRzLnJlYWRDb25maWdGaWxlKGludGVybmFsVHNjZmdGaWxlLFxuICAgICAgICBmaWxlID0+IGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpXG4gICAgICApLmNvbmZpZztcbiAgICAgIENvbmZpZ0hhbmRsZXJNZ3IuY29tcGlsZXJPcHRpb25zID0gY29tcGlsZXJPcHRpb25zO1xuXG4gICAgICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvY2Vzcy5jd2QoKSwgJy4vJywgY29tcGlsZXJPcHRpb25zLCB7XG4gICAgICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICAgICAgd29ya3NwYWNlRGlyOiBnZXRXb3JrRGlyKClcbiAgICAgIH0pO1xuXG4gICAgICBjb21waWxlck9wdGlvbnMubW9kdWxlID0gJ2NvbW1vbmpzJztcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5ub1VudXNlZExvY2FscyA9IGZhbHNlO1xuICAgICAgY29tcGlsZXJPcHRpb25zLmRpYWdub3N0aWNzID0gdHJ1ZTtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5kZWNsYXJhdGlvbiA9IGZhbHNlO1xuICAgICAgZGVsZXRlIGNvbXBpbGVyT3B0aW9ucy5yb290RGlyO1xuXG4gICAgICAvLyBjb25zb2xlLmxvZyhjb21waWxlck9wdGlvbnMpO1xuICAgICAgcmVnaXN0ZXJUc05vZGUoe1xuICAgICAgICB0eXBlQ2hlY2s6IHRydWUsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9ucyxcbiAgICAgICAgc2tpcElnbm9yZTogdHJ1ZSwgLy8gaW1wb3J0YW50LCBieSBcImZhbHNlXCIgd2lsbCBpZ25vcmUgZmlsZXMgYXJlIHVuZGVyIG5vZGVfbW9kdWxlc1xuICAgICAgICBjb21waWxlcjogcmVxdWlyZS5yZXNvbHZlKCd0eXBlc2NyaXB0JyksXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbXBvcnRhbnQhISBwcmV2ZW50IHRzLW5vZGUgbG9va2luZyBmb3IgdHNjb25maWcuanNvbiBmcm9tIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAgICAgICAgICovXG4gICAgICAgIHNraXBQcm9qZWN0OiB0cnVlXG4gICAgICAgICwgdHJhbnNmb3JtZXJzOiB7XG4gICAgICAgICAgYmVmb3JlOiBbXG4gICAgICAgICAgICBjb250ZXh0ID0+IChzcmMpID0+IHtcbiAgICAgICAgICAgICAgLy8gbG9nLmluZm8oJ2JlZm9yZSB0cy1ub2RlIGNvbXBpbGVzOicsIHNyYy5maWxlTmFtZSk7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHNyYy50ZXh0KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdLFxuICAgICAgICAgIGFmdGVyOiBbXG4gICAgICAgICAgICBjb250ZXh0ID0+IChzcmMpID0+IHtcbiAgICAgICAgICAgICAgLy8gbG9nLmluZm8oJ3RzLW5vZGUgY29tcGlsZXM6Jywgc3JjLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc3JjLnRleHQpO1xuICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2ZpbGUsIGV4cG9ydE5hbWVdIG9mIGZpbGVBbmRFeHBvcnRzKSB7XG4gICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5pc0Fic29sdXRlKGZpbGUpID8gZmlsZSA6IFBhdGgucmVzb2x2ZShmaWxlKTtcbiAgICAgIGNvbnN0IGV4cCA9IHJlcXVpcmUoYWJzRmlsZSkgYXMge1tleHBvcnROYW1lOiBzdHJpbmddOiBhbnl9O1xuICAgICAgZXhwb3J0ZWRzLnB1c2goe2ZpbGUsIGhhbmRsZXI6IGV4cFtleHBvcnROYW1lXSA/IGV4cFtleHBvcnROYW1lXSA6IGV4cH0pO1xuICAgIH1cbiAgICByZXR1cm4gZXhwb3J0ZWRzO1xuICB9XG4gIHByb3RlY3RlZCBjb25maWdIYW5kbGVyczogQXJyYXk8e2ZpbGU6IHN0cmluZzsgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+O1xuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIGZpbGVzIEFycmF5IG9mIHN0cmluZyB3aGljaCBpcyBpbiBmb3JtIG9mIFwiPGZpbGU+WyM8ZXhwb3J0IG5hbWU+XVwiXG4gICAqL1xuICBjb25zdHJ1Y3RvcihmaWxlQW5kRXhwb3J0czA6IEl0ZXJhYmxlPHN0cmluZz4gfCBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPikge1xuICAgIGNvbnN0IGZpcnN0ID0gZmlsZUFuZEV4cG9ydHMwW1N5bWJvbC5pdGVyYXRvcl0oKS5uZXh0KCk7XG4gICAgbGV0IGZpbGVBbmRFeHBvcnRzOiBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPjtcbiAgICBpZiAoIWZpcnN0LmRvbmUgJiYgdHlwZW9mIGZpcnN0LnZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgZmlsZUFuZEV4cG9ydHMgPSBBcnJheS5mcm9tKGZpbGVBbmRFeHBvcnRzMCBhcyBJdGVyYWJsZTxzdHJpbmc+KS5tYXAoZmlsZSA9PiBbZmlsZSwgJ2RlZmF1bHQnXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpbGVBbmRFeHBvcnRzID0gZmlsZUFuZEV4cG9ydHMwIGFzIEl0ZXJhYmxlPFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ10+O1xuICAgIH1cbiAgICB0aGlzLmNvbmZpZ0hhbmRsZXJzID0gQ29uZmlnSGFuZGxlck1nci5pbml0Q29uZmlnSGFuZGxlcnMoZmlsZUFuZEV4cG9ydHMsIGdldFJvb3REaXIoKSk7XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBmdW5jIHBhcmFtZXRlcnM6IChmaWxlUGF0aCwgbGFzdCByZXR1cm5lZCByZXN1bHQsIGhhbmRsZXIgZnVuY3Rpb24pLFxuXHQgKiByZXR1cm5zIHRoZSBjaGFuZ2VkIHJlc3VsdCwga2VlcCB0aGUgbGFzdCByZXN1bHQsIGlmIHJlc3R1cm5zIHVuZGVmaW5lZFxuXHQgKiBAcmV0dXJucyBsYXN0IHJlc3VsdFxuXHQgKi9cbiAgYXN5bmMgcnVuRWFjaDxIPihmdW5jOiAoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXI6IEgpID0+IFByb21pc2U8YW55PiB8IGFueSwgZGVzYz86IHN0cmluZykge1xuICAgIGxldCBsYXN0UmVzOiBhbnk7XG4gICAgZm9yIChjb25zdCB7ZmlsZSwgaGFuZGxlcn0gb2YgdGhpcy5jb25maWdIYW5kbGVycykge1xuICAgICAgbG9nLmRlYnVnKGBSZWFkICR7ZGVzYyB8fCAnc2V0dGluZ3MnfTpcXG4gIGAgKyBjeWFuKGZpbGUpKTtcbiAgICAgIGNvbnN0IGN1cnJSZXMgPSBhd2FpdCBmdW5jKGZpbGUsIGxhc3RSZXMsIGhhbmRsZXIgYXMgYW55IGFzIEgpO1xuICAgICAgaWYgKGN1cnJSZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgbGFzdFJlcyA9IGN1cnJSZXM7XG4gICAgfVxuICAgIHJldHVybiBsYXN0UmVzO1xuICB9XG5cbiAgcnVuRWFjaFN5bmM8SD4oZnVuYzogKGZpbGU6IHN0cmluZywgbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyOiBIKSA9PiBQcm9taXNlPGFueT4gfCBhbnksIGRlc2M/OiBzdHJpbmcpIHtcbiAgICBsZXQgbGFzdFJlczogYW55O1xuICAgIGNvbnN0IGN3ZCA9IGdldFdvcmtEaXIoKTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBsb2cuZGVidWcoYFJlYWQgJHtkZXNjIHx8ICdzZXR0aW5ncyd9OlxcbiAgYCArIGN5YW4oUGF0aC5yZWxhdGl2ZShjd2QsIGZpbGUpKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxufVxuXG5cbiJdfQ==