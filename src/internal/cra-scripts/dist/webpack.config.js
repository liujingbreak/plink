"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// tslint:disable:no-console
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
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            if (handler.webpack != null) {
                log.info('Execute Webpack configuration overrides from ', cfgFile);
                handler.webpack(config, webpackEnv, cmdOption);
            }
        }, 'create-react-app Webpack config');
    }
    __plink_1.default.config.configHandlerMgrChanged(mgr => mgr.runEachSync((cfgFile, result, handler) => {
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
    outputPath(url, resourcePath, context) {
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
    const resolveModules = ['node_modules', ...nodePath];
    config.resolve.modules = resolveModules;
    if (config.resolveLoader == null)
        config.resolveLoader = {};
    config.resolveLoader.modules = resolveModules;
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
                compiler.hooks.done.tap('cra-scripts', stats => {
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
            const pkg = __plink_1.default.findPackageByFile(file);
            return pkg == null || pkg.json.dr == null || pkg.json.plink == null;
        });
    }
    runConfigHandlers(config, webpackEnv);
    log.debug(`output.publicPath: ${config.output.publicPath}`);
    fs_extra_1.default.writeFileSync(path_1.default.resolve(reportDir, 'webpack.config.plink.js'), utils_1.printConfig(config));
    // changeTsConfigFile();
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsNEJBQTRCO0FBQzVCLHVFQUFzRTtBQUV0RSx1RkFBb0U7QUFDcEUseUdBQXdFO0FBRXhFLHdEQUEwQjtBQUUxQiwrREFBK0Q7QUFDL0Qsc0NBQWtDO0FBQ2xDLG9GQUEyRDtBQUMzRCxnREFBd0I7QUFFeEIsc0RBQTBCO0FBRzFCLG1DQUE2RTtBQUM3RSxpRkFBaUY7QUFDakYsZ0VBQXVDO0FBRXZDLHlHQUErRTtBQUMvRSxzREFBa0M7QUFDbEMsNkZBQTZGO0FBQzdGLHFFQUF1RDtBQUN2RCx3REFBd0Q7QUFFeEQsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0FBQ2hFLE1BQU0sRUFBQyxRQUFRLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBa0h6RTs7R0FFRztBQUNILFNBQVMseUJBQXlCLENBQUMsTUFBcUI7SUFDdEQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQVEsQ0FBQztJQUNoQyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsaUJBQVcsQ0FBQyxJQUFJLENBQUMsNENBQTRDLEVBQ2hGLEVBQUMsT0FBTyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztJQUMxRCwyQkFBMkI7SUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM5QyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLEVBQUU7WUFDN0IsT0FBTyxDQUFDLENBQUMsQ0FBUyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDckMsc0JBQXNCO1lBQ3RCLE1BQU07U0FDUDtLQUNGO0lBQ0QsNkJBQTZCO0lBQzdCLHVDQUF1QztJQUN2Qyw0RkFBNEY7SUFDNUYsSUFBSTtBQUNOLENBQUM7QUFDRDs7O0dBR0c7QUFDSCxTQUFTLGlCQUFpQjtJQUN4QixNQUFNLEVBQUMsUUFBUSxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0lBQ2hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsb0JBQW9CLENBQUMsTUFBcUI7SUFDakQsTUFBTSxjQUFjLEdBQWlCO1FBQ25DLFlBQVksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQztRQUMzQyxRQUFRLEVBQUUsaUJBQUcsQ0FBQyxlQUFlO1FBQzdCLGlCQUFpQixFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ3hCLE1BQU0sR0FBRyxHQUFHLGlCQUFHLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEMsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsT0FBTyxFQUFDLEtBQUssRUFBRSxpQkFBRyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFDLENBQUM7YUFDL0M7aUJBQU07Z0JBQ0wsT0FBTyxFQUFFLENBQUM7YUFDWDtRQUNILENBQUM7S0FDRixDQUFDO0lBQ0YsTUFBTSxDQUFDLE1BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3hCLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxZQUFZLENBQUM7UUFDMUMsT0FBTyxFQUFFLEtBQUs7UUFDZCxHQUFHLEVBQUU7WUFDSCxPQUFPLEVBQUUsY0FBYztZQUN2QixNQUFNLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUM5RDtLQUNGLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLE1BQXFCLEVBQUUsVUFBa0I7SUFDbEUsTUFBTSxFQUFDLHNCQUFzQixFQUFDLEdBQXFCLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2xGLE1BQU0sbUJBQW1CLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztJQUNyRCxNQUFNLFNBQVMsR0FBRyxxQkFBYSxFQUFFLENBQUM7SUFDbEMsSUFBSSxtQkFBbUIsRUFBRTtRQUN2QixNQUFNLE1BQU0sR0FBRyxJQUFJLGlDQUFnQixDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQXNCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUNuRSxJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSSxFQUFFO2dCQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLCtDQUErQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNuRSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7YUFDaEQ7UUFDSCxDQUFDLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztLQUN2QztJQUNELGlCQUFHLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBc0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQzFHLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxzREFBc0QsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMxRSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7U0FDaEQ7SUFDSCxDQUFDLEVBQUUsaUNBQWlDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLFNBQXdCOztJQUNwRCxNQUFNLEtBQUssR0FBRyxNQUFBLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLDBDQUFFLEtBQU0sQ0FBQztJQUN6RCw0Q0FBNEM7SUFDNUMsTUFBTSxVQUFVLEdBQUcsTUFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksWUFBWSxNQUFNO1FBQ3BFLE9BQU8sQ0FBQyxJQUFlLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQywwQ0FBRSxHQUF1QixDQUFDO0lBRTFFLE1BQU0sZ0JBQWdCLEdBQUcsTUFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksWUFBWSxNQUFNO1FBQzFFLE9BQU8sQ0FBQyxJQUFlLENBQUMsTUFBTSxLQUFLLGtCQUFrQixDQUFDLDBDQUFFLEdBQXVCLENBQUM7SUFFbkYsTUFBTSxjQUFjLEdBQWdCO1FBQ2xDLElBQUksRUFBRSxpQkFBaUI7UUFDdkIsR0FBRyxFQUFFLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDO1FBQ3hDLFdBQVcsRUFBRSxJQUFJO0tBQ2xCLENBQUM7SUFFRixNQUFNLFFBQVEsR0FBZ0I7UUFDNUIsSUFBSSxFQUFFLFNBQVM7UUFDZiw4QkFBOEI7UUFDOUIsR0FBRyxFQUFFLGlCQUFpQixDQUFDLFVBQVUsQ0FBQztRQUNsQyxXQUFXLEVBQUUsSUFBSTtLQUNsQixDQUFDO0lBRUYsd0RBQXdEO0lBQ3hELEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUUzRCxTQUFTLGlCQUFpQixDQUFDLFFBQTBCO1FBQ25ELE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUM1QixJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsSUFBSSxPQUFPLE9BQU8sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hFLE9BQU8sT0FBTyxDQUFDO2FBQ2hCO1lBQ0QsSUFBSSxVQUFVLHFCQUFzQixPQUFPLENBQUMsQ0FBQztZQUM3QyxJQUFJLE9BQU8sQ0FBQyxNQUFNLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbEUsVUFBVSxDQUFDLE9BQU8sbUNBQ2IsQ0FBQyxVQUFVLENBQUMsT0FBYyxJQUFJLEVBQUUsQ0FBQyxLQUNwQyxhQUFhLEVBQUUsQ0FBQyxHQUNqQixDQUFDO2FBQ0g7WUFDRCxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDUixNQUFNLEVBQUUsYUFBYTtZQUNyQixPQUFPLEVBQUU7Z0JBQ1AsV0FBVyxrQkFDVCxpQkFBaUIsRUFBRSxJQUFJLElBQ3BCLGdDQUFVLEVBQUUsQ0FBQyxzQkFBc0IsQ0FDdkM7Z0JBQ0QsY0FBYyxFQUFFLGdDQUFVLEVBQUUsQ0FBQyx3QkFBd0I7YUFDdEQ7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0saUJBQWlCLEdBQUc7SUFDeEIsbUJBQW1CO0lBQ25CLFVBQVUsQ0FBQyxHQUFXLEVBQUUsWUFBb0IsRUFBRSxPQUFlO1FBQzNELE1BQU0sRUFBRSxHQUFHLGlCQUFHLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0MsT0FBTyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUN0RCxDQUFDO0NBQ0YsQ0FBQztBQUVGOzs7R0FHRztBQUNILFNBQVMsZ0JBQWdCLENBQUMsS0FBb0I7SUFDNUMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7SUFDdkQsZ0VBQWdFO0lBQ2hFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtRQUN4QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzNCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FFcEI7YUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ25DLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDekI7YUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDckIsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QixPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNyQztLQUNGO0lBRUQsU0FBUyxRQUFRLENBQUMsR0FBcUM7UUFDckQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUcsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXBCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtnQkFDckcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHO29CQUNQLE1BQU0sRUFBRSxJQUFJO29CQUNaLE9BQU8sRUFBRSxpQkFBaUI7aUJBQzNCLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxNQUFNLFdBQVcsR0FBRyxJQUFtQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssUUFBUTtvQkFDN0MsQ0FBRSxXQUFXLENBQUMsTUFBaUIsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQzt3QkFDMUQsV0FBVyxDQUFDLE1BQWlCLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FDeEQsRUFBRTtvQkFDRCxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUU7d0JBQ3ZCLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO3FCQUN2RDt5QkFBTTt3QkFDTCxXQUFXLENBQUMsT0FBTyxHQUFHLGlCQUFpQixDQUFDO3FCQUN6QztpQkFDRjthQUNGO1lBR0QsTUFBTSxLQUFLLEdBQUcsSUFBbUIsQ0FBQztZQUVsQyxJQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksT0FBTyxLQUFLLENBQUMsTUFBTSxLQUFLLFFBQVE7Z0JBQ2xELElBQXNCLENBQUMsTUFBTyxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsR0FBRyxHQUFHLGNBQWMsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNwRixPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUM7Z0JBQ3JCLEtBQUssQ0FBQyxJQUFJLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDbEU7WUFDRCxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSywwQkFBMEI7Z0JBQ3BFLEtBQUssQ0FBQyxPQUFPLEVBQUU7Z0JBQ2IsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDO2dCQUNyQixLQUFLLENBQUMsSUFBSSxHQUFHLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3BFO1NBQ0Y7SUFDSCxDQUFDO0lBQ0QsT0FBTztBQUNULENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLFFBQTZCLEVBQUUsTUFBZTtJQUM1RSxPQUFPLFNBQVMsaUJBQWlCLENBQUMsSUFBWTtRQUM1QyxNQUFNLEVBQUUsR0FBRyxpQkFBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLElBQUksRUFBRSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7WUFDMUMsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDL0MsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDeEYsQ0FBQyxRQUFRLFlBQVksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRCxDQUFDLFFBQVEsWUFBWSxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDO1FBQ3hFLDJEQUEyRDtRQUMzRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxLQUFvQjtJQUMzQyxNQUFNLGNBQWMsR0FBRztRQUNyQixJQUFJLEVBQUUsU0FBUztRQUNmLEdBQUcsRUFBRTtZQUNILEVBQUMsTUFBTSxFQUFFLFlBQVksRUFBQztTQUN2QjtLQUNGLENBQUM7SUFDRixLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdCLENBQUM7QUFFRCx3Q0FBd0M7QUFDeEMsU0FBUyxpQkFBaUIsQ0FBQyxLQUFvQjs7SUFDN0MsTUFBTSxLQUFLLEdBQUcsTUFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQywwQ0FBRSxLQUFNLENBQUM7SUFDckQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2hELE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNqQixNQUFNLE9BQU8sR0FBSSxPQUFPLENBQUMsR0FBdUI7YUFDL0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtZQUNuQixPQUFPLENBQUMsT0FBTyxHQUFHO2dCQUNoQixjQUFjLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDL0IsZUFBZSxFQUFFLEtBQUs7Z0JBQ3RCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFdBQVcsRUFBRTtvQkFDWCxZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsR0FBRyxRQUFRLENBQUM7aUJBQzVDO2FBQ0YsQ0FBQztTQUNIO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBN1ZELGlCQUFTLFVBQVMsVUFBd0M7SUFDeEQsaUJBQVMsQ0FBQyw0QkFBNEIsRUFBRSx5REFBeUQsaUJBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUV4SixNQUFNLFNBQVMsR0FBRyxxQkFBYSxFQUFFLENBQUM7SUFDbEMsMkZBQTJGO0lBQzNGLElBQUksU0FBUyxDQUFDLE9BQU8sSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFO1FBQ3hDLFVBQVUsR0FBRyxhQUFhLENBQUM7UUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxVQUFVLENBQUMsQ0FBQztLQUNqRDtTQUFNO1FBQ0wsNENBQTRDO0tBQzdDO0lBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsR0FBRyxNQUFNLENBQUM7SUFDMUMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMscUNBQXFDLENBQUMsQ0FBQztJQUN6RSxpQkFBaUIsRUFBRSxDQUFDO0lBRXBCLE1BQU0sRUFBQyxPQUFPLEVBQUUsUUFBUSxFQUFDLEdBQXFCLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBRTdFLE1BQU0sTUFBTSxHQUFrQixpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1RCxJQUFJLFVBQVUsS0FBSyxZQUFZLEVBQUU7UUFDL0Isc0ZBQXNGO1FBQ3RGLHlDQUF5QztRQUN6QyxtRkFBbUY7UUFDbkYsTUFBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLEdBQUcscUNBQXFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLE1BQU8sQ0FBQyxhQUFhLEdBQUcsMkNBQTJDLENBQUM7UUFDM0UsTUFBTSxDQUFDLE1BQU8sQ0FBQyw2QkFBNkI7WUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ2pGO1NBQU07UUFDTCxNQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQztRQUNoRCxNQUFNLENBQUMsTUFBTyxDQUFDLGFBQWEsR0FBRywyQkFBMkIsQ0FBQztLQUM1RDtJQUVELE1BQU0sU0FBUyxHQUFHLG9CQUFZLEVBQUUsQ0FBQztJQUNqQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6QixrQkFBRSxDQUFDLFNBQVMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLG1CQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUMxRixJQUFJLEdBQUc7WUFDTCxHQUFHLENBQUMsS0FBSyxDQUFDLGtCQUFrQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHVCQUF1QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7SUFFSCwyRUFBMkU7SUFDM0UsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLE1BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsTUFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzdCLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxNQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0MseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFbEMsSUFBSSxTQUFTLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtRQUNqQyxNQUFNLENBQUMsTUFBTyxDQUFDLElBQUksR0FBRyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7UUFDMUMsaUNBQWlDO0tBQ2xDO0lBRUQsOEdBQThHO0lBQzlHLElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtRQUM1QyxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxZQUFZLGlCQUFpQixDQUFDLENBQUM7UUFDMUcsSUFBSSxpQkFBaUIsSUFBSSxDQUFDLEVBQUU7WUFDMUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3JEO0tBQ0Y7SUFFRCxvQ0FBb0M7SUFFcEMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQztJQUNyRCxNQUFNLENBQUMsT0FBUSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUM7SUFDekMsSUFBSSxNQUFNLENBQUMsYUFBYSxJQUFJLElBQUk7UUFDOUIsTUFBTSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7SUFDNUIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFDO0lBRTlDLElBQUksTUFBTSxDQUFDLE9BQVEsQ0FBQyxPQUFPLElBQUksSUFBSSxFQUFFO1FBQ25DLE1BQU0sQ0FBQyxPQUFRLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztLQUM5QjtJQUNELG9FQUFvRTtJQUVwRSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUU5RSxJQUFJLFNBQVMsQ0FBQyxHQUFHLEtBQUssV0FBVztRQUMvQixNQUFNLENBQUMsT0FBUSxDQUFDLElBQUksQ0FBQyxJQUFJLDhCQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzFDLCtEQUErRDtJQUUvRCxJQUFJLFNBQVMsQ0FBQyxTQUFTLEtBQUssS0FBSyxFQUFFO1FBQ2pDLHFCQUFVLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDckQ7U0FBTTtRQUNMLE1BQU0sQ0FBQyxPQUFRLENBQUMsT0FBTyxDQUFDLElBQUksOEJBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBRWxELE1BQU0sQ0FBQyxPQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUN4QixLQUFLLENBQUMsUUFBa0I7Z0JBQ3RCLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLEVBQUU7b0JBQzdDLG1FQUFtRTtvQkFDbkUsTUFBTTtvQkFDTixJQUFJLE1BQU0sQ0FBQyxFQUFFO3dCQUNYLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDZCxtQkFBUSxFQUFFLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1NBQ0YsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNOLHFCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQy9CLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNsRSxJQUFJLElBQUksSUFBSSxJQUFJO2dCQUNkLE9BQU8sSUFBSSxDQUFDO1lBQ2QsTUFBTSxHQUFHLEdBQUcsaUJBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4QyxPQUFPLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQztRQUN0RSxDQUFDLENBQUMsQ0FBQztLQUNKO0lBRUQsaUJBQWlCLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3RDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLE1BQU0sQ0FBQyxNQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUM3RCxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFLG1CQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUUxRix3QkFBd0I7SUFDeEIsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IHsgQ29uZmlnSGFuZGxlck1nciB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHR5cGUgeyBQbGlua0VudiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3Qvbm9kZS1wYXRoJztcbmltcG9ydCBzZXR1cFNwbGl0Q2h1bmtzIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC9zcGxpdENodW5rcyc7XG5pbXBvcnQgU3RhdHNQbHVnaW4gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3dlYnBhY2stc3RhdHMtcGx1Z2luJztcbmltcG9ydCB7IE9wdGlvbnMgYXMgVHNMb2FkZXJPcHRzIH0gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RzLWxvYWRlcic7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yIGZyb20gJy4vaW5qZWN0b3Itc2V0dXAnO1xuaW1wb3J0IHtsb2dnZXJ9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IG1lbVN0YXRzIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29uZmlndXJhdGlvbiwgUnVsZVNldExvYWRlciwgUnVsZVNldFJ1bGUsIFJ1bGVTZXRVc2VJdGVtLCBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbi8vIGltcG9ydCB7IGZpbmRQYWNrYWdlIH0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbmltcG9ydCB7IFJlYWN0U2NyaXB0c0hhbmRsZXIgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGRyYXdQdXBweSwgZ2V0Q21kT3B0aW9ucywgcHJpbnRDb25maWcsZ2V0UmVwb3J0RGlyIH0gZnJvbSAnLi91dGlscyc7XG4vLyBpbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjaGFuZ2U0bGliIGZyb20gJy4vd2VicGFjay1saWInO1xuaW1wb3J0ICogYXMgX2NyYVBhdGhzIGZyb20gJy4vY3JhLXNjcmlwdHMtcGF0aHMnO1xuaW1wb3J0IFRlbXBsYXRlSHRtbFBsdWdpbiBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvdGVtcGxhdGUtaHRtbC1wbHVnaW4nO1xuaW1wb3J0IG5vZGVSZXNvbHZlIGZyb20gJ3Jlc29sdmUnO1xuLy8gaW1wb3J0IHtQbGlua1dlYnBhY2tSZXNvbHZlUGx1Z2lufSBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3Qvd2VicGFjay1yZXNvbHZlLXBsdWdpbic7XG5pbXBvcnQge2dldFNldHRpbmd9IGZyb20gJy4uL2lzb20vY3JhLXNjcmlwdHMtc2V0dGluZyc7XG4vLyBpbXBvcnQge2NoYW5nZVRzQ29uZmlnRmlsZX0gZnJvbSAnLi9jaGFuZ2UtdHNjb25maWcnO1xuXG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdAd2ZoL2NyYS1zY3JpcHRzLndlYnBhY2stY29uZmlnJyk7XG5jb25zdCB7bm9kZVBhdGgsIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cbmV4cG9ydCA9IGZ1bmN0aW9uKHdlYnBhY2tFbnY6ICdwcm9kdWN0aW9uJyB8ICdkZXZlbG9wbWVudCcpIHtcbiAgZHJhd1B1cHB5KCdQb29pbmcgb24gY3JlYXRlLXJlYWN0LWFwcCcsIGBJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBXZWJwYWNrIGlzIGNvbmZpZ3VyZWQsIGNoZWNrOiAke2FwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdjcmEtc2NyaXB0cy5yZXBvcnQnKX1gKTtcblxuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG4gIC8vIGBucG0gcnVuIGJ1aWxkYCBieSBkZWZhdWx0IGlzIGluIHByb2R1Y3Rpb24gbW9kZSwgYmVsb3cgaGFja3MgdGhlIHdheSByZWFjdC1zY3JpcHRzIGRvZXNcbiAgaWYgKGNtZE9wdGlvbi5kZXZNb2RlIHx8IGNtZE9wdGlvbi53YXRjaCkge1xuICAgIHdlYnBhY2tFbnYgPSAnZGV2ZWxvcG1lbnQnO1xuICAgIGxvZy5pbmZvKCdEZXZlbG9wbWVudCBtb2RlIGlzIG9uOicsIHdlYnBhY2tFbnYpO1xuICB9IGVsc2Uge1xuICAgIC8vIHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCA9ICdmYWxzZSc7XG4gIH1cbiAgbG9nLmluZm8oJ3dlYnBhY2tFbnYgOicsIHdlYnBhY2tFbnYpO1xuICBwcm9jZXNzLmVudi5JTkxJTkVfUlVOVElNRV9DSFVOSyA9ICd0cnVlJztcbiAgY29uc3Qgb3JpZ1dlYnBhY2tDb25maWcgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy93ZWJwYWNrLmNvbmZpZycpO1xuICByZXZpc2VOb2RlUGF0aEVudigpO1xuXG4gIGNvbnN0IHtkZWZhdWx0OiBjcmFQYXRoc306IHR5cGVvZiBfY3JhUGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJyk7XG5cbiAgY29uc3QgY29uZmlnOiBDb25maWd1cmF0aW9uID0gb3JpZ1dlYnBhY2tDb25maWcod2VicGFja0Vudik7XG4gIGlmICh3ZWJwYWNrRW52ID09PSAncHJvZHVjdGlvbicpIHtcbiAgICAvLyBUcnkgdG8gd29ya2Fyb3VuZCBpc3N1ZTogZGVmYXVsdCBJbmxpbmVDaHVua1BsdWdpbiAncyB0ZXN0IHByb3BlcnR5IGRvZXMgbm90IG1hdGNoIFxuICAgIC8vIENSQSdzIG91dHB1dCBjaHVuayBmaWxlIG5hbWUgdGVtcGxhdGUsXG4gICAgLy8gd2hlbiB3ZSBzZXQgb3B0aW1pemF0aW9uLnJ1bnRpbWVDaHVuayB0byBcInNpbmdsZVwiIGluc3RlYWQgb2YgZGVmYXVsdCBDUkEncyB2YWx1ZVxuICAgIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0tW2NvbnRlbnRoYXNoOjhdLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5jaHVua0ZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0tW2NvbnRlbnRoYXNoOjhdLmNodW5rLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5kZXZ0b29sTW9kdWxlRmlsZW5hbWVUZW1wbGF0ZSA9XG4gICAgICBpbmZvID0+IFBhdGgucmVsYXRpdmUocm9vdERpciwgaW5mby5hYnNvbHV0ZVJlc291cmNlUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICB9IGVsc2Uge1xuICAgIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0uanMnO1xuICAgIGNvbmZpZy5vdXRwdXQhLmNodW5rRmlsZW5hbWUgPSAnc3RhdGljL2pzL1tuYW1lXS5jaHVuay5qcyc7XG4gIH1cblxuICBjb25zdCByZXBvcnREaXIgPSBnZXRSZXBvcnREaXIoKTtcbiAgZnMubWtkaXJwU3luYyhyZXBvcnREaXIpO1xuICBmcy53cml0ZUZpbGUoUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ3dlYnBhY2suY29uZmlnLmNyYS5qcycpLCBwcmludENvbmZpZyhjb25maWcpLCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycilcbiAgICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIHdyaXRlICcgKyBQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcuY3JhLmpzJyksIGVycik7XG4gIH0pO1xuXG4gIC8vIE1ha2Ugc3VyZSBiYWJlbCBjb21waWxlcyBzb3VyY2UgZm9sZGVyIG91dCBzaWRlIG9mIGN1cnJlbnQgc3JjIGRpcmVjdG9yeVxuICBjaGFuZ2VGaWxlTG9hZGVyKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcbiAgcmVwbGFjZVNhc3NMb2FkZXIoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICBhcHBlbmRPdXJPd25Uc0xvYWRlcihjb25maWcpO1xuICBpbnNlcnRMZXNzTG9hZGVyUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIGNoYW5nZUZvcmtUc0NoZWNrZXJQbHVnaW4oY29uZmlnKTtcblxuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2FwcCcpIHtcbiAgICBjb25maWcub3V0cHV0IS5wYXRoID0gY3JhUGF0aHMoKS5hcHBCdWlsZDtcbiAgICAvLyBjb25maWcuZGV2dG9vbCA9ICdzb3VyY2UtbWFwJztcbiAgfVxuXG4gIC8vIFJlbW92ZSBNb2R1bGVzU2NvcGVQbHVnaW4gZnJvbSByZXNvbHZlIHBsdWdpbnMsIGl0IHN0b3BzIHVzIHVzaW5nIHNvdXJjZSBmb2xkIG91dCBzaWRlIG9mIHByb2plY3QgZGlyZWN0b3J5XG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5wbHVnaW5zKSB7XG4gICAgY29uc3QgTW9kdWxlU2NvcGVQbHVnaW4gPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvTW9kdWxlU2NvcGVQbHVnaW4nKTtcbiAgICBjb25zdCBzcmNTY29wZVBsdWdpbklkeCA9IGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuZmluZEluZGV4KHBsdWdpbiA9PiBwbHVnaW4gaW5zdGFuY2VvZiBNb2R1bGVTY29wZVBsdWdpbik7XG4gICAgaWYgKHNyY1Njb3BlUGx1Z2luSWR4ID49IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuc3BsaWNlKHNyY1Njb3BlUGx1Z2luSWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICAvLyBjb25maWcucmVzb2x2ZSEuc3ltbGlua3MgPSBmYWxzZTtcblxuICBjb25zdCByZXNvbHZlTW9kdWxlcyA9IFsnbm9kZV9tb2R1bGVzJywgLi4ubm9kZVBhdGhdO1xuICBjb25maWcucmVzb2x2ZSEubW9kdWxlcyA9IHJlc29sdmVNb2R1bGVzO1xuICBpZiAoY29uZmlnLnJlc29sdmVMb2FkZXIgPT0gbnVsbClcbiAgICBjb25maWcucmVzb2x2ZUxvYWRlciA9IHt9O1xuICBjb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID0gcmVzb2x2ZU1vZHVsZXM7XG5cbiAgaWYgKGNvbmZpZy5yZXNvbHZlIS5wbHVnaW5zID09IG51bGwpIHtcbiAgICBjb25maWcucmVzb2x2ZSEucGx1Z2lucyA9IFtdO1xuICB9XG4gIC8vIGNvbmZpZy5yZXNvbHZlIS5wbHVnaW5zLnVuc2hpZnQobmV3IFBsaW5rV2VicGFja1Jlc29sdmVQbHVnaW4oKSk7XG5cbiAgT2JqZWN0LmFzc2lnbihjb25maWcucmVzb2x2ZSEuYWxpYXMsIHJlcXVpcmUoJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJykoKSk7XG5cbiAgaWYgKGNtZE9wdGlvbi5jbWQgPT09ICdjcmEtYnVpbGQnKVxuICAgIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBTdGF0c1BsdWdpbigpKTtcbiAgLy8gY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IFByb2dyZXNzUGx1Z2luKHsgcHJvZmlsZTogdHJ1ZSB9KSk7XG5cbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdsaWInKSB7XG4gICAgY2hhbmdlNGxpYihjbWRPcHRpb24uYnVpbGRUYXJnZXQsIGNvbmZpZywgbm9kZVBhdGgpO1xuICB9IGVsc2Uge1xuICAgIGNvbmZpZy5wbHVnaW5zIS51bnNoaWZ0KG5ldyBUZW1wbGF0ZUh0bWxQbHVnaW4oKSk7XG5cbiAgICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgKGNsYXNzIHtcbiAgICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcCgnY3JhLXNjcmlwdHMnLCBzdGF0cyA9PiB7XG4gICAgICAgICAgLy8gaWYgKC8oXnxcXHMpLS1leHBvc2UtZ2MoXFxzfCQpLy50ZXN0KHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyEpIHx8XG4gICAgICAgICAgLy8gICApXG4gICAgICAgICAgaWYgKGdsb2JhbC5nYylcbiAgICAgICAgICAgIGdsb2JhbC5nYygpO1xuICAgICAgICAgIG1lbVN0YXRzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pKCkpO1xuICAgIHNldHVwU3BsaXRDaHVua3MoY29uZmlnLCAobW9kKSA9PiB7XG4gICAgICBjb25zdCBmaWxlID0gbW9kLm5hbWVGb3JDb25kaXRpb24gPyBtb2QubmFtZUZvckNvbmRpdGlvbigpIDogbnVsbDtcbiAgICAgIGlmIChmaWxlID09IG51bGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY29uc3QgcGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgICAgcmV0dXJuIHBrZyA9PSBudWxsIHx8IHBrZy5qc29uLmRyID09IG51bGwgfHwgcGtnLmpzb24ucGxpbmsgPT0gbnVsbDtcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbmZpZ0hhbmRsZXJzKGNvbmZpZywgd2VicGFja0Vudik7XG4gIGxvZy5kZWJ1Zyhgb3V0cHV0LnB1YmxpY1BhdGg6ICR7Y29uZmlnLm91dHB1dCEucHVibGljUGF0aH1gKTtcbiAgZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcucGxpbmsuanMnKSwgcHJpbnRDb25maWcoY29uZmlnKSk7XG5cbiAgLy8gY2hhbmdlVHNDb25maWdGaWxlKCk7XG4gIHJldHVybiBjb25maWc7XG59O1xuXG4vKipcbiAqIGZvcmstdHMtY2hlY2tlciBkb2VzIG5vdCB3b3JrIGZvciBmaWxlcyBvdXRzaWRlIG9mIHdvcmtzcGFjZSB3aGljaCBpcyBhY3R1YWxseSBvdXIgbGlua2VkIHNvdXJjZSBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZUZvcmtUc0NoZWNrZXJQbHVnaW4oY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG4gIGNvbnN0IHBsdWdpbnMgPSBjb25maWcucGx1Z2lucyE7XG4gIGNvbnN0IGNuc3QgPSByZXF1aXJlKG5vZGVSZXNvbHZlLnN5bmMoJ3JlYWN0LWRldi11dGlscy9Gb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbicsXG4gICAge2Jhc2VkaXI6IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMnKX0pKTtcbiAgLy8gbGV0IGZvcmtUc0NoZWNrSWR4ID0gLTE7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcGx1Z2lucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAocGx1Z2luc1tpXSBpbnN0YW5jZW9mIGNuc3QpIHtcbiAgICAgIChwbHVnaW5zW2ldIGFzIGFueSkucmVwb3J0RmlsZXMgPSBbXTtcbiAgICAgIC8vIGZvcmtUc0NoZWNrSWR4ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICAvLyBpZiAoZm9ya1RzQ2hlY2tJZHggPj0gMCkge1xuICAvLyAgIHBsdWdpbnMuc3BsaWNlKGZvcmtUc0NoZWNrSWR4LCAxKTtcbiAgLy8gICBsb2cuaW5mbygnUmVtb3ZlIEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luIGR1ZSB0byBpdHMgbm90IHdvcmtpbmcgd2l0aCBsaW5rZWQgZmlsZXMnKTtcbiAgLy8gfVxufVxuLyoqXG4gKiByZWFjdC1zY3JpcHRzL2NvbmZpZy9lbnYuanMgZmlsdGVycyBOT0RFX1BBVEggZm9yIG9ubHkgYWxsb3dpbmcgcmVsYXRpdmUgcGF0aCwgdGhpcyBicmVha3NcbiAqIFBsaW5rJ3MgTk9ERV9QQVRIIHNldHRpbmcuXG4gKi9cbmZ1bmN0aW9uIHJldmlzZU5vZGVQYXRoRW52KCkge1xuICBjb25zdCB7bm9kZVBhdGh9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG4gIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IG5vZGVQYXRoLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG4vKipcbiAqIEhlbHAgdG8gcmVwbGFjZSB0cywganMgZmlsZSBieSBjb25maWd1cmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZE91ck93blRzTG9hZGVyKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBteVRzTG9hZGVyT3B0czogVHNMb2FkZXJPcHRzID0ge1xuICAgIHRzQ29uZmlnRmlsZTogUGF0aC5yZXNvbHZlKCd0c2NvbmZpZy5qc29uJyksXG4gICAgaW5qZWN0b3I6IGFwaS5icm93c2VySW5qZWN0b3IsXG4gICAgY29tcGlsZUV4cENvbnRleHQ6IGZpbGUgPT4ge1xuICAgICAgY29uc3QgcGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgICAgaWYgKHBrZykge1xuICAgICAgICByZXR1cm4ge19fYXBpOiBhcGkuZ2V0Tm9kZUFwaUZvclBhY2thZ2UocGtnKX07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ge307XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBjb25maWcubW9kdWxlIS5ydWxlcy5wdXNoKHtcbiAgICB0ZXN0OiBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKC9cXC5banRdc3g/JC8pLFxuICAgIGVuZm9yY2U6ICdwcmUnLFxuICAgIHVzZToge1xuICAgICAgb3B0aW9uczogbXlUc0xvYWRlck9wdHMsXG4gICAgICBsb2FkZXI6IHJlcXVpcmUucmVzb2x2ZSgnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RzLWxvYWRlcicpXG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gcnVuQ29uZmlnSGFuZGxlcnMoY29uZmlnOiBDb25maWd1cmF0aW9uLCB3ZWJwYWNrRW52OiBzdHJpbmcpIHtcbiAgY29uc3Qge2dldENvbmZpZ0ZpbGVJblBhY2thZ2V9OiB0eXBlb2YgX2NyYVBhdGhzID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpO1xuICBjb25zdCBjb25maWdGaWxlSW5QYWNrYWdlID0gZ2V0Q29uZmlnRmlsZUluUGFja2FnZSgpO1xuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG4gIGlmIChjb25maWdGaWxlSW5QYWNrYWdlKSB7XG4gICAgY29uc3QgY2ZnTWdyID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoW2NvbmZpZ0ZpbGVJblBhY2thZ2VdKTtcbiAgICBjZmdNZ3IucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIHJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgICAgaWYgKGhhbmRsZXIud2VicGFjayAhPSBudWxsKSB7XG4gICAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFdlYnBhY2sgY29uZmlndXJhdGlvbiBvdmVycmlkZXMgZnJvbSAnLCBjZmdGaWxlKTtcbiAgICAgICAgaGFuZGxlci53ZWJwYWNrKGNvbmZpZywgd2VicGFja0VudiwgY21kT3B0aW9uKTtcbiAgICAgIH1cbiAgICB9LCAnY3JlYXRlLXJlYWN0LWFwcCBXZWJwYWNrIGNvbmZpZycpO1xuICB9XG4gIGFwaS5jb25maWcuY29uZmlnSGFuZGxlck1nckNoYW5nZWQobWdyID0+IG1nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGhhbmRsZXIud2VicGFjayAhPSBudWxsKSB7XG4gICAgICBsb2cuaW5mbygnRXhlY3V0ZSBjb21tYW5kIGxpbmUgV2VicGFjayBjb25maWd1cmF0aW9uIG92ZXJyaWRlcycsIGNmZ0ZpbGUpO1xuICAgICAgaGFuZGxlci53ZWJwYWNrKGNvbmZpZywgd2VicGFja0VudiwgY21kT3B0aW9uKTtcbiAgICB9XG4gIH0sICdjcmVhdGUtcmVhY3QtYXBwIFdlYnBhY2sgY29uZmlnJykpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRMZXNzTG9hZGVyUnVsZShvcmlnUnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3Qgb25lT2YgPSBvcmlnUnVsZXMuZmluZChydWxlID0+IHJ1bGUub25lT2YpPy5vbmVPZiE7XG4gIC8vIDEuIGxldCdzIHRha2UgcnVsZXMgZm9yIGNzcyBhcyBhIHRlbXBsYXRlXG4gIGNvbnN0IGNzc1J1bGVVc2UgPSBvbmVPZi5maW5kKHN1YlJ1bGUgPT4gc3ViUnVsZS50ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmXG4gICAgKHN1YlJ1bGUudGVzdCBhcyBSZWdFeHApLnNvdXJjZSA9PT0gJ1xcXFwuY3NzJCcpPy51c2UgYXMgUnVsZVNldFVzZUl0ZW1bXTtcblxuICBjb25zdCBjc3NNb2R1bGVSdWxlVXNlID0gb25lT2YuZmluZChzdWJSdWxlID0+IHN1YlJ1bGUudGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJlxuICAgIChzdWJSdWxlLnRlc3QgYXMgUmVnRXhwKS5zb3VyY2UgPT09ICdcXFxcLm1vZHVsZVxcXFwuY3NzJCcpPy51c2UgYXMgUnVsZVNldFVzZUl0ZW1bXTtcblxuICBjb25zdCBsZXNzTW9kdWxlUnVsZTogUnVsZVNldFJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLm1vZHVsZVxcLmxlc3MkLyxcbiAgICB1c2U6IGNyZWF0ZUxlc3NSdWxlVXNlKGNzc01vZHVsZVJ1bGVVc2UpLFxuICAgIHNpZGVFZmZlY3RzOiB0cnVlXG4gIH07XG5cbiAgY29uc3QgbGVzc1J1bGU6IFJ1bGVTZXRSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC5sZXNzJC8sXG4gICAgLy8gZXhjbHVkZTogL1xcLm1vZHVsZVxcLmxlc3MkLyxcbiAgICB1c2U6IGNyZWF0ZUxlc3NSdWxlVXNlKGNzc1J1bGVVc2UpLFxuICAgIHNpZGVFZmZlY3RzOiB0cnVlXG4gIH07XG5cbiAgLy8gSW5zZXJ0IGF0IGxhc3QgMm5kIHBvc2l0aW9uLCByaWdodCBiZWZvcmUgZmlsZS1sb2FkZXJcbiAgb25lT2Yuc3BsaWNlKG9uZU9mLmxlbmd0aCAtMiwgMCwgbGVzc01vZHVsZVJ1bGUsIGxlc3NSdWxlKTtcblxuICBmdW5jdGlvbiBjcmVhdGVMZXNzUnVsZVVzZSh1c2VJdGVtczogUnVsZVNldFVzZUl0ZW1bXSkge1xuICAgIHJldHVybiB1c2VJdGVtcy5tYXAodXNlSXRlbSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHVzZUl0ZW0gPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB1c2VJdGVtID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiB1c2VJdGVtO1xuICAgICAgfVxuICAgICAgbGV0IG5ld1VzZUl0ZW06IFJ1bGVTZXRMb2FkZXIgPSB7Li4udXNlSXRlbX07XG4gICAgICBpZiAodXNlSXRlbS5sb2FkZXIgJiYgL1tcXFxcL11jc3NcXC1sb2FkZXJbXFxcXC9dLy50ZXN0KHVzZUl0ZW0ubG9hZGVyKSkge1xuICAgICAgICBuZXdVc2VJdGVtLm9wdGlvbnMgPSB7XG4gICAgICAgICAgLi4uKG5ld1VzZUl0ZW0ub3B0aW9ucyBhcyBhbnkgfHwge30pLFxuICAgICAgICAgIGltcG9ydExvYWRlcnM6IDJcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXdVc2VJdGVtO1xuICAgIH0pLmNvbmNhdCh7XG4gICAgICBsb2FkZXI6ICdsZXNzLWxvYWRlcicsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGxlc3NPcHRpb25zOiB7XG4gICAgICAgICAgamF2YXNjcmlwdEVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgLi4uZ2V0U2V0dGluZygpLmxlc3NMb2FkZXJPdGhlck9wdGlvbnNcbiAgICAgICAgfSxcbiAgICAgICAgYWRkaXRpb25hbERhdGE6IGdldFNldHRpbmcoKS5sZXNzTG9hZGVyQWRkaXRpb25hbERhdGFcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5jb25zdCBmaWxlTG9hZGVyT3B0aW9ucyA9IHtcbiAgLy8gZXNNb2R1bGU6IGZhbHNlLFxuICBvdXRwdXRQYXRoKHVybDogc3RyaW5nLCByZXNvdXJjZVBhdGg6IHN0cmluZywgY29udGV4dDogc3RyaW5nKSB7XG4gICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUocmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gYCR7KHBrID8gcGsuc2hvcnROYW1lIDogJ2V4dGVybmFsJyl9LyR7dXJsfWA7XG4gIH1cbn07XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcnVsZXMgXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZUZpbGVMb2FkZXIocnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3QgY3JhUGF0aHMgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy9wYXRocycpO1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgaW5zZXJ0UmF3TG9hZGVyKHJ1bGUub25lT2YpO1xuICAgICAgcmV0dXJuIGNoYW5nZUZpbGVMb2FkZXIocnVsZS5vbmVPZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tTZXQoc2V0OiAoUnVsZVNldFJ1bGUgfCBSdWxlU2V0VXNlSXRlbSlbXSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2V0Lmxlbmd0aCA7IGkrKykge1xuICAgICAgY29uc3QgcnVsZSA9IHNldFtpXTtcblxuICAgICAgaWYgKHR5cGVvZiBydWxlID09PSAnc3RyaW5nJyAmJiAocnVsZS5pbmRleE9mKCdmaWxlLWxvYWRlcicpID49IDAgfHwgcnVsZS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMCkpIHtcbiAgICAgICAgc2V0W2ldID0ge1xuICAgICAgICAgIGxvYWRlcjogcnVsZSxcbiAgICAgICAgICBvcHRpb25zOiBmaWxlTG9hZGVyT3B0aW9uc1xuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcnVsZVNldFJ1bGUgPSBydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcjtcbiAgICAgICAgIGlmICgodHlwZW9mIHJ1bGVTZXRSdWxlLmxvYWRlcikgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICgocnVsZVNldFJ1bGUubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZignZmlsZS1sb2FkZXInKSA+PSAwIHx8XG4gICAgICAgIChydWxlU2V0UnVsZS5sb2FkZXIgYXMgc3RyaW5nKS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMFxuICAgICAgICApKSB7XG4gICAgICAgICAgaWYgKHJ1bGVTZXRSdWxlLm9wdGlvbnMpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocnVsZVNldFJ1bGUub3B0aW9ucywgZmlsZUxvYWRlck9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydWxlU2V0UnVsZS5vcHRpb25zID0gZmlsZUxvYWRlck9wdGlvbnM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cblxuICAgICAgY29uc3QgX3J1bGUgPSBydWxlIGFzIFJ1bGVTZXRSdWxlO1xuXG4gICAgICBpZiAoX3J1bGUuaW5jbHVkZSAmJiB0eXBlb2YgX3J1bGUubG9hZGVyID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAocnVsZSBhcyBSdWxlU2V0TG9hZGVyKS5sb2FkZXIhLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSA+PSAwKSB7XG4gICAgICAgIGRlbGV0ZSBfcnVsZS5pbmNsdWRlO1xuICAgICAgICBfcnVsZS50ZXN0ID0gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhfcnVsZS50ZXN0LCBjcmFQYXRocy5hcHBTcmMpO1xuICAgICAgfVxuICAgICAgaWYgKF9ydWxlLnRlc3QgJiYgX3J1bGUudGVzdC50b1N0cmluZygpID09PSAnL1xcLihqc3xtanN8anN4fHRzfHRzeCkkLycgJiZcbiAgICAgICAgX3J1bGUuaW5jbHVkZSkge1xuICAgICAgICAgIGRlbGV0ZSBfcnVsZS5pbmNsdWRlO1xuICAgICAgICAgIF9ydWxlLnRlc3QgPSBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKF9ydWxlLnRlc3QsIGNyYVBhdGhzLmFwcFNyYyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhvcmlnVGVzdDogUnVsZVNldFJ1bGVbJ3Rlc3QnXSwgYXBwU3JjPzogc3RyaW5nKSB7XG4gIHJldHVybiBmdW5jdGlvbiB0ZXN0T3VyU291cmNlRmlsZShmaWxlOiBzdHJpbmcpICB7XG4gICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgaWYgKHBrID09IG51bGwgJiYgZmlsZS5pbmRleE9mKCcubGlua3MnKSA+IDApXG4gICAgICBsb2cud2FybignY3JlYXRlUnVsZVRlc3RGdW5jNFNyYycsIGZpbGUsIHBrKTtcbiAgICBjb25zdCB5ZXMgPSAoKHBrICYmIChway5qc29uLmRyIHx8IHBrLmpzb24ucGxpbmspKSB8fCAoYXBwU3JjICYmIGZpbGUuc3RhcnRzV2l0aChhcHBTcmMpKSkgJiZcbiAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCkgPyBvcmlnVGVzdC50ZXN0KGZpbGUpIDpcbiAgICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcmlnVGVzdChmaWxlKSA6IG9yaWdUZXN0ID09PSBmaWxlKTtcbiAgICAvLyBsb2cuaW5mbyhgW3dlYnBhY2suY29uZmlnXSBiYWJlbC1sb2FkZXI6ICR7ZmlsZX1gLCB5ZXMpO1xuICAgIHJldHVybiB5ZXM7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGluc2VydFJhd0xvYWRlcihydWxlczogUnVsZVNldFJ1bGVbXSkge1xuICBjb25zdCBodG1sTG9hZGVyUnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwuaHRtbCQvLFxuICAgIHVzZTogW1xuICAgICAge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIF1cbiAgfTtcbiAgcnVsZXMucHVzaChodG1sTG9hZGVyUnVsZSk7XG59XG5cbi8qKiBUbyBzdXBwb3J0IE1hdGVyaWFsLWNvbXBvbmVudC13ZWIgKi9cbmZ1bmN0aW9uIHJlcGxhY2VTYXNzTG9hZGVyKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKSB7XG4gIGNvbnN0IG9uZU9mID0gcnVsZXMuZmluZChydWxlID0+IHJ1bGUub25lT2YpPy5vbmVPZiE7XG4gIG9uZU9mLmZpbHRlcihzdWJSdWxlID0+IEFycmF5LmlzQXJyYXkoc3ViUnVsZS51c2UpKVxuICAgIC5mb3JFYWNoKHN1YlJ1bGUgPT4ge1xuICAgICAgY29uc3QgdXNlSXRlbSA9IChzdWJSdWxlLnVzZSBhcyBSdWxlU2V0TG9hZGVyW10pXG4gICAgICAuZmluZCh1c2VJdGVtID0+IHVzZUl0ZW0ubG9hZGVyICYmIC9zYXNzLWxvYWRlci8udGVzdCh1c2VJdGVtLmxvYWRlcikpO1xuICAgICAgaWYgKHVzZUl0ZW0gIT0gbnVsbCkge1xuICAgICAgICB1c2VJdGVtLm9wdGlvbnMgPSB7XG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHJlcXVpcmUoJ3Nhc3MnKSxcbiAgICAgICAgICB3ZWJwYWNrSW1wb3J0ZXI6IGZhbHNlLFxuICAgICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgICBzYXNzT3B0aW9uczoge1xuICAgICAgICAgICAgaW5jbHVkZVBhdGhzOiBbJ25vZGVfbW9kdWxlcycsIC4uLm5vZGVQYXRoXVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbn1cbiJdfQ==