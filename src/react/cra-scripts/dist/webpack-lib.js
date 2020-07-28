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
    debugger;
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
    const forkArgs = [targetPackage];
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay1saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsK0RBQWtEO0FBQ2xELDBFQUFzQztBQUN0Qyw2QkFBNkI7QUFDN0Isd0RBQXdCO0FBQ3hCLG1DQUEyQztBQUMzQyx5Q0FBOEM7QUFDOUMsc0RBQXNEO0FBQ3RELG1FQUFtRTtBQUNuRSxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHNDQUFzQyxDQUFDLENBQUMsQ0FBQztBQUUzRixTQUF3QixNQUFNLENBQUMsWUFBb0IsRUFBRSxNQUFxQjtJQUN4RSxRQUFRLENBQUM7SUFDVCxNQUFNLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFDLEdBQUcsaUNBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUVwRSxNQUFNLENBQUMsS0FBSyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBRXBELE1BQU0sQ0FBQyxNQUFPLENBQUMsSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsa0ZBQWtGO0lBQ3RJLE1BQU0sQ0FBQyxNQUFPLENBQUMsUUFBUSxHQUFHLGVBQWUsQ0FBQztJQUMxQyxNQUFNLENBQUMsTUFBTyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDckMsTUFBTSxDQUFDLFlBQWEsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO0lBQzFDLElBQUksTUFBTSxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRTtRQUMxRCxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsR0FBRztZQUNoQyxXQUFXLEVBQUUsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFDO1NBQzlCLENBQUM7S0FDSDtJQUVELDJCQUEyQjtJQUUzQixNQUFNLHFC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RSxHQUFHLENBQUMsRUFBRTtZQUNuQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC93ZWJwYWNrLWxpYi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q29uZmlndXJhdGlvbiwgQ29tcGlsZXIsIFJ1bGVTZXRSdWxlLCBSdWxlU2V0VXNlSXRlbX0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuaW1wb3J0IGNoaWxkUHJvYyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbi8vIGltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7ZmluZERyY3BQcm9qZWN0RGlyfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGdldENtZE9wdGlvbnMgfSBmcm9tICcuLi9kaXN0L3V0aWxzJztcbi8vIGltcG9ydCB7SG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW59IGZyb20gJ3dlYnBhY2snO1xuLy8gY29uc3QgRXNtV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoXCJAcHVydHVnYS9lc20td2VicGFjay1wbHVnaW5cIik7XG5jb25zdCBNaW5pQ3NzRXh0cmFjdFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNoYW5nZShidWlsZFBhY2thZ2U6IHN0cmluZywgY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG4gIGRlYnVnZ2VyO1xuICBjb25zdCB7ZGlyOiBwa0RpciwgcGFja2FnZUpzb246IHBrSnNvbn0gPSBmaW5kUGFja2FnZShidWlsZFBhY2thZ2UpO1xuXG4gIGNvbmZpZy5lbnRyeSA9IFBhdGgucmVzb2x2ZShwa0RpciwgJ3B1YmxpY19hcGkudHMnKTtcblxuICBjb25maWcub3V0cHV0IS5wYXRoID0gUGF0aC5yZXNvbHZlKHBrRGlyLCAnYnVpbGQnKTsgLy8gSGF2ZSB0byBvdmVycmlkZSBpdCBjdXonIHJlYWN0LXNjcmlwdHMgYXNzaWduIGB1bmRlZmluZWRgIGluIG5vbi1wcm9kdWN0aW9uIGVudlxuICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdsaWItYnVuZGxlLmpzJztcbiAgY29uZmlnLm91dHB1dCEubGlicmFyeVRhcmdldCA9ICd1bWQnO1xuICBjb25maWcub3B0aW1pemF0aW9uIS5ydW50aW1lQ2h1bmsgPSBmYWxzZTtcbiAgaWYgKGNvbmZpZy5vcHRpbWl6YXRpb24gJiYgY29uZmlnLm9wdGltaXphdGlvbi5zcGxpdENodW5rcykge1xuICAgIGNvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MgPSB7XG4gICAgICBjYWNoZUdyb3Vwczoge2RlZmF1bHQ6IGZhbHNlfVxuICAgIH07XG4gIH1cblxuICAvLyAtLS0tIFBsdWdpbnMgZmlsdGVyIC0tLS1cblxuICBjb25zdCBJbmxpbmVDaHVua0h0bWxQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9JbmxpbmVDaHVua0h0bWxQbHVnaW4nKSk7XG4gIGNvbnN0IEludGVycG9sYXRlSHRtbFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL0ludGVycG9sYXRlSHRtbFBsdWdpbicpKTtcbiAgY29uc3QgRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9Gb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbicpKTtcbiAgY29uc3QgSHRtbFdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL2h0bWwtd2VicGFjay1wbHVnaW4nKSk7XG4gIGNvbnN0IHtIb3RNb2R1bGVSZXBsYWNlbWVudFBsdWdpbn0gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3dlYnBhY2snKSk7XG5cbiAgY29uZmlnLnBsdWdpbnMgPSBjb25maWcucGx1Z2lucyEuZmlsdGVyKHBsdWdpbiA9PiB7XG5cbiAgICByZXR1cm4gW01pbmlDc3NFeHRyYWN0UGx1Z2luLFxuICAgICAgRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4sXG4gICAgICBJbmxpbmVDaHVua0h0bWxQbHVnaW4sXG4gICAgICBIb3RNb2R1bGVSZXBsYWNlbWVudFBsdWdpbixcbiAgICAgIEh0bWxXZWJwYWNrUGx1Z2luLFxuICAgICAgSW50ZXJwb2xhdGVIdG1sUGx1Z2luXS5ldmVyeShjbHMgPT4gIShwbHVnaW4gaW5zdGFuY2VvZiBjbHMpKTtcbiAgfSk7XG5cbiAgZmluZEFuZENoYW5nZVJ1bGUoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuXG5cbiAgY29uc3QgcmVxU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgaWYgKGNvbmZpZy5leHRlcm5hbHMgPT0gbnVsbClcbiAgICBjb25maWcuZXh0ZXJuYWxzID0gW107XG4gIChjb25maWcuZXh0ZXJuYWxzIGFzIEV4dHJhY3Q8Q29uZmlndXJhdGlvblsnZXh0ZXJuYWxzJ10sIEFycmF5PGFueT4+KVxuICAucHVzaChcbiAgICAoY29udGV4dDogYW55LCByZXF1ZXN0OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I/OiBhbnksIHJlc3VsdD86IGFueSkgPT4gdm9pZCApID0+IHtcbiAgICAgIC8vIFRPRE86IFNob3VsZCBiZSBjb25maWd1cmFibGVcbiAgICAgIGlmICgoIXJlcXVlc3Quc3RhcnRzV2l0aCgnLicpICYmIHJlcXVlc3QgIT09IGNvbmZpZy5lbnRyeSAmJlxuICAgICAgICAhL1s/IV0vLnRlc3QocmVxdWVzdCkpICYmICghL1tcXFxcL11AYmFiZWxbXFxcXC9dcnVudGltZVtcXFxcL10vLnRlc3QocmVxdWVzdCkpXG4gICAgICAgICB8fFxuICAgICAgICByZXF1ZXN0LmluZGV4T2YoJy9ia2xpYi5taW4nKSA+PSAwKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdleHRlcm5hbCByZXF1ZXN0OicsIHJlcXVlc3QsIGAoJHtjb250ZXh0fSlgKTtcbiAgICAgICAgcmVxU2V0LmFkZChyZXF1ZXN0KTtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsICdjb21tb25qcyAnICsgcmVxdWVzdCk7XG4gICAgICB9XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgKTtcblxuICBjb25maWcucGx1Z2lucyEucHVzaChcbiAgICAvLyBuZXcgRXNtV2VicGFja1BsdWdpbigpLFxuICAgIG5ldyAoY2xhc3Mge1xuICAgICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICAgIGZvcmtUc2MocGtKc29uLm5hbWUpO1xuICAgICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcCgnY3JhLXNjcmlwdHMnLCBzdGF0cyA9PiB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coJ2V4dGVybmFsIHJlcXVlc3Q6XFxuICAnLCBBcnJheS5mcm9tKHJlcVNldC52YWx1ZXMoKSkuam9pbignLCAnKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pKClcbiAgKTtcbn1cblxuXG5mdW5jdGlvbiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlczogUnVsZVNldFJ1bGVbXSk6IHZvaWQge1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcmV0dXJuIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBjb25zdCBmb3VuZCA9IHNldC5maW5kSW5kZXgoXG4gICAgICB1c2UgPT4gKHVzZSBhcyBhbnkpLmxvYWRlciAmJiAodXNlIGFzIGFueSkubG9hZGVyLmluZGV4T2YoTWluaUNzc0V4dHJhY3RQbHVnaW4ubG9hZGVyKSA+PSAwKTtcbiAgICAvLyBjb25zdCBmb3VuZCA9IHJ1bGUudXNlLmZpbmRJbmRleCh1c2UgPT4gKHVzZSBhcyBhbnkpLmxvYWRlciAmJiAodXNlIGFzIGFueSkubG9hZGVyLmluZGV4T2YoJ21pbmktY3NzLWV4dHJhY3QtcGx1Z2luJykgPj0gMCk7XG4gICAgaWYgKGZvdW5kID49IDApIHtcbiAgICAgIHNldC5zcGxpY2UoZm91bmQsIDEpO1xuICAgICAgc2V0LnVuc2hpZnQocmVxdWlyZS5yZXNvbHZlKCdzdHlsZS1sb2FkZXInKSk7XG4gICAgfVxuICB9XG4gIHJldHVybjtcbn1cblxuZnVuY3Rpb24gZm9ya1RzYyh0YXJnZXRQYWNrYWdlOiBzdHJpbmcpIHtcbiAgY29uc3QgZHJjcEhvbWUgPSBmaW5kRHJjcFByb2plY3REaXIoKTtcblxuICBjb25zdCBleGVjQXJndiA9IEFycmF5LmZyb20ocHJvY2Vzcy5leGVjQXJndik7XG4gIGxldCBleGVjQXJndlJtUG9zID0gZXhlY0FyZ3YuaW5kZXhPZignLXInKTtcbiAgZXhlY0FyZ3ZSbVBvcyA9IChleGVjQXJndlJtUG9zID49IDApID8gZXhlY0FyZ3ZSbVBvcyA6IGV4ZWNBcmd2LmluZGV4T2YoJy0tcmVxdWlyZScpO1xuICBpZiAoZXhlY0FyZ3ZSbVBvcyA+PSAwICYmIGV4ZWNBcmd2W2V4ZWNBcmd2Um1Qb3MgKyAxXSA9PT0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJykubmFtZSkge1xuICAgIGV4ZWNBcmd2LnNwbGljZShleGVjQXJndlJtUG9zLCAyKTtcbiAgfVxuICAvLyBjb25zb2xlLmxvZygnW3dlYnBhY2stbGliXSAnICsgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2J1aWxkLWxpYicsICdkcmNwLXRzYy5qcycpLCBkcmNwSG9tZSk7XG5cbiAgY29uc3QgZm9ya0FyZ3MgPSBbdGFyZ2V0UGFja2FnZV07XG4gIGlmIChnZXRDbWRPcHRpb25zKCkud2F0Y2gpXG4gICAgZm9ya0FyZ3MucHVzaCgnLS13YXRjaCcpO1xuXG4gIGNvbnN0IGNwID0gY2hpbGRQcm9jLmZvcmsoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2J1aWxkLWxpYicsICdkcmNwLXRzYy5qcycpLFxuICAgIGZvcmtBcmdzLCB7XG4gICAgICBjd2Q6IGRyY3BIb21lLFxuICAgICAgZXhlY0FyZ3YsXG4gICAgICBzdGRpbzogJ2luaGVyaXQnXG4gICAgfSk7XG4gIC8vIGNwLnVucmVmKCk7XG4gIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgY3Aub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICByZWoobmV3IEVycm9yKGBGYWlsZWQgdG8gZ2VuZXJhdGUgdHNkIGZpbGVzLCBkdWUgdG8gcHJvY2VzcyBleGl0IHdpdGggY29kZTogJHtjb2RlfSAke3NpZ25hbH1gKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ1t3ZWJwYWNrLWxpYl0gdHNjIGRvbmUnKTtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgfSk7XG5cbiAgfSk7XG59XG4iXX0=
