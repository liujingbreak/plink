"use strict";
const tslib_1 = require("tslib");
// tslint:disable:no-console
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
// import { RawSource } from 'webpack-sources';
const utils_1 = require("./utils");
const package_utils_1 = require("dr-comp-package/wfh/dist/package-utils");
const webpack_lib_1 = tslib_1.__importDefault(require("./webpack-lib"));
const build_target_helper_1 = require("./build-target-helper");
const config_handler_1 = require("dr-comp-package/wfh/dist/config-handler");
// import chalk from 'chalk';
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const findPackageByFile = package_utils_1.createLazyPackageFileFinder();
function findAndChangeRule(rules) {
    const craPaths = require('react-scripts/config/paths');
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
        for (let i = 0; i < set.length; i++) {
            const rule = set[i];
            if (typeof rule === 'string' && (rule.indexOf('file-loader') >= 0 || rule.indexOf('url-loader') >= 0)) {
                set[i] = {
                    loader: rule,
                    options: {
                        outputPath(url, resourcePath, context) {
                            const pk = findPackageByFile(resourcePath);
                            return `${(pk ? pk.shortName : 'external')}/${url}`;
                        }
                    }
                };
            }
            else if ((typeof rule.loader) === 'string' &&
                (rule.loader.indexOf('file-loader') >= 0 ||
                    rule.loader.indexOf('url-loader') >= 0)) {
                set[i].options.outputPath = (url, resourcePath, context) => {
                    const pk = findPackageByFile(resourcePath);
                    return `${(pk ? pk.shortName : 'external')}/${url}`;
                };
            }
            if (rule.include && typeof rule.loader === 'string' &&
                rule.loader.indexOf(path_1.default.sep + 'babel-loader' + path_1.default.sep)) {
                delete rule.include;
                const origTest = rule.test;
                rule.test = (file) => {
                    const pk = findPackageByFile(file);
                    const yes = ((pk && pk.dr) || file.startsWith(craPaths.appSrc)) &&
                        (origTest instanceof RegExp) ? origTest.test(file) :
                        (origTest instanceof Function ? origTest(file) : origTest === file);
                    // console.log(`[webpack.config] babel-loader: ${file}`, yes);
                    return yes;
                };
            }
        }
    }
    return;
}
module.exports = function (webpackEnv) {
    utils_1.drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check:\n  ${path_1.default.resolve('/logs')}\n  ${__filename}`);
    const cmdOption = utils_1.getCmdOptions();
    // `npm run build` by default is in production mode, below hacks the way react-scripts does
    if (process.argv.indexOf('--dev') >= 0) {
        console.log('Development mode is on');
        webpackEnv = 'development';
    }
    else if (cmdOption.watch) {
        console.log('Development mode is on, watch mode is on');
        webpackEnv = 'development';
    }
    else {
        process.env.GENERATE_SOURCEMAP = 'false';
    }
    const origWebpackConfig = require('react-scripts/config/webpack.config');
    const config = origWebpackConfig(webpackEnv);
    if (cmdOption.watch) {
        config.watch = true;
    }
    // Make sure babel compiles source folder out side of current src directory
    findAndChangeRule(config.module.rules);
    const { dir, packageJson } = build_target_helper_1.findPackage(cmdOption.buildTarget);
    if (cmdOption.buildType === 'app') {
        // TODO: do not hard code
        config.resolve.alias['alias:dr.cra-start-entry'] = packageJson.name + '/' + packageJson.dr['cra-start-entry'];
        console.log(packageJson.name + '/' + packageJson.dr['cra-start-entry']);
    }
    // Remove ModulesScopePlugin from resolve plugins, it stops us using source fold out side of project directory
    if (config.resolve && config.resolve.plugins) {
        const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
        const srcScopePluginIdx = config.resolve.plugins.findIndex(plugin => plugin instanceof ModuleScopePlugin);
        if (srcScopePluginIdx >= 0) {
            config.resolve.plugins.splice(srcScopePluginIdx, 1);
        }
    }
    // Move project node_modules to first position in resolve order
    if (config.resolve && config.resolve.modules) {
        const topModuleDir = path_1.default.resolve('node_modules');
        const pwdIdx = config.resolve.modules.findIndex(m => m === topModuleDir);
        if (pwdIdx > 0) {
            config.resolve.modules.splice(pwdIdx, 1);
        }
        config.resolve.modules.unshift(topModuleDir);
    }
    Object.assign(config.resolve.alias, require('rxjs/_esm2015/path-mapping')());
    Object.assign(config.optimization.splitChunks, {
        chunks: 'all',
        // name: false, default is false for production
        cacheGroups: {
            lazyVendor: {
                name: 'lazy-vendor',
                chunks: 'async',
                enforce: true,
                test: /[\\/]node_modules[\\/]/,
                priority: 1
            }
        }
    });
    config.plugins.push(new (class {
        apply(compiler) {
            compiler.hooks.emit.tap('drcp-cli-stats', compilation => {
                setTimeout(() => {
                    console.log('');
                    console.log(compilation.getStats().toString('normal'));
                    console.log('');
                }, 0);
                // const data = JSON.stringify(compilation.getStats().toJson('normal'));
                // compilation.assets['stats.json'] = new RawSource(data);
            });
        }
    })());
    config.plugins.push(new ProgressPlugin({ profile: true }));
    config.stats = 'normal'; // Not working
    const ssrConfig = global.__SSR;
    if (ssrConfig) {
        ssrConfig(config);
    }
    if (cmdOption.buildType === 'lib')
        webpack_lib_1.default(cmdOption.buildTarget, config);
    const configFileInPackage = path_1.default.resolve(dir, lodash_1.default.get(packageJson, ['dr', 'config-overrides-path'], 'config-overrides.ts'));
    if (fs_extra_1.default.existsSync(configFileInPackage)) {
        const cfgMgr = new config_handler_1.ConfigHandlerMgr([configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            handler.webpack(config, webpackEnv, cmdOption);
        });
    }
    fs_extra_1.default.mkdirpSync('logs');
    fs_extra_1.default.writeFile('logs/webpack.config.debug.js', utils_1.printConfig(config), (err) => {
        // just for debug
    });
    return config;
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0QkFBNEI7QUFDNUIsNERBQXVCO0FBQ3ZCLHdEQUF3QjtBQUN4QixnRUFBMEI7QUFFMUIsK0NBQStDO0FBQy9DLG1DQUE4RDtBQUM5RCwwRUFBbUY7QUFDbkYsd0VBQXVDO0FBQ3ZDLCtEQUFrRDtBQUNsRCw0RUFBeUU7QUFHekUsNkJBQTZCO0FBQzdCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBRzdELE1BQU0saUJBQWlCLEdBQUcsMkNBQTJCLEVBQUUsQ0FBQztBQThHeEQsU0FBUyxpQkFBaUIsQ0FBQyxLQUFvQjtJQUM3QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUN2RCxnRUFBZ0U7SUFDaEUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1FBQ3hCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDM0IsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUVwQjthQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbkMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUN6QjthQUFNLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNyQixPQUFPLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN0QztLQUNGO0lBRUQsU0FBUyxRQUFRLENBQUMsR0FBcUM7UUFDckQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUcsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsTUFB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UyxDQUFDLFNBQVMsS0FBSyxLQUFLO1FBQy9CLHFCQUFVLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUU1QyxNQUFNLG1CQUFtQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGdCQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQztJQUMxSCxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7UUFDdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxpQ0FBZ0IsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFtQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDaEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QixrQkFBRSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsRUFBRSxtQkFBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDeEUsaUJBQWlCO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC93ZWJwYWNrLmNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge0NvbmZpZ3VyYXRpb24sIFJ1bGVTZXRSdWxlLCBDb21waWxlciwgUnVsZVNldFVzZUl0ZW0sIFJ1bGVTZXRMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuLy8gaW1wb3J0IHsgUmF3U291cmNlIH0gZnJvbSAnd2VicGFjay1zb3VyY2VzJztcbmltcG9ydCB7ZHJhd1B1cHB5LCBwcmludENvbmZpZywgZ2V0Q21kT3B0aW9uc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNoYW5nZTRsaWIgZnJvbSAnLi93ZWJwYWNrLWxpYic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuaW1wb3J0IHtDb25maWdIYW5kbGVyTWdyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtDb25maWd1cmVIYW5kbGVyfSBmcm9tICcuL3R5cGVzJztcblxuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmNvbnN0IFByb2dyZXNzUGx1Z2luID0gcmVxdWlyZSgnd2VicGFjay9saWIvUHJvZ3Jlc3NQbHVnaW4nKTtcblxuXG5jb25zdCBmaW5kUGFja2FnZUJ5RmlsZSA9IGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpO1xuXG5cbmV4cG9ydCA9IGZ1bmN0aW9uKHdlYnBhY2tFbnY6IHN0cmluZykge1xuXG4gIGRyYXdQdXBweSgnUG9vaW5nIG9uIGNyZWF0ZS1yZWFjdC1hcHAnLCBgSWYgeW91IHdhbnQgdG8ga25vdyBob3cgV2VicGFjayBpcyBjb25maWd1cmVkLCBjaGVjazpcXG4gICR7UGF0aC5yZXNvbHZlKCcvbG9ncycpfVxcbiAgJHtfX2ZpbGVuYW1lfWApO1xuXG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcblxuICAvLyBgbnBtIHJ1biBidWlsZGAgYnkgZGVmYXVsdCBpcyBpbiBwcm9kdWN0aW9uIG1vZGUsIGJlbG93IGhhY2tzIHRoZSB3YXkgcmVhY3Qtc2NyaXB0cyBkb2VzXG4gIGlmIChwcm9jZXNzLmFyZ3YuaW5kZXhPZignLS1kZXYnKSA+PSAwKSB7XG4gICAgY29uc29sZS5sb2coJ0RldmVsb3BtZW50IG1vZGUgaXMgb24nKTtcbiAgICB3ZWJwYWNrRW52ID0gJ2RldmVsb3BtZW50JztcbiAgfSBlbHNlIGlmIChjbWRPcHRpb24ud2F0Y2gpIHtcbiAgICBjb25zb2xlLmxvZygnRGV2ZWxvcG1lbnQgbW9kZSBpcyBvbiwgd2F0Y2ggbW9kZSBpcyBvbicpO1xuICAgIHdlYnBhY2tFbnYgPSAnZGV2ZWxvcG1lbnQnO1xuICB9IGVsc2Uge1xuICAgIHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCA9ICdmYWxzZSc7XG4gIH1cbiAgY29uc3Qgb3JpZ1dlYnBhY2tDb25maWcgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy93ZWJwYWNrLmNvbmZpZycpO1xuICBjb25zdCBjb25maWc6IENvbmZpZ3VyYXRpb24gPSBvcmlnV2VicGFja0NvbmZpZyh3ZWJwYWNrRW52KTtcblxuICBpZiAoY21kT3B0aW9uLndhdGNoKSB7XG4gICAgY29uZmlnLndhdGNoID0gdHJ1ZTtcbiAgfVxuICAvLyBNYWtlIHN1cmUgYmFiZWwgY29tcGlsZXMgc291cmNlIGZvbGRlciBvdXQgc2lkZSBvZiBjdXJyZW50IHNyYyBkaXJlY3RvcnlcbiAgZmluZEFuZENoYW5nZVJ1bGUoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuXG4gIGNvbnN0IHtkaXIsIHBhY2thZ2VKc29ufSA9IGZpbmRQYWNrYWdlKGNtZE9wdGlvbi5idWlsZFRhcmdldCk7XG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnYXBwJykge1xuICAgIC8vIFRPRE86IGRvIG5vdCBoYXJkIGNvZGVcbiAgICBjb25maWcucmVzb2x2ZSEuYWxpYXMhWydhbGlhczpkci5jcmEtc3RhcnQtZW50cnknXSA9IHBhY2thZ2VKc29uLm5hbWUgKyAnLycgKyBwYWNrYWdlSnNvbi5kclsnY3JhLXN0YXJ0LWVudHJ5J107XG4gICAgY29uc29sZS5sb2cocGFja2FnZUpzb24ubmFtZSArICcvJyArIHBhY2thZ2VKc29uLmRyWydjcmEtc3RhcnQtZW50cnknXSk7XG4gIH1cblxuXG4gIC8vIFJlbW92ZSBNb2R1bGVzU2NvcGVQbHVnaW4gZnJvbSByZXNvbHZlIHBsdWdpbnMsIGl0IHN0b3BzIHVzIHVzaW5nIHNvdXJjZSBmb2xkIG91dCBzaWRlIG9mIHByb2plY3QgZGlyZWN0b3J5XG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5wbHVnaW5zKSB7XG4gICAgY29uc3QgTW9kdWxlU2NvcGVQbHVnaW4gPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvTW9kdWxlU2NvcGVQbHVnaW4nKTtcbiAgICBjb25zdCBzcmNTY29wZVBsdWdpbklkeCA9IGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuZmluZEluZGV4KHBsdWdpbiA9PiBwbHVnaW4gaW5zdGFuY2VvZiBNb2R1bGVTY29wZVBsdWdpbik7XG4gICAgaWYgKHNyY1Njb3BlUGx1Z2luSWR4ID49IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuc3BsaWNlKHNyY1Njb3BlUGx1Z2luSWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICAvLyBNb3ZlIHByb2plY3Qgbm9kZV9tb2R1bGVzIHRvIGZpcnN0IHBvc2l0aW9uIGluIHJlc29sdmUgb3JkZXJcbiAgaWYgKGNvbmZpZy5yZXNvbHZlICYmIGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMpIHtcbiAgICBjb25zdCB0b3BNb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycpO1xuICAgIGNvbnN0IHB3ZElkeCA9IGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMuZmluZEluZGV4KG0gPT4gbSA9PT0gdG9wTW9kdWxlRGlyKTtcbiAgICBpZiAocHdkSWR4ID4gMCkge1xuICAgICAgY29uZmlnLnJlc29sdmUubW9kdWxlcy5zcGxpY2UocHdkSWR4LCAxKTtcbiAgICB9XG4gICAgY29uZmlnLnJlc29sdmUubW9kdWxlcy51bnNoaWZ0KHRvcE1vZHVsZURpcik7XG4gIH1cblxuICBPYmplY3QuYXNzaWduKGNvbmZpZy5yZXNvbHZlIS5hbGlhcywgcmVxdWlyZSgncnhqcy9fZXNtMjAxNS9wYXRoLW1hcHBpbmcnKSgpKTtcbiAgT2JqZWN0LmFzc2lnbihjb25maWcub3B0aW1pemF0aW9uIS5zcGxpdENodW5rcywge1xuICAgIGNodW5rczogJ2FsbCcsXG4gICAgLy8gbmFtZTogZmFsc2UsIGRlZmF1bHQgaXMgZmFsc2UgZm9yIHByb2R1Y3Rpb25cbiAgICBjYWNoZUdyb3Vwczoge1xuICAgICAgbGF6eVZlbmRvcjoge1xuICAgICAgICBuYW1lOiAnbGF6eS12ZW5kb3InLFxuICAgICAgICBjaHVua3M6ICdhc3luYycsXG4gICAgICAgIGVuZm9yY2U6IHRydWUsXG4gICAgICAgIHRlc3Q6IC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXS8sIC8vIFRPRE86IGV4Y2x1ZGUgRHIgcGFja2FnZSBzb3VyY2UgZmlsZVxuICAgICAgICBwcmlvcml0eTogMVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyAoY2xhc3Mge1xuICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXAoJ2RyY3AtY2xpLXN0YXRzJywgY29tcGlsYXRpb24gPT4ge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgY29uc29sZS5sb2coY29tcGlsYXRpb24uZ2V0U3RhdHMoKS50b1N0cmluZygnbm9ybWFsJykpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgfSwgMCk7XG4gICAgICAgIC8vIGNvbnN0IGRhdGEgPSBKU09OLnN0cmluZ2lmeShjb21waWxhdGlvbi5nZXRTdGF0cygpLnRvSnNvbignbm9ybWFsJykpO1xuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbJ3N0YXRzLmpzb24nXSA9IG5ldyBSYXdTb3VyY2UoZGF0YSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pKCkpO1xuXG4gIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBQcm9ncmVzc1BsdWdpbih7IHByb2ZpbGU6IHRydWUgfSkpO1xuXG4gIGNvbmZpZy5zdGF0cyA9ICdub3JtYWwnOyAvLyBOb3Qgd29ya2luZ1xuXG4gIGNvbnN0IHNzckNvbmZpZyA9IChnbG9iYWwgYXMgYW55KS5fX1NTUjtcbiAgaWYgKHNzckNvbmZpZykge1xuICAgIHNzckNvbmZpZyhjb25maWcpO1xuICB9XG5cbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdsaWInKVxuICAgIGNoYW5nZTRsaWIoY21kT3B0aW9uLmJ1aWxkVGFyZ2V0LCBjb25maWcpO1xuXG4gIGNvbnN0IGNvbmZpZ0ZpbGVJblBhY2thZ2UgPSBQYXRoLnJlc29sdmUoZGlyLCBfLmdldChwYWNrYWdlSnNvbiwgWydkcicsICdjb25maWctb3ZlcnJpZGVzLXBhdGgnXSwgJ2NvbmZpZy1vdmVycmlkZXMudHMnKSk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGNvbmZpZ0ZpbGVJblBhY2thZ2UpKSB7XG4gICAgY29uc3QgY2ZnTWdyID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoW2NvbmZpZ0ZpbGVJblBhY2thZ2VdKTtcbiAgICBjZmdNZ3IucnVuRWFjaFN5bmM8Q29uZmlndXJlSGFuZGxlcj4oKGNmZ0ZpbGUsIHJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgICAgaGFuZGxlci53ZWJwYWNrKGNvbmZpZywgd2VicGFja0VudiwgY21kT3B0aW9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZzLm1rZGlycFN5bmMoJ2xvZ3MnKTtcbiAgZnMud3JpdGVGaWxlKCdsb2dzL3dlYnBhY2suY29uZmlnLmRlYnVnLmpzJywgcHJpbnRDb25maWcoY29uZmlnKSwgKGVycikgPT4ge1xuICAgIC8vIGp1c3QgZm9yIGRlYnVnXG4gIH0pO1xuICByZXR1cm4gY29uZmlnO1xufTtcblxuZnVuY3Rpb24gZmluZEFuZENoYW5nZVJ1bGUocnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3QgY3JhUGF0aHMgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy9wYXRocycpO1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcmV0dXJuIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldC5sZW5ndGggOyBpKyspIHtcbiAgICAgIGNvbnN0IHJ1bGUgPSBzZXRbaV07XG4gICAgICBpZiAodHlwZW9mIHJ1bGUgPT09ICdzdHJpbmcnICYmIChydWxlLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fCBydWxlLmluZGV4T2YoJ3VybC1sb2FkZXInKSA+PSAwKSkge1xuICAgICAgICBzZXRbaV0gPSB7XG4gICAgICAgICAgbG9hZGVyOiBydWxlLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG91dHB1dFBhdGgodXJsOiBzdHJpbmcsIHJlc291cmNlUGF0aDogc3RyaW5nLCBjb250ZXh0OiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgICByZXR1cm4gYCR7KHBrID8gcGsuc2hvcnROYW1lIDogJ2V4dGVybmFsJyl9LyR7dXJsfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICgodHlwZW9mIChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikubG9hZGVyKSA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgKCgocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLmxvYWRlciBhcyBzdHJpbmcpLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fFxuICAgICAgICAoKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5sb2FkZXIgYXMgc3RyaW5nKS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMFxuICAgICAgICApKSB7XG4gICAgICAgICgoc2V0W2ldIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikub3B0aW9ucyBhcyBhbnkpIS5vdXRwdXRQYXRoID0gKHVybDogc3RyaW5nLCByZXNvdXJjZVBhdGg6IHN0cmluZywgY29udGV4dDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZVBhdGgpO1xuICAgICAgICAgIHJldHVybiBgJHsocGsgPyBway5zaG9ydE5hbWUgOiAnZXh0ZXJuYWwnKX0vJHt1cmx9YDtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgaWYgKChydWxlIGFzIFJ1bGVTZXRSdWxlKS5pbmNsdWRlICYmIHR5cGVvZiAocnVsZSBhcyBSdWxlU2V0UnVsZSkubG9hZGVyID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAocnVsZSBhcyBSdWxlU2V0TG9hZGVyKS5sb2FkZXIhLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSkge1xuICAgICAgICBkZWxldGUgKHJ1bGUgYXMgUnVsZVNldFJ1bGUpLmluY2x1ZGU7XG4gICAgICAgIGNvbnN0IG9yaWdUZXN0ID0gKHJ1bGUgYXMgUnVsZVNldFJ1bGUpLnRlc3Q7XG4gICAgICAgIChydWxlIGFzIFJ1bGVTZXRSdWxlKS50ZXN0ID0gKGZpbGUpID0+IHtcbiAgICAgICAgICBjb25zdCBwayA9IGZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuXG4gICAgICAgICAgY29uc3QgeWVzID0gKChwayAmJiBway5kcikgfHwgZmlsZS5zdGFydHNXaXRoKGNyYVBhdGhzLmFwcFNyYykpICYmXG4gICAgICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBSZWdFeHApID8gb3JpZ1Rlc3QudGVzdChmaWxlKSA6XG4gICAgICAgICAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gb3JpZ1Rlc3QoZmlsZSkgOiBvcmlnVGVzdCA9PT0gZmlsZSk7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coYFt3ZWJwYWNrLmNvbmZpZ10gYmFiZWwtbG9hZGVyOiAke2ZpbGV9YCwgeWVzKTtcbiAgICAgICAgICByZXR1cm4geWVzO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG4iXX0=
