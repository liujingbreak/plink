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
// import {register as registerTsNode} from 'ts-node';
const ts_compiler_1 = require("./ts-compiler");
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
            // console.log(compilerOptions);
            const co = ts_compiler_1.jsonToCompilerOptions(compilerOptions);
            ts_compiler_1.registerExtension('.ts', co);
            // registerTsNode({
            //   typeCheck: true,
            //   compilerOptions
            //   // transformers: {
            //   //   before: [
            //   //     context => (src) => {
            //   //       console.log('ts-node compiles:', src.fileName);
            //   //       console.log(src.text);
            //   //       return src;
            //   //     }
            //   //   ]
            //   // }
            // });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN2QyxzREFBc0Q7QUFDdEQsK0NBQXVFO0FBQ3ZFLDRDQUFvQjtBQXdCcEIsTUFBYSxnQkFBZ0I7SUF5QzNCLFlBQVksS0FBZTtRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUF4Q0QsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQWU7UUFDdkMsTUFBTSxTQUFTLEdBQWtELEVBQUUsQ0FBQztRQUVwRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUU7WUFDdkMsZ0JBQWdCLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBRTFDLE1BQU0sRUFBQyxlQUFlLEVBQUMsR0FBRyxLQUFLLENBQzdCLFlBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUM5RSxDQUFDO1lBRUYsZUFBZSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUM7WUFDcEMsZUFBZSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDdkMsZUFBZSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFDdkMsZ0NBQWdDO1lBQ2hDLE1BQU0sRUFBRSxHQUFHLG1DQUFxQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2xELCtCQUFpQixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3QixtQkFBbUI7WUFDbkIscUJBQXFCO1lBQ3JCLG9CQUFvQjtZQUNwQix1QkFBdUI7WUFDdkIsbUJBQW1CO1lBQ25CLGlDQUFpQztZQUNqQyw2REFBNkQ7WUFDN0Qsb0NBQW9DO1lBQ3BDLHlCQUF5QjtZQUN6QixhQUFhO1lBQ2IsV0FBVztZQUNYLFNBQVM7WUFDVCxNQUFNO1lBQ04sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbkIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDeEMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQztZQUNuRSxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQU9EOzs7OztTQUtFO0lBQ0ksT0FBTyxDQUFJLElBQXVFOztZQUN0RixJQUFJLE9BQVksQ0FBQztZQUNqQixLQUFLLE1BQU0sRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNsRixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQW1CLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxPQUFPLEtBQUssU0FBUztvQkFDdkIsT0FBTyxHQUFHLE9BQU8sQ0FBQzthQUNyQjtZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7S0FBQTs7QUEzRE0sa0NBQWlCLEdBQUcsS0FBSyxDQUFDO0FBRG5DLDRDQTZEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCB7cGFyc2V9ID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5jb25zdCB7Y3lhbiwgZ3JlZW59ID0gcmVxdWlyZSgnY2hhbGsnKTtcbi8vIGltcG9ydCB7cmVnaXN0ZXIgYXMgcmVnaXN0ZXJUc05vZGV9IGZyb20gJ3RzLW5vZGUnO1xuaW1wb3J0IHtyZWdpc3RlckV4dGVuc2lvbiwganNvblRvQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3RzLWNvbXBpbGVyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRHJjcENvbmZpZyB7XG4gIGRvbmU6IFByb21pc2U8dm9pZD47XG4gIGNvbmZpZ0hhbmRsZXJNZ3IoKTogQ29uZmlnSGFuZGxlck1ncjtcbiAgZ2V0KHBhdGg6IHN0cmluZ3xzdHJpbmdbXSwgZGVmYXVsdFZhbHVlPzogYW55KTogYW55O1xuICBzZXQocGF0aDogc3RyaW5nfHN0cmluZ1tdLCB2YWx1ZTogYW55KTogdm9pZDtcbiAgcmVzb2x2ZShkaXI6ICdkZXN0RGlyJ3wnc3RhdGljRGlyJywgLi4ucGF0aDogc3RyaW5nW10pOiBzdHJpbmc7XG4gIHJlc29sdmUoLi4ucGF0aDogc3RyaW5nW10pOiBzdHJpbmc7XG4gICgpOiB7W3Byb3BlcnR5OiBzdHJpbmddOiBhbnl9O1xuICBsb2FkKCk6IFByb21pc2U8e1twcm9wZXJ0eTogc3RyaW5nXTogYW55fT47XG4gIHJlbG9hZCgpOiBQcm9taXNlPHtbcHJvcGVydHk6IHN0cmluZ106IGFueX0+O1xuICBpbml0KCk6IFByb21pc2U8e1twcm9wZXJ0eTogc3RyaW5nXTogYW55fT47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGNvbmZpZ1NldHRpbmcgT3ZlcnJpZGUgcHJvcGVydGllcyBmcm9tIGRpc3QvY29uZmlnLnlhbWwsIHdoaWNoIGlzIGFsc28geW91IGdldCBmcm9tIGBhcGkuY29uZmlnKClgXG5cdCAqIEBwYXJhbSBkcmNwQ2xpQXJndiBPdmVycmlkZSBjb21tYW5kIGxpbmUgYXJndW1lbW50IGZvciBEUkNQXG5cdCAqL1xuICBvbkNvbmZpZyhjb25maWdTZXR0aW5nOiB7W3Byb3A6IHN0cmluZ106IGFueX0sIGRyY3BDbGlBcmd2Pzoge1twcm9wOiBzdHJpbmddOiBhbnl9KTogUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdIYW5kbGVyTWdyIHtcbiAgc3RhdGljIF90c05vZGVSZWdpc3RlcmVkID0gZmFsc2U7XG5cbiAgc3RhdGljIGluaXRDb25maWdIYW5kbGVycyhmaWxlczogc3RyaW5nW10pOiBBcnJheTx7ZmlsZTogc3RyaW5nLCBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT4ge1xuICAgIGNvbnN0IGV4cG9ydGVkczogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+ID0gW107XG5cbiAgICBpZiAoIUNvbmZpZ0hhbmRsZXJNZ3IuX3RzTm9kZVJlZ2lzdGVyZWQpIHtcbiAgICAgIENvbmZpZ0hhbmRsZXJNZ3IuX3RzTm9kZVJlZ2lzdGVyZWQgPSB0cnVlO1xuXG4gICAgICBjb25zdCB7Y29tcGlsZXJPcHRpb25zfSA9IHBhcnNlKFxuICAgICAgICBmcy5yZWFkRmlsZVN5bmMocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL3RzY29uZmlnLmpzb24nKSwgJ3V0ZjgnKVxuICAgICAgKTtcblxuICAgICAgY29tcGlsZXJPcHRpb25zLm1vZHVsZSA9ICdjb21tb25qcyc7XG4gICAgICBjb21waWxlck9wdGlvbnMuaXNvbGF0ZWRNb2R1bGVzID0gdHJ1ZTtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5ub1VudXNlZExvY2FscyA9IGZhbHNlO1xuICAgICAgLy8gY29uc29sZS5sb2coY29tcGlsZXJPcHRpb25zKTtcbiAgICAgIGNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgICByZWdpc3RlckV4dGVuc2lvbignLnRzJywgY28pO1xuICAgICAgLy8gcmVnaXN0ZXJUc05vZGUoe1xuICAgICAgLy8gICB0eXBlQ2hlY2s6IHRydWUsXG4gICAgICAvLyAgIGNvbXBpbGVyT3B0aW9uc1xuICAgICAgLy8gICAvLyB0cmFuc2Zvcm1lcnM6IHtcbiAgICAgIC8vICAgLy8gICBiZWZvcmU6IFtcbiAgICAgIC8vICAgLy8gICAgIGNvbnRleHQgPT4gKHNyYykgPT4ge1xuICAgICAgLy8gICAvLyAgICAgICBjb25zb2xlLmxvZygndHMtbm9kZSBjb21waWxlczonLCBzcmMuZmlsZU5hbWUpO1xuICAgICAgLy8gICAvLyAgICAgICBjb25zb2xlLmxvZyhzcmMudGV4dCk7XG4gICAgICAvLyAgIC8vICAgICAgIHJldHVybiBzcmM7XG4gICAgICAvLyAgIC8vICAgICB9XG4gICAgICAvLyAgIC8vICAgXVxuICAgICAgLy8gICAvLyB9XG4gICAgICAvLyB9KTtcbiAgICAgIGZpbGVzLmZvckVhY2goZmlsZSA9PiB7XG4gICAgICAgIGNvbnN0IGV4cCA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGZpbGUpKTtcbiAgICAgICAgZXhwb3J0ZWRzLnB1c2goe2ZpbGUsIGhhbmRsZXI6IGV4cC5kZWZhdWx0ID8gZXhwLmRlZmF1bHQgOiBleHB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZXhwb3J0ZWRzO1xuICB9XG4gIHByb3RlY3RlZCBjb25maWdIYW5kbGVyczogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+O1xuXG4gIGNvbnN0cnVjdG9yKGZpbGVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuY29uZmlnSGFuZGxlcnMgPSBDb25maWdIYW5kbGVyTWdyLmluaXRDb25maWdIYW5kbGVycyhmaWxlcyk7XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBmdW5jIHBhcmFtZXRlcnM6IChmaWxlUGF0aCwgbGFzdCByZXR1cm5lZCByZXN1bHQsIGhhbmRsZXIgZnVuY3Rpb24pLFxuXHQgKiByZXR1cm5zIHRoZSBjaGFuZ2VkIHJlc3VsdCwga2VlcCB0aGUgbGFzdCByZXN1bHQsIGlmIHJlc3R1cm5zIHVuZGVmaW5lZFxuXHQgKiBAcmV0dXJucyBsYXN0IHJlc3VsdFxuXHQgKi9cbiAgYXN5bmMgcnVuRWFjaDxIPihmdW5jOiAoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXI6IEgpID0+IFByb21pc2U8YW55PiB8IGFueSkge1xuICAgIGxldCBsYXN0UmVzOiBhbnk7XG4gICAgZm9yIChjb25zdCB7ZmlsZSwgaGFuZGxlcn0gb2YgdGhpcy5jb25maWdIYW5kbGVycykge1xuICAgICAgY29uc29sZS5sb2coZ3JlZW4oUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykgKyAnIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgICAgY29uc3QgY3VyclJlcyA9IGF3YWl0IGZ1bmMoZmlsZSwgbGFzdFJlcywgaGFuZGxlciBhcyBhbnkgYXMgSCk7XG4gICAgICBpZiAoY3VyclJlcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICBsYXN0UmVzID0gY3VyclJlcztcbiAgICB9XG4gICAgcmV0dXJuIGxhc3RSZXM7XG4gIH1cbn1cbiJdfQ==