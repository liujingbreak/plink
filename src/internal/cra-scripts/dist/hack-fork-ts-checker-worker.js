"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Hack fork-ts-checker-webpack-plugin:
 *  - change ts.compilerHost.readFile()
 *  - change rootNames in parameters of ts.createProgram()
 *  - change compilerOptions.rootDir in parameters of ts.createProgram()
 */
const loaderHooks_1 = require("@wfh/plink/wfh/dist/loaderHooks");
// import {getState} from '@wfh/plink/wfh/dist/package-mgr';
// import {getRootDir} from '@wfh/plink/wfh/dist';
// import {closestCommonParentDir} from '@wfh/plink/wfh/dist/utils/misc';
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const resolve_1 = __importDefault(require("resolve"));
const change_tsconfig_1 = require("./change-tsconfig");
// import {setTsCompilerOptForNodePath} from '@wfh/plink/wfh/dist/config-handler';
const indexJs = process.env._plink_cra_scripts_indexJs;
// const tsconfigFile = process.env._plink_cra_scripts_tsConfig!;
// const tsCoJson = ts.readConfigFile(tsconfigFile, (file) => fs.readFileSync(file, 'utf-8')).config.compilerOptions;
// const plinkRoot = getRootDir();
const forkTsDir = path_1.default.resolve('node_modules', 'fork-ts-checker-webpack-plugin') + path_1.default.sep;
const tsJs = resolve_1.default.sync('typescript', { basedir: forkTsDir });
// tslint:disable-next-line: no-console
console.log(chalk_1.default.cyan('[hack-for-ts-checker]') + ' fork-ts-checker-webpack-plugin runs, ' + forkTsDir);
const hackedTs = require(tsJs);
const _createPrm = hackedTs.createProgram;
hackedTs.createProgram = function (rootNames, options, host) {
    try {
        const tsConfigJson = change_tsconfig_1.changeTsConfigFile();
        let changedRootNames = [indexJs.replace(/\\/g, '/')];
        // console.log(new Error().stack);
        // Because createProgram() is overloaded, it might accept 1 or 5 parameters
        if (arguments.length === 1) {
            options = arguments[0].options;
            host = arguments[0].host;
            arguments[0].rootNames = changedRootNames;
            arguments[0].options.rootDir = tsConfigJson.compilerOptions.rootDir;
            arguments[0].options.paths = tsConfigJson.compilerOptions.paths;
            arguments[0].options.typeRoots = tsConfigJson.compilerOptions.typeRoots;
        }
        else {
            arguments[0] = changedRootNames;
            arguments[1].rootDir = tsConfigJson.compilerOptions.rootDir;
            arguments[1].paths = tsConfigJson.compilerOptions.paths;
            arguments[1].typeRoots = tsConfigJson.compilerOptions.typeRoots;
        }
        // tslint:disable-next-line: no-console
        // console.log(chalk.cyan('[hack-for-ts-checker]') + ' ts program "rootNames":', (arguments[0] as CreateProgramOptions).rootNames);
        // tslint:disable-next-line: no-console
        // console.log(chalk.cyan('[hack-for-ts-checker]') + ' ts compilerOptions:\n', options);
        // if (host && (host.readFile as any)._hacked == null) {
        //   const rf = host.readFile;
        //   host.readFile = function(file) {
        //     // tslint:disable-next-line: no-console
        //     console.log(chalk.cyan('[hack-for-ts-checker]') + ' TS read', file);
        //     return rf.call(host, file);
        //   };
        //   (host.readFile as any)._hacked = true;
        // }
        return _createPrm.apply(hackedTs, arguments);
    }
    catch (ex) {
        console.error('[hack-fork-ts-checker-worker] Error', ex);
        throw ex;
    }
};
Object.assign(hackedTs.createProgram, _createPrm);
loaderHooks_1.hookCommonJsRequire((filename, target, rq, resolve) => {
    if (filename.startsWith(forkTsDir)) {
        // console.log(filename, target);
        if (target.indexOf('typescript') >= 0 && resolve(target) === tsJs) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.cyan('[hack-for-ts-checker]') + ' monkey-patch typescript');
            // const ts: typeof _ts = require('typescript');
            return hackedTs;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay1mb3JrLXRzLWNoZWNrZXItd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGFjay1mb3JrLXRzLWNoZWNrZXItd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUE7Ozs7O0dBS0c7QUFDSCxpRUFBb0U7QUFDcEUsNERBQTREO0FBQzVELGtEQUFrRDtBQUNsRCx5RUFBeUU7QUFDekUsa0RBQTBCO0FBQzFCLGdEQUF3QjtBQUl4QixzREFBa0M7QUFDbEMsdURBQXFEO0FBRXJELGtGQUFrRjtBQUVsRixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEyQixDQUFDO0FBQ3hELGlFQUFpRTtBQUNqRSxxSEFBcUg7QUFFckgsa0NBQWtDO0FBRWxDLE1BQU0sU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLGdDQUFnQyxDQUFDLEdBQUcsY0FBSSxDQUFDLEdBQUcsQ0FBQztBQUM1RixNQUFNLElBQUksR0FBRyxpQkFBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBQyxPQUFPLEVBQUUsU0FBUyxFQUFDLENBQUMsQ0FBQztBQUdsRSx1Q0FBdUM7QUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsd0NBQXdDLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFFeEcsTUFBTSxRQUFRLEdBQWMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRTFDLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUM7QUFDMUMsUUFBUSxDQUFDLGFBQWEsR0FBRyxVQUFTLFNBQTRCLEVBQUUsT0FBd0IsRUFBRSxJQUFtQjtJQUMzRyxJQUFJO1FBQ0YsTUFBTSxZQUFZLEdBQUcsb0NBQWtCLEVBQUUsQ0FBQztRQUMxQyxJQUFJLGdCQUFnQixHQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvRCxrQ0FBa0M7UUFDbEMsMkVBQTJFO1FBQzNFLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDMUIsT0FBTyxHQUFJLFNBQVMsQ0FBQyxDQUFDLENBQTBCLENBQUMsT0FBTyxDQUFDO1lBQ3pELElBQUksR0FBSSxTQUFTLENBQUMsQ0FBQyxDQUEwQixDQUFDLElBQUksQ0FBQztZQUNsRCxTQUFTLENBQUMsQ0FBQyxDQUEwQixDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQztZQUNuRSxTQUFTLENBQUMsQ0FBQyxDQUEwQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUM7WUFDN0YsU0FBUyxDQUFDLENBQUMsQ0FBMEIsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1lBQ3pGLFNBQVMsQ0FBQyxDQUFDLENBQTBCLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQztTQUNuRzthQUFNO1lBQ0wsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLGdCQUFnQixDQUFDO1lBQ2hDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUM7WUFDNUQsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztZQUN4RCxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDO1NBQ2pFO1FBRUQsdUNBQXVDO1FBQ3ZDLG1JQUFtSTtRQUNuSSx1Q0FBdUM7UUFDdkMsd0ZBQXdGO1FBRXhGLHdEQUF3RDtRQUN4RCw4QkFBOEI7UUFDOUIscUNBQXFDO1FBQ3JDLDhDQUE4QztRQUM5QywyRUFBMkU7UUFDM0Usa0NBQWtDO1FBQ2xDLE9BQU87UUFDUCwyQ0FBMkM7UUFDM0MsSUFBSTtRQUNKLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FDOUM7SUFBQyxPQUFPLEVBQUUsRUFBRTtRQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMscUNBQXFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekQsTUFBTSxFQUFFLENBQUM7S0FDVjtBQUNILENBQVEsQ0FBQztBQUNULE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUVsRCxpQ0FBbUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ3BELElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUNsQyxpQ0FBaUM7UUFDakMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ2pFLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRywwQkFBMEIsQ0FBQyxDQUFDO1lBQzlFLGdEQUFnRDtZQUNoRCxPQUFPLFFBQVEsQ0FBQztTQUNqQjtLQUNGO0FBQ0gsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEhhY2sgZm9yay10cy1jaGVja2VyLXdlYnBhY2stcGx1Z2luOlxuICogIC0gY2hhbmdlIHRzLmNvbXBpbGVySG9zdC5yZWFkRmlsZSgpXG4gKiAgLSBjaGFuZ2Ugcm9vdE5hbWVzIGluIHBhcmFtZXRlcnMgb2YgdHMuY3JlYXRlUHJvZ3JhbSgpXG4gKiAgLSBjaGFuZ2UgY29tcGlsZXJPcHRpb25zLnJvb3REaXIgaW4gcGFyYW1ldGVycyBvZiB0cy5jcmVhdGVQcm9ncmFtKClcbiAqL1xuaW1wb3J0IHtob29rQ29tbW9uSnNSZXF1aXJlfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2xvYWRlckhvb2tzJztcbi8vIGltcG9ydCB7Z2V0U3RhdGV9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0Jztcbi8vIGltcG9ydCB7Y2xvc2VzdENvbW1vblBhcmVudERpcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9taXNjJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCB7anNvblRvQ29tcGlsZXJPcHRpb25zfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcbi8vIGltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgdHMsIHtDb21waWxlck9wdGlvbnMsIENvbXBpbGVySG9zdCwgQ3JlYXRlUHJvZ3JhbU9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IG5vZGVSZXNvbHZlIGZyb20gJ3Jlc29sdmUnO1xuaW1wb3J0IHtjaGFuZ2VUc0NvbmZpZ0ZpbGV9IGZyb20gJy4vY2hhbmdlLXRzY29uZmlnJztcblxuLy8gaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuXG5jb25zdCBpbmRleEpzID0gcHJvY2Vzcy5lbnYuX3BsaW5rX2NyYV9zY3JpcHRzX2luZGV4SnMhO1xuLy8gY29uc3QgdHNjb25maWdGaWxlID0gcHJvY2Vzcy5lbnYuX3BsaW5rX2NyYV9zY3JpcHRzX3RzQ29uZmlnITtcbi8vIGNvbnN0IHRzQ29Kc29uID0gdHMucmVhZENvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCAoZmlsZSkgPT4gZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGYtOCcpKS5jb25maWcuY29tcGlsZXJPcHRpb25zO1xuXG4vLyBjb25zdCBwbGlua1Jvb3QgPSBnZXRSb290RGlyKCk7XG5cbmNvbnN0IGZvcmtUc0RpciA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2ZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpbicpICsgUGF0aC5zZXA7XG5jb25zdCB0c0pzID0gbm9kZVJlc29sdmUuc3luYygndHlwZXNjcmlwdCcsIHtiYXNlZGlyOiBmb3JrVHNEaXJ9KTtcblxuXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbmNvbnNvbGUubG9nKGNoYWxrLmN5YW4oJ1toYWNrLWZvci10cy1jaGVja2VyXScpICsgJyBmb3JrLXRzLWNoZWNrZXItd2VicGFjay1wbHVnaW4gcnVucywgJyArIGZvcmtUc0Rpcik7XG5cbmNvbnN0IGhhY2tlZFRzOiB0eXBlb2YgdHMgPSByZXF1aXJlKHRzSnMpO1xuXG5jb25zdCBfY3JlYXRlUHJtID0gaGFja2VkVHMuY3JlYXRlUHJvZ3JhbTtcbmhhY2tlZFRzLmNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbihyb290TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdLCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsIGhvc3Q/OiBDb21waWxlckhvc3QpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB0c0NvbmZpZ0pzb24gPSBjaGFuZ2VUc0NvbmZpZ0ZpbGUoKTtcbiAgICBsZXQgY2hhbmdlZFJvb3ROYW1lczogc3RyaW5nW10gPSBbaW5kZXhKcy5yZXBsYWNlKC9cXFxcL2csICcvJyldO1xuICAgIC8vIGNvbnNvbGUubG9nKG5ldyBFcnJvcigpLnN0YWNrKTtcbiAgICAvLyBCZWNhdXNlIGNyZWF0ZVByb2dyYW0oKSBpcyBvdmVybG9hZGVkLCBpdCBtaWdodCBhY2NlcHQgMSBvciA1IHBhcmFtZXRlcnNcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgb3B0aW9ucyA9IChhcmd1bWVudHNbMF0gYXMgQ3JlYXRlUHJvZ3JhbU9wdGlvbnMpLm9wdGlvbnM7XG4gICAgICBob3N0ID0gKGFyZ3VtZW50c1swXSBhcyBDcmVhdGVQcm9ncmFtT3B0aW9ucykuaG9zdDtcbiAgICAgIChhcmd1bWVudHNbMF0gYXMgQ3JlYXRlUHJvZ3JhbU9wdGlvbnMpLnJvb3ROYW1lcyA9IGNoYW5nZWRSb290TmFtZXM7XG4gICAgICAoYXJndW1lbnRzWzBdIGFzIENyZWF0ZVByb2dyYW1PcHRpb25zKS5vcHRpb25zLnJvb3REaXIgPSB0c0NvbmZpZ0pzb24uY29tcGlsZXJPcHRpb25zLnJvb3REaXI7XG4gICAgICAoYXJndW1lbnRzWzBdIGFzIENyZWF0ZVByb2dyYW1PcHRpb25zKS5vcHRpb25zLnBhdGhzID0gdHNDb25maWdKc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocztcbiAgICAgIChhcmd1bWVudHNbMF0gYXMgQ3JlYXRlUHJvZ3JhbU9wdGlvbnMpLm9wdGlvbnMudHlwZVJvb3RzID0gdHNDb25maWdKc29uLmNvbXBpbGVyT3B0aW9ucy50eXBlUm9vdHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFyZ3VtZW50c1swXSA9IGNoYW5nZWRSb290TmFtZXM7XG4gICAgICBhcmd1bWVudHNbMV0ucm9vdERpciA9IHRzQ29uZmlnSnNvbi5jb21waWxlck9wdGlvbnMucm9vdERpcjtcbiAgICAgIGFyZ3VtZW50c1sxXS5wYXRocyA9IHRzQ29uZmlnSnNvbi5jb21waWxlck9wdGlvbnMucGF0aHM7XG4gICAgICBhcmd1bWVudHNbMV0udHlwZVJvb3RzID0gdHNDb25maWdKc29uLmNvbXBpbGVyT3B0aW9ucy50eXBlUm9vdHM7XG4gICAgfVxuXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgLy8gY29uc29sZS5sb2coY2hhbGsuY3lhbignW2hhY2stZm9yLXRzLWNoZWNrZXJdJykgKyAnIHRzIHByb2dyYW0gXCJyb290TmFtZXNcIjonLCAoYXJndW1lbnRzWzBdIGFzIENyZWF0ZVByb2dyYW1PcHRpb25zKS5yb290TmFtZXMpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIC8vIGNvbnNvbGUubG9nKGNoYWxrLmN5YW4oJ1toYWNrLWZvci10cy1jaGVja2VyXScpICsgJyB0cyBjb21waWxlck9wdGlvbnM6XFxuJywgb3B0aW9ucyk7XG5cbiAgICAvLyBpZiAoaG9zdCAmJiAoaG9zdC5yZWFkRmlsZSBhcyBhbnkpLl9oYWNrZWQgPT0gbnVsbCkge1xuICAgIC8vICAgY29uc3QgcmYgPSBob3N0LnJlYWRGaWxlO1xuICAgIC8vICAgaG9zdC5yZWFkRmlsZSA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAvLyAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgLy8gICAgIGNvbnNvbGUubG9nKGNoYWxrLmN5YW4oJ1toYWNrLWZvci10cy1jaGVja2VyXScpICsgJyBUUyByZWFkJywgZmlsZSk7XG4gICAgLy8gICAgIHJldHVybiByZi5jYWxsKGhvc3QsIGZpbGUpO1xuICAgIC8vICAgfTtcbiAgICAvLyAgIChob3N0LnJlYWRGaWxlIGFzIGFueSkuX2hhY2tlZCA9IHRydWU7XG4gICAgLy8gfVxuICAgIHJldHVybiBfY3JlYXRlUHJtLmFwcGx5KGhhY2tlZFRzLCBhcmd1bWVudHMpO1xuICB9IGNhdGNoIChleCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1toYWNrLWZvcmstdHMtY2hlY2tlci13b3JrZXJdIEVycm9yJywgZXgpO1xuICAgIHRocm93IGV4O1xuICB9XG59IGFzIGFueTtcbk9iamVjdC5hc3NpZ24oaGFja2VkVHMuY3JlYXRlUHJvZ3JhbSwgX2NyZWF0ZVBybSk7XG5cbmhvb2tDb21tb25Kc1JlcXVpcmUoKGZpbGVuYW1lLCB0YXJnZXQsIHJxLCByZXNvbHZlKSA9PiB7XG4gIGlmIChmaWxlbmFtZS5zdGFydHNXaXRoKGZvcmtUc0RpcikpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhmaWxlbmFtZSwgdGFyZ2V0KTtcbiAgICBpZiAodGFyZ2V0LmluZGV4T2YoJ3R5cGVzY3JpcHQnKSA+PSAwICYmIHJlc29sdmUodGFyZ2V0KSA9PT0gdHNKcykge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhjaGFsay5jeWFuKCdbaGFjay1mb3ItdHMtY2hlY2tlcl0nKSArICcgbW9ua2V5LXBhdGNoIHR5cGVzY3JpcHQnKTtcbiAgICAgIC8vIGNvbnN0IHRzOiB0eXBlb2YgX3RzID0gcmVxdWlyZSgndHlwZXNjcmlwdCcpO1xuICAgICAgcmV0dXJuIGhhY2tlZFRzO1xuICAgIH1cbiAgfVxufSk7XG4iXX0=