"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const Path = __importStar(require("path"));
const { parse } = require('comment-json');
const { cyan, green } = require('chalk');
const ts_node_1 = require("ts-node");
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
const fs_1 = __importDefault(require("fs"));
class ConfigHandlerMgr {
    constructor(files) {
        this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files);
    }
    static initConfigHandlers(files) {
        const exporteds = [];
        if (!ConfigHandlerMgr._tsNodeRegistered) {
            ConfigHandlerMgr._tsNodeRegistered = true;
            const { compilerOptions } = parse(fs_1.default.readFileSync(require.resolve('dr-comp-package/wfh/tsconfig.json'), 'utf8'));
            compilerOptions.module = 'commonjs';
            compilerOptions.isolatedModules = true;
            compilerOptions.noUnusedLocals = false;
            // const co = jsonToCompilerOptions(compilerOptions);
            // registerExtension('.ts', co);
            ts_node_1.register({
                typeCheck: true,
                compilerOptions
                // ,transformers: {
                //   after: [
                //     context => (src) => {
                //       console.log('ts-node compiles:', src.fileName);
                //       console.log(src.text);
                //       return src;
                //     }
                //   ]
                // }
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
}
ConfigHandlerMgr._tsNodeRegistered = false;
exports.ConfigHandlerMgr = ConfigHandlerMgr;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN2QyxxQ0FBbUQ7QUFDbkQsMEVBQTBFO0FBQzFFLDRDQUFvQjtBQXdCcEIsTUFBYSxnQkFBZ0I7SUF5QzNCLFlBQVksS0FBZTtRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUF4Q0QsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQWU7UUFDdkMsTUFBTSxTQUFTLEdBQWtELEVBQUUsQ0FBQztRQUVwRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUU7WUFDdkMsZ0JBQWdCLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBRTFDLE1BQU0sRUFBQyxlQUFlLEVBQUMsR0FBRyxLQUFLLENBQzdCLFlBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUM5RSxDQUFDO1lBRUYsZUFBZSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUM7WUFDcEMsZUFBZSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDdkMsZUFBZSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFFdkMscURBQXFEO1lBQ3JELGdDQUFnQztZQUNoQyxrQkFBYyxDQUFDO2dCQUNiLFNBQVMsRUFBRSxJQUFJO2dCQUNmLGVBQWU7Z0JBQ2YsbUJBQW1CO2dCQUNuQixhQUFhO2dCQUNiLDRCQUE0QjtnQkFDNUIsd0RBQXdEO2dCQUN4RCwrQkFBK0I7Z0JBQy9CLG9CQUFvQjtnQkFDcEIsUUFBUTtnQkFDUixNQUFNO2dCQUNOLElBQUk7YUFDTCxDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNuQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO1lBQ25FLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBT0Q7Ozs7O1NBS0U7SUFDSSxPQUFPLENBQUksSUFBdUU7O1lBQ3RGLElBQUksT0FBWSxDQUFDO1lBQ2pCLEtBQUssTUFBTSxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2xGLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBbUIsQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLE9BQU8sS0FBSyxTQUFTO29CQUN2QixPQUFPLEdBQUcsT0FBTyxDQUFDO2FBQ3JCO1lBQ0QsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztLQUFBOztBQTNETSxrQ0FBaUIsR0FBRyxLQUFLLENBQUM7QUFEbkMsNENBNkRDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcbmNvbnN0IHtjeWFuLCBncmVlbn0gPSByZXF1aXJlKCdjaGFsaycpO1xuaW1wb3J0IHtyZWdpc3RlciBhcyByZWdpc3RlclRzTm9kZX0gZnJvbSAndHMtbm9kZSc7XG4vLyBpbXBvcnQge3JlZ2lzdGVyRXh0ZW5zaW9uLCBqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJy4vdHMtY29tcGlsZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcblxuZXhwb3J0IGludGVyZmFjZSBEcmNwQ29uZmlnIHtcbiAgZG9uZTogUHJvbWlzZTx2b2lkPjtcbiAgY29uZmlnSGFuZGxlck1ncigpOiBDb25maWdIYW5kbGVyTWdyO1xuICBnZXQocGF0aDogc3RyaW5nfHN0cmluZ1tdLCBkZWZhdWx0VmFsdWU/OiBhbnkpOiBhbnk7XG4gIHNldChwYXRoOiBzdHJpbmd8c3RyaW5nW10sIHZhbHVlOiBhbnkpOiB2b2lkO1xuICByZXNvbHZlKGRpcjogJ2Rlc3REaXInfCdzdGF0aWNEaXInLCAuLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgcmVzb2x2ZSguLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgKCk6IHtbcHJvcGVydHk6IHN0cmluZ106IGFueX07XG4gIGxvYWQoKTogUHJvbWlzZTx7W3Byb3BlcnR5OiBzdHJpbmddOiBhbnl9PjtcbiAgcmVsb2FkKCk6IFByb21pc2U8e1twcm9wZXJ0eTogc3RyaW5nXTogYW55fT47XG4gIGluaXQoKTogUHJvbWlzZTx7W3Byb3BlcnR5OiBzdHJpbmddOiBhbnl9Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb25maWdIYW5kbGVyIHtcbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gY29uZmlnU2V0dGluZyBPdmVycmlkZSBwcm9wZXJ0aWVzIGZyb20gZGlzdC9jb25maWcueWFtbCwgd2hpY2ggaXMgYWxzbyB5b3UgZ2V0IGZyb20gYGFwaS5jb25maWcoKWBcblx0ICogQHBhcmFtIGRyY3BDbGlBcmd2IE92ZXJyaWRlIGNvbW1hbmQgbGluZSBhcmd1bWVtbnQgZm9yIERSQ1Bcblx0ICovXG4gIG9uQ29uZmlnKGNvbmZpZ1NldHRpbmc6IHtbcHJvcDogc3RyaW5nXTogYW55fSwgZHJjcENsaUFyZ3Y/OiB7W3Byb3A6IHN0cmluZ106IGFueX0pOiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0hhbmRsZXJNZ3Ige1xuICBzdGF0aWMgX3RzTm9kZVJlZ2lzdGVyZWQgPSBmYWxzZTtcblxuICBzdGF0aWMgaW5pdENvbmZpZ0hhbmRsZXJzKGZpbGVzOiBzdHJpbmdbXSk6IEFycmF5PHtmaWxlOiBzdHJpbmcsIGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiB7XG4gICAgY29uc3QgZXhwb3J0ZWRzOiBBcnJheTx7ZmlsZTogc3RyaW5nLCBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT4gPSBbXTtcblxuICAgIGlmICghQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCkge1xuICAgICAgQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCA9IHRydWU7XG5cbiAgICAgIGNvbnN0IHtjb21waWxlck9wdGlvbnN9ID0gcGFyc2UoXG4gICAgICAgIGZzLnJlYWRGaWxlU3luYyhyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvdHNjb25maWcuanNvbicpLCAndXRmOCcpXG4gICAgICApO1xuXG4gICAgICBjb21waWxlck9wdGlvbnMubW9kdWxlID0gJ2NvbW1vbmpzJztcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5pc29sYXRlZE1vZHVsZXMgPSB0cnVlO1xuICAgICAgY29tcGlsZXJPcHRpb25zLm5vVW51c2VkTG9jYWxzID0gZmFsc2U7XG5cbiAgICAgIC8vIGNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgICAvLyByZWdpc3RlckV4dGVuc2lvbignLnRzJywgY28pO1xuICAgICAgcmVnaXN0ZXJUc05vZGUoe1xuICAgICAgICB0eXBlQ2hlY2s6IHRydWUsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9uc1xuICAgICAgICAvLyAsdHJhbnNmb3JtZXJzOiB7XG4gICAgICAgIC8vICAgYWZ0ZXI6IFtcbiAgICAgICAgLy8gICAgIGNvbnRleHQgPT4gKHNyYykgPT4ge1xuICAgICAgICAvLyAgICAgICBjb25zb2xlLmxvZygndHMtbm9kZSBjb21waWxlczonLCBzcmMuZmlsZU5hbWUpO1xuICAgICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhzcmMudGV4dCk7XG4gICAgICAgIC8vICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vICAgXVxuICAgICAgICAvLyB9XG4gICAgICB9KTtcbiAgICAgIGZpbGVzLmZvckVhY2goZmlsZSA9PiB7XG4gICAgICAgIGNvbnN0IGV4cCA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGZpbGUpKTtcbiAgICAgICAgZXhwb3J0ZWRzLnB1c2goe2ZpbGUsIGhhbmRsZXI6IGV4cC5kZWZhdWx0ID8gZXhwLmRlZmF1bHQgOiBleHB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZXhwb3J0ZWRzO1xuICB9XG4gIHByb3RlY3RlZCBjb25maWdIYW5kbGVyczogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+O1xuXG4gIGNvbnN0cnVjdG9yKGZpbGVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuY29uZmlnSGFuZGxlcnMgPSBDb25maWdIYW5kbGVyTWdyLmluaXRDb25maWdIYW5kbGVycyhmaWxlcyk7XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBmdW5jIHBhcmFtZXRlcnM6IChmaWxlUGF0aCwgbGFzdCByZXR1cm5lZCByZXN1bHQsIGhhbmRsZXIgZnVuY3Rpb24pLFxuXHQgKiByZXR1cm5zIHRoZSBjaGFuZ2VkIHJlc3VsdCwga2VlcCB0aGUgbGFzdCByZXN1bHQsIGlmIHJlc3R1cm5zIHVuZGVmaW5lZFxuXHQgKiBAcmV0dXJucyBsYXN0IHJlc3VsdFxuXHQgKi9cbiAgYXN5bmMgcnVuRWFjaDxIPihmdW5jOiAoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXI6IEgpID0+IFByb21pc2U8YW55PiB8IGFueSkge1xuICAgIGxldCBsYXN0UmVzOiBhbnk7XG4gICAgZm9yIChjb25zdCB7ZmlsZSwgaGFuZGxlcn0gb2YgdGhpcy5jb25maWdIYW5kbGVycykge1xuICAgICAgY29uc29sZS5sb2coZ3JlZW4oUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykgKyAnIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgICAgY29uc3QgY3VyclJlcyA9IGF3YWl0IGZ1bmMoZmlsZSwgbGFzdFJlcywgaGFuZGxlciBhcyBhbnkgYXMgSCk7XG4gICAgICBpZiAoY3VyclJlcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICBsYXN0UmVzID0gY3VyclJlcztcbiAgICB9XG4gICAgcmV0dXJuIGxhc3RSZXM7XG4gIH1cbn1cbiJdfQ==