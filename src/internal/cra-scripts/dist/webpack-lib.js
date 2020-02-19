"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const build_target_helper_1 = require("./build-target-helper");
const child_process_1 = tslib_1.__importDefault(require("child_process"));
// import fs from 'fs-extra';
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("./utils");
// const EsmWebpackPlugin = require("@purtuga/esm-webpack-plugin");
const MiniCssExtractPlugin = require(path_1.default.resolve('node_modules/mini-css-extract-plugin'));
function change(buildPackage, config) {
    const { dir: pkDir, packageJson: pkJson } = build_target_helper_1.findPackage(buildPackage);
    config.entry = path_1.default.resolve(pkDir, 'public_api.ts');
    config.output.path = path_1.default.resolve(pkDir, 'build'); // Have to override it cuz' react-scripts assign `undefined` in non-production env
    config.output.filename = 'lib-bundle.js';
    config.output.libraryTarget = 'commonjs2';
    config.optimization.runtimeChunk = false;
    if (config.optimization && config.optimization.splitChunks) {
        config.optimization.splitChunks = {
            cacheGroups: { default: false }
        };
    }
    // ---- Plugins filter ----
    const InlineChunkHtmlPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/InlineChunkHtmlPlugin'));
    const InterpolateHtmlPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/InterpolateHtmlPlugin'));
    const HtmlWebpackPlugin = require(path_1.default.resolve('node_modules/html-webpack-plugin'));
    config.plugins = config.plugins.filter(plugin => {
        return (!(plugin instanceof MiniCssExtractPlugin)) &&
            (!(plugin instanceof InlineChunkHtmlPlugin)) &&
            (!(plugin instanceof InterpolateHtmlPlugin)) &&
            (!(plugin instanceof HtmlWebpackPlugin));
    });
    findAndChangeRule(config.module.rules);
    const reqSet = new Set();
    if (config.externals == null)
        config.externals = [];
    config.externals
        .push((context, request, callback) => {
        // TODO: Should be configurable
        if ((!request.startsWith('.') && request !== config.entry &&
            !/[?!]/.test(request) &&
            !/[\\/]@babel[\\/]/.test(request)) || request.indexOf('/bklib.min') >= 0) {
            // console.log('external request:', request, `(${context})`);
            reqSet.add(request);
            return callback(null, 'commonjs ' + request);
        }
        callback();
    });
    config.plugins.push(
    // new EsmWebpackPlugin(),
    new (class {
        apply(compiler) {
            forkTsc(pkJson.name);
            compiler.hooks.done.tap('cra-scripts', stats => {
                // tslint:disable-next-line: no-console
                console.log('external request:\n  ', Array.from(reqSet.values()).join(', '));
            });
        }
    })());
}
exports.default = change;
function findAndChangeRule(rules) {
    // TODO: check in case CRA will use Rule.use instead of "loader"
    checkSet(rules);
    for (const rule of rules) {
        if (Array.isArray(rule.use)) {
            checkSet(rule.use);
        }
        else if (Array.isArray(rule.loader)) {
            checkSet(rule.loader);
        }
        else if (rule.oneOf) {
            return findAndChangeRule(rule.oneOf);
        }
    }
    function checkSet(set) {
        const found = set.findIndex(use => use.loader && use.loader.indexOf(MiniCssExtractPlugin.loader) >= 0);
        // const found = rule.use.findIndex(use => (use as any).loader && (use as any).loader.indexOf('mini-css-extract-plugin') >= 0);
        if (found >= 0) {
            set.splice(found, 1);
            set.unshift(require.resolve('style-loader'));
        }
    }
    return;
}
function forkTsc(targetPackage) {
    const drcpHome = utils_1.findDrcpProjectDir();
    const execArgv = Array.from(process.execArgv);
    let execArgvRmPos = execArgv.indexOf('-r');
    execArgvRmPos = (execArgvRmPos >= 0) ? execArgvRmPos : execArgv.indexOf('--require');
    if (execArgvRmPos >= 0 && execArgv[execArgvRmPos + 1] === require('../package.json').name) {
        execArgv.splice(execArgvRmPos, 2);
    }
    // console.log('[webpack-lib] ' + Path.resolve(__dirname, 'build-lib', 'drcp-tsc.js'), drcpHome);
    const cp = child_process_1.default.fork(path_1.default.resolve(__dirname, 'build-lib', 'drcp-tsc.js'), [targetPackage], {
        cwd: drcpHome,
        execArgv,
        stdio: 'inherit'
    });
    // cp.unref();
    return new Promise((resolve, rej) => {
        cp.on('exit', (code, signal) => {
            if (code !== 0) {
                rej(new Error(`Failed to generate tsd files, due to process exit with code: ${code} ${signal}`));
            }
            else {
                // tslint:disable-next-line: no-console
                console.log('[webpack-lib] tsc done');
                resolve();
            }
        });
        cp.on('error', err => {
            console.error(err);
        });
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay1saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsK0RBQWtEO0FBQ2xELDBFQUFzQztBQUN0Qyw2QkFBNkI7QUFDN0Isd0RBQXdCO0FBQ3hCLG1DQUEyQztBQUMzQyxtRUFBbUU7QUFDbkUsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUM7QUFFM0YsU0FBd0IsTUFBTSxDQUFDLFlBQW9CLEVBQUUsTUFBcUI7SUFFeEUsTUFBTSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBQyxHQUFHLGlDQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFcEUsTUFBTSxDQUFDLEtBQUssR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztJQUVwRCxNQUFNLENBQUMsTUFBTyxDQUFDLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLGtGQUFrRjtJQUN0SSxNQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsR0FBRyxlQUFlLENBQUM7SUFDMUMsTUFBTSxDQUFDLE1BQU8sQ0FBQyxhQUFhLEdBQUcsV0FBVyxDQUFDO0lBQzNDLE1BQU0sQ0FBQyxZQUFhLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztJQUMxQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUU7UUFDMUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLEdBQUc7WUFDaEMsV0FBVyxFQUFFLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBQztTQUM5QixDQUFDO0tBQ0g7SUFFRCwyQkFBMkI7SUFFM0IsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxv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LENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ25DO0lBQ0QsaUdBQWlHO0lBQ2pHLE1BQU0sRUFBRSxHQUFHLHVCQUFTLENBQUMsSUFBSSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUMsRUFDM0UsQ0FBQyxhQUFhLENBQUMsRUFBRTtRQUNmLEdBQUcsRUFBRSxRQUFRO1FBQ2IsUUFBUTtRQUNSLEtBQUssRUFBRSxTQUFTO0tBQ2pCLENBQUMsQ0FBQztJQUNMLGNBQWM7SUFDZCxPQUFPLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3hDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzdCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtnQkFDZCxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsZ0VBQWdFLElBQUksSUFBSSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDbEc7aUJBQU07Z0JBQ0wsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUM7Z0JBQ3RDLE9BQU8sRUFBRSxDQUFDO2FBQ1g7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILEVBQUUsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckIsQ0FBQyxDQUFDLENBQUM7SUFFTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9jcmEtc2NyaXB0cy9kaXN0L3dlYnBhY2stbGliLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDb25maWd1cmF0aW9uLCBDb21waWxlciwgUnVsZVNldFJ1bGUsIFJ1bGVTZXRVc2VJdGVtfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7ZmluZFBhY2thZ2V9IGZyb20gJy4vYnVpbGQtdGFyZ2V0LWhlbHBlcic7XG5pbXBvcnQgY2hpbGRQcm9jIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtmaW5kRHJjcFByb2plY3REaXJ9IGZyb20gJy4vdXRpbHMnO1xuLy8gY29uc3QgRXNtV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoXCJAcHVydHVnYS9lc20td2VicGFjay1wbHVnaW5cIik7XG5jb25zdCBNaW5pQ3NzRXh0cmFjdFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNoYW5nZShidWlsZFBhY2thZ2U6IHN0cmluZywgY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG5cbiAgY29uc3Qge2RpcjogcGtEaXIsIHBhY2thZ2VKc29uOiBwa0pzb259ID0gZmluZFBhY2thZ2UoYnVpbGRQYWNrYWdlKTtcblxuICBjb25maWcuZW50cnkgPSBQYXRoLnJlc29sdmUocGtEaXIsICdwdWJsaWNfYXBpLnRzJyk7XG5cbiAgY29uZmlnLm91dHB1dCEucGF0aCA9IFBhdGgucmVzb2x2ZShwa0RpciwgJ2J1aWxkJyk7IC8vIEhhdmUgdG8gb3ZlcnJpZGUgaXQgY3V6JyByZWFjdC1zY3JpcHRzIGFzc2lnbiBgdW5kZWZpbmVkYCBpbiBub24tcHJvZHVjdGlvbiBlbnZcbiAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnbGliLWJ1bmRsZS5qcyc7XG4gIGNvbmZpZy5vdXRwdXQhLmxpYnJhcnlUYXJnZXQgPSAnY29tbW9uanMyJztcbiAgY29uZmlnLm9wdGltaXphdGlvbiEucnVudGltZUNodW5rID0gZmFsc2U7XG4gIGlmIChjb25maWcub3B0aW1pemF0aW9uICYmIGNvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MpIHtcbiAgICBjb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzID0ge1xuICAgICAgY2FjaGVHcm91cHM6IHtkZWZhdWx0OiBmYWxzZX1cbiAgICB9O1xuICB9XG5cbiAgLy8gLS0tLSBQbHVnaW5zIGZpbHRlciAtLS0tXG5cbiAgY29uc3QgSW5saW5lQ2h1bmtIdG1sUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvSW5saW5lQ2h1bmtIdG1sUGx1Z2luJykpO1xuICBjb25zdCBJbnRlcnBvbGF0ZUh0bWxQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9JbnRlcnBvbGF0ZUh0bWxQbHVnaW4nKSk7XG4gIGNvbnN0IEh0bWxXZWJwYWNrUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9odG1sLXdlYnBhY2stcGx1Z2luJykpO1xuXG4gIGNvbmZpZy5wbHVnaW5zID0gY29uZmlnLnBsdWdpbnMhLmZpbHRlcihwbHVnaW4gPT4ge1xuICAgIHJldHVybiAoIShwbHVnaW4gaW5zdGFuY2VvZiBNaW5pQ3NzRXh0cmFjdFBsdWdpbikpICYmXG4gICAgICAoISAocGx1Z2luIGluc3RhbmNlb2YgSW5saW5lQ2h1bmtIdG1sUGx1Z2luKSkgJiZcbiAgICAgICghIChwbHVnaW4gaW5zdGFuY2VvZiBJbnRlcnBvbGF0ZUh0bWxQbHVnaW4pKSAmJlxuICAgICAgKCEgKHBsdWdpbiBpbnN0YW5jZW9mIEh0bWxXZWJwYWNrUGx1Z2luKSk7XG4gIH0pO1xuXG4gIGZpbmRBbmRDaGFuZ2VSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcblxuXG4gIGNvbnN0IHJlcVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGlmIChjb25maWcuZXh0ZXJuYWxzID09IG51bGwpXG4gICAgY29uZmlnLmV4dGVybmFscyA9IFtdO1xuICAoY29uZmlnLmV4dGVybmFscyBhcyBFeHRyYWN0PENvbmZpZ3VyYXRpb25bJ2V4dGVybmFscyddLCBBcnJheTxhbnk+PilcbiAgLnB1c2goXG4gICAgKGNvbnRleHQ6IGFueSwgcmVxdWVzdDogYW55LCBjYWxsYmFjazogKGVycm9yPzogYW55LCByZXN1bHQ/OiBhbnkpID0+IHZvaWQgKSA9PiB7XG4gICAgICAvLyBUT0RPOiBTaG91bGQgYmUgY29uZmlndXJhYmxlXG4gICAgICBpZiAoKCFyZXF1ZXN0LnN0YXJ0c1dpdGgoJy4nKSAmJiByZXF1ZXN0ICE9PSBjb25maWcuZW50cnkgJiZcbiAgICAgICAgIS9bPyFdLy50ZXN0KHJlcXVlc3QpICYmXG4gICAgICAgICEvW1xcXFwvXUBiYWJlbFtcXFxcL10vLnRlc3QocmVxdWVzdCkpIHx8IHJlcXVlc3QuaW5kZXhPZignL2JrbGliLm1pbicpID49IDApIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2V4dGVybmFsIHJlcXVlc3Q6JywgcmVxdWVzdCwgYCgke2NvbnRleHR9KWApO1xuICAgICAgICByZXFTZXQuYWRkKHJlcXVlc3QpO1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgJ2NvbW1vbmpzICcgKyByZXF1ZXN0KTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuICApO1xuXG4gIGNvbmZpZy5wbHVnaW5zIS5wdXNoKFxuICAgIC8vIG5ldyBFc21XZWJwYWNrUGx1Z2luKCksXG4gICAgbmV3IChjbGFzcyB7XG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgZm9ya1RzYyhwa0pzb24ubmFtZSk7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdjcmEtc2NyaXB0cycsIHN0YXRzID0+IHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXh0ZXJuYWwgcmVxdWVzdDpcXG4gICcsIEFycmF5LmZyb20ocmVxU2V0LnZhbHVlcygpKS5qb2luKCcsICcpKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkoKVxuICApO1xufVxuXG5cbmZ1bmN0aW9uIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIC8vIFRPRE86IGNoZWNrIGluIGNhc2UgQ1JBIHdpbGwgdXNlIFJ1bGUudXNlIGluc3RlYWQgb2YgXCJsb2FkZXJcIlxuICBjaGVja1NldChydWxlcyk7XG4gIGZvciAoY29uc3QgcnVsZSBvZiBydWxlcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHJ1bGUudXNlKSkge1xuICAgICAgY2hlY2tTZXQocnVsZS51c2UpO1xuXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJ1bGUubG9hZGVyKSkge1xuICAgICAgICBjaGVja1NldChydWxlLmxvYWRlcik7XG4gICAgfSBlbHNlIGlmIChydWxlLm9uZU9mKSB7XG4gICAgICByZXR1cm4gZmluZEFuZENoYW5nZVJ1bGUocnVsZS5vbmVPZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tTZXQoc2V0OiAoUnVsZVNldFJ1bGUgfCBSdWxlU2V0VXNlSXRlbSlbXSkge1xuICAgIGNvbnN0IGZvdW5kID0gc2V0LmZpbmRJbmRleChcbiAgICAgIHVzZSA9PiAodXNlIGFzIGFueSkubG9hZGVyICYmICh1c2UgYXMgYW55KS5sb2FkZXIuaW5kZXhPZihNaW5pQ3NzRXh0cmFjdFBsdWdpbi5sb2FkZXIpID49IDApO1xuICAgIC8vIGNvbnN0IGZvdW5kID0gcnVsZS51c2UuZmluZEluZGV4KHVzZSA9PiAodXNlIGFzIGFueSkubG9hZGVyICYmICh1c2UgYXMgYW55KS5sb2FkZXIuaW5kZXhPZignbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSA+PSAwKTtcbiAgICBpZiAoZm91bmQgPj0gMCkge1xuICAgICAgc2V0LnNwbGljZShmb3VuZCwgMSk7XG4gICAgICBzZXQudW5zaGlmdChyZXF1aXJlLnJlc29sdmUoJ3N0eWxlLWxvYWRlcicpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuO1xufVxuXG5mdW5jdGlvbiBmb3JrVHNjKHRhcmdldFBhY2thZ2U6IHN0cmluZykge1xuICBjb25zdCBkcmNwSG9tZSA9IGZpbmREcmNwUHJvamVjdERpcigpO1xuXG4gIGNvbnN0IGV4ZWNBcmd2ID0gQXJyYXkuZnJvbShwcm9jZXNzLmV4ZWNBcmd2KTtcbiAgbGV0IGV4ZWNBcmd2Um1Qb3MgPSBleGVjQXJndi5pbmRleE9mKCctcicpO1xuICBleGVjQXJndlJtUG9zID0gKGV4ZWNBcmd2Um1Qb3MgPj0gMCkgPyBleGVjQXJndlJtUG9zIDogZXhlY0FyZ3YuaW5kZXhPZignLS1yZXF1aXJlJyk7XG4gIGlmIChleGVjQXJndlJtUG9zID49IDAgJiYgZXhlY0FyZ3ZbZXhlY0FyZ3ZSbVBvcyArIDFdID09PSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS5uYW1lKSB7XG4gICAgZXhlY0FyZ3Yuc3BsaWNlKGV4ZWNBcmd2Um1Qb3MsIDIpO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKCdbd2VicGFjay1saWJdICcgKyBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnYnVpbGQtbGliJywgJ2RyY3AtdHNjLmpzJyksIGRyY3BIb21lKTtcbiAgY29uc3QgY3AgPSBjaGlsZFByb2MuZm9yayhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnYnVpbGQtbGliJywgJ2RyY3AtdHNjLmpzJyksXG4gICAgW3RhcmdldFBhY2thZ2VdLCB7XG4gICAgICBjd2Q6IGRyY3BIb21lLFxuICAgICAgZXhlY0FyZ3YsXG4gICAgICBzdGRpbzogJ2luaGVyaXQnXG4gICAgfSk7XG4gIC8vIGNwLnVucmVmKCk7XG4gIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgY3Aub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICByZWoobmV3IEVycm9yKGBGYWlsZWQgdG8gZ2VuZXJhdGUgdHNkIGZpbGVzLCBkdWUgdG8gcHJvY2VzcyBleGl0IHdpdGggY29kZTogJHtjb2RlfSAke3NpZ25hbH1gKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ1t3ZWJwYWNrLWxpYl0gdHNjIGRvbmUnKTtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgfSk7XG5cbiAgfSk7XG59XG4iXX0=
