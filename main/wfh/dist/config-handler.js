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
    constructor(files) {
        this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files, misc_1.getRootDir());
    }
    static initConfigHandlers(files, rootPath) {
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
        files.forEach(file => {
            const exp = require(Path.resolve(file));
            exporteds.push({ file, handler: exp.default ? exp.default : exp });
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixrREFBMEI7QUFFMUIsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLEVBQUMsSUFBSSxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ3JCLHFDQUFtRDtBQUVuRCx1Q0FBb0Q7QUFDcEQsbUNBQWlDO0FBRWpDLDJFQUE4RTtBQUU5RSwwRUFBMEU7QUFDMUUsNENBQW9CO0FBQ3BCLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQStDOUMsTUFBYSxnQkFBZ0I7SUF1RDNCLFlBQVksS0FBZTtRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxpQkFBVSxFQUFFLENBQUMsQ0FBQztJQUNqRixDQUFDO0lBckRPLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFlLEVBQUUsUUFBZ0I7UUFDakUsTUFBTSxTQUFTLEdBQWtELEVBQUUsQ0FBQztRQUVwRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUU7WUFDdkMsZ0JBQWdCLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBRTFDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztZQUMzRSxNQUFNLEVBQUMsZUFBZSxFQUFDLEdBQUcsS0FBSyxDQUM3QixZQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUMzQyxDQUFDO1lBQ0YsZ0JBQWdCLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztZQUVuRCxpREFBMkIsQ0FBQyxpQkFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRTtnQkFDL0QsZUFBZSxFQUFFLElBQUk7Z0JBQ3JCLFlBQVksRUFBRSxpQkFBVSxFQUFFO2FBQzNCLENBQUMsQ0FBQztZQUVILGVBQWUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDO1lBQ3BDLGVBQWUsQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO1lBQ3ZDLGVBQWUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1lBQ25DLGVBQWUsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLE9BQU8sZUFBZSxDQUFDLE9BQU8sQ0FBQztZQUUvQixnQ0FBZ0M7WUFDaEMsa0JBQWMsQ0FBQztnQkFDYixTQUFTLEVBQUUsSUFBSTtnQkFDZixlQUFlO2dCQUNmLFFBQVEsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztnQkFDdkM7O21CQUVHO2dCQUNILFdBQVcsRUFBRSxJQUFJO2dCQUNoQixZQUFZLEVBQUU7b0JBQ2IsS0FBSyxFQUFFO3dCQUNMLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTs0QkFDakIsR0FBRyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7NEJBQzdDLHlCQUF5Qjs0QkFDekIsT0FBTyxHQUFHLENBQUM7d0JBQ2IsQ0FBQztxQkFDRjtpQkFDRjthQUNGLENBQUMsQ0FBQztTQUNKO1FBQ0QsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUM7UUFDbkUsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBT0Q7Ozs7O1NBS0U7SUFDSSxPQUFPLENBQUksSUFBdUUsRUFBRSxJQUFhOztZQUNyRyxJQUFJLE9BQVksQ0FBQztZQUNqQixLQUFLLE1BQU0sRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDakQsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksSUFBSSxVQUFVLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFtQixDQUFDLENBQUM7Z0JBQy9ELElBQUksT0FBTyxLQUFLLFNBQVM7b0JBQ3ZCLE9BQU8sR0FBRyxPQUFPLENBQUM7YUFDckI7WUFDRCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO0tBQUE7SUFFRCxXQUFXLENBQUksSUFBdUUsRUFBRSxJQUFhO1FBQ25HLElBQUksT0FBWSxDQUFDO1FBQ2pCLE1BQU0sR0FBRyxHQUFHLGlCQUFVLEVBQUUsQ0FBQztRQUN6QixLQUFLLE1BQU0sRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNqRCxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxJQUFJLFVBQVUsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBbUIsQ0FBQyxDQUFDO1lBQ3pELElBQUksT0FBTyxLQUFLLFNBQVM7Z0JBQ3ZCLE9BQU8sR0FBRyxPQUFPLENBQUM7U0FDckI7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDOztBQXRGSCw0Q0F1RkM7QUFyRmdCLGtDQUFpQixHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcbmNvbnN0IHtjeWFufSA9IGNoYWxrO1xuaW1wb3J0IHtyZWdpc3RlciBhcyByZWdpc3RlclRzTm9kZX0gZnJvbSAndHMtbm9kZSc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMgYXMgQ2xpT3B0aW9uc30gZnJvbSAnLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtnZXRSb290RGlyLCBnZXRXb3JrRGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge0RyY3BTZXR0aW5nc30gZnJvbSAnLi9jb25maWcvY29uZmlnLXNsaWNlJztcbmltcG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3R9IGZyb20gJ3J4anMnO1xuLy8gaW1wb3J0IHtyZWdpc3RlckV4dGVuc2lvbiwganNvblRvQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3RzLWNvbXBpbGVyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZy1oYW5kbGVyJyk7XG5cbmV4cG9ydCB7RHJjcFNldHRpbmdzfTtcbmV4cG9ydCBpbnRlcmZhY2UgRHJjcENvbmZpZyB7XG4gIC8qKlxuICAgKiBVc2VkIHRvIHJ1biBjb21tYW5kIGxpbmUgb3B0aW9uIFwiLWNcIiBzcGVjaWZpZWQgVFMvSlMgZmlsZXMgb25lIGJ5IG9uZSBcbiAgICovXG4gIGNvbmZpZ0hhbmRsZXJNZ3I6IEJlaGF2aW9yU3ViamVjdDxDb25maWdIYW5kbGVyTWdyIHwgdW5kZWZpbmVkPjtcbiAgLyoqIGxvZGFzaCBsaWtlIGdldCBmdW5jdGlvbiwgcmV0dXJuIHNwZWNpZmljIHNldHRpbmcgcHJvcGVydHkgdmFsdWVcbiAgICogQHJldHVybiBcbiAgICovXG4gIGdldDxLIGV4dGVuZHMga2V5b2YgRHJjcFNldHRpbmdzPihwYXRoOiBLLCBkZWZhdWx0VmFsdWU/OiBEcmNwU2V0dGluZ3NbS10pOiBEcmNwU2V0dGluZ3NbS107XG4gIGdldChwYXRoOiBzdHJpbmd8c3RyaW5nW10sIGRlZmF1bHRWYWx1ZT86IGFueSk6IGFueTtcbiAgc2V0PEsgZXh0ZW5kcyBrZXlvZiBEcmNwU2V0dGluZ3M+KHBhdGg6IEssIHZhbHVlOiBEcmNwU2V0dGluZ3NbS10gfCBhbnkpOiB2b2lkO1xuICBzZXQocGF0aDogc3RyaW5nfHN0cmluZ1tdLCB2YWx1ZTogYW55KTogdm9pZDtcbiAgLyoqXG4gICAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAgICogQG5hbWUgcmVzb2x2ZVxuICAgKiBAbWVtYmVyb2YgY29uZmlnXG4gICAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAgICogQHJldHVybiB7c3RyaW5nfSAgICAgYWJzb2x1dGUgcGF0aFxuICAgKi9cbiAgcmVzb2x2ZShkaXI6ICdyb290UGF0aCcgfCAnZGVzdERpcid8J3N0YXRpY0Rpcid8J3NlcnZlckRpcicsIC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICByZXNvbHZlKC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICAvKiogQHJldHVybiBhbGwgc2V0dGluZ3MgaW4gYSBiaWcgSlNPTiBvYmplY3QgKi9cbiAgKCk6IERyY3BTZXR0aW5ncztcbiAgcmVsb2FkKCk6IERyY3BTZXR0aW5ncztcbiAgLy8gaW5pdChhcmd2OiBDbGlPcHRpb25zKTogUHJvbWlzZTxEcmNwU2V0dGluZ3M+O1xuICBpbml0U3luYyhhcmd2OiBDbGlPcHRpb25zKTogRHJjcFNldHRpbmdzO1xuICAvKipcbiAgICogQ29uZmlnSGFuZGxlck1nciBjaGFuZ2VzIGV2ZXJ5dGltZSBQbGluayBzZXR0aW5ncyBhcmUgaW5pdGlhbGl6ZWQgb3IgcmVsb2FkZWQuXG4gICAqIENvbmZpZ0hhbmRsZXJNZ3IgaXMgdXNlZCB0byBydW4gY29tbWFuZCBsaW5lIG9wdGlvbiBcIi1jXCIgc3BlY2lmaWVkIFRTL0pTIGZpbGVzIG9uZSBieSBvbmUuXG4gICAqIFxuICAgKi9cbiAgY29uZmlnSGFuZGxlck1nckNoYW5nZWQoY2I6IChoYW5kbGVyOiBDb25maWdIYW5kbGVyTWdyKSA9PiB2b2lkKTogdm9pZDtcbiAgLy8gY29uZmlnSGFuZGxlck1nckNyZWF0ZWQoY2I6IChoYW5kbGVyOiBDb25maWdIYW5kbGVyTWdyKSA9PiBQcm9taXNlPGFueT4gfCB2b2lkKTogUHJvbWlzZTx2b2lkPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb25maWdIYW5kbGVyIHtcbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gY29uZmlnU2V0dGluZyBPdmVycmlkZSBwcm9wZXJ0aWVzIGZyb20gZGlzdC9jb25maWcueWFtbCwgd2hpY2ggaXMgYWxzbyB5b3UgZ2V0IGZyb20gYGFwaS5jb25maWcoKWBcblx0ICogQHBhcmFtIGRyY3BDbGlBcmd2IChkZXByZWNhdGVkKSBPdmVycmlkZSBjb21tYW5kIGxpbmUgYXJndW1lbW50IGZvciBEUkNQXG5cdCAqL1xuICBvbkNvbmZpZyhjb25maWdTZXR0aW5nOiBEcmNwU2V0dGluZ3MsIGNsaU9wdDogQ2xpT3B0aW9ucyk6IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdIYW5kbGVyTWdyIHtcbiAgc3RhdGljIGNvbXBpbGVyT3B0aW9uczogYW55O1xuICBwcml2YXRlIHN0YXRpYyBfdHNOb2RlUmVnaXN0ZXJlZCA9IGZhbHNlO1xuXG4gIHByaXZhdGUgc3RhdGljIGluaXRDb25maWdIYW5kbGVycyhmaWxlczogc3RyaW5nW10sIHJvb3RQYXRoOiBzdHJpbmcpOiBBcnJheTx7ZmlsZTogc3RyaW5nLCBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT4ge1xuICAgIGNvbnN0IGV4cG9ydGVkczogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+ID0gW107XG5cbiAgICBpZiAoIUNvbmZpZ0hhbmRsZXJNZ3IuX3RzTm9kZVJlZ2lzdGVyZWQpIHtcbiAgICAgIENvbmZpZ0hhbmRsZXJNZ3IuX3RzTm9kZVJlZ2lzdGVyZWQgPSB0cnVlO1xuXG4gICAgICBjb25zdCBpbnRlcm5hbFRzY2ZnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgICAgIGNvbnN0IHtjb21waWxlck9wdGlvbnN9ID0gcGFyc2UoXG4gICAgICAgIGZzLnJlYWRGaWxlU3luYyhpbnRlcm5hbFRzY2ZnRmlsZSwgJ3V0ZjgnKVxuICAgICAgKTtcbiAgICAgIENvbmZpZ0hhbmRsZXJNZ3IuY29tcGlsZXJPcHRpb25zID0gY29tcGlsZXJPcHRpb25zO1xuXG4gICAgICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoZ2V0V29ya0RpcigpLCAnLi8nLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICAgICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgICAgICB3b3Jrc3BhY2VEaXI6IGdldFdvcmtEaXIoKVxuICAgICAgfSk7XG5cbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5tb2R1bGUgPSAnY29tbW9uanMnO1xuICAgICAgY29tcGlsZXJPcHRpb25zLm5vVW51c2VkTG9jYWxzID0gZmFsc2U7XG4gICAgICBjb21waWxlck9wdGlvbnMuZGlhZ25vc3RpY3MgPSB0cnVlO1xuICAgICAgY29tcGlsZXJPcHRpb25zLmRlY2xhcmF0aW9uID0gZmFsc2U7XG4gICAgICBkZWxldGUgY29tcGlsZXJPcHRpb25zLnJvb3REaXI7XG5cbiAgICAgIC8vIGNvbnNvbGUubG9nKGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgICByZWdpc3RlclRzTm9kZSh7XG4gICAgICAgIHR5cGVDaGVjazogdHJ1ZSxcbiAgICAgICAgY29tcGlsZXJPcHRpb25zLFxuICAgICAgICBjb21waWxlcjogcmVxdWlyZS5yZXNvbHZlKCd0eXBlc2NyaXB0JyksXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbXBvcnRhbnQhISBwcmV2ZW50IHRzLW5vZGUgbG9va2luZyBmb3IgdHNjb25maWcuanNvbiBmcm9tIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAgICAgICAgICovXG4gICAgICAgIHNraXBQcm9qZWN0OiB0cnVlXG4gICAgICAgICx0cmFuc2Zvcm1lcnM6IHtcbiAgICAgICAgICBhZnRlcjogW1xuICAgICAgICAgICAgY29udGV4dCA9PiAoc3JjKSA9PiB7XG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZygndHMtbm9kZSBjb21waWxlczonLCBzcmMuZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzcmMudGV4dCk7XG4gICAgICAgICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgIGNvbnN0IGV4cCA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGZpbGUpKTtcbiAgICAgIGV4cG9ydGVkcy5wdXNoKHtmaWxlLCBoYW5kbGVyOiBleHAuZGVmYXVsdCA/IGV4cC5kZWZhdWx0IDogZXhwfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGV4cG9ydGVkcztcbiAgfVxuICBwcm90ZWN0ZWQgY29uZmlnSGFuZGxlcnM6IEFycmF5PHtmaWxlOiBzdHJpbmcsIGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PjtcblxuICBjb25zdHJ1Y3RvcihmaWxlczogc3RyaW5nW10pIHtcbiAgICB0aGlzLmNvbmZpZ0hhbmRsZXJzID0gQ29uZmlnSGFuZGxlck1nci5pbml0Q29uZmlnSGFuZGxlcnMoZmlsZXMsIGdldFJvb3REaXIoKSk7XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBmdW5jIHBhcmFtZXRlcnM6IChmaWxlUGF0aCwgbGFzdCByZXR1cm5lZCByZXN1bHQsIGhhbmRsZXIgZnVuY3Rpb24pLFxuXHQgKiByZXR1cm5zIHRoZSBjaGFuZ2VkIHJlc3VsdCwga2VlcCB0aGUgbGFzdCByZXN1bHQsIGlmIHJlc3R1cm5zIHVuZGVmaW5lZFxuXHQgKiBAcmV0dXJucyBsYXN0IHJlc3VsdFxuXHQgKi9cbiAgYXN5bmMgcnVuRWFjaDxIPihmdW5jOiAoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXI6IEgpID0+IFByb21pc2U8YW55PiB8IGFueSwgZGVzYz86IHN0cmluZykge1xuICAgIGxldCBsYXN0UmVzOiBhbnk7XG4gICAgZm9yIChjb25zdCB7ZmlsZSwgaGFuZGxlcn0gb2YgdGhpcy5jb25maWdIYW5kbGVycykge1xuICAgICAgbG9nLmRlYnVnKGBSZWFkICR7ZGVzYyB8fCAnc2V0dGluZ3MnfTpcXG4gIGAgKyBjeWFuKGZpbGUpKTtcbiAgICAgIGNvbnN0IGN1cnJSZXMgPSBhd2FpdCBmdW5jKGZpbGUsIGxhc3RSZXMsIGhhbmRsZXIgYXMgYW55IGFzIEgpO1xuICAgICAgaWYgKGN1cnJSZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgbGFzdFJlcyA9IGN1cnJSZXM7XG4gICAgfVxuICAgIHJldHVybiBsYXN0UmVzO1xuICB9XG5cbiAgcnVuRWFjaFN5bmM8SD4oZnVuYzogKGZpbGU6IHN0cmluZywgbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyOiBIKSA9PiBQcm9taXNlPGFueT4gfCBhbnksIGRlc2M/OiBzdHJpbmcpIHtcbiAgICBsZXQgbGFzdFJlczogYW55O1xuICAgIGNvbnN0IGN3ZCA9IGdldFdvcmtEaXIoKTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBsb2cuZGVidWcoYFJlYWQgJHtkZXNjIHx8ICdzZXR0aW5ncyd9OlxcbiAgYCArIGN5YW4oUGF0aC5yZWxhdGl2ZShjd2QsIGZpbGUpKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxufVxuXG5cbiJdfQ==