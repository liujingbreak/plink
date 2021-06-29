"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * For fork-ts-checker-webpack-plugin 4.1.6,
 * patch some dark magic to Typescript compiler
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
const __plink_1 = __importDefault(require("__plink"));
const indexJs = process.env._plink_cra_scripts_indexJs;
const forkTsDir = path_1.default.resolve('node_modules', 'fork-ts-checker-webpack-plugin') + path_1.default.sep;
const tsJs = resolve_1.default.sync('typescript', { basedir: forkTsDir });
const log = plink_1.log4File(__filename);
log.info(chalk_1.default.cyan('[hack-for-ts-checker]') + ' fork-ts-checker-webpack-plugin runs, ' + forkTsDir);
const localTs = require(tsJs);
const cwd = process.cwd();
const createWatchCompilerHost = localTs.createWatchCompilerHost;
localTs.createWatchCompilerHost = function (configFileName, optionsToExtend, ...restArgs) {
    const co = change_tsconfig_1.changeTsConfigFile();
    const host = createWatchCompilerHost.call(this, configFileName, co, ...restArgs);
    const readFile = host.readFile;
    host.readFile = function (path, encoding) {
        const content = readFile.apply(this, arguments);
        if (!path.endsWith('.d.ts') && !path.endsWith('.json')) {
            // console.log('WatchCompilerHost.readFile', path);
            const changed = __plink_1.default.browserInjector.injectToFile(path, content);
            if (changed !== content) {
                log.info(path_1.default.relative(cwd, path) + ' is patched');
                return changed;
            }
        }
        return content;
    };
    return host;
};
// Patch createProgram to change "rootFiles"
const _createPrm = localTs.createProgram;
localTs.createProgram = function (rootNames, options, host) {
    try {
        // const co = changeTsConfigFile();
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
        // options.baseUrl = co.baseUrl;
        // options.rootDir = co.rootDir;
        // options.paths = co.paths;
        // options.typeRoots = co.typeRoots;
        // eslint-disable-next-line no-console
        // console.log(chalk.cyan('[hack-for-ts-checker]') + ' ts program "rootNames":', (arguments[0] as CreateProgramOptions).rootNames);
        // eslint-disable-next-line no-console
        // console.log(chalk.cyan('[hack-for-ts-checker]') + ' ts compilerOptions:\n', options);
        const program = _createPrm.apply(localTs, arguments);
        return program;
    }
    catch (ex) {
        console.error('[hack-fork-ts-checker-worker] Error', ex);
        throw ex;
    }
};
Object.assign(localTs.createProgram, _createPrm);
loaderHooks_1.hookCommonJsRequire((filename, target, rq, resolve) => {
    if (filename.startsWith(forkTsDir)) {
        if (target.indexOf('typescript') >= 0 && resolve(target) === tsJs) {
            log.info(chalk_1.default.cyan('[hack-for-ts-checker]') + ' monkey-patch typescript');
            return localTs;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay1mb3JrLXRzLWNoZWNrZXItd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGFjay1mb3JrLXRzLWNoZWNrZXItd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsaUVBQW9FO0FBQ3BFLGtEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsc0RBQWtDO0FBQ2xDLHVEQUFxRDtBQUNyRCxzQ0FBb0M7QUFDcEMsc0RBQTRCO0FBRTVCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTJCLENBQUM7QUFFeEQsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsZ0NBQWdDLENBQUMsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDO0FBQzVGLE1BQU0sSUFBSSxHQUFHLGlCQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUMsQ0FBQyxDQUFDO0FBQ2xFLE1BQU0sR0FBRyxHQUFHLGdCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsd0NBQXdDLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFFckcsTUFBTSxPQUFPLEdBQWMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3pDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQixNQUFNLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztBQUVoRSxPQUFPLENBQUMsdUJBQXVCLEdBQUcsVUFBUyxjQUFpQyxFQUFFLGVBQTRDLEVBQ3hILEdBQUcsUUFBZTtJQUVsQixNQUFNLEVBQUUsR0FBRyxvQ0FBa0IsRUFBRSxDQUFDO0lBRWhDLE1BQU0sSUFBSSxHQUE0Qyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFB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cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBGb3IgZm9yay10cy1jaGVja2VyLXdlYnBhY2stcGx1Z2luIDQuMS42LFxuICogcGF0Y2ggc29tZSBkYXJrIG1hZ2ljIHRvIFR5cGVzY3JpcHQgY29tcGlsZXJcbiAqICAtIGNoYW5nZSB0cy5jb21waWxlckhvc3QucmVhZEZpbGUoKVxuICogIC0gY2hhbmdlIHJvb3ROYW1lcyBpbiBwYXJhbWV0ZXJzIG9mIHRzLmNyZWF0ZVByb2dyYW0oKVxuICogIC0gY2hhbmdlIGNvbXBpbGVyT3B0aW9ucy5yb290RGlyIGluIHBhcmFtZXRlcnMgb2YgdHMuY3JlYXRlUHJvZ3JhbSgpXG4gKi9cbmltcG9ydCB7aG9va0NvbW1vbkpzUmVxdWlyZX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9sb2FkZXJIb29rcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdHMsIHtDb21waWxlck9wdGlvbnMsIENvbXBpbGVySG9zdCwgQ3JlYXRlUHJvZ3JhbU9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IG5vZGVSZXNvbHZlIGZyb20gJ3Jlc29sdmUnO1xuaW1wb3J0IHtjaGFuZ2VUc0NvbmZpZ0ZpbGV9IGZyb20gJy4vY2hhbmdlLXRzY29uZmlnJztcbmltcG9ydCB7bG9nNEZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuXG5jb25zdCBpbmRleEpzID0gcHJvY2Vzcy5lbnYuX3BsaW5rX2NyYV9zY3JpcHRzX2luZGV4SnMhO1xuXG5jb25zdCBmb3JrVHNEaXIgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdmb3JrLXRzLWNoZWNrZXItd2VicGFjay1wbHVnaW4nKSArIFBhdGguc2VwO1xuY29uc3QgdHNKcyA9IG5vZGVSZXNvbHZlLnN5bmMoJ3R5cGVzY3JpcHQnLCB7YmFzZWRpcjogZm9ya1RzRGlyfSk7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxubG9nLmluZm8oY2hhbGsuY3lhbignW2hhY2stZm9yLXRzLWNoZWNrZXJdJykgKyAnIGZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpbiBydW5zLCAnICsgZm9ya1RzRGlyKTtcblxuY29uc3QgbG9jYWxUczogdHlwZW9mIHRzID0gcmVxdWlyZSh0c0pzKTtcbmNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG5jb25zdCBjcmVhdGVXYXRjaENvbXBpbGVySG9zdCA9IGxvY2FsVHMuY3JlYXRlV2F0Y2hDb21waWxlckhvc3Q7XG5cbmxvY2FsVHMuY3JlYXRlV2F0Y2hDb21waWxlckhvc3QgPSBmdW5jdGlvbihjb25maWdGaWxlTmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIG9wdGlvbnNUb0V4dGVuZDogQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkLFxuICAuLi5yZXN0QXJnczogYW55W10pIHtcblxuICBjb25zdCBjbyA9IGNoYW5nZVRzQ29uZmlnRmlsZSgpO1xuXG4gIGNvbnN0IGhvc3Q6IHRzLldhdGNoQ29tcGlsZXJIb3N0PHRzLkJ1aWxkZXJQcm9ncmFtPiA9IGNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0LmNhbGwodGhpcywgY29uZmlnRmlsZU5hbWUsIGNvLCAuLi5yZXN0QXJncyk7XG4gIGNvbnN0IHJlYWRGaWxlID0gaG9zdC5yZWFkRmlsZTtcbiAgaG9zdC5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoIXBhdGguZW5kc1dpdGgoJy5kLnRzJykgJiYgIXBhdGguZW5kc1dpdGgoJy5qc29uJykpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdXYXRjaENvbXBpbGVySG9zdC5yZWFkRmlsZScsIHBhdGgpO1xuICAgICAgY29uc3QgY2hhbmdlZCA9IHBsaW5rLmJyb3dzZXJJbmplY3Rvci5pbmplY3RUb0ZpbGUocGF0aCwgY29udGVudCk7XG4gICAgICBpZiAoY2hhbmdlZCAhPT0gY29udGVudCkge1xuICAgICAgICBsb2cuaW5mbyhQYXRoLnJlbGF0aXZlKGN3ZCwgcGF0aCkgKyAnIGlzIHBhdGNoZWQnKTtcbiAgICAgICAgcmV0dXJuIGNoYW5nZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xuICB9O1xuICByZXR1cm4gaG9zdCBhcyBhbnk7XG59O1xuXG4vLyBQYXRjaCBjcmVhdGVQcm9ncmFtIHRvIGNoYW5nZSBcInJvb3RGaWxlc1wiXG5jb25zdCBfY3JlYXRlUHJtID0gbG9jYWxUcy5jcmVhdGVQcm9ncmFtO1xubG9jYWxUcy5jcmVhdGVQcm9ncmFtID0gZnVuY3Rpb24ocm9vdE5hbWVzOiByZWFkb25seSBzdHJpbmdbXSwgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCBob3N0PzogQ29tcGlsZXJIb3N0KSB7XG4gIHRyeSB7XG4gICAgLy8gY29uc3QgY28gPSBjaGFuZ2VUc0NvbmZpZ0ZpbGUoKTtcbiAgICBsZXQgY2hhbmdlZFJvb3ROYW1lczogc3RyaW5nW10gPSBbaW5kZXhKcy5yZXBsYWNlKC9cXFxcL2csICcvJyldO1xuICAgIC8vIEJlY2F1c2UgY3JlYXRlUHJvZ3JhbSgpIGlzIG92ZXJsb2FkZWQsIGl0IG1pZ2h0IGFjY2VwdCAxIG9yIDUgcGFyYW1ldGVyc1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICBvcHRpb25zID0gKGFyZ3VtZW50c1swXSBhcyBDcmVhdGVQcm9ncmFtT3B0aW9ucykub3B0aW9ucztcbiAgICAgIGhvc3QgPSAoYXJndW1lbnRzWzBdIGFzIENyZWF0ZVByb2dyYW1PcHRpb25zKS5ob3N0O1xuICAgICAgKGFyZ3VtZW50c1swXSBhcyBDcmVhdGVQcm9ncmFtT3B0aW9ucykucm9vdE5hbWVzID0gY2hhbmdlZFJvb3ROYW1lcztcbiAgICB9IGVsc2Uge1xuICAgICAgYXJndW1lbnRzWzBdID0gY2hhbmdlZFJvb3ROYW1lcztcbiAgICB9XG4gICAgLy8gb3B0aW9ucy5iYXNlVXJsID0gY28uYmFzZVVybDtcbiAgICAvLyBvcHRpb25zLnJvb3REaXIgPSBjby5yb290RGlyO1xuICAgIC8vIG9wdGlvbnMucGF0aHMgPSBjby5wYXRocztcbiAgICAvLyBvcHRpb25zLnR5cGVSb290cyA9IGNvLnR5cGVSb290cztcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgLy8gY29uc29sZS5sb2coY2hhbGsuY3lhbignW2hhY2stZm9yLXRzLWNoZWNrZXJdJykgKyAnIHRzIHByb2dyYW0gXCJyb290TmFtZXNcIjonLCAoYXJndW1lbnRzWzBdIGFzIENyZWF0ZVByb2dyYW1PcHRpb25zKS5yb290TmFtZXMpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgLy8gY29uc29sZS5sb2coY2hhbGsuY3lhbignW2hhY2stZm9yLXRzLWNoZWNrZXJdJykgKyAnIHRzIGNvbXBpbGVyT3B0aW9uczpcXG4nLCBvcHRpb25zKTtcblxuICAgIGNvbnN0IHByb2dyYW06IHRzLlByb2dyYW0gPSBfY3JlYXRlUHJtLmFwcGx5KGxvY2FsVHMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgY29uc29sZS5lcnJvcignW2hhY2stZm9yay10cy1jaGVja2VyLXdvcmtlcl0gRXJyb3InLCBleCk7XG4gICAgdGhyb3cgZXg7XG4gIH1cbn0gYXMgYW55O1xuT2JqZWN0LmFzc2lnbihsb2NhbFRzLmNyZWF0ZVByb2dyYW0sIF9jcmVhdGVQcm0pO1xuXG5ob29rQ29tbW9uSnNSZXF1aXJlKChmaWxlbmFtZSwgdGFyZ2V0LCBycSwgcmVzb2x2ZSkgPT4ge1xuICBpZiAoZmlsZW5hbWUuc3RhcnRzV2l0aChmb3JrVHNEaXIpKSB7XG4gICAgaWYgKHRhcmdldC5pbmRleE9mKCd0eXBlc2NyaXB0JykgPj0gMCAmJiByZXNvbHZlKHRhcmdldCkgPT09IHRzSnMpIHtcbiAgICAgIGxvZy5pbmZvKGNoYWxrLmN5YW4oJ1toYWNrLWZvci10cy1jaGVja2VyXScpICsgJyBtb25rZXktcGF0Y2ggdHlwZXNjcmlwdCcpO1xuICAgICAgcmV0dXJuIGxvY2FsVHM7XG4gICAgfVxuICB9XG59KTtcbiJdfQ==