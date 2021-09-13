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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
            (0, package_list_helper_1.setTsCompilerOptForNodePath)((0, misc_1.getWorkDir)(), './', compilerOptions, {
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
            const exp = require(Path.resolve(file));
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
    runEach(func, desc) {
        return __awaiter(this, void 0, void 0, function* () {
            let lastRes;
            for (const { file, handler } of this.configHandlers) {
                log.debug(`Read ${desc || 'settings'}:\n  ` + cyan(file));
                const currRes = yield func(file, lastRes, handler);
                if (currRes !== undefined)
                    lastRes = currRes;
            }
            return lastRes;
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0NBQWdDO0FBQ2hDLDJDQUE2QjtBQUM3QixrREFBMEI7QUFFMUIscUNBQW1EO0FBRW5ELHVDQUFvRDtBQUNwRCxtQ0FBaUM7QUFFakMsMkVBQThFO0FBRzlFLDREQUE0QjtBQUU1QiwwRUFBMEU7QUFDMUUsNENBQW9CO0FBQ3BCLG1FQUFtRTtBQUNuRSxNQUFNLEVBQUMsSUFBSSxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBaUQ5QyxNQUFhLGdCQUFnQjtJQWtFM0I7OztPQUdHO0lBQ0gsWUFBWSxlQUFnRjtRQUMxRixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEQsSUFBSSxjQUE0RCxDQUFDO1FBQ2pFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7WUFDbEQsY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBbUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDakc7YUFBTTtZQUNMLGNBQWMsR0FBRyxlQUErRCxDQUFDO1NBQ2xGO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsSUFBQSxpQkFBVSxHQUFFLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBM0VPLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxjQUE0RCxFQUFF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LEdBQUcsT0FBTyxDQUFDO2FBQ3JCO1lBQ0QsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztLQUFBO0lBRUQsV0FBVyxDQUFJLElBQXVFLEVBQUUsSUFBYTtRQUNuRyxJQUFJLE9BQVksQ0FBQztRQUNqQixNQUFNLEdBQUcsR0FBRyxJQUFBLGlCQUFVLEdBQUUsQ0FBQztRQUN6QixLQUFLLE1BQU0sRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNqRCxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxJQUFJLFVBQVUsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBbUIsQ0FBQyxDQUFDO1lBQ3pELElBQUksT0FBTyxLQUFLLFNBQVM7Z0JBQ3ZCLE9BQU8sR0FBRyxPQUFPLENBQUM7U0FDckI7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDOztBQTVHSCw0Q0E2R0M7QUEzR2dCLGtDQUFpQixHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge3JlZ2lzdGVyIGFzIHJlZ2lzdGVyVHNOb2RlfSBmcm9tICd0cy1ub2RlJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuL2NtZC90eXBlcyc7XG5pbXBvcnQge2dldFJvb3REaXIsIGdldFdvcmtEaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7UGxpbmtTZXR0aW5nc30gZnJvbSAnLi9jb25maWcvY29uZmlnLXNsaWNlJztcbmltcG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtEcmFmdH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbi8vIGltcG9ydCB7cmVnaXN0ZXJFeHRlbnNpb24sIGpzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi90cy1jb21waWxlcic7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuY29uc3Qge2N5YW59ID0gY2hhbGs7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZy1oYW5kbGVyJyk7XG5cbmV4cG9ydCB7UGxpbmtTZXR0aW5nc307XG5leHBvcnQgaW50ZXJmYWNlIERyY3BDb25maWcge1xuICAvKipcbiAgICogVXNlZCB0byBydW4gY29tbWFuZCBsaW5lIG9wdGlvbiBcIi1jXCIgc3BlY2lmaWVkIFRTL0pTIGZpbGVzIG9uZSBieSBvbmUgXG4gICAqL1xuICBjb25maWdIYW5kbGVyTWdyOiBCZWhhdmlvclN1YmplY3Q8Q29uZmlnSGFuZGxlck1nciB8IHVuZGVmaW5lZD47XG4gIC8qKiBsb2Rhc2ggbGlrZSBnZXQgZnVuY3Rpb24sIHJldHVybiBzcGVjaWZpYyBzZXR0aW5nIHByb3BlcnR5IHZhbHVlXG4gICAqIEByZXR1cm4gXG4gICAqL1xuICBnZXQ8SyBleHRlbmRzIGtleW9mIFBsaW5rU2V0dGluZ3M+KHBhdGg6IEssIGRlZmF1bHRWYWx1ZT86IFBsaW5rU2V0dGluZ3NbS10pOiBQbGlua1NldHRpbmdzW0tdO1xuICBnZXQocGF0aDogc3RyaW5nIHwgc3RyaW5nW10sIGRlZmF1bHRWYWx1ZT86IGFueSk6IGFueTtcbiAgc2V0PEsgZXh0ZW5kcyBrZXlvZiBQbGlua1NldHRpbmdzPihwYXRoOiBLLCB2YWx1ZTogUGxpbmtTZXR0aW5nc1tLXSB8IGFueSk6IHZvaWQ7XG4gIHNldChwYXRoOiBzdHJpbmcgfCBzdHJpbmdbXSwgdmFsdWU6IGFueSk6IHZvaWQ7XG4gIGNoYW5nZShyZWR1Y2VyOiAoc2V0dGluZzogRHJhZnQ8UGxpbmtTZXR0aW5ncz4pID0+IHZvaWQpOiB2b2lkO1xuICAvKipcbiAgICogUmVzb2x2ZSBhIHBhdGggYmFzZWQgb24gYHJvb3RQYXRoYFxuICAgKiBAbmFtZSByZXNvbHZlXG4gICAqIEBtZW1iZXJvZiBjb25maWdcbiAgICogQHBhcmFtICB7c3RyaW5nfSBwcm9wZXJ0eSBuYW1lIG9yIHByb3BlcnR5IHBhdGgsIGxpa2UgXCJuYW1lXCIsIFwibmFtZS5jaGlsZFByb3BbMV1cIlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9ICAgICBhYnNvbHV0ZSBwYXRoXG4gICAqL1xuICByZXNvbHZlKGRpcjogJ3Jvb3RQYXRoJyB8ICdkZXN0RGlyJyB8ICdzdGF0aWNEaXInIHwgJ3NlcnZlckRpcicsIC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICByZXNvbHZlKC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICAvKiogQHJldHVybiBhbGwgc2V0dGluZ3MgaW4gYSBiaWcgSlNPTiBvYmplY3QgKi9cbiAgKCk6IFBsaW5rU2V0dGluZ3M7XG4gIHJlbG9hZCgpOiBQbGlua1NldHRpbmdzO1xuICAvLyBpbml0KGFyZ3Y6IENsaU9wdGlvbnMpOiBQcm9taXNlPFBsaW5rU2V0dGluZ3M+O1xuICBpbml0U3luYyhhcmd2OiBDbGlPcHRpb25zKTogUGxpbmtTZXR0aW5ncztcbiAgZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxQbGlua1NldHRpbmdzPjtcbiAgLyoqXG4gICAqIENvbmZpZ0hhbmRsZXJNZ3IgY2hhbmdlcyBldmVyeXRpbWUgUGxpbmsgc2V0dGluZ3MgYXJlIGluaXRpYWxpemVkIG9yIHJlbG9hZGVkLlxuICAgKiBDb25maWdIYW5kbGVyTWdyIGlzIHVzZWQgdG8gcnVuIGNvbW1hbmQgbGluZSBvcHRpb24gXCItY1wiIHNwZWNpZmllZCBUUy9KUyBmaWxlcyBvbmUgYnkgb25lLlxuICAgKiBcbiAgICovXG4gIGNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gdm9pZCk6IHZvaWQ7XG4gIC8vIGNvbmZpZ0hhbmRsZXJNZ3JDcmVhdGVkKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gUHJvbWlzZTxhbnk+IHwgdm9pZCk6IFByb21pc2U8dm9pZD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGNvbmZpZ1NldHRpbmcgT3ZlcnJpZGUgcHJvcGVydGllcyBmcm9tIGRpc3QvY29uZmlnLnlhbWwsIHdoaWNoIGlzIGFsc28geW91IGdldCBmcm9tIGBhcGkuY29uZmlnKClgXG5cdCAqIEBwYXJhbSBkcmNwQ2xpQXJndiAoZGVwcmVjYXRlZCkgT3ZlcnJpZGUgY29tbWFuZCBsaW5lIGFyZ3VtZW1udCBmb3IgRFJDUFxuXHQgKi9cbiAgb25Db25maWcoY29uZmlnU2V0dGluZzogUGxpbmtTZXR0aW5ncywgY2xpT3B0OiBDbGlPcHRpb25zKTogdm9pZDtcbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0hhbmRsZXJNZ3Ige1xuICBzdGF0aWMgY29tcGlsZXJPcHRpb25zOiBhbnk7XG4gIHByaXZhdGUgc3RhdGljIF90c05vZGVSZWdpc3RlcmVkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBzdGF0aWMgaW5pdENvbmZpZ0hhbmRsZXJzKGZpbGVBbmRFeHBvcnRzOiBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPiwgcm9vdFBhdGg6IHN0cmluZyk6XG4gIEFycmF5PHtmaWxlOiBzdHJpbmc7IGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiB7XG4gICAgY29uc3QgZXhwb3J0ZWRzOiBBcnJheTx7ZmlsZTogc3RyaW5nOyBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT4gPSBbXTtcblxuICAgIGlmICghQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCkge1xuICAgICAgQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCA9IHRydWU7XG5cbiAgICAgIGNvbnN0IGludGVybmFsVHNjZmdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgICBjb25zdCB7Y29tcGlsZXJPcHRpb25zfSA9IHRzLnJlYWRDb25maWdGaWxlKGludGVybmFsVHNjZmdGaWxlLFxuICAgICAgICBmaWxlID0+IGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpXG4gICAgICApLmNvbmZpZztcbiAgICAgIENvbmZpZ0hhbmRsZXJNZ3IuY29tcGlsZXJPcHRpb25zID0gY29tcGlsZXJPcHRpb25zO1xuXG4gICAgICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoZ2V0V29ya0RpcigpLCAnLi8nLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICAgICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgICAgICB3b3Jrc3BhY2VEaXI6IGdldFdvcmtEaXIoKVxuICAgICAgfSk7XG5cbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5tb2R1bGUgPSAnY29tbW9uanMnO1xuICAgICAgY29tcGlsZXJPcHRpb25zLm5vVW51c2VkTG9jYWxzID0gZmFsc2U7XG4gICAgICBjb21waWxlck9wdGlvbnMuZGlhZ25vc3RpY3MgPSB0cnVlO1xuICAgICAgY29tcGlsZXJPcHRpb25zLmRlY2xhcmF0aW9uID0gZmFsc2U7XG4gICAgICBkZWxldGUgY29tcGlsZXJPcHRpb25zLnJvb3REaXI7XG5cbiAgICAgIC8vIGNvbnNvbGUubG9nKGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgICByZWdpc3RlclRzTm9kZSh7XG4gICAgICAgIHR5cGVDaGVjazogdHJ1ZSxcbiAgICAgICAgY29tcGlsZXJPcHRpb25zLFxuICAgICAgICBza2lwSWdub3JlOiB0cnVlLCAvLyBpbXBvcnRhbnQsIGJ5IFwidHJ1ZVwiIHdpbGwgc2tpcCBmaWxlcyBhcmUgdW5kZXIgbm9kZV9tb2R1bGVzXG4gICAgICAgIGNvbXBpbGVyOiByZXF1aXJlLnJlc29sdmUoJ3R5cGVzY3JpcHQnKSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEltcG9ydGFudCEhIHByZXZlbnQgdHMtbm9kZSBsb29raW5nIGZvciB0c2NvbmZpZy5qc29uIGZyb20gY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAgICAgKi9cbiAgICAgICAgc2tpcFByb2plY3Q6IHRydWVcbiAgICAgICAgLCB0cmFuc2Zvcm1lcnM6IHtcbiAgICAgICAgICBiZWZvcmU6IFtcbiAgICAgICAgICAgIGNvbnRleHQgPT4gKHNyYykgPT4ge1xuICAgICAgICAgICAgICAvLyBsb2cuaW5mbygnYmVmb3JlIHRzLW5vZGUgY29tcGlsZXM6Jywgc3JjLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc3JjLnRleHQpO1xuICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF0sXG4gICAgICAgICAgYWZ0ZXI6IFtcbiAgICAgICAgICAgIGNvbnRleHQgPT4gKHNyYykgPT4ge1xuICAgICAgICAgICAgICAvLyBsb2cuaW5mbygndHMtbm9kZSBjb21waWxlczonLCBzcmMuZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzcmMudGV4dCk7XG4gICAgICAgICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbZmlsZSwgZXhwb3J0TmFtZV0gb2YgZmlsZUFuZEV4cG9ydHMpIHtcbiAgICAgIGNvbnN0IGV4cCA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGZpbGUpKTtcbiAgICAgIGV4cG9ydGVkcy5wdXNoKHtmaWxlLCBoYW5kbGVyOiBleHBbZXhwb3J0TmFtZV0gPyBleHBbZXhwb3J0TmFtZV0gOiBleHB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGV4cG9ydGVkcztcbiAgfVxuICBwcm90ZWN0ZWQgY29uZmlnSGFuZGxlcnM6IEFycmF5PHtmaWxlOiBzdHJpbmc7IGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PjtcblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSBmaWxlcyBBcnJheSBvZiBzdHJpbmcgd2hpY2ggaXMgaW4gZm9ybSBvZiBcIjxmaWxlPlsjPGV4cG9ydCBuYW1lPl1cIlxuICAgKi9cbiAgY29uc3RydWN0b3IoZmlsZUFuZEV4cG9ydHMwOiBJdGVyYWJsZTxzdHJpbmc+IHwgSXRlcmFibGU8W2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXT4pIHtcbiAgICBjb25zdCBmaXJzdCA9IGZpbGVBbmRFeHBvcnRzMFtTeW1ib2wuaXRlcmF0b3JdKCkubmV4dCgpO1xuICAgIGxldCBmaWxlQW5kRXhwb3J0czogSXRlcmFibGU8W2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXT47XG4gICAgaWYgKCFmaXJzdC5kb25lICYmIHR5cGVvZiBmaXJzdC52YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGZpbGVBbmRFeHBvcnRzID0gQXJyYXkuZnJvbShmaWxlQW5kRXhwb3J0czAgYXMgSXRlcmFibGU8c3RyaW5nPikubWFwKGZpbGUgPT4gW2ZpbGUsICdkZWZhdWx0J10pO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaWxlQW5kRXhwb3J0cyA9IGZpbGVBbmRFeHBvcnRzMCBhcyBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPjtcbiAgICB9XG4gICAgdGhpcy5jb25maWdIYW5kbGVycyA9IENvbmZpZ0hhbmRsZXJNZ3IuaW5pdENvbmZpZ0hhbmRsZXJzKGZpbGVBbmRFeHBvcnRzLCBnZXRSb290RGlyKCkpO1xuICB9XG5cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gZnVuYyBwYXJhbWV0ZXJzOiAoZmlsZVBhdGgsIGxhc3QgcmV0dXJuZWQgcmVzdWx0LCBoYW5kbGVyIGZ1bmN0aW9uKSxcblx0ICogcmV0dXJucyB0aGUgY2hhbmdlZCByZXN1bHQsIGtlZXAgdGhlIGxhc3QgcmVzdWx0LCBpZiByZXN0dXJucyB1bmRlZmluZWRcblx0ICogQHJldHVybnMgbGFzdCByZXN1bHRcblx0ICovXG4gIGFzeW5jIHJ1bkVhY2g8SD4oZnVuYzogKGZpbGU6IHN0cmluZywgbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyOiBIKSA9PiBQcm9taXNlPGFueT4gfCBhbnksIGRlc2M/OiBzdHJpbmcpIHtcbiAgICBsZXQgbGFzdFJlczogYW55O1xuICAgIGZvciAoY29uc3Qge2ZpbGUsIGhhbmRsZXJ9IG9mIHRoaXMuY29uZmlnSGFuZGxlcnMpIHtcbiAgICAgIGxvZy5kZWJ1ZyhgUmVhZCAke2Rlc2MgfHwgJ3NldHRpbmdzJ306XFxuICBgICsgY3lhbihmaWxlKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gYXdhaXQgZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxuXG4gIHJ1bkVhY2hTeW5jPEg+KGZ1bmM6IChmaWxlOiBzdHJpbmcsIGxhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcjogSCkgPT4gUHJvbWlzZTxhbnk+IHwgYW55LCBkZXNjPzogc3RyaW5nKSB7XG4gICAgbGV0IGxhc3RSZXM6IGFueTtcbiAgICBjb25zdCBjd2QgPSBnZXRXb3JrRGlyKCk7XG4gICAgZm9yIChjb25zdCB7ZmlsZSwgaGFuZGxlcn0gb2YgdGhpcy5jb25maWdIYW5kbGVycykge1xuICAgICAgbG9nLmRlYnVnKGBSZWFkICR7ZGVzYyB8fCAnc2V0dGluZ3MnfTpcXG4gIGAgKyBjeWFuKFBhdGgucmVsYXRpdmUoY3dkLCBmaWxlKSkpO1xuICAgICAgY29uc3QgY3VyclJlcyA9IGZ1bmMoZmlsZSwgbGFzdFJlcywgaGFuZGxlciBhcyBhbnkgYXMgSCk7XG4gICAgICBpZiAoY3VyclJlcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICBsYXN0UmVzID0gY3VyclJlcztcbiAgICB9XG4gICAgcmV0dXJuIGxhc3RSZXM7XG4gIH1cbn1cblxuXG4iXX0=