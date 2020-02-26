"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const build_target_helper_1 = require("./build-target-helper");
const child_process_1 = tslib_1.__importDefault(require("child_process"));
// import fs from 'fs-extra';
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("./utils");
const utils_2 = require("../dist/utils");
// import {HotModuleReplacementPlugin} from 'webpack';
// const EsmWebpackPlugin = require("@purtuga/esm-webpack-plugin");
const MiniCssExtractPlugin = require(path_1.default.resolve('node_modules/mini-css-extract-plugin'));
function change(buildPackage, config) {
    const { dir: pkDir, packageJson: pkJson } = build_target_helper_1.findPackage(buildPackage);
    config.entry = path_1.default.resolve(pkDir, 'public_api.ts');
    config.output.path = path_1.default.resolve(pkDir, 'build'); // Have to override it cuz' react-scripts assign `undefined` in non-production env
    config.output.filename = 'lib-bundle.js';
    config.output.libraryTarget = 'umd';
    config.optimization.runtimeChunk = false;
    if (config.optimization && config.optimization.splitChunks) {
        config.optimization.splitChunks = {
            cacheGroups: { default: false }
        };
    }
    // ---- Plugins filter ----
    const InlineChunkHtmlPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/InlineChunkHtmlPlugin'));
    const InterpolateHtmlPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/InterpolateHtmlPlugin'));
    const ForkTsCheckerWebpackPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/ForkTsCheckerWebpackPlugin'));
    const HtmlWebpackPlugin = require(path_1.default.resolve('node_modules/html-webpack-plugin'));
    const { HotModuleReplacementPlugin } = require(path_1.default.resolve('node_modules/webpack'));
    config.plugins = config.plugins.filter(plugin => {
        return [MiniCssExtractPlugin,
            ForkTsCheckerWebpackPlugin,
            InlineChunkHtmlPlugin,
            HotModuleReplacementPlugin,
            HtmlWebpackPlugin,
            InterpolateHtmlPlugin].every(cls => !(plugin instanceof cls));
    });
    findAndChangeRule(config.module.rules);
    const reqSet = new Set();
    if (config.externals == null)
        config.externals = [];
    config.externals
        .push((context, request, callback) => {
        // TODO: Should be configurable
        if ((!request.startsWith('.') && request !== config.entry &&
            !/[?!]/.test(request)) && (!/[\\/]@babel[\\/]runtime[\\/]/.test(request))
            ||
                request.indexOf('/bklib.min') >= 0) {
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
    const forkArgs = [targetPackage, '--jsx'];
    if (utils_2.getCmdOptions().watch)
        forkArgs.push('--watch');
    const cp = child_process_1.default.fork(path_1.default.resolve(__dirname, 'build-lib', 'drcp-tsc.js'), forkArgs, {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay1saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsK0RBQWtEO0FBQ2xELDBFQUFzQztBQUN0Qyw2QkFBNkI7QUFDN0Isd0RBQXdCO0FBQ3hCLG1DQUEyQztBQUMzQyx5Q0FBOEM7QUFDOUMsc0RBQXNEO0FBQ3RELG1FQUFtRTtBQUNuRSxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHNDQUFzQyxDQUFDLENBQUMsQ0FBQztBQUUzRixTQUF3QixNQUFNLENBQUMsWUFBb0IsRUFBRSxNQUFxQjtJQUV4RSxNQUFNLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFDLEdBQUcsaUNBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUVwRSxNQUFNLENBQUMsS0FBSyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBRXBELE1BQU0sQ0FBQyxNQUFPLENBQUMsSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsa0ZBQWtGO0lBQ3RJLE1BQU0sQ0FBQyxNQUFPLENBQUMsUUFBUSxHQUFHLGVBQWUsQ0FBQztJQUMxQyxNQUFNLENBQUMsTUFBTyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDckMsTUFBTSxDQUFDLFlBQWEsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO0lBQzFDLElBQUksTUFBTSxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRTtRQUMxRCxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsR0FBRztZQUNoQyxXQUFXLEVBQUUsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFDO1NBQzlCLENBQUM7S0FDSDtJQUVELDJCQUEyQjtJQUUzQixNQUFNLHFCQUFxQixHQUFHLE9BQU8s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RyxDQUFDLEVBQUU7WUFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztJQUVMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3Qvd2VicGFjay1saWIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NvbmZpZ3VyYXRpb24sIENvbXBpbGVyLCBSdWxlU2V0UnVsZSwgUnVsZVNldFVzZUl0ZW19IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtmaW5kUGFja2FnZX0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbmltcG9ydCBjaGlsZFByb2MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBpbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2ZpbmREcmNwUHJvamVjdERpcn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBnZXRDbWRPcHRpb25zIH0gZnJvbSAnLi4vZGlzdC91dGlscyc7XG4vLyBpbXBvcnQge0hvdE1vZHVsZVJlcGxhY2VtZW50UGx1Z2lufSBmcm9tICd3ZWJwYWNrJztcbi8vIGNvbnN0IEVzbVdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKFwiQHB1cnR1Z2EvZXNtLXdlYnBhY2stcGx1Z2luXCIpO1xuY29uc3QgTWluaUNzc0V4dHJhY3RQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL21pbmktY3NzLWV4dHJhY3QtcGx1Z2luJykpO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjaGFuZ2UoYnVpbGRQYWNrYWdlOiBzdHJpbmcsIGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuXG4gIGNvbnN0IHtkaXI6IHBrRGlyLCBwYWNrYWdlSnNvbjogcGtKc29ufSA9IGZpbmRQYWNrYWdlKGJ1aWxkUGFja2FnZSk7XG5cbiAgY29uZmlnLmVudHJ5ID0gUGF0aC5yZXNvbHZlKHBrRGlyLCAncHVibGljX2FwaS50cycpO1xuXG4gIGNvbmZpZy5vdXRwdXQhLnBhdGggPSBQYXRoLnJlc29sdmUocGtEaXIsICdidWlsZCcpOyAvLyBIYXZlIHRvIG92ZXJyaWRlIGl0IGN1eicgcmVhY3Qtc2NyaXB0cyBhc3NpZ24gYHVuZGVmaW5lZGAgaW4gbm9uLXByb2R1Y3Rpb24gZW52XG4gIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ2xpYi1idW5kbGUuanMnO1xuICBjb25maWcub3V0cHV0IS5saWJyYXJ5VGFyZ2V0ID0gJ3VtZCc7XG4gIGNvbmZpZy5vcHRpbWl6YXRpb24hLnJ1bnRpbWVDaHVuayA9IGZhbHNlO1xuICBpZiAoY29uZmlnLm9wdGltaXphdGlvbiAmJiBjb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzKSB7XG4gICAgY29uZmlnLm9wdGltaXphdGlvbi5zcGxpdENodW5rcyA9IHtcbiAgICAgIGNhY2hlR3JvdXBzOiB7ZGVmYXVsdDogZmFsc2V9XG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tLS0gUGx1Z2lucyBmaWx0ZXIgLS0tLVxuXG4gIGNvbnN0IElubGluZUNodW5rSHRtbFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL0lubGluZUNodW5rSHRtbFBsdWdpbicpKTtcbiAgY29uc3QgSW50ZXJwb2xhdGVIdG1sUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvSW50ZXJwb2xhdGVIdG1sUGx1Z2luJykpO1xuICBjb25zdCBGb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL0ZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luJykpO1xuICBjb25zdCBIdG1sV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvaHRtbC13ZWJwYWNrLXBsdWdpbicpKTtcbiAgY29uc3Qge0hvdE1vZHVsZVJlcGxhY2VtZW50UGx1Z2lufSA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvd2VicGFjaycpKTtcblxuICBjb25maWcucGx1Z2lucyA9IGNvbmZpZy5wbHVnaW5zIS5maWx0ZXIocGx1Z2luID0+IHtcblxuICAgIHJldHVybiBbTWluaUNzc0V4dHJhY3RQbHVnaW4sXG4gICAgICBGb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbixcbiAgICAgIElubGluZUNodW5rSHRtbFBsdWdpbixcbiAgICAgIEhvdE1vZHVsZVJlcGxhY2VtZW50UGx1Z2luLFxuICAgICAgSHRtbFdlYnBhY2tQbHVnaW4sXG4gICAgICBJbnRlcnBvbGF0ZUh0bWxQbHVnaW5dLmV2ZXJ5KGNscyA9PiAhKHBsdWdpbiBpbnN0YW5jZW9mIGNscykpO1xuICB9KTtcblxuICBmaW5kQW5kQ2hhbmdlUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG5cblxuICBjb25zdCByZXFTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBpZiAoY29uZmlnLmV4dGVybmFscyA9PSBudWxsKVxuICAgIGNvbmZpZy5leHRlcm5hbHMgPSBbXTtcbiAgKGNvbmZpZy5leHRlcm5hbHMgYXMgRXh0cmFjdDxDb25maWd1cmF0aW9uWydleHRlcm5hbHMnXSwgQXJyYXk8YW55Pj4pXG4gIC5wdXNoKFxuICAgIChjb250ZXh0OiBhbnksIHJlcXVlc3Q6IGFueSwgY2FsbGJhY2s6IChlcnJvcj86IGFueSwgcmVzdWx0PzogYW55KSA9PiB2b2lkICkgPT4ge1xuICAgICAgLy8gVE9ETzogU2hvdWxkIGJlIGNvbmZpZ3VyYWJsZVxuICAgICAgaWYgKCghcmVxdWVzdC5zdGFydHNXaXRoKCcuJykgJiYgcmVxdWVzdCAhPT0gY29uZmlnLmVudHJ5ICYmXG4gICAgICAgICEvWz8hXS8udGVzdChyZXF1ZXN0KSkgJiYgKCEvW1xcXFwvXUBiYWJlbFtcXFxcL11ydW50aW1lW1xcXFwvXS8udGVzdChyZXF1ZXN0KSlcbiAgICAgICAgIHx8XG4gICAgICAgIHJlcXVlc3QuaW5kZXhPZignL2JrbGliLm1pbicpID49IDApIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2V4dGVybmFsIHJlcXVlc3Q6JywgcmVxdWVzdCwgYCgke2NvbnRleHR9KWApO1xuICAgICAgICByZXFTZXQuYWRkKHJlcXVlc3QpO1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgJ2NvbW1vbmpzICcgKyByZXF1ZXN0KTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuICApO1xuXG4gIGNvbmZpZy5wbHVnaW5zIS5wdXNoKFxuICAgIC8vIG5ldyBFc21XZWJwYWNrUGx1Z2luKCksXG4gICAgbmV3IChjbGFzcyB7XG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgZm9ya1RzYyhwa0pzb24ubmFtZSk7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdjcmEtc2NyaXB0cycsIHN0YXRzID0+IHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXh0ZXJuYWwgcmVxdWVzdDpcXG4gICcsIEFycmF5LmZyb20ocmVxU2V0LnZhbHVlcygpKS5qb2luKCcsICcpKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkoKVxuICApO1xufVxuXG5cbmZ1bmN0aW9uIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIC8vIFRPRE86IGNoZWNrIGluIGNhc2UgQ1JBIHdpbGwgdXNlIFJ1bGUudXNlIGluc3RlYWQgb2YgXCJsb2FkZXJcIlxuICBjaGVja1NldChydWxlcyk7XG4gIGZvciAoY29uc3QgcnVsZSBvZiBydWxlcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHJ1bGUudXNlKSkge1xuICAgICAgY2hlY2tTZXQocnVsZS51c2UpO1xuXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJ1bGUubG9hZGVyKSkge1xuICAgICAgICBjaGVja1NldChydWxlLmxvYWRlcik7XG4gICAgfSBlbHNlIGlmIChydWxlLm9uZU9mKSB7XG4gICAgICByZXR1cm4gZmluZEFuZENoYW5nZVJ1bGUocnVsZS5vbmVPZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tTZXQoc2V0OiAoUnVsZVNldFJ1bGUgfCBSdWxlU2V0VXNlSXRlbSlbXSkge1xuICAgIGNvbnN0IGZvdW5kID0gc2V0LmZpbmRJbmRleChcbiAgICAgIHVzZSA9PiAodXNlIGFzIGFueSkubG9hZGVyICYmICh1c2UgYXMgYW55KS5sb2FkZXIuaW5kZXhPZihNaW5pQ3NzRXh0cmFjdFBsdWdpbi5sb2FkZXIpID49IDApO1xuICAgIC8vIGNvbnN0IGZvdW5kID0gcnVsZS51c2UuZmluZEluZGV4KHVzZSA9PiAodXNlIGFzIGFueSkubG9hZGVyICYmICh1c2UgYXMgYW55KS5sb2FkZXIuaW5kZXhPZignbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSA+PSAwKTtcbiAgICBpZiAoZm91bmQgPj0gMCkge1xuICAgICAgc2V0LnNwbGljZShmb3VuZCwgMSk7XG4gICAgICBzZXQudW5zaGlmdChyZXF1aXJlLnJlc29sdmUoJ3N0eWxlLWxvYWRlcicpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuO1xufVxuXG5mdW5jdGlvbiBmb3JrVHNjKHRhcmdldFBhY2thZ2U6IHN0cmluZykge1xuICBjb25zdCBkcmNwSG9tZSA9IGZpbmREcmNwUHJvamVjdERpcigpO1xuXG4gIGNvbnN0IGV4ZWNBcmd2ID0gQXJyYXkuZnJvbShwcm9jZXNzLmV4ZWNBcmd2KTtcbiAgbGV0IGV4ZWNBcmd2Um1Qb3MgPSBleGVjQXJndi5pbmRleE9mKCctcicpO1xuICBleGVjQXJndlJtUG9zID0gKGV4ZWNBcmd2Um1Qb3MgPj0gMCkgPyBleGVjQXJndlJtUG9zIDogZXhlY0FyZ3YuaW5kZXhPZignLS1yZXF1aXJlJyk7XG4gIGlmIChleGVjQXJndlJtUG9zID49IDAgJiYgZXhlY0FyZ3ZbZXhlY0FyZ3ZSbVBvcyArIDFdID09PSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS5uYW1lKSB7XG4gICAgZXhlY0FyZ3Yuc3BsaWNlKGV4ZWNBcmd2Um1Qb3MsIDIpO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKCdbd2VicGFjay1saWJdICcgKyBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnYnVpbGQtbGliJywgJ2RyY3AtdHNjLmpzJyksIGRyY3BIb21lKTtcblxuICBjb25zdCBmb3JrQXJncyA9IFt0YXJnZXRQYWNrYWdlLCAnLS1qc3gnXTtcbiAgaWYgKGdldENtZE9wdGlvbnMoKS53YXRjaClcbiAgICBmb3JrQXJncy5wdXNoKCctLXdhdGNoJyk7XG5cbiAgY29uc3QgY3AgPSBjaGlsZFByb2MuZm9yayhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnYnVpbGQtbGliJywgJ2RyY3AtdHNjLmpzJyksXG4gICAgZm9ya0FyZ3MsIHtcbiAgICAgIGN3ZDogZHJjcEhvbWUsXG4gICAgICBleGVjQXJndixcbiAgICAgIHN0ZGlvOiAnaW5oZXJpdCdcbiAgICB9KTtcbiAgLy8gY3AudW5yZWYoKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICBjcC5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgIHJlaihuZXcgRXJyb3IoYEZhaWxlZCB0byBnZW5lcmF0ZSB0c2QgZmlsZXMsIGR1ZSB0byBwcm9jZXNzIGV4aXQgd2l0aCBjb2RlOiAke2NvZGV9ICR7c2lnbmFsfWApKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnW3dlYnBhY2stbGliXSB0c2MgZG9uZScpO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY3Aub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICB9KTtcblxuICB9KTtcbn1cbiJdfQ==
