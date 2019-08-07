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
            const { compilerOptions } = parse(fs_1.default.readFileSync(fs_1.default.existsSync('tsconfig.json') ?
                'tsconfig.json' : require.resolve('dr-comp-package/wfh/tsconfig.json'), 'utf8'));
            compilerOptions.module = 'commonjs';
            ts_node_1.register({
                typeCheck: true,
                compilerOptions
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN2QyxxQ0FBbUQ7QUFDbkQsNENBQW9CO0FBd0JwQixNQUFhLGdCQUFnQjtJQTBDM0IsWUFBWSxLQUFlO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQXpDRCxNQUFNLENBQUMsa0JBQWtCLENBQUMsS0FBZTtRQUN2QyxpR0FBaUc7UUFDakcsTUFBTSxTQUFTLEdBQWtELEVBQUUsQ0FBQztRQUVwRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUU7WUFDdkMsZ0JBQWdCLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBQzFDLDBGQUEwRjtZQUMxRiw4QkFBOEI7WUFDOUIsK0JBQStCO1lBQy9CLHlDQUF5QztZQUN6QyxNQUFNLEVBQUMsZUFBZSxFQUFDLEdBQUcsS0FBSyxDQUM3QixZQUFFLENBQUMsWUFBWSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztnQkFDaEQsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQ2hGLENBQUM7WUFFRixlQUFlLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQztZQUVwQyxrQkFBYyxDQUFDO2dCQUNiLFNBQVMsRUFBRSxJQUFJO2dCQUNmLGVBQWU7Z0JBQ2Ysa0JBQWtCO2dCQUNsQixjQUFjO2dCQUNkLDRCQUE0QjtnQkFDNUIsd0RBQXdEO2dCQUN4RCwrQkFBK0I7Z0JBQy9CLG9CQUFvQjtnQkFDcEIsUUFBUTtnQkFDUixNQUFNO2dCQUNOLElBQUk7YUFDTCxDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNuQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO1lBQ25FLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBT0Q7Ozs7O1NBS0U7SUFDSSxPQUFPLENBQUksSUFBdUU7O1lBQ3RGLElBQUksT0FBWSxDQUFDO1lBQ2pCLEtBQUssTUFBTSxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2xGLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBbUIsQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLE9BQU8sS0FBSyxTQUFTO29CQUN2QixPQUFPLEdBQUcsT0FBTyxDQUFDO2FBQ3JCO1lBQ0QsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztLQUFBOztBQTVETSxrQ0FBaUIsR0FBRyxLQUFLLENBQUM7QUFEbkMsNENBOERDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcbmNvbnN0IHtjeWFuLCBncmVlbn0gPSByZXF1aXJlKCdjaGFsaycpO1xuaW1wb3J0IHtyZWdpc3RlciBhcyByZWdpc3RlclRzTm9kZX0gZnJvbSAndHMtbm9kZSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERyY3BDb25maWcge1xuICBkb25lOiBQcm9taXNlPHZvaWQ+O1xuICBjb25maWdIYW5kbGVyTWdyKCk6IENvbmZpZ0hhbmRsZXJNZ3I7XG4gIGdldChwYXRoOiBzdHJpbmd8c3RyaW5nW10sIGRlZmF1bHRWYWx1ZT86IGFueSk6IGFueTtcbiAgc2V0KHBhdGg6IHN0cmluZ3xzdHJpbmdbXSwgdmFsdWU6IGFueSk6IHZvaWQ7XG4gIHJlc29sdmUoZGlyOiAnZGVzdERpcid8J3N0YXRpY0RpcicsIC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICByZXNvbHZlKC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuICAoKToge1twcm9wZXJ0eTogc3RyaW5nXTogYW55fTtcbiAgbG9hZCgpOiBQcm9taXNlPHtbcHJvcGVydHk6IHN0cmluZ106IGFueX0+O1xuICByZWxvYWQoKTogUHJvbWlzZTx7W3Byb3BlcnR5OiBzdHJpbmddOiBhbnl9PjtcbiAgaW5pdCgpOiBQcm9taXNlPHtbcHJvcGVydHk6IHN0cmluZ106IGFueX0+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ0hhbmRsZXIge1xuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBjb25maWdTZXR0aW5nIE92ZXJyaWRlIHByb3BlcnRpZXMgZnJvbSBkaXN0L2NvbmZpZy55YW1sLCB3aGljaCBpcyBhbHNvIHlvdSBnZXQgZnJvbSBgYXBpLmNvbmZpZygpYFxuXHQgKiBAcGFyYW0gZHJjcENsaUFyZ3YgT3ZlcnJpZGUgY29tbWFuZCBsaW5lIGFyZ3VtZW1udCBmb3IgRFJDUFxuXHQgKi9cbiAgb25Db25maWcoY29uZmlnU2V0dGluZzoge1twcm9wOiBzdHJpbmddOiBhbnl9LCBkcmNwQ2xpQXJndj86IHtbcHJvcDogc3RyaW5nXTogYW55fSk6IFByb21pc2U8dm9pZD4gfCB2b2lkO1xufVxuXG5leHBvcnQgY2xhc3MgQ29uZmlnSGFuZGxlck1nciB7XG4gIHN0YXRpYyBfdHNOb2RlUmVnaXN0ZXJlZCA9IGZhbHNlO1xuXG4gIHN0YXRpYyBpbml0Q29uZmlnSGFuZGxlcnMoZmlsZXM6IHN0cmluZ1tdKTogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+IHtcbiAgICAvLyBjb25zdCBmaWxlcyA9IGJyb3dzZXJPcHRpb25zLmRyY3BDb25maWcgPyBicm93c2VyT3B0aW9ucy5kcmNwQ29uZmlnLnNwbGl0KC9cXHMqWyw7Ol1cXHMqLykgOiBbXTtcbiAgICBjb25zdCBleHBvcnRlZHM6IEFycmF5PHtmaWxlOiBzdHJpbmcsIGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiA9IFtdO1xuXG4gICAgaWYgKCFDb25maWdIYW5kbGVyTWdyLl90c05vZGVSZWdpc3RlcmVkKSB7XG4gICAgICBDb25maWdIYW5kbGVyTWdyLl90c05vZGVSZWdpc3RlcmVkID0gdHJ1ZTtcbiAgICAgIC8vIGNvbnN0IGNvbXBpbGVyT3B0ID0gcmVhZFRzQ29uZmlnKHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3dmaC90c2NvbmZpZy5qc29uJykpO1xuICAgICAgLy8gZGVsZXRlIGNvbXBpbGVyT3B0LnJvb3REaXI7XG4gICAgICAvLyBkZWxldGUgY29tcGlsZXJPcHQucm9vdERpcnM7XG4gICAgICAvLyByZWdpc3RlckV4dGVuc2lvbignLnRzJywgY29tcGlsZXJPcHQpO1xuICAgICAgY29uc3Qge2NvbXBpbGVyT3B0aW9uc30gPSBwYXJzZShcbiAgICAgICAgZnMucmVhZEZpbGVTeW5jKGZzLmV4aXN0c1N5bmMoJ3RzY29uZmlnLmpzb24nKSA/XG4gICAgICAgICd0c2NvbmZpZy5qc29uJyA6IHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3dmaC90c2NvbmZpZy5qc29uJyksICd1dGY4JylcbiAgICAgICk7XG5cbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5tb2R1bGUgPSAnY29tbW9uanMnO1xuXG4gICAgICByZWdpc3RlclRzTm9kZSh7XG4gICAgICAgIHR5cGVDaGVjazogdHJ1ZSxcbiAgICAgICAgY29tcGlsZXJPcHRpb25zXG4gICAgICAgIC8vIHRyYW5zZm9ybWVyczoge1xuICAgICAgICAvLyAgIGJlZm9yZTogW1xuICAgICAgICAvLyAgICAgY29udGV4dCA9PiAoc3JjKSA9PiB7XG4gICAgICAgIC8vICAgICAgIGNvbnNvbGUubG9nKCd0cy1ub2RlIGNvbXBpbGVzOicsIHNyYy5maWxlTmFtZSk7XG4gICAgICAgIC8vICAgICAgIGNvbnNvbGUubG9nKHNyYy50ZXh0KTtcbiAgICAgICAgLy8gICAgICAgcmV0dXJuIHNyYztcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gICBdXG4gICAgICAgIC8vIH1cbiAgICAgIH0pO1xuICAgICAgZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgICAgY29uc3QgZXhwID0gcmVxdWlyZShQYXRoLnJlc29sdmUoZmlsZSkpO1xuICAgICAgICBleHBvcnRlZHMucHVzaCh7ZmlsZSwgaGFuZGxlcjogZXhwLmRlZmF1bHQgPyBleHAuZGVmYXVsdCA6IGV4cH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBleHBvcnRlZHM7XG4gIH1cbiAgcHJvdGVjdGVkIGNvbmZpZ0hhbmRsZXJzOiBBcnJheTx7ZmlsZTogc3RyaW5nLCBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT47XG5cbiAgY29uc3RydWN0b3IoZmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5jb25maWdIYW5kbGVycyA9IENvbmZpZ0hhbmRsZXJNZ3IuaW5pdENvbmZpZ0hhbmRsZXJzKGZpbGVzKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGZ1bmMgcGFyYW1ldGVyczogKGZpbGVQYXRoLCBsYXN0IHJldHVybmVkIHJlc3VsdCwgaGFuZGxlciBmdW5jdGlvbiksXG5cdCAqIHJldHVybnMgdGhlIGNoYW5nZWQgcmVzdWx0LCBrZWVwIHRoZSBsYXN0IHJlc3VsdCwgaWYgcmVzdHVybnMgdW5kZWZpbmVkXG5cdCAqIEByZXR1cm5zIGxhc3QgcmVzdWx0XG5cdCAqL1xuICBhc3luYyBydW5FYWNoPEg+KGZ1bmM6IChmaWxlOiBzdHJpbmcsIGxhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcjogSCkgPT4gUHJvbWlzZTxhbnk+IHwgYW55KSB7XG4gICAgbGV0IGxhc3RSZXM6IGFueTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG4gICAgICBjb25zb2xlLmxvZyhncmVlbihQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSArICcgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG4gICAgICBjb25zdCBjdXJyUmVzID0gYXdhaXQgZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcbiAgICAgIGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgIGxhc3RSZXMgPSBjdXJyUmVzO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdFJlcztcbiAgfVxufVxuIl19