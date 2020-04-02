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
    // console.log('webpackEnv=', webpackEnv);
    // `npm run build` by default is in production mode, below hacks the way react-scripts does
    if (cmdOption.argv.get('dev') || cmdOption.argv.get('watch')) {
        webpackEnv = 'development';
        console.log('Development mode is on:', webpackEnv);
    }
    else {
        process.env.GENERATE_SOURCEMAP = 'false';
    }
    const origWebpackConfig = require('react-scripts/config/webpack.config');
    const config = origWebpackConfig(webpackEnv);
    console.log(__filename, config.output.publicPath);
    // Make sure babel compiles source folder out side of current src directory
    findAndChangeRule(config.module.rules);
    insertLessLoaderRule(config.module.rules);
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
                const stats = compilation.getStats();
                compilation.assets['stats.json'] = new webpack_sources_1.RawSource(JSON.stringify(stats.toJson('verbose')));
                setTimeout(() => {
                    console.log('');
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
        // just for debug
    });
    return config;
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0QkFBNEI7QUFDNUIsNERBQXVCO0FBQ3ZCLHdEQUF3QjtBQUN4QixnRUFBMEI7QUFFMUIscURBQTRDO0FBQzVDLG1DQUE4RDtBQUM5RCwwRUFBbUY7QUFDbkYsd0VBQXVDO0FBQ3ZDLCtEQUFrRDtBQUNsRCw0RUFBeUU7QUFFekUsNkJBQTZCO0FBQzdCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBRzdELE1BQU0saUJBQWlCLEdBQUcsMkNBQTJCLEVBQUUsQ0FBQztBQTJHeEQsU0FBUyxvQkFBb0IsQ0FBQyxTQUF3QjtJQUNwRCxNQUFNLGVBQWUsR0FBMkMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUVwSCwwQ0FBMEM7SUFDMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDL0MsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLEdBQUcsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2IsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLG1CQUFtQixFQUFFO2dCQUNoRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBc0IsQ0FB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QUFFO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksaUNBQWdCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBbUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ2hFLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqRCxDQUFDLENBQUMsQ0FBQztLQUNKO0lBRUQsa0JBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEIsa0JBQUUsQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsbUJBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ3hFLGlCQUFpQjtJQUNuQixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3Qvd2VicGFjay5jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtDb25maWd1cmF0aW9uLCBSdWxlU2V0UnVsZSwgQ29tcGlsZXIsIFJ1bGVTZXRVc2VJdGVtLCBSdWxlU2V0TG9hZGVyfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7IFJhd1NvdXJjZSB9IGZyb20gJ3dlYnBhY2stc291cmNlcyc7XG5pbXBvcnQge2RyYXdQdXBweSwgcHJpbnRDb25maWcsIGdldENtZE9wdGlvbnN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXJ9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjaGFuZ2U0bGliIGZyb20gJy4vd2VicGFjay1saWInO1xuaW1wb3J0IHtmaW5kUGFja2FnZX0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbmltcG9ydCB7Q29uZmlnSGFuZGxlck1ncn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7Q29uZmlndXJlSGFuZGxlcn0gZnJvbSAnLi90eXBlcyc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuY29uc3QgUHJvZ3Jlc3NQbHVnaW4gPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9Qcm9ncmVzc1BsdWdpbicpO1xuXG5cbmNvbnN0IGZpbmRQYWNrYWdlQnlGaWxlID0gY3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyKCk7XG5cblxuZXhwb3J0ID0gZnVuY3Rpb24od2VicGFja0Vudjogc3RyaW5nKSB7XG5cbiAgZHJhd1B1cHB5KCdQb29pbmcgb24gY3JlYXRlLXJlYWN0LWFwcCcsIGBJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBXZWJwYWNrIGlzIGNvbmZpZ3VyZWQsIGNoZWNrOlxcbiAgJHtQYXRoLnJlc29sdmUoJy9sb2dzJyl9XFxuICAke19fZmlsZW5hbWV9YCk7XG5cbiAgY29uc3QgY21kT3B0aW9uID0gZ2V0Q21kT3B0aW9ucygpO1xuICAvLyBjb25zb2xlLmxvZygnd2VicGFja0Vudj0nLCB3ZWJwYWNrRW52KTtcbiAgLy8gYG5wbSBydW4gYnVpbGRgIGJ5IGRlZmF1bHQgaXMgaW4gcHJvZHVjdGlvbiBtb2RlLCBiZWxvdyBoYWNrcyB0aGUgd2F5IHJlYWN0LXNjcmlwdHMgZG9lc1xuICBpZiAoY21kT3B0aW9uLmFyZ3YuZ2V0KCdkZXYnKSB8fCBjbWRPcHRpb24uYXJndi5nZXQoJ3dhdGNoJykpIHtcbiAgICB3ZWJwYWNrRW52ID0gJ2RldmVsb3BtZW50JztcbiAgICBjb25zb2xlLmxvZygnRGV2ZWxvcG1lbnQgbW9kZSBpcyBvbjonLCB3ZWJwYWNrRW52KTtcbiAgfSBlbHNlIHtcbiAgICBwcm9jZXNzLmVudi5HRU5FUkFURV9TT1VSQ0VNQVAgPSAnZmFsc2UnO1xuICB9XG4gIGNvbnN0IG9yaWdXZWJwYWNrQ29uZmlnID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvd2VicGFjay5jb25maWcnKTtcbiAgY29uc3QgY29uZmlnOiBDb25maWd1cmF0aW9uID0gb3JpZ1dlYnBhY2tDb25maWcod2VicGFja0Vudik7XG4gIGNvbnNvbGUubG9nKF9fZmlsZW5hbWUsIGNvbmZpZy5vdXRwdXQhLnB1YmxpY1BhdGgpO1xuICAvLyBNYWtlIHN1cmUgYmFiZWwgY29tcGlsZXMgc291cmNlIGZvbGRlciBvdXQgc2lkZSBvZiBjdXJyZW50IHNyYyBkaXJlY3RvcnlcbiAgZmluZEFuZENoYW5nZVJ1bGUoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICBpbnNlcnRMZXNzTG9hZGVyUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG5cbiAgY29uc3Qge2RpciwgcGFja2FnZUpzb259ID0gZmluZFBhY2thZ2UoY21kT3B0aW9uLmJ1aWxkVGFyZ2V0KTtcbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdhcHAnKSB7XG4gICAgLy8gVE9ETzogZG8gbm90IGhhcmQgY29kZVxuICAgIGNvbmZpZy5yZXNvbHZlIS5hbGlhcyFbJ2FsaWFzOmRyLmNyYS1zdGFydC1lbnRyeSddID0gcGFja2FnZUpzb24ubmFtZSArICcvJyArIHBhY2thZ2VKc29uLmRyWydjcmEtc3RhcnQtZW50cnknXTtcbiAgICBjb25zb2xlLmxvZyhwYWNrYWdlSnNvbi5uYW1lICsgJy8nICsgcGFja2FnZUpzb24uZHJbJ2NyYS1zdGFydC1lbnRyeSddKTtcbiAgfVxuXG5cbiAgLy8gUmVtb3ZlIE1vZHVsZXNTY29wZVBsdWdpbiBmcm9tIHJlc29sdmUgcGx1Z2lucywgaXQgc3RvcHMgdXMgdXNpbmcgc291cmNlIGZvbGQgb3V0IHNpZGUgb2YgcHJvamVjdCBkaXJlY3RvcnlcbiAgaWYgKGNvbmZpZy5yZXNvbHZlICYmIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMpIHtcbiAgICBjb25zdCBNb2R1bGVTY29wZVBsdWdpbiA9IHJlcXVpcmUoJ3JlYWN0LWRldi11dGlscy9Nb2R1bGVTY29wZVBsdWdpbicpO1xuICAgIGNvbnN0IHNyY1Njb3BlUGx1Z2luSWR4ID0gY29uZmlnLnJlc29sdmUucGx1Z2lucy5maW5kSW5kZXgocGx1Z2luID0+IHBsdWdpbiBpbnN0YW5jZW9mIE1vZHVsZVNjb3BlUGx1Z2luKTtcbiAgICBpZiAoc3JjU2NvcGVQbHVnaW5JZHggPj0gMCkge1xuICAgICAgY29uZmlnLnJlc29sdmUucGx1Z2lucy5zcGxpY2Uoc3JjU2NvcGVQbHVnaW5JZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE1vdmUgcHJvamVjdCBub2RlX21vZHVsZXMgdG8gZmlyc3QgcG9zaXRpb24gaW4gcmVzb2x2ZSBvcmRlclxuICBpZiAoY29uZmlnLnJlc29sdmUgJiYgY29uZmlnLnJlc29sdmUubW9kdWxlcykge1xuICAgIGNvbnN0IHRvcE1vZHVsZURpciA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJyk7XG4gICAgY29uc3QgcHdkSWR4ID0gY29uZmlnLnJlc29sdmUubW9kdWxlcy5maW5kSW5kZXgobSA9PiBtID09PSB0b3BNb2R1bGVEaXIpO1xuICAgIGlmIChwd2RJZHggPiAwKSB7XG4gICAgICBjb25maWcucmVzb2x2ZS5tb2R1bGVzLnNwbGljZShwd2RJZHgsIDEpO1xuICAgIH1cbiAgICBjb25maWcucmVzb2x2ZS5tb2R1bGVzLnVuc2hpZnQodG9wTW9kdWxlRGlyKTtcbiAgfVxuXG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLnJlc29sdmUhLmFsaWFzLCByZXF1aXJlKCdyeGpzL19lc20yMDE1L3BhdGgtbWFwcGluZycpKCkpO1xuICBPYmplY3QuYXNzaWduKGNvbmZpZy5vcHRpbWl6YXRpb24hLnNwbGl0Q2h1bmtzLCB7XG4gICAgY2h1bmtzOiAnYWxsJyxcbiAgICAvLyBuYW1lOiBmYWxzZSwgZGVmYXVsdCBpcyBmYWxzZSBmb3IgcHJvZHVjdGlvblxuICAgIGNhY2hlR3JvdXBzOiB7XG4gICAgICBsYXp5VmVuZG9yOiB7XG4gICAgICAgIG5hbWU6ICdsYXp5LXZlbmRvcicsXG4gICAgICAgIGNodW5rczogJ2FzeW5jJyxcbiAgICAgICAgZW5mb3JjZTogdHJ1ZSxcbiAgICAgICAgdGVzdDogL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dLywgLy8gVE9ETzogZXhjbHVkZSBEciBwYWNrYWdlIHNvdXJjZSBmaWxlXG4gICAgICAgIHByaW9yaXR5OiAxXG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IChjbGFzcyB7XG4gICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZHJjcC1jbGktc3RhdHMnLCBjb21waWxhdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gY29tcGlsYXRpb24uZ2V0U3RhdHMoKTtcbiAgICAgICAgY29tcGlsYXRpb24uYXNzZXRzWydzdGF0cy5qc29uJ10gPSBuZXcgUmF3U291cmNlKEpTT04uc3RyaW5naWZ5KHN0YXRzLnRvSnNvbigndmVyYm9zZScpKSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhzdGF0cy50b1N0cmluZygnbm9ybWFsJykpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgfSwgMCk7XG4gICAgICAgIC8vIGNvbnN0IGRhdGEgPSBKU09OLnN0cmluZ2lmeShjb21waWxhdGlvbi5nZXRTdGF0cygpLnRvSnNvbignbm9ybWFsJykpO1xuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbJ3N0YXRzLmpzb24nXSA9IG5ldyBSYXdTb3VyY2UoZGF0YSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pKCkpO1xuXG4gIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBQcm9ncmVzc1BsdWdpbih7IHByb2ZpbGU6IHRydWUgfSkpO1xuXG4gIGNvbmZpZy5zdGF0cyA9ICdub3JtYWwnOyAvLyBOb3Qgd29ya2luZ1xuXG4gIGNvbnN0IHNzckNvbmZpZyA9IChnbG9iYWwgYXMgYW55KS5fX1NTUjtcbiAgaWYgKHNzckNvbmZpZykge1xuICAgIHNzckNvbmZpZyhjb25maWcpO1xuICB9XG5cbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdsaWInKVxuICAgIGNoYW5nZTRsaWIoY21kT3B0aW9uLmJ1aWxkVGFyZ2V0LCBjb25maWcpO1xuXG4gIGNvbnN0IGNvbmZpZ0ZpbGVJblBhY2thZ2UgPSBQYXRoLnJlc29sdmUoZGlyLCBfLmdldChwYWNrYWdlSnNvbiwgWydkcicsICdjb25maWctb3ZlcnJpZGVzLXBhdGgnXSwgJ2NvbmZpZy1vdmVycmlkZXMudHMnKSk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGNvbmZpZ0ZpbGVJblBhY2thZ2UpKSB7XG4gICAgY29uc3QgY2ZnTWdyID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoW2NvbmZpZ0ZpbGVJblBhY2thZ2VdKTtcbiAgICBjZmdNZ3IucnVuRWFjaFN5bmM8Q29uZmlndXJlSGFuZGxlcj4oKGNmZ0ZpbGUsIHJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgICAgaGFuZGxlci53ZWJwYWNrKGNvbmZpZywgd2VicGFja0VudiwgY21kT3B0aW9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZzLm1rZGlycFN5bmMoJ2xvZ3MnKTtcbiAgZnMud3JpdGVGaWxlKCdsb2dzL3dlYnBhY2suY29uZmlnLmRlYnVnLmpzJywgcHJpbnRDb25maWcoY29uZmlnKSwgKGVycikgPT4ge1xuICAgIC8vIGp1c3QgZm9yIGRlYnVnXG4gIH0pO1xuICByZXR1cm4gY29uZmlnO1xufTtcblxuZnVuY3Rpb24gaW5zZXJ0TGVzc0xvYWRlclJ1bGUob3JpZ1J1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IHJ1bGVzQW5kUGFyZW50czogW1J1bGVTZXRSdWxlLCBudW1iZXIsIFJ1bGVTZXRSdWxlW11dW10gPSBvcmlnUnVsZXMubWFwKChydWxlLCBpZHgsIHNldCkgPT4gW3J1bGUsIGlkeCwgc2V0XSk7XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBwcmVmZXItZm9yLW9mXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcnVsZXNBbmRQYXJlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcnVsZSA9IHJ1bGVzQW5kUGFyZW50c1tpXVswXTtcbiAgICBjb25zdCBwYXJlbnRSdWxlcyA9IHJ1bGVzQW5kUGFyZW50c1tpXVsyXTtcbiAgICBjb25zdCBpZHggPSBydWxlc0FuZFBhcmVudHNbaV1bMV07XG4gICAgaWYgKHJ1bGUudGVzdCkge1xuICAgICAgaWYgKHJ1bGUudGVzdC50b1N0cmluZygpID09PSAnL1xcXFwuKHNjc3N8c2FzcykkLycpIHtcbiAgICAgICAgY29uc3QgdXNlID0gcnVsZS51c2UgYXMgUnVsZVNldExvYWRlcltdO1xuICAgICAgICBjb25zdCBwb3N0Q3NzID0gdXNlLmZpbmQoaXRlbSA9PiBpdGVtLmxvYWRlciAmJiBpdGVtLmxvYWRlci5pbmRleE9mKCdwb3N0Y3NzLWxvYWRlcicpID49IDApO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhjaGFsay5yZWRCcmlnaHQoJycgKyBpKSk7XG4gICAgICAgIHBhcmVudFJ1bGVzLnNwbGljZShpZHgsIDAsXG4gICAgICAgICAgY3JlYXRlTGVzc0xvYWRlclJ1bGUocG9zdENzcyEpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChydWxlLm9uZU9mKSB7XG4gICAgICBydWxlLm9uZU9mLmZvckVhY2goKHIsIGlkeCwgbGlzdCkgPT4ge1xuICAgICAgICBydWxlc0FuZFBhcmVudHMucHVzaChbciwgaWR4LCBsaXN0XSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTGVzc0xvYWRlclJ1bGUocG9zdENzc0xvYWRlclJ1bGU6IFJ1bGVTZXRVc2VJdGVtKTogUnVsZVNldFJ1bGUge1xuICByZXR1cm4ge1xuICAgIHRlc3Q6IC9cXC5sZXNzJC8sXG4gICAgdXNlOiBbXG4gICAgICByZXF1aXJlLnJlc29sdmUoJ3N0eWxlLWxvYWRlcicpLFxuICAgICAge1xuICAgICAgICBsb2FkZXI6IHJlcXVpcmUucmVzb2x2ZSgnY3NzLWxvYWRlcicpLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgaW1wb3J0TG9hZGVyczogMixcbiAgICAgICAgICBzb3VyY2VNYXA6IHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCAhPT0gJ2ZhbHNlJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcG9zdENzc0xvYWRlclJ1bGUsXG4gICAgICB7XG4gICAgICAgIGxvYWRlcjogJ2xlc3MtbG9hZGVyJ1xuICAgICAgfVxuICAgIF1cbiAgfTtcbn1cblxuZnVuY3Rpb24gZmluZEFuZENoYW5nZVJ1bGUocnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3QgY3JhUGF0aHMgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy9wYXRocycpO1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcmV0dXJuIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldC5sZW5ndGggOyBpKyspIHtcbiAgICAgIGNvbnN0IHJ1bGUgPSBzZXRbaV07XG4gICAgICBpZiAodHlwZW9mIHJ1bGUgPT09ICdzdHJpbmcnICYmIChydWxlLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fCBydWxlLmluZGV4T2YoJ3VybC1sb2FkZXInKSA+PSAwKSkge1xuICAgICAgICBzZXRbaV0gPSB7XG4gICAgICAgICAgbG9hZGVyOiBydWxlLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG91dHB1dFBhdGgodXJsOiBzdHJpbmcsIHJlc291cmNlUGF0aDogc3RyaW5nLCBjb250ZXh0OiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgICByZXR1cm4gYCR7KHBrID8gcGsuc2hvcnROYW1lIDogJ2V4dGVybmFsJyl9LyR7dXJsfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICgodHlwZW9mIChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikubG9hZGVyKSA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgKCgocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLmxvYWRlciBhcyBzdHJpbmcpLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fFxuICAgICAgICAoKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5sb2FkZXIgYXMgc3RyaW5nKS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMFxuICAgICAgICApKSB7XG4gICAgICAgICgoc2V0W2ldIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikub3B0aW9ucyBhcyBhbnkpIS5vdXRwdXRQYXRoID0gKHVybDogc3RyaW5nLCByZXNvdXJjZVBhdGg6IHN0cmluZywgY29udGV4dDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZVBhdGgpO1xuICAgICAgICAgIHJldHVybiBgJHsocGsgPyBway5zaG9ydE5hbWUgOiAnZXh0ZXJuYWwnKX0vJHt1cmx9YDtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgaWYgKChydWxlIGFzIFJ1bGVTZXRSdWxlKS5pbmNsdWRlICYmIHR5cGVvZiAocnVsZSBhcyBSdWxlU2V0UnVsZSkubG9hZGVyID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAocnVsZSBhcyBSdWxlU2V0TG9hZGVyKS5sb2FkZXIhLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSkge1xuICAgICAgICBkZWxldGUgKHJ1bGUgYXMgUnVsZVNldFJ1bGUpLmluY2x1ZGU7XG4gICAgICAgIGNvbnN0IG9yaWdUZXN0ID0gKHJ1bGUgYXMgUnVsZVNldFJ1bGUpLnRlc3Q7XG4gICAgICAgIChydWxlIGFzIFJ1bGVTZXRSdWxlKS50ZXN0ID0gKGZpbGUpID0+IHtcbiAgICAgICAgICBjb25zdCBwayA9IGZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuXG4gICAgICAgICAgY29uc3QgeWVzID0gKChwayAmJiBway5kcikgfHwgZmlsZS5zdGFydHNXaXRoKGNyYVBhdGhzLmFwcFNyYykpICYmXG4gICAgICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBSZWdFeHApID8gb3JpZ1Rlc3QudGVzdChmaWxlKSA6XG4gICAgICAgICAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gb3JpZ1Rlc3QoZmlsZSkgOiBvcmlnVGVzdCA9PT0gZmlsZSk7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coYFt3ZWJwYWNrLmNvbmZpZ10gYmFiZWwtbG9hZGVyOiAke2ZpbGV9YCwgeWVzKTtcbiAgICAgICAgICByZXR1cm4geWVzO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG4iXX0=
