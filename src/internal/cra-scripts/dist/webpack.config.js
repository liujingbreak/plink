"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-console */
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const splitChunks_1 = __importDefault(require("@wfh/webpack-common/dist/splitChunks"));
const webpack_stats_plugin_1 = __importDefault(require("@wfh/webpack-common/dist/webpack-stats-plugin"));
const fs_extra_1 = __importDefault(require("fs-extra"));
// import walkPackagesAndSetupInjector from './injector-setup';
const plink_1 = require("@wfh/plink");
const mem_stats_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/mem-stats"));
const path_1 = __importDefault(require("path"));
const __plink_1 = __importDefault(require("__plink"));
const utils_1 = require("./utils");
// import {createLazyPackageFileFinder} from '@wfh/plink/wfh/dist/package-utils';
const webpack_lib_1 = __importDefault(require("./webpack-lib"));
const template_html_plugin_1 = __importDefault(require("@wfh/webpack-common/dist/template-html-plugin"));
const resolve_1 = __importDefault(require("resolve"));
// import {PlinkWebpackResolvePlugin} from '@wfh/webpack-common/dist/webpack-resolve-plugin';
const cra_scripts_setting_1 = require("../isom/cra-scripts-setting");
// import {changeTsConfigFile} from './change-tsconfig';
const log = plink_1.logger.getLogger('@wfh/cra-scripts.webpack-config');
const { nodePath, rootDir } = JSON.parse(process.env.__plink);
/**
 * fork-ts-checker does not work for files outside of workspace which is actually our linked source package
 */
function changeForkTsCheckerPlugin(config) {
    const plugins = config.plugins;
    const cnst = require(resolve_1.default.sync('react-dev-utils/ForkTsCheckerWebpackPlugin', { basedir: path_1.default.resolve('node_modules/react-scripts') }));
    // let forkTsCheckIdx = -1;
    for (let i = 0, l = plugins.length; i < l; i++) {
        if (plugins[i] instanceof cnst) {
            plugins[i].reportFiles = [];
            // forkTsCheckIdx = i;
            break;
        }
    }
    // if (forkTsCheckIdx >= 0) {
    //   plugins.splice(forkTsCheckIdx, 1);
    //   log.info('Remove ForkTsCheckerWebpackPlugin due to its not working with linked files');
    // }
}
/**
 * react-scripts/config/env.js filters NODE_PATH for only allowing relative path, this breaks
 * Plink's NODE_PATH setting.
 */
function reviseNodePathEnv() {
    const { nodePath } = JSON.parse(process.env.__plink);
    process.env.NODE_PATH = nodePath.join(path_1.default.delimiter);
}
/**
 * Help to replace ts, js file by configuration
 */
function appendOurOwnTsLoader(config) {
    const myTsLoaderOpts = {
        tsConfigFile: path_1.default.resolve('tsconfig.json'),
        injector: __plink_1.default.browserInjector,
        compileExpContext: file => {
            const pkg = __plink_1.default.findPackageByFile(file);
            if (pkg) {
                return { __api: __plink_1.default.getNodeApiForPackage(pkg) };
            }
            else {
                return {};
            }
        }
    };
    config.module.rules.push({
        test: createRuleTestFunc4Src(/\.[jt]sx?$/),
        enforce: 'pre',
        use: {
            options: myTsLoaderOpts,
            loader: require.resolve('@wfh/webpack-common/dist/ts-loader')
        }
    });
}
function runConfigHandlers(config, webpackEnv) {
    const { getConfigFileInPackage } = require('./cra-scripts-paths');
    const configFileInPackage = getConfigFileInPackage();
    const cmdOption = utils_1.getCmdOptions();
    if (configFileInPackage) {
        const cfgMgr = new config_handler_1.ConfigHandlerMgr([configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, _result, handler) => {
            if (handler.webpack != null) {
                log.info('Execute Webpack configuration overrides from ', cfgFile);
                handler.webpack(config, webpackEnv, cmdOption);
            }
        }, 'create-react-app Webpack config');
    }
    __plink_1.default.config.configHandlerMgrChanged(mgr => mgr.runEachSync((cfgFile, _result, handler) => {
        if (handler.webpack != null) {
            log.info('Execute command line Webpack configuration overrides', cfgFile);
            handler.webpack(config, webpackEnv, cmdOption);
        }
    }, 'create-react-app Webpack config'));
}
function insertLessLoaderRule(origRules) {
    var _a, _b, _c;
    const oneOf = (_a = origRules.find(rule => rule.oneOf)) === null || _a === void 0 ? void 0 : _a.oneOf;
    // 1. let's take rules for css as a template
    const cssRuleUse = (_b = oneOf.find(subRule => subRule.test instanceof RegExp &&
        subRule.test.source === '\\.css$')) === null || _b === void 0 ? void 0 : _b.use;
    const cssModuleRuleUse = (_c = oneOf.find(subRule => subRule.test instanceof RegExp &&
        subRule.test.source === '\\.module\\.css$')) === null || _c === void 0 ? void 0 : _c.use;
    const lessModuleRule = {
        test: /\.module\.less$/,
        use: createLessRuleUse(cssModuleRuleUse),
        sideEffects: true
    };
    const lessRule = {
        test: /\.less$/,
        // exclude: /\.module\.less$/,
        use: createLessRuleUse(cssRuleUse),
        sideEffects: true
    };
    // Insert at last 2nd position, right before file-loader
    oneOf.splice(oneOf.length - 2, 0, lessModuleRule, lessRule);
    function createLessRuleUse(useItems) {
        return useItems.map(useItem => {
            if (typeof useItem === 'string' || typeof useItem === 'function') {
                return useItem;
            }
            let newUseItem = Object.assign({}, useItem);
            if (useItem.loader && /[\\/]css\-loader[\\/]/.test(useItem.loader)) {
                newUseItem.options = Object.assign(Object.assign({}, (newUseItem.options || {})), { importLoaders: 2 });
            }
            return newUseItem;
        }).concat({
            loader: 'less-loader',
            options: {
                lessOptions: Object.assign({ javascriptEnabled: true }, cra_scripts_setting_1.getSetting().lessLoaderOtherOptions),
                additionalData: cra_scripts_setting_1.getSetting().lessLoaderAdditionalData
            }
        });
    }
}
const fileLoaderOptions = {
    // esModule: false,
    outputPath(url, resourcePath, _context) {
        const pk = __plink_1.default.findPackageByFile(resourcePath);
        return `${(pk ? pk.shortName : 'external')}/${url}`;
    }
};
/**
 *
 * @param rules
 */
function changeFileLoader(rules) {
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
            insertRawLoader(rule.oneOf);
            return changeFileLoader(rule.oneOf);
        }
    }
    function checkSet(set) {
        for (let i = 0; i < set.length; i++) {
            const rule = set[i];
            if (typeof rule === 'string' && (rule.indexOf('file-loader') >= 0 || rule.indexOf('url-loader') >= 0)) {
                set[i] = {
                    loader: rule,
                    options: fileLoaderOptions
                };
            }
            else {
                const ruleSetRule = rule;
                if ((typeof ruleSetRule.loader) === 'string' &&
                    (ruleSetRule.loader.indexOf('file-loader') >= 0 ||
                        ruleSetRule.loader.indexOf('url-loader') >= 0)) {
                    if (ruleSetRule.options) {
                        Object.assign(ruleSetRule.options, fileLoaderOptions);
                    }
                    else {
                        ruleSetRule.options = fileLoaderOptions;
                    }
                }
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
        const pk = __plink_1.default.findPackageByFile(file);
        if (pk == null && file.indexOf('.links') > 0)
            log.warn('createRuleTestFunc4Src', file, pk);
        const yes = ((pk && (pk.json.dr || pk.json.plink)) || (appSrc && file.startsWith(appSrc))) &&
            (origTest instanceof RegExp) ? origTest.test(file) :
            (origTest instanceof Function ? origTest(file) : origTest === file);
        // log.info(`[webpack.config] babel-loader: ${file}`, yes);
        return yes;
    };
}
function insertRawLoader(rules) {
    const htmlLoaderRule = {
        test: /\.html$/,
        use: [
            { loader: 'raw-loader' }
        ]
    };
    rules.push(htmlLoaderRule);
}
/** To support Material-component-web */
function replaceSassLoader(rules) {
    var _a;
    const oneOf = (_a = rules.find(rule => rule.oneOf)) === null || _a === void 0 ? void 0 : _a.oneOf;
    oneOf.filter(subRule => Array.isArray(subRule.use))
        .forEach(subRule => {
        const useItem = subRule.use
            .find(useItem => useItem.loader && /sass-loader/.test(useItem.loader));
        if (useItem != null) {
            useItem.options = {
                implementation: require('sass'),
                webpackImporter: false,
                sourceMap: true,
                sassOptions: {
                    includePaths: ['node_modules', ...nodePath]
                }
            };
        }
    });
}
module.exports = function (webpackEnv) {
    utils_1.drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check: ${__plink_1.default.config.resolve('destDir', 'cra-scripts.report')}`);
    const cmdOption = utils_1.getCmdOptions();
    // `npm run build` by default is in production mode, below hacks the way react-scripts does
    if (cmdOption.devMode || cmdOption.watch) {
        webpackEnv = 'development';
        log.info('Development mode is on:', webpackEnv);
    }
    else {
        // process.env.GENERATE_SOURCEMAP = 'false';
    }
    log.info('webpackEnv :', webpackEnv);
    process.env.INLINE_RUNTIME_CHUNK = 'true';
    const origWebpackConfig = require('react-scripts/config/webpack.config');
    reviseNodePathEnv();
    const { default: craPaths } = require('./cra-scripts-paths');
    const config = origWebpackConfig(webpackEnv);
    if (webpackEnv === 'production') {
        // Try to workaround issue: default InlineChunkPlugin 's test property does not match 
        // CRA's output chunk file name template,
        // when we set optimization.runtimeChunk to "single" instead of default CRA's value
        config.output.filename = 'static/js/[name]-[contenthash:8].js';
        config.output.chunkFilename = 'static/js/[name]-[contenthash:8].chunk.js';
        config.output.devtoolModuleFilenameTemplate =
            info => path_1.default.relative(rootDir, info.absoluteResourcePath).replace(/\\/g, '/');
    }
    else {
        config.output.filename = 'static/js/[name].js';
        config.output.chunkFilename = 'static/js/[name].chunk.js';
    }
    const reportDir = utils_1.getReportDir();
    fs_extra_1.default.mkdirpSync(reportDir);
    fs_extra_1.default.writeFile(path_1.default.resolve(reportDir, 'webpack.config.cra.js'), utils_1.printConfig(config), (err) => {
        if (err)
            log.error('Failed to write ' + path_1.default.resolve(reportDir, 'webpack.config.cra.js'), err);
    });
    // Make sure babel compiles source folder out side of current src directory
    changeFileLoader(config.module.rules);
    replaceSassLoader(config.module.rules);
    appendOurOwnTsLoader(config);
    insertLessLoaderRule(config.module.rules);
    changeForkTsCheckerPlugin(config);
    if (cmdOption.buildType === 'app') {
        config.output.path = craPaths().appBuild;
        // config.devtool = 'source-map';
    }
    // Remove ModulesScopePlugin from resolve plugins, it stops us using source fold out side of project directory
    if (config.resolve && config.resolve.plugins) {
        const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
        const srcScopePluginIdx = config.resolve.plugins.findIndex(plugin => plugin instanceof ModuleScopePlugin);
        if (srcScopePluginIdx >= 0) {
            config.resolve.plugins.splice(srcScopePluginIdx, 1);
        }
    }
    // config.resolve!.symlinks = false;
    const { getPkgOfFile } = plink_1.packageOfFileFactory();
    const resolveModules = ['node_modules', ...nodePath];
    config.resolve.modules = resolveModules;
    if (config.resolveLoader == null)
        config.resolveLoader = {};
    config.resolveLoader.modules = resolveModules;
    config.resolveLoader.symlinks = false;
    if (config.resolve.plugins == null) {
        config.resolve.plugins = [];
    }
    // config.resolve!.plugins.unshift(new PlinkWebpackResolvePlugin());
    Object.assign(config.resolve.alias, require('rxjs/_esm2015/path-mapping')());
    if (cmdOption.cmd === 'cra-build')
        config.plugins.push(new webpack_stats_plugin_1.default());
    // config.plugins!.push(new ProgressPlugin({ profile: true }));
    if (cmdOption.buildType === 'lib') {
        webpack_lib_1.default(cmdOption.buildTarget, config, nodePath);
    }
    else {
        config.plugins.unshift(new template_html_plugin_1.default());
        config.plugins.push(new (class {
            apply(compiler) {
                compiler.hooks.done.tap('cra-scripts', _stats => {
                    // if (/(^|\s)--expose-gc(\s|$)/.test(process.env.NODE_OPTIONS!) ||
                    //   )
                    if (global.gc)
                        global.gc();
                    mem_stats_1.default();
                });
            }
        })());
        splitChunks_1.default(config, (mod) => {
            const file = mod.nameForCondition ? mod.nameForCondition() : null;
            if (file == null)
                return true;
            const pkg = getPkgOfFile(file);
            return pkg == null || (pkg.json.dr == null && pkg.json.plink == null);
        });
    }
    runConfigHandlers(config, webpackEnv);
    log.debug(`output.publicPath: ${config.output.publicPath}`);
    fs_extra_1.default.writeFileSync(path_1.default.resolve(reportDir, 'webpack.config.plink.js'), utils_1.printConfig(config));
    // changeTsConfigFile();
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsd0RBQXdEO0FBQ3hELDREQUE0RDtBQUM1RCwrQkFBK0I7QUFDL0IsdUVBQXNFO0FBRXRFLHVGQUFvRTtBQUNwRSx5R0FBd0U7QUFFeEUsd0RBQTBCO0FBRTFCLCtEQUErRDtBQUMvRCxzQ0FBd0Q7QUFDeEQsb0ZBQTJEO0FBQzNELGdEQUF3QjtBQUV4QixzREFBMEI7QUFHMUIsbUNBQTZFO0FBQzdFLGlGQUFpRjtBQUNqRixnRUFBdUM7QUFFdkMseUdBQStFO0FBQy9FLHNEQUFrQztBQUNsQyw2RkFBNkY7QUFDN0YscUVBQXVEO0FBQ3ZELHdEQUF3RDtBQUV4RCxNQUFNLEdBQUcsR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7QUFDaEUsTUFBTSxFQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBUSxDQUFhLENBQUM7QUFvSHpFOztHQUVHO0FBQ0gsU0FBUyx5QkFBeUIsQ0FBQyxNQUFxQjtJQUN0RCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBUSxDQUFDO0lBQ2hDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxpQkFBVyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFDaEYsRUFBQyxPQUFPLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELDJCQUEyQjtJQUMzQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzlDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZLElBQUksRUFBRTtZQUM3QixPQUFPLENBQUMsQ0FBQyxDQUFTLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztZQUNyQyxzQkFBc0I7WUFDdEIsTUFBTTtTQUNQO0tBQ0Y7SUFDRCw2QkFBNkI7SUFDN0IsdUNBQXVDO0lBQ3ZDLDRGQUE0RjtJQUM1RixJQUFJO0FBQ04sQ0FBQztBQUNEOzs7R0FHRztBQUNILFNBQVMsaUJBQWlCO0lBQ3hCLE1BQU0sRUFBQyxRQUFRLEVBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBUSxDQUFhLENBQUM7SUFDaEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDeEQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxvQkFBb0IsQ0FBQyxNQUFxQjtJQUNqRCxNQUFNLGNBQWMsR0FBaUI7UUFDbkMsWUFBWSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDO1FBQzNDLFFBQVEsRUFBRSxpQkFBRyxDQUFDLGVBQWU7UUFDN0IsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDeEIsTUFBTSxHQUFHLEdBQUcsaUJBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4QyxJQUFJLEdBQUcsRUFBRTtnQkFDUCxPQUFPLEVBQUMsS0FBSyxFQUFFLGlCQUFHLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQzthQUMvQztpQkFBTTtnQkFDTCxPQUFPLEVBQUUsQ0FBQzthQUNYO1FBQ0gsQ0FBQztLQUNGLENBQUM7SUFDRixNQUFNLENBQUMsTUFBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDeEIsSUFBSSxFQUFFLHNCQUFzQixDQUFDLFlBQVksQ0FBQztRQUMxQyxPQUFPLEVBQUUsS0FBSztRQUNkLEdBQUcsRUFBRTtZQUNILE9BQU8sRUFBRSxjQUFjO1lBQ3ZCLE1BQU0sRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLG9DQUFvQyxDQUFDO1NBQzlEO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsTUFBcUIsRUFBRSxVQUFrQjtJQUNsRSxNQUFNLEVBQUMsc0JBQXNCLEVBQUMsR0FBcUIsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDbEYsTUFBTSxtQkFBbUIsR0FBRyxzQkFBc0IsRUFBRSxDQUFDO0lBQ3JELE1BQU0sU0FBUyxHQUFHLHFCQUFhLEVBQUUsQ0FBQztJQUNsQyxJQUFJLG1CQUFtQixFQUFFO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksaUNBQWdCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBc0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ3BFLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7Z0JBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsK0NBQStDLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ25FLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQzthQUNoRDtRQUNILENBQUMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO0tBQ3ZDO0lBQ0QsaUJBQUcsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFzQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDM0csSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRTtZQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsU0FBd0I7O0lBQ3BELE1BQU0sS0FBSyxHQUFHLE1BQUEsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsMENBQUUsS0FBTSxDQUFDO0lBQ3pELDRDQUE0QztJQUM1QyxNQUFNLFVBQVUsR0FBRyxNQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxZQUFZLE1BQU07UUFDcEUsT0FBTyxDQUFDLElBQWUsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDLDBDQUFFLEdBQXVCLENBQUM7SUFFMUUsTUFBTSxnQkFBZ0IsR0FBRyxNQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxZQUFZLE1BQU07UUFDMUUsT0FBTyxDQUFDLElBQWUsQ0FBQyxNQUFNLEtBQUssa0JBQWtCLENBQUMsMENBQUUsR0FBdUIsQ0FBQztJQUVuRixNQUFNLGNBQWMsR0FBZ0I7UUFDbEMsSUFBSSxFQUFFLGlCQUFpQjtRQUN2QixHQUFHLEVBQUUsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUM7UUFDeEMsV0FBVyxFQUFFLElBQUk7S0FDbEIsQ0FBQztJQUVGLE1BQU0sUUFBUSxHQUFnQjtRQUM1QixJQUFJLEVBQUUsU0FBUztRQUNmLDhCQUE4QjtRQUM5QixHQUFHLEVBQUUsaUJBQWlCLENBQUMsVUFBVSxDQUFDO1FBQ2xDLFdBQVcsRUFBRSxJQUFJO0tBQ2xCLENBQUM7SUFFRix3REFBd0Q7SUFDeEQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRTNELFNBQVMsaUJBQWlCLENBQUMsUUFBMEI7UUFDbkQsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQzVCLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxJQUFJLE9BQU8sT0FBTyxLQUFLLFVBQVUsRUFBRTtnQkFDaEUsT0FBTyxPQUFPLENBQUM7YUFDaEI7WUFDRCxJQUFJLFVBQVUscUJBQXNCLE9BQU8sQ0FBQyxDQUFDO1lBQzdDLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNsRSxVQUFVLENBQUMsT0FBTyxtQ0FDYixDQUFDLFVBQVUsQ0FBQyxPQUFjLElBQUksRUFBRSxDQUFDLEtBQ3BDLGFBQWEsRUFBRSxDQUFDLEdBQ2pCLENBQUM7YUFDSDtZQUNELE9BQU8sVUFBVSxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUNSLE1BQU0sRUFBRSxhQUFhO1lBQ3JCLE9BQU8sRUFBRTtnQkFDUCxXQUFXLGtCQUNULGlCQUFpQixFQUFFLElBQUksSUFDcEIsZ0NBQVUsRUFBRSxDQUFDLHNCQUFzQixDQUN2QztnQkFDRCxjQUFjLEVBQUUsZ0NBQVUsRUFBRSxDQUFDLHdCQUF3QjthQUN0RDtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxpQkFBaUIsR0FBRztJQUN4QixtQkFBbUI7SUFDbkIsVUFBVSxDQUFDLEdBQVcsRUFBRSxZQUFvQixFQUFFLFFBQWdCO1FBQzVELE1BQU0sRUFBRSxHQUFHLGlCQUFHLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0MsT0FBTyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUN0RCxDQUFDO0NBQ0YsQ0FBQztBQUVGOzs7R0FHRztBQUNILFNBQVMsZ0JBQWdCLENBQUMsS0FBb0I7SUFDNUMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7SUFDdkQsZ0VBQWdFO0lBQ2hFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtRQUN4QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzNCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FFcEI7YUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ25DLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDekI7YUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDckIsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QixPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNyQztLQUNGO0lBRUQsU0FBUyxRQUFRLENBQUMsR0FBcUM7UUFDckQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUcsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXBCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtnQkFDckcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHO29CQUNQLE1BQU0sRUFBRSxJQUFJO29CQUNaLE9BQU8sRUFBRSxpQkFBaUI7aUJBQzNCLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxNQUFNLFdBQVcsR0FBRyxJQUFtQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssUUFBUTtvQkFDN0MsQ0FBRSxXQUFXLENBQUMsTUFBaUIsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQzt3QkFDMUQsV0FBVyxDQUFDLE1BQWlCLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FDeEQsRUFBRTtvQkFDRCxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUU7d0JBQ3ZCLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO3FCQUN2RDt5QkFBTTt3QkFDTCxXQUFXLENBQUMsT0FBTyxHQUFHLGlCQUFpQixDQUFDO3FCQUN6QztpQkFDRjthQUNGO1lBR0QsTUFBTSxLQUFLLEdBQUcsSUFBbUIsQ0FBQztZQUVsQyxJQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksT0FBTyxLQUFLLENBQUMsTUFBTSxLQUFLLFFBQVE7Z0JBQ2xELElBQXNCLENBQUMsTUFBTyxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsR0FBRyxHQUFHLGNBQWMsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNwRixPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUM7Z0JBQ3JCLEtBQUssQ0FBQyxJQUFJLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDbEU7WUFDRCxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSywwQkFBMEI7Z0JBQ3BFLEtBQUssQ0FBQyxPQUFPLEVBQUU7Z0JBQ2IsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDO2dCQUNyQixLQUFLLENBQUMsSUFBSSxHQUFHLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3BFO1NBQ0Y7SUFDSCxDQUFDO0lBQ0QsT0FBTztBQUNULENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLFFBQTZCLEVBQUUsTUFBZTtJQUM1RSxPQUFPLFNBQVMsaUJBQWlCLENBQUMsSUFBWTtRQUM1QyxNQUFNLEVBQUUsR0FBRyxpQkFBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLElBQUksRUFBRSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7WUFDMUMsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDL0MsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDeEYsQ0FBQyxRQUFRLFlBQVksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRCxDQUFDLFFBQVEsWUFBWSxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDO1FBQ3hFLDJEQUEyRDtRQUMzRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxLQUFvQjtJQUMzQyxNQUFNLGNBQWMsR0FBRztRQUNyQixJQUFJLEVBQUUsU0FBUztRQUNmLEdBQUcsRUFBRTtZQUNILEVBQUMsTUFBTSxFQUFFLFlBQVksRUFBQztTQUN2QjtLQUNGLENBQUM7SUFDRixLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdCLENBQUM7QUFFRCx3Q0FBd0M7QUFDeEMsU0FBUyxpQkFBaUIsQ0FBQyxLQUFvQjs7SUFDN0MsTUFBTSxLQUFLLEdBQUcsTUFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQywwQ0FBRSxLQUFNLENBQUM7SUFDckQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2hELE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNqQixNQUFNLE9BQU8sR0FBSSxPQUFPLENBQUMsR0FBdUI7YUFDL0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtZQUNuQixPQUFPLENBQUMsT0FBTyxHQUFHO2dCQUNoQixjQUFjLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDL0IsZUFBZSxFQUFFLEtBQUs7Z0JBQ3RCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFdBQVcsRUFBRTtvQkFDWCxZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsR0FBRyxRQUFRLENBQUM7aUJBQzVDO2FBQ0YsQ0FBQztTQUNIO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBL1ZELGlCQUFTLFVBQVMsVUFBd0M7SUFDeEQsaUJBQVMsQ0FBQyw0QkFBNEIsRUFBRSx5REFBeUQsaUJBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUV4SixNQUFNLFNBQVMsR0FBRyxxQkFBYSxFQUFFLENBQUM7SUFDbEMsMkZBQTJGO0lBQzNGLElBQUksU0FBUyxDQUFDLE9BQU8sSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFO1FBQ3hDLFVBQVUsR0FBRyxhQUFhLENBQUM7UUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxVQUFVLENBQUMsQ0FBQztLQUNqRDtTQUFNO1FBQ0wsNENBQTRDO0tBQzdDO0lBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsR0FBRyxNQUFNLENBQUM7SUFDMUMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMscUNBQXFDLENBQUMsQ0FBQztJQUN6RSxpQkFBaUIsRUFBRSxDQUFDO0lBRXBCLE1BQU0sRUFBQyxPQUFPLEVBQUUsUUFBUSxFQUFDLEdBQXFCLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBRTdFLE1BQU0sTUFBTSxHQUFrQixpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1RCxJQUFJLFVBQVUsS0FBSyxZQUFZLEVBQUU7UUFDL0Isc0ZBQXNGO1FBQ3RGLHlDQUF5QztRQUN6QyxtRkFBbUY7UUFDbkYsTUFBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLEdBQUcscUNBQXFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLE1BQU8sQ0FBQyxhQUFhLEdBQUcsMkNBQTJDLENBQUM7UUFDM0UsTUFBTSxDQUFDLE1BQU8sQ0FBQyw2QkFBNkI7WUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ2pGO1NBQU07UUFDTCxNQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQztRQUNoRCxNQUFNLENBQUMsTUFBTyxDQUFDLGFBQWEsR0FBRywyQkFBMkIsQ0FBQztLQUM1RDtJQUVELE1BQU0sU0FBUyxHQUFHLG9CQUFZLEVBQUUsQ0FBQztJQUNqQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6QixrQkFBRSxDQUFDLFNBQVMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLG1CQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUMxRixJQUFJLEdBQUc7WUFDTCxHQUFHLENBQUMsS0FBSyxDQUFDLGtCQUFrQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHVCQUF1QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7SUFFSCwyRUFBMkU7SUFDM0UsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLE1BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsTUFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzdCLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxNQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0MseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFbEMsSUFBSSxTQUFTLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtRQUNqQyxNQUFNLENBQUMsTUFBTyxDQUFDLElBQUksR0FBRyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7UUFDMUMsaUNBQWlDO0tBQ2xDO0lBRUQsOEdBQThHO0lBQzlHLElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtRQUM1QyxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxZQUFZLGlCQUFpQixDQUFDLENBQUM7UUFDMUcsSUFBSSxpQkFBaUIsSUFBSSxDQUFDLEVBQUU7WUFDMUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3JEO0tBQ0Y7SUFFRCxvQ0FBb0M7SUFDcEMsTUFBTSxFQUFDLFlBQVksRUFBQyxHQUFHLDRCQUFvQixFQUFFLENBQUM7SUFFOUMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQztJQUNyRCxNQUFNLENBQUMsT0FBUSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUM7SUFDekMsSUFBSSxNQUFNLENBQUMsYUFBYSxJQUFJLElBQUk7UUFDOUIsTUFBTSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7SUFDNUIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFDO0lBQzlDLE1BQU0sQ0FBQyxhQUFhLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztJQUV0QyxJQUFJLE1BQU0sQ0FBQyxPQUFRLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRTtRQUNuQyxNQUFNLENBQUMsT0FBUSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7S0FDOUI7SUFDRCxvRUFBb0U7SUFFcEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBUSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsNEJBQTRCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFOUUsSUFBSSxTQUFTLENBQUMsR0FBRyxLQUFLLFdBQVc7UUFDL0IsTUFBTSxDQUFDLE9BQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSw4QkFBVyxFQUFFLENBQUMsQ0FBQztJQUMxQywrREFBK0Q7SUFFL0QsSUFBSSxTQUFTLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtRQUNqQyxxQkFBVSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQ3JEO1NBQU07UUFDTCxNQUFNLENBQUMsT0FBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLDhCQUFrQixFQUFFLENBQUMsQ0FBQztRQUVsRCxNQUFNLENBQUMsT0FBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDeEIsS0FBSyxDQUFDLFFBQWtCO2dCQUN0QixRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxFQUFFO29CQUM5QyxtRUFBbUU7b0JBQ25FLE1BQU07b0JBQ04sSUFBSSxNQUFNLENBQUMsRUFBRTt3QkFDWCxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ2QsbUJBQVEsRUFBRSxDQUFDO2dCQUNiLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztTQUNGLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDTixxQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMvQixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDbEUsSUFBSSxJQUFJLElBQUksSUFBSTtnQkFDZCxPQUFPLElBQUksQ0FBQztZQUNkLE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQixPQUFPLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLENBQUM7UUFDeEUsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUVELGlCQUFpQixDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN0QyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixNQUFNLENBQUMsTUFBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDN0Qsa0JBQUUsQ0FBQyxhQUFhLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUseUJBQXlCLENBQUMsRUFBRSxtQkFBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFMUYsd0JBQXdCO0lBQ3hCLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnQgKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7IENvbmZpZ0hhbmRsZXJNZ3IgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB0eXBlIHsgUGxpbmtFbnYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCc7XG5pbXBvcnQgc2V0dXBTcGxpdENodW5rcyBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3Qvc3BsaXRDaHVua3MnO1xuaW1wb3J0IFN0YXRzUGx1Z2luIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC93ZWJwYWNrLXN0YXRzLXBsdWdpbic7XG5pbXBvcnQgeyBPcHRpb25zIGFzIFRzTG9hZGVyT3B0cyB9IGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC90cy1sb2FkZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvciBmcm9tICcuL2luamVjdG9yLXNldHVwJztcbmltcG9ydCB7bG9nZ2VyLCBwYWNrYWdlT2ZGaWxlRmFjdG9yeX0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgbWVtU3RhdHMgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBDb25maWd1cmF0aW9uLCBSdWxlU2V0TG9hZGVyLCBSdWxlU2V0UnVsZSwgUnVsZVNldFVzZUl0ZW0sIENvbXBpbGVyIH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnO1xuLy8gaW1wb3J0IHsgZmluZFBhY2thZ2UgfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuaW1wb3J0IHsgUmVhY3RTY3JpcHRzSGFuZGxlciB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgZHJhd1B1cHB5LCBnZXRDbWRPcHRpb25zLCBwcmludENvbmZpZyxnZXRSZXBvcnREaXIgfSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNoYW5nZTRsaWIgZnJvbSAnLi93ZWJwYWNrLWxpYic7XG5pbXBvcnQgKiBhcyBfY3JhUGF0aHMgZnJvbSAnLi9jcmEtc2NyaXB0cy1wYXRocyc7XG5pbXBvcnQgVGVtcGxhdGVIdG1sUGx1Z2luIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC90ZW1wbGF0ZS1odG1sLXBsdWdpbic7XG5pbXBvcnQgbm9kZVJlc29sdmUgZnJvbSAncmVzb2x2ZSc7XG4vLyBpbXBvcnQge1BsaW5rV2VicGFja1Jlc29sdmVQbHVnaW59IGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC93ZWJwYWNrLXJlc29sdmUtcGx1Z2luJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9jcmEtc2NyaXB0cy1zZXR0aW5nJztcbi8vIGltcG9ydCB7Y2hhbmdlVHNDb25maWdGaWxlfSBmcm9tICcuL2NoYW5nZS10c2NvbmZpZyc7XG5cbmNvbnN0IGxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0B3ZmgvY3JhLXNjcmlwdHMud2VicGFjay1jb25maWcnKTtcbmNvbnN0IHtub2RlUGF0aCwgcm9vdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxuZXhwb3J0ID0gZnVuY3Rpb24od2VicGFja0VudjogJ3Byb2R1Y3Rpb24nIHwgJ2RldmVsb3BtZW50Jykge1xuICBkcmF3UHVwcHkoJ1Bvb2luZyBvbiBjcmVhdGUtcmVhY3QtYXBwJywgYElmIHlvdSB3YW50IHRvIGtub3cgaG93IFdlYnBhY2sgaXMgY29uZmlndXJlZCwgY2hlY2s6ICR7YXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2NyYS1zY3JpcHRzLnJlcG9ydCcpfWApO1xuXG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcbiAgLy8gYG5wbSBydW4gYnVpbGRgIGJ5IGRlZmF1bHQgaXMgaW4gcHJvZHVjdGlvbiBtb2RlLCBiZWxvdyBoYWNrcyB0aGUgd2F5IHJlYWN0LXNjcmlwdHMgZG9lc1xuICBpZiAoY21kT3B0aW9uLmRldk1vZGUgfHwgY21kT3B0aW9uLndhdGNoKSB7XG4gICAgd2VicGFja0VudiA9ICdkZXZlbG9wbWVudCc7XG4gICAgbG9nLmluZm8oJ0RldmVsb3BtZW50IG1vZGUgaXMgb246Jywgd2VicGFja0Vudik7XG4gIH0gZWxzZSB7XG4gICAgLy8gcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ2ZhbHNlJztcbiAgfVxuICBsb2cuaW5mbygnd2VicGFja0VudiA6Jywgd2VicGFja0Vudik7XG4gIHByb2Nlc3MuZW52LklOTElORV9SVU5USU1FX0NIVU5LID0gJ3RydWUnO1xuICBjb25zdCBvcmlnV2VicGFja0NvbmZpZyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3dlYnBhY2suY29uZmlnJyk7XG4gIHJldmlzZU5vZGVQYXRoRW52KCk7XG5cbiAgY29uc3Qge2RlZmF1bHQ6IGNyYVBhdGhzfTogdHlwZW9mIF9jcmFQYXRocyA9IHJlcXVpcmUoJy4vY3JhLXNjcmlwdHMtcGF0aHMnKTtcblxuICBjb25zdCBjb25maWc6IENvbmZpZ3VyYXRpb24gPSBvcmlnV2VicGFja0NvbmZpZyh3ZWJwYWNrRW52KTtcbiAgaWYgKHdlYnBhY2tFbnYgPT09ICdwcm9kdWN0aW9uJykge1xuICAgIC8vIFRyeSB0byB3b3JrYXJvdW5kIGlzc3VlOiBkZWZhdWx0IElubGluZUNodW5rUGx1Z2luICdzIHRlc3QgcHJvcGVydHkgZG9lcyBub3QgbWF0Y2ggXG4gICAgLy8gQ1JBJ3Mgb3V0cHV0IGNodW5rIGZpbGUgbmFtZSB0ZW1wbGF0ZSxcbiAgICAvLyB3aGVuIHdlIHNldCBvcHRpbWl6YXRpb24ucnVudGltZUNodW5rIHRvIFwic2luZ2xlXCIgaW5zdGVhZCBvZiBkZWZhdWx0IENSQSdzIHZhbHVlXG4gICAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnc3RhdGljL2pzL1tuYW1lXS1bY29udGVudGhhc2g6OF0uanMnO1xuICAgIGNvbmZpZy5vdXRwdXQhLmNodW5rRmlsZW5hbWUgPSAnc3RhdGljL2pzL1tuYW1lXS1bY29udGVudGhhc2g6OF0uY2h1bmsuanMnO1xuICAgIGNvbmZpZy5vdXRwdXQhLmRldnRvb2xNb2R1bGVGaWxlbmFtZVRlbXBsYXRlID1cbiAgICAgIGluZm8gPT4gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBpbmZvLmFic29sdXRlUmVzb3VyY2VQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIH0gZWxzZSB7XG4gICAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnc3RhdGljL2pzL1tuYW1lXS5qcyc7XG4gICAgY29uZmlnLm91dHB1dCEuY2h1bmtGaWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLmNodW5rLmpzJztcbiAgfVxuXG4gIGNvbnN0IHJlcG9ydERpciA9IGdldFJlcG9ydERpcigpO1xuICBmcy5ta2RpcnBTeW5jKHJlcG9ydERpcik7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcuY3JhLmpzJyksIHByaW50Q29uZmlnKGNvbmZpZyksIChlcnIpID0+IHtcbiAgICBpZiAoZXJyKVxuICAgICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgJyArIFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICd3ZWJwYWNrLmNvbmZpZy5jcmEuanMnKSwgZXJyKTtcbiAgfSk7XG5cbiAgLy8gTWFrZSBzdXJlIGJhYmVsIGNvbXBpbGVzIHNvdXJjZSBmb2xkZXIgb3V0IHNpZGUgb2YgY3VycmVudCBzcmMgZGlyZWN0b3J5XG4gIGNoYW5nZUZpbGVMb2FkZXIoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICByZXBsYWNlU2Fzc0xvYWRlcihjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIGFwcGVuZE91ck93blRzTG9hZGVyKGNvbmZpZyk7XG4gIGluc2VydExlc3NMb2FkZXJSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcbiAgY2hhbmdlRm9ya1RzQ2hlY2tlclBsdWdpbihjb25maWcpO1xuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnYXBwJykge1xuICAgIGNvbmZpZy5vdXRwdXQhLnBhdGggPSBjcmFQYXRocygpLmFwcEJ1aWxkO1xuICAgIC8vIGNvbmZpZy5kZXZ0b29sID0gJ3NvdXJjZS1tYXAnO1xuICB9XG5cbiAgLy8gUmVtb3ZlIE1vZHVsZXNTY29wZVBsdWdpbiBmcm9tIHJlc29sdmUgcGx1Z2lucywgaXQgc3RvcHMgdXMgdXNpbmcgc291cmNlIGZvbGQgb3V0IHNpZGUgb2YgcHJvamVjdCBkaXJlY3RvcnlcbiAgaWYgKGNvbmZpZy5yZXNvbHZlICYmIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMpIHtcbiAgICBjb25zdCBNb2R1bGVTY29wZVBsdWdpbiA9IHJlcXVpcmUoJ3JlYWN0LWRldi11dGlscy9Nb2R1bGVTY29wZVBsdWdpbicpO1xuICAgIGNvbnN0IHNyY1Njb3BlUGx1Z2luSWR4ID0gY29uZmlnLnJlc29sdmUucGx1Z2lucy5maW5kSW5kZXgocGx1Z2luID0+IHBsdWdpbiBpbnN0YW5jZW9mIE1vZHVsZVNjb3BlUGx1Z2luKTtcbiAgICBpZiAoc3JjU2NvcGVQbHVnaW5JZHggPj0gMCkge1xuICAgICAgY29uZmlnLnJlc29sdmUucGx1Z2lucy5zcGxpY2Uoc3JjU2NvcGVQbHVnaW5JZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNvbmZpZy5yZXNvbHZlIS5zeW1saW5rcyA9IGZhbHNlO1xuICBjb25zdCB7Z2V0UGtnT2ZGaWxlfSA9IHBhY2thZ2VPZkZpbGVGYWN0b3J5KCk7XG5cbiAgY29uc3QgcmVzb2x2ZU1vZHVsZXMgPSBbJ25vZGVfbW9kdWxlcycsIC4uLm5vZGVQYXRoXTtcbiAgY29uZmlnLnJlc29sdmUhLm1vZHVsZXMgPSByZXNvbHZlTW9kdWxlcztcbiAgaWYgKGNvbmZpZy5yZXNvbHZlTG9hZGVyID09IG51bGwpXG4gICAgY29uZmlnLnJlc29sdmVMb2FkZXIgPSB7fTtcbiAgY29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcyA9IHJlc29sdmVNb2R1bGVzO1xuICBjb25maWcucmVzb2x2ZUxvYWRlci5zeW1saW5rcyA9IGZhbHNlO1xuXG4gIGlmIChjb25maWcucmVzb2x2ZSEucGx1Z2lucyA9PSBudWxsKSB7XG4gICAgY29uZmlnLnJlc29sdmUhLnBsdWdpbnMgPSBbXTtcbiAgfVxuICAvLyBjb25maWcucmVzb2x2ZSEucGx1Z2lucy51bnNoaWZ0KG5ldyBQbGlua1dlYnBhY2tSZXNvbHZlUGx1Z2luKCkpO1xuXG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLnJlc29sdmUhLmFsaWFzLCByZXF1aXJlKCdyeGpzL19lc20yMDE1L3BhdGgtbWFwcGluZycpKCkpO1xuXG4gIGlmIChjbWRPcHRpb24uY21kID09PSAnY3JhLWJ1aWxkJylcbiAgICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgU3RhdHNQbHVnaW4oKSk7XG4gIC8vIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBQcm9ncmVzc1BsdWdpbih7IHByb2ZpbGU6IHRydWUgfSkpO1xuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnbGliJykge1xuICAgIGNoYW5nZTRsaWIoY21kT3B0aW9uLmJ1aWxkVGFyZ2V0LCBjb25maWcsIG5vZGVQYXRoKTtcbiAgfSBlbHNlIHtcbiAgICBjb25maWcucGx1Z2lucyEudW5zaGlmdChuZXcgVGVtcGxhdGVIdG1sUGx1Z2luKCkpO1xuXG4gICAgY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IChjbGFzcyB7XG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXAoJ2NyYS1zY3JpcHRzJywgX3N0YXRzID0+IHtcbiAgICAgICAgICAvLyBpZiAoLyhefFxccyktLWV4cG9zZS1nYyhcXHN8JCkvLnRlc3QocHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TISkgfHxcbiAgICAgICAgICAvLyAgIClcbiAgICAgICAgICBpZiAoZ2xvYmFsLmdjKVxuICAgICAgICAgICAgZ2xvYmFsLmdjKCk7XG4gICAgICAgICAgbWVtU3RhdHMoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkoKSk7XG4gICAgc2V0dXBTcGxpdENodW5rcyhjb25maWcsIChtb2QpID0+IHtcbiAgICAgIGNvbnN0IGZpbGUgPSBtb2QubmFtZUZvckNvbmRpdGlvbiA/IG1vZC5uYW1lRm9yQ29uZGl0aW9uKCkgOiBudWxsO1xuICAgICAgaWYgKGZpbGUgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBjb25zdCBwa2cgPSBnZXRQa2dPZkZpbGUoZmlsZSk7XG4gICAgICByZXR1cm4gcGtnID09IG51bGwgfHwgKHBrZy5qc29uLmRyID09IG51bGwgJiYgcGtnLmpzb24ucGxpbmsgPT0gbnVsbCk7XG4gICAgfSk7XG4gIH1cblxuICBydW5Db25maWdIYW5kbGVycyhjb25maWcsIHdlYnBhY2tFbnYpO1xuICBsb2cuZGVidWcoYG91dHB1dC5wdWJsaWNQYXRoOiAke2NvbmZpZy5vdXRwdXQhLnB1YmxpY1BhdGh9YCk7XG4gIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ3dlYnBhY2suY29uZmlnLnBsaW5rLmpzJyksIHByaW50Q29uZmlnKGNvbmZpZykpO1xuXG4gIC8vIGNoYW5nZVRzQ29uZmlnRmlsZSgpO1xuICByZXR1cm4gY29uZmlnO1xufTtcblxuLyoqXG4gKiBmb3JrLXRzLWNoZWNrZXIgZG9lcyBub3Qgd29yayBmb3IgZmlsZXMgb3V0c2lkZSBvZiB3b3Jrc3BhY2Ugd2hpY2ggaXMgYWN0dWFsbHkgb3VyIGxpbmtlZCBzb3VyY2UgcGFja2FnZVxuICovXG5mdW5jdGlvbiBjaGFuZ2VGb3JrVHNDaGVja2VyUGx1Z2luKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBwbHVnaW5zID0gY29uZmlnLnBsdWdpbnMhO1xuICBjb25zdCBjbnN0ID0gcmVxdWlyZShub2RlUmVzb2x2ZS5zeW5jKCdyZWFjdC1kZXYtdXRpbHMvRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4nLFxuICAgIHtiYXNlZGlyOiBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzJyl9KSk7XG4gIC8vIGxldCBmb3JrVHNDaGVja0lkeCA9IC0xO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHBsdWdpbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHBsdWdpbnNbaV0gaW5zdGFuY2VvZiBjbnN0KSB7XG4gICAgICAocGx1Z2luc1tpXSBhcyBhbnkpLnJlcG9ydEZpbGVzID0gW107XG4gICAgICAvLyBmb3JrVHNDaGVja0lkeCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgLy8gaWYgKGZvcmtUc0NoZWNrSWR4ID49IDApIHtcbiAgLy8gICBwbHVnaW5zLnNwbGljZShmb3JrVHNDaGVja0lkeCwgMSk7XG4gIC8vICAgbG9nLmluZm8oJ1JlbW92ZSBGb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbiBkdWUgdG8gaXRzIG5vdCB3b3JraW5nIHdpdGggbGlua2VkIGZpbGVzJyk7XG4gIC8vIH1cbn1cbi8qKlxuICogcmVhY3Qtc2NyaXB0cy9jb25maWcvZW52LmpzIGZpbHRlcnMgTk9ERV9QQVRIIGZvciBvbmx5IGFsbG93aW5nIHJlbGF0aXZlIHBhdGgsIHRoaXMgYnJlYWtzXG4gKiBQbGluaydzIE5PREVfUEFUSCBzZXR0aW5nLlxuICovXG5mdW5jdGlvbiByZXZpc2VOb2RlUGF0aEVudigpIHtcbiAgY29uc3Qge25vZGVQYXRofSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuICBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBub2RlUGF0aC5qb2luKFBhdGguZGVsaW1pdGVyKTtcbn1cblxuLyoqXG4gKiBIZWxwIHRvIHJlcGxhY2UgdHMsIGpzIGZpbGUgYnkgY29uZmlndXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBlbmRPdXJPd25Uc0xvYWRlcihjb25maWc6IENvbmZpZ3VyYXRpb24pIHtcbiAgY29uc3QgbXlUc0xvYWRlck9wdHM6IFRzTG9hZGVyT3B0cyA9IHtcbiAgICB0c0NvbmZpZ0ZpbGU6IFBhdGgucmVzb2x2ZSgndHNjb25maWcuanNvbicpLFxuICAgIGluamVjdG9yOiBhcGkuYnJvd3NlckluamVjdG9yLFxuICAgIGNvbXBpbGVFeHBDb250ZXh0OiBmaWxlID0+IHtcbiAgICAgIGNvbnN0IHBrZyA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgcmV0dXJuIHtfX2FwaTogYXBpLmdldE5vZGVBcGlGb3JQYWNrYWdlKHBrZyl9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgY29uZmlnLm1vZHVsZSEucnVsZXMucHVzaCh7XG4gICAgdGVzdDogY3JlYXRlUnVsZVRlc3RGdW5jNFNyYygvXFwuW2p0XXN4PyQvKSxcbiAgICBlbmZvcmNlOiAncHJlJyxcbiAgICB1c2U6IHtcbiAgICAgIG9wdGlvbnM6IG15VHNMb2FkZXJPcHRzLFxuICAgICAgbG9hZGVyOiByZXF1aXJlLnJlc29sdmUoJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC90cy1sb2FkZXInKVxuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJ1bkNvbmZpZ0hhbmRsZXJzKGNvbmZpZzogQ29uZmlndXJhdGlvbiwgd2VicGFja0Vudjogc3RyaW5nKSB7XG4gIGNvbnN0IHtnZXRDb25maWdGaWxlSW5QYWNrYWdlfTogdHlwZW9mIF9jcmFQYXRocyA9IHJlcXVpcmUoJy4vY3JhLXNjcmlwdHMtcGF0aHMnKTtcbiAgY29uc3QgY29uZmlnRmlsZUluUGFja2FnZSA9IGdldENvbmZpZ0ZpbGVJblBhY2thZ2UoKTtcbiAgY29uc3QgY21kT3B0aW9uID0gZ2V0Q21kT3B0aW9ucygpO1xuICBpZiAoY29uZmlnRmlsZUluUGFja2FnZSkge1xuICAgIGNvbnN0IGNmZ01nciA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFtjb25maWdGaWxlSW5QYWNrYWdlXSk7XG4gICAgY2ZnTWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCBfcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci53ZWJwYWNrICE9IG51bGwpIHtcbiAgICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgV2VicGFjayBjb25maWd1cmF0aW9uIG92ZXJyaWRlcyBmcm9tICcsIGNmZ0ZpbGUpO1xuICAgICAgICBoYW5kbGVyLndlYnBhY2soY29uZmlnLCB3ZWJwYWNrRW52LCBjbWRPcHRpb24pO1xuICAgICAgfVxuICAgIH0sICdjcmVhdGUtcmVhY3QtYXBwIFdlYnBhY2sgY29uZmlnJyk7XG4gIH1cbiAgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCBfcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGhhbmRsZXIud2VicGFjayAhPSBudWxsKSB7XG4gICAgICBsb2cuaW5mbygnRXhlY3V0ZSBjb21tYW5kIGxpbmUgV2VicGFjayBjb25maWd1cmF0aW9uIG92ZXJyaWRlcycsIGNmZ0ZpbGUpO1xuICAgICAgaGFuZGxlci53ZWJwYWNrKGNvbmZpZywgd2VicGFja0VudiwgY21kT3B0aW9uKTtcbiAgICB9XG4gIH0sICdjcmVhdGUtcmVhY3QtYXBwIFdlYnBhY2sgY29uZmlnJykpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRMZXNzTG9hZGVyUnVsZShvcmlnUnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3Qgb25lT2YgPSBvcmlnUnVsZXMuZmluZChydWxlID0+IHJ1bGUub25lT2YpPy5vbmVPZiE7XG4gIC8vIDEuIGxldCdzIHRha2UgcnVsZXMgZm9yIGNzcyBhcyBhIHRlbXBsYXRlXG4gIGNvbnN0IGNzc1J1bGVVc2UgPSBvbmVPZi5maW5kKHN1YlJ1bGUgPT4gc3ViUnVsZS50ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmXG4gICAgKHN1YlJ1bGUudGVzdCBhcyBSZWdFeHApLnNvdXJjZSA9PT0gJ1xcXFwuY3NzJCcpPy51c2UgYXMgUnVsZVNldFVzZUl0ZW1bXTtcblxuICBjb25zdCBjc3NNb2R1bGVSdWxlVXNlID0gb25lT2YuZmluZChzdWJSdWxlID0+IHN1YlJ1bGUudGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJlxuICAgIChzdWJSdWxlLnRlc3QgYXMgUmVnRXhwKS5zb3VyY2UgPT09ICdcXFxcLm1vZHVsZVxcXFwuY3NzJCcpPy51c2UgYXMgUnVsZVNldFVzZUl0ZW1bXTtcblxuICBjb25zdCBsZXNzTW9kdWxlUnVsZTogUnVsZVNldFJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLm1vZHVsZVxcLmxlc3MkLyxcbiAgICB1c2U6IGNyZWF0ZUxlc3NSdWxlVXNlKGNzc01vZHVsZVJ1bGVVc2UpLFxuICAgIHNpZGVFZmZlY3RzOiB0cnVlXG4gIH07XG5cbiAgY29uc3QgbGVzc1J1bGU6IFJ1bGVTZXRSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC5sZXNzJC8sXG4gICAgLy8gZXhjbHVkZTogL1xcLm1vZHVsZVxcLmxlc3MkLyxcbiAgICB1c2U6IGNyZWF0ZUxlc3NSdWxlVXNlKGNzc1J1bGVVc2UpLFxuICAgIHNpZGVFZmZlY3RzOiB0cnVlXG4gIH07XG5cbiAgLy8gSW5zZXJ0IGF0IGxhc3QgMm5kIHBvc2l0aW9uLCByaWdodCBiZWZvcmUgZmlsZS1sb2FkZXJcbiAgb25lT2Yuc3BsaWNlKG9uZU9mLmxlbmd0aCAtMiwgMCwgbGVzc01vZHVsZVJ1bGUsIGxlc3NSdWxlKTtcblxuICBmdW5jdGlvbiBjcmVhdGVMZXNzUnVsZVVzZSh1c2VJdGVtczogUnVsZVNldFVzZUl0ZW1bXSkge1xuICAgIHJldHVybiB1c2VJdGVtcy5tYXAodXNlSXRlbSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHVzZUl0ZW0gPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB1c2VJdGVtID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiB1c2VJdGVtO1xuICAgICAgfVxuICAgICAgbGV0IG5ld1VzZUl0ZW06IFJ1bGVTZXRMb2FkZXIgPSB7Li4udXNlSXRlbX07XG4gICAgICBpZiAodXNlSXRlbS5sb2FkZXIgJiYgL1tcXFxcL11jc3NcXC1sb2FkZXJbXFxcXC9dLy50ZXN0KHVzZUl0ZW0ubG9hZGVyKSkge1xuICAgICAgICBuZXdVc2VJdGVtLm9wdGlvbnMgPSB7XG4gICAgICAgICAgLi4uKG5ld1VzZUl0ZW0ub3B0aW9ucyBhcyBhbnkgfHwge30pLFxuICAgICAgICAgIGltcG9ydExvYWRlcnM6IDJcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXdVc2VJdGVtO1xuICAgIH0pLmNvbmNhdCh7XG4gICAgICBsb2FkZXI6ICdsZXNzLWxvYWRlcicsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGxlc3NPcHRpb25zOiB7XG4gICAgICAgICAgamF2YXNjcmlwdEVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgLi4uZ2V0U2V0dGluZygpLmxlc3NMb2FkZXJPdGhlck9wdGlvbnNcbiAgICAgICAgfSxcbiAgICAgICAgYWRkaXRpb25hbERhdGE6IGdldFNldHRpbmcoKS5sZXNzTG9hZGVyQWRkaXRpb25hbERhdGFcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5jb25zdCBmaWxlTG9hZGVyT3B0aW9ucyA9IHtcbiAgLy8gZXNNb2R1bGU6IGZhbHNlLFxuICBvdXRwdXRQYXRoKHVybDogc3RyaW5nLCByZXNvdXJjZVBhdGg6IHN0cmluZywgX2NvbnRleHQ6IHN0cmluZykge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGAkeyhwayA/IHBrLnNob3J0TmFtZSA6ICdleHRlcm5hbCcpfS8ke3VybH1gO1xuICB9XG59O1xuXG4vKipcbiAqIFxuICogQHBhcmFtIHJ1bGVzIFxuICovXG5mdW5jdGlvbiBjaGFuZ2VGaWxlTG9hZGVyKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IGNyYVBhdGhzID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHMnKTtcbiAgLy8gVE9ETzogY2hlY2sgaW4gY2FzZSBDUkEgd2lsbCB1c2UgUnVsZS51c2UgaW5zdGVhZCBvZiBcImxvYWRlclwiXG4gIGNoZWNrU2V0KHJ1bGVzKTtcbiAgZm9yIChjb25zdCBydWxlIG9mIHJ1bGVzKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocnVsZS51c2UpKSB7XG4gICAgICBjaGVja1NldChydWxlLnVzZSk7XG5cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocnVsZS5sb2FkZXIpKSB7XG4gICAgICAgIGNoZWNrU2V0KHJ1bGUubG9hZGVyKTtcbiAgICB9IGVsc2UgaWYgKHJ1bGUub25lT2YpIHtcbiAgICAgIGluc2VydFJhd0xvYWRlcihydWxlLm9uZU9mKTtcbiAgICAgIHJldHVybiBjaGFuZ2VGaWxlTG9hZGVyKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldC5sZW5ndGggOyBpKyspIHtcbiAgICAgIGNvbnN0IHJ1bGUgPSBzZXRbaV07XG5cbiAgICAgIGlmICh0eXBlb2YgcnVsZSA9PT0gJ3N0cmluZycgJiYgKHJ1bGUuaW5kZXhPZignZmlsZS1sb2FkZXInKSA+PSAwIHx8IHJ1bGUuaW5kZXhPZigndXJsLWxvYWRlcicpID49IDApKSB7XG4gICAgICAgIHNldFtpXSA9IHtcbiAgICAgICAgICBsb2FkZXI6IHJ1bGUsXG4gICAgICAgICAgb3B0aW9uczogZmlsZUxvYWRlck9wdGlvbnNcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJ1bGVTZXRSdWxlID0gcnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXI7XG4gICAgICAgICBpZiAoKHR5cGVvZiBydWxlU2V0UnVsZS5sb2FkZXIpID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAoKHJ1bGVTZXRSdWxlLmxvYWRlciBhcyBzdHJpbmcpLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fFxuICAgICAgICAocnVsZVNldFJ1bGUubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZigndXJsLWxvYWRlcicpID49IDBcbiAgICAgICAgKSkge1xuICAgICAgICAgIGlmIChydWxlU2V0UnVsZS5vcHRpb25zKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHJ1bGVTZXRSdWxlLm9wdGlvbnMsIGZpbGVMb2FkZXJPcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVsZVNldFJ1bGUub3B0aW9ucyA9IGZpbGVMb2FkZXJPcHRpb25zO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG5cbiAgICAgIGNvbnN0IF9ydWxlID0gcnVsZSBhcyBSdWxlU2V0UnVsZTtcblxuICAgICAgaWYgKF9ydWxlLmluY2x1ZGUgJiYgdHlwZW9mIF9ydWxlLmxvYWRlciA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgKHJ1bGUgYXMgUnVsZVNldExvYWRlcikubG9hZGVyIS5pbmRleE9mKFBhdGguc2VwICsgJ2JhYmVsLWxvYWRlcicgKyBQYXRoLnNlcCkgPj0gMCkge1xuICAgICAgICBkZWxldGUgX3J1bGUuaW5jbHVkZTtcbiAgICAgICAgX3J1bGUudGVzdCA9IGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMoX3J1bGUudGVzdCwgY3JhUGF0aHMuYXBwU3JjKTtcbiAgICAgIH1cbiAgICAgIGlmIChfcnVsZS50ZXN0ICYmIF9ydWxlLnRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXC4oanN8bWpzfGpzeHx0c3x0c3gpJC8nICYmXG4gICAgICAgIF9ydWxlLmluY2x1ZGUpIHtcbiAgICAgICAgICBkZWxldGUgX3J1bGUuaW5jbHVkZTtcbiAgICAgICAgICBfcnVsZS50ZXN0ID0gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhfcnVsZS50ZXN0LCBjcmFQYXRocy5hcHBTcmMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMob3JpZ1Rlc3Q6IFJ1bGVTZXRSdWxlWyd0ZXN0J10sIGFwcFNyYz86IHN0cmluZykge1xuICByZXR1cm4gZnVuY3Rpb24gdGVzdE91clNvdXJjZUZpbGUoZmlsZTogc3RyaW5nKSAge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgIGlmIChwayA9PSBudWxsICYmIGZpbGUuaW5kZXhPZignLmxpbmtzJykgPiAwKVxuICAgICAgbG9nLndhcm4oJ2NyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMnLCBmaWxlLCBwayk7XG4gICAgY29uc3QgeWVzID0gKChwayAmJiAocGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rKSkgfHwgKGFwcFNyYyAmJiBmaWxlLnN0YXJ0c1dpdGgoYXBwU3JjKSkpICYmXG4gICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBSZWdFeHApID8gb3JpZ1Rlc3QudGVzdChmaWxlKSA6XG4gICAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gb3JpZ1Rlc3QoZmlsZSkgOiBvcmlnVGVzdCA9PT0gZmlsZSk7XG4gICAgLy8gbG9nLmluZm8oYFt3ZWJwYWNrLmNvbmZpZ10gYmFiZWwtbG9hZGVyOiAke2ZpbGV9YCwgeWVzKTtcbiAgICByZXR1cm4geWVzO1xuICB9O1xufVxuXG5mdW5jdGlvbiBpbnNlcnRSYXdMb2FkZXIocnVsZXM6IFJ1bGVTZXRSdWxlW10pIHtcbiAgY29uc3QgaHRtbExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmh0bWwkLyxcbiAgICB1c2U6IFtcbiAgICAgIHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cbiAgICBdXG4gIH07XG4gIHJ1bGVzLnB1c2goaHRtbExvYWRlclJ1bGUpO1xufVxuXG4vKiogVG8gc3VwcG9ydCBNYXRlcmlhbC1jb21wb25lbnQtd2ViICovXG5mdW5jdGlvbiByZXBsYWNlU2Fzc0xvYWRlcihydWxlczogUnVsZVNldFJ1bGVbXSkge1xuICBjb25zdCBvbmVPZiA9IHJ1bGVzLmZpbmQocnVsZSA9PiBydWxlLm9uZU9mKT8ub25lT2YhO1xuICBvbmVPZi5maWx0ZXIoc3ViUnVsZSA9PiBBcnJheS5pc0FycmF5KHN1YlJ1bGUudXNlKSlcbiAgICAuZm9yRWFjaChzdWJSdWxlID0+IHtcbiAgICAgIGNvbnN0IHVzZUl0ZW0gPSAoc3ViUnVsZS51c2UgYXMgUnVsZVNldExvYWRlcltdKVxuICAgICAgLmZpbmQodXNlSXRlbSA9PiB1c2VJdGVtLmxvYWRlciAmJiAvc2Fzcy1sb2FkZXIvLnRlc3QodXNlSXRlbS5sb2FkZXIpKTtcbiAgICAgIGlmICh1c2VJdGVtICE9IG51bGwpIHtcbiAgICAgICAgdXNlSXRlbS5vcHRpb25zID0ge1xuICAgICAgICAgIGltcGxlbWVudGF0aW9uOiByZXF1aXJlKCdzYXNzJyksXG4gICAgICAgICAgd2VicGFja0ltcG9ydGVyOiBmYWxzZSxcbiAgICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgICAgc2Fzc09wdGlvbnM6IHtcbiAgICAgICAgICAgIGluY2x1ZGVQYXRoczogWydub2RlX21vZHVsZXMnLCAuLi5ub2RlUGF0aF1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG59XG4iXX0=