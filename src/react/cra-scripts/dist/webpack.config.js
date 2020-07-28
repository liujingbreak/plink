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
            const _rule = rule;
            if (_rule.include && typeof _rule.loader === 'string' &&
                rule.loader.indexOf(path_1.default.sep + 'babel-loader' + path_1.default.sep) >= 0) {
                delete _rule.include;
                _rule.test = createRuleTestFunc4Src(_rule.test, craPaths.appSrc);
            }
            if (_rule.test && _rule.test.toString() === '/\.(js|mjs|jsx|ts|tsx)$/' &&
                _rule.include) {
                delete _rule.include;
                _rule.test = createRuleTestFunc4Src(_rule.test, craPaths.appSrc);
            }
        }
    }
    return;
}
function createRuleTestFunc4Src(origTest, appSrc) {
    return function testOurSourceFile(file) {
        const pk = findPackageByFile(file);
        const yes = ((pk && pk.dr) || file.startsWith(appSrc)) &&
            (origTest instanceof RegExp) ? origTest.test(file) :
            (origTest instanceof Function ? origTest(file) : origTest === file);
        // console.log(`[webpack.config] babel-loader: ${file}`, yes);
        return yes;
    };
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0QkFBNEI7QUFDNUIsNERBQXVCO0FBQ3ZCLHdEQUF3QjtBQUN4QixnRUFBMEI7QUFFMUIscURBQTRDO0FBQzVDLG1DQUE4RDtBQUM5RCwwRUFBbUY7QUFDbkYsd0VBQXVDO0FBQ3ZDLCtEQUFrRDtBQUNsRCw0RUFBeUU7QUFFekUsNkJBQTZCO0FBQzdCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBRzdELE1BQU0saUJBQWlCLEdBQUcsMkNBQTJCLEVBQUUsQ0FBQztBQTRHeEQsU0FBUyxvQkFBb0IsQ0FBQyxTQUF3QjtJQUNwRCxNQUFNLGVBQWUsR0FBMkMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUVwSCwwQ0FBMEM7SUFDMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDL0MsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLEdBQUcsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2IsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLG1CQUFtQixFQUFFO2dCQUNoRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBc0IsQ0FB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LENBQUMsbUJBQW1CLENBQUMsRUFBRTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGlDQUFnQixDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQW1CLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUNoRSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUVELGtCQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RCLGtCQUFFLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLG1CQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUN4RSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC93ZWJwYWNrLmNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge0NvbmZpZ3VyYXRpb24sIFJ1bGVTZXRSdWxlLCBDb21waWxlciwgUnVsZVNldFVzZUl0ZW0sIFJ1bGVTZXRMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgUmF3U291cmNlIH0gZnJvbSAnd2VicGFjay1zb3VyY2VzJztcbmltcG9ydCB7ZHJhd1B1cHB5LCBwcmludENvbmZpZywgZ2V0Q21kT3B0aW9uc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNoYW5nZTRsaWIgZnJvbSAnLi93ZWJwYWNrLWxpYic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuaW1wb3J0IHtDb25maWdIYW5kbGVyTWdyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtDb25maWd1cmVIYW5kbGVyfSBmcm9tICcuL3R5cGVzJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5jb25zdCBQcm9ncmVzc1BsdWdpbiA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL1Byb2dyZXNzUGx1Z2luJyk7XG5cblxuY29uc3QgZmluZFBhY2thZ2VCeUZpbGUgPSBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKTtcblxuXG5leHBvcnQgPSBmdW5jdGlvbih3ZWJwYWNrRW52OiBzdHJpbmcpIHtcblxuICBkcmF3UHVwcHkoJ1Bvb2luZyBvbiBjcmVhdGUtcmVhY3QtYXBwJywgYElmIHlvdSB3YW50IHRvIGtub3cgaG93IFdlYnBhY2sgaXMgY29uZmlndXJlZCwgY2hlY2s6XFxuICAke1BhdGgucmVzb2x2ZSgnL2xvZ3MnKX1gKTtcblxuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG4gIC8vIGNvbnNvbGUubG9nKCd3ZWJwYWNrRW52PScsIHdlYnBhY2tFbnYpO1xuICAvLyBgbnBtIHJ1biBidWlsZGAgYnkgZGVmYXVsdCBpcyBpbiBwcm9kdWN0aW9uIG1vZGUsIGJlbG93IGhhY2tzIHRoZSB3YXkgcmVhY3Qtc2NyaXB0cyBkb2VzXG4gIGlmIChjbWRPcHRpb24uYXJndi5nZXQoJ2RldicpIHx8IGNtZE9wdGlvbi5hcmd2LmdldCgnd2F0Y2gnKSkge1xuICAgIHdlYnBhY2tFbnYgPSAnZGV2ZWxvcG1lbnQnO1xuICAgIGNvbnNvbGUubG9nKCdbY3JhLXNjcmlwdHNdIERldmVsb3BtZW50IG1vZGUgaXMgb246Jywgd2VicGFja0Vudik7XG4gIH0gZWxzZSB7XG4gICAgcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ2ZhbHNlJztcbiAgfVxuICBjb25zdCBvcmlnV2VicGFja0NvbmZpZyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3dlYnBhY2suY29uZmlnJyk7XG4gIGNvbnN0IGNvbmZpZzogQ29uZmlndXJhdGlvbiA9IG9yaWdXZWJwYWNrQ29uZmlnKHdlYnBhY2tFbnYpO1xuICBjb25zb2xlLmxvZyhgW2NyYS1zY3JpcHRzXSBvdXRwdXQucHVibGljUGF0aDogJHtjb25maWcub3V0cHV0IS5wdWJsaWNQYXRofWApO1xuICAvLyBNYWtlIHN1cmUgYmFiZWwgY29tcGlsZXMgc291cmNlIGZvbGRlciBvdXQgc2lkZSBvZiBjdXJyZW50IHNyYyBkaXJlY3RvcnlcbiAgZmluZEFuZENoYW5nZVJ1bGUoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICBpbnNlcnRMZXNzTG9hZGVyUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG5cbiAgY29uc3Qge2RpciwgcGFja2FnZUpzb259ID0gZmluZFBhY2thZ2UoY21kT3B0aW9uLmJ1aWxkVGFyZ2V0KTtcbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdhcHAnKSB7XG4gICAgLy8gVE9ETzogZG8gbm90IGhhcmQgY29kZVxuICAgIGNvbmZpZy5yZXNvbHZlIS5hbGlhcyFbJ2FsaWFzOmRyLmNyYS1zdGFydC1lbnRyeSddID0gcGFja2FnZUpzb24ubmFtZSArICcvJyArIHBhY2thZ2VKc29uLmRyWydjcmEtc3RhcnQtZW50cnknXTtcbiAgICBjb25zb2xlLmxvZyhgW2NyYS1zY3JpcHRzXSBhbGlhczpkci5jcmEtc3RhcnQtZW50cnk6ICR7Y29uZmlnLnJlc29sdmUhLmFsaWFzIVsnYWxpYXM6ZHIuY3JhLXN0YXJ0LWVudHJ5J119YCk7XG4gIH1cblxuXG4gIC8vIFJlbW92ZSBNb2R1bGVzU2NvcGVQbHVnaW4gZnJvbSByZXNvbHZlIHBsdWdpbnMsIGl0IHN0b3BzIHVzIHVzaW5nIHNvdXJjZSBmb2xkIG91dCBzaWRlIG9mIHByb2plY3QgZGlyZWN0b3J5XG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5wbHVnaW5zKSB7XG4gICAgY29uc3QgTW9kdWxlU2NvcGVQbHVnaW4gPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvTW9kdWxlU2NvcGVQbHVnaW4nKTtcbiAgICBjb25zdCBzcmNTY29wZVBsdWdpbklkeCA9IGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuZmluZEluZGV4KHBsdWdpbiA9PiBwbHVnaW4gaW5zdGFuY2VvZiBNb2R1bGVTY29wZVBsdWdpbik7XG4gICAgaWYgKHNyY1Njb3BlUGx1Z2luSWR4ID49IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuc3BsaWNlKHNyY1Njb3BlUGx1Z2luSWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICAvLyBNb3ZlIHByb2plY3Qgbm9kZV9tb2R1bGVzIHRvIGZpcnN0IHBvc2l0aW9uIGluIHJlc29sdmUgb3JkZXJcbiAgLy8gVE9ETzogdGhpcyBtaWdodCBiZSBwcm9ibGVtYXRpYywgdGhlIG9uZSBpbiBzcGFjZSB0b3AgbGV2ZWwgbWlnaHQgbm90IGJlIHRoZSByaWdodCB2ZXJzaW9uIG9uZVxuICAvLyBpZiAoY29uZmlnLnJlc29sdmUgJiYgY29uZmlnLnJlc29sdmUubW9kdWxlcykge1xuICAvLyAgIGNvbnN0IHRvcE1vZHVsZURpciA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJyk7XG4gIC8vICAgY29uc3QgcHdkSWR4ID0gY29uZmlnLnJlc29sdmUubW9kdWxlcy5maW5kSW5kZXgobSA9PiBtID09PSB0b3BNb2R1bGVEaXIpO1xuICAvLyAgIGlmIChwd2RJZHggPiAwKSB7XG4gIC8vICAgICBjb25maWcucmVzb2x2ZS5tb2R1bGVzLnNwbGljZShwd2RJZHgsIDEpO1xuICAvLyAgIH1cbiAgLy8gICBjb25maWcucmVzb2x2ZS5tb2R1bGVzLnVuc2hpZnQodG9wTW9kdWxlRGlyKTtcbiAgLy8gfVxuXG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLnJlc29sdmUhLmFsaWFzLCByZXF1aXJlKCdyeGpzL19lc20yMDE1L3BhdGgtbWFwcGluZycpKCkpO1xuICBPYmplY3QuYXNzaWduKGNvbmZpZy5vcHRpbWl6YXRpb24hLnNwbGl0Q2h1bmtzLCB7XG4gICAgY2h1bmtzOiAnYWxsJyxcbiAgICAvLyBuYW1lOiBmYWxzZSwgZGVmYXVsdCBpcyBmYWxzZSBmb3IgcHJvZHVjdGlvblxuICAgIGNhY2hlR3JvdXBzOiB7XG4gICAgICBsYXp5VmVuZG9yOiB7XG4gICAgICAgIG5hbWU6ICdsYXp5LXZlbmRvcicsXG4gICAgICAgIGNodW5rczogJ2FzeW5jJyxcbiAgICAgICAgZW5mb3JjZTogdHJ1ZSxcbiAgICAgICAgdGVzdDogL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dLywgLy8gVE9ETzogZXhjbHVkZSBEciBwYWNrYWdlIHNvdXJjZSBmaWxlXG4gICAgICAgIHByaW9yaXR5OiAxXG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IChjbGFzcyB7XG4gICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZHJjcC1jbGktc3RhdHMnLCBjb21waWxhdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gY29tcGlsYXRpb24uZ2V0U3RhdHMoKTtcbiAgICAgICAgY29tcGlsYXRpb24uYXNzZXRzWydzdGF0cy5qc29uJ10gPSBuZXcgUmF3U291cmNlKEpTT04uc3RyaW5naWZ5KHN0YXRzLnRvSnNvbigndmVyYm9zZScpKSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdbY3JhLXNjcmlwdHNdIHN0YXRzOicpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHN0YXRzLnRvU3RyaW5nKCdub3JtYWwnKSk7XG4gICAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgICB9LCAwKTtcbiAgICAgICAgLy8gY29uc3QgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGNvbXBpbGF0aW9uLmdldFN0YXRzKCkudG9Kc29uKCdub3JtYWwnKSk7XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1snc3RhdHMuanNvbiddID0gbmV3IFJhd1NvdXJjZShkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSkoKSk7XG5cbiAgY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IFByb2dyZXNzUGx1Z2luKHsgcHJvZmlsZTogdHJ1ZSB9KSk7XG5cbiAgY29uZmlnLnN0YXRzID0gJ25vcm1hbCc7IC8vIE5vdCB3b3JraW5nXG5cbiAgY29uc3Qgc3NyQ29uZmlnID0gKGdsb2JhbCBhcyBhbnkpLl9fU1NSO1xuICBpZiAoc3NyQ29uZmlnKSB7XG4gICAgc3NyQ29uZmlnKGNvbmZpZyk7XG4gIH1cblxuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2xpYicpXG4gICAgY2hhbmdlNGxpYihjbWRPcHRpb24uYnVpbGRUYXJnZXQsIGNvbmZpZyk7XG5cbiAgY29uc3QgY29uZmlnRmlsZUluUGFja2FnZSA9IFBhdGgucmVzb2x2ZShkaXIsIF8uZ2V0KHBhY2thZ2VKc29uLCBbJ2RyJywgJ2NvbmZpZy1vdmVycmlkZXMtcGF0aCddLCAnY29uZmlnLW92ZXJyaWRlcy50cycpKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoY29uZmlnRmlsZUluUGFja2FnZSkpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxDb25maWd1cmVIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBoYW5kbGVyLndlYnBhY2soY29uZmlnLCB3ZWJwYWNrRW52LCBjbWRPcHRpb24pO1xuICAgIH0pO1xuICB9XG5cbiAgZnMubWtkaXJwU3luYygnbG9ncycpO1xuICBmcy53cml0ZUZpbGUoJ2xvZ3Mvd2VicGFjay5jb25maWcuZGVidWcuanMnLCBwcmludENvbmZpZyhjb25maWcpLCAoZXJyKSA9PiB7XG4gICAgY29uc29sZS5lcnJvcihlcnIpO1xuICB9KTtcbiAgcmV0dXJuIGNvbmZpZztcbn07XG5cbmZ1bmN0aW9uIGluc2VydExlc3NMb2FkZXJSdWxlKG9yaWdSdWxlczogUnVsZVNldFJ1bGVbXSk6IHZvaWQge1xuICBjb25zdCBydWxlc0FuZFBhcmVudHM6IFtSdWxlU2V0UnVsZSwgbnVtYmVyLCBSdWxlU2V0UnVsZVtdXVtdID0gb3JpZ1J1bGVzLm1hcCgocnVsZSwgaWR4LCBzZXQpID0+IFtydWxlLCBpZHgsIHNldF0pO1xuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogcHJlZmVyLWZvci1vZlxuICBmb3IgKGxldCBpID0gMDsgaSA8IHJ1bGVzQW5kUGFyZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHJ1bGUgPSBydWxlc0FuZFBhcmVudHNbaV1bMF07XG4gICAgY29uc3QgcGFyZW50UnVsZXMgPSBydWxlc0FuZFBhcmVudHNbaV1bMl07XG4gICAgY29uc3QgaWR4ID0gcnVsZXNBbmRQYXJlbnRzW2ldWzFdO1xuICAgIGlmIChydWxlLnRlc3QpIHtcbiAgICAgIGlmIChydWxlLnRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLihzY3NzfHNhc3MpJC8nKSB7XG4gICAgICAgIGNvbnN0IHVzZSA9IHJ1bGUudXNlIGFzIFJ1bGVTZXRMb2FkZXJbXTtcbiAgICAgICAgY29uc3QgcG9zdENzcyA9IHVzZS5maW5kKGl0ZW0gPT4gaXRlbS5sb2FkZXIgJiYgaXRlbS5sb2FkZXIuaW5kZXhPZigncG9zdGNzcy1sb2FkZXInKSA+PSAwKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coY2hhbGsucmVkQnJpZ2h0KCcnICsgaSkpO1xuICAgICAgICBwYXJlbnRSdWxlcy5zcGxpY2UoaWR4LCAwLFxuICAgICAgICAgIGNyZWF0ZUxlc3NMb2FkZXJSdWxlKHBvc3RDc3MhKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcnVsZS5vbmVPZi5mb3JFYWNoKChyLCBpZHgsIGxpc3QpID0+IHtcbiAgICAgICAgcnVsZXNBbmRQYXJlbnRzLnB1c2goW3IsIGlkeCwgbGlzdF0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUxlc3NMb2FkZXJSdWxlKHBvc3RDc3NMb2FkZXJSdWxlOiBSdWxlU2V0VXNlSXRlbSk6IFJ1bGVTZXRSdWxlIHtcbiAgcmV0dXJuIHtcbiAgICB0ZXN0OiAvXFwubGVzcyQvLFxuICAgIHVzZTogW1xuICAgICAgcmVxdWlyZS5yZXNvbHZlKCdzdHlsZS1sb2FkZXInKSxcbiAgICAgIHtcbiAgICAgICAgbG9hZGVyOiByZXF1aXJlLnJlc29sdmUoJ2Nzcy1sb2FkZXInKSxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIGltcG9ydExvYWRlcnM6IDIsXG4gICAgICAgICAgc291cmNlTWFwOiBwcm9jZXNzLmVudi5HRU5FUkFURV9TT1VSQ0VNQVAgIT09ICdmYWxzZSdcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHBvc3RDc3NMb2FkZXJSdWxlLFxuICAgICAge1xuICAgICAgICBsb2FkZXI6ICdsZXNzLWxvYWRlcidcbiAgICAgIH1cbiAgICBdXG4gIH07XG59XG5cbmZ1bmN0aW9uIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IGNyYVBhdGhzID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHMnKTtcbiAgLy8gVE9ETzogY2hlY2sgaW4gY2FzZSBDUkEgd2lsbCB1c2UgUnVsZS51c2UgaW5zdGVhZCBvZiBcImxvYWRlclwiXG4gIGNoZWNrU2V0KHJ1bGVzKTtcbiAgZm9yIChjb25zdCBydWxlIG9mIHJ1bGVzKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocnVsZS51c2UpKSB7XG4gICAgICBjaGVja1NldChydWxlLnVzZSk7XG5cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocnVsZS5sb2FkZXIpKSB7XG4gICAgICAgIGNoZWNrU2V0KHJ1bGUubG9hZGVyKTtcbiAgICB9IGVsc2UgaWYgKHJ1bGUub25lT2YpIHtcbiAgICAgIHJldHVybiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlLm9uZU9mKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja1NldChzZXQ6IChSdWxlU2V0UnVsZSB8IFJ1bGVTZXRVc2VJdGVtKVtdKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZXQubGVuZ3RoIDsgaSsrKSB7XG4gICAgICBjb25zdCBydWxlID0gc2V0W2ldO1xuICAgICAgaWYgKHR5cGVvZiBydWxlID09PSAnc3RyaW5nJyAmJiAocnVsZS5pbmRleE9mKCdmaWxlLWxvYWRlcicpID49IDAgfHwgcnVsZS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMCkpIHtcbiAgICAgICAgc2V0W2ldID0ge1xuICAgICAgICAgIGxvYWRlcjogcnVsZSxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBvdXRwdXRQYXRoKHVybDogc3RyaW5nLCByZXNvdXJjZVBhdGg6IHN0cmluZywgY29udGV4dDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBrID0gZmluZFBhY2thZ2VCeUZpbGUocmVzb3VyY2VQYXRoKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGAkeyhwayA/IHBrLnNob3J0TmFtZSA6ICdleHRlcm5hbCcpfS8ke3VybH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAoKHR5cGVvZiAocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLmxvYWRlcikgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICgoKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5sb2FkZXIgYXMgc3RyaW5nKS5pbmRleE9mKCdmaWxlLWxvYWRlcicpID49IDAgfHxcbiAgICAgICAgKChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZigndXJsLWxvYWRlcicpID49IDBcbiAgICAgICAgKSkge1xuICAgICAgICAoKHNldFtpXSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLm9wdGlvbnMgYXMgYW55KSEub3V0cHV0UGF0aCA9ICh1cmw6IHN0cmluZywgcmVzb3VyY2VQYXRoOiBzdHJpbmcsIGNvbnRleHQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgIGNvbnN0IHBrID0gZmluZFBhY2thZ2VCeUZpbGUocmVzb3VyY2VQYXRoKTtcbiAgICAgICAgICByZXR1cm4gYCR7KHBrID8gcGsuc2hvcnROYW1lIDogJ2V4dGVybmFsJyl9LyR7dXJsfWA7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IF9ydWxlID0gcnVsZSBhcyBSdWxlU2V0UnVsZTtcblxuICAgICAgaWYgKF9ydWxlLmluY2x1ZGUgJiYgdHlwZW9mIF9ydWxlLmxvYWRlciA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgKHJ1bGUgYXMgUnVsZVNldExvYWRlcikubG9hZGVyIS5pbmRleE9mKFBhdGguc2VwICsgJ2JhYmVsLWxvYWRlcicgKyBQYXRoLnNlcCkgPj0gMCkge1xuICAgICAgICBkZWxldGUgX3J1bGUuaW5jbHVkZTtcbiAgICAgICAgX3J1bGUudGVzdCA9IGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMoX3J1bGUudGVzdCwgY3JhUGF0aHMuYXBwU3JjKTtcbiAgICAgIH1cbiAgICAgIGlmIChfcnVsZS50ZXN0ICYmIF9ydWxlLnRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXC4oanN8bWpzfGpzeHx0c3x0c3gpJC8nICYmXG4gICAgICAgIF9ydWxlLmluY2x1ZGUpIHtcbiAgICAgICAgICBkZWxldGUgX3J1bGUuaW5jbHVkZTtcbiAgICAgICAgICBfcnVsZS50ZXN0ID0gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhfcnVsZS50ZXN0LCBjcmFQYXRocy5hcHBTcmMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMob3JpZ1Rlc3Q6IFJ1bGVTZXRSdWxlWyd0ZXN0J10sIGFwcFNyYzogc3RyaW5nKSB7XG4gIHJldHVybiBmdW5jdGlvbiB0ZXN0T3VyU291cmNlRmlsZShmaWxlOiBzdHJpbmcpICB7XG4gICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICBjb25zdCB5ZXMgPSAoKHBrICYmIHBrLmRyKSB8fCBmaWxlLnN0YXJ0c1dpdGgoYXBwU3JjKSkgJiZcbiAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCkgPyBvcmlnVGVzdC50ZXN0KGZpbGUpIDpcbiAgICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcmlnVGVzdChmaWxlKSA6IG9yaWdUZXN0ID09PSBmaWxlKTtcbiAgICAvLyBjb25zb2xlLmxvZyhgW3dlYnBhY2suY29uZmlnXSBiYWJlbC1sb2FkZXI6ICR7ZmlsZX1gLCB5ZXMpO1xuICAgIHJldHVybiB5ZXM7XG4gIH07XG59XG4iXX0=
