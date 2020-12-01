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
        const exporteds = [];
        if (!ConfigHandlerMgr._tsNodeRegistered) {
            ConfigHandlerMgr._tsNodeRegistered = true;
            const internalTscfgFile = Path.resolve(__dirname, '../tsconfig-base.json');
            const { compilerOptions } = parse(fs_1.default.readFileSync(internalTscfgFile, 'utf8'));
            setTsCompilerOptForNodePath(process.cwd(), './', compilerOptions);
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
                            console.log('ts-node compiles:', src.fileName);
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
 * @param cwd project directory where tsconfig file is (virtual), "typeRoots" is relative to this parameter
 * @param baseUrl compiler option "baseUrl", "paths" will be relative to this paremter
 * @param assigneeOptions
 */
function setTsCompilerOptForNodePath(cwd, baseUrl = './', assigneeOptions, opts = { enableTypeRoots: false }) {
    let pathsDirs = [];
    // workspace node_modules should be the first
    if (opts.workspaceDir != null) {
        pathsDirs.push(Path.resolve(opts.workspaceDir, 'node_modules'));
    }
    if (opts.extraNodePath && opts.extraNodePath.length > 0) {
        pathsDirs.push(...opts.extraNodePath);
    }
    if (process.env.NODE_PATH) {
        pathsDirs.push(...process.env.NODE_PATH.split(Path.delimiter));
    }
    // console.log('temp..............', pathsDirs);
    // console.log('extraNodePath', opts.extraNodePath);
    pathsDirs = lodash_1.default.uniq(pathsDirs);
    if (opts.noSymlinks) {
        const { symlinkDir } = JSON.parse(process.env.__plink);
        const idx = pathsDirs.indexOf(symlinkDir);
        if (idx >= 0) {
            pathsDirs.splice(idx, 1);
        }
    }
    if (Path.isAbsolute(baseUrl)) {
        let relBaseUrl = Path.relative(cwd, baseUrl);
        if (!relBaseUrl.startsWith('.'))
            relBaseUrl = './' + relBaseUrl;
        baseUrl = relBaseUrl;
    }
    // console.log('+++++++++', pathsDirs, opts.extraNodePath);
    assigneeOptions.baseUrl = baseUrl.replace(/\\/g, '/');
    if (assigneeOptions.paths == null)
        assigneeOptions.paths = { '*': [] };
    else
        assigneeOptions.paths['*'] = [];
    // console.log('pathsDirs', pathsDirs);
    for (const dir of pathsDirs) {
        const relativeDir = Path.relative(Path.resolve(cwd, baseUrl), dir).replace(/\\/g, '/');
        // IMPORTANT: `@type/*` must be prio to `/*`, for those packages have no type definintion
        assigneeOptions.paths['*'].push(relativeDir + '/@types/*');
        assigneeOptions.paths['*'].push(relativeDir + '/*');
    }
    assigneeOptions.typeRoots = [
        Path.relative(cwd, Path.resolve(__dirname, '..', 'types')).replace(/\\/g, '/')
    ];
    if (opts.workspaceDir != null) {
        assigneeOptions.typeRoots.push(Path.relative(cwd, Path.resolve(opts.workspaceDir, 'types')).replace(/\\/g, '/'));
    }
    if (opts.enableTypeRoots) {
        assigneeOptions.typeRoots.push(...pathsDirs.map(dir => {
            const relativeDir = Path.relative(cwd, dir).replace(/\\/g, '/');
            return relativeDir + '/@types';
        }));
    }
    if (opts.extraTypeRoot) {
        assigneeOptions.typeRoots.push(...opts.extraTypeRoot.map(dir => Path.relative(cwd, dir).replace(/\\/g, '/')));
    }
    return assigneeOptions;
}
exports.setTsCompilerOptForNodePath = setTsCompilerOptForNodePath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixrREFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDeEMsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUMsR0FBRyxlQUFLLENBQUM7QUFDNUIscUNBQW1EO0FBR25ELHVDQUF3QztBQUN4QywwRUFBMEU7QUFDMUUsNENBQW9CO0FBMERwQixNQUFhLGdCQUFnQjtJQWtEM0IsWUFBWSxLQUFlO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLGlCQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFqRE8sTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQWUsRUFBRSxRQUFnQjtRQUNqRSxNQUFNLFNBQVMsR0FBa0QsRUFBRSxDQUFDO1FBRXBFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRTtZQUN2QyxnQkFBZ0IsQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFFMUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sRUFBQyxlQUFlLEVBQUMsR0FBRyxLQUFLLENBQzdCLFlBQUUsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLENBQzNDLENBQUM7WUFFRiwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRWxFLGVBQWUsQ0FBQyxNQUFNLEdB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RUFBRTtRQUM3QixlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ3JGO0lBQ0QsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFHO1FBQ3pCLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNwRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2hFLE9BQU8sV0FBVyxHQUFHLFNBQVMsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ0w7SUFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7UUFDdEIsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FDdEQsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN4RDtJQUVELE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUFyRUQsa0VBcUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3Qge2N5YW4sIGdyZWVufSA9IGNoYWxrO1xuaW1wb3J0IHtyZWdpc3RlciBhcyByZWdpc3RlclRzTm9kZX0gZnJvbSAndHMtbm9kZSc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMgYXMgQ2xpT3B0aW9uc30gZnJvbSAnLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi9ub2RlLXBhdGgnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IHtyZWdpc3RlckV4dGVuc2lvbiwganNvblRvQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3RzLWNvbXBpbGVyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmFzZURyY3BTZXR0aW5nIHtcbiAgcG9ydDogbnVtYmVyIHwgc3RyaW5nO1xuICBwdWJsaWNQYXRoOiBzdHJpbmc7XG4gIC8qKiBAZGVwcmVjYXRlZCB1c2UgcGFja2FnZS1tZ3IvaW5kZXgjZ2V0UHJvamVjdExpc3QoKSBpbnN0ZWFkICovXG4gIHByb2plY3RMaXN0OiB1bmRlZmluZWQ7XG4gIGxvY2FsSVA6IHN0cmluZztcbiAgZGV2TW9kZTogYm9vbGVhbjtcbiAgZGVzdERpcjogc3RyaW5nO1xuICBzdGF0aWNEaXI6IHN0cmluZztcbiAgcmVjaXBlRm9sZGVyPzogc3RyaW5nO1xuICByb290UGF0aDogc3RyaW5nO1xuICAvLyBsb2c0anNSZWxvYWRTZWNvbmRzOiBudW1iZXI7XG4gIGxvZ1N0YXQ6IGJvb2xlYW47XG4gIHBhY2thZ2VTY29wZXM6IHN0cmluZ1tdO1xuICBpbnN0YWxsZWRSZWNpcGVzOiBzdHJpbmdbXTtcbiAgd2ZoU3JjUGF0aDogc3RyaW5nO1xufVxuZXhwb3J0IGludGVyZmFjZSBEcmNwU2V0dGluZ3MgZXh0ZW5kcyBCYXNlRHJjcFNldHRpbmcge1xuICBbcHJvcDogc3RyaW5nXTogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyY3BDb25maWcge1xuICBkb25lOiBQcm9taXNlPERyY3BTZXR0aW5ncz47XG4gIGNvbmZpZ0hhbmRsZXJNZ3IoKTogQ29uZmlnSGFuZGxlck1ncjtcbiAgZ2V0PEsgZXh0ZW5kcyBrZXlvZiBCYXNlRHJjcFNldHRpbmc+KHBhdGg6IEssIGRlZmF1bHRWYWx1ZT86IEJhc2VEcmNwU2V0dGluZ1tLXSk6IEJhc2VEcmNwU2V0dGluZ1tLXTtcbiAgZ2V0KHBhdGg6IHN0cmluZ3xzdHJpbmdbXSwgZGVmYXVsdFZhbHVlPzogYW55KTogYW55O1xuICBzZXQ8SyBleHRlbmRzIGtleW9mIEJhc2VEcmNwU2V0dGluZz4ocGF0aDogSywgdmFsdWU6IEJhc2VEcmNwU2V0dGluZ1tLXSB8IGFueSk6IHZvaWQ7XG4gIHNldChwYXRoOiBzdHJpbmd8c3RyaW5nW10sIHZhbHVlOiBhbnkpOiB2b2lkO1xuICAvKipcbiAgICogUmVzb2x2ZSBhIHBhdGggYmFzZWQgb24gYHJvb3RQYXRoYFxuICAgKiBAbmFtZSByZXNvbHZlXG4gICAqIEBtZW1iZXJvZiBjb25maWdcbiAgICogQHBhcmFtICB7c3RyaW5nfSBwcm9wZXJ0eSBuYW1lIG9yIHByb3BlcnR5IHBhdGgsIGxpa2UgXCJuYW1lXCIsIFwibmFtZS5jaGlsZFByb3BbMV1cIlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9ICAgICBhYnNvbHV0ZSBwYXRoXG4gICAqL1xuICByZXNvbHZlKGRpcjogJ2Rlc3REaXInfCdzdGF0aWNEaXInfCdzZXJ2ZXJEaXInLCAuLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgcmVzb2x2ZSguLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgKCk6IERyY3BTZXR0aW5ncztcbiAgbG9hZCgpOiBQcm9taXNlPERyY3BTZXR0aW5ncz47XG4gIHJlbG9hZCgpOiBQcm9taXNlPERyY3BTZXR0aW5ncz47XG4gIGxvYWRTeW5jKCk6IERyY3BTZXR0aW5ncztcbiAgaW5pdChhcmd2OiBDbGlPcHRpb25zKTogUHJvbWlzZTxEcmNwU2V0dGluZ3M+O1xuICBpbml0U3luYyhhcmd2OiBDbGlPcHRpb25zKTogRHJjcFNldHRpbmdzO1xuICB3ZmhTcmNQYXRoKCk6IHN0cmluZyB8IGZhbHNlO1xuICBzZXREZWZhdWx0KHByb3BQYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBEcmNwU2V0dGluZ3M7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGNvbmZpZ1NldHRpbmcgT3ZlcnJpZGUgcHJvcGVydGllcyBmcm9tIGRpc3QvY29uZmlnLnlhbWwsIHdoaWNoIGlzIGFsc28geW91IGdldCBmcm9tIGBhcGkuY29uZmlnKClgXG5cdCAqIEBwYXJhbSBkcmNwQ2xpQXJndiBPdmVycmlkZSBjb21tYW5kIGxpbmUgYXJndW1lbW50IGZvciBEUkNQXG5cdCAqL1xuICBvbkNvbmZpZyhjb25maWdTZXR0aW5nOiB7W3Byb3A6IHN0cmluZ106IGFueX0sIGRyY3BDbGlBcmd2Pzoge1twcm9wOiBzdHJpbmddOiBhbnl9KTogUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdIYW5kbGVyTWdyIHtcbiAgcHJpdmF0ZSBzdGF0aWMgX3RzTm9kZVJlZ2lzdGVyZWQgPSBmYWxzZTtcblxuICBwcml2YXRlIHN0YXRpYyBpbml0Q29uZmlnSGFuZGxlcnMoZmlsZXM6IHN0cmluZ1tdLCByb290UGF0aDogc3RyaW5nKTogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+IHtcbiAgICBjb25zdCBleHBvcnRlZHM6IEFycmF5PHtmaWxlOiBzdHJpbmcsIGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiA9IFtdO1xuXG4gICAgaWYgKCFDb25maWdIYW5kbGVyTWdyLl90c05vZGVSZWdpc3RlcmVkKSB7XG4gICAgICBDb25maWdIYW5kbGVyTWdyLl90c05vZGVSZWdpc3RlcmVkID0gdHJ1ZTtcblxuICAgICAgY29uc3QgaW50ZXJuYWxUc2NmZ0ZpbGUgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gICAgICBjb25zdCB7Y29tcGlsZXJPcHRpb25zfSA9IHBhcnNlKFxuICAgICAgICBmcy5yZWFkRmlsZVN5bmMoaW50ZXJuYWxUc2NmZ0ZpbGUsICd1dGY4JylcbiAgICAgICk7XG5cbiAgICAgIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCAnLi8nLCBjb21waWxlck9wdGlvbnMpO1xuXG4gICAgICBjb21waWxlck9wdGlvbnMubW9kdWxlID0gJ2NvbW1vbmpzJztcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5ub1VudXNlZExvY2FscyA9IGZhbHNlO1xuICAgICAgY29tcGlsZXJPcHRpb25zLmRpYWdub3N0aWNzID0gdHJ1ZTtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5kZWNsYXJhdGlvbiA9IGZhbHNlO1xuICAgICAgZGVsZXRlIGNvbXBpbGVyT3B0aW9ucy5yb290RGlyO1xuXG4gICAgICAvLyBjb25zb2xlLmxvZyhjb21waWxlck9wdGlvbnMpO1xuICAgICAgcmVnaXN0ZXJUc05vZGUoe1xuICAgICAgICB0eXBlQ2hlY2s6IHRydWUsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9ucyxcbiAgICAgICAgY29tcGlsZXI6IHJlcXVpcmUucmVzb2x2ZSgndHlwZXNjcmlwdCcpLFxuICAgICAgICAvKipcbiAgICAgICAgICogSW1wb3J0YW50ISEgcHJldmVudCB0cy1ub2RlIGxvb2tpbmcgZm9yIHRzY29uZmlnLmpzb24gZnJvbSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAqL1xuICAgICAgICBza2lwUHJvamVjdDogdHJ1ZVxuICAgICAgICAsdHJhbnNmb3JtZXJzOiB7XG4gICAgICAgICAgYWZ0ZXI6IFtcbiAgICAgICAgICAgIGNvbnRleHQgPT4gKHNyYykgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygndHMtbm9kZSBjb21waWxlczonLCBzcmMuZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzcmMudGV4dCk7XG4gICAgICAgICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgIGNvbnN0IGV4cCA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGZpbGUpKTtcbiAgICAgIGV4cG9ydGVkcy5wdXNoKHtmaWxlLCBoYW5kbGVyOiBleHAuZGVmYXVsdCA/IGV4cC5kZWZhdWx0IDogZXhwfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGV4cG9ydGVkcztcbiAgfVxuICBwcm90ZWN0ZWQgY29uZmlnSGFuZGxlcnM6IEFycmF5PHtmaWxlOiBzdHJpbmcsIGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PjtcblxuICBjb25zdHJ1Y3RvcihmaWxlczogc3RyaW5nW10pIHtcbiAgICB0aGlzLmNvbmZpZ0hhbmRsZXJzID0gQ29uZmlnSGFuZGxlck1nci5pbml0Q29uZmlnSGFuZGxlcnMoZmlsZXMsIGdldFJvb3REaXIoKSk7XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBmdW5jIHBhcmFtZXRlcnM6IChmaWxlUGF0aCwgbGFzdCByZXR1cm5lZCByZXN1bHQsIGhhbmRsZXIgZnVuY3Rpb24pLFxuXHQgKiByZXR1cm5zIHRoZSBjaGFuZ2VkIHJlc3VsdCwga2VlcCB0aGUgbGFzdCByZXN1bHQsIGlmIHJlc3R1cm5zIHVuZGVmaW5lZFxuXHQgKiBAcmV0dXJucyBsYXN0IHJlc3VsdFxuXHQgKi9cbiAgYXN5bmMgcnVuRWFjaDxIPihmdW5jOiAoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXI6IEgpID0+IFByb21pc2U8YW55PiB8IGFueSkge1xuICAgIGxldCBsYXN0UmVzOiBhbnk7XG4gICAgZm9yIChjb25zdCB7ZmlsZSwgaGFuZGxlcn0gb2YgdGhpcy5jb25maWdIYW5kbGVycykge1xuICAgICAgY29uc29sZS5sb2coZ3JlZW4oUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykgKyAnIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgICAgY29uc3QgY3VyclJlcyA9IGF3YWl0IGZ1bmMoZmlsZSwgbGFzdFJlcywgaGFuZGxlciBhcyBhbnkgYXMgSCk7XG4gICAgICBpZiAoY3VyclJlcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICBsYXN0UmVzID0gY3VyclJlcztcbiAgICB9XG4gICAgcmV0dXJuIGxhc3RSZXM7XG4gIH1cblxuICBydW5FYWNoU3luYzxIPihmdW5jOiAoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXI6IEgpID0+IFByb21pc2U8YW55PiB8IGFueSkge1xuICAgIGxldCBsYXN0UmVzOiBhbnk7XG4gICAgZm9yIChjb25zdCB7ZmlsZSwgaGFuZGxlcn0gb2YgdGhpcy5jb25maWdIYW5kbGVycykge1xuICAgICAgY29uc29sZS5sb2coZ3JlZW4oUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykgKyAnIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgICAgY29uc3QgY3VyclJlcyA9IGZ1bmMoZmlsZSwgbGFzdFJlcywgaGFuZGxlciBhcyBhbnkgYXMgSCk7XG4gICAgICBpZiAoY3VyclJlcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICBsYXN0UmVzID0gY3VyclJlcztcbiAgICB9XG4gICAgcmV0dXJuIGxhc3RSZXM7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlck9wdGlvblNldE9wdCB7XG4gIC8qKiBXaWxsIGFkZCB0eXBlUm9vdHMgcHJvcGVydHkgZm9yIHNwZWNpZmljIHdvcmtzcGFjZSAqL1xuICB3b3Jrc3BhY2VEaXI/OiBzdHJpbmc7XG4gIGVuYWJsZVR5cGVSb290czogYm9vbGVhbjtcbiAgLyoqIERlZmF1bHQgZmFsc2UsIERvIG5vdCBpbmNsdWRlIGxpbmtlZCBwYWNrYWdlIHN5bWxpbmtzIGRpcmVjdG9yeSBpbiBwYXRoKi9cbiAgbm9TeW1saW5rcz86IGJvb2xlYW47XG4gIGV4dHJhTm9kZVBhdGg/OiBzdHJpbmdbXTtcbiAgZXh0cmFUeXBlUm9vdD86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9ucyB7XG4gIGJhc2VVcmw6IHN0cmluZztcbiAgdHlwZVJvb3RzOiBzdHJpbmdbXTtcbiAgcGF0aHM6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119O1xuICBba2V5OiBzdHJpbmddOiBhbnk7XG59XG4vKipcbiAqIFNldCBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIGFuZCBcInR5cGVSb290c1wiIHByb3BlcnR5IGJhc2VkIG9uIFJvb3QgcGF0aCwgcHJvY2Vzcy5jd2QoKVxuICogYW5kIHByb2Nlc3MuZW52Lk5PREVfUEFUSFNcbiAqIEBwYXJhbSBjd2QgcHJvamVjdCBkaXJlY3Rvcnkgd2hlcmUgdHNjb25maWcgZmlsZSBpcyAodmlydHVhbCksIFwidHlwZVJvb3RzXCIgaXMgcmVsYXRpdmUgdG8gdGhpcyBwYXJhbWV0ZXJcbiAqIEBwYXJhbSBiYXNlVXJsIGNvbXBpbGVyIG9wdGlvbiBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIHdpbGwgYmUgcmVsYXRpdmUgdG8gdGhpcyBwYXJlbXRlclxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChjd2Q6IHN0cmluZywgYmFzZVVybCA9ICcuLycsIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LFxuICBvcHRzOiBDb21waWxlck9wdGlvblNldE9wdCA9IHtlbmFibGVUeXBlUm9vdHM6IGZhbHNlfSkge1xuXG4gIGxldCBwYXRoc0RpcnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHdvcmtzcGFjZSBub2RlX21vZHVsZXMgc2hvdWxkIGJlIHRoZSBmaXJzdFxuICBpZiAob3B0cy53b3Jrc3BhY2VEaXIgIT0gbnVsbCkge1xuICAgIHBhdGhzRGlycy5wdXNoKFBhdGgucmVzb2x2ZShvcHRzLndvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycpKTtcbiAgfVxuICBpZiAob3B0cy5leHRyYU5vZGVQYXRoICYmIG9wdHMuZXh0cmFOb2RlUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgcGF0aHNEaXJzLnB1c2goLi4ub3B0cy5leHRyYU5vZGVQYXRoKTtcbiAgfVxuICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9QQVRIKSB7XG4gICAgcGF0aHNEaXJzLnB1c2goLi4ucHJvY2Vzcy5lbnYuTk9ERV9QQVRILnNwbGl0KFBhdGguZGVsaW1pdGVyKSk7XG4gIH1cblxuICAvLyBjb25zb2xlLmxvZygndGVtcC4uLi4uLi4uLi4uLi4uJywgcGF0aHNEaXJzKTtcbiAgLy8gY29uc29sZS5sb2coJ2V4dHJhTm9kZVBhdGgnLCBvcHRzLmV4dHJhTm9kZVBhdGgpO1xuXG4gIHBhdGhzRGlycyA9IF8udW5pcShwYXRoc0RpcnMpO1xuXG4gIGlmIChvcHRzLm5vU3ltbGlua3MpIHtcbiAgICBjb25zdCB7c3ltbGlua0Rpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbiAgICBjb25zdCBpZHggPSBwYXRoc0RpcnMuaW5kZXhPZihzeW1saW5rRGlyKTtcbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIHBhdGhzRGlycy5zcGxpY2UoaWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICBpZiAoUGF0aC5pc0Fic29sdXRlKGJhc2VVcmwpKSB7XG4gICAgbGV0IHJlbEJhc2VVcmwgPSBQYXRoLnJlbGF0aXZlKGN3ZCwgYmFzZVVybCk7XG4gICAgaWYgKCFyZWxCYXNlVXJsLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgIHJlbEJhc2VVcmwgPSAnLi8nICsgcmVsQmFzZVVybDtcbiAgICBiYXNlVXJsID0gcmVsQmFzZVVybDtcbiAgfVxuICAvLyBjb25zb2xlLmxvZygnKysrKysrKysrJywgcGF0aHNEaXJzLCBvcHRzLmV4dHJhTm9kZVBhdGgpO1xuICBhc3NpZ25lZU9wdGlvbnMuYmFzZVVybCA9IGJhc2VVcmwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzID09IG51bGwpXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0geycqJzogW119O1xuICBlbHNlXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPSBbXTtcblxuICAvLyBjb25zb2xlLmxvZygncGF0aHNEaXJzJywgcGF0aHNEaXJzKTtcbiAgZm9yIChjb25zdCBkaXIgb2YgcGF0aHNEaXJzKSB7XG4gICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZShjd2QsIGJhc2VVcmwpLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAvLyBJTVBPUlRBTlQ6IGBAdHlwZS8qYCBtdXN0IGJlIHByaW8gdG8gYC8qYCwgZm9yIHRob3NlIHBhY2thZ2VzIGhhdmUgbm8gdHlwZSBkZWZpbmludGlvblxuICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddLnB1c2gocmVsYXRpdmVEaXIgKyAnL0B0eXBlcy8qJyk7XG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10ucHVzaChyZWxhdGl2ZURpciArICcvKicpO1xuICB9XG5cbiAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtcbiAgICBQYXRoLnJlbGF0aXZlKGN3ZCwgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJ3R5cGVzJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICBdO1xuICBpZiAob3B0cy53b3Jrc3BhY2VEaXIgIT0gbnVsbCkge1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaChcbiAgICAgIFBhdGgucmVsYXRpdmUoY3dkLCBQYXRoLnJlc29sdmUob3B0cy53b3Jrc3BhY2VEaXIsICd0eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICB9XG4gIGlmIChvcHRzLmVuYWJsZVR5cGVSb290cyApIHtcbiAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzLnB1c2goLi4ucGF0aHNEaXJzLm1hcChkaXIgPT4ge1xuICAgICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKGN3ZCwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICByZXR1cm4gcmVsYXRpdmVEaXIgKyAnL0B0eXBlcyc7XG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKG9wdHMuZXh0cmFUeXBlUm9vdCkge1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5vcHRzLmV4dHJhVHlwZVJvb3QubWFwKFxuICAgICAgZGlyID0+IFBhdGgucmVsYXRpdmUoY3dkLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkpO1xuICB9XG5cbiAgcmV0dXJuIGFzc2lnbmVlT3B0aW9ucztcbn1cblxuIl19