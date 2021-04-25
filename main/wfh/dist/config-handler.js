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
/* tslint:disable no-console */
const Path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const { parse } = require('comment-json');
const { cyan } = chalk_1.default;
const ts_node_1 = require("ts-node");
const misc_1 = require("./utils/misc");
const log4js_1 = require("log4js");
const package_list_helper_1 = require("./package-mgr/package-list-helper");
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
const fs_1 = __importDefault(require("fs"));
const log = log4js_1.getLogger('plink.config-handler');
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
        this.configHandlers = ConfigHandlerMgr.initConfigHandlers(fileAndExports, misc_1.getRootDir());
    }
    static initConfigHandlers(fileAndExports, rootPath) {
        const exporteds = [];
        if (!ConfigHandlerMgr._tsNodeRegistered) {
            ConfigHandlerMgr._tsNodeRegistered = true;
            const internalTscfgFile = Path.resolve(__dirname, '../tsconfig-base.json');
            const { compilerOptions } = parse(fs_1.default.readFileSync(internalTscfgFile, 'utf8'));
            ConfigHandlerMgr.compilerOptions = compilerOptions;
            package_list_helper_1.setTsCompilerOptForNodePath(misc_1.getWorkDir(), './', compilerOptions, {
                enableTypeRoots: true,
                workspaceDir: misc_1.getWorkDir()
            });
            compilerOptions.module = 'commonjs';
            compilerOptions.noUnusedLocals = false;
            compilerOptions.diagnostics = true;
            compilerOptions.declaration = false;
            delete compilerOptions.rootDir;
            // console.log(compilerOptions);
            ts_node_1.register({
                typeCheck: true,
                compilerOptions,
                compiler: require.resolve('typescript'),
                /**
                 * Important!! prevent ts-node looking for tsconfig.json from current working directory
                 */
                skipProject: true,
                transformers: {
                    after: [
                        context => (src) => {
                            log.debug('ts-node compiles:', src.fileName);
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
        const cwd = misc_1.getWorkDir();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixrREFBMEI7QUFFMUIsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLEVBQUMsSUFBSSxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ3JCLHFDQUFtRDtBQUVuRCx1Q0FBb0Q7QUFDcEQsbUNBQWlDO0FBRWpDLDJFQUE4RTtBQUc5RSwwRUFBMEU7QUFDMUUsNENBQW9CO0FBQ3BCLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQWdEOUMsTUFBYSxnQkFBZ0I7SUF3RDNCOzs7T0FHRztJQUNILFlBQVksZUFBZ0Y7UUFDMUYsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hELElBQUksY0FBNEQsQ0FBQztRQUNqRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxPQUFPLEtBQUssQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFO1lBQ2xELGNBQWMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQW1DLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1NBQ2pHO2FBQU07WUFDTCxjQUFjLEdBQUcsZUFBK0QsQ0FBQztTQUNsRjtRQUNELElBQUksQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLGlCQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFqRU8sTUFBTSxDQUFDLGtC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QUFDLElBQUksRUFBRSxPQUFPLEVBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ2pELEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLElBQUksVUFBVSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFtQixDQUFDLENBQUM7WUFDekQsSUFBSSxPQUFPLEtBQUssU0FBUztnQkFDdkIsT0FBTyxHQUFHLE9BQU8sQ0FBQztTQUNyQjtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7O0FBbEdILDRDQW1HQztBQWpHZ0Isa0NBQWlCLEdBQUcsS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3Qge2N5YW59ID0gY2hhbGs7XG5pbXBvcnQge3JlZ2lzdGVyIGFzIHJlZ2lzdGVyVHNOb2RlfSBmcm9tICd0cy1ub2RlJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuL2NtZC90eXBlcyc7XG5pbXBvcnQge2dldFJvb3REaXIsIGdldFdvcmtEaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7RHJjcFNldHRpbmdzfSBmcm9tICcuL2NvbmZpZy9jb25maWctc2xpY2UnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge0RyYWZ0fSBmcm9tICdAcmVkdXhqcy90b29sa2l0Jztcbi8vIGltcG9ydCB7cmVnaXN0ZXJFeHRlbnNpb24sIGpzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi90cy1jb21waWxlcic7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jb25maWctaGFuZGxlcicpO1xuXG5leHBvcnQge0RyY3BTZXR0aW5nc307XG5leHBvcnQgaW50ZXJmYWNlIERyY3BDb25maWcge1xuICAvKipcbiAgICogVXNlZCB0byBydW4gY29tbWFuZCBsaW5lIG9wdGlvbiBcIi1jXCIgc3BlY2lmaWVkIFRTL0pTIGZpbGVzIG9uZSBieSBvbmUgXG4gICAqL1xuICBjb25maWdIYW5kbGVyTWdyOiBCZWhhdmlvclN1YmplY3Q8Q29uZmlnSGFuZGxlck1nciB8IHVuZGVmaW5lZD47XG4gIC8qKiBsb2Rhc2ggbGlrZSBnZXQgZnVuY3Rpb24sIHJldHVybiBzcGVjaWZpYyBzZXR0aW5nIHByb3BlcnR5IHZhbHVlXG4gICAqIEByZXR1cm4gXG4gICAqL1xuICBnZXQ8SyBleHRlbmRzIGtleW9mIERyY3BTZXR0aW5ncz4ocGF0aDogSywgZGVmYXVsdFZhbHVlPzogRHJjcFNldHRpbmdzW0tdKTogRHJjcFNldHRpbmdzW0tdO1xuICBnZXQocGF0aDogc3RyaW5nfHN0cmluZ1tdLCBkZWZhdWx0VmFsdWU/OiBhbnkpOiBhbnk7XG4gIHNldDxLIGV4dGVuZHMga2V5b2YgRHJjcFNldHRpbmdzPihwYXRoOiBLLCB2YWx1ZTogRHJjcFNldHRpbmdzW0tdIHwgYW55KTogdm9pZDtcbiAgc2V0KHBhdGg6IHN0cmluZ3xzdHJpbmdbXSwgdmFsdWU6IGFueSk6IHZvaWQ7XG4gIGNoYW5nZShyZWR1Y2VyOiAoc2V0dGluZzogRHJhZnQ8RHJjcFNldHRpbmdzPikgPT4gdm9pZCk6IHZvaWQ7XG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgcGF0aCBiYXNlZCBvbiBgcm9vdFBhdGhgXG4gICAqIEBuYW1lIHJlc29sdmVcbiAgICogQG1lbWJlcm9mIGNvbmZpZ1xuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHByb3BlcnR5IG5hbWUgb3IgcHJvcGVydHkgcGF0aCwgbGlrZSBcIm5hbWVcIiwgXCJuYW1lLmNoaWxkUHJvcFsxXVwiXG4gICAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAgICovXG4gIHJlc29sdmUoZGlyOiAncm9vdFBhdGgnIHwgJ2Rlc3REaXInfCdzdGF0aWNEaXInfCdzZXJ2ZXJEaXInLCAuLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgcmVzb2x2ZSguLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgLyoqIEByZXR1cm4gYWxsIHNldHRpbmdzIGluIGEgYmlnIEpTT04gb2JqZWN0ICovXG4gICgpOiBEcmNwU2V0dGluZ3M7XG4gIHJlbG9hZCgpOiBEcmNwU2V0dGluZ3M7XG4gIC8vIGluaXQoYXJndjogQ2xpT3B0aW9ucyk6IFByb21pc2U8RHJjcFNldHRpbmdzPjtcbiAgaW5pdFN5bmMoYXJndjogQ2xpT3B0aW9ucyk6IERyY3BTZXR0aW5ncztcbiAgLyoqXG4gICAqIENvbmZpZ0hhbmRsZXJNZ3IgY2hhbmdlcyBldmVyeXRpbWUgUGxpbmsgc2V0dGluZ3MgYXJlIGluaXRpYWxpemVkIG9yIHJlbG9hZGVkLlxuICAgKiBDb25maWdIYW5kbGVyTWdyIGlzIHVzZWQgdG8gcnVuIGNvbW1hbmQgbGluZSBvcHRpb24gXCItY1wiIHNwZWNpZmllZCBUUy9KUyBmaWxlcyBvbmUgYnkgb25lLlxuICAgKiBcbiAgICovXG4gIGNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gdm9pZCk6IHZvaWQ7XG4gIC8vIGNvbmZpZ0hhbmRsZXJNZ3JDcmVhdGVkKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gUHJvbWlzZTxhbnk+IHwgdm9pZCk6IFByb21pc2U8dm9pZD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGNvbmZpZ1NldHRpbmcgT3ZlcnJpZGUgcHJvcGVydGllcyBmcm9tIGRpc3QvY29uZmlnLnlhbWwsIHdoaWNoIGlzIGFsc28geW91IGdldCBmcm9tIGBhcGkuY29uZmlnKClgXG5cdCAqIEBwYXJhbSBkcmNwQ2xpQXJndiAoZGVwcmVjYXRlZCkgT3ZlcnJpZGUgY29tbWFuZCBsaW5lIGFyZ3VtZW1udCBmb3IgRFJDUFxuXHQgKi9cbiAgb25Db25maWcoY29uZmlnU2V0dGluZzogRHJjcFNldHRpbmdzLCBjbGlPcHQ6IENsaU9wdGlvbnMpOiB2b2lkO1xufVxuXG5leHBvcnQgY2xhc3MgQ29uZmlnSGFuZGxlck1nciB7XG4gIHN0YXRpYyBjb21waWxlck9wdGlvbnM6IGFueTtcbiAgcHJpdmF0ZSBzdGF0aWMgX3RzTm9kZVJlZ2lzdGVyZWQgPSBmYWxzZTtcblxuICBwcml2YXRlIHN0YXRpYyBpbml0Q29uZmlnSGFuZGxlcnMoZmlsZUFuZEV4cG9ydHM6IEl0ZXJhYmxlPFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ10+LCByb290UGF0aDogc3RyaW5nKTpcbiAgQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+IHtcbiAgICBjb25zdCBleHBvcnRlZHM6IEFycmF5PHtmaWxlOiBzdHJpbmcsIGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiA9IFtdO1xuXG4gICAgaWYgKCFDb25maWdIYW5kbGVyTWdyLl90c05vZGVSZWdpc3RlcmVkKSB7XG4gICAgICBDb25maWdIYW5kbGVyTWdyLl90c05vZGVSZWdpc3RlcmVkID0gdHJ1ZTtcblxuICAgICAgY29uc3QgaW50ZXJuYWxUc2NmZ0ZpbGUgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gICAgICBjb25zdCB7Y29tcGlsZXJPcHRpb25zfSA9IHBhcnNlKFxuICAgICAgICBmcy5yZWFkRmlsZVN5bmMoaW50ZXJuYWxUc2NmZ0ZpbGUsICd1dGY4JylcbiAgICAgICk7XG4gICAgICBDb25maWdIYW5kbGVyTWdyLmNvbXBpbGVyT3B0aW9ucyA9IGNvbXBpbGVyT3B0aW9ucztcblxuICAgICAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKGdldFdvcmtEaXIoKSwgJy4vJywgY29tcGlsZXJPcHRpb25zLCB7XG4gICAgICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICAgICAgd29ya3NwYWNlRGlyOiBnZXRXb3JrRGlyKClcbiAgICAgIH0pO1xuXG4gICAgICBjb21waWxlck9wdGlvbnMubW9kdWxlID0gJ2NvbW1vbmpzJztcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5ub1VudXNlZExvY2FscyA9IGZhbHNlO1xuICAgICAgY29tcGlsZXJPcHRpb25zLmRpYWdub3N0aWNzID0gdHJ1ZTtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5kZWNsYXJhdGlvbiA9IGZhbHNlO1xuICAgICAgZGVsZXRlIGNvbXBpbGVyT3B0aW9ucy5yb290RGlyO1xuXG4gICAgICAvLyBjb25zb2xlLmxvZyhjb21waWxlck9wdGlvbnMpO1xuICAgICAgcmVnaXN0ZXJUc05vZGUoe1xuICAgICAgICB0eXBlQ2hlY2s6IHRydWUsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9ucyxcbiAgICAgICAgY29tcGlsZXI6IHJlcXVpcmUucmVzb2x2ZSgndHlwZXNjcmlwdCcpLFxuICAgICAgICAvKipcbiAgICAgICAgICogSW1wb3J0YW50ISEgcHJldmVudCB0cy1ub2RlIGxvb2tpbmcgZm9yIHRzY29uZmlnLmpzb24gZnJvbSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAqL1xuICAgICAgICBza2lwUHJvamVjdDogdHJ1ZVxuICAgICAgICAsdHJhbnNmb3JtZXJzOiB7XG4gICAgICAgICAgYWZ0ZXI6IFtcbiAgICAgICAgICAgIGNvbnRleHQgPT4gKHNyYykgPT4ge1xuICAgICAgICAgICAgICBsb2cuZGVidWcoJ3RzLW5vZGUgY29tcGlsZXM6Jywgc3JjLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc3JjLnRleHQpO1xuICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2ZpbGUsIGV4cG9ydE5hbWVdIG9mIGZpbGVBbmRFeHBvcnRzKSB7XG4gICAgICBjb25zdCBleHAgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShmaWxlKSk7XG4gICAgICBleHBvcnRlZHMucHVzaCh7ZmlsZSwgaGFuZGxlcjogZXhwW2V4cG9ydE5hbWVdID8gZXhwW2V4cG9ydE5hbWVdIDogZXhwfSk7XG4gICAgfVxuICAgIHJldHVybiBleHBvcnRlZHM7XG4gIH1cbiAgcHJvdGVjdGVkIGNvbmZpZ0hhbmRsZXJzOiBBcnJheTx7ZmlsZTogc3RyaW5nLCBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT47XG5cbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0gZmlsZXMgQXJyYXkgb2Ygc3RyaW5nIHdoaWNoIGlzIGluIGZvcm0gb2YgXCI8ZmlsZT5bIzxleHBvcnQgbmFtZT5dXCJcbiAgICovXG4gIGNvbnN0cnVjdG9yKGZpbGVBbmRFeHBvcnRzMDogSXRlcmFibGU8c3RyaW5nPiB8IEl0ZXJhYmxlPFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ10+KSB7XG4gICAgY29uc3QgZmlyc3QgPSBmaWxlQW5kRXhwb3J0czBbU3ltYm9sLml0ZXJhdG9yXSgpLm5leHQoKTtcbiAgICBsZXQgZmlsZUFuZEV4cG9ydHM6IEl0ZXJhYmxlPFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ10+O1xuICAgIGlmICghZmlyc3QuZG9uZSAmJiB0eXBlb2YgZmlyc3QudmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBmaWxlQW5kRXhwb3J0cyA9IEFycmF5LmZyb20oZmlsZUFuZEV4cG9ydHMwIGFzIEl0ZXJhYmxlPHN0cmluZz4pLm1hcChmaWxlID0+IFtmaWxlLCAnZGVmYXVsdCddKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZUFuZEV4cG9ydHMgPSBmaWxlQW5kRXhwb3J0czAgYXMgSXRlcmFibGU8W2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXT47XG4gICAgfVxuICAgIHRoaXMuY29uZmlnSGFuZGxlcnMgPSBDb25maWdIYW5kbGVyTWdyLmluaXRDb25maWdIYW5kbGVycyhmaWxlQW5kRXhwb3J0cywgZ2V0Um9vdERpcigpKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGZ1bmMgcGFyYW1ldGVyczogKGZpbGVQYXRoLCBsYXN0IHJldHVybmVkIHJlc3VsdCwgaGFuZGxlciBmdW5jdGlvbiksXG5cdCAqIHJldHVybnMgdGhlIGNoYW5nZWQgcmVzdWx0LCBrZWVwIHRoZSBsYXN0IHJlc3VsdCwgaWYgcmVzdHVybnMgdW5kZWZpbmVkXG5cdCAqIEByZXR1cm5zIGxhc3QgcmVzdWx0XG5cdCAqL1xuICBhc3luYyBydW5FYWNoPEg+KGZ1bmM6IChmaWxlOiBzdHJpbmcsIGxhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcjogSCkgPT4gUHJvbWlzZTxhbnk+IHwgYW55LCBkZXNjPzogc3RyaW5nKSB7XG4gICAgbGV0IGxhc3RSZXM6IGFueTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBsb2cuZGVidWcoYFJlYWQgJHtkZXNjIHx8ICdzZXR0aW5ncyd9OlxcbiAgYCArIGN5YW4oZmlsZSkpO1xuICAgICAgY29uc3QgY3VyclJlcyA9IGF3YWl0IGZ1bmMoZmlsZSwgbGFzdFJlcywgaGFuZGxlciBhcyBhbnkgYXMgSCk7XG4gICAgICBpZiAoY3VyclJlcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICBsYXN0UmVzID0gY3VyclJlcztcbiAgICB9XG4gICAgcmV0dXJuIGxhc3RSZXM7XG4gIH1cblxuICBydW5FYWNoU3luYzxIPihmdW5jOiAoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXI6IEgpID0+IFByb21pc2U8YW55PiB8IGFueSwgZGVzYz86IHN0cmluZykge1xuICAgIGxldCBsYXN0UmVzOiBhbnk7XG4gICAgY29uc3QgY3dkID0gZ2V0V29ya0RpcigpO1xuICAgIGZvciAoY29uc3Qge2ZpbGUsIGhhbmRsZXJ9IG9mIHRoaXMuY29uZmlnSGFuZGxlcnMpIHtcbiAgICAgIGxvZy5kZWJ1ZyhgUmVhZCAke2Rlc2MgfHwgJ3NldHRpbmdzJ306XFxuICBgICsgY3lhbihQYXRoLnJlbGF0aXZlKGN3ZCwgZmlsZSkpKTtcbiAgICAgIGNvbnN0IGN1cnJSZXMgPSBmdW5jKGZpbGUsIGxhc3RSZXMsIGhhbmRsZXIgYXMgYW55IGFzIEgpO1xuICAgICAgaWYgKGN1cnJSZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgbGFzdFJlcyA9IGN1cnJSZXM7XG4gICAgfVxuICAgIHJldHVybiBsYXN0UmVzO1xuICB9XG59XG5cblxuIl19