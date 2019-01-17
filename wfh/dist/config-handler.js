"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console */
const Path = tslib_1.__importStar(require("path"));
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9jb25maWctaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrQkFBK0I7QUFDL0IsbURBQTZCO0FBQzdCLDZCQUE2QjtBQUM3Qiw0QkFBNEI7QUFDNUIsK0NBQThEO0FBQzlELE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBc0J2QyxNQUFhLGdCQUFnQjtJQUM1QixNQUFNLENBQUMsa0JBQWtCLENBQUMsS0FBZTtRQUN4QyxpR0FBaUc7UUFDakcsTUFBTSxTQUFTLEdBQWtELEVBQUUsQ0FBQztRQUNwRSxNQUFNLFdBQVcsR0FBRywwQkFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLE9BQU8sV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUMzQixPQUFPLFdBQVcsQ0FBQyxRQUFRLENBQUM7UUFDNUIsK0JBQWlCLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3RDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDcEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN4QyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUdELFlBQVksS0FBZTtRQUMxQixJQUFJLENBQUMsY0FBYyxHQUFHLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNHLE9BQU8sQ0FBSSxJQUF1RTs7WUFDdkYsSUFBSSxPQUFZLENBQUM7WUFDakIsS0FBSyxNQUFNLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDbEYsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFtQixDQUFDLENBQUM7Z0JBQy9ELElBQUksT0FBTyxLQUFLLFNBQVM7b0JBQ3hCLE9BQU8sR0FBRyxPQUFPLENBQUM7YUFDbkI7WUFDRCxPQUFPLE9BQU8sQ0FBQztRQUNoQixDQUFDO0tBQUE7Q0FDRDtBQXBDRCw0Q0FvQ0MifQ==