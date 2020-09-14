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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
exports.setTsCompilerOptForNodePath = exports.ConfigHandlerMgr = void 0;
/* tslint:disable no-console */
const Path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const lodash_1 = __importDefault(require("lodash"));
const { parse } = require('comment-json');
const { cyan, green } = chalk_1.default;
const ts_node_1 = require("ts-node");
const misc_1 = require("./utils/misc");
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
const fs_1 = __importDefault(require("fs"));
class ConfigHandlerMgr {
    constructor(files) {
        this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files, misc_1.getRootDir());
    }
    static initConfigHandlers(files, rootPath) {
        // const {getState: getPackageState} = require('./package-mgr') as typeof pkmgr;
        const exporteds = [];
        if (!ConfigHandlerMgr._tsNodeRegistered) {
            ConfigHandlerMgr._tsNodeRegistered = true;
            const internalTscfgFile = Path.resolve(__dirname, '../tsconfig-base.json');
            const { compilerOptions } = parse(fs_1.default.readFileSync(internalTscfgFile, 'utf8'));
            setTsCompilerOptForNodePath(process.cwd(), compilerOptions);
            compilerOptions.module = 'commonjs';
            compilerOptions.noUnusedLocals = false;
            compilerOptions.diagnostics = true;
            delete compilerOptions.rootDir;
            delete compilerOptions.typeRoots;
            // console.log(compilerOptions);
            ts_node_1.register({
                typeCheck: true,
                compilerOptions,
                /**
                 * Important!! prevent ts-node looking for tsconfig.json from current working directory
                 */
                skipProject: true,
                transformers: {
                    after: [
                        context => (src) => {
                            console.log('ts-node compiles:', src.fileName);
                            // console.log(src.text);
                            return src;
                        }
                    ]
                }
            });
            files.forEach(file => {
                const exp = require(Path.resolve(file));
                exporteds.push({ file, handler: exp.default ? exp.default : exp });
            });
        }
        return exporteds;
    }
    /**
       *
       * @param func parameters: (filePath, last returned result, handler function),
       * returns the changed result, keep the last result, if resturns undefined
       * @returns last result
       */
    runEach(func) {
        return __awaiter(this, void 0, void 0, function* () {
            let lastRes;
            for (const { file, handler } of this.configHandlers) {
                console.log(green(Path.basename(__filename, '.js') + ' - ') + ' run', cyan(file));
                const currRes = yield func(file, lastRes, handler);
                if (currRes !== undefined)
                    lastRes = currRes;
            }
            return lastRes;
        });
    }
    runEachSync(func) {
        let lastRes;
        for (const { file, handler } of this.configHandlers) {
            console.log(green(Path.basename(__filename, '.js') + ' - ') + ' run', cyan(file));
            const currRes = func(file, lastRes, handler);
            if (currRes !== undefined)
                lastRes = currRes;
        }
        return lastRes;
    }
}
exports.ConfigHandlerMgr = ConfigHandlerMgr;
ConfigHandlerMgr._tsNodeRegistered = false;
/**
 * Set "baseUrl", "paths" and "typeRoots" property based on Root path, process.cwd()
 * and process.env.NODE_PATHS
 * @param cwd project directory where tsconfig file is (virtual)
 * @param assigneeOptions
 */
function setTsCompilerOptForNodePath(cwd, assigneeOptions, opts = { enableTypeRoots: false }) {
    let pathsDirs = process.env.NODE_PATH ? process.env.NODE_PATH.split(Path.delimiter) : [];
    if (opts.extraNodePath && opts.extraNodePath.length > 0) {
        pathsDirs.unshift(...opts.extraNodePath);
        pathsDirs = lodash_1.default.uniq(pathsDirs);
    }
    if (opts.noSymlinks) {
        const { symlinkDir } = JSON.parse(process.env.__plink);
        const idx = pathsDirs.indexOf(symlinkDir);
        if (idx >= 0) {
            pathsDirs.splice(idx, 1);
        }
    }
    assigneeOptions.baseUrl = '.';
    if (assigneeOptions.paths == null)
        assigneeOptions.paths = { '*': [] };
    else
        assigneeOptions.paths['*'] = [];
    for (const dir of pathsDirs) {
        const relativeDir = Path.relative(cwd, dir).replace(/\\/g, '/');
        // IMPORTANT: `@type/*` must be prio to `/*`, for those packages have no type definintion
        assigneeOptions.paths['*'].push(relativeDir + '/@types/*');
        assigneeOptions.paths['*'].push(relativeDir + '/*');
    }
    if (opts.enableTypeRoots) {
        assigneeOptions.typeRoots = pathsDirs.map(dir => {
            const relativeDir = Path.relative(cwd, dir).replace(/\\/g, '/');
            return relativeDir + '/@types';
        });
    }
    return assigneeOptions;
}
exports.setTsCompilerOptForNodePath = setTsCompilerOptForNodePath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixrREFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDeEMsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUMsR0FBRyxlQUFLLENBQUM7QUFDNUIscUNBQW1EO0FBR25ELHVDQUF3QztBQUN4QywwRUFBMEU7QUFDMUUsNENBQW9CO0FBd0RwQixNQUFhLGdCQUFnQjtJQWtEM0IsWUFBWSxLQUFlO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLGlCQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFqRE8sTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQWUsRUFBRSxRQUFnQjtRQUNqRSxnRkFBZ0Y7UUFDaEYsTUFBTSxTQUFTLEdBQWtELEVBQUUsQ0FBQztRQUVwRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUU7WUFDdkMsZ0JBQWdCLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBRTFDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztZQUMzRSxNQUFNLEVBQUMsZUFBZSxFQUFDLEdBQUcsS0FBSyxDQUM3QixZQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUMzQyxDQUFDO1lBRUYsMkJBQTJCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRTVELGVBQWUsQ0FBQyxNQUFN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QUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsQ0FBQztRQUMzRCxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUM7S0FDckQ7SUFFRCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7UUFDeEIsZUFBZSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzlDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDaEUsT0FBTyxXQUFXLEdBQUcsU0FBUyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxPQUFPLGVBSU4sQ0FBQztBQUNKLENBQUM7QUEzQ0Qsa0VBMkNDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3Qge2N5YW4sIGdyZWVufSA9IGNoYWxrO1xuaW1wb3J0IHtyZWdpc3RlciBhcyByZWdpc3RlclRzTm9kZX0gZnJvbSAndHMtbm9kZSc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMgYXMgQ2xpT3B0aW9uc30gZnJvbSAnLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHR5cGUge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG4vLyBpbXBvcnQge3JlZ2lzdGVyRXh0ZW5zaW9uLCBqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJy4vdHMtY29tcGlsZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcblxuZXhwb3J0IGludGVyZmFjZSBCYXNlRHJjcFNldHRpbmcge1xuICBwb3J0OiBudW1iZXIgfCBzdHJpbmc7XG4gIHB1YmxpY1BhdGg6IHN0cmluZztcbiAgLyoqIEBkZXByZWNhdGVkIHVzZSBwYWNrYWdlLW1nci9pbmRleCNnZXRQcm9qZWN0TGlzdCgpIGluc3RlYWQgKi9cbiAgcHJvamVjdExpc3Q6IHVuZGVmaW5lZDtcbiAgbG9jYWxJUDogc3RyaW5nO1xuICBkZXZNb2RlOiBib29sZWFuO1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIHN0YXRpY0Rpcjogc3RyaW5nO1xuICByZWNpcGVGb2xkZXI/OiBzdHJpbmc7XG4gIHJvb3RQYXRoOiBzdHJpbmc7XG4gIC8vIGxvZzRqc1JlbG9hZFNlY29uZHM6IG51bWJlcjtcbiAgbG9nU3RhdDogYm9vbGVhbjtcbiAgcGFja2FnZVNjb3Blczogc3RyaW5nW107XG4gIGluc3RhbGxlZFJlY2lwZXM6IHN0cmluZ1tdO1xuICB3ZmhTcmNQYXRoOiBzdHJpbmc7XG59XG5leHBvcnQgaW50ZXJmYWNlIERyY3BTZXR0aW5ncyBleHRlbmRzIEJhc2VEcmNwU2V0dGluZyB7XG4gIFtwcm9wOiBzdHJpbmddOiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRHJjcENvbmZpZyB7XG4gIGRvbmU6IFByb21pc2U8RHJjcFNldHRpbmdzPjtcbiAgY29uZmlnSGFuZGxlck1ncigpOiBDb25maWdIYW5kbGVyTWdyO1xuICBnZXQ8SyBleHRlbmRzIGtleW9mIEJhc2VEcmNwU2V0dGluZz4ocGF0aDogSywgZGVmYXVsdFZhbHVlPzogQmFzZURyY3BTZXR0aW5nW0tdKTogQmFzZURyY3BTZXR0aW5nW0tdO1xuICBnZXQocGF0aDogc3RyaW5nfHN0cmluZ1tdLCBkZWZhdWx0VmFsdWU/OiBhbnkpOiBhbnk7XG4gIHNldDxLIGV4dGVuZHMga2V5b2YgQmFzZURyY3BTZXR0aW5nPihwYXRoOiBLLCB2YWx1ZTogQmFzZURyY3BTZXR0aW5nW0tdIHwgYW55KTogdm9pZDtcbiAgc2V0KHBhdGg6IHN0cmluZ3xzdHJpbmdbXSwgdmFsdWU6IGFueSk6IHZvaWQ7XG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgcGF0aCBiYXNlZCBvbiBgcm9vdFBhdGhgXG4gICAqIEBuYW1lIHJlc29sdmVcbiAgICogQG1lbWJlcm9mIGNvbmZpZ1xuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHByb3BlcnR5IG5hbWUgb3IgcHJvcGVydHkgcGF0aCwgbGlrZSBcIm5hbWVcIiwgXCJuYW1lLmNoaWxkUHJvcFsxXVwiXG4gICAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAgICovXG4gIHJlc29sdmUoZGlyOiAnZGVzdERpcid8J3N0YXRpY0Rpcid8J3NlcnZlckRpcicsIC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICByZXNvbHZlKC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICAoKTogRHJjcFNldHRpbmdzO1xuICBsb2FkKCk6IFByb21pc2U8RHJjcFNldHRpbmdzPjtcbiAgcmVsb2FkKCk6IFByb21pc2U8RHJjcFNldHRpbmdzPjtcbiAgaW5pdChhcmd2OiBDbGlPcHRpb25zKTogUHJvbWlzZTxEcmNwU2V0dGluZ3M+O1xuICB3ZmhTcmNQYXRoKCk6IHN0cmluZyB8IGZhbHNlO1xuICBzZXREZWZhdWx0KHByb3BQYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBEcmNwU2V0dGluZ3M7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGNvbmZpZ1NldHRpbmcgT3ZlcnJpZGUgcHJvcGVydGllcyBmcm9tIGRpc3QvY29uZmlnLnlhbWwsIHdoaWNoIGlzIGFsc28geW91IGdldCBmcm9tIGBhcGkuY29uZmlnKClgXG5cdCAqIEBwYXJhbSBkcmNwQ2xpQXJndiBPdmVycmlkZSBjb21tYW5kIGxpbmUgYXJndW1lbW50IGZvciBEUkNQXG5cdCAqL1xuICBvbkNvbmZpZyhjb25maWdTZXR0aW5nOiB7W3Byb3A6IHN0cmluZ106IGFueX0sIGRyY3BDbGlBcmd2Pzoge1twcm9wOiBzdHJpbmddOiBhbnl9KTogUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdIYW5kbGVyTWdyIHtcbiAgcHJpdmF0ZSBzdGF0aWMgX3RzTm9kZVJlZ2lzdGVyZWQgPSBmYWxzZTtcblxuICBwcml2YXRlIHN0YXRpYyBpbml0Q29uZmlnSGFuZGxlcnMoZmlsZXM6IHN0cmluZ1tdLCByb290UGF0aDogc3RyaW5nKTogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+IHtcbiAgICAvLyBjb25zdCB7Z2V0U3RhdGU6IGdldFBhY2thZ2VTdGF0ZX0gPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIHBrbWdyO1xuICAgIGNvbnN0IGV4cG9ydGVkczogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+ID0gW107XG5cbiAgICBpZiAoIUNvbmZpZ0hhbmRsZXJNZ3IuX3RzTm9kZVJlZ2lzdGVyZWQpIHtcbiAgICAgIENvbmZpZ0hhbmRsZXJNZ3IuX3RzTm9kZVJlZ2lzdGVyZWQgPSB0cnVlO1xuXG4gICAgICBjb25zdCBpbnRlcm5hbFRzY2ZnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgICAgIGNvbnN0IHtjb21waWxlck9wdGlvbnN9ID0gcGFyc2UoXG4gICAgICAgIGZzLnJlYWRGaWxlU3luYyhpbnRlcm5hbFRzY2ZnRmlsZSwgJ3V0ZjgnKVxuICAgICAgKTtcblxuICAgICAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2Nlc3MuY3dkKCksIGNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5tb2R1bGUgPSAnY29tbW9uanMnO1xuICAgICAgY29tcGlsZXJPcHRpb25zLm5vVW51c2VkTG9jYWxzID0gZmFsc2U7XG4gICAgICBjb21waWxlck9wdGlvbnMuZGlhZ25vc3RpY3MgPSB0cnVlO1xuICAgICAgZGVsZXRlIGNvbXBpbGVyT3B0aW9ucy5yb290RGlyO1xuICAgICAgZGVsZXRlIGNvbXBpbGVyT3B0aW9ucy50eXBlUm9vdHM7XG5cbiAgICAgIC8vIGNvbnNvbGUubG9nKGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgICByZWdpc3RlclRzTm9kZSh7XG4gICAgICAgIHR5cGVDaGVjazogdHJ1ZSxcbiAgICAgICAgY29tcGlsZXJPcHRpb25zLFxuICAgICAgICAvKipcbiAgICAgICAgICogSW1wb3J0YW50ISEgcHJldmVudCB0cy1ub2RlIGxvb2tpbmcgZm9yIHRzY29uZmlnLmpzb24gZnJvbSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAqL1xuICAgICAgICBza2lwUHJvamVjdDogdHJ1ZVxuICAgICAgICAsdHJhbnNmb3JtZXJzOiB7XG4gICAgICAgICAgYWZ0ZXI6IFtcbiAgICAgICAgICAgIGNvbnRleHQgPT4gKHNyYykgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygndHMtbm9kZSBjb21waWxlczonLCBzcmMuZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzcmMudGV4dCk7XG4gICAgICAgICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGZpbGVzLmZvckVhY2goZmlsZSA9PiB7XG4gICAgICAgIGNvbnN0IGV4cCA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGZpbGUpKTtcbiAgICAgICAgZXhwb3J0ZWRzLnB1c2goe2ZpbGUsIGhhbmRsZXI6IGV4cC5kZWZhdWx0ID8gZXhwLmRlZmF1bHQgOiBleHB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZXhwb3J0ZWRzO1xuICB9XG4gIHByb3RlY3RlZCBjb25maWdIYW5kbGVyczogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+O1xuXG4gIGNvbnN0cnVjdG9yKGZpbGVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuY29uZmlnSGFuZGxlcnMgPSBDb25maWdIYW5kbGVyTWdyLmluaXRDb25maWdIYW5kbGVycyhmaWxlcywgZ2V0Um9vdERpcigpKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGZ1bmMgcGFyYW1ldGVyczogKGZpbGVQYXRoLCBsYXN0IHJldHVybmVkIHJlc3VsdCwgaGFuZGxlciBmdW5jdGlvbiksXG5cdCAqIHJldHVybnMgdGhlIGNoYW5nZWQgcmVzdWx0LCBrZWVwIHRoZSBsYXN0IHJlc3VsdCwgaWYgcmVzdHVybnMgdW5kZWZpbmVkXG5cdCAqIEByZXR1cm5zIGxhc3QgcmVzdWx0XG5cdCAqL1xuICBhc3luYyBydW5FYWNoPEg+KGZ1bmM6IChmaWxlOiBzdHJpbmcsIGxhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcjogSCkgPT4gUHJvbWlzZTxhbnk+IHwgYW55KSB7XG4gICAgbGV0IGxhc3RSZXM6IGFueTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBjb25zb2xlLmxvZyhncmVlbihQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSArICcgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gYXdhaXQgZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxuXG4gIHJ1bkVhY2hTeW5jPEg+KGZ1bmM6IChmaWxlOiBzdHJpbmcsIGxhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcjogSCkgPT4gUHJvbWlzZTxhbnk+IHwgYW55KSB7XG4gICAgbGV0IGxhc3RSZXM6IGFueTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBjb25zb2xlLmxvZyhncmVlbihQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSArICcgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9uU2V0T3B0IHtcbiAgZW5hYmxlVHlwZVJvb3RzOiBib29sZWFuO1xuICAvKiogRGVmYXVsdCBmYWxzZSwgRG8gbm90IGluY2x1ZGUgbGlua2VkIHBhY2thZ2Ugc3ltbGlua3MgZGlyZWN0b3J5IGluIHBhdGgqL1xuICBub1N5bWxpbmtzPzogYm9vbGVhbjtcbiAgZXh0cmFOb2RlUGF0aD86IHN0cmluZ1tdO1xufVxuLyoqXG4gKiBTZXQgXCJiYXNlVXJsXCIsIFwicGF0aHNcIiBhbmQgXCJ0eXBlUm9vdHNcIiBwcm9wZXJ0eSBiYXNlZCBvbiBSb290IHBhdGgsIHByb2Nlc3MuY3dkKClcbiAqIGFuZCBwcm9jZXNzLmVudi5OT0RFX1BBVEhTXG4gKiBAcGFyYW0gY3dkIHByb2plY3QgZGlyZWN0b3J5IHdoZXJlIHRzY29uZmlnIGZpbGUgaXMgKHZpcnR1YWwpXG4gKiBAcGFyYW0gYXNzaWduZWVPcHRpb25zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKGN3ZDogc3RyaW5nLCBhc3NpZ25lZU9wdGlvbnM6IHtba2V5OiBzdHJpbmddOiBhbnl9LFxuICBvcHRzOiBDb21waWxlck9wdGlvblNldE9wdCA9IHtlbmFibGVUeXBlUm9vdHM6IGZhbHNlfSkge1xuXG5cblxuICBsZXQgcGF0aHNEaXJzID0gcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID8gcHJvY2Vzcy5lbnYuTk9ERV9QQVRILnNwbGl0KFBhdGguZGVsaW1pdGVyKSA6IFtdO1xuICBpZiAob3B0cy5leHRyYU5vZGVQYXRoICYmIG9wdHMuZXh0cmFOb2RlUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgcGF0aHNEaXJzLnVuc2hpZnQoLi4ub3B0cy5leHRyYU5vZGVQYXRoKTtcbiAgICBwYXRoc0RpcnMgPSBfLnVuaXEocGF0aHNEaXJzKTtcbiAgfVxuXG4gIGlmIChvcHRzLm5vU3ltbGlua3MpIHtcbiAgICBjb25zdCB7c3ltbGlua0Rpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbiAgICBjb25zdCBpZHggPSBwYXRoc0RpcnMuaW5kZXhPZihzeW1saW5rRGlyKTtcbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIHBhdGhzRGlycy5zcGxpY2UoaWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICBhc3NpZ25lZU9wdGlvbnMuYmFzZVVybCA9ICcuJztcbiAgaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9PSBudWxsKVxuICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9IHsnKic6IFtdfTtcbiAgZWxzZVxuICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID0gW107XG4gIGZvciAoY29uc3QgZGlyIG9mIHBhdGhzRGlycykge1xuICAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZShjd2QsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vIElNUE9SVEFOVDogYEB0eXBlLypgIG11c3QgYmUgcHJpbyB0byBgLypgLCBmb3IgdGhvc2UgcGFja2FnZXMgaGF2ZSBubyB0eXBlIGRlZmluaW50aW9uXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10ucHVzaChyZWxhdGl2ZURpciArICcvQHR5cGVzLyonKTtcbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXS5wdXNoKHJlbGF0aXZlRGlyICsgJy8qJyk7XG4gIH1cblxuICBpZiAob3B0cy5lbmFibGVUeXBlUm9vdHMpIHtcbiAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gcGF0aHNEaXJzLm1hcChkaXIgPT4ge1xuICAgICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKGN3ZCwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICByZXR1cm4gcmVsYXRpdmVEaXIgKyAnL0B0eXBlcyc7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gYXNzaWduZWVPcHRpb25zIGFzIHtcbiAgICBiYXNlVXJsOiBzdHJpbmc7XG4gICAgcGF0aHM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX07XG4gICAgW2tleTogc3RyaW5nXTogYW55O1xuICB9O1xufVxuIl19