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
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
const fs_1 = __importDefault(require("fs"));
const { parse } = require('comment-json');
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
            const { compilerOptions } = parse(fs_1.default.readFileSync(internalTscfgFile, 'utf8'));
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
                            log.info('before ts-node compiles:', src.fileName);
                            // console.log(src.text);
                            return src;
                        }
                    ],
                    after: [
                        context => (src) => {
                            log.info('ts-node compiles:', src.fileName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0NBQWdDO0FBQ2hDLDJDQUE2QjtBQUM3QixrREFBMEI7QUFFMUIscUNBQW1EO0FBRW5ELHVDQUFvRDtBQUNwRCxtQ0FBaUM7QUFFakMsMkVBQThFO0FBRzlFLDBFQUEwRTtBQUMxRSw0Q0FBb0I7QUFDcEIsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLEVBQUMsSUFBSSxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBZ0Q5QyxNQUFhLGdCQUFnQjtJQWdFM0I7OztPQUdHO0lBQ0gsWUFBWSxlQUFnRjtRQUMxRixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEQsSUFBSSxjQUE0RCxDQUFDO1FBQ2pFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7WUFDbEQsY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBbUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDakc7YUFBTTtZQUNMLGNBQWMsR0FBRyxlQUErRCxDQUFDO1NBQ2xGO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsSUFBQSxpQkFBVSxHQUFFLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBekVPLE1B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RSxPQUFPLEVBQUUsT0FBbUIsQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLE9BQU8sS0FBSyxTQUFTO29CQUN2QixPQUFPLEdBQUcsT0FBTyxDQUFDO2FBQ3JCO1lBQ0QsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztLQUFBO0lBRUQsV0FBVyxDQUFJLElBQXVFLEVBQUUsSUFBYTtRQUNuRyxJQUFJLE9BQVksQ0FBQztRQUNqQixNQUFNLEdBQUcsR0FBRyxJQUFBLGlCQUFVLEdBQUUsQ0FBQztRQUN6QixLQUFLLE1BQU0sRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNqRCxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxJQUFJLFVBQVUsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBbUIsQ0FBQyxDQUFDO1lBQ3pELElBQUksT0FBTyxLQUFLLFNBQVM7Z0JBQ3ZCLE9BQU8sR0FBRyxPQUFPLENBQUM7U0FDckI7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDOztBQTFHSCw0Q0EyR0M7QUF6R2dCLGtDQUFpQixHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge3JlZ2lzdGVyIGFzIHJlZ2lzdGVyVHNOb2RlfSBmcm9tICd0cy1ub2RlJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuL2NtZC90eXBlcyc7XG5pbXBvcnQge2dldFJvb3REaXIsIGdldFdvcmtEaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7RHJjcFNldHRpbmdzfSBmcm9tICcuL2NvbmZpZy9jb25maWctc2xpY2UnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge0RyYWZ0fSBmcm9tICdAcmVkdXhqcy90b29sa2l0Jztcbi8vIGltcG9ydCB7cmVnaXN0ZXJFeHRlbnNpb24sIGpzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi90cy1jb21waWxlcic7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3Qge2N5YW59ID0gY2hhbGs7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZy1oYW5kbGVyJyk7XG5cbmV4cG9ydCB7RHJjcFNldHRpbmdzfTtcbmV4cG9ydCBpbnRlcmZhY2UgRHJjcENvbmZpZyB7XG4gIC8qKlxuICAgKiBVc2VkIHRvIHJ1biBjb21tYW5kIGxpbmUgb3B0aW9uIFwiLWNcIiBzcGVjaWZpZWQgVFMvSlMgZmlsZXMgb25lIGJ5IG9uZSBcbiAgICovXG4gIGNvbmZpZ0hhbmRsZXJNZ3I6IEJlaGF2aW9yU3ViamVjdDxDb25maWdIYW5kbGVyTWdyIHwgdW5kZWZpbmVkPjtcbiAgLyoqIGxvZGFzaCBsaWtlIGdldCBmdW5jdGlvbiwgcmV0dXJuIHNwZWNpZmljIHNldHRpbmcgcHJvcGVydHkgdmFsdWVcbiAgICogQHJldHVybiBcbiAgICovXG4gIGdldDxLIGV4dGVuZHMga2V5b2YgRHJjcFNldHRpbmdzPihwYXRoOiBLLCBkZWZhdWx0VmFsdWU/OiBEcmNwU2V0dGluZ3NbS10pOiBEcmNwU2V0dGluZ3NbS107XG4gIGdldChwYXRoOiBzdHJpbmcgfCBzdHJpbmdbXSwgZGVmYXVsdFZhbHVlPzogYW55KTogYW55O1xuICBzZXQ8SyBleHRlbmRzIGtleW9mIERyY3BTZXR0aW5ncz4ocGF0aDogSywgdmFsdWU6IERyY3BTZXR0aW5nc1tLXSB8IGFueSk6IHZvaWQ7XG4gIHNldChwYXRoOiBzdHJpbmcgfCBzdHJpbmdbXSwgdmFsdWU6IGFueSk6IHZvaWQ7XG4gIGNoYW5nZShyZWR1Y2VyOiAoc2V0dGluZzogRHJhZnQ8RHJjcFNldHRpbmdzPikgPT4gdm9pZCk6IHZvaWQ7XG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgcGF0aCBiYXNlZCBvbiBgcm9vdFBhdGhgXG4gICAqIEBuYW1lIHJlc29sdmVcbiAgICogQG1lbWJlcm9mIGNvbmZpZ1xuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHByb3BlcnR5IG5hbWUgb3IgcHJvcGVydHkgcGF0aCwgbGlrZSBcIm5hbWVcIiwgXCJuYW1lLmNoaWxkUHJvcFsxXVwiXG4gICAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAgICovXG4gIHJlc29sdmUoZGlyOiAncm9vdFBhdGgnIHwgJ2Rlc3REaXInIHwgJ3N0YXRpY0RpcicgfCAnc2VydmVyRGlyJywgLi4ucGF0aDogc3RyaW5nW10pOiBzdHJpbmc7XG4gIHJlc29sdmUoLi4ucGF0aDogc3RyaW5nW10pOiBzdHJpbmc7XG4gIC8qKiBAcmV0dXJuIGFsbCBzZXR0aW5ncyBpbiBhIGJpZyBKU09OIG9iamVjdCAqL1xuICAoKTogRHJjcFNldHRpbmdzO1xuICByZWxvYWQoKTogRHJjcFNldHRpbmdzO1xuICAvLyBpbml0KGFyZ3Y6IENsaU9wdGlvbnMpOiBQcm9taXNlPERyY3BTZXR0aW5ncz47XG4gIGluaXRTeW5jKGFyZ3Y6IENsaU9wdGlvbnMpOiBEcmNwU2V0dGluZ3M7XG4gIC8qKlxuICAgKiBDb25maWdIYW5kbGVyTWdyIGNoYW5nZXMgZXZlcnl0aW1lIFBsaW5rIHNldHRpbmdzIGFyZSBpbml0aWFsaXplZCBvciByZWxvYWRlZC5cbiAgICogQ29uZmlnSGFuZGxlck1nciBpcyB1c2VkIHRvIHJ1biBjb21tYW5kIGxpbmUgb3B0aW9uIFwiLWNcIiBzcGVjaWZpZWQgVFMvSlMgZmlsZXMgb25lIGJ5IG9uZS5cbiAgICogXG4gICAqL1xuICBjb25maWdIYW5kbGVyTWdyQ2hhbmdlZChjYjogKGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJNZ3IpID0+IHZvaWQpOiB2b2lkO1xuICAvLyBjb25maWdIYW5kbGVyTWdyQ3JlYXRlZChjYjogKGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJNZ3IpID0+IFByb21pc2U8YW55PiB8IHZvaWQpOiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ0hhbmRsZXIge1xuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBjb25maWdTZXR0aW5nIE92ZXJyaWRlIHByb3BlcnRpZXMgZnJvbSBkaXN0L2NvbmZpZy55YW1sLCB3aGljaCBpcyBhbHNvIHlvdSBnZXQgZnJvbSBgYXBpLmNvbmZpZygpYFxuXHQgKiBAcGFyYW0gZHJjcENsaUFyZ3YgKGRlcHJlY2F0ZWQpIE92ZXJyaWRlIGNvbW1hbmQgbGluZSBhcmd1bWVtbnQgZm9yIERSQ1Bcblx0ICovXG4gIG9uQ29uZmlnKGNvbmZpZ1NldHRpbmc6IERyY3BTZXR0aW5ncywgY2xpT3B0OiBDbGlPcHRpb25zKTogdm9pZDtcbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0hhbmRsZXJNZ3Ige1xuICBzdGF0aWMgY29tcGlsZXJPcHRpb25zOiBhbnk7XG4gIHByaXZhdGUgc3RhdGljIF90c05vZGVSZWdpc3RlcmVkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBzdGF0aWMgaW5pdENvbmZpZ0hhbmRsZXJzKGZpbGVBbmRFeHBvcnRzOiBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPiwgcm9vdFBhdGg6IHN0cmluZyk6XG4gIEFycmF5PHtmaWxlOiBzdHJpbmc7IGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiB7XG4gICAgY29uc3QgZXhwb3J0ZWRzOiBBcnJheTx7ZmlsZTogc3RyaW5nOyBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT4gPSBbXTtcblxuICAgIGlmICghQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCkge1xuICAgICAgQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCA9IHRydWU7XG5cbiAgICAgIGNvbnN0IGludGVybmFsVHNjZmdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICAgICAgY29uc3Qge2NvbXBpbGVyT3B0aW9uc30gPSBwYXJzZShcbiAgICAgICAgZnMucmVhZEZpbGVTeW5jKGludGVybmFsVHNjZmdGaWxlLCAndXRmOCcpXG4gICAgICApO1xuICAgICAgQ29uZmlnSGFuZGxlck1nci5jb21waWxlck9wdGlvbnMgPSBjb21waWxlck9wdGlvbnM7XG5cbiAgICAgIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChnZXRXb3JrRGlyKCksICcuLycsIGNvbXBpbGVyT3B0aW9ucywge1xuICAgICAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgICAgIHdvcmtzcGFjZURpcjogZ2V0V29ya0RpcigpXG4gICAgICB9KTtcblxuICAgICAgY29tcGlsZXJPcHRpb25zLm1vZHVsZSA9ICdjb21tb25qcyc7XG4gICAgICBjb21waWxlck9wdGlvbnMubm9VbnVzZWRMb2NhbHMgPSBmYWxzZTtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5kaWFnbm9zdGljcyA9IHRydWU7XG4gICAgICBjb21waWxlck9wdGlvbnMuZGVjbGFyYXRpb24gPSBmYWxzZTtcbiAgICAgIGRlbGV0ZSBjb21waWxlck9wdGlvbnMucm9vdERpcjtcblxuICAgICAgLy8gY29uc29sZS5sb2coY29tcGlsZXJPcHRpb25zKTtcbiAgICAgIHJlZ2lzdGVyVHNOb2RlKHtcbiAgICAgICAgdHlwZUNoZWNrOiB0cnVlLFxuICAgICAgICBjb21waWxlck9wdGlvbnMsXG4gICAgICAgIHNraXBJZ25vcmU6IHRydWUsIC8vIGltcG9ydGFudCwgYnkgXCJ0cnVlXCIgd2lsbCBza2lwIGZpbGVzIGFyZSB1bmRlciBub2RlX21vZHVsZXNcbiAgICAgICAgY29tcGlsZXI6IHJlcXVpcmUucmVzb2x2ZSgndHlwZXNjcmlwdCcpLFxuICAgICAgICAvKipcbiAgICAgICAgICogSW1wb3J0YW50ISEgcHJldmVudCB0cy1ub2RlIGxvb2tpbmcgZm9yIHRzY29uZmlnLmpzb24gZnJvbSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAqL1xuICAgICAgICBza2lwUHJvamVjdDogdHJ1ZVxuICAgICAgICAsIHRyYW5zZm9ybWVyczoge1xuICAgICAgICAgIGJlZm9yZTogW1xuICAgICAgICAgICAgY29udGV4dCA9PiAoc3JjKSA9PiB7XG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdiZWZvcmUgdHMtbm9kZSBjb21waWxlczonLCBzcmMuZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzcmMudGV4dCk7XG4gICAgICAgICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSxcbiAgICAgICAgICBhZnRlcjogW1xuICAgICAgICAgICAgY29udGV4dCA9PiAoc3JjKSA9PiB7XG4gICAgICAgICAgICAgIGxvZy5pbmZvKCd0cy1ub2RlIGNvbXBpbGVzOicsIHNyYy5maWxlTmFtZSk7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHNyYy50ZXh0KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtmaWxlLCBleHBvcnROYW1lXSBvZiBmaWxlQW5kRXhwb3J0cykge1xuICAgICAgY29uc3QgZXhwID0gcmVxdWlyZShQYXRoLnJlc29sdmUoZmlsZSkpO1xuICAgICAgZXhwb3J0ZWRzLnB1c2goe2ZpbGUsIGhhbmRsZXI6IGV4cFtleHBvcnROYW1lXSA/IGV4cFtleHBvcnROYW1lXSA6IGV4cH0pO1xuICAgIH1cbiAgICByZXR1cm4gZXhwb3J0ZWRzO1xuICB9XG4gIHByb3RlY3RlZCBjb25maWdIYW5kbGVyczogQXJyYXk8e2ZpbGU6IHN0cmluZzsgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+O1xuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIGZpbGVzIEFycmF5IG9mIHN0cmluZyB3aGljaCBpcyBpbiBmb3JtIG9mIFwiPGZpbGU+WyM8ZXhwb3J0IG5hbWU+XVwiXG4gICAqL1xuICBjb25zdHJ1Y3RvcihmaWxlQW5kRXhwb3J0czA6IEl0ZXJhYmxlPHN0cmluZz4gfCBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPikge1xuICAgIGNvbnN0IGZpcnN0ID0gZmlsZUFuZEV4cG9ydHMwW1N5bWJvbC5pdGVyYXRvcl0oKS5uZXh0KCk7XG4gICAgbGV0IGZpbGVBbmRFeHBvcnRzOiBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPjtcbiAgICBpZiAoIWZpcnN0LmRvbmUgJiYgdHlwZW9mIGZpcnN0LnZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgZmlsZUFuZEV4cG9ydHMgPSBBcnJheS5mcm9tKGZpbGVBbmRFeHBvcnRzMCBhcyBJdGVyYWJsZTxzdHJpbmc+KS5tYXAoZmlsZSA9PiBbZmlsZSwgJ2RlZmF1bHQnXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpbGVBbmRFeHBvcnRzID0gZmlsZUFuZEV4cG9ydHMwIGFzIEl0ZXJhYmxlPFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ10+O1xuICAgIH1cbiAgICB0aGlzLmNvbmZpZ0hhbmRsZXJzID0gQ29uZmlnSGFuZGxlck1nci5pbml0Q29uZmlnSGFuZGxlcnMoZmlsZUFuZEV4cG9ydHMsIGdldFJvb3REaXIoKSk7XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBmdW5jIHBhcmFtZXRlcnM6IChmaWxlUGF0aCwgbGFzdCByZXR1cm5lZCByZXN1bHQsIGhhbmRsZXIgZnVuY3Rpb24pLFxuXHQgKiByZXR1cm5zIHRoZSBjaGFuZ2VkIHJlc3VsdCwga2VlcCB0aGUgbGFzdCByZXN1bHQsIGlmIHJlc3R1cm5zIHVuZGVmaW5lZFxuXHQgKiBAcmV0dXJucyBsYXN0IHJlc3VsdFxuXHQgKi9cbiAgYXN5bmMgcnVuRWFjaDxIPihmdW5jOiAoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXI6IEgpID0+IFByb21pc2U8YW55PiB8IGFueSwgZGVzYz86IHN0cmluZykge1xuICAgIGxldCBsYXN0UmVzOiBhbnk7XG4gICAgZm9yIChjb25zdCB7ZmlsZSwgaGFuZGxlcn0gb2YgdGhpcy5jb25maWdIYW5kbGVycykge1xuICAgICAgbG9nLmRlYnVnKGBSZWFkICR7ZGVzYyB8fCAnc2V0dGluZ3MnfTpcXG4gIGAgKyBjeWFuKGZpbGUpKTtcbiAgICAgIGNvbnN0IGN1cnJSZXMgPSBhd2FpdCBmdW5jKGZpbGUsIGxhc3RSZXMsIGhhbmRsZXIgYXMgYW55IGFzIEgpO1xuICAgICAgaWYgKGN1cnJSZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgbGFzdFJlcyA9IGN1cnJSZXM7XG4gICAgfVxuICAgIHJldHVybiBsYXN0UmVzO1xuICB9XG5cbiAgcnVuRWFjaFN5bmM8SD4oZnVuYzogKGZpbGU6IHN0cmluZywgbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyOiBIKSA9PiBQcm9taXNlPGFueT4gfCBhbnksIGRlc2M/OiBzdHJpbmcpIHtcbiAgICBsZXQgbGFzdFJlczogYW55O1xuICAgIGNvbnN0IGN3ZCA9IGdldFdvcmtEaXIoKTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBsb2cuZGVidWcoYFJlYWQgJHtkZXNjIHx8ICdzZXR0aW5ncyd9OlxcbiAgYCArIGN5YW4oUGF0aC5yZWxhdGl2ZShjd2QsIGZpbGUpKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxufVxuXG5cbiJdfQ==