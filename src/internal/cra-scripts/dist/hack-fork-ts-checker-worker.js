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
const log = (0, plink_1.log4File)(__filename);
log.info(chalk_1.default.cyan('[hack-for-ts-checker]') + ' fork-ts-checker-webpack-plugin runs, ' + forkTsDir);
const localTs = require(tsJs);
const cwd = process.cwd();
const createWatchCompilerHost = localTs.createWatchCompilerHost;
localTs.createWatchCompilerHost = function (configFileName, optionsToExtend, ...restArgs) {
    const co = (0, change_tsconfig_1.changeTsConfigFile)();
    const host = createWatchCompilerHost.call(this, configFileName, co, ...restArgs);
    const readFile = host.readFile;
    host.readFile = function (path, encoding) {
        const content = readFile.apply(this, arguments);
        if (!path.endsWith('.d.ts') && !path.endsWith('.json') && content) {
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
(0, loaderHooks_1.hookCommonJsRequire)((filename, target, rq, resolve) => {
    if (filename.startsWith(forkTsDir)) {
        if (target.indexOf('typescript') >= 0 && resolve(target) === tsJs) {
            log.info(chalk_1.default.cyan('[hack-for-ts-checker]') + ' monkey-patch typescript');
            return localTs;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay1mb3JrLXRzLWNoZWNrZXItd29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGFjay1mb3JrLXRzLWNoZWNrZXItd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsaUVBQW9FO0FBQ3BFLGtEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsc0RBQWtDO0FBQ2xDLHVEQUFxRDtBQUNyRCxzQ0FBb0M7QUFDcEMsc0RBQTRCO0FBRTVCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTJCLENBQUM7QUFFeEQsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsZ0NBQWdDLENBQUMsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDO0FBQzVGLE1BQU0sSUFBSSxHQUFHLGlCQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUMsQ0FBQyxDQUFDO0FBQ2xFLE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUVqQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyx3Q0FBd0MsR0FBRyxTQUFTLENBQUMsQ0FBQztBQUVyRyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFjLENBQUM7QUFDM0MsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLE1BQU0sdUJBQXVCLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFDO0FBRWhFLE9BQU8sQ0FBQyx1QkFBdUIsR0FBRyxVQUEwQixjQUFpQyxFQUFFLGVBQTRDLEVBQ3pJLEdBQUcsUUFBZTtJQUVsQixNQUFNLEVBQUUsR0FBRyxJQUFBLG9DQUFrQixHQUFFLENBQUM7SUFFaEMsTUFBTSxJQUFJLEdBQTRDLHVCQUF1QixDQUFDLElB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QUNGO0FBQ0gsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEZvciBmb3JrLXRzLWNoZWNrZXItd2VicGFjay1wbHVnaW4gNC4xLjYsXG4gKiBwYXRjaCBzb21lIGRhcmsgbWFnaWMgdG8gVHlwZXNjcmlwdCBjb21waWxlclxuICogIC0gY2hhbmdlIHRzLmNvbXBpbGVySG9zdC5yZWFkRmlsZSgpXG4gKiAgLSBjaGFuZ2Ugcm9vdE5hbWVzIGluIHBhcmFtZXRlcnMgb2YgdHMuY3JlYXRlUHJvZ3JhbSgpXG4gKiAgLSBjaGFuZ2UgY29tcGlsZXJPcHRpb25zLnJvb3REaXIgaW4gcGFyYW1ldGVycyBvZiB0cy5jcmVhdGVQcm9ncmFtKClcbiAqL1xuaW1wb3J0IHtob29rQ29tbW9uSnNSZXF1aXJlfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2xvYWRlckhvb2tzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB0cywge0NvbXBpbGVyT3B0aW9ucywgQ29tcGlsZXJIb3N0LCBDcmVhdGVQcm9ncmFtT3B0aW9uc30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgbm9kZVJlc29sdmUgZnJvbSAncmVzb2x2ZSc7XG5pbXBvcnQge2NoYW5nZVRzQ29uZmlnRmlsZX0gZnJvbSAnLi9jaGFuZ2UtdHNjb25maWcnO1xuaW1wb3J0IHtsb2c0RmlsZX0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgcGxpbmsgZnJvbSAnX19wbGluayc7XG5cbmNvbnN0IGluZGV4SnMgPSBwcm9jZXNzLmVudi5fcGxpbmtfY3JhX3NjcmlwdHNfaW5kZXhKcyE7XG5cbmNvbnN0IGZvcmtUc0RpciA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2ZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpbicpICsgUGF0aC5zZXA7XG5jb25zdCB0c0pzID0gbm9kZVJlc29sdmUuc3luYygndHlwZXNjcmlwdCcsIHtiYXNlZGlyOiBmb3JrVHNEaXJ9KTtcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5sb2cuaW5mbyhjaGFsay5jeWFuKCdbaGFjay1mb3ItdHMtY2hlY2tlcl0nKSArICcgZm9yay10cy1jaGVja2VyLXdlYnBhY2stcGx1Z2luIHJ1bnMsICcgKyBmb3JrVHNEaXIpO1xuXG5jb25zdCBsb2NhbFRzID0gcmVxdWlyZSh0c0pzKSBhcyB0eXBlb2YgdHM7XG5jb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuY29uc3QgY3JlYXRlV2F0Y2hDb21waWxlckhvc3QgPSBsb2NhbFRzLmNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0O1xuXG5sb2NhbFRzLmNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0ID0gZnVuY3Rpb24odGhpczogdHlwZW9mIHRzLCBjb25maWdGaWxlTmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIG9wdGlvbnNUb0V4dGVuZDogQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkLFxuICAuLi5yZXN0QXJnczogYW55W10pIHtcblxuICBjb25zdCBjbyA9IGNoYW5nZVRzQ29uZmlnRmlsZSgpO1xuXG4gIGNvbnN0IGhvc3Q6IHRzLldhdGNoQ29tcGlsZXJIb3N0PHRzLkJ1aWxkZXJQcm9ncmFtPiA9IGNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0LmNhbGwodGhpcywgY29uZmlnRmlsZU5hbWUsIGNvLCAuLi5yZXN0QXJncyk7XG4gIGNvbnN0IHJlYWRGaWxlID0gaG9zdC5yZWFkRmlsZTtcbiAgaG9zdC5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoIXBhdGguZW5kc1dpdGgoJy5kLnRzJykgJiYgIXBhdGguZW5kc1dpdGgoJy5qc29uJykgJiYgY29udGVudCkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ1dhdGNoQ29tcGlsZXJIb3N0LnJlYWRGaWxlJywgcGF0aCk7XG4gICAgICBjb25zdCBjaGFuZ2VkID0gcGxpbmsuYnJvd3NlckluamVjdG9yLmluamVjdFRvRmlsZShwYXRoLCBjb250ZW50KTtcbiAgICAgIGlmIChjaGFuZ2VkICE9PSBjb250ZW50KSB7XG4gICAgICAgIGxvZy5pbmZvKFBhdGgucmVsYXRpdmUoY3dkLCBwYXRoKSArICcgaXMgcGF0Y2hlZCcpO1xuICAgICAgICByZXR1cm4gY2hhbmdlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH07XG4gIHJldHVybiBob3N0O1xufSBhcyB0eXBlb2YgY3JlYXRlV2F0Y2hDb21waWxlckhvc3Q7XG5cbi8vIFBhdGNoIGNyZWF0ZVByb2dyYW0gdG8gY2hhbmdlIFwicm9vdEZpbGVzXCJcbmNvbnN0IF9jcmVhdGVQcm0gPSBsb2NhbFRzLmNyZWF0ZVByb2dyYW07XG5sb2NhbFRzLmNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbihyb290TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdLCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsIGhvc3Q/OiBDb21waWxlckhvc3QpIHtcbiAgdHJ5IHtcbiAgICAvLyBjb25zdCBjbyA9IGNoYW5nZVRzQ29uZmlnRmlsZSgpO1xuICAgIGxldCBjaGFuZ2VkUm9vdE5hbWVzOiBzdHJpbmdbXSA9IFtpbmRleEpzLnJlcGxhY2UoL1xcXFwvZywgJy8nKV07XG4gICAgLy8gQmVjYXVzZSBjcmVhdGVQcm9ncmFtKCkgaXMgb3ZlcmxvYWRlZCwgaXQgbWlnaHQgYWNjZXB0IDEgb3IgNSBwYXJhbWV0ZXJzXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIG9wdGlvbnMgPSAoYXJndW1lbnRzWzBdIGFzIENyZWF0ZVByb2dyYW1PcHRpb25zKS5vcHRpb25zO1xuICAgICAgaG9zdCA9IChhcmd1bWVudHNbMF0gYXMgQ3JlYXRlUHJvZ3JhbU9wdGlvbnMpLmhvc3Q7XG4gICAgICAoYXJndW1lbnRzWzBdIGFzIENyZWF0ZVByb2dyYW1PcHRpb25zKS5yb290TmFtZXMgPSBjaGFuZ2VkUm9vdE5hbWVzO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcmd1bWVudHNbMF0gPSBjaGFuZ2VkUm9vdE5hbWVzO1xuICAgIH1cbiAgICAvLyBvcHRpb25zLmJhc2VVcmwgPSBjby5iYXNlVXJsO1xuICAgIC8vIG9wdGlvbnMucm9vdERpciA9IGNvLnJvb3REaXI7XG4gICAgLy8gb3B0aW9ucy5wYXRocyA9IGNvLnBhdGhzO1xuICAgIC8vIG9wdGlvbnMudHlwZVJvb3RzID0gY28udHlwZVJvb3RzO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAvLyBjb25zb2xlLmxvZyhjaGFsay5jeWFuKCdbaGFjay1mb3ItdHMtY2hlY2tlcl0nKSArICcgdHMgcHJvZ3JhbSBcInJvb3ROYW1lc1wiOicsIChhcmd1bWVudHNbMF0gYXMgQ3JlYXRlUHJvZ3JhbU9wdGlvbnMpLnJvb3ROYW1lcyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAvLyBjb25zb2xlLmxvZyhjaGFsay5jeWFuKCdbaGFjay1mb3ItdHMtY2hlY2tlcl0nKSArICcgdHMgY29tcGlsZXJPcHRpb25zOlxcbicsIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgcHJvZ3JhbTogdHMuUHJvZ3JhbSA9IF9jcmVhdGVQcm0uYXBwbHkobG9jYWxUcywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBjb25zb2xlLmVycm9yKCdbaGFjay1mb3JrLXRzLWNoZWNrZXItd29ya2VyXSBFcnJvcicsIGV4KTtcbiAgICB0aHJvdyBleDtcbiAgfVxufSBhcyB0eXBlb2YgX2NyZWF0ZVBybTtcbk9iamVjdC5hc3NpZ24obG9jYWxUcy5jcmVhdGVQcm9ncmFtLCBfY3JlYXRlUHJtKTtcblxuaG9va0NvbW1vbkpzUmVxdWlyZSgoZmlsZW5hbWUsIHRhcmdldCwgcnEsIHJlc29sdmUpID0+IHtcbiAgaWYgKGZpbGVuYW1lLnN0YXJ0c1dpdGgoZm9ya1RzRGlyKSkge1xuICAgIGlmICh0YXJnZXQuaW5kZXhPZigndHlwZXNjcmlwdCcpID49IDAgJiYgcmVzb2x2ZSh0YXJnZXQpID09PSB0c0pzKSB7XG4gICAgICBsb2cuaW5mbyhjaGFsay5jeWFuKCdbaGFjay1mb3ItdHMtY2hlY2tlcl0nKSArICcgbW9ua2V5LXBhdGNoIHR5cGVzY3JpcHQnKTtcbiAgICAgIHJldHVybiBsb2NhbFRzO1xuICAgIH1cbiAgfVxufSk7XG4iXX0=