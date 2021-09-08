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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0NBQWdDO0FBQ2hDLDJDQUE2QjtBQUM3QixrREFBMEI7QUFFMUIscUNBQW1EO0FBRW5ELHVDQUFvRDtBQUNwRCxtQ0FBaUM7QUFFakMsMkVBQThFO0FBRzlFLDBFQUEwRTtBQUMxRSw0Q0FBb0I7QUFDcEIsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLEVBQUMsSUFBSSxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBZ0Q5QyxNQUFhLGdCQUFnQjtJQWdFM0I7OztPQUdHO0lBQ0gsWUFBWSxlQUFnRjtRQUMxRixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEQsSUFBSSxjQUE0RCxDQUFDO1FBQ2pFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7WUFDbEQsY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBbUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDakc7YUFBTTtZQUNMLGNBQWMsR0FBRyxlQUErRCxDQUFDO1NBQ2xGO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsSUFBQSxpQkFBVSxHQUFFLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBekVPLE1B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QU8sQ0FBQztRQUNqQixDQUFDO0tBQUE7SUFFRCxXQUFXLENBQUksSUFBdUUsRUFBRSxJQUFhO1FBQ25HLElBQUksT0FBWSxDQUFDO1FBQ2pCLE1BQU0sR0FBRyxHQUFHLElBQUEsaUJBQVUsR0FBRSxDQUFDO1FBQ3pCLEtBQUssTUFBTSxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ2pELEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLElBQUksVUFBVSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFtQixDQUFDLENBQUM7WUFDekQsSUFBSSxPQUFPLEtBQUssU0FBUztnQkFDdkIsT0FBTyxHQUFHLE9BQU8sQ0FBQztTQUNyQjtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7O0FBMUdILDRDQTJHQztBQXpHZ0Isa0NBQWlCLEdBQUcsS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgIG5vLWNvbnNvbGUgKi9cbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7cmVnaXN0ZXIgYXMgcmVnaXN0ZXJUc05vZGV9IGZyb20gJ3RzLW5vZGUnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zIGFzIENsaU9wdGlvbnN9IGZyb20gJy4vY21kL3R5cGVzJztcbmltcG9ydCB7Z2V0Um9vdERpciwgZ2V0V29ya0Rpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtEcmNwU2V0dGluZ3N9IGZyb20gJy4vY29uZmlnL2NvbmZpZy1zbGljZSc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7RHJhZnR9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuLy8gaW1wb3J0IHtyZWdpc3RlckV4dGVuc2lvbiwganNvblRvQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3RzLWNvbXBpbGVyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5jb25zdCB7cGFyc2V9ID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5jb25zdCB7Y3lhbn0gPSBjaGFsaztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsuY29uZmlnLWhhbmRsZXInKTtcblxuZXhwb3J0IHtEcmNwU2V0dGluZ3N9O1xuZXhwb3J0IGludGVyZmFjZSBEcmNwQ29uZmlnIHtcbiAgLyoqXG4gICAqIFVzZWQgdG8gcnVuIGNvbW1hbmQgbGluZSBvcHRpb24gXCItY1wiIHNwZWNpZmllZCBUUy9KUyBmaWxlcyBvbmUgYnkgb25lIFxuICAgKi9cbiAgY29uZmlnSGFuZGxlck1ncjogQmVoYXZpb3JTdWJqZWN0PENvbmZpZ0hhbmRsZXJNZ3IgfCB1bmRlZmluZWQ+O1xuICAvKiogbG9kYXNoIGxpa2UgZ2V0IGZ1bmN0aW9uLCByZXR1cm4gc3BlY2lmaWMgc2V0dGluZyBwcm9wZXJ0eSB2YWx1ZVxuICAgKiBAcmV0dXJuIFxuICAgKi9cbiAgZ2V0PEsgZXh0ZW5kcyBrZXlvZiBEcmNwU2V0dGluZ3M+KHBhdGg6IEssIGRlZmF1bHRWYWx1ZT86IERyY3BTZXR0aW5nc1tLXSk6IERyY3BTZXR0aW5nc1tLXTtcbiAgZ2V0KHBhdGg6IHN0cmluZyB8IHN0cmluZ1tdLCBkZWZhdWx0VmFsdWU/OiBhbnkpOiBhbnk7XG4gIHNldDxLIGV4dGVuZHMga2V5b2YgRHJjcFNldHRpbmdzPihwYXRoOiBLLCB2YWx1ZTogRHJjcFNldHRpbmdzW0tdIHwgYW55KTogdm9pZDtcbiAgc2V0KHBhdGg6IHN0cmluZyB8IHN0cmluZ1tdLCB2YWx1ZTogYW55KTogdm9pZDtcbiAgY2hhbmdlKHJlZHVjZXI6IChzZXR0aW5nOiBEcmFmdDxEcmNwU2V0dGluZ3M+KSA9PiB2b2lkKTogdm9pZDtcbiAgLyoqXG4gICAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAgICogQG5hbWUgcmVzb2x2ZVxuICAgKiBAbWVtYmVyb2YgY29uZmlnXG4gICAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAgICogQHJldHVybiB7c3RyaW5nfSAgICAgYWJzb2x1dGUgcGF0aFxuICAgKi9cbiAgcmVzb2x2ZShkaXI6ICdyb290UGF0aCcgfCAnZGVzdERpcicgfCAnc3RhdGljRGlyJyB8ICdzZXJ2ZXJEaXInLCAuLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgcmVzb2x2ZSguLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgLyoqIEByZXR1cm4gYWxsIHNldHRpbmdzIGluIGEgYmlnIEpTT04gb2JqZWN0ICovXG4gICgpOiBEcmNwU2V0dGluZ3M7XG4gIHJlbG9hZCgpOiBEcmNwU2V0dGluZ3M7XG4gIC8vIGluaXQoYXJndjogQ2xpT3B0aW9ucyk6IFByb21pc2U8RHJjcFNldHRpbmdzPjtcbiAgaW5pdFN5bmMoYXJndjogQ2xpT3B0aW9ucyk6IERyY3BTZXR0aW5ncztcbiAgLyoqXG4gICAqIENvbmZpZ0hhbmRsZXJNZ3IgY2hhbmdlcyBldmVyeXRpbWUgUGxpbmsgc2V0dGluZ3MgYXJlIGluaXRpYWxpemVkIG9yIHJlbG9hZGVkLlxuICAgKiBDb25maWdIYW5kbGVyTWdyIGlzIHVzZWQgdG8gcnVuIGNvbW1hbmQgbGluZSBvcHRpb24gXCItY1wiIHNwZWNpZmllZCBUUy9KUyBmaWxlcyBvbmUgYnkgb25lLlxuICAgKiBcbiAgICovXG4gIGNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gdm9pZCk6IHZvaWQ7XG4gIC8vIGNvbmZpZ0hhbmRsZXJNZ3JDcmVhdGVkKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gUHJvbWlzZTxhbnk+IHwgdm9pZCk6IFByb21pc2U8dm9pZD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGNvbmZpZ1NldHRpbmcgT3ZlcnJpZGUgcHJvcGVydGllcyBmcm9tIGRpc3QvY29uZmlnLnlhbWwsIHdoaWNoIGlzIGFsc28geW91IGdldCBmcm9tIGBhcGkuY29uZmlnKClgXG5cdCAqIEBwYXJhbSBkcmNwQ2xpQXJndiAoZGVwcmVjYXRlZCkgT3ZlcnJpZGUgY29tbWFuZCBsaW5lIGFyZ3VtZW1udCBmb3IgRFJDUFxuXHQgKi9cbiAgb25Db25maWcoY29uZmlnU2V0dGluZzogRHJjcFNldHRpbmdzLCBjbGlPcHQ6IENsaU9wdGlvbnMpOiB2b2lkO1xufVxuXG5leHBvcnQgY2xhc3MgQ29uZmlnSGFuZGxlck1nciB7XG4gIHN0YXRpYyBjb21waWxlck9wdGlvbnM6IGFueTtcbiAgcHJpdmF0ZSBzdGF0aWMgX3RzTm9kZVJlZ2lzdGVyZWQgPSBmYWxzZTtcblxuICBwcml2YXRlIHN0YXRpYyBpbml0Q29uZmlnSGFuZGxlcnMoZmlsZUFuZEV4cG9ydHM6IEl0ZXJhYmxlPFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ10+LCByb290UGF0aDogc3RyaW5nKTpcbiAgQXJyYXk8e2ZpbGU6IHN0cmluZzsgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+IHtcbiAgICBjb25zdCBleHBvcnRlZHM6IEFycmF5PHtmaWxlOiBzdHJpbmc7IGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiA9IFtdO1xuXG4gICAgaWYgKCFDb25maWdIYW5kbGVyTWdyLl90c05vZGVSZWdpc3RlcmVkKSB7XG4gICAgICBDb25maWdIYW5kbGVyTWdyLl90c05vZGVSZWdpc3RlcmVkID0gdHJ1ZTtcblxuICAgICAgY29uc3QgaW50ZXJuYWxUc2NmZ0ZpbGUgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gICAgICBjb25zdCB7Y29tcGlsZXJPcHRpb25zfSA9IHBhcnNlKFxuICAgICAgICBmcy5yZWFkRmlsZVN5bmMoaW50ZXJuYWxUc2NmZ0ZpbGUsICd1dGY4JylcbiAgICAgICk7XG4gICAgICBDb25maWdIYW5kbGVyTWdyLmNvbXBpbGVyT3B0aW9ucyA9IGNvbXBpbGVyT3B0aW9ucztcblxuICAgICAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKGdldFdvcmtEaXIoKSwgJy4vJywgY29tcGlsZXJPcHRpb25zLCB7XG4gICAgICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICAgICAgd29ya3NwYWNlRGlyOiBnZXRXb3JrRGlyKClcbiAgICAgIH0pO1xuXG4gICAgICBjb21waWxlck9wdGlvbnMubW9kdWxlID0gJ2NvbW1vbmpzJztcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5ub1VudXNlZExvY2FscyA9IGZhbHNlO1xuICAgICAgY29tcGlsZXJPcHRpb25zLmRpYWdub3N0aWNzID0gdHJ1ZTtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5kZWNsYXJhdGlvbiA9IGZhbHNlO1xuICAgICAgZGVsZXRlIGNvbXBpbGVyT3B0aW9ucy5yb290RGlyO1xuXG4gICAgICAvLyBjb25zb2xlLmxvZyhjb21waWxlck9wdGlvbnMpO1xuICAgICAgcmVnaXN0ZXJUc05vZGUoe1xuICAgICAgICB0eXBlQ2hlY2s6IHRydWUsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9ucyxcbiAgICAgICAgc2tpcElnbm9yZTogdHJ1ZSwgLy8gaW1wb3J0YW50LCBieSBcInRydWVcIiB3aWxsIHNraXAgZmlsZXMgYXJlIHVuZGVyIG5vZGVfbW9kdWxlc1xuICAgICAgICBjb21waWxlcjogcmVxdWlyZS5yZXNvbHZlKCd0eXBlc2NyaXB0JyksXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbXBvcnRhbnQhISBwcmV2ZW50IHRzLW5vZGUgbG9va2luZyBmb3IgdHNjb25maWcuanNvbiBmcm9tIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAgICAgICAgICovXG4gICAgICAgIHNraXBQcm9qZWN0OiB0cnVlXG4gICAgICAgICwgdHJhbnNmb3JtZXJzOiB7XG4gICAgICAgICAgYmVmb3JlOiBbXG4gICAgICAgICAgICBjb250ZXh0ID0+IChzcmMpID0+IHtcbiAgICAgICAgICAgICAgLy8gbG9nLmluZm8oJ2JlZm9yZSB0cy1ub2RlIGNvbXBpbGVzOicsIHNyYy5maWxlTmFtZSk7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHNyYy50ZXh0KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdLFxuICAgICAgICAgIGFmdGVyOiBbXG4gICAgICAgICAgICBjb250ZXh0ID0+IChzcmMpID0+IHtcbiAgICAgICAgICAgICAgLy8gbG9nLmluZm8oJ3RzLW5vZGUgY29tcGlsZXM6Jywgc3JjLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc3JjLnRleHQpO1xuICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2ZpbGUsIGV4cG9ydE5hbWVdIG9mIGZpbGVBbmRFeHBvcnRzKSB7XG4gICAgICBjb25zdCBleHAgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShmaWxlKSk7XG4gICAgICBleHBvcnRlZHMucHVzaCh7ZmlsZSwgaGFuZGxlcjogZXhwW2V4cG9ydE5hbWVdID8gZXhwW2V4cG9ydE5hbWVdIDogZXhwfSk7XG4gICAgfVxuICAgIHJldHVybiBleHBvcnRlZHM7XG4gIH1cbiAgcHJvdGVjdGVkIGNvbmZpZ0hhbmRsZXJzOiBBcnJheTx7ZmlsZTogc3RyaW5nOyBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT47XG5cbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0gZmlsZXMgQXJyYXkgb2Ygc3RyaW5nIHdoaWNoIGlzIGluIGZvcm0gb2YgXCI8ZmlsZT5bIzxleHBvcnQgbmFtZT5dXCJcbiAgICovXG4gIGNvbnN0cnVjdG9yKGZpbGVBbmRFeHBvcnRzMDogSXRlcmFibGU8c3RyaW5nPiB8IEl0ZXJhYmxlPFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ10+KSB7XG4gICAgY29uc3QgZmlyc3QgPSBmaWxlQW5kRXhwb3J0czBbU3ltYm9sLml0ZXJhdG9yXSgpLm5leHQoKTtcbiAgICBsZXQgZmlsZUFuZEV4cG9ydHM6IEl0ZXJhYmxlPFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ10+O1xuICAgIGlmICghZmlyc3QuZG9uZSAmJiB0eXBlb2YgZmlyc3QudmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBmaWxlQW5kRXhwb3J0cyA9IEFycmF5LmZyb20oZmlsZUFuZEV4cG9ydHMwIGFzIEl0ZXJhYmxlPHN0cmluZz4pLm1hcChmaWxlID0+IFtmaWxlLCAnZGVmYXVsdCddKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZUFuZEV4cG9ydHMgPSBmaWxlQW5kRXhwb3J0czAgYXMgSXRlcmFibGU8W2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXT47XG4gICAgfVxuICAgIHRoaXMuY29uZmlnSGFuZGxlcnMgPSBDb25maWdIYW5kbGVyTWdyLmluaXRDb25maWdIYW5kbGVycyhmaWxlQW5kRXhwb3J0cywgZ2V0Um9vdERpcigpKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGZ1bmMgcGFyYW1ldGVyczogKGZpbGVQYXRoLCBsYXN0IHJldHVybmVkIHJlc3VsdCwgaGFuZGxlciBmdW5jdGlvbiksXG5cdCAqIHJldHVybnMgdGhlIGNoYW5nZWQgcmVzdWx0LCBrZWVwIHRoZSBsYXN0IHJlc3VsdCwgaWYgcmVzdHVybnMgdW5kZWZpbmVkXG5cdCAqIEByZXR1cm5zIGxhc3QgcmVzdWx0XG5cdCAqL1xuICBhc3luYyBydW5FYWNoPEg+KGZ1bmM6IChmaWxlOiBzdHJpbmcsIGxhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcjogSCkgPT4gUHJvbWlzZTxhbnk+IHwgYW55LCBkZXNjPzogc3RyaW5nKSB7XG4gICAgbGV0IGxhc3RSZXM6IGFueTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBsb2cuZGVidWcoYFJlYWQgJHtkZXNjIHx8ICdzZXR0aW5ncyd9OlxcbiAgYCArIGN5YW4oZmlsZSkpO1xuICAgICAgY29uc3QgY3VyclJlcyA9IGF3YWl0IGZ1bmMoZmlsZSwgbGFzdFJlcywgaGFuZGxlciBhcyBhbnkgYXMgSCk7XG4gICAgICBpZiAoY3VyclJlcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICBsYXN0UmVzID0gY3VyclJlcztcbiAgICB9XG4gICAgcmV0dXJuIGxhc3RSZXM7XG4gIH1cblxuICBydW5FYWNoU3luYzxIPihmdW5jOiAoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXI6IEgpID0+IFByb21pc2U8YW55PiB8IGFueSwgZGVzYz86IHN0cmluZykge1xuICAgIGxldCBsYXN0UmVzOiBhbnk7XG4gICAgY29uc3QgY3dkID0gZ2V0V29ya0RpcigpO1xuICAgIGZvciAoY29uc3Qge2ZpbGUsIGhhbmRsZXJ9IG9mIHRoaXMuY29uZmlnSGFuZGxlcnMpIHtcbiAgICAgIGxvZy5kZWJ1ZyhgUmVhZCAke2Rlc2MgfHwgJ3NldHRpbmdzJ306XFxuICBgICsgY3lhbihQYXRoLnJlbGF0aXZlKGN3ZCwgZmlsZSkpKTtcbiAgICAgIGNvbnN0IGN1cnJSZXMgPSBmdW5jKGZpbGUsIGxhc3RSZXMsIGhhbmRsZXIgYXMgYW55IGFzIEgpO1xuICAgICAgaWYgKGN1cnJSZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgbGFzdFJlcyA9IGN1cnJSZXM7XG4gICAgfVxuICAgIHJldHVybiBsYXN0UmVzO1xuICB9XG59XG5cblxuIl19