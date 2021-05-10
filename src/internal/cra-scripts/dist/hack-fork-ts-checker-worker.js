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
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const resolve_1 = __importDefault(require("resolve"));
const change_tsconfig_1 = require("./change-tsconfig");
const plink_1 = require("@wfh/plink");
const indexJs = process.env._plink_cra_scripts_indexJs;
const forkTsDir = path_1.default.resolve('node_modules', 'fork-ts-checker-webpack-plugin') + path_1.default.sep;
const tsJs = resolve_1.default.sync('typescript', { basedir: forkTsDir });
const log = plink_1.log4File(__filename);
log.info(chalk_1.default.cyan('[hack-for-ts-checker]') + ' fork-ts-checker-webpack-plugin runs, ' + forkTsDir);
const hackedTs = require(tsJs);
const _createPrm = hackedTs.createProgram;
hackedTs.createProgram = function (rootNames, options, host) {
    try {
        const co = change_tsconfig_1.changeTsConfigFile();
        let changedRootNames = [indexJs.replace(/\\/g, '/')];
        // Because createProgram() is overloaded, it might accept 1 or 5 parameters
        if (arguments.length === 1) {
            options = arguments[0].options;
            host = arguments[0].host;
            arguments[0].rootNames = changedRootNames;
        }
        else {
            arguments[0] = changedRootNames;
        }
        options.baseUrl = co.baseUrl;
        options.rootDir = co.rootDir;
        options.paths = co.paths;
        options.typeRoots = co.typeRoots;
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
        if (target.indexOf('typescript') >= 0 && resolve(target) === tsJs) {
            log.info(chalk_1.default.cyan('[hack-for-ts-checker]') + ' monkey-patch typescript');
            return hackedTs;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay1mb3JrLXRzLWNoZWNrZXItd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGFjay1mb3JrLXRzLWNoZWNrZXItd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUE7Ozs7O0dBS0c7QUFDSCxpRUFBb0U7QUFDcEUsa0RBQTBCO0FBQzFCLGdEQUF3QjtBQUV4QixzREFBa0M7QUFDbEMsdURBQXFEO0FBQ3JELHNDQUFvQztBQUVwQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEyQixDQUFDO0FBRXhELE1BQU0sU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLGdDQUFnQyxDQUFDLEdBQUcsY0FBSSxDQUFDLEdBQUcsQ0FBQztBQUM1RixNQUFNLElBQUksR0FBRyxpQkFBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBQyxPQUFPLEVBQUUsU0FBUyxFQUFDLENBQUMsQ0FBQztBQUNsRSxNQUFNLEdBQUcsR0FBRyxnQkFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRWpDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLHdDQUF3QyxHQUFHLFNBQVMsQ0FBQyxDQUFDO0FBRXJHLE1BQU0sUUFBUSxHQUFjLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUUxQyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDO0FBQzFDLFFBQVEsQ0FBQyxhQUFhLEdBQUcsVUFBUyxTQUE0QixFQUFFLE9BQXdCLEVBQUUsSUFBbUI7SUFDM0csSUFBSTtRQUNGLE1BQU0sRUFBRSxHQUFHLG9DQUFrQixFQUFFLENBQUM7UUFDaEMsSUFBSSxnQkFBZ0IsR0FBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0QsMkVBQTJFO1FBQzNFLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDMUIsT0FBTyxHQUFJLFNBQVMsQ0FBQyxDQUFDLENBQTBCLENBQUMsT0FBTyxDQUFDO1lBQ3pELElBQUksR0FBSSxTQUFTLENBQUMsQ0FBQyxDQUEwQixDQUFDLElBQUksQ0FBQztZQUNsRCxTQUFTLENBQUMsQ0FBQyxDQUEwQixDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQztTQUNyRTthQUFNO1lBQ0wsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLGdCQUFnQixDQUFDO1NBQ2pDO1FBQ0QsT0FBTyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQztRQUM3QixPQUFPLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDekIsT0FBTyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDO1FBRWpDLHVDQUF1QztRQUN2QyxtSUFBbUk7UUFDbkksdUNBQXVDO1FBQ3ZDLHdGQUF3RjtRQUV4Rix3REFBd0Q7UUFDeEQsOEJBQThCO1FBQzlCLHFDQUFxQztRQUNyQyw4Q0FBOEM7UUFDOUMsMkVBQTJFO1FBQzNFLGtDQUFrQztRQUNsQyxPQUFPO1FBQ1AsMkNBQTJDO1FBQzNDLElBQUk7UUFDSixPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0tBQzlDO0lBQUMsT0FBTyxFQUFFLEVBQUU7UUFDWCxPQUFPLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sRUFBRSxDQUFDO0tBQ1Y7QUFDSCxDQUFRLENBQUM7QUFDVCxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFFbEQsaUNBQW1CLENBQUMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNwRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFDbEMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ2pFLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLDBCQUEwQixDQUFDLENBQUM7WUFDM0UsT0FBTyxRQUFRLENBQUM7U0FDakI7S0FDRjtBQUNILENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBIYWNrIGZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpbjpcbiAqICAtIGNoYW5nZSB0cy5jb21waWxlckhvc3QucmVhZEZpbGUoKVxuICogIC0gY2hhbmdlIHJvb3ROYW1lcyBpbiBwYXJhbWV0ZXJzIG9mIHRzLmNyZWF0ZVByb2dyYW0oKVxuICogIC0gY2hhbmdlIGNvbXBpbGVyT3B0aW9ucy5yb290RGlyIGluIHBhcmFtZXRlcnMgb2YgdHMuY3JlYXRlUHJvZ3JhbSgpXG4gKi9cbmltcG9ydCB7aG9va0NvbW1vbkpzUmVxdWlyZX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9sb2FkZXJIb29rcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdHMsIHtDb21waWxlck9wdGlvbnMsIENvbXBpbGVySG9zdCwgQ3JlYXRlUHJvZ3JhbU9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IG5vZGVSZXNvbHZlIGZyb20gJ3Jlc29sdmUnO1xuaW1wb3J0IHtjaGFuZ2VUc0NvbmZpZ0ZpbGV9IGZyb20gJy4vY2hhbmdlLXRzY29uZmlnJztcbmltcG9ydCB7bG9nNEZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG5jb25zdCBpbmRleEpzID0gcHJvY2Vzcy5lbnYuX3BsaW5rX2NyYV9zY3JpcHRzX2luZGV4SnMhO1xuXG5jb25zdCBmb3JrVHNEaXIgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdmb3JrLXRzLWNoZWNrZXItd2VicGFjay1wbHVnaW4nKSArIFBhdGguc2VwO1xuY29uc3QgdHNKcyA9IG5vZGVSZXNvbHZlLnN5bmMoJ3R5cGVzY3JpcHQnLCB7YmFzZWRpcjogZm9ya1RzRGlyfSk7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxubG9nLmluZm8oY2hhbGsuY3lhbignW2hhY2stZm9yLXRzLWNoZWNrZXJdJykgKyAnIGZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpbiBydW5zLCAnICsgZm9ya1RzRGlyKTtcblxuY29uc3QgaGFja2VkVHM6IHR5cGVvZiB0cyA9IHJlcXVpcmUodHNKcyk7XG5cbmNvbnN0IF9jcmVhdGVQcm0gPSBoYWNrZWRUcy5jcmVhdGVQcm9ncmFtO1xuaGFja2VkVHMuY3JlYXRlUHJvZ3JhbSA9IGZ1bmN0aW9uKHJvb3ROYW1lczogcmVhZG9ubHkgc3RyaW5nW10sIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgaG9zdD86IENvbXBpbGVySG9zdCkge1xuICB0cnkge1xuICAgIGNvbnN0IGNvID0gY2hhbmdlVHNDb25maWdGaWxlKCk7XG4gICAgbGV0IGNoYW5nZWRSb290TmFtZXM6IHN0cmluZ1tdID0gW2luZGV4SnMucmVwbGFjZSgvXFxcXC9nLCAnLycpXTtcbiAgICAvLyBCZWNhdXNlIGNyZWF0ZVByb2dyYW0oKSBpcyBvdmVybG9hZGVkLCBpdCBtaWdodCBhY2NlcHQgMSBvciA1IHBhcmFtZXRlcnNcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgb3B0aW9ucyA9IChhcmd1bWVudHNbMF0gYXMgQ3JlYXRlUHJvZ3JhbU9wdGlvbnMpLm9wdGlvbnM7XG4gICAgICBob3N0ID0gKGFyZ3VtZW50c1swXSBhcyBDcmVhdGVQcm9ncmFtT3B0aW9ucykuaG9zdDtcbiAgICAgIChhcmd1bWVudHNbMF0gYXMgQ3JlYXRlUHJvZ3JhbU9wdGlvbnMpLnJvb3ROYW1lcyA9IGNoYW5nZWRSb290TmFtZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFyZ3VtZW50c1swXSA9IGNoYW5nZWRSb290TmFtZXM7XG4gICAgfVxuICAgIG9wdGlvbnMuYmFzZVVybCA9IGNvLmJhc2VVcmw7XG4gICAgb3B0aW9ucy5yb290RGlyID0gY28ucm9vdERpcjtcbiAgICBvcHRpb25zLnBhdGhzID0gY28ucGF0aHM7XG4gICAgb3B0aW9ucy50eXBlUm9vdHMgPSBjby50eXBlUm9vdHM7XG5cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAvLyBjb25zb2xlLmxvZyhjaGFsay5jeWFuKCdbaGFjay1mb3ItdHMtY2hlY2tlcl0nKSArICcgdHMgcHJvZ3JhbSBcInJvb3ROYW1lc1wiOicsIChhcmd1bWVudHNbMF0gYXMgQ3JlYXRlUHJvZ3JhbU9wdGlvbnMpLnJvb3ROYW1lcyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgLy8gY29uc29sZS5sb2coY2hhbGsuY3lhbignW2hhY2stZm9yLXRzLWNoZWNrZXJdJykgKyAnIHRzIGNvbXBpbGVyT3B0aW9uczpcXG4nLCBvcHRpb25zKTtcblxuICAgIC8vIGlmIChob3N0ICYmIChob3N0LnJlYWRGaWxlIGFzIGFueSkuX2hhY2tlZCA9PSBudWxsKSB7XG4gICAgLy8gICBjb25zdCByZiA9IGhvc3QucmVhZEZpbGU7XG4gICAgLy8gICBob3N0LnJlYWRGaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICAgIC8vICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAvLyAgICAgY29uc29sZS5sb2coY2hhbGsuY3lhbignW2hhY2stZm9yLXRzLWNoZWNrZXJdJykgKyAnIFRTIHJlYWQnLCBmaWxlKTtcbiAgICAvLyAgICAgcmV0dXJuIHJmLmNhbGwoaG9zdCwgZmlsZSk7XG4gICAgLy8gICB9O1xuICAgIC8vICAgKGhvc3QucmVhZEZpbGUgYXMgYW55KS5faGFja2VkID0gdHJ1ZTtcbiAgICAvLyB9XG4gICAgcmV0dXJuIF9jcmVhdGVQcm0uYXBwbHkoaGFja2VkVHMsIGFyZ3VtZW50cyk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgY29uc29sZS5lcnJvcignW2hhY2stZm9yay10cy1jaGVja2VyLXdvcmtlcl0gRXJyb3InLCBleCk7XG4gICAgdGhyb3cgZXg7XG4gIH1cbn0gYXMgYW55O1xuT2JqZWN0LmFzc2lnbihoYWNrZWRUcy5jcmVhdGVQcm9ncmFtLCBfY3JlYXRlUHJtKTtcblxuaG9va0NvbW1vbkpzUmVxdWlyZSgoZmlsZW5hbWUsIHRhcmdldCwgcnEsIHJlc29sdmUpID0+IHtcbiAgaWYgKGZpbGVuYW1lLnN0YXJ0c1dpdGgoZm9ya1RzRGlyKSkge1xuICAgIGlmICh0YXJnZXQuaW5kZXhPZigndHlwZXNjcmlwdCcpID49IDAgJiYgcmVzb2x2ZSh0YXJnZXQpID09PSB0c0pzKSB7XG4gICAgICBsb2cuaW5mbyhjaGFsay5jeWFuKCdbaGFjay1mb3ItdHMtY2hlY2tlcl0nKSArICcgbW9ua2V5LXBhdGNoIHR5cGVzY3JpcHQnKTtcbiAgICAgIHJldHVybiBoYWNrZWRUcztcbiAgICB9XG4gIH1cbn0pO1xuIl19