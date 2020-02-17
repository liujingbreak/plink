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
function changeBabelLoader(config) {
    const craPaths = require('react-scripts/config/paths');
    config.module.rules.some(findAndChangeRule);
    function findAndChangeRule(rule) {
        // TODO: check in case CRA will use Rule.use instead of "loader"
        if (rule.include && typeof rule.loader === 'string' && rule.loader.indexOf(path_1.default.sep + 'babel-loader' + path_1.default.sep)) {
            delete rule.include;
            const origTest = rule.test;
            rule.test = (file) => {
                const pk = findPackageByFile(file);
                const yes = ((pk && pk.dr) || file.startsWith(craPaths.appSrc)) &&
                    (origTest instanceof RegExp) ? origTest.test(file) :
                    (origTest instanceof Function ? origTest(file) : origTest === file);
                // console.log(file, yes);
                return yes;
            };
            return true;
        }
        else if (rule.oneOf) {
            return rule.oneOf.some(findAndChangeRule);
        }
        return false;
    }
}
module.exports = function (webpackEnv) {
    utils_1.drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check:\n  ${path_1.default.resolve('/logs')}\n  ${__filename}`);
    const cmdOption = utils_1.getCmdOptions();
    // `npm run build` by default is in production mode, below hacks the way react-scripts does
    if (process.argv.indexOf('--dev') >= 0) {
        console.log('Development mode!!!');
        webpackEnv = 'development';
    }
    else {
        process.env.GENERATE_SOURCEMAP = 'false';
    }
    const origWebpackConfig = require('react-scripts/config/webpack.config');
    const config = origWebpackConfig(webpackEnv);
    // Make sure babel compiles source folder out side of current src directory
    changeBabelLoader(config);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0QkFBNEI7QUFDNUIsNERBQXVCO0FBQ3ZCLHdEQUF3QjtBQUN4QixnRUFBMEI7QUFFMUIsK0NBQStDO0FBQy9DLG1DQUE4RDtBQUM5RCwwRUFBbUY7QUFDbkYsd0VBQXVDO0FBQ3ZDLCtEQUFrRDtBQUNsRCw0RUFBeUU7QUFHekUsNkJBQTZCO0FBQzdCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBRzdELE1BQU0saUJBQWlCLEdBQUcsMkNBQTJCLEVBQUUsQ0FBQztBQXVHeEQsU0FBUyxpQkFBaUIsQ0FBQyxNQUFxQjtJQUM5QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUN2RCxNQUFNLENBQUMsTUFBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUU3QyxTQUFTLGlCQUFpQixDQUFDLElBQWlCO1FBQzFDLGdFQUFnRTtRQUNoRSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsR0FBRyxHQUFHLGNBQWMsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDaEgsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3BCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDM0IsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNuQixNQUFNLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFbkMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUks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VUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RCLGtCQUFFLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLG1CQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUN4RSxpQkFBaUI7SUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9jcmEtc2NyaXB0cy9kaXN0L3dlYnBhY2suY29uZmlnLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7Q29uZmlndXJhdGlvbiwgUnVsZVNldFJ1bGUsIENvbXBpbGVyfSBmcm9tICd3ZWJwYWNrJztcbi8vIGltcG9ydCB7IFJhd1NvdXJjZSB9IGZyb20gJ3dlYnBhY2stc291cmNlcyc7XG5pbXBvcnQge2RyYXdQdXBweSwgcHJpbnRDb25maWcsIGdldENtZE9wdGlvbnN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXJ9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjaGFuZ2U0bGliIGZyb20gJy4vd2VicGFjay1saWInO1xuaW1wb3J0IHtmaW5kUGFja2FnZX0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbmltcG9ydCB7Q29uZmlnSGFuZGxlck1ncn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7Q29uZmlndXJlSGFuZGxlcn0gZnJvbSAnLi90eXBlcyc7XG5cbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5jb25zdCBQcm9ncmVzc1BsdWdpbiA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL1Byb2dyZXNzUGx1Z2luJyk7XG5cblxuY29uc3QgZmluZFBhY2thZ2VCeUZpbGUgPSBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKTtcblxuXG5leHBvcnQgPSBmdW5jdGlvbih3ZWJwYWNrRW52OiBzdHJpbmcpIHtcblxuICBkcmF3UHVwcHkoJ1Bvb2luZyBvbiBjcmVhdGUtcmVhY3QtYXBwJywgYElmIHlvdSB3YW50IHRvIGtub3cgaG93IFdlYnBhY2sgaXMgY29uZmlndXJlZCwgY2hlY2s6XFxuICAke1BhdGgucmVzb2x2ZSgnL2xvZ3MnKX1cXG4gICR7X19maWxlbmFtZX1gKTtcblxuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG5cbiAgLy8gYG5wbSBydW4gYnVpbGRgIGJ5IGRlZmF1bHQgaXMgaW4gcHJvZHVjdGlvbiBtb2RlLCBiZWxvdyBoYWNrcyB0aGUgd2F5IHJlYWN0LXNjcmlwdHMgZG9lc1xuICBpZiAocHJvY2Vzcy5hcmd2LmluZGV4T2YoJy0tZGV2JykgPj0gMCkge1xuICAgIGNvbnNvbGUubG9nKCdEZXZlbG9wbWVudCBtb2RlISEhJyk7XG4gICAgd2VicGFja0VudiA9ICdkZXZlbG9wbWVudCc7XG4gIH0gZWxzZSB7XG4gICAgcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ2ZhbHNlJztcbiAgfVxuICBjb25zdCBvcmlnV2VicGFja0NvbmZpZyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3dlYnBhY2suY29uZmlnJyk7XG4gIGNvbnN0IGNvbmZpZzogQ29uZmlndXJhdGlvbiA9IG9yaWdXZWJwYWNrQ29uZmlnKHdlYnBhY2tFbnYpO1xuICAvLyBNYWtlIHN1cmUgYmFiZWwgY29tcGlsZXMgc291cmNlIGZvbGRlciBvdXQgc2lkZSBvZiBjdXJyZW50IHNyYyBkaXJlY3RvcnlcbiAgY2hhbmdlQmFiZWxMb2FkZXIoY29uZmlnKTtcblxuICBjb25zdCB7ZGlyLCBwYWNrYWdlSnNvbn0gPSBmaW5kUGFja2FnZShjbWRPcHRpb24uYnVpbGRUYXJnZXQpO1xuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2FwcCcpIHtcbiAgICAvLyBUT0RPOiBkbyBub3QgaGFyZCBjb2RlXG4gICAgY29uZmlnLnJlc29sdmUhLmFsaWFzIVsnYWxpYXM6ZHIuY3JhLXN0YXJ0LWVudHJ5J10gPSBwYWNrYWdlSnNvbi5uYW1lICsgJy8nICsgcGFja2FnZUpzb24uZHJbJ2NyYS1zdGFydC1lbnRyeSddO1xuICAgIGNvbnNvbGUubG9nKHBhY2thZ2VKc29uLm5hbWUgKyAnLycgKyBwYWNrYWdlSnNvbi5kclsnY3JhLXN0YXJ0LWVudHJ5J10pO1xuICB9XG5cblxuICAvLyBSZW1vdmUgTW9kdWxlc1Njb3BlUGx1Z2luIGZyb20gcmVzb2x2ZSBwbHVnaW5zLCBpdCBzdG9wcyB1cyB1c2luZyBzb3VyY2UgZm9sZCBvdXQgc2lkZSBvZiBwcm9qZWN0IGRpcmVjdG9yeVxuICBpZiAoY29uZmlnLnJlc29sdmUgJiYgY29uZmlnLnJlc29sdmUucGx1Z2lucykge1xuICAgIGNvbnN0IE1vZHVsZVNjb3BlUGx1Z2luID0gcmVxdWlyZSgncmVhY3QtZGV2LXV0aWxzL01vZHVsZVNjb3BlUGx1Z2luJyk7XG4gICAgY29uc3Qgc3JjU2NvcGVQbHVnaW5JZHggPSBjb25maWcucmVzb2x2ZS5wbHVnaW5zLmZpbmRJbmRleChwbHVnaW4gPT4gcGx1Z2luIGluc3RhbmNlb2YgTW9kdWxlU2NvcGVQbHVnaW4pO1xuICAgIGlmIChzcmNTY29wZVBsdWdpbklkeCA+PSAwKSB7XG4gICAgICBjb25maWcucmVzb2x2ZS5wbHVnaW5zLnNwbGljZShzcmNTY29wZVBsdWdpbklkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgLy8gTW92ZSBwcm9qZWN0IG5vZGVfbW9kdWxlcyB0byBmaXJzdCBwb3NpdGlvbiBpbiByZXNvbHZlIG9yZGVyXG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5tb2R1bGVzKSB7XG4gICAgY29uc3QgdG9wTW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKTtcbiAgICBjb25zdCBwd2RJZHggPSBjb25maWcucmVzb2x2ZS5tb2R1bGVzLmZpbmRJbmRleChtID0+IG0gPT09IHRvcE1vZHVsZURpcik7XG4gICAgaWYgKHB3ZElkeCA+IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMuc3BsaWNlKHB3ZElkeCwgMSk7XG4gICAgfVxuICAgIGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMudW5zaGlmdCh0b3BNb2R1bGVEaXIpO1xuICB9XG5cbiAgT2JqZWN0LmFzc2lnbihjb25maWcucmVzb2x2ZSEuYWxpYXMsIHJlcXVpcmUoJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJykoKSk7XG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLm9wdGltaXphdGlvbiEuc3BsaXRDaHVua3MsIHtcbiAgICBjaHVua3M6ICdhbGwnLFxuICAgIC8vIG5hbWU6IGZhbHNlLCBkZWZhdWx0IGlzIGZhbHNlIGZvciBwcm9kdWN0aW9uXG4gICAgY2FjaGVHcm91cHM6IHtcbiAgICAgIGxhenlWZW5kb3I6IHtcbiAgICAgICAgbmFtZTogJ2xhenktdmVuZG9yJyxcbiAgICAgICAgY2h1bmtzOiAnYXN5bmMnLFxuICAgICAgICBlbmZvcmNlOiB0cnVlLFxuICAgICAgICB0ZXN0OiAvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10vLCAvLyBUT0RPOiBleGNsdWRlIERyIHBhY2thZ2Ugc291cmNlIGZpbGVcbiAgICAgICAgcHJpb3JpdHk6IDFcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgKGNsYXNzIHtcbiAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdkcmNwLWNsaS1zdGF0cycsIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGNvbXBpbGF0aW9uLmdldFN0YXRzKCkudG9TdHJpbmcoJ25vcm1hbCcpKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgIH0sIDApO1xuICAgICAgICAvLyBjb25zdCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoY29tcGlsYXRpb24uZ2V0U3RhdHMoKS50b0pzb24oJ25vcm1hbCcpKTtcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzWydzdGF0cy5qc29uJ10gPSBuZXcgUmF3U291cmNlKGRhdGEpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KSgpKTtcblxuICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgUHJvZ3Jlc3NQbHVnaW4oeyBwcm9maWxlOiB0cnVlIH0pKTtcblxuICBjb25maWcuc3RhdHMgPSAnbm9ybWFsJzsgLy8gTm90IHdvcmtpbmdcblxuICBjb25zdCBzc3JDb25maWcgPSAoZ2xvYmFsIGFzIGFueSkuX19TU1I7XG4gIGlmIChzc3JDb25maWcpIHtcbiAgICBzc3JDb25maWcoY29uZmlnKTtcbiAgfVxuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnbGliJylcbiAgICBjaGFuZ2U0bGliKGNtZE9wdGlvbi5idWlsZFRhcmdldCwgY29uZmlnKTtcblxuICBjb25zdCBjb25maWdGaWxlSW5QYWNrYWdlID0gUGF0aC5yZXNvbHZlKGRpciwgXy5nZXQocGFja2FnZUpzb24sIFsnZHInLCAnY29uZmlnLW92ZXJyaWRlcy1wYXRoJ10sICdjb25maWctb3ZlcnJpZGVzLnRzJykpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhjb25maWdGaWxlSW5QYWNrYWdlKSkge1xuICAgIGNvbnN0IGNmZ01nciA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFtjb25maWdGaWxlSW5QYWNrYWdlXSk7XG4gICAgY2ZnTWdyLnJ1bkVhY2hTeW5jPENvbmZpZ3VyZUhhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGhhbmRsZXIud2VicGFjayhjb25maWcsIHdlYnBhY2tFbnYsIGNtZE9wdGlvbik7XG4gICAgfSk7XG4gIH1cblxuICBmcy5ta2RpcnBTeW5jKCdsb2dzJyk7XG4gIGZzLndyaXRlRmlsZSgnbG9ncy93ZWJwYWNrLmNvbmZpZy5kZWJ1Zy5qcycsIHByaW50Q29uZmlnKGNvbmZpZyksIChlcnIpID0+IHtcbiAgICAvLyBqdXN0IGZvciBkZWJ1Z1xuICB9KTtcbiAgcmV0dXJuIGNvbmZpZztcbn07XG5cbmZ1bmN0aW9uIGNoYW5nZUJhYmVsTG9hZGVyKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBjcmFQYXRocyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzJyk7XG4gIGNvbmZpZy5tb2R1bGUhLnJ1bGVzLnNvbWUoZmluZEFuZENoYW5nZVJ1bGUpO1xuXG4gIGZ1bmN0aW9uIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGU6IFJ1bGVTZXRSdWxlKSB7XG4gICAgLy8gVE9ETzogY2hlY2sgaW4gY2FzZSBDUkEgd2lsbCB1c2UgUnVsZS51c2UgaW5zdGVhZCBvZiBcImxvYWRlclwiXG4gICAgaWYgKHJ1bGUuaW5jbHVkZSAmJiB0eXBlb2YgcnVsZS5sb2FkZXIgPT09ICdzdHJpbmcnICYmIHJ1bGUubG9hZGVyLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSkge1xuICAgICAgZGVsZXRlIHJ1bGUuaW5jbHVkZTtcbiAgICAgIGNvbnN0IG9yaWdUZXN0ID0gcnVsZS50ZXN0O1xuICAgICAgcnVsZS50ZXN0ID0gKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcblxuICAgICAgICBjb25zdCB5ZXMgPSAoKHBrICYmIHBrLmRyKSB8fCBmaWxlLnN0YXJ0c1dpdGgoY3JhUGF0aHMuYXBwU3JjKSkgJiZcbiAgICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBSZWdFeHApID8gb3JpZ1Rlc3QudGVzdChmaWxlKSA6XG4gICAgICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IG9yaWdUZXN0KGZpbGUpIDogb3JpZ1Rlc3QgPT09IGZpbGUpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhmaWxlLCB5ZXMpO1xuICAgICAgICByZXR1cm4geWVzO1xuICAgICAgfTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcmV0dXJuIHJ1bGUub25lT2Yuc29tZShmaW5kQW5kQ2hhbmdlUnVsZSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19
