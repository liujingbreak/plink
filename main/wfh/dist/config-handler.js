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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0NBQWdDO0FBQ2hDLDJDQUE2QjtBQUM3QixrREFBMEI7QUFFMUIscUNBQW1EO0FBRW5ELHVDQUFvRDtBQUNwRCxtQ0FBaUM7QUFFakMsMkVBQThFO0FBRzlFLDREQUE0QjtBQUU1QiwwRUFBMEU7QUFDMUUsNENBQW9CO0FBQ3BCLG1FQUFtRTtBQUNuRSxNQUFNLEVBQUMsSUFBSSxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBaUQ5QyxNQUFhLGdCQUFnQjtJQWtFM0I7OztPQUdHO0lBQ0gsWUFBWSxlQUFnRjtRQUMxRixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEQsSUFBSSxjQUE0RCxDQUFDO1FBQ2pFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7WUFDbEQsY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBbUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDakc7YUFBTTtZQUNMLGNBQWMsR0FBRyxlQUErRCxDQUFDO1NBQ2xGO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsSUFBQSxpQkFBVSxHQUFFLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBM0VPLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxjQUE0RCxFQUFFLFFBQWdCO1FBRTlHLE1BQU0sU0FBUyxHQUFrRCxFQUFFLENBQUM7UUFFcEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFO1lBQ3ZDLGdCQUFnQixDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUUxQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHVCQUF1QixDQUFDLENBQUM7WUFFM0UsbUVBQW1FO1lBQ25FLE1BQU0sRUFBQyxlQUFlLEVBQUMsR0FBRyxvQkFBRSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFDM0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FDdEMsQ0FBQyxNQUFNLENBQUM7WUFDVCxnQkFBZ0IsQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO1lBRW5ELElBQUEsaURBQTJCLEVBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUU7Z0JBQ2hFLGVBQWUsRUFBRSxJQUFJO2dCQUNyQixZQUFZLEVBQUUsSUFBQSxpQkFBVSxHQUFFO2FBQzNCLENBQUMsQ0FBQztZQUVILGVBQWUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDO1lBQ3BDLGVBQWUsQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO1lBQ3ZDLGVBQWUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1lBQ25DLGVBQWUsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLE9BQU8sZUFBZSxDQUFDLE9BQU8sQ0FBQztZQUUvQixnQ0FBZ0M7WUFDaEMsSUFBQSxrQkFBYyxFQUFDO2dCQUNiLFNBQVMsRUFBRSxJQUFJO2dCQUNmLGVBQWU7Z0JBQ2YsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLFFBQVEsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztnQkFDdkM7O21CQUVHO2dCQUNILFdBQVcsRUFBRSxJQUFJO2dCQUNmLFlBQVksRUFBRTtvQkFDZCxNQUFNLEVBQUU7d0JBQ04sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFOzRCQUNqQixzREFBc0Q7NEJBQ3RELHlCQUF5Qjs0QkFDekIsT0FBTyxHQUFHLENBQUM7d0JBQ2IsQ0FBQztxQkFDRjtvQkFDRCxLQUFLLEVBQUU7d0JBQ0wsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFOzRCQUNqQiwrQ0FBK0M7NEJBQy9DLHlCQUF5Qjs0QkFDekIsT0FBTyxHQUFHLENBQUM7d0JBQ2IsQ0FBQztxQkFDRjtpQkFDRjthQUNGLENBQUMsQ0FBQztTQUNKO1FBQ0QsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJLGNBQWMsRUFBRTtZQUMvQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQWtCRDs7Ozs7U0FLRTtJQUNJLE9BQU8sQ0FBSSxJQUF1RSxFQUFFLElBQWE7O1lBQ3JHLElBQUksT0FBWSxDQUFDO1lBQ2pCLEtBQUssTUFBTSxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUNqRCxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxJQUFJLFVBQVUsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQW1CLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxPQUFPLEtBQUssU0FBUztvQkFDdkIsT0FBTyxHQUFHLE9BQU8sQ0FBQzthQUNyQjtZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7S0FBQTtJQUVELFdBQVcsQ0FBSSxJQUF1RSxFQUFFLElBQWE7UUFDbkcsSUFBSSxPQUFZLENBQUM7UUFDakIsTUFBTSxHQUFHLEdBQUcsSUFBQSxpQkFBVSxHQUFFLENBQUM7UUFDekIsS0FBSyxNQUFNLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDakQsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksSUFBSSxVQUFVLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQW1CLENBQUMsQ0FBQztZQUN6RCxJQUFJLE9BQU8sS0FBSyxTQUFTO2dCQUN2QixPQUFPLEdBQUcsT0FBTyxDQUFDO1NBQ3JCO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQzs7QUE1R0gsNENBNkdDO0FBM0dnQixrQ0FBaUIsR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSAgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtyZWdpc3RlciBhcyByZWdpc3RlclRzTm9kZX0gZnJvbSAndHMtbm9kZSc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMgYXMgQ2xpT3B0aW9uc30gZnJvbSAnLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtnZXRSb290RGlyLCBnZXRXb3JrRGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge1BsaW5rU2V0dGluZ3N9IGZyb20gJy4vY29uZmlnL2NvbmZpZy1zbGljZSc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7RHJhZnR9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vLyBpbXBvcnQge3JlZ2lzdGVyRXh0ZW5zaW9uLCBqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJy4vdHMtY29tcGlsZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbmNvbnN0IHtjeWFufSA9IGNoYWxrO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jb25maWctaGFuZGxlcicpO1xuXG5leHBvcnQge1BsaW5rU2V0dGluZ3N9O1xuZXhwb3J0IGludGVyZmFjZSBEcmNwQ29uZmlnIHtcbiAgLyoqXG4gICAqIFVzZWQgdG8gcnVuIGNvbW1hbmQgbGluZSBvcHRpb24gXCItY1wiIHNwZWNpZmllZCBUUy9KUyBmaWxlcyBvbmUgYnkgb25lIFxuICAgKi9cbiAgY29uZmlnSGFuZGxlck1ncjogQmVoYXZpb3JTdWJqZWN0PENvbmZpZ0hhbmRsZXJNZ3IgfCB1bmRlZmluZWQ+O1xuICAvKiogbG9kYXNoIGxpa2UgZ2V0IGZ1bmN0aW9uLCByZXR1cm4gc3BlY2lmaWMgc2V0dGluZyBwcm9wZXJ0eSB2YWx1ZVxuICAgKiBAcmV0dXJuIFxuICAgKi9cbiAgZ2V0PEsgZXh0ZW5kcyBrZXlvZiBQbGlua1NldHRpbmdzPihwYXRoOiBLLCBkZWZhdWx0VmFsdWU/OiBQbGlua1NldHRpbmdzW0tdKTogUGxpbmtTZXR0aW5nc1tLXTtcbiAgZ2V0KHBhdGg6IHN0cmluZyB8IHN0cmluZ1tdLCBkZWZhdWx0VmFsdWU/OiBhbnkpOiBhbnk7XG4gIHNldDxLIGV4dGVuZHMga2V5b2YgUGxpbmtTZXR0aW5ncz4ocGF0aDogSywgdmFsdWU6IFBsaW5rU2V0dGluZ3NbS10gfCBhbnkpOiB2b2lkO1xuICBzZXQocGF0aDogc3RyaW5nIHwgc3RyaW5nW10sIHZhbHVlOiBhbnkpOiB2b2lkO1xuICBjaGFuZ2UocmVkdWNlcjogKHNldHRpbmc6IERyYWZ0PFBsaW5rU2V0dGluZ3M+KSA9PiB2b2lkKTogdm9pZDtcbiAgLyoqXG4gICAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAgICogQG5hbWUgcmVzb2x2ZVxuICAgKiBAbWVtYmVyb2YgY29uZmlnXG4gICAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAgICogQHJldHVybiB7c3RyaW5nfSAgICAgYWJzb2x1dGUgcGF0aFxuICAgKi9cbiAgcmVzb2x2ZShkaXI6ICdyb290UGF0aCcgfCAnZGVzdERpcicgfCAnc3RhdGljRGlyJyB8ICdzZXJ2ZXJEaXInLCAuLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgcmVzb2x2ZSguLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgLyoqIEByZXR1cm4gYWxsIHNldHRpbmdzIGluIGEgYmlnIEpTT04gb2JqZWN0ICovXG4gICgpOiBQbGlua1NldHRpbmdzO1xuICByZWxvYWQoKTogUGxpbmtTZXR0aW5ncztcbiAgLy8gaW5pdChhcmd2OiBDbGlPcHRpb25zKTogUHJvbWlzZTxQbGlua1NldHRpbmdzPjtcbiAgaW5pdFN5bmMoYXJndjogQ2xpT3B0aW9ucyk6IFBsaW5rU2V0dGluZ3M7XG4gIGdldFN0b3JlKCk6IE9ic2VydmFibGU8UGxpbmtTZXR0aW5ncz47XG4gIC8qKlxuICAgKiBDb25maWdIYW5kbGVyTWdyIGNoYW5nZXMgZXZlcnl0aW1lIFBsaW5rIHNldHRpbmdzIGFyZSBpbml0aWFsaXplZCBvciByZWxvYWRlZC5cbiAgICogQ29uZmlnSGFuZGxlck1nciBpcyB1c2VkIHRvIHJ1biBjb21tYW5kIGxpbmUgb3B0aW9uIFwiLWNcIiBzcGVjaWZpZWQgVFMvSlMgZmlsZXMgb25lIGJ5IG9uZS5cbiAgICogXG4gICAqL1xuICBjb25maWdIYW5kbGVyTWdyQ2hhbmdlZChjYjogKGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJNZ3IpID0+IHZvaWQpOiB2b2lkO1xuICAvLyBjb25maWdIYW5kbGVyTWdyQ3JlYXRlZChjYjogKGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJNZ3IpID0+IFByb21pc2U8YW55PiB8IHZvaWQpOiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ0hhbmRsZXIge1xuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBjb25maWdTZXR0aW5nIE92ZXJyaWRlIHByb3BlcnRpZXMgZnJvbSBkaXN0L2NvbmZpZy55YW1sLCB3aGljaCBpcyBhbHNvIHlvdSBnZXQgZnJvbSBgYXBpLmNvbmZpZygpYFxuXHQgKiBAcGFyYW0gZHJjcENsaUFyZ3YgKGRlcHJlY2F0ZWQpIE92ZXJyaWRlIGNvbW1hbmQgbGluZSBhcmd1bWVtbnQgZm9yIERSQ1Bcblx0ICovXG4gIG9uQ29uZmlnKGNvbmZpZ1NldHRpbmc6IFBsaW5rU2V0dGluZ3MsIGNsaU9wdDogQ2xpT3B0aW9ucyk6IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdIYW5kbGVyTWdyIHtcbiAgc3RhdGljIGNvbXBpbGVyT3B0aW9uczogYW55O1xuICBwcml2YXRlIHN0YXRpYyBfdHNOb2RlUmVnaXN0ZXJlZCA9IGZhbHNlO1xuXG4gIHByaXZhdGUgc3RhdGljIGluaXRDb25maWdIYW5kbGVycyhmaWxlQW5kRXhwb3J0czogSXRlcmFibGU8W2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXT4sIHJvb3RQYXRoOiBzdHJpbmcpOlxuICBBcnJheTx7ZmlsZTogc3RyaW5nOyBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT4ge1xuICAgIGNvbnN0IGV4cG9ydGVkczogQXJyYXk8e2ZpbGU6IHN0cmluZzsgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+ID0gW107XG5cbiAgICBpZiAoIUNvbmZpZ0hhbmRsZXJNZ3IuX3RzTm9kZVJlZ2lzdGVyZWQpIHtcbiAgICAgIENvbmZpZ0hhbmRsZXJNZ3IuX3RzTm9kZVJlZ2lzdGVyZWQgPSB0cnVlO1xuXG4gICAgICBjb25zdCBpbnRlcm5hbFRzY2ZnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcblxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgICAgY29uc3Qge2NvbXBpbGVyT3B0aW9uc30gPSB0cy5yZWFkQ29uZmlnRmlsZShpbnRlcm5hbFRzY2ZnRmlsZSxcbiAgICAgICAgZmlsZSA9PiBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKVxuICAgICAgKS5jb25maWc7XG4gICAgICBDb25maWdIYW5kbGVyTWdyLmNvbXBpbGVyT3B0aW9ucyA9IGNvbXBpbGVyT3B0aW9ucztcblxuICAgICAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2Nlc3MuY3dkKCksICcuLycsIGNvbXBpbGVyT3B0aW9ucywge1xuICAgICAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgICAgIHdvcmtzcGFjZURpcjogZ2V0V29ya0RpcigpXG4gICAgICB9KTtcblxuICAgICAgY29tcGlsZXJPcHRpb25zLm1vZHVsZSA9ICdjb21tb25qcyc7XG4gICAgICBjb21waWxlck9wdGlvbnMubm9VbnVzZWRMb2NhbHMgPSBmYWxzZTtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5kaWFnbm9zdGljcyA9IHRydWU7XG4gICAgICBjb21waWxlck9wdGlvbnMuZGVjbGFyYXRpb24gPSBmYWxzZTtcbiAgICAgIGRlbGV0ZSBjb21waWxlck9wdGlvbnMucm9vdERpcjtcblxuICAgICAgLy8gY29uc29sZS5sb2coY29tcGlsZXJPcHRpb25zKTtcbiAgICAgIHJlZ2lzdGVyVHNOb2RlKHtcbiAgICAgICAgdHlwZUNoZWNrOiB0cnVlLFxuICAgICAgICBjb21waWxlck9wdGlvbnMsXG4gICAgICAgIHNraXBJZ25vcmU6IHRydWUsIC8vIGltcG9ydGFudCwgYnkgXCJ0cnVlXCIgd2lsbCBza2lwIGZpbGVzIGFyZSB1bmRlciBub2RlX21vZHVsZXNcbiAgICAgICAgY29tcGlsZXI6IHJlcXVpcmUucmVzb2x2ZSgndHlwZXNjcmlwdCcpLFxuICAgICAgICAvKipcbiAgICAgICAgICogSW1wb3J0YW50ISEgcHJldmVudCB0cy1ub2RlIGxvb2tpbmcgZm9yIHRzY29uZmlnLmpzb24gZnJvbSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAqL1xuICAgICAgICBza2lwUHJvamVjdDogdHJ1ZVxuICAgICAgICAsIHRyYW5zZm9ybWVyczoge1xuICAgICAgICAgIGJlZm9yZTogW1xuICAgICAgICAgICAgY29udGV4dCA9PiAoc3JjKSA9PiB7XG4gICAgICAgICAgICAgIC8vIGxvZy5pbmZvKCdiZWZvcmUgdHMtbm9kZSBjb21waWxlczonLCBzcmMuZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzcmMudGV4dCk7XG4gICAgICAgICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSxcbiAgICAgICAgICBhZnRlcjogW1xuICAgICAgICAgICAgY29udGV4dCA9PiAoc3JjKSA9PiB7XG4gICAgICAgICAgICAgIC8vIGxvZy5pbmZvKCd0cy1ub2RlIGNvbXBpbGVzOicsIHNyYy5maWxlTmFtZSk7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHNyYy50ZXh0KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtmaWxlLCBleHBvcnROYW1lXSBvZiBmaWxlQW5kRXhwb3J0cykge1xuICAgICAgY29uc3QgZXhwID0gcmVxdWlyZShQYXRoLnJlc29sdmUoZmlsZSkpO1xuICAgICAgZXhwb3J0ZWRzLnB1c2goe2ZpbGUsIGhhbmRsZXI6IGV4cFtleHBvcnROYW1lXSA/IGV4cFtleHBvcnROYW1lXSA6IGV4cH0pO1xuICAgIH1cbiAgICByZXR1cm4gZXhwb3J0ZWRzO1xuICB9XG4gIHByb3RlY3RlZCBjb25maWdIYW5kbGVyczogQXJyYXk8e2ZpbGU6IHN0cmluZzsgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+O1xuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIGZpbGVzIEFycmF5IG9mIHN0cmluZyB3aGljaCBpcyBpbiBmb3JtIG9mIFwiPGZpbGU+WyM8ZXhwb3J0IG5hbWU+XVwiXG4gICAqL1xuICBjb25zdHJ1Y3RvcihmaWxlQW5kRXhwb3J0czA6IEl0ZXJhYmxlPHN0cmluZz4gfCBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPikge1xuICAgIGNvbnN0IGZpcnN0ID0gZmlsZUFuZEV4cG9ydHMwW1N5bWJvbC5pdGVyYXRvcl0oKS5uZXh0KCk7XG4gICAgbGV0IGZpbGVBbmRFeHBvcnRzOiBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPjtcbiAgICBpZiAoIWZpcnN0LmRvbmUgJiYgdHlwZW9mIGZpcnN0LnZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgZmlsZUFuZEV4cG9ydHMgPSBBcnJheS5mcm9tKGZpbGVBbmRFeHBvcnRzMCBhcyBJdGVyYWJsZTxzdHJpbmc+KS5tYXAoZmlsZSA9PiBbZmlsZSwgJ2RlZmF1bHQnXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpbGVBbmRFeHBvcnRzID0gZmlsZUFuZEV4cG9ydHMwIGFzIEl0ZXJhYmxlPFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ10+O1xuICAgIH1cbiAgICB0aGlzLmNvbmZpZ0hhbmRsZXJzID0gQ29uZmlnSGFuZGxlck1nci5pbml0Q29uZmlnSGFuZGxlcnMoZmlsZUFuZEV4cG9ydHMsIGdldFJvb3REaXIoKSk7XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBmdW5jIHBhcmFtZXRlcnM6IChmaWxlUGF0aCwgbGFzdCByZXR1cm5lZCByZXN1bHQsIGhhbmRsZXIgZnVuY3Rpb24pLFxuXHQgKiByZXR1cm5zIHRoZSBjaGFuZ2VkIHJlc3VsdCwga2VlcCB0aGUgbGFzdCByZXN1bHQsIGlmIHJlc3R1cm5zIHVuZGVmaW5lZFxuXHQgKiBAcmV0dXJucyBsYXN0IHJlc3VsdFxuXHQgKi9cbiAgYXN5bmMgcnVuRWFjaDxIPihmdW5jOiAoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXI6IEgpID0+IFByb21pc2U8YW55PiB8IGFueSwgZGVzYz86IHN0cmluZykge1xuICAgIGxldCBsYXN0UmVzOiBhbnk7XG4gICAgZm9yIChjb25zdCB7ZmlsZSwgaGFuZGxlcn0gb2YgdGhpcy5jb25maWdIYW5kbGVycykge1xuICAgICAgbG9nLmRlYnVnKGBSZWFkICR7ZGVzYyB8fCAnc2V0dGluZ3MnfTpcXG4gIGAgKyBjeWFuKGZpbGUpKTtcbiAgICAgIGNvbnN0IGN1cnJSZXMgPSBhd2FpdCBmdW5jKGZpbGUsIGxhc3RSZXMsIGhhbmRsZXIgYXMgYW55IGFzIEgpO1xuICAgICAgaWYgKGN1cnJSZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgbGFzdFJlcyA9IGN1cnJSZXM7XG4gICAgfVxuICAgIHJldHVybiBsYXN0UmVzO1xuICB9XG5cbiAgcnVuRWFjaFN5bmM8SD4oZnVuYzogKGZpbGU6IHN0cmluZywgbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyOiBIKSA9PiBQcm9taXNlPGFueT4gfCBhbnksIGRlc2M/OiBzdHJpbmcpIHtcbiAgICBsZXQgbGFzdFJlczogYW55O1xuICAgIGNvbnN0IGN3ZCA9IGdldFdvcmtEaXIoKTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBsb2cuZGVidWcoYFJlYWQgJHtkZXNjIHx8ICdzZXR0aW5ncyd9OlxcbiAgYCArIGN5YW4oUGF0aC5yZWxhdGl2ZShjd2QsIGZpbGUpKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxufVxuXG5cbiJdfQ==