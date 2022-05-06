"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigHandlerMgr = void 0;
/* eslint-disable  no-console */
const Path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = require("log4js");
const misc_1 = require("./utils/misc");
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
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
            require('./utils/ts-node-setup');
        }
        for (const [file, exportName] of fileAndExports) {
            const absFile = Path.isAbsolute(file) ? file : Path.resolve(file);
            const exp = require(absFile);
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
    async runEach(func, desc) {
        let lastRes;
        for (const { file, handler } of this.configHandlers) {
            log.debug(`Read ${desc || 'settings'}:\n  ` + cyan(file));
            const currRes = await func(file, lastRes, handler);
            if (currRes !== undefined)
                lastRes = currRes;
        }
        return lastRes;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdDQUFnQztBQUNoQywyQ0FBNkI7QUFDN0Isa0RBQTBCO0FBRTFCLG1DQUFpQztBQUlqQyx1Q0FBb0Q7QUFHcEQsMEVBQTBFO0FBQzFFLG1FQUFtRTtBQUNuRSxNQUFNLEVBQUMsSUFBSSxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBZ0Q5QyxNQUFhLGdCQUFnQjtJQW9CM0I7OztPQUdHO0lBQ0gsWUFBWSxlQUFnRjtRQUMxRixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEQsSUFBSSxjQUE0RCxDQUFDO1FBQ2pFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7WUFDbEQsY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBbUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDakc7YUFBTTtZQUNMLGNBQWMsR0FBRyxlQUErRCxDQUFDO1NBQ2xGO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsSUFBQSxpQkFBVSxHQUFFLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBOUJPLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxjQUE0RCxFQUFFLFFBQWdCO1FBRTlHLE1BQU0sU0FBUyxHQUFrRCxFQUFFLENBQUM7UUFFcEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFO1lBQ3ZDLGdCQUFnQixDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUMxQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztTQUNsQztRQUNELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSSxjQUFjLEVBQUU7WUFDL0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQWdDLENBQUM7WUFDNUQsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUM7U0FDMUU7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBa0JEOzs7OztTQUtFO0lBQ0YsS0FBSyxDQUFDLE9BQU8sQ0FBSSxJQUF1RSxFQUFFLElBQWE7UUFDckcsSUFBSSxPQUFZLENBQUM7UUFDakIsS0FBSyxNQUFNLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDakQsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksSUFBSSxVQUFVLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMxRCxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQW1CLENBQUMsQ0FBQztZQUMvRCxJQUFJLE9BQU8sS0FBSyxTQUFTO2dCQUN2QixPQUFPLEdBQUcsT0FBTyxDQUFDO1NBQ3JCO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVELFdBQVcsQ0FBSSxJQUF1RSxFQUFFLElBQWE7UUFDbkcsSUFBSSxPQUFZLENBQUM7UUFDakIsTUFBTSxHQUFHLEdBQUcsSUFBQSxpQkFBVSxHQUFFLENBQUM7UUFDekIsS0FBSyxNQUFNLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDakQsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksSUFBSSxVQUFVLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQW1CLENBQUMsQ0FBQztZQUN6RCxJQUFJLE9BQU8sS0FBSyxTQUFTO2dCQUN2QixPQUFPLEdBQUcsT0FBTyxDQUFDO1NBQ3JCO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQzs7QUE5REgsNENBK0RDO0FBOURnQixrQ0FBaUIsR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSAgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge0RyYWZ0fSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuL2NtZC90eXBlcyc7XG5pbXBvcnQge2dldFJvb3REaXIsIGdldFdvcmtEaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge1BsaW5rU2V0dGluZ3N9IGZyb20gJy4vY29uZmlnL2NvbmZpZy1zbGljZSc7XG5cbi8vIGltcG9ydCB7cmVnaXN0ZXJFeHRlbnNpb24sIGpzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi90cy1jb21waWxlcic7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG5jb25zdCB7Y3lhbn0gPSBjaGFsaztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsuY29uZmlnLWhhbmRsZXInKTtcblxuZXhwb3J0IHtQbGlua1NldHRpbmdzfTtcbmV4cG9ydCBpbnRlcmZhY2UgRHJjcENvbmZpZyB7XG4gIC8qKlxuICAgKiBVc2VkIHRvIHJ1biBjb21tYW5kIGxpbmUgb3B0aW9uIFwiLWNcIiBzcGVjaWZpZWQgVFMvSlMgZmlsZXMgb25lIGJ5IG9uZSBcbiAgICovXG4gIGNvbmZpZ0hhbmRsZXJNZ3I6IEJlaGF2aW9yU3ViamVjdDxDb25maWdIYW5kbGVyTWdyIHwgdW5kZWZpbmVkPjtcbiAgLyoqIGxvZGFzaCBsaWtlIGdldCBmdW5jdGlvbiwgcmV0dXJuIHNwZWNpZmljIHNldHRpbmcgcHJvcGVydHkgdmFsdWVcbiAgICogQHJldHVybiBcbiAgICovXG4gIGdldDxLIGV4dGVuZHMga2V5b2YgUGxpbmtTZXR0aW5ncz4ocGF0aDogSywgZGVmYXVsdFZhbHVlPzogUGxpbmtTZXR0aW5nc1tLXSk6IFBsaW5rU2V0dGluZ3NbS107XG4gIGdldChwYXRoOiBzdHJpbmcgfCBzdHJpbmdbXSwgZGVmYXVsdFZhbHVlPzogYW55KTogYW55O1xuICBzZXQ8SyBleHRlbmRzIGtleW9mIFBsaW5rU2V0dGluZ3M+KHBhdGg6IEssIHZhbHVlOiBQbGlua1NldHRpbmdzW0tdIHwgYW55KTogdm9pZDtcbiAgc2V0KHBhdGg6IHN0cmluZyB8IHN0cmluZ1tdLCB2YWx1ZTogYW55KTogdm9pZDtcbiAgY2hhbmdlKHJlZHVjZXI6IChzZXR0aW5nOiBEcmFmdDxQbGlua1NldHRpbmdzPikgPT4gdm9pZCk6IHZvaWQ7XG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgcGF0aCBiYXNlZCBvbiBgcm9vdFBhdGhgXG4gICAqIEBuYW1lIHJlc29sdmVcbiAgICogQG1lbWJlcm9mIGNvbmZpZ1xuICAgKiBAcGFyYW0ge3N0cmluZ30gZGlyIG5hbWUgb3IgcHJvcGVydHkgcGF0aCwgbGlrZSBcIm5hbWVcIiwgXCJuYW1lLmNoaWxkUHJvcFsxXVwiXG4gICAqIEByZXR1cm4ge3N0cmluZ30gYWJzb2x1dGUgcGF0aFxuICAgKi9cbiAgcmVzb2x2ZShkaXI6ICdyb290UGF0aCcgfCAnZGVzdERpcicgfCAnc3RhdGljRGlyJyB8ICdzZXJ2ZXJEaXInLCAuLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgcmVzb2x2ZSguLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgLyoqIEByZXR1cm4gYWxsIHNldHRpbmdzIGluIGEgYmlnIEpTT04gb2JqZWN0ICovXG4gICgpOiBQbGlua1NldHRpbmdzO1xuICByZWxvYWQoKTogUGxpbmtTZXR0aW5ncztcbiAgLy8gaW5pdChhcmd2OiBDbGlPcHRpb25zKTogUHJvbWlzZTxQbGlua1NldHRpbmdzPjtcbiAgaW5pdFN5bmMoYXJndjogQ2xpT3B0aW9ucyk6IFBsaW5rU2V0dGluZ3M7XG4gIGdldFN0b3JlKCk6IE9ic2VydmFibGU8UGxpbmtTZXR0aW5ncz47XG4gIC8qKlxuICAgKiBDb25maWdIYW5kbGVyTWdyIGNoYW5nZXMgZXZlcnl0aW1lIFBsaW5rIHNldHRpbmdzIGFyZSBpbml0aWFsaXplZCBvciByZWxvYWRlZC5cbiAgICogQ29uZmlnSGFuZGxlck1nciBpcyB1c2VkIHRvIHJ1biBjb21tYW5kIGxpbmUgb3B0aW9uIFwiLWNcIiBzcGVjaWZpZWQgVFMvSlMgZmlsZXMgb25lIGJ5IG9uZS5cbiAgICogXG4gICAqL1xuICBjb25maWdIYW5kbGVyTWdyQ2hhbmdlZChjYjogKGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJNZ3IpID0+IHZvaWQpOiB2b2lkO1xuICAvLyBjb25maWdIYW5kbGVyTWdyQ3JlYXRlZChjYjogKGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJNZ3IpID0+IFByb21pc2U8YW55PiB8IHZvaWQpOiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ0hhbmRsZXIge1xuICAvKipcbiAgICogQHBhcmFtIGNvbmZpZ1NldHRpbmcgT3ZlcnJpZGUgcHJvcGVydGllcyBmcm9tIGRpc3QvY29uZmlnLnlhbWwsIHdoaWNoIGlzIGFsc28geW91IGdldCBmcm9tIGBhcGkuY29uZmlnKClgXG4gICAqIEBwYXJhbSBjbGlPcHQgKGRlcHJlY2F0ZWQpIE92ZXJyaWRlIGNvbW1hbmQgbGluZSBhcmd1bWVtbnQgZm9yIERSQ1BcbiAgICovXG4gIG9uQ29uZmlnKGNvbmZpZ1NldHRpbmc6IFBsaW5rU2V0dGluZ3MsIGNsaU9wdDogQ2xpT3B0aW9ucyk6IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdIYW5kbGVyTWdyIHtcbiAgcHJpdmF0ZSBzdGF0aWMgX3RzTm9kZVJlZ2lzdGVyZWQgPSBmYWxzZTtcblxuICBwcml2YXRlIHN0YXRpYyBpbml0Q29uZmlnSGFuZGxlcnMoZmlsZUFuZEV4cG9ydHM6IEl0ZXJhYmxlPFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ10+LCByb290UGF0aDogc3RyaW5nKTpcbiAgQXJyYXk8e2ZpbGU6IHN0cmluZzsgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+IHtcbiAgICBjb25zdCBleHBvcnRlZHM6IEFycmF5PHtmaWxlOiBzdHJpbmc7IGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiA9IFtdO1xuXG4gICAgaWYgKCFDb25maWdIYW5kbGVyTWdyLl90c05vZGVSZWdpc3RlcmVkKSB7XG4gICAgICBDb25maWdIYW5kbGVyTWdyLl90c05vZGVSZWdpc3RlcmVkID0gdHJ1ZTtcbiAgICAgIHJlcXVpcmUoJy4vdXRpbHMvdHMtbm9kZS1zZXR1cCcpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtmaWxlLCBleHBvcnROYW1lXSBvZiBmaWxlQW5kRXhwb3J0cykge1xuICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGguaXNBYnNvbHV0ZShmaWxlKSA/IGZpbGUgOiBQYXRoLnJlc29sdmUoZmlsZSk7XG4gICAgICBjb25zdCBleHAgPSByZXF1aXJlKGFic0ZpbGUpIGFzIHtbZXhwb3J0TmFtZTogc3RyaW5nXTogYW55fTtcbiAgICAgIGV4cG9ydGVkcy5wdXNoKHtmaWxlLCBoYW5kbGVyOiBleHBbZXhwb3J0TmFtZV0gPyBleHBbZXhwb3J0TmFtZV0gOiBleHB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGV4cG9ydGVkcztcbiAgfVxuICBwcm90ZWN0ZWQgY29uZmlnSGFuZGxlcnM6IEFycmF5PHtmaWxlOiBzdHJpbmc7IGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PjtcblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSBmaWxlcyBBcnJheSBvZiBzdHJpbmcgd2hpY2ggaXMgaW4gZm9ybSBvZiBcIjxmaWxlPlsjPGV4cG9ydCBuYW1lPl1cIlxuICAgKi9cbiAgY29uc3RydWN0b3IoZmlsZUFuZEV4cG9ydHMwOiBJdGVyYWJsZTxzdHJpbmc+IHwgSXRlcmFibGU8W2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXT4pIHtcbiAgICBjb25zdCBmaXJzdCA9IGZpbGVBbmRFeHBvcnRzMFtTeW1ib2wuaXRlcmF0b3JdKCkubmV4dCgpO1xuICAgIGxldCBmaWxlQW5kRXhwb3J0czogSXRlcmFibGU8W2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXT47XG4gICAgaWYgKCFmaXJzdC5kb25lICYmIHR5cGVvZiBmaXJzdC52YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGZpbGVBbmRFeHBvcnRzID0gQXJyYXkuZnJvbShmaWxlQW5kRXhwb3J0czAgYXMgSXRlcmFibGU8c3RyaW5nPikubWFwKGZpbGUgPT4gW2ZpbGUsICdkZWZhdWx0J10pO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaWxlQW5kRXhwb3J0cyA9IGZpbGVBbmRFeHBvcnRzMCBhcyBJdGVyYWJsZTxbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddPjtcbiAgICB9XG4gICAgdGhpcy5jb25maWdIYW5kbGVycyA9IENvbmZpZ0hhbmRsZXJNZ3IuaW5pdENvbmZpZ0hhbmRsZXJzKGZpbGVBbmRFeHBvcnRzLCBnZXRSb290RGlyKCkpO1xuICB9XG5cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gZnVuYyBwYXJhbWV0ZXJzOiAoZmlsZVBhdGgsIGxhc3QgcmV0dXJuZWQgcmVzdWx0LCBoYW5kbGVyIGZ1bmN0aW9uKSxcblx0ICogcmV0dXJucyB0aGUgY2hhbmdlZCByZXN1bHQsIGtlZXAgdGhlIGxhc3QgcmVzdWx0LCBpZiByZXN0dXJucyB1bmRlZmluZWRcblx0ICogQHJldHVybnMgbGFzdCByZXN1bHRcblx0ICovXG4gIGFzeW5jIHJ1bkVhY2g8SD4oZnVuYzogKGZpbGU6IHN0cmluZywgbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyOiBIKSA9PiBQcm9taXNlPGFueT4gfCBhbnksIGRlc2M/OiBzdHJpbmcpIHtcbiAgICBsZXQgbGFzdFJlczogYW55O1xuICAgIGZvciAoY29uc3Qge2ZpbGUsIGhhbmRsZXJ9IG9mIHRoaXMuY29uZmlnSGFuZGxlcnMpIHtcbiAgICAgIGxvZy5kZWJ1ZyhgUmVhZCAke2Rlc2MgfHwgJ3NldHRpbmdzJ306XFxuICBgICsgY3lhbihmaWxlKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gYXdhaXQgZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxuXG4gIHJ1bkVhY2hTeW5jPEg+KGZ1bmM6IChmaWxlOiBzdHJpbmcsIGxhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcjogSCkgPT4gUHJvbWlzZTxhbnk+IHwgYW55LCBkZXNjPzogc3RyaW5nKSB7XG4gICAgbGV0IGxhc3RSZXM6IGFueTtcbiAgICBjb25zdCBjd2QgPSBnZXRXb3JrRGlyKCk7XG4gICAgZm9yIChjb25zdCB7ZmlsZSwgaGFuZGxlcn0gb2YgdGhpcy5jb25maWdIYW5kbGVycykge1xuICAgICAgbG9nLmRlYnVnKGBSZWFkICR7ZGVzYyB8fCAnc2V0dGluZ3MnfTpcXG4gIGAgKyBjeWFuKFBhdGgucmVsYXRpdmUoY3dkLCBmaWxlKSkpO1xuICAgICAgY29uc3QgY3VyclJlcyA9IGZ1bmMoZmlsZSwgbGFzdFJlcywgaGFuZGxlciBhcyBhbnkgYXMgSCk7XG4gICAgICBpZiAoY3VyclJlcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICBsYXN0UmVzID0gY3VyclJlcztcbiAgICB9XG4gICAgcmV0dXJuIGxhc3RSZXM7XG4gIH1cbn1cblxuXG4iXX0=