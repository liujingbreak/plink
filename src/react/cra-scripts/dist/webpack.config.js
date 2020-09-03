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

//# sourceMappingURL=webpack.config.js.map
