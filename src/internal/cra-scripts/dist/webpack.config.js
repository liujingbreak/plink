"use strict";
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
// import { RawSource } from 'webpack-sources';
const utils_1 = require("./utils");
const package_utils_1 = require("dr-comp-package/wfh/dist/package-utils");
const webpack_lib_1 = tslib_1.__importDefault(require("./webpack-lib"));
const build_target_helper_1 = require("./build-target-helper");
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
    if (cmdOption.buildType === 'app') {
        const { packageJson } = build_target_helper_1.findPackage(cmdOption.buildTarget);
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
    fs_extra_1.default.mkdirpSync('logs');
    fs_extra_1.default.writeFile('logs/webpack.config.debug.js', utils_1.printConfig(config), (err) => {
        // just for debug
    });
    return config;
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSx3REFBd0I7QUFDeEIsZ0VBQTBCO0FBRTFCLCtDQUErQztBQUMvQyxtQ0FBOEQ7QUFDOUQsMEVBQW1GO0FBQ25GLHdFQUF1QztBQUN2QywrREFBa0Q7QUFDbEQsNkJBQTZCO0FBQzdCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBRzdELE1BQU0saUJBQWlCLEdBQUcsMkNBQTJCLEVBQUUsQ0FBQztBQThGeEQsU0FBUyxpQkFBaUIsQ0FBQyxNQUFxQjtJQUM5QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUN2RCxNQUFNLENBQUMsTUFBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUU3QyxTQUFTLGlCQUFpQixDQUFDLElBQWlCO1FBQzFDLGdFQUFnRTtRQUNoRSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsR0FBRyxHQUFHLGNBQWMsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDaEgsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3BCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDM0IsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNuQixNQUFNLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFbkMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFD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Q0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNOLHdFQUF3RTtnQkFDeEUsMERBQTBEO1lBQzVELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUNGLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFTixNQUFNLENBQUMsT0FBUSxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFNUQsTUFBTSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsQ0FBQyxjQUFjO0lBRXZDLE1BQU0sU0FBUyxHQUFJLE1BQWMsQ0FBQyxLQUFLLENBQUM7SUFDeEMsSUFBSSxTQUFTLEVBQUU7UUFDYixTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDbkI7SUFFRCxJQUFJLFNBQVMsQ0FBQyxTQUFTLEtBQUssS0FBSztRQUMvQixxQkFBVSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFFNUMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEIsa0JBQUUsQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsbUJBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ3hFLGlCQUFpQjtJQUNuQixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3Qvd2VicGFjay5jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtDb25maWd1cmF0aW9uLCBSdWxlU2V0UnVsZSwgQ29tcGlsZXJ9IGZyb20gJ3dlYnBhY2snO1xuLy8gaW1wb3J0IHsgUmF3U291cmNlIH0gZnJvbSAnd2VicGFjay1zb3VyY2VzJztcbmltcG9ydCB7ZHJhd1B1cHB5LCBwcmludENvbmZpZywgZ2V0Q21kT3B0aW9uc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNoYW5nZTRsaWIgZnJvbSAnLi93ZWJwYWNrLWxpYic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmNvbnN0IFByb2dyZXNzUGx1Z2luID0gcmVxdWlyZSgnd2VicGFjay9saWIvUHJvZ3Jlc3NQbHVnaW4nKTtcblxuXG5jb25zdCBmaW5kUGFja2FnZUJ5RmlsZSA9IGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpO1xuXG5cbmV4cG9ydCA9IGZ1bmN0aW9uKHdlYnBhY2tFbnY6IHN0cmluZykge1xuXG4gIGRyYXdQdXBweSgnUG9vaW5nIG9uIGNyZWF0ZS1yZWFjdC1hcHAnLCBgSWYgeW91IHdhbnQgdG8ga25vdyBob3cgV2VicGFjayBpcyBjb25maWd1cmVkLCBjaGVjazpcXG4gICR7UGF0aC5yZXNvbHZlKCcvbG9ncycpfVxcbiAgJHtfX2ZpbGVuYW1lfWApO1xuXG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcblxuICAvLyBgbnBtIHJ1biBidWlsZGAgYnkgZGVmYXVsdCBpcyBpbiBwcm9kdWN0aW9uIG1vZGUsIGJlbG93IGhhY2tzIHRoZSB3YXkgcmVhY3Qtc2NyaXB0cyBkb2VzXG4gIGlmIChwcm9jZXNzLmFyZ3YuaW5kZXhPZignLS1kZXYnKSA+PSAwKSB7XG4gICAgY29uc29sZS5sb2coJ0RldmVsb3BtZW50IG1vZGUhISEnKTtcbiAgICB3ZWJwYWNrRW52ID0gJ2RldmVsb3BtZW50JztcbiAgfSBlbHNlIHtcbiAgICBwcm9jZXNzLmVudi5HRU5FUkFURV9TT1VSQ0VNQVAgPSAnZmFsc2UnO1xuICB9XG4gIGNvbnN0IG9yaWdXZWJwYWNrQ29uZmlnID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvd2VicGFjay5jb25maWcnKTtcbiAgY29uc3QgY29uZmlnOiBDb25maWd1cmF0aW9uID0gb3JpZ1dlYnBhY2tDb25maWcod2VicGFja0Vudik7XG4gIC8vIE1ha2Ugc3VyZSBiYWJlbCBjb21waWxlcyBzb3VyY2UgZm9sZGVyIG91dCBzaWRlIG9mIGN1cnJlbnQgc3JjIGRpcmVjdG9yeVxuICBjaGFuZ2VCYWJlbExvYWRlcihjb25maWcpO1xuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnYXBwJykge1xuICAgIGNvbnN0IHtwYWNrYWdlSnNvbn0gPSBmaW5kUGFja2FnZShjbWRPcHRpb24uYnVpbGRUYXJnZXQpO1xuICAgIC8vIFRPRE86IGRvIG5vdCBoYXJkIGNvZGVcbiAgICBjb25maWcucmVzb2x2ZSEuYWxpYXMhWydhbGlhczpkci5jcmEtc3RhcnQtZW50cnknXSA9IHBhY2thZ2VKc29uLm5hbWUgKyAnLycgKyBwYWNrYWdlSnNvbi5kclsnY3JhLXN0YXJ0LWVudHJ5J107XG4gICAgY29uc29sZS5sb2cocGFja2FnZUpzb24ubmFtZSArICcvJyArIHBhY2thZ2VKc29uLmRyWydjcmEtc3RhcnQtZW50cnknXSk7XG4gIH1cblxuICAvLyBSZW1vdmUgTW9kdWxlc1Njb3BlUGx1Z2luIGZyb20gcmVzb2x2ZSBwbHVnaW5zLCBpdCBzdG9wcyB1cyB1c2luZyBzb3VyY2UgZm9sZCBvdXQgc2lkZSBvZiBwcm9qZWN0IGRpcmVjdG9yeVxuICBpZiAoY29uZmlnLnJlc29sdmUgJiYgY29uZmlnLnJlc29sdmUucGx1Z2lucykge1xuICAgIGNvbnN0IE1vZHVsZVNjb3BlUGx1Z2luID0gcmVxdWlyZSgncmVhY3QtZGV2LXV0aWxzL01vZHVsZVNjb3BlUGx1Z2luJyk7XG4gICAgY29uc3Qgc3JjU2NvcGVQbHVnaW5JZHggPSBjb25maWcucmVzb2x2ZS5wbHVnaW5zLmZpbmRJbmRleChwbHVnaW4gPT4gcGx1Z2luIGluc3RhbmNlb2YgTW9kdWxlU2NvcGVQbHVnaW4pO1xuICAgIGlmIChzcmNTY29wZVBsdWdpbklkeCA+PSAwKSB7XG4gICAgICBjb25maWcucmVzb2x2ZS5wbHVnaW5zLnNwbGljZShzcmNTY29wZVBsdWdpbklkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgLy8gTW92ZSBwcm9qZWN0IG5vZGVfbW9kdWxlcyB0byBmaXJzdCBwb3NpdGlvbiBpbiByZXNvbHZlIG9yZGVyXG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5tb2R1bGVzKSB7XG4gICAgY29uc3QgdG9wTW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKTtcbiAgICBjb25zdCBwd2RJZHggPSBjb25maWcucmVzb2x2ZS5tb2R1bGVzLmZpbmRJbmRleChtID0+IG0gPT09IHRvcE1vZHVsZURpcik7XG4gICAgaWYgKHB3ZElkeCA+IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMuc3BsaWNlKHB3ZElkeCwgMSk7XG4gICAgfVxuICAgIGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMudW5zaGlmdCh0b3BNb2R1bGVEaXIpO1xuICB9XG5cbiAgT2JqZWN0LmFzc2lnbihjb25maWcucmVzb2x2ZSEuYWxpYXMsIHJlcXVpcmUoJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJykoKSk7XG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLm9wdGltaXphdGlvbiEuc3BsaXRDaHVua3MsIHtcbiAgICBjaHVua3M6ICdhbGwnLFxuICAgIC8vIG5hbWU6IGZhbHNlLCBkZWZhdWx0IGlzIGZhbHNlIGZvciBwcm9kdWN0aW9uXG4gICAgY2FjaGVHcm91cHM6IHtcbiAgICAgIGxhenlWZW5kb3I6IHtcbiAgICAgICAgbmFtZTogJ2xhenktdmVuZG9yJyxcbiAgICAgICAgY2h1bmtzOiAnYXN5bmMnLFxuICAgICAgICBlbmZvcmNlOiB0cnVlLFxuICAgICAgICB0ZXN0OiAvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10vLCAvLyBUT0RPOiBleGNsdWRlIERyIHBhY2thZ2Ugc291cmNlIGZpbGVcbiAgICAgICAgcHJpb3JpdHk6IDFcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgKGNsYXNzIHtcbiAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdkcmNwLWNsaS1zdGF0cycsIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGNvbXBpbGF0aW9uLmdldFN0YXRzKCkudG9TdHJpbmcoJ25vcm1hbCcpKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgIH0sIDApO1xuICAgICAgICAvLyBjb25zdCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoY29tcGlsYXRpb24uZ2V0U3RhdHMoKS50b0pzb24oJ25vcm1hbCcpKTtcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzWydzdGF0cy5qc29uJ10gPSBuZXcgUmF3U291cmNlKGRhdGEpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KSgpKTtcblxuICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgUHJvZ3Jlc3NQbHVnaW4oeyBwcm9maWxlOiB0cnVlIH0pKTtcblxuICBjb25maWcuc3RhdHMgPSAnbm9ybWFsJzsgLy8gTm90IHdvcmtpbmdcblxuICBjb25zdCBzc3JDb25maWcgPSAoZ2xvYmFsIGFzIGFueSkuX19TU1I7XG4gIGlmIChzc3JDb25maWcpIHtcbiAgICBzc3JDb25maWcoY29uZmlnKTtcbiAgfVxuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnbGliJylcbiAgICBjaGFuZ2U0bGliKGNtZE9wdGlvbi5idWlsZFRhcmdldCwgY29uZmlnKTtcblxuICBmcy5ta2RpcnBTeW5jKCdsb2dzJyk7XG4gIGZzLndyaXRlRmlsZSgnbG9ncy93ZWJwYWNrLmNvbmZpZy5kZWJ1Zy5qcycsIHByaW50Q29uZmlnKGNvbmZpZyksIChlcnIpID0+IHtcbiAgICAvLyBqdXN0IGZvciBkZWJ1Z1xuICB9KTtcbiAgcmV0dXJuIGNvbmZpZztcbn07XG5cbmZ1bmN0aW9uIGNoYW5nZUJhYmVsTG9hZGVyKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBjcmFQYXRocyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzJyk7XG4gIGNvbmZpZy5tb2R1bGUhLnJ1bGVzLnNvbWUoZmluZEFuZENoYW5nZVJ1bGUpO1xuXG4gIGZ1bmN0aW9uIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGU6IFJ1bGVTZXRSdWxlKSB7XG4gICAgLy8gVE9ETzogY2hlY2sgaW4gY2FzZSBDUkEgd2lsbCB1c2UgUnVsZS51c2UgaW5zdGVhZCBvZiBcImxvYWRlclwiXG4gICAgaWYgKHJ1bGUuaW5jbHVkZSAmJiB0eXBlb2YgcnVsZS5sb2FkZXIgPT09ICdzdHJpbmcnICYmIHJ1bGUubG9hZGVyLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSkge1xuICAgICAgZGVsZXRlIHJ1bGUuaW5jbHVkZTtcbiAgICAgIGNvbnN0IG9yaWdUZXN0ID0gcnVsZS50ZXN0O1xuICAgICAgcnVsZS50ZXN0ID0gKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcblxuICAgICAgICBjb25zdCB5ZXMgPSAoKHBrICYmIHBrLmRyKSB8fCBmaWxlLnN0YXJ0c1dpdGgoY3JhUGF0aHMuYXBwU3JjKSkgJiZcbiAgICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBSZWdFeHApID8gb3JpZ1Rlc3QudGVzdChmaWxlKSA6XG4gICAgICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IG9yaWdUZXN0KGZpbGUpIDogb3JpZ1Rlc3QgPT09IGZpbGUpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhmaWxlLCB5ZXMpO1xuICAgICAgICByZXR1cm4geWVzO1xuICAgICAgfTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcmV0dXJuIHJ1bGUub25lT2Yuc29tZShmaW5kQW5kQ2hhbmdlUnVsZSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19
