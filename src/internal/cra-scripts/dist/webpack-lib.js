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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay1saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsK0RBQWtEO0FBQ2xELDBFQUFzQztBQUN0Qyw2QkFBNkI7QUFDN0Isd0RBQXdCO0FBQ3hCLG1DQUEyQztBQUMzQyx5Q0FBOEM7QUFDOUMsc0RBQXNEO0FBQ3RELG1FQUFtRTtBQUNuRSxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHNDQUFzQyxDQUFDLENBQUMsQ0FBQztBQUUzRixTQUF3QixNQUFNLENBQUMsWUFBb0IsRUFBRSxNQUFxQjtJQUV4RSxNQUFNLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFDLEdBQUcsaUNBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUVwRSxNQUFNLENBQUMsS0FBSyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBRXBELE1BQU0sQ0FBQyxNQUFPLENBQUMsSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsa0ZBQWtGO0lBQ3RJLE1BQU0sQ0FBQyxNQUFPLENBQUMsUUFBUSxHQUFHLGVBQWUsQ0FBQztJQUMxQyxNQUFNLENBQUMsTUFBTyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDckMsTUFBTSxDQUFDLFlBQWEsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO0lBQzFDLElBQUksTUFBTSxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRTtRQUMxRCxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsR0FBRztZQUNoQyxXQUFXLEVBQUUsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFDO1NBQzlCLENBQUM7S0FDSDtJQUVELDJCQUEyQjtJQUUzQixNQUFNLHFCQUFxQixHQUFHLE9BQU8s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RTtZQUNuQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC93ZWJwYWNrLWxpYi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q29uZmlndXJhdGlvbiwgQ29tcGlsZXIsIFJ1bGVTZXRSdWxlLCBSdWxlU2V0VXNlSXRlbX0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuaW1wb3J0IGNoaWxkUHJvYyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbi8vIGltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7ZmluZERyY3BQcm9qZWN0RGlyfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGdldENtZE9wdGlvbnMgfSBmcm9tICcuLi9kaXN0L3V0aWxzJztcbi8vIGltcG9ydCB7SG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW59IGZyb20gJ3dlYnBhY2snO1xuLy8gY29uc3QgRXNtV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoXCJAcHVydHVnYS9lc20td2VicGFjay1wbHVnaW5cIik7XG5jb25zdCBNaW5pQ3NzRXh0cmFjdFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNoYW5nZShidWlsZFBhY2thZ2U6IHN0cmluZywgY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG5cbiAgY29uc3Qge2RpcjogcGtEaXIsIHBhY2thZ2VKc29uOiBwa0pzb259ID0gZmluZFBhY2thZ2UoYnVpbGRQYWNrYWdlKTtcblxuICBjb25maWcuZW50cnkgPSBQYXRoLnJlc29sdmUocGtEaXIsICdwdWJsaWNfYXBpLnRzJyk7XG5cbiAgY29uZmlnLm91dHB1dCEucGF0aCA9IFBhdGgucmVzb2x2ZShwa0RpciwgJ2J1aWxkJyk7IC8vIEhhdmUgdG8gb3ZlcnJpZGUgaXQgY3V6JyByZWFjdC1zY3JpcHRzIGFzc2lnbiBgdW5kZWZpbmVkYCBpbiBub24tcHJvZHVjdGlvbiBlbnZcbiAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnbGliLWJ1bmRsZS5qcyc7XG4gIGNvbmZpZy5vdXRwdXQhLmxpYnJhcnlUYXJnZXQgPSAndW1kJztcbiAgY29uZmlnLm9wdGltaXphdGlvbiEucnVudGltZUNodW5rID0gZmFsc2U7XG4gIGlmIChjb25maWcub3B0aW1pemF0aW9uICYmIGNvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MpIHtcbiAgICBjb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzID0ge1xuICAgICAgY2FjaGVHcm91cHM6IHtkZWZhdWx0OiBmYWxzZX1cbiAgICB9O1xuICB9XG5cbiAgLy8gLS0tLSBQbHVnaW5zIGZpbHRlciAtLS0tXG5cbiAgY29uc3QgSW5saW5lQ2h1bmtIdG1sUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvSW5saW5lQ2h1bmtIdG1sUGx1Z2luJykpO1xuICBjb25zdCBJbnRlcnBvbGF0ZUh0bWxQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9JbnRlcnBvbGF0ZUh0bWxQbHVnaW4nKSk7XG4gIGNvbnN0IEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4nKSk7XG4gIGNvbnN0IEh0bWxXZWJwYWNrUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9odG1sLXdlYnBhY2stcGx1Z2luJykpO1xuICBjb25zdCB7SG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW59ID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy93ZWJwYWNrJykpO1xuXG4gIGNvbmZpZy5wbHVnaW5zID0gY29uZmlnLnBsdWdpbnMhLmZpbHRlcihwbHVnaW4gPT4ge1xuXG4gICAgcmV0dXJuIFtNaW5pQ3NzRXh0cmFjdFBsdWdpbixcbiAgICAgIEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luLFxuICAgICAgSW5saW5lQ2h1bmtIdG1sUGx1Z2luLFxuICAgICAgSG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW4sXG4gICAgICBIdG1sV2VicGFja1BsdWdpbixcbiAgICAgIEludGVycG9sYXRlSHRtbFBsdWdpbl0uZXZlcnkoY2xzID0+ICEocGx1Z2luIGluc3RhbmNlb2YgY2xzKSk7XG4gIH0pO1xuXG4gIGZpbmRBbmRDaGFuZ2VSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcblxuXG4gIGNvbnN0IHJlcVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGlmIChjb25maWcuZXh0ZXJuYWxzID09IG51bGwpXG4gICAgY29uZmlnLmV4dGVybmFscyA9IFtdO1xuICAoY29uZmlnLmV4dGVybmFscyBhcyBFeHRyYWN0PENvbmZpZ3VyYXRpb25bJ2V4dGVybmFscyddLCBBcnJheTxhbnk+PilcbiAgLnB1c2goXG4gICAgKGNvbnRleHQ6IGFueSwgcmVxdWVzdDogYW55LCBjYWxsYmFjazogKGVycm9yPzogYW55LCByZXN1bHQ/OiBhbnkpID0+IHZvaWQgKSA9PiB7XG4gICAgICAvLyBUT0RPOiBTaG91bGQgYmUgY29uZmlndXJhYmxlXG4gICAgICBpZiAoKCFyZXF1ZXN0LnN0YXJ0c1dpdGgoJy4nKSAmJiByZXF1ZXN0ICE9PSBjb25maWcuZW50cnkgJiZcbiAgICAgICAgIS9bPyFdLy50ZXN0KHJlcXVlc3QpKSAmJiAoIS9bXFxcXC9dQGJhYmVsW1xcXFwvXXJ1bnRpbWVbXFxcXC9dLy50ZXN0KHJlcXVlc3QpKVxuICAgICAgICAgfHxcbiAgICAgICAgcmVxdWVzdC5pbmRleE9mKCcvYmtsaWIubWluJykgPj0gMCkge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnZXh0ZXJuYWwgcmVxdWVzdDonLCByZXF1ZXN0LCBgKCR7Y29udGV4dH0pYCk7XG4gICAgICAgIHJlcVNldC5hZGQocmVxdWVzdCk7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCAnY29tbW9uanMgJyArIHJlcXVlc3QpO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gICk7XG5cbiAgY29uZmlnLnBsdWdpbnMhLnB1c2goXG4gICAgLy8gbmV3IEVzbVdlYnBhY2tQbHVnaW4oKSxcbiAgICBuZXcgKGNsYXNzIHtcbiAgICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgICBmb3JrVHNjKHBrSnNvbi5uYW1lKTtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXAoJ2NyYS1zY3JpcHRzJywgc3RhdHMgPT4ge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdleHRlcm5hbCByZXF1ZXN0OlxcbiAgJywgQXJyYXkuZnJvbShyZXFTZXQudmFsdWVzKCkpLmpvaW4oJywgJykpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KSgpXG4gICk7XG59XG5cblxuZnVuY3Rpb24gZmluZEFuZENoYW5nZVJ1bGUocnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgLy8gVE9ETzogY2hlY2sgaW4gY2FzZSBDUkEgd2lsbCB1c2UgUnVsZS51c2UgaW5zdGVhZCBvZiBcImxvYWRlclwiXG4gIGNoZWNrU2V0KHJ1bGVzKTtcbiAgZm9yIChjb25zdCBydWxlIG9mIHJ1bGVzKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocnVsZS51c2UpKSB7XG4gICAgICBjaGVja1NldChydWxlLnVzZSk7XG5cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocnVsZS5sb2FkZXIpKSB7XG4gICAgICAgIGNoZWNrU2V0KHJ1bGUubG9hZGVyKTtcbiAgICB9IGVsc2UgaWYgKHJ1bGUub25lT2YpIHtcbiAgICAgIHJldHVybiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlLm9uZU9mKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja1NldChzZXQ6IChSdWxlU2V0UnVsZSB8IFJ1bGVTZXRVc2VJdGVtKVtdKSB7XG4gICAgY29uc3QgZm91bmQgPSBzZXQuZmluZEluZGV4KFxuICAgICAgdXNlID0+ICh1c2UgYXMgYW55KS5sb2FkZXIgJiYgKHVzZSBhcyBhbnkpLmxvYWRlci5pbmRleE9mKE1pbmlDc3NFeHRyYWN0UGx1Z2luLmxvYWRlcikgPj0gMCk7XG4gICAgLy8gY29uc3QgZm91bmQgPSBydWxlLnVzZS5maW5kSW5kZXgodXNlID0+ICh1c2UgYXMgYW55KS5sb2FkZXIgJiYgKHVzZSBhcyBhbnkpLmxvYWRlci5pbmRleE9mKCdtaW5pLWNzcy1leHRyYWN0LXBsdWdpbicpID49IDApO1xuICAgIGlmIChmb3VuZCA+PSAwKSB7XG4gICAgICBzZXQuc3BsaWNlKGZvdW5kLCAxKTtcbiAgICAgIHNldC51bnNoaWZ0KHJlcXVpcmUucmVzb2x2ZSgnc3R5bGUtbG9hZGVyJykpO1xuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG5cbmZ1bmN0aW9uIGZvcmtUc2ModGFyZ2V0UGFja2FnZTogc3RyaW5nKSB7XG4gIGNvbnN0IGRyY3BIb21lID0gZmluZERyY3BQcm9qZWN0RGlyKCk7XG5cbiAgY29uc3QgZXhlY0FyZ3YgPSBBcnJheS5mcm9tKHByb2Nlc3MuZXhlY0FyZ3YpO1xuICBsZXQgZXhlY0FyZ3ZSbVBvcyA9IGV4ZWNBcmd2LmluZGV4T2YoJy1yJyk7XG4gIGV4ZWNBcmd2Um1Qb3MgPSAoZXhlY0FyZ3ZSbVBvcyA+PSAwKSA/IGV4ZWNBcmd2Um1Qb3MgOiBleGVjQXJndi5pbmRleE9mKCctLXJlcXVpcmUnKTtcbiAgaWYgKGV4ZWNBcmd2Um1Qb3MgPj0gMCAmJiBleGVjQXJndltleGVjQXJndlJtUG9zICsgMV0gPT09IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpLm5hbWUpIHtcbiAgICBleGVjQXJndi5zcGxpY2UoZXhlY0FyZ3ZSbVBvcywgMik7XG4gIH1cbiAgLy8gY29uc29sZS5sb2coJ1t3ZWJwYWNrLWxpYl0gJyArIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdidWlsZC1saWInLCAnZHJjcC10c2MuanMnKSwgZHJjcEhvbWUpO1xuXG4gIGNvbnN0IGZvcmtBcmdzID0gW3RhcmdldFBhY2thZ2VdO1xuICBpZiAoZ2V0Q21kT3B0aW9ucygpLndhdGNoKVxuICAgIGZvcmtBcmdzLnB1c2goJy0td2F0Y2gnKTtcblxuICBjb25zdCBjcCA9IGNoaWxkUHJvYy5mb3JrKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdidWlsZC1saWInLCAnZHJjcC10c2MuanMnKSxcbiAgICBmb3JrQXJncywge1xuICAgICAgY3dkOiBkcmNwSG9tZSxcbiAgICAgIGV4ZWNBcmd2LFxuICAgICAgc3RkaW86ICdpbmhlcml0J1xuICAgIH0pO1xuICAvLyBjcC51bnJlZigpO1xuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgIGNwLm9uKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgcmVqKG5ldyBFcnJvcihgRmFpbGVkIHRvIGdlbmVyYXRlIHRzZCBmaWxlcywgZHVlIHRvIHByb2Nlc3MgZXhpdCB3aXRoIGNvZGU6ICR7Y29kZX0gJHtzaWduYWx9YCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdbd2VicGFjay1saWJdIHRzYyBkb25lJyk7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjcC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgIH0pO1xuXG4gIH0pO1xufVxuIl19
