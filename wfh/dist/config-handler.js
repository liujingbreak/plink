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
const fs_1 = __importDefault(require("fs"));
class ConfigHandlerMgr {
    constructor(files) {
        this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files);
    }
    static initConfigHandlers(files) {
        // const files = browserOptions.drcpConfig ? browserOptions.drcpConfig.split(/\s*[,;:]\s*/) : [];
        const exporteds = [];
        if (!ConfigHandlerMgr._tsNodeRegistered) {
            ConfigHandlerMgr._tsNodeRegistered = true;
            // const compilerOpt = readTsConfig(require.resolve('dr-comp-package/wfh/tsconfig.json'));
            // delete compilerOpt.rootDir;
            // delete compilerOpt.rootDirs;
            // registerExtension('.ts', compilerOpt);
            const tsConfigOptions = parse(fs_1.default.readFileSync(fs_1.default.existsSync('tsconfig.json') ?
                'tsconfig.json' : require.resolve('dr-comp-package/wfh/tsconfig.json'), 'utf8'));
            ts_node_1.register({
                typeCheck: true,
                compilerOptions: tsConfigOptions.compilerOptions
                // transformers: {
                //   before: [
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN2QyxxQ0FBbUQ7QUFDbkQsNENBQW9CO0FBd0JwQixNQUFhLGdCQUFnQjtJQXFDM0IsWUFBWSxLQUFlO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQXBDRCxNQUFNLENBQUMsa0JBQWtCLENBQUMsS0FBZTtRQUN2QyxpR0FBaUc7UUFDakcsTUFBTSxTQUFTLEdBQWtELEVBQUUsQ0FBQztRQUVwRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUU7WUFDdkMsZ0JBQWdCLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBQzFDLDBGQUEwRjtZQUMxRiw4QkFBOEI7WUFDOUIsK0JBQStCO1lBQy9CLHlDQUF5QztZQUN6QyxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FBQyxZQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQzVFLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDbkYsa0JBQWMsQ0FBQztnQkFDYixTQUFTLEVBQUUsSUFBSTtnQkFDZixlQUFlLEVBQUUsZUFBZSxDQUFDLGVBQWU7Z0JBQ2hELGtCQUFrQjtnQkFDbEIsY0FBYztnQkFDZCw0QkFBNEI7Z0JBQzVCLHdEQUF3RDtnQkFDeEQsK0JBQStCO2dCQUMvQixvQkFBb0I7Z0JBQ3BCLFFBQVE7Z0JBQ1IsTUFBTTtnQkFDTixJQUFJO2FBQ0wsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbkIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDeEMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQztZQUNuRSxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQU9EOzs7OztTQUtFO0lBQ0ksT0FBTyxDQUFJLElBQXVFOztZQUN0RixJQUFJLE9BQVksQ0FBQztZQUNqQixLQUFLLE1BQU0sRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNsRixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQW1CLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxPQUFPLEtBQUssU0FBUztvQkFDdkIsT0FBTyxHQUFHLE9BQU8sQ0FBQzthQUNyQjtZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7S0FBQTs7QUF2RE0sa0NBQWlCLEdBQUcsS0FBSyxDQUFDO0FBRG5DLDRDQXlEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCB7cGFyc2V9ID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5jb25zdCB7Y3lhbiwgZ3JlZW59ID0gcmVxdWlyZSgnY2hhbGsnKTtcbmltcG9ydCB7cmVnaXN0ZXIgYXMgcmVnaXN0ZXJUc05vZGV9IGZyb20gJ3RzLW5vZGUnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcblxuZXhwb3J0IGludGVyZmFjZSBEcmNwQ29uZmlnIHtcbiAgZG9uZTogUHJvbWlzZTx2b2lkPjtcbiAgY29uZmlnSGFuZGxlck1ncigpOiBDb25maWdIYW5kbGVyTWdyO1xuICBnZXQocGF0aDogc3RyaW5nfHN0cmluZ1tdLCBkZWZhdWx0VmFsdWU/OiBhbnkpOiBhbnk7XG4gIHNldChwYXRoOiBzdHJpbmd8c3RyaW5nW10sIHZhbHVlOiBhbnkpOiB2b2lkO1xuICByZXNvbHZlKGRpcjogJ2Rlc3REaXInfCdzdGF0aWNEaXInLCAuLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgcmVzb2x2ZSguLi5wYXRoOiBzdHJpbmdbXSk6IHN0cmluZztcbiAgKCk6IHtbcHJvcGVydHk6IHN0cmluZ106IGFueX07XG4gIGxvYWQoKTogUHJvbWlzZTx7W3Byb3BlcnR5OiBzdHJpbmddOiBhbnl9PjtcbiAgcmVsb2FkKCk6IFByb21pc2U8e1twcm9wZXJ0eTogc3RyaW5nXTogYW55fT47XG4gIGluaXQoKTogUHJvbWlzZTx7W3Byb3BlcnR5OiBzdHJpbmddOiBhbnl9Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb25maWdIYW5kbGVyIHtcbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gY29uZmlnU2V0dGluZyBPdmVycmlkZSBwcm9wZXJ0aWVzIGZyb20gZGlzdC9jb25maWcueWFtbCwgd2hpY2ggaXMgYWxzbyB5b3UgZ2V0IGZyb20gYGFwaS5jb25maWcoKWBcblx0ICogQHBhcmFtIGRyY3BDbGlBcmd2IE92ZXJyaWRlIGNvbW1hbmQgbGluZSBhcmd1bWVtbnQgZm9yIERSQ1Bcblx0ICovXG4gIG9uQ29uZmlnKGNvbmZpZ1NldHRpbmc6IHtbcHJvcDogc3RyaW5nXTogYW55fSwgZHJjcENsaUFyZ3Y/OiB7W3Byb3A6IHN0cmluZ106IGFueX0pOiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0hhbmRsZXJNZ3Ige1xuICBzdGF0aWMgX3RzTm9kZVJlZ2lzdGVyZWQgPSBmYWxzZTtcblxuICBzdGF0aWMgaW5pdENvbmZpZ0hhbmRsZXJzKGZpbGVzOiBzdHJpbmdbXSk6IEFycmF5PHtmaWxlOiBzdHJpbmcsIGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiB7XG4gICAgLy8gY29uc3QgZmlsZXMgPSBicm93c2VyT3B0aW9ucy5kcmNwQ29uZmlnID8gYnJvd3Nlck9wdGlvbnMuZHJjcENvbmZpZy5zcGxpdCgvXFxzKlssOzpdXFxzKi8pIDogW107XG4gICAgY29uc3QgZXhwb3J0ZWRzOiBBcnJheTx7ZmlsZTogc3RyaW5nLCBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT4gPSBbXTtcblxuICAgIGlmICghQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCkge1xuICAgICAgQ29uZmlnSGFuZGxlck1nci5fdHNOb2RlUmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgICAvLyBjb25zdCBjb21waWxlck9wdCA9IHJlYWRUc0NvbmZpZyhyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvdHNjb25maWcuanNvbicpKTtcbiAgICAgIC8vIGRlbGV0ZSBjb21waWxlck9wdC5yb290RGlyO1xuICAgICAgLy8gZGVsZXRlIGNvbXBpbGVyT3B0LnJvb3REaXJzO1xuICAgICAgLy8gcmVnaXN0ZXJFeHRlbnNpb24oJy50cycsIGNvbXBpbGVyT3B0KTtcbiAgICAgIGNvbnN0IHRzQ29uZmlnT3B0aW9ucyA9IHBhcnNlKGZzLnJlYWRGaWxlU3luYyhmcy5leGlzdHNTeW5jKCd0c2NvbmZpZy5qc29uJykgP1xuICAgICAgICAndHNjb25maWcuanNvbicgOiByZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvdHNjb25maWcuanNvbicpLCAndXRmOCcpKTtcbiAgICAgIHJlZ2lzdGVyVHNOb2RlKHtcbiAgICAgICAgdHlwZUNoZWNrOiB0cnVlLFxuICAgICAgICBjb21waWxlck9wdGlvbnM6IHRzQ29uZmlnT3B0aW9ucy5jb21waWxlck9wdGlvbnNcbiAgICAgICAgLy8gdHJhbnNmb3JtZXJzOiB7XG4gICAgICAgIC8vICAgYmVmb3JlOiBbXG4gICAgICAgIC8vICAgICBjb250ZXh0ID0+IChzcmMpID0+IHtcbiAgICAgICAgLy8gICAgICAgY29uc29sZS5sb2coJ3RzLW5vZGUgY29tcGlsZXM6Jywgc3JjLmZpbGVOYW1lKTtcbiAgICAgICAgLy8gICAgICAgY29uc29sZS5sb2coc3JjLnRleHQpO1xuICAgICAgICAvLyAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgIF1cbiAgICAgICAgLy8gfVxuICAgICAgfSk7XG4gICAgICBmaWxlcy5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgICBjb25zdCBleHAgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShmaWxlKSk7XG4gICAgICAgIGV4cG9ydGVkcy5wdXNoKHtmaWxlLCBoYW5kbGVyOiBleHAuZGVmYXVsdCA/IGV4cC5kZWZhdWx0IDogZXhwfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGV4cG9ydGVkcztcbiAgfVxuICBwcm90ZWN0ZWQgY29uZmlnSGFuZGxlcnM6IEFycmF5PHtmaWxlOiBzdHJpbmcsIGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PjtcblxuICBjb25zdHJ1Y3RvcihmaWxlczogc3RyaW5nW10pIHtcbiAgICB0aGlzLmNvbmZpZ0hhbmRsZXJzID0gQ29uZmlnSGFuZGxlck1nci5pbml0Q29uZmlnSGFuZGxlcnMoZmlsZXMpO1xuICB9XG5cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gZnVuYyBwYXJhbWV0ZXJzOiAoZmlsZVBhdGgsIGxhc3QgcmV0dXJuZWQgcmVzdWx0LCBoYW5kbGVyIGZ1bmN0aW9uKSxcblx0ICogcmV0dXJucyB0aGUgY2hhbmdlZCByZXN1bHQsIGtlZXAgdGhlIGxhc3QgcmVzdWx0LCBpZiByZXN0dXJucyB1bmRlZmluZWRcblx0ICogQHJldHVybnMgbGFzdCByZXN1bHRcblx0ICovXG4gIGFzeW5jIHJ1bkVhY2g8SD4oZnVuYzogKGZpbGU6IHN0cmluZywgbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyOiBIKSA9PiBQcm9taXNlPGFueT4gfCBhbnkpIHtcbiAgICBsZXQgbGFzdFJlczogYW55O1xuICAgIGZvciAoY29uc3Qge2ZpbGUsIGhhbmRsZXJ9IG9mIHRoaXMuY29uZmlnSGFuZGxlcnMpIHtcbiAgICAgIGNvbnNvbGUubG9nKGdyZWVuKFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSwgJy5qcycpICsgJyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcbiAgICAgIGNvbnN0IGN1cnJSZXMgPSBhd2FpdCBmdW5jKGZpbGUsIGxhc3RSZXMsIGhhbmRsZXIgYXMgYW55IGFzIEgpO1xuICAgICAgaWYgKGN1cnJSZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgbGFzdFJlcyA9IGN1cnJSZXM7XG4gICAgfVxuICAgIHJldHVybiBsYXN0UmVzO1xuICB9XG59XG4iXX0=