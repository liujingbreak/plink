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
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const Path = __importStar(require("path"));
// import vm = require('vm');
// import * as fs from 'fs';
const ts_compiler_1 = require("./ts-compiler");
const { cyan, green } = require('chalk');
class ConfigHandlerMgr {
    static initConfigHandlers(files) {
        // const files = browserOptions.drcpConfig ? browserOptions.drcpConfig.split(/\s*[,;:]\s*/) : [];
        const exporteds = [];
        const compilerOpt = ts_compiler_1.readTsConfig(require.resolve('dr-comp-package/wfh/tsconfig.json'));
        delete compilerOpt.rootDir;
        delete compilerOpt.rootDirs;
        ts_compiler_1.registerExtension('.ts', compilerOpt);
        files.forEach(file => {
            const exp = require(Path.resolve(file));
            exporteds.push({ file, handler: exp.default ? exp.default : exp });
        });
        return exporteds;
    }
    constructor(files) {
        this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files);
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
exports.ConfigHandlerMgr = ConfigHandlerMgr;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsNkJBQTZCO0FBQzdCLDRCQUE0QjtBQUM1QiwrQ0FBOEQ7QUFDOUQsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUF3QnZDLE1BQWEsZ0JBQWdCO0lBQzVCLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFlO1FBQ3hDLGlHQUFpRztRQUNqRyxNQUFNLFNBQVMsR0FBa0QsRUFBRSxDQUFDO1FBQ3BFLE1BQU0sV0FBVyxHQUFHLDBCQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUM7UUFDdkYsT0FBTyxXQUFXLENBQUMsT0FBTyxDQUFDO1FBQzNCLE9BQU8sV0FBVyxDQUFDLFFBQVEsQ0FBQztRQUM1QiwrQkFBaUIsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDdEMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNwQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBR0QsWUFBWSxLQUFlO1FBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0csT0FBTyxDQUFJLElBQXVFOztZQUN2RixJQUFJLE9BQVksQ0FBQztZQUNqQixLQUFLLE1BQU0sRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNsRixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQW1CLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxPQUFPLEtBQUssU0FBUztvQkFDeEIsT0FBTyxHQUFHLE9BQU8sQ0FBQzthQUNuQjtZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2hCLENBQUM7S0FBQTtDQUNEO0FBcENELDRDQW9DQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgdm0gPSByZXF1aXJlKCd2bScpO1xuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtyZWFkVHNDb25maWcsIHJlZ2lzdGVyRXh0ZW5zaW9ufSBmcm9tICcuL3RzLWNvbXBpbGVyJztcbmNvbnN0IHtjeWFuLCBncmVlbn0gPSByZXF1aXJlKCdjaGFsaycpO1xuXG5leHBvcnQgaW50ZXJmYWNlIERyY3BDb25maWcge1xuXHRkb25lOiBQcm9taXNlPHZvaWQ+O1xuXHRjb25maWdIYW5kbGVyTWdyKCk6IENvbmZpZ0hhbmRsZXJNZ3I7XG5cdGdldChwYXRoOiBzdHJpbmd8c3RyaW5nW10sIGRlZmF1bHRWYWx1ZT86IGFueSk6IGFueTtcblx0c2V0KHBhdGg6IHN0cmluZ3xzdHJpbmdbXSwgdmFsdWU6IGFueSk6IHZvaWQ7XG5cdHJlc29sdmUoZGlyOiAnZGVzdERpcid8J3N0YXRpY0RpcicsIC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuXHRyZXNvbHZlKC4uLnBhdGg6IHN0cmluZ1tdKTogc3RyaW5nO1xuXHQoKToge1twcm9wZXJ0eTogc3RyaW5nXTogYW55fTtcblx0bG9hZCgpOiBQcm9taXNlPHtbcHJvcGVydHk6IHN0cmluZ106IGFueX0+O1xuXHRyZWxvYWQoKTogUHJvbWlzZTx7W3Byb3BlcnR5OiBzdHJpbmddOiBhbnl9Pjtcblx0aW5pdCgpOiBQcm9taXNlPHtbcHJvcGVydHk6IHN0cmluZ106IGFueX0+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ0hhbmRsZXIge1xuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSBjb25maWdTZXR0aW5nIE92ZXJyaWRlIHByb3BlcnRpZXMgZnJvbSBkaXN0L2NvbmZpZy55YW1sLCB3aGljaCBpcyBhbHNvIHlvdSBnZXQgZnJvbSBgYXBpLmNvbmZpZygpYFxuXHQgKiBAcGFyYW0gZHJjcENsaUFyZ3YgT3ZlcnJpZGUgY29tbWFuZCBsaW5lIGFyZ3VtZW1udCBmb3IgRFJDUFxuXHQgKi9cblx0b25Db25maWcoY29uZmlnU2V0dGluZzoge1twcm9wOiBzdHJpbmddOiBhbnl9LCBkcmNwQ2xpQXJndj86IHtbcHJvcDogc3RyaW5nXTogYW55fSk6IFByb21pc2U8dm9pZD4gfCB2b2lkO1xufVxuXG5leHBvcnQgY2xhc3MgQ29uZmlnSGFuZGxlck1nciB7XG5cdHN0YXRpYyBpbml0Q29uZmlnSGFuZGxlcnMoZmlsZXM6IHN0cmluZ1tdKTogQXJyYXk8e2ZpbGU6IHN0cmluZywgaGFuZGxlcjogQ29uZmlnSGFuZGxlcn0+IHtcblx0XHQvLyBjb25zdCBmaWxlcyA9IGJyb3dzZXJPcHRpb25zLmRyY3BDb25maWcgPyBicm93c2VyT3B0aW9ucy5kcmNwQ29uZmlnLnNwbGl0KC9cXHMqWyw7Ol1cXHMqLykgOiBbXTtcblx0XHRjb25zdCBleHBvcnRlZHM6IEFycmF5PHtmaWxlOiBzdHJpbmcsIGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJ9PiA9IFtdO1xuXHRcdGNvbnN0IGNvbXBpbGVyT3B0ID0gcmVhZFRzQ29uZmlnKHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3dmaC90c2NvbmZpZy5qc29uJykpO1xuXHRcdGRlbGV0ZSBjb21waWxlck9wdC5yb290RGlyO1xuXHRcdGRlbGV0ZSBjb21waWxlck9wdC5yb290RGlycztcblx0XHRyZWdpc3RlckV4dGVuc2lvbignLnRzJywgY29tcGlsZXJPcHQpO1xuXHRcdGZpbGVzLmZvckVhY2goZmlsZSA9PiB7XG5cdFx0XHRjb25zdCBleHAgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShmaWxlKSk7XG5cdFx0XHRleHBvcnRlZHMucHVzaCh7ZmlsZSwgaGFuZGxlcjogZXhwLmRlZmF1bHQgPyBleHAuZGVmYXVsdCA6IGV4cH0pO1xuXHRcdH0pO1xuXHRcdHJldHVybiBleHBvcnRlZHM7XG5cdH1cblx0cHJvdGVjdGVkIGNvbmZpZ0hhbmRsZXJzOiBBcnJheTx7ZmlsZTogc3RyaW5nLCBoYW5kbGVyOiBDb25maWdIYW5kbGVyfT47XG5cblx0Y29uc3RydWN0b3IoZmlsZXM6IHN0cmluZ1tdKSB7XG5cdFx0dGhpcy5jb25maWdIYW5kbGVycyA9IENvbmZpZ0hhbmRsZXJNZ3IuaW5pdENvbmZpZ0hhbmRsZXJzKGZpbGVzKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGZ1bmMgcGFyYW1ldGVyczogKGZpbGVQYXRoLCBsYXN0IHJldHVybmVkIHJlc3VsdCwgaGFuZGxlciBmdW5jdGlvbiksXG5cdCAqIHJldHVybnMgdGhlIGNoYW5nZWQgcmVzdWx0LCBrZWVwIHRoZSBsYXN0IHJlc3VsdCwgaWYgcmVzdHVybnMgdW5kZWZpbmVkXG5cdCAqIEByZXR1cm5zIGxhc3QgcmVzdWx0XG5cdCAqL1xuXHRhc3luYyBydW5FYWNoPEg+KGZ1bmM6IChmaWxlOiBzdHJpbmcsIGxhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcjogSCkgPT4gUHJvbWlzZTxhbnk+IHwgYW55KSB7XG5cdFx0bGV0IGxhc3RSZXM6IGFueTtcblx0XHRmb3IgKGNvbnN0IHtmaWxlLCBoYW5kbGVyfSBvZiB0aGlzLmNvbmZpZ0hhbmRsZXJzKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhncmVlbihQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSArICcgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG5cdFx0XHRjb25zdCBjdXJyUmVzID0gYXdhaXQgZnVuYyhmaWxlLCBsYXN0UmVzLCBoYW5kbGVyIGFzIGFueSBhcyBIKTtcblx0XHRcdGlmIChjdXJyUmVzICE9PSB1bmRlZmluZWQpXG5cdFx0XHRcdGxhc3RSZXMgPSBjdXJyUmVzO1xuXHRcdH1cblx0XHRyZXR1cm4gbGFzdFJlcztcblx0fVxufVxuIl19