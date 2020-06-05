"use strict";
const tslib_1 = require("tslib");
// tslint:disable:no-console
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const webpack_sources_1 = require("webpack-sources");
const utils_1 = require("./utils");
const package_utils_1 = require("dr-comp-package/wfh/dist/package-utils");
const webpack_lib_1 = tslib_1.__importDefault(require("./webpack-lib"));
const build_target_helper_1 = require("./build-target-helper");
const config_handler_1 = require("dr-comp-package/wfh/dist/config-handler");
// import chalk from 'chalk';
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const findPackageByFile = package_utils_1.createLazyPackageFileFinder();
function insertLessLoaderRule(origRules) {
    const rulesAndParents = origRules.map((rule, idx, set) => [rule, idx, set]);
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < rulesAndParents.length; i++) {
        const rule = rulesAndParents[i][0];
        const parentRules = rulesAndParents[i][2];
        const idx = rulesAndParents[i][1];
        if (rule.test) {
            if (rule.test.toString() === '/\\.(scss|sass)$/') {
                const use = rule.use;
                const postCss = use.find(item => item.loader && item.loader.indexOf('postcss-loader') >= 0);
                // console.log(chalk.redBright('' + i));
                parentRules.splice(idx, 0, createLessLoaderRule(postCss));
                break;
            }
        }
        else if (rule.oneOf) {
            rule.oneOf.forEach((r, idx, list) => {
                rulesAndParents.push([r, idx, list]);
            });
        }
    }
}
function createLessLoaderRule(postCssLoaderRule) {
    return {
        test: /\.less$/,
        use: [
            require.resolve('style-loader'),
            {
                loader: require.resolve('css-loader'),
                options: {
                    importLoaders: 2,
                    sourceMap: process.env.GENERATE_SOURCEMAP !== 'false'
                }
            },
            postCssLoaderRule,
            {
                loader: 'less-loader'
            }
        ]
    };
}
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
                rule.loader.indexOf(path_1.default.sep + 'babel-loader' + path_1.default.sep) >= 0) {
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
    utils_1.drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check:\n  ${path_1.default.resolve('/logs')}`);
    const cmdOption = utils_1.getCmdOptions();
    // console.log('webpackEnv=', webpackEnv);
    // `npm run build` by default is in production mode, below hacks the way react-scripts does
    if (cmdOption.argv.get('dev') || cmdOption.argv.get('watch')) {
        webpackEnv = 'development';
        console.log('[cra-scripts] Development mode is on:', webpackEnv);
    }
    else {
        process.env.GENERATE_SOURCEMAP = 'false';
    }
    const origWebpackConfig = require('react-scripts/config/webpack.config');
    const config = origWebpackConfig(webpackEnv);
    console.log(`[cra-scripts] output.publicPath: ${config.output.publicPath}`);
    // Make sure babel compiles source folder out side of current src directory
    findAndChangeRule(config.module.rules);
    insertLessLoaderRule(config.module.rules);
    const { dir, packageJson } = build_target_helper_1.findPackage(cmdOption.buildTarget);
    if (cmdOption.buildType === 'app') {
        // TODO: do not hard code
        config.resolve.alias['alias:dr.cra-start-entry'] = packageJson.name + '/' + packageJson.dr['cra-start-entry'];
        console.log(`[cra-scripts] alias:dr.cra-start-entry: ${config.resolve.alias['alias:dr.cra-start-entry']}`);
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
    // TODO: this might be problematic, the one in space top level might not be the right version one
    // if (config.resolve && config.resolve.modules) {
    //   const topModuleDir = Path.resolve('node_modules');
    //   const pwdIdx = config.resolve.modules.findIndex(m => m === topModuleDir);
    //   if (pwdIdx > 0) {
    //     config.resolve.modules.splice(pwdIdx, 1);
    //   }
    //   config.resolve.modules.unshift(topModuleDir);
    // }
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
                const stats = compilation.getStats();
                compilation.assets['stats.json'] = new webpack_sources_1.RawSource(JSON.stringify(stats.toJson('verbose')));
                setTimeout(() => {
                    console.log('[cra-scripts] stats:');
                    console.log(stats.toString('normal'));
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
        console.error(err);
    });
    return config;
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0QkFBNEI7QUFDNUIsNERBQXVCO0FBQ3ZCLHdEQUF3QjtBQUN4QixnRUFBMEI7QUFFMUIscURBQTRDO0FBQzVDLG1DQUE4RDtBQUM5RCwwRUFBbUY7QUFDbkYsd0VBQXVDO0FBQ3ZDLCtEQUFrRDtBQUNsRCw0RUFBeUU7QUFFekUsNkJBQTZCO0FBQzdCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBRzdELE1BQU0saUJBQWlCLEdBQUcsMkNBQTJCLEVBQUUsQ0FBQztBQTRHeEQsU0FBUyxvQkFBb0IsQ0FBQyxTQUF3QjtJQUNwRCxNQUFNLGVBQWUsR0FBMkMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUVwSCwwQ0FBMEM7SUFDMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDL0MsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLEdBQUcsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2IsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLG1CQUFtQixFQUFFO2dCQUNoRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBc0IsQ0FB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QUMsOEJBQThCLEVBQUUsbUJBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ3hFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckIsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9jcmEtc2NyaXB0cy9kaXN0L3dlYnBhY2suY29uZmlnLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7Q29uZmlndXJhdGlvbiwgUnVsZVNldFJ1bGUsIENvbXBpbGVyLCBSdWxlU2V0VXNlSXRlbSwgUnVsZVNldExvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgeyBSYXdTb3VyY2UgfSBmcm9tICd3ZWJwYWNrLXNvdXJjZXMnO1xuaW1wb3J0IHtkcmF3UHVwcHksIHByaW50Q29uZmlnLCBnZXRDbWRPcHRpb25zfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcGFja2FnZS11dGlscyc7XG5pbXBvcnQgY2hhbmdlNGxpYiBmcm9tICcuL3dlYnBhY2stbGliJztcbmltcG9ydCB7ZmluZFBhY2thZ2V9IGZyb20gJy4vYnVpbGQtdGFyZ2V0LWhlbHBlcic7XG5pbXBvcnQge0NvbmZpZ0hhbmRsZXJNZ3J9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge0NvbmZpZ3VyZUhhbmRsZXJ9IGZyb20gJy4vdHlwZXMnO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmNvbnN0IFByb2dyZXNzUGx1Z2luID0gcmVxdWlyZSgnd2VicGFjay9saWIvUHJvZ3Jlc3NQbHVnaW4nKTtcblxuXG5jb25zdCBmaW5kUGFja2FnZUJ5RmlsZSA9IGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpO1xuXG5cbmV4cG9ydCA9IGZ1bmN0aW9uKHdlYnBhY2tFbnY6IHN0cmluZykge1xuXG4gIGRyYXdQdXBweSgnUG9vaW5nIG9uIGNyZWF0ZS1yZWFjdC1hcHAnLCBgSWYgeW91IHdhbnQgdG8ga25vdyBob3cgV2VicGFjayBpcyBjb25maWd1cmVkLCBjaGVjazpcXG4gICR7UGF0aC5yZXNvbHZlKCcvbG9ncycpfWApO1xuXG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcbiAgLy8gY29uc29sZS5sb2coJ3dlYnBhY2tFbnY9Jywgd2VicGFja0Vudik7XG4gIC8vIGBucG0gcnVuIGJ1aWxkYCBieSBkZWZhdWx0IGlzIGluIHByb2R1Y3Rpb24gbW9kZSwgYmVsb3cgaGFja3MgdGhlIHdheSByZWFjdC1zY3JpcHRzIGRvZXNcbiAgaWYgKGNtZE9wdGlvbi5hcmd2LmdldCgnZGV2JykgfHwgY21kT3B0aW9uLmFyZ3YuZ2V0KCd3YXRjaCcpKSB7XG4gICAgd2VicGFja0VudiA9ICdkZXZlbG9wbWVudCc7XG4gICAgY29uc29sZS5sb2coJ1tjcmEtc2NyaXB0c10gRGV2ZWxvcG1lbnQgbW9kZSBpcyBvbjonLCB3ZWJwYWNrRW52KTtcbiAgfSBlbHNlIHtcbiAgICBwcm9jZXNzLmVudi5HRU5FUkFURV9TT1VSQ0VNQVAgPSAnZmFsc2UnO1xuICB9XG4gIGNvbnN0IG9yaWdXZWJwYWNrQ29uZmlnID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvd2VicGFjay5jb25maWcnKTtcbiAgY29uc3QgY29uZmlnOiBDb25maWd1cmF0aW9uID0gb3JpZ1dlYnBhY2tDb25maWcod2VicGFja0Vudik7XG4gIGNvbnNvbGUubG9nKGBbY3JhLXNjcmlwdHNdIG91dHB1dC5wdWJsaWNQYXRoOiAke2NvbmZpZy5vdXRwdXQhLnB1YmxpY1BhdGh9YCk7XG4gIC8vIE1ha2Ugc3VyZSBiYWJlbCBjb21waWxlcyBzb3VyY2UgZm9sZGVyIG91dCBzaWRlIG9mIGN1cnJlbnQgc3JjIGRpcmVjdG9yeVxuICBmaW5kQW5kQ2hhbmdlUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIGluc2VydExlc3NMb2FkZXJSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcblxuICBjb25zdCB7ZGlyLCBwYWNrYWdlSnNvbn0gPSBmaW5kUGFja2FnZShjbWRPcHRpb24uYnVpbGRUYXJnZXQpO1xuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2FwcCcpIHtcbiAgICAvLyBUT0RPOiBkbyBub3QgaGFyZCBjb2RlXG4gICAgY29uZmlnLnJlc29sdmUhLmFsaWFzIVsnYWxpYXM6ZHIuY3JhLXN0YXJ0LWVudHJ5J10gPSBwYWNrYWdlSnNvbi5uYW1lICsgJy8nICsgcGFja2FnZUpzb24uZHJbJ2NyYS1zdGFydC1lbnRyeSddO1xuICAgIGNvbnNvbGUubG9nKGBbY3JhLXNjcmlwdHNdIGFsaWFzOmRyLmNyYS1zdGFydC1lbnRyeTogJHtjb25maWcucmVzb2x2ZSEuYWxpYXMhWydhbGlhczpkci5jcmEtc3RhcnQtZW50cnknXX1gKTtcbiAgfVxuXG5cbiAgLy8gUmVtb3ZlIE1vZHVsZXNTY29wZVBsdWdpbiBmcm9tIHJlc29sdmUgcGx1Z2lucywgaXQgc3RvcHMgdXMgdXNpbmcgc291cmNlIGZvbGQgb3V0IHNpZGUgb2YgcHJvamVjdCBkaXJlY3RvcnlcbiAgaWYgKGNvbmZpZy5yZXNvbHZlICYmIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMpIHtcbiAgICBjb25zdCBNb2R1bGVTY29wZVBsdWdpbiA9IHJlcXVpcmUoJ3JlYWN0LWRldi11dGlscy9Nb2R1bGVTY29wZVBsdWdpbicpO1xuICAgIGNvbnN0IHNyY1Njb3BlUGx1Z2luSWR4ID0gY29uZmlnLnJlc29sdmUucGx1Z2lucy5maW5kSW5kZXgocGx1Z2luID0+IHBsdWdpbiBpbnN0YW5jZW9mIE1vZHVsZVNjb3BlUGx1Z2luKTtcbiAgICBpZiAoc3JjU2NvcGVQbHVnaW5JZHggPj0gMCkge1xuICAgICAgY29uZmlnLnJlc29sdmUucGx1Z2lucy5zcGxpY2Uoc3JjU2NvcGVQbHVnaW5JZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE1vdmUgcHJvamVjdCBub2RlX21vZHVsZXMgdG8gZmlyc3QgcG9zaXRpb24gaW4gcmVzb2x2ZSBvcmRlclxuICAvLyBUT0RPOiB0aGlzIG1pZ2h0IGJlIHByb2JsZW1hdGljLCB0aGUgb25lIGluIHNwYWNlIHRvcCBsZXZlbCBtaWdodCBub3QgYmUgdGhlIHJpZ2h0IHZlcnNpb24gb25lXG4gIC8vIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5tb2R1bGVzKSB7XG4gIC8vICAgY29uc3QgdG9wTW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKTtcbiAgLy8gICBjb25zdCBwd2RJZHggPSBjb25maWcucmVzb2x2ZS5tb2R1bGVzLmZpbmRJbmRleChtID0+IG0gPT09IHRvcE1vZHVsZURpcik7XG4gIC8vICAgaWYgKHB3ZElkeCA+IDApIHtcbiAgLy8gICAgIGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMuc3BsaWNlKHB3ZElkeCwgMSk7XG4gIC8vICAgfVxuICAvLyAgIGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMudW5zaGlmdCh0b3BNb2R1bGVEaXIpO1xuICAvLyB9XG5cbiAgT2JqZWN0LmFzc2lnbihjb25maWcucmVzb2x2ZSEuYWxpYXMsIHJlcXVpcmUoJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJykoKSk7XG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLm9wdGltaXphdGlvbiEuc3BsaXRDaHVua3MsIHtcbiAgICBjaHVua3M6ICdhbGwnLFxuICAgIC8vIG5hbWU6IGZhbHNlLCBkZWZhdWx0IGlzIGZhbHNlIGZvciBwcm9kdWN0aW9uXG4gICAgY2FjaGVHcm91cHM6IHtcbiAgICAgIGxhenlWZW5kb3I6IHtcbiAgICAgICAgbmFtZTogJ2xhenktdmVuZG9yJyxcbiAgICAgICAgY2h1bmtzOiAnYXN5bmMnLFxuICAgICAgICBlbmZvcmNlOiB0cnVlLFxuICAgICAgICB0ZXN0OiAvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10vLCAvLyBUT0RPOiBleGNsdWRlIERyIHBhY2thZ2Ugc291cmNlIGZpbGVcbiAgICAgICAgcHJpb3JpdHk6IDFcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgKGNsYXNzIHtcbiAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdkcmNwLWNsaS1zdGF0cycsIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSBjb21waWxhdGlvbi5nZXRTdGF0cygpO1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbJ3N0YXRzLmpzb24nXSA9IG5ldyBSYXdTb3VyY2UoSlNPTi5zdHJpbmdpZnkoc3RhdHMudG9Kc29uKCd2ZXJib3NlJykpKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1tjcmEtc2NyaXB0c10gc3RhdHM6Jyk7XG4gICAgICAgICAgY29uc29sZS5sb2coc3RhdHMudG9TdHJpbmcoJ25vcm1hbCcpKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgIH0sIDApO1xuICAgICAgICAvLyBjb25zdCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoY29tcGlsYXRpb24uZ2V0U3RhdHMoKS50b0pzb24oJ25vcm1hbCcpKTtcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzWydzdGF0cy5qc29uJ10gPSBuZXcgUmF3U291cmNlKGRhdGEpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KSgpKTtcblxuICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgUHJvZ3Jlc3NQbHVnaW4oeyBwcm9maWxlOiB0cnVlIH0pKTtcblxuICBjb25maWcuc3RhdHMgPSAnbm9ybWFsJzsgLy8gTm90IHdvcmtpbmdcblxuICBjb25zdCBzc3JDb25maWcgPSAoZ2xvYmFsIGFzIGFueSkuX19TU1I7XG4gIGlmIChzc3JDb25maWcpIHtcbiAgICBzc3JDb25maWcoY29uZmlnKTtcbiAgfVxuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnbGliJylcbiAgICBjaGFuZ2U0bGliKGNtZE9wdGlvbi5idWlsZFRhcmdldCwgY29uZmlnKTtcblxuICBjb25zdCBjb25maWdGaWxlSW5QYWNrYWdlID0gUGF0aC5yZXNvbHZlKGRpciwgXy5nZXQocGFja2FnZUpzb24sIFsnZHInLCAnY29uZmlnLW92ZXJyaWRlcy1wYXRoJ10sICdjb25maWctb3ZlcnJpZGVzLnRzJykpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhjb25maWdGaWxlSW5QYWNrYWdlKSkge1xuICAgIGNvbnN0IGNmZ01nciA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFtjb25maWdGaWxlSW5QYWNrYWdlXSk7XG4gICAgY2ZnTWdyLnJ1bkVhY2hTeW5jPENvbmZpZ3VyZUhhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGhhbmRsZXIud2VicGFjayhjb25maWcsIHdlYnBhY2tFbnYsIGNtZE9wdGlvbik7XG4gICAgfSk7XG4gIH1cblxuICBmcy5ta2RpcnBTeW5jKCdsb2dzJyk7XG4gIGZzLndyaXRlRmlsZSgnbG9ncy93ZWJwYWNrLmNvbmZpZy5kZWJ1Zy5qcycsIHByaW50Q29uZmlnKGNvbmZpZyksIChlcnIpID0+IHtcbiAgICBjb25zb2xlLmVycm9yKGVycik7XG4gIH0pO1xuICByZXR1cm4gY29uZmlnO1xufTtcblxuZnVuY3Rpb24gaW5zZXJ0TGVzc0xvYWRlclJ1bGUob3JpZ1J1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IHJ1bGVzQW5kUGFyZW50czogW1J1bGVTZXRSdWxlLCBudW1iZXIsIFJ1bGVTZXRSdWxlW11dW10gPSBvcmlnUnVsZXMubWFwKChydWxlLCBpZHgsIHNldCkgPT4gW3J1bGUsIGlkeCwgc2V0XSk7XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBwcmVmZXItZm9yLW9mXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcnVsZXNBbmRQYXJlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcnVsZSA9IHJ1bGVzQW5kUGFyZW50c1tpXVswXTtcbiAgICBjb25zdCBwYXJlbnRSdWxlcyA9IHJ1bGVzQW5kUGFyZW50c1tpXVsyXTtcbiAgICBjb25zdCBpZHggPSBydWxlc0FuZFBhcmVudHNbaV1bMV07XG4gICAgaWYgKHJ1bGUudGVzdCkge1xuICAgICAgaWYgKHJ1bGUudGVzdC50b1N0cmluZygpID09PSAnL1xcXFwuKHNjc3N8c2FzcykkLycpIHtcbiAgICAgICAgY29uc3QgdXNlID0gcnVsZS51c2UgYXMgUnVsZVNldExvYWRlcltdO1xuICAgICAgICBjb25zdCBwb3N0Q3NzID0gdXNlLmZpbmQoaXRlbSA9PiBpdGVtLmxvYWRlciAmJiBpdGVtLmxvYWRlci5pbmRleE9mKCdwb3N0Y3NzLWxvYWRlcicpID49IDApO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhjaGFsay5yZWRCcmlnaHQoJycgKyBpKSk7XG4gICAgICAgIHBhcmVudFJ1bGVzLnNwbGljZShpZHgsIDAsXG4gICAgICAgICAgY3JlYXRlTGVzc0xvYWRlclJ1bGUocG9zdENzcyEpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChydWxlLm9uZU9mKSB7XG4gICAgICBydWxlLm9uZU9mLmZvckVhY2goKHIsIGlkeCwgbGlzdCkgPT4ge1xuICAgICAgICBydWxlc0FuZFBhcmVudHMucHVzaChbciwgaWR4LCBsaXN0XSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTGVzc0xvYWRlclJ1bGUocG9zdENzc0xvYWRlclJ1bGU6IFJ1bGVTZXRVc2VJdGVtKTogUnVsZVNldFJ1bGUge1xuICByZXR1cm4ge1xuICAgIHRlc3Q6IC9cXC5sZXNzJC8sXG4gICAgdXNlOiBbXG4gICAgICByZXF1aXJlLnJlc29sdmUoJ3N0eWxlLWxvYWRlcicpLFxuICAgICAge1xuICAgICAgICBsb2FkZXI6IHJlcXVpcmUucmVzb2x2ZSgnY3NzLWxvYWRlcicpLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgaW1wb3J0TG9hZGVyczogMixcbiAgICAgICAgICBzb3VyY2VNYXA6IHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCAhPT0gJ2ZhbHNlJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcG9zdENzc0xvYWRlclJ1bGUsXG4gICAgICB7XG4gICAgICAgIGxvYWRlcjogJ2xlc3MtbG9hZGVyJ1xuICAgICAgfVxuICAgIF1cbiAgfTtcbn1cblxuZnVuY3Rpb24gZmluZEFuZENoYW5nZVJ1bGUocnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3QgY3JhUGF0aHMgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy9wYXRocycpO1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcmV0dXJuIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldC5sZW5ndGggOyBpKyspIHtcbiAgICAgIGNvbnN0IHJ1bGUgPSBzZXRbaV07XG4gICAgICBpZiAodHlwZW9mIHJ1bGUgPT09ICdzdHJpbmcnICYmIChydWxlLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fCBydWxlLmluZGV4T2YoJ3VybC1sb2FkZXInKSA+PSAwKSkge1xuICAgICAgICBzZXRbaV0gPSB7XG4gICAgICAgICAgbG9hZGVyOiBydWxlLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG91dHB1dFBhdGgodXJsOiBzdHJpbmcsIHJlc291cmNlUGF0aDogc3RyaW5nLCBjb250ZXh0OiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgICByZXR1cm4gYCR7KHBrID8gcGsuc2hvcnROYW1lIDogJ2V4dGVybmFsJyl9LyR7dXJsfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICgodHlwZW9mIChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikubG9hZGVyKSA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgKCgocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLmxvYWRlciBhcyBzdHJpbmcpLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fFxuICAgICAgICAoKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5sb2FkZXIgYXMgc3RyaW5nKS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMFxuICAgICAgICApKSB7XG4gICAgICAgICgoc2V0W2ldIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikub3B0aW9ucyBhcyBhbnkpIS5vdXRwdXRQYXRoID0gKHVybDogc3RyaW5nLCByZXNvdXJjZVBhdGg6IHN0cmluZywgY29udGV4dDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZVBhdGgpO1xuICAgICAgICAgIHJldHVybiBgJHsocGsgPyBway5zaG9ydE5hbWUgOiAnZXh0ZXJuYWwnKX0vJHt1cmx9YDtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgaWYgKChydWxlIGFzIFJ1bGVTZXRSdWxlKS5pbmNsdWRlICYmIHR5cGVvZiAocnVsZSBhcyBSdWxlU2V0UnVsZSkubG9hZGVyID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAocnVsZSBhcyBSdWxlU2V0TG9hZGVyKS5sb2FkZXIhLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSA+PSAwKSB7XG4gICAgICAgIGRlbGV0ZSAocnVsZSBhcyBSdWxlU2V0UnVsZSkuaW5jbHVkZTtcbiAgICAgICAgY29uc3Qgb3JpZ1Rlc3QgPSAocnVsZSBhcyBSdWxlU2V0UnVsZSkudGVzdDtcbiAgICAgICAgKHJ1bGUgYXMgUnVsZVNldFJ1bGUpLnRlc3QgPSAoZmlsZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHBrID0gZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICAgICAgY29uc3QgeWVzID0gKChwayAmJiBway5kcikgfHwgZmlsZS5zdGFydHNXaXRoKGNyYVBhdGhzLmFwcFNyYykpICYmXG4gICAgICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBSZWdFeHApID8gb3JpZ1Rlc3QudGVzdChmaWxlKSA6XG4gICAgICAgICAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gb3JpZ1Rlc3QoZmlsZSkgOiBvcmlnVGVzdCA9PT0gZmlsZSk7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coYFt3ZWJwYWNrLmNvbmZpZ10gYmFiZWwtbG9hZGVyOiAke2ZpbGV9YCwgeWVzKTtcbiAgICAgICAgICByZXR1cm4geWVzO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG4iXX0=
