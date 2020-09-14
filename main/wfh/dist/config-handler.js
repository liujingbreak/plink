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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixrREFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDeEMsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUMsR0FBRyxlQUFLLENBQUM7QUFDNUIscUNBQW1EO0FBR25ELHVDQUF3QztBQUN4QywwRUFBMEU7QUFDMUUsNENBQW9CO0FBMERwQixNQUFhLGdCQUFnQjtJQWtEM0IsWUFBWSxLQUFlO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLGlCQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFqRE8sTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQWUsRUFBRSxRQUFnQjtRQUNqRSxnRkFBZ0Y7UUFDaEYsTUFBTSxTQUFTLEdBQWtELEVBQUUsQ0FBQztRQUVwRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUU7WUFDdkMsZ0JBQWdCLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBRTFDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztZQUMzRSxNQUFNLEVBQUMsZUFBZSxFQUFDLEdBQUcsS0FBSyxDQUM3QixZQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUMzQyxDQUFDO1lBRUYsMkJBQTJCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRTVELGVBQWUsQ0FBQyxNQUFN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QUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsQ0FBQztRQUMzRCxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUM7S0FDckQ7SUFFRCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7UUFDeEIsZUFBZSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzlDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDaEUsT0FBTyxXQUFXLEdBQUcsU0FBUyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxPQUFPLGVBSU4sQ0FBQztBQUNKLENBQUM7QUEzQ0Qsa0VBMkNDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3Qge2N5YW4sIGdyZWVufSA9IGNoYWxrO1xuaW1wb3J0IHtyZWdpc3RlciBhcyByZWdpc3RlclRzTm9kZX0gZnJvbSAndHMtbm9kZSc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMgYXMgQ2xpT3B0aW9uc30gZnJvbSAnLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHR5cGUge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG4vLyBpbXBvcnQge3JlZ2lzdGVyRXh0ZW5zaW9uLCBqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJy4vdHMtY29tcGlsZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcblxuZXhwb3J0IGludGVyZmFjZSBCYXNlRHJjcFNldHRpbmcge1xuICBwb3J0OiBudW1iZXIgfCBzdHJpbmc7XG4gIHB1YmxpY1BhdGg6IHN0cmluZztcbiAgLyoqIEBkZXByZWNhdGVkIHVzZSBwYWNrYWdlLW1nci9pbmRleCNnZXRQcm9qZWN0TGlzdCgpIGluc3RlYWQgKi9cbiAgcHJvamVjdExpc3Q6IHVuZGVmaW5lZDtcbiAgbG9jYWxJUDogc3RyaW5nO1xuICBkZXZNb2RlOiBib29sZWFuO1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIHN0YXRpY0Rpcjogc3RyaW5nO1xuICByZWNpcGVGb2xkZXI/OiBzdHJpbmc7XG4gIHJvb3RQYXRoOiBzdHJpbmc7XG4gIC8vIGxvZzRqc1JlbG9hZFNlY29uZHM6IG51bWJlcjtcbiAgbG9nU3RhdDogYm9vbGVhbjtcbiAgcGFja2FnZVNjb3Blczogc3RyaW5nW107XG4gIGluc3RhbGxlZFJlY2lwZXM6IHN0cmluZ1tdO1xuICB3ZmhTcmNQYXRoOiBzdHJpbmc7XG59XG5leHBvcnQgaW50ZXJmYWNlIERyY3BTZXR0aW5ncyBleHRlbmRzIEJhc2VEcmNwU2V0dGluZyB7XG4gIFtwcm9wOiBzdHJpbmddOiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRHJjcENvbmZpZyB7XG4gIGRvbmU6IFByb21pc2U8RHJjcFNldHRpbmdzPjtcbiAgY29uZmlnSGFuZGxlck1ncigpOiBDb25maWdIYW5kbGVyTWdyO1xuICBnZXQ8SyBleHRlbmRzIGtleW9mIEJhc2VEcmNwU2V0dGluZz4ocGF0aDogSywgZGVmYXVsdFZhbHVlPzogQmFzZURyY3BTZXR0aW5nW0tdKTogQmFzZURyY3BTZXR0aW5nW0tdO1xuICBnZXQocGF0aDogc3RyaW5nfHN0cmluZ1tdLCBkZWZhdWx0VmFsdWU/OiBhbnkpOiBhbnk7XG4gIHNldDxLIGV4dGVuZHMga2V5b2YgQmFzZURyY3BTZXR0aW5nPihwYXRoOiBLLCB2YWx1ZTogQmFzZURyY3BTZXR0aW5nW0tdIHwgYW55KTogdm9pZDtcbiAgc2V0KHBhdGg6IHN0cmluZ3xzdHJpbmdbXSwgdmFsdWU6IGFueSk6IHZvaWQ7XG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgcGF0aCBiYXNlZCBvbiBgcm9vdFBhdGhgXG4gICAqIEBuYW1lIHJlc29sdmVcbiAgICogQG1lbWJlcm9mIGNvbmZpZ1xuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHByb3BlcnR5IG5hbWUgb3IgcHJvcGVydHkgcGF0aCwgbGlrZSBcIm5hbWVcIiwgXCJuYW1lLmNoaWxkUHJvcFsxXVwiXG4gICAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAgICovXG4gIHJlc29sdmUoZGlyOiAnZGVzdERpcid8J3N0YXRpY0Rpcid8J3NlcnZlckRpcicsIC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICByZXNvbHZlKC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICAoKTogRHJjcFNldHRpbmdzO1xuICBsb2FkKCk6IFByb21pc2U8RHJjcFNldHRpbmdzPjtcbiAgcmVsb2FkKCk6IFByb21pc2U8RHJjcFNldHRpbmdzPjtcbiAgbG9hZFN5bmMoKTogRHJjcFNldHRpbmdzO1xuICBpbml0KGFyZ3Y6IENsaU9wdGlvbnMpOiBQcm9taXNlPERyY3BTZXR0aW5ncz47XG4gIGluaXRTeW5jKGFyZ3Y6IENsaU9wdGlvbnMpOiBEcmNwU2V0dGluZ3M7XG4gIHdmaFNyY1BhdGgoKTogc3RyaW5nIHwgZmFsc2U7XG4gIHNldERlZmF1bHQocHJvcFBhdGg6IHN0cmluZywgdmFsdWU6IGFueSk6IERyY3BTZXR0aW5ncztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb25maWdIYW5kbGVyIHtcbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gY29uZmlnU2V0dGluZyBPdmVycmlkZSBwcm9wZXJ0aWVzIGZyb20gZGlzdC9jb25maWcueWFtbCwgd2hpY2ggaXMgYWxzbyB5b3UgZ2V0IGZyb20gYGFwaS5jb25maWcoKWBcblx0ICogQHBhcmFtIGRyY3BDbGlBcmd2IE92ZXJyaWRlIGNvbW1hbmQgbGluZSBhcmd1bWVtbnQgZm9yIERSQ1Bcblx0ICovXG4gIG9uQ29uZmlnKGNvbmZpZ1NldHRpbmc6IHtbcHJvcDogc3RyaW5nXTogYW55fSwgZHJjcENsaUFyZ3Y/OiB7W3Byb3A6IHN0cmluZ106IGFueX0pOiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0hhbmRsZXJNZ3Ige1xuICBwcml2YXRlIHN0YXRpYyBfdHNOb2RlUmVnaXN0ZXJlZCA9IGZhbHNlO1xuXG4gIHByaXZhdGUgc3RhdGljIGluaXRDb25maWdIYW5kbGVycyhmaWxlczogc3RyaW5nW10sIHJvb3RQYXRoOiBzdHJpbmcpOiBBcnJheTx7ZmlsZTogc3RyaW5nLCBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT4ge1xuICAgIC8vIGNvbnN0IHtnZXRTdGF0ZTogZ2V0UGFja2FnZVN0YXRlfSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgcGttZ3I7XG4gICAgY29uc3QgZXhwb3J0ZWRzOiBBcnJheTx7ZmlsZTogc3RyaW5nLCBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT4gPSBbXTtcblxuICAgIGlmICghQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCkge1xuICAgICAgQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCA9IHRydWU7XG5cbiAgICAgIGNvbnN0IGludGVybmFsVHNjZmdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICAgICAgY29uc3Qge2NvbXBpbGVyT3B0aW9uc30gPSBwYXJzZShcbiAgICAgICAgZnMucmVhZEZpbGVTeW5jKGludGVybmFsVHNjZmdGaWxlLCAndXRmOCcpXG4gICAgICApO1xuXG4gICAgICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvY2Vzcy5jd2QoKSwgY29tcGlsZXJPcHRpb25zKTtcblxuICAgICAgY29tcGlsZXJPcHRpb25zLm1vZHVsZSA9ICdjb21tb25qcyc7XG4gICAgICBjb21waWxlck9wdGlvbnMubm9VbnVzZWRMb2NhbHMgPSBmYWxzZTtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5kaWFnbm9zdGljcyA9IHRydWU7XG4gICAgICBkZWxldGUgY29tcGlsZXJPcHRpb25zLnJvb3REaXI7XG4gICAgICBkZWxldGUgY29tcGlsZXJPcHRpb25zLnR5cGVSb290cztcblxuICAgICAgLy8gY29uc29sZS5sb2coY29tcGlsZXJPcHRpb25zKTtcbiAgICAgIHJlZ2lzdGVyVHNOb2RlKHtcbiAgICAgICAgdHlwZUNoZWNrOiB0cnVlLFxuICAgICAgICBjb21waWxlck9wdGlvbnMsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbXBvcnRhbnQhISBwcmV2ZW50IHRzLW5vZGUgbG9va2luZyBmb3IgdHNjb25maWcuanNvbiBmcm9tIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAgICAgICAgICovXG4gICAgICAgIHNraXBQcm9qZWN0OiB0cnVlXG4gICAgICAgICx0cmFuc2Zvcm1lcnM6IHtcbiAgICAgICAgICBhZnRlcjogW1xuICAgICAgICAgICAgY29udGV4dCA9PiAoc3JjKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cy1ub2RlIGNvbXBpbGVzOicsIHNyYy5maWxlTmFtZSk7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHNyYy50ZXh0KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgICAgY29uc3QgZXhwID0gcmVxdWlyZShQYXRoLnJlc29sdmUoZmlsZSkpO1xuICAgICAgICBleHBvcnRlZHMucHVzaCh7ZmlsZSwgaGFuZGxlcjogZXhwLmRlZmF1bHQgPyBleHAuZGVmYXVsdCA6IGV4cH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBleHBvcnRlZHM7XG4gIH1cbiAgcHJvdGVjdGVkIGNvbmZpZ0hhbmRsZXJzOiBBcnJheTx7ZmlsZTogc3RyaW5nLCBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT47XG5cbiAgY29uc3RydWN0b3IoZmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5jb25maWdIYW5kbGVycyA9IENvbmZpZ0hhbmRsZXJNZ3IuaW5pdENvbmZpZ0hhbmRsZXJzKGZpbGVzLCBnZXRSb290RGlyKCkpO1xuICB9XG5cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gZnVuYyBwYXJhbWV0ZXJzOiAoZmlsZVBhdGgsIGxhc3QgcmV0dXJuZWQgcmVzdWx0LCBoYW5kbGVyIGZ1bmN0aW9uKSxcblx0ICogcmV0dXJucyB0aGUgY2hhbmdlZCByZXN1bHQsIGtlZXAgdGhlIGxhc3QgcmVzdWx0LCBpZiByZXN0dXJucyB1bmRlZmluZWRcblx0ICogQHJldHVybnMgbGFzdCByZXN1bHRcblx0ICovXG4gIGFzeW5jIHJ1bkVhY2g8SD4oZnVuYzogKGZpbGU6IHN0cmluZywgbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyOiBIKSA9PiBQcm9taXNlPGFueT4gfCBhbnkpIHtcbiAgICBsZXQgbGFzdFJlczogYW55O1xuICAgIGZvciAoY29uc3Qge2ZpbGUsIGhhbmRsZXJ9IG9mIHRoaXMuY29uZmlnSGFuZGxlcnMpIHtcbiAgICAgIGNvbnNvbGUubG9nKGdyZWVuKFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSwgJy5qcycpICsgJyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcbiAgICAgIGNvbnN0IGN1cnJSZXMgPSBhd2FpdCBmdW5jKGZpbGUsIGxhc3RSZXMsIGhhbmRsZXIgYXMgYW55IGFzIEgpO1xuICAgICAgaWYgKGN1cnJSZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgbGFzdFJlcyA9IGN1cnJSZXM7XG4gICAgfVxuICAgIHJldHVybiBsYXN0UmVzO1xuICB9XG5cbiAgcnVuRWFjaFN5bmM8SD4oZnVuYzogKGZpbGU6IHN0cmluZywgbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyOiBIKSA9PiBQcm9taXNlPGFueT4gfCBhbnkpIHtcbiAgICBsZXQgbGFzdFJlczogYW55O1xuICAgIGZvciAoY29uc3Qge2ZpbGUsIGhhbmRsZXJ9IG9mIHRoaXMuY29uZmlnSGFuZGxlcnMpIHtcbiAgICAgIGNvbnNvbGUubG9nKGdyZWVuKFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSwgJy5qcycpICsgJyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcbiAgICAgIGNvbnN0IGN1cnJSZXMgPSBmdW5jKGZpbGUsIGxhc3RSZXMsIGhhbmRsZXIgYXMgYW55IGFzIEgpO1xuICAgICAgaWYgKGN1cnJSZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgbGFzdFJlcyA9IGN1cnJSZXM7XG4gICAgfVxuICAgIHJldHVybiBsYXN0UmVzO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJPcHRpb25TZXRPcHQge1xuICBlbmFibGVUeXBlUm9vdHM6IGJvb2xlYW47XG4gIC8qKiBEZWZhdWx0IGZhbHNlLCBEbyBub3QgaW5jbHVkZSBsaW5rZWQgcGFja2FnZSBzeW1saW5rcyBkaXJlY3RvcnkgaW4gcGF0aCovXG4gIG5vU3ltbGlua3M/OiBib29sZWFuO1xuICBleHRyYU5vZGVQYXRoPzogc3RyaW5nW107XG59XG4vKipcbiAqIFNldCBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIGFuZCBcInR5cGVSb290c1wiIHByb3BlcnR5IGJhc2VkIG9uIFJvb3QgcGF0aCwgcHJvY2Vzcy5jd2QoKVxuICogYW5kIHByb2Nlc3MuZW52Lk5PREVfUEFUSFNcbiAqIEBwYXJhbSBjd2QgcHJvamVjdCBkaXJlY3Rvcnkgd2hlcmUgdHNjb25maWcgZmlsZSBpcyAodmlydHVhbClcbiAqIEBwYXJhbSBhc3NpZ25lZU9wdGlvbnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoY3dkOiBzdHJpbmcsIGFzc2lnbmVlT3B0aW9uczoge1trZXk6IHN0cmluZ106IGFueX0sXG4gIG9wdHM6IENvbXBpbGVyT3B0aW9uU2V0T3B0ID0ge2VuYWJsZVR5cGVSb290czogZmFsc2V9KSB7XG5cblxuXG4gIGxldCBwYXRoc0RpcnMgPSBwcm9jZXNzLmVudi5OT0RFX1BBVEggPyBwcm9jZXNzLmVudi5OT0RFX1BBVEguc3BsaXQoUGF0aC5kZWxpbWl0ZXIpIDogW107XG4gIGlmIChvcHRzLmV4dHJhTm9kZVBhdGggJiYgb3B0cy5leHRyYU5vZGVQYXRoLmxlbmd0aCA+IDApIHtcbiAgICBwYXRoc0RpcnMudW5zaGlmdCguLi5vcHRzLmV4dHJhTm9kZVBhdGgpO1xuICAgIHBhdGhzRGlycyA9IF8udW5pcShwYXRoc0RpcnMpO1xuICB9XG5cbiAgaWYgKG9wdHMubm9TeW1saW5rcykge1xuICAgIGNvbnN0IHtzeW1saW5rRGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuICAgIGNvbnN0IGlkeCA9IHBhdGhzRGlycy5pbmRleE9mKHN5bWxpbmtEaXIpO1xuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgcGF0aHNEaXJzLnNwbGljZShpZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIGFzc2lnbmVlT3B0aW9ucy5iYXNlVXJsID0gJy4nO1xuICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzID09IG51bGwpXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0geycqJzogW119O1xuICBlbHNlXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPSBbXTtcbiAgZm9yIChjb25zdCBkaXIgb2YgcGF0aHNEaXJzKSB7XG4gICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKGN3ZCwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gSU1QT1JUQU5UOiBgQHR5cGUvKmAgbXVzdCBiZSBwcmlvIHRvIGAvKmAsIGZvciB0aG9zZSBwYWNrYWdlcyBoYXZlIG5vIHR5cGUgZGVmaW5pbnRpb25cbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXS5wdXNoKHJlbGF0aXZlRGlyICsgJy9AdHlwZXMvKicpO1xuICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddLnB1c2gocmVsYXRpdmVEaXIgKyAnLyonKTtcbiAgfVxuXG4gIGlmIChvcHRzLmVuYWJsZVR5cGVSb290cykge1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBwYXRoc0RpcnMubWFwKGRpciA9PiB7XG4gICAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUoY3dkLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHJldHVybiByZWxhdGl2ZURpciArICcvQHR5cGVzJztcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBhc3NpZ25lZU9wdGlvbnMgYXMge1xuICAgIGJhc2VVcmw6IHN0cmluZztcbiAgICBwYXRoczoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgICBba2V5OiBzdHJpbmddOiBhbnk7XG4gIH07XG59XG4iXX0=