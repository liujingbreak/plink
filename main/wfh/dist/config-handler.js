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
exports.setTsCompilerOpt = exports.ConfigHandlerMgr = void 0;
/* tslint:disable no-console */
const Path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const { parse } = require('comment-json');
const { cyan, green } = chalk_1.default;
const ts_node_1 = require("ts-node");
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
const fs_1 = __importDefault(require("fs"));
class ConfigHandlerMgr {
    constructor(files, rootPath) {
        this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files, rootPath);
    }
    static initConfigHandlers(files, rootPath) {
        // const {getState: getPackageState} = require('./package-mgr') as typeof pkmgr;
        const exporteds = [];
        if (!ConfigHandlerMgr._tsNodeRegistered) {
            ConfigHandlerMgr._tsNodeRegistered = true;
            const internalTscfgFile = Path.resolve(__dirname, '../tsconfig-base.json');
            const { compilerOptions } = parse(fs_1.default.readFileSync(internalTscfgFile, 'utf8'));
            setTsCompilerOpt(process.cwd(), compilerOptions);
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
 * Set "baseUrl", "paths" property based on Root path and process.cwd()
 * @param cwd project directory where tsconfig file is (virtual)
 * @param pathsDirs all available `node_modules` for looking for modules
 * @param assigneeOptions
 */
function setTsCompilerOpt(cwd, assigneeOptions, opts = { setTypeRoots: false }) {
    // pathsDirs = _.uniq(pathsDirs);
    const pathsDirs = process.env.NODE_PATH ? process.env.NODE_PATH.split(Path.delimiter) : [];
    assigneeOptions.baseUrl = '.';
    if (assigneeOptions.paths == null)
        assigneeOptions.paths = {};
    assigneeOptions.paths['*'] = [];
    for (const dir of pathsDirs) {
        const relativeDir = Path.relative(cwd, dir).replace(/\\/g, '/');
        // IMPORTANT: `@type/*` must be prio to `/*`, for those packages have no type definintion
        assigneeOptions.paths['*'].push(relativeDir + '/@types/*');
        assigneeOptions.paths['*'].push(relativeDir + '/*');
    }
    if (opts.setTypeRoots) {
        assigneeOptions.typeRoots = pathsDirs.map(dir => {
            const relativeDir = Path.relative(cwd, dir).replace(/\\/g, '/');
            return relativeDir + '/@types';
        });
    }
    return assigneeOptions;
}
exports.setTsCompilerOpt = setTsCompilerOpt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixrREFBMEI7QUFFMUIsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBQyxHQUFHLGVBQUssQ0FBQztBQUM1QixxQ0FBbUQ7QUFHbkQsMEVBQTBFO0FBQzFFLDRDQUFvQjtBQXFEcEIsTUFBYSxnQkFBZ0I7SUFrRDNCLFlBQVksS0FBZSxFQUFFLFFBQWdCO1FBQzNDLElBQUksQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFqRE8sTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQWUsRUFBRSxRQUFnQjtRQUNqRSxnRkFBZ0Y7UUFDaEYsTUFBTSxTQUFTLEdBQWtELEVBQUUsQ0FBQztRQUVwRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUU7WUFDdkMsZ0JBQWdCLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBRTFDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztZQUMzRSxNQUFNLEVBQUMsZUFBZSxFQUFDLEdBQUcsS0FBSyxDQUM3QixZQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUMzQyxDQUFDO1lBRUYsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRWpELGVBQWUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDO1lBQ3BD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QyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBRTNGLGVBQWUsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDO0lBQzlCLElBQUksZUFBZSxDQUFDLEtBQUssSUFBSSxJQUFJO1FBQy9CLGVBQWUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQzdCLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2hDLEtBQUssTUFBTSxHQUFHLElBQUksU0FBUyxFQUFFO1FBQzNCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEUseUZBQXlGO1FBQ3pGLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsQ0FBQztRQUMzRCxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUM7S0FDckQ7SUFFRCxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7UUFDckIsZUFBZSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzlDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDaEUsT0FBTyxXQUFXLEdBQUcsU0FBUyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxPQUFPLGVBSU4sQ0FBQztBQUNKLENBQUM7QUE1QkQsNENBNEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3Qge2N5YW4sIGdyZWVufSA9IGNoYWxrO1xuaW1wb3J0IHtyZWdpc3RlciBhcyByZWdpc3RlclRzTm9kZX0gZnJvbSAndHMtbm9kZSc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMgYXMgQ2xpT3B0aW9uc30gZnJvbSAnLi9jbWQvdHlwZXMnO1xuXG4vLyBpbXBvcnQge3JlZ2lzdGVyRXh0ZW5zaW9uLCBqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJy4vdHMtY29tcGlsZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcblxuZXhwb3J0IGludGVyZmFjZSBCYXNlRHJjcFNldHRpbmcge1xuICBwb3J0OiBudW1iZXIgfCBzdHJpbmc7XG4gIHB1YmxpY1BhdGg6IHN0cmluZztcbiAgLyoqIEBkZXByZWNhdGVkIHVzZSBwYWNrYWdlLW1nci9pbmRleCNnZXRQcm9qZWN0TGlzdCgpIGluc3RlYWQgKi9cbiAgcHJvamVjdExpc3Q6IHVuZGVmaW5lZDtcbiAgbG9jYWxJUDogc3RyaW5nO1xuICBkZXZNb2RlOiBib29sZWFuO1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIHN0YXRpY0Rpcjogc3RyaW5nO1xuICByZWNpcGVGb2xkZXI/OiBzdHJpbmc7XG4gIHJvb3RQYXRoOiBzdHJpbmc7XG4gIC8vIGxvZzRqc1JlbG9hZFNlY29uZHM6IG51bWJlcjtcbiAgbG9nU3RhdDogYm9vbGVhbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgRHJjcFNldHRpbmdzIGV4dGVuZHMgQmFzZURyY3BTZXR0aW5nIHtcbiAgW3Byb3A6IHN0cmluZ106IGFueTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEcmNwQ29uZmlnIHtcbiAgZG9uZTogUHJvbWlzZTxEcmNwU2V0dGluZ3M+O1xuICBjb25maWdIYW5kbGVyTWdyKCk6IENvbmZpZ0hhbmRsZXJNZ3I7XG4gIGdldDxLIGV4dGVuZHMga2V5b2YgQmFzZURyY3BTZXR0aW5nPihwYXRoOiBLLCBkZWZhdWx0VmFsdWU/OiBCYXNlRHJjcFNldHRpbmdbS10pOiBCYXNlRHJjcFNldHRpbmdbS107XG4gIGdldChwYXRoOiBzdHJpbmd8c3RyaW5nW10sIGRlZmF1bHRWYWx1ZT86IGFueSk6IGFueTtcbiAgc2V0PEsgZXh0ZW5kcyBrZXlvZiBCYXNlRHJjcFNldHRpbmc+KHBhdGg6IEssIHZhbHVlOiBCYXNlRHJjcFNldHRpbmdbS10gfCBhbnkpOiB2b2lkO1xuICBzZXQocGF0aDogc3RyaW5nfHN0cmluZ1tdLCB2YWx1ZTogYW55KTogdm9pZDtcbiAgLyoqXG4gICAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAgICogQG5hbWUgcmVzb2x2ZVxuICAgKiBAbWVtYmVyb2YgY29uZmlnXG4gICAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAgICogQHJldHVybiB7c3RyaW5nfSAgICAgYWJzb2x1dGUgcGF0aFxuICAgKi9cbiAgcmVzb2x2ZShkaXI6ICdkZXN0RGlyJ3wnc3RhdGljRGlyJ3wnc2VydmVyRGlyJywgLi4ucGF0aDogc3RyaW5nW10pOiBzdHJpbmc7XG4gIHJlc29sdmUoLi4ucGF0aDogc3RyaW5nW10pOiBzdHJpbmc7XG4gICgpOiBEcmNwU2V0dGluZ3M7XG4gIGxvYWQoKTogUHJvbWlzZTxEcmNwU2V0dGluZ3M+O1xuICByZWxvYWQoKTogUHJvbWlzZTxEcmNwU2V0dGluZ3M+O1xuICBpbml0KGFyZ3Y6IENsaU9wdGlvbnMpOiBQcm9taXNlPHtbcHJvcGVydHk6IHN0cmluZ106IGFueX0+O1xuICB3ZmhTcmNQYXRoKCk6IHN0cmluZyB8IGZhbHNlO1xuICBzZXREZWZhdWx0KHByb3BQYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBEcmNwU2V0dGluZ3M7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGNvbmZpZ1NldHRpbmcgT3ZlcnJpZGUgcHJvcGVydGllcyBmcm9tIGRpc3QvY29uZmlnLnlhbWwsIHdoaWNoIGlzIGFsc28geW91IGdldCBmcm9tIGBhcGkuY29uZmlnKClgXG5cdCAqIEBwYXJhbSBkcmNwQ2xpQXJndiBPdmVycmlkZSBjb21tYW5kIGxpbmUgYXJndW1lbW50IGZvciBEUkNQXG5cdCAqL1xuICBvbkNvbmZpZyhjb25maWdTZXR0aW5nOiB7W3Byb3A6IHN0cmluZ106IGFueX0sIGRyY3BDbGlBcmd2Pzoge1twcm9wOiBzdHJpbmddOiBhbnl9KTogUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdIYW5kbGVyTWdyIHtcbiAgcHJpdmF0ZSBzdGF0aWMgX3RzTm9kZVJlZ2lzdGVyZWQgPSBmYWxzZTtcblxuICBwcml2YXRlIHN0YXRpYyBpbml0Q29uZmlnSGFuZGxlcnMoZmlsZXM6IHN0cmluZ1tdLCByb290UGF0aDogc3RyaW5nKTogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+IHtcbiAgICAvLyBjb25zdCB7Z2V0U3RhdGU6IGdldFBhY2thZ2VTdGF0ZX0gPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIHBrbWdyO1xuICAgIGNvbnN0IGV4cG9ydGVkczogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+ID0gW107XG5cbiAgICBpZiAoIUNvbmZpZ0hhbmRsZXJNZ3IuX3RzTm9kZVJlZ2lzdGVyZWQpIHtcbiAgICAgIENvbmZpZ0hhbmRsZXJNZ3IuX3RzTm9kZVJlZ2lzdGVyZWQgPSB0cnVlO1xuXG4gICAgICBjb25zdCBpbnRlcm5hbFRzY2ZnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgICAgIGNvbnN0IHtjb21waWxlck9wdGlvbnN9ID0gcGFyc2UoXG4gICAgICAgIGZzLnJlYWRGaWxlU3luYyhpbnRlcm5hbFRzY2ZnRmlsZSwgJ3V0ZjgnKVxuICAgICAgKTtcblxuICAgICAgc2V0VHNDb21waWxlck9wdChwcm9jZXNzLmN3ZCgpLCBjb21waWxlck9wdGlvbnMpO1xuXG4gICAgICBjb21waWxlck9wdGlvbnMubW9kdWxlID0gJ2NvbW1vbmpzJztcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5ub1VudXNlZExvY2FscyA9IGZhbHNlO1xuICAgICAgY29tcGlsZXJPcHRpb25zLmRpYWdub3N0aWNzID0gdHJ1ZTtcbiAgICAgIGRlbGV0ZSBjb21waWxlck9wdGlvbnMucm9vdERpcjtcbiAgICAgIGRlbGV0ZSBjb21waWxlck9wdGlvbnMudHlwZVJvb3RzO1xuXG4gICAgICAvLyBjb25zb2xlLmxvZyhjb21waWxlck9wdGlvbnMpO1xuICAgICAgcmVnaXN0ZXJUc05vZGUoe1xuICAgICAgICB0eXBlQ2hlY2s6IHRydWUsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9ucyxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEltcG9ydGFudCEhIHByZXZlbnQgdHMtbm9kZSBsb29raW5nIGZvciB0c2NvbmZpZy5qc29uIGZyb20gY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAgICAgKi9cbiAgICAgICAgc2tpcFByb2plY3Q6IHRydWVcbiAgICAgICAgLHRyYW5zZm9ybWVyczoge1xuICAgICAgICAgIGFmdGVyOiBbXG4gICAgICAgICAgICBjb250ZXh0ID0+IChzcmMpID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RzLW5vZGUgY29tcGlsZXM6Jywgc3JjLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc3JjLnRleHQpO1xuICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBmaWxlcy5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgICBjb25zdCBleHAgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShmaWxlKSk7XG4gICAgICAgIGV4cG9ydGVkcy5wdXNoKHtmaWxlLCBoYW5kbGVyOiBleHAuZGVmYXVsdCA/IGV4cC5kZWZhdWx0IDogZXhwfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGV4cG9ydGVkcztcbiAgfVxuICBwcm90ZWN0ZWQgY29uZmlnSGFuZGxlcnM6IEFycmF5PHtmaWxlOiBzdHJpbmcsIGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PjtcblxuICBjb25zdHJ1Y3RvcihmaWxlczogc3RyaW5nW10sIHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgICB0aGlzLmNvbmZpZ0hhbmRsZXJzID0gQ29uZmlnSGFuZGxlck1nci5pbml0Q29uZmlnSGFuZGxlcnMoZmlsZXMsIHJvb3RQYXRoKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGZ1bmMgcGFyYW1ldGVyczogKGZpbGVQYXRoLCBsYXN0IHJldHVybmVkIHJlc3VsdCwgaGFuZGxlciBmdW5jdGlvbiksXG5cdCAqIHJldHVybnMgdGhlIGNoYW5nZWQgcmVzdWx0LCBrZWVwIHRoZSBsYXN0IHJlc3VsdCwgaWYgcmVzdHVybnMgdW5kZWZpbmVkXG5cdCAqIEByZXR1cm5zIGxhc3QgcmVzdWx0XG5cdCAqL1xuICBhc3luYyBydW5FYWNoPEg+KGZ1bmM6IChmaWxlOiBzdHJpbmcsIGxhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcjogSCkgPT4gUHJvbWlzZTxhbnk+IHwgYW55KSB7XG4gICAgbGV0IGxhc3RSZXM6IGFueTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBjb25zb2xlLmxvZyhncmVlbihQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSArICcgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gYXdhaXQgZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxuXG4gIHJ1bkVhY2hTeW5jPEg+KGZ1bmM6IChmaWxlOiBzdHJpbmcsIGxhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcjogSCkgPT4gUHJvbWlzZTxhbnk+IHwgYW55KSB7XG4gICAgbGV0IGxhc3RSZXM6IGFueTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBjb25zb2xlLmxvZyhncmVlbihQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSArICcgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxufVxuXG4vKipcbiAqIFNldCBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIHByb3BlcnR5IGJhc2VkIG9uIFJvb3QgcGF0aCBhbmQgcHJvY2Vzcy5jd2QoKVxuICogQHBhcmFtIGN3ZCBwcm9qZWN0IGRpcmVjdG9yeSB3aGVyZSB0c2NvbmZpZyBmaWxlIGlzICh2aXJ0dWFsKVxuICogQHBhcmFtIHBhdGhzRGlycyBhbGwgYXZhaWxhYmxlIGBub2RlX21vZHVsZXNgIGZvciBsb29raW5nIGZvciBtb2R1bGVzXG4gKiBAcGFyYW0gYXNzaWduZWVPcHRpb25zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0VHNDb21waWxlck9wdChjd2Q6IHN0cmluZywgYXNzaWduZWVPcHRpb25zOiB7W2tleTogc3RyaW5nXTogYW55fSxcbiAgb3B0czoge3NldFR5cGVSb290czogYm9vbGVhbn0gPSB7c2V0VHlwZVJvb3RzOiBmYWxzZX0pIHtcbiAgLy8gcGF0aHNEaXJzID0gXy51bmlxKHBhdGhzRGlycyk7XG4gIGNvbnN0IHBhdGhzRGlycyA9IHByb2Nlc3MuZW52Lk5PREVfUEFUSCA/IHByb2Nlc3MuZW52Lk5PREVfUEFUSC5zcGxpdChQYXRoLmRlbGltaXRlcikgOiBbXTtcblxuICBhc3NpZ25lZU9wdGlvbnMuYmFzZVVybCA9ICcuJztcbiAgaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9PSBudWxsKVxuICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9IHt9O1xuICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXSA9IFtdO1xuICBmb3IgKGNvbnN0IGRpciBvZiBwYXRoc0RpcnMpIHtcbiAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUoY3dkLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAvLyBJTVBPUlRBTlQ6IGBAdHlwZS8qYCBtdXN0IGJlIHByaW8gdG8gYC8qYCwgZm9yIHRob3NlIHBhY2thZ2VzIGhhdmUgbm8gdHlwZSBkZWZpbmludGlvblxuICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddLnB1c2gocmVsYXRpdmVEaXIgKyAnL0B0eXBlcy8qJyk7XG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10ucHVzaChyZWxhdGl2ZURpciArICcvKicpO1xuICB9XG5cbiAgaWYgKG9wdHMuc2V0VHlwZVJvb3RzKSB7XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IHBhdGhzRGlycy5tYXAoZGlyID0+IHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZShjd2QsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcmV0dXJuIHJlbGF0aXZlRGlyICsgJy9AdHlwZXMnO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGFzc2lnbmVlT3B0aW9ucyBhcyB7XG4gICAgYmFzZVVybDogc3RyaW5nO1xuICAgIHBhdGhzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119O1xuICAgIFtrZXk6IHN0cmluZ106IGFueTtcbiAgfTtcbn1cbiJdfQ==