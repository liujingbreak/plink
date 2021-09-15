"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
/* eslint-disable no-console,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment */
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
    const cmdOption = (0, utils_1.getCmdOptions)();
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
                lessOptions: Object.assign({ javascriptEnabled: true }, (0, cra_scripts_setting_1.getSetting)().lessLoaderOtherOptions),
                additionalData: (0, cra_scripts_setting_1.getSetting)().lessLoaderAdditionalData
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
        const yes = ((pk && (pk.json.dr || pk.json.plink)) || (appSrc && file.startsWith(appSrc))) &&
            (origTest instanceof RegExp) ? origTest.test(file) :
            (origTest instanceof Function ? origTest(file) : origTest === file);
        // log.warn(`[webpack.config] babel-loader: ${file}`, yes);
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
    (0, utils_1.drawPuppy)('Pooing on create-react-app', `If you want to know how Webpack is configured, check: ${__plink_1.default.config.resolve('destDir', 'cra-scripts.report')}`);
    const cmdOption = (0, utils_1.getCmdOptions)();
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
    const reportDir = (0, utils_1.getReportDir)();
    fs_extra_1.default.mkdirpSync(reportDir);
    fs_extra_1.default.writeFile(path_1.default.resolve(reportDir, 'webpack.config.cra.js'), (0, utils_1.printConfig)(config), (err) => {
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
    const { getPkgOfFile } = (0, plink_1.packageOfFileFactory)();
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
    // const TargePlugin = require('case-sensitive-paths-webpack-plugin');
    // Remove problematic plugin for Mac OS
    // const found = config.plugins!.findIndex(plugin => plugin instanceof TargePlugin);
    // if (found >= 0)
    //   config.plugins?.splice(found, 1);
    if (cmdOption.buildType === 'lib') {
        (0, webpack_lib_1.default)(cmdOption.buildTarget, config, nodePath);
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
                    (0, mem_stats_1.default)();
                });
            }
        })());
        (0, splitChunks_1.default)(config, (mod) => {
            const file = mod.nameForCondition ? mod.nameForCondition() : null;
            if (file == null)
                return true;
            const pkg = getPkgOfFile(file);
            return pkg == null || (pkg.json.dr == null && pkg.json.plink == null);
        });
    }
    runConfigHandlers(config, webpackEnv);
    log.debug(`output.publicPath: ${config.output.publicPath}`);
    fs_extra_1.default.writeFileSync(path_1.default.resolve(reportDir, 'webpack.config.plink.js'), (0, utils_1.printConfig)(config));
    // changeTsConfigFile();
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsMkdBQTJHO0FBQzNHLHVFQUFzRTtBQUV0RSx1RkFBb0U7QUFDcEUseUdBQXdFO0FBRXhFLHdEQUEwQjtBQUUxQiwrREFBK0Q7QUFDL0Qsc0NBQXdEO0FBQ3hELG9GQUEyRDtBQUMzRCxnREFBd0I7QUFFeEIsc0RBQTBCO0FBRzFCLG1DQUE2RTtBQUM3RSxpRkFBaUY7QUFDakYsZ0VBQXVDO0FBRXZDLHlHQUErRTtBQUMvRSxzREFBa0M7QUFDbEMsNkZBQTZGO0FBQzdGLHFFQUF1RDtBQUN2RCx3REFBd0Q7QUFFeEQsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0FBQ2hFLE1BQU0sRUFBQyxRQUFRLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBMkh6RTs7R0FFRztBQUNILFNBQVMseUJBQXlCLENBQUMsTUFBcUI7SUFDdEQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQVEsQ0FBQztJQUNoQyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsaUJBQVcsQ0FBQyxJQUFJLENBQUMsNENBQTRDLEVBQ2hGLEVBQUMsT0FBTyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztJQUMxRCwyQkFBMkI7SUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM5QyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLEVBQUU7WUFDN0IsT0FBTyxDQUFDLENBQUMsQ0FB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QUFDLEVBQUU7d0JBQ1gsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNkLElBQUEsbUJBQVEsR0FBRSxDQUFDO2dCQUNiLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztTQUNGLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDTixJQUFBLHFCQUFnQixFQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQy9CLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNsRSxJQUFJLElBQUksSUFBSSxJQUFJO2dCQUNkLE9BQU8sSUFBSSxDQUFDO1lBQ2QsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9CLE9BQU8sR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQztRQUN4RSxDQUFDLENBQUMsQ0FBQztLQUNKO0lBRUQsaUJBQWlCLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3RDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLE1BQU0sQ0FBQyxNQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUM3RCxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFLElBQUEsbUJBQVcsRUFBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRTFGLHdCQUF3QjtJQUN4QixPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlLEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuLEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCAqL1xuaW1wb3J0IHsgQ29uZmlnSGFuZGxlck1nciB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHR5cGUgeyBQbGlua0VudiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3Qvbm9kZS1wYXRoJztcbmltcG9ydCBzZXR1cFNwbGl0Q2h1bmtzIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC9zcGxpdENodW5rcyc7XG5pbXBvcnQgU3RhdHNQbHVnaW4gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3dlYnBhY2stc3RhdHMtcGx1Z2luJztcbmltcG9ydCB7IE9wdGlvbnMgYXMgVHNMb2FkZXJPcHRzIH0gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RzLWxvYWRlcic7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yIGZyb20gJy4vaW5qZWN0b3Itc2V0dXAnO1xuaW1wb3J0IHtsb2dnZXIsIHBhY2thZ2VPZkZpbGVGYWN0b3J5fSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBtZW1TdGF0cyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL21lbS1zdGF0cyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IENvbmZpZ3VyYXRpb24sIFJ1bGVTZXRMb2FkZXIsIFJ1bGVTZXRSdWxlLCBSdWxlU2V0VXNlSXRlbSwgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG4vLyBpbXBvcnQgeyBmaW5kUGFja2FnZSB9IGZyb20gJy4vYnVpbGQtdGFyZ2V0LWhlbHBlcic7XG5pbXBvcnQgeyBSZWFjdFNjcmlwdHNIYW5kbGVyIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBkcmF3UHVwcHksIGdldENtZE9wdGlvbnMsIHByaW50Q29uZmlnLGdldFJlcG9ydERpciB9IGZyb20gJy4vdXRpbHMnO1xuLy8gaW1wb3J0IHtjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXJ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS11dGlscyc7XG5pbXBvcnQgY2hhbmdlNGxpYiBmcm9tICcuL3dlYnBhY2stbGliJztcbmltcG9ydCAqIGFzIF9jcmFQYXRocyBmcm9tICcuL2NyYS1zY3JpcHRzLXBhdGhzJztcbmltcG9ydCBUZW1wbGF0ZUh0bWxQbHVnaW4gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RlbXBsYXRlLWh0bWwtcGx1Z2luJztcbmltcG9ydCBub2RlUmVzb2x2ZSBmcm9tICdyZXNvbHZlJztcbi8vIGltcG9ydCB7UGxpbmtXZWJwYWNrUmVzb2x2ZVBsdWdpbn0gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3dlYnBhY2stcmVzb2x2ZS1wbHVnaW4nO1xuaW1wb3J0IHtnZXRTZXR0aW5nfSBmcm9tICcuLi9pc29tL2NyYS1zY3JpcHRzLXNldHRpbmcnO1xuLy8gaW1wb3J0IHtjaGFuZ2VUc0NvbmZpZ0ZpbGV9IGZyb20gJy4vY2hhbmdlLXRzY29uZmlnJztcblxuY29uc3QgbG9nID0gbG9nZ2VyLmdldExvZ2dlcignQHdmaC9jcmEtc2NyaXB0cy53ZWJwYWNrLWNvbmZpZycpO1xuY29uc3Qge25vZGVQYXRoLCByb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG5leHBvcnQgPSBmdW5jdGlvbih3ZWJwYWNrRW52OiAncHJvZHVjdGlvbicgfCAnZGV2ZWxvcG1lbnQnKSB7XG4gIGRyYXdQdXBweSgnUG9vaW5nIG9uIGNyZWF0ZS1yZWFjdC1hcHAnLCBgSWYgeW91IHdhbnQgdG8ga25vdyBob3cgV2VicGFjayBpcyBjb25maWd1cmVkLCBjaGVjazogJHthcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnY3JhLXNjcmlwdHMucmVwb3J0Jyl9YCk7XG5cbiAgY29uc3QgY21kT3B0aW9uID0gZ2V0Q21kT3B0aW9ucygpO1xuICAvLyBgbnBtIHJ1biBidWlsZGAgYnkgZGVmYXVsdCBpcyBpbiBwcm9kdWN0aW9uIG1vZGUsIGJlbG93IGhhY2tzIHRoZSB3YXkgcmVhY3Qtc2NyaXB0cyBkb2VzXG4gIGlmIChjbWRPcHRpb24uZGV2TW9kZSB8fCBjbWRPcHRpb24ud2F0Y2gpIHtcbiAgICB3ZWJwYWNrRW52ID0gJ2RldmVsb3BtZW50JztcbiAgICBsb2cuaW5mbygnRGV2ZWxvcG1lbnQgbW9kZSBpcyBvbjonLCB3ZWJwYWNrRW52KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBwcm9jZXNzLmVudi5HRU5FUkFURV9TT1VSQ0VNQVAgPSAnZmFsc2UnO1xuICB9XG4gIGxvZy5pbmZvKCd3ZWJwYWNrRW52IDonLCB3ZWJwYWNrRW52KTtcbiAgcHJvY2Vzcy5lbnYuSU5MSU5FX1JVTlRJTUVfQ0hVTksgPSAndHJ1ZSc7XG4gIGNvbnN0IG9yaWdXZWJwYWNrQ29uZmlnID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvd2VicGFjay5jb25maWcnKTtcbiAgcmV2aXNlTm9kZVBhdGhFbnYoKTtcblxuICBjb25zdCB7ZGVmYXVsdDogY3JhUGF0aHN9OiB0eXBlb2YgX2NyYVBhdGhzID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpO1xuXG4gIGNvbnN0IGNvbmZpZzogQ29uZmlndXJhdGlvbiA9IG9yaWdXZWJwYWNrQ29uZmlnKHdlYnBhY2tFbnYpO1xuICBpZiAod2VicGFja0VudiA9PT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgLy8gVHJ5IHRvIHdvcmthcm91bmQgaXNzdWU6IGRlZmF1bHQgSW5saW5lQ2h1bmtQbHVnaW4gJ3MgdGVzdCBwcm9wZXJ0eSBkb2VzIG5vdCBtYXRjaCBcbiAgICAvLyBDUkEncyBvdXRwdXQgY2h1bmsgZmlsZSBuYW1lIHRlbXBsYXRlLFxuICAgIC8vIHdoZW4gd2Ugc2V0IG9wdGltaXphdGlvbi5ydW50aW1lQ2h1bmsgdG8gXCJzaW5nbGVcIiBpbnN0ZWFkIG9mIGRlZmF1bHQgQ1JBJ3MgdmFsdWVcbiAgICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLVtjb250ZW50aGFzaDo4XS5qcyc7XG4gICAgY29uZmlnLm91dHB1dCEuY2h1bmtGaWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLVtjb250ZW50aGFzaDo4XS5jaHVuay5qcyc7XG4gICAgY29uZmlnLm91dHB1dCEuZGV2dG9vbE1vZHVsZUZpbGVuYW1lVGVtcGxhdGUgPVxuICAgICAgaW5mbyA9PiBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIGluZm8uYWJzb2x1dGVSZXNvdXJjZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgfSBlbHNlIHtcbiAgICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5jaHVua0ZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0uY2h1bmsuanMnO1xuICB9XG5cbiAgY29uc3QgcmVwb3J0RGlyID0gZ2V0UmVwb3J0RGlyKCk7XG4gIGZzLm1rZGlycFN5bmMocmVwb3J0RGlyKTtcbiAgZnMud3JpdGVGaWxlKFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICd3ZWJwYWNrLmNvbmZpZy5jcmEuanMnKSwgcHJpbnRDb25maWcoY29uZmlnKSwgKGVycikgPT4ge1xuICAgIGlmIChlcnIpXG4gICAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSAnICsgUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ3dlYnBhY2suY29uZmlnLmNyYS5qcycpLCBlcnIpO1xuICB9KTtcblxuICAvLyBNYWtlIHN1cmUgYmFiZWwgY29tcGlsZXMgc291cmNlIGZvbGRlciBvdXQgc2lkZSBvZiBjdXJyZW50IHNyYyBkaXJlY3RvcnlcbiAgY2hhbmdlRmlsZUxvYWRlcihjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIHJlcGxhY2VTYXNzTG9hZGVyKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcbiAgYXBwZW5kT3VyT3duVHNMb2FkZXIoY29uZmlnKTtcbiAgaW5zZXJ0TGVzc0xvYWRlclJ1bGUoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICBjaGFuZ2VGb3JrVHNDaGVja2VyUGx1Z2luKGNvbmZpZyk7XG5cbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdhcHAnKSB7XG4gICAgY29uZmlnLm91dHB1dCEucGF0aCA9IGNyYVBhdGhzKCkuYXBwQnVpbGQ7XG4gICAgLy8gY29uZmlnLmRldnRvb2wgPSAnc291cmNlLW1hcCc7XG4gIH1cblxuICAvLyBSZW1vdmUgTW9kdWxlc1Njb3BlUGx1Z2luIGZyb20gcmVzb2x2ZSBwbHVnaW5zLCBpdCBzdG9wcyB1cyB1c2luZyBzb3VyY2UgZm9sZCBvdXQgc2lkZSBvZiBwcm9qZWN0IGRpcmVjdG9yeVxuICBpZiAoY29uZmlnLnJlc29sdmUgJiYgY29uZmlnLnJlc29sdmUucGx1Z2lucykge1xuICAgIGNvbnN0IE1vZHVsZVNjb3BlUGx1Z2luID0gcmVxdWlyZSgncmVhY3QtZGV2LXV0aWxzL01vZHVsZVNjb3BlUGx1Z2luJyk7XG4gICAgY29uc3Qgc3JjU2NvcGVQbHVnaW5JZHggPSBjb25maWcucmVzb2x2ZS5wbHVnaW5zLmZpbmRJbmRleChwbHVnaW4gPT4gcGx1Z2luIGluc3RhbmNlb2YgTW9kdWxlU2NvcGVQbHVnaW4pO1xuICAgIGlmIChzcmNTY29wZVBsdWdpbklkeCA+PSAwKSB7XG4gICAgICBjb25maWcucmVzb2x2ZS5wbHVnaW5zLnNwbGljZShzcmNTY29wZVBsdWdpbklkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgLy8gY29uZmlnLnJlc29sdmUhLnN5bWxpbmtzID0gZmFsc2U7XG4gIGNvbnN0IHtnZXRQa2dPZkZpbGV9ID0gcGFja2FnZU9mRmlsZUZhY3RvcnkoKTtcblxuICBjb25zdCByZXNvbHZlTW9kdWxlcyA9IFsnbm9kZV9tb2R1bGVzJywgLi4ubm9kZVBhdGhdO1xuICBjb25maWcucmVzb2x2ZSEubW9kdWxlcyA9IHJlc29sdmVNb2R1bGVzO1xuICBpZiAoY29uZmlnLnJlc29sdmVMb2FkZXIgPT0gbnVsbClcbiAgICBjb25maWcucmVzb2x2ZUxvYWRlciA9IHt9O1xuICBjb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID0gcmVzb2x2ZU1vZHVsZXM7XG4gIGNvbmZpZy5yZXNvbHZlTG9hZGVyLnN5bWxpbmtzID0gZmFsc2U7XG5cbiAgaWYgKGNvbmZpZy5yZXNvbHZlIS5wbHVnaW5zID09IG51bGwpIHtcbiAgICBjb25maWcucmVzb2x2ZSEucGx1Z2lucyA9IFtdO1xuICB9XG4gIC8vIGNvbmZpZy5yZXNvbHZlIS5wbHVnaW5zLnVuc2hpZnQobmV3IFBsaW5rV2VicGFja1Jlc29sdmVQbHVnaW4oKSk7XG5cbiAgT2JqZWN0LmFzc2lnbihjb25maWcucmVzb2x2ZSEuYWxpYXMsIHJlcXVpcmUoJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJykoKSk7XG5cbiAgaWYgKGNtZE9wdGlvbi5jbWQgPT09ICdjcmEtYnVpbGQnKVxuICAgIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBTdGF0c1BsdWdpbigpKTtcbiAgLy8gY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IFByb2dyZXNzUGx1Z2luKHsgcHJvZmlsZTogdHJ1ZSB9KSk7XG5cbiAgLy8gY29uc3QgVGFyZ2VQbHVnaW4gPSByZXF1aXJlKCdjYXNlLXNlbnNpdGl2ZS1wYXRocy13ZWJwYWNrLXBsdWdpbicpO1xuXG4gIC8vIFJlbW92ZSBwcm9ibGVtYXRpYyBwbHVnaW4gZm9yIE1hYyBPU1xuICAvLyBjb25zdCBmb3VuZCA9IGNvbmZpZy5wbHVnaW5zIS5maW5kSW5kZXgocGx1Z2luID0+IHBsdWdpbiBpbnN0YW5jZW9mIFRhcmdlUGx1Z2luKTtcbiAgLy8gaWYgKGZvdW5kID49IDApXG4gIC8vICAgY29uZmlnLnBsdWdpbnM/LnNwbGljZShmb3VuZCwgMSk7XG5cbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdsaWInKSB7XG4gICAgY2hhbmdlNGxpYihjbWRPcHRpb24uYnVpbGRUYXJnZXQsIGNvbmZpZywgbm9kZVBhdGgpO1xuICB9IGVsc2Uge1xuICAgIGNvbmZpZy5wbHVnaW5zIS51bnNoaWZ0KG5ldyBUZW1wbGF0ZUh0bWxQbHVnaW4oKSk7XG5cbiAgICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgKGNsYXNzIHtcbiAgICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcCgnY3JhLXNjcmlwdHMnLCBfc3RhdHMgPT4ge1xuICAgICAgICAgIC8vIGlmICgvKF58XFxzKS0tZXhwb3NlLWdjKFxcc3wkKS8udGVzdChwcm9jZXNzLmVudi5OT0RFX09QVElPTlMhKSB8fFxuICAgICAgICAgIC8vICAgKVxuICAgICAgICAgIGlmIChnbG9iYWwuZ2MpXG4gICAgICAgICAgICBnbG9iYWwuZ2MoKTtcbiAgICAgICAgICBtZW1TdGF0cygpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KSgpKTtcbiAgICBzZXR1cFNwbGl0Q2h1bmtzKGNvbmZpZywgKG1vZCkgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IG1vZC5uYW1lRm9yQ29uZGl0aW9uID8gbW9kLm5hbWVGb3JDb25kaXRpb24oKSA6IG51bGw7XG4gICAgICBpZiAoZmlsZSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNvbnN0IHBrZyA9IGdldFBrZ09mRmlsZShmaWxlKTtcbiAgICAgIHJldHVybiBwa2cgPT0gbnVsbCB8fCAocGtnLmpzb24uZHIgPT0gbnVsbCAmJiBwa2cuanNvbi5wbGluayA9PSBudWxsKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbmZpZ0hhbmRsZXJzKGNvbmZpZywgd2VicGFja0Vudik7XG4gIGxvZy5kZWJ1Zyhgb3V0cHV0LnB1YmxpY1BhdGg6ICR7Y29uZmlnLm91dHB1dCEucHVibGljUGF0aH1gKTtcbiAgZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcucGxpbmsuanMnKSwgcHJpbnRDb25maWcoY29uZmlnKSk7XG5cbiAgLy8gY2hhbmdlVHNDb25maWdGaWxlKCk7XG4gIHJldHVybiBjb25maWc7XG59O1xuXG4vKipcbiAqIGZvcmstdHMtY2hlY2tlciBkb2VzIG5vdCB3b3JrIGZvciBmaWxlcyBvdXRzaWRlIG9mIHdvcmtzcGFjZSB3aGljaCBpcyBhY3R1YWxseSBvdXIgbGlua2VkIHNvdXJjZSBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZUZvcmtUc0NoZWNrZXJQbHVnaW4oY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG4gIGNvbnN0IHBsdWdpbnMgPSBjb25maWcucGx1Z2lucyE7XG4gIGNvbnN0IGNuc3QgPSByZXF1aXJlKG5vZGVSZXNvbHZlLnN5bmMoJ3JlYWN0LWRldi11dGlscy9Gb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbicsXG4gICAge2Jhc2VkaXI6IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMnKX0pKTtcbiAgLy8gbGV0IGZvcmtUc0NoZWNrSWR4ID0gLTE7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcGx1Z2lucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAocGx1Z2luc1tpXSBpbnN0YW5jZW9mIGNuc3QpIHtcbiAgICAgIChwbHVnaW5zW2ldIGFzIGFueSkucmVwb3J0RmlsZXMgPSBbXTtcbiAgICAgIC8vIGZvcmtUc0NoZWNrSWR4ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICAvLyBpZiAoZm9ya1RzQ2hlY2tJZHggPj0gMCkge1xuICAvLyAgIHBsdWdpbnMuc3BsaWNlKGZvcmtUc0NoZWNrSWR4LCAxKTtcbiAgLy8gICBsb2cuaW5mbygnUmVtb3ZlIEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luIGR1ZSB0byBpdHMgbm90IHdvcmtpbmcgd2l0aCBsaW5rZWQgZmlsZXMnKTtcbiAgLy8gfVxufVxuLyoqXG4gKiByZWFjdC1zY3JpcHRzL2NvbmZpZy9lbnYuanMgZmlsdGVycyBOT0RFX1BBVEggZm9yIG9ubHkgYWxsb3dpbmcgcmVsYXRpdmUgcGF0aCwgdGhpcyBicmVha3NcbiAqIFBsaW5rJ3MgTk9ERV9QQVRIIHNldHRpbmcuXG4gKi9cbmZ1bmN0aW9uIHJldmlzZU5vZGVQYXRoRW52KCkge1xuICBjb25zdCB7bm9kZVBhdGh9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG4gIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IG5vZGVQYXRoLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG4vKipcbiAqIEhlbHAgdG8gcmVwbGFjZSB0cywganMgZmlsZSBieSBjb25maWd1cmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZE91ck93blRzTG9hZGVyKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBteVRzTG9hZGVyT3B0czogVHNMb2FkZXJPcHRzID0ge1xuICAgIHRzQ29uZmlnRmlsZTogUGF0aC5yZXNvbHZlKCd0c2NvbmZpZy5qc29uJyksXG4gICAgaW5qZWN0b3I6IGFwaS5icm93c2VySW5qZWN0b3IsXG4gICAgY29tcGlsZUV4cENvbnRleHQ6IGZpbGUgPT4ge1xuICAgICAgY29uc3QgcGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgICAgaWYgKHBrZykge1xuICAgICAgICByZXR1cm4ge19fYXBpOiBhcGkuZ2V0Tm9kZUFwaUZvclBhY2thZ2UocGtnKX07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ge307XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBjb25maWcubW9kdWxlIS5ydWxlcy5wdXNoKHtcbiAgICB0ZXN0OiBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKC9cXC5banRdc3g/JC8pLFxuICAgIGVuZm9yY2U6ICdwcmUnLFxuICAgIHVzZToge1xuICAgICAgb3B0aW9uczogbXlUc0xvYWRlck9wdHMsXG4gICAgICBsb2FkZXI6IHJlcXVpcmUucmVzb2x2ZSgnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RzLWxvYWRlcicpXG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gcnVuQ29uZmlnSGFuZGxlcnMoY29uZmlnOiBDb25maWd1cmF0aW9uLCB3ZWJwYWNrRW52OiBzdHJpbmcpIHtcbiAgY29uc3Qge2dldENvbmZpZ0ZpbGVJblBhY2thZ2V9OiB0eXBlb2YgX2NyYVBhdGhzID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpO1xuICBjb25zdCBjb25maWdGaWxlSW5QYWNrYWdlID0gZ2V0Q29uZmlnRmlsZUluUGFja2FnZSgpO1xuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG4gIGlmIChjb25maWdGaWxlSW5QYWNrYWdlKSB7XG4gICAgY29uc3QgY2ZnTWdyID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoW2NvbmZpZ0ZpbGVJblBhY2thZ2VdKTtcbiAgICBjZmdNZ3IucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIF9yZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLndlYnBhY2sgIT0gbnVsbCkge1xuICAgICAgICBsb2cuaW5mbygnRXhlY3V0ZSBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gb3ZlcnJpZGVzIGZyb20gJywgY2ZnRmlsZSk7XG4gICAgICAgIGhhbmRsZXIud2VicGFjayhjb25maWcsIHdlYnBhY2tFbnYsIGNtZE9wdGlvbik7XG4gICAgICB9XG4gICAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgV2VicGFjayBjb25maWcnKTtcbiAgfVxuICBhcGkuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkKG1nciA9PiBtZ3IucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIF9yZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci53ZWJwYWNrICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIGNvbW1hbmQgbGluZSBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gb3ZlcnJpZGVzJywgY2ZnRmlsZSk7XG4gICAgICBoYW5kbGVyLndlYnBhY2soY29uZmlnLCB3ZWJwYWNrRW52LCBjbWRPcHRpb24pO1xuICAgIH1cbiAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgV2VicGFjayBjb25maWcnKSk7XG59XG5cbmZ1bmN0aW9uIGluc2VydExlc3NMb2FkZXJSdWxlKG9yaWdSdWxlczogUnVsZVNldFJ1bGVbXSk6IHZvaWQge1xuICBjb25zdCBvbmVPZiA9IG9yaWdSdWxlcy5maW5kKHJ1bGUgPT4gcnVsZS5vbmVPZik/Lm9uZU9mITtcbiAgLy8gMS4gbGV0J3MgdGFrZSBydWxlcyBmb3IgY3NzIGFzIGEgdGVtcGxhdGVcbiAgY29uc3QgY3NzUnVsZVVzZSA9IG9uZU9mLmZpbmQoc3ViUnVsZSA9PiBzdWJSdWxlLnRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiZcbiAgICAoc3ViUnVsZS50ZXN0IGFzIFJlZ0V4cCkuc291cmNlID09PSAnXFxcXC5jc3MkJyk/LnVzZSBhcyBSdWxlU2V0VXNlSXRlbVtdO1xuXG4gIGNvbnN0IGNzc01vZHVsZVJ1bGVVc2UgPSBvbmVPZi5maW5kKHN1YlJ1bGUgPT4gc3ViUnVsZS50ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmXG4gICAgKHN1YlJ1bGUudGVzdCBhcyBSZWdFeHApLnNvdXJjZSA9PT0gJ1xcXFwubW9kdWxlXFxcXC5jc3MkJyk/LnVzZSBhcyBSdWxlU2V0VXNlSXRlbVtdO1xuXG4gIGNvbnN0IGxlc3NNb2R1bGVSdWxlOiBSdWxlU2V0UnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwubW9kdWxlXFwubGVzcyQvLFxuICAgIHVzZTogY3JlYXRlTGVzc1J1bGVVc2UoY3NzTW9kdWxlUnVsZVVzZSksXG4gICAgc2lkZUVmZmVjdHM6IHRydWVcbiAgfTtcblxuICBjb25zdCBsZXNzUnVsZTogUnVsZVNldFJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmxlc3MkLyxcbiAgICAvLyBleGNsdWRlOiAvXFwubW9kdWxlXFwubGVzcyQvLFxuICAgIHVzZTogY3JlYXRlTGVzc1J1bGVVc2UoY3NzUnVsZVVzZSksXG4gICAgc2lkZUVmZmVjdHM6IHRydWVcbiAgfTtcblxuICAvLyBJbnNlcnQgYXQgbGFzdCAybmQgcG9zaXRpb24sIHJpZ2h0IGJlZm9yZSBmaWxlLWxvYWRlclxuICBvbmVPZi5zcGxpY2Uob25lT2YubGVuZ3RoIC0yLCAwLCBsZXNzTW9kdWxlUnVsZSwgbGVzc1J1bGUpO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUxlc3NSdWxlVXNlKHVzZUl0ZW1zOiBSdWxlU2V0VXNlSXRlbVtdKSB7XG4gICAgcmV0dXJuIHVzZUl0ZW1zLm1hcCh1c2VJdGVtID0+IHtcbiAgICAgIGlmICh0eXBlb2YgdXNlSXRlbSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHVzZUl0ZW0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIHVzZUl0ZW07XG4gICAgICB9XG4gICAgICBsZXQgbmV3VXNlSXRlbTogUnVsZVNldExvYWRlciA9IHsuLi51c2VJdGVtfTtcbiAgICAgIGlmICh1c2VJdGVtLmxvYWRlciAmJiAvW1xcXFwvXWNzc1xcLWxvYWRlcltcXFxcL10vLnRlc3QodXNlSXRlbS5sb2FkZXIpKSB7XG4gICAgICAgIG5ld1VzZUl0ZW0ub3B0aW9ucyA9IHtcbiAgICAgICAgICAuLi4obmV3VXNlSXRlbS5vcHRpb25zIGFzIGFueSB8fCB7fSksXG4gICAgICAgICAgaW1wb3J0TG9hZGVyczogMlxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ld1VzZUl0ZW07XG4gICAgfSkuY29uY2F0KHtcbiAgICAgIGxvYWRlcjogJ2xlc3MtbG9hZGVyJyxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgbGVzc09wdGlvbnM6IHtcbiAgICAgICAgICBqYXZhc2NyaXB0RW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAuLi5nZXRTZXR0aW5nKCkubGVzc0xvYWRlck90aGVyT3B0aW9uc1xuICAgICAgICB9LFxuICAgICAgICBhZGRpdGlvbmFsRGF0YTogZ2V0U2V0dGluZygpLmxlc3NMb2FkZXJBZGRpdGlvbmFsRGF0YVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmNvbnN0IGZpbGVMb2FkZXJPcHRpb25zID0ge1xuICAvLyBlc01vZHVsZTogZmFsc2UsXG4gIG91dHB1dFBhdGgodXJsOiBzdHJpbmcsIHJlc291cmNlUGF0aDogc3RyaW5nLCBfY29udGV4dDogc3RyaW5nKSB7XG4gICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUocmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gYCR7KHBrID8gcGsuc2hvcnROYW1lIDogJ2V4dGVybmFsJyl9LyR7dXJsfWA7XG4gIH1cbn07XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcnVsZXMgXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZUZpbGVMb2FkZXIocnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3QgY3JhUGF0aHMgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy9wYXRocycpO1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgaW5zZXJ0UmF3TG9hZGVyKHJ1bGUub25lT2YpO1xuICAgICAgcmV0dXJuIGNoYW5nZUZpbGVMb2FkZXIocnVsZS5vbmVPZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tTZXQoc2V0OiAoUnVsZVNldFJ1bGUgfCBSdWxlU2V0VXNlSXRlbSlbXSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2V0Lmxlbmd0aCA7IGkrKykge1xuICAgICAgY29uc3QgcnVsZSA9IHNldFtpXTtcblxuICAgICAgaWYgKHR5cGVvZiBydWxlID09PSAnc3RyaW5nJyAmJiAocnVsZS5pbmRleE9mKCdmaWxlLWxvYWRlcicpID49IDAgfHwgcnVsZS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMCkpIHtcbiAgICAgICAgc2V0W2ldID0ge1xuICAgICAgICAgIGxvYWRlcjogcnVsZSxcbiAgICAgICAgICBvcHRpb25zOiBmaWxlTG9hZGVyT3B0aW9uc1xuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcnVsZVNldFJ1bGUgPSBydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcjtcbiAgICAgICAgIGlmICgodHlwZW9mIHJ1bGVTZXRSdWxlLmxvYWRlcikgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICgocnVsZVNldFJ1bGUubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZignZmlsZS1sb2FkZXInKSA+PSAwIHx8XG4gICAgICAgIChydWxlU2V0UnVsZS5sb2FkZXIgYXMgc3RyaW5nKS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMFxuICAgICAgICApKSB7XG4gICAgICAgICAgaWYgKHJ1bGVTZXRSdWxlLm9wdGlvbnMpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocnVsZVNldFJ1bGUub3B0aW9ucywgZmlsZUxvYWRlck9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydWxlU2V0UnVsZS5vcHRpb25zID0gZmlsZUxvYWRlck9wdGlvbnM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cblxuICAgICAgY29uc3QgX3J1bGUgPSBydWxlIGFzIFJ1bGVTZXRSdWxlO1xuXG4gICAgICBpZiAoX3J1bGUuaW5jbHVkZSAmJiB0eXBlb2YgX3J1bGUubG9hZGVyID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAocnVsZSBhcyBSdWxlU2V0TG9hZGVyKS5sb2FkZXIhLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSA+PSAwKSB7XG4gICAgICAgIGRlbGV0ZSBfcnVsZS5pbmNsdWRlO1xuICAgICAgICBfcnVsZS50ZXN0ID0gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhfcnVsZS50ZXN0LCBjcmFQYXRocy5hcHBTcmMpO1xuICAgICAgfVxuICAgICAgaWYgKF9ydWxlLnRlc3QgJiYgX3J1bGUudGVzdC50b1N0cmluZygpID09PSAnL1xcLihqc3xtanN8anN4fHRzfHRzeCkkLycgJiZcbiAgICAgICAgX3J1bGUuaW5jbHVkZSkge1xuICAgICAgICAgIGRlbGV0ZSBfcnVsZS5pbmNsdWRlO1xuICAgICAgICAgIF9ydWxlLnRlc3QgPSBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKF9ydWxlLnRlc3QsIGNyYVBhdGhzLmFwcFNyYyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhvcmlnVGVzdDogUnVsZVNldFJ1bGVbJ3Rlc3QnXSwgYXBwU3JjPzogc3RyaW5nKSB7XG4gIHJldHVybiBmdW5jdGlvbiB0ZXN0T3VyU291cmNlRmlsZShmaWxlOiBzdHJpbmcpICB7XG4gICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG5cbiAgICBjb25zdCB5ZXMgPSAoKHBrICYmIChway5qc29uLmRyIHx8IHBrLmpzb24ucGxpbmspKSB8fCAoYXBwU3JjICYmIGZpbGUuc3RhcnRzV2l0aChhcHBTcmMpKSkgJiZcbiAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCkgPyBvcmlnVGVzdC50ZXN0KGZpbGUpIDpcbiAgICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcmlnVGVzdChmaWxlKSA6IG9yaWdUZXN0ID09PSBmaWxlKTtcbiAgICAvLyBsb2cud2FybihgW3dlYnBhY2suY29uZmlnXSBiYWJlbC1sb2FkZXI6ICR7ZmlsZX1gLCB5ZXMpO1xuICAgIHJldHVybiB5ZXM7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGluc2VydFJhd0xvYWRlcihydWxlczogUnVsZVNldFJ1bGVbXSkge1xuICBjb25zdCBodG1sTG9hZGVyUnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwuaHRtbCQvLFxuICAgIHVzZTogW1xuICAgICAge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIF1cbiAgfTtcbiAgcnVsZXMucHVzaChodG1sTG9hZGVyUnVsZSk7XG59XG5cbi8qKiBUbyBzdXBwb3J0IE1hdGVyaWFsLWNvbXBvbmVudC13ZWIgKi9cbmZ1bmN0aW9uIHJlcGxhY2VTYXNzTG9hZGVyKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKSB7XG4gIGNvbnN0IG9uZU9mID0gcnVsZXMuZmluZChydWxlID0+IHJ1bGUub25lT2YpPy5vbmVPZiE7XG4gIG9uZU9mLmZpbHRlcihzdWJSdWxlID0+IEFycmF5LmlzQXJyYXkoc3ViUnVsZS51c2UpKVxuICAgIC5mb3JFYWNoKHN1YlJ1bGUgPT4ge1xuICAgICAgY29uc3QgdXNlSXRlbSA9IChzdWJSdWxlLnVzZSBhcyBSdWxlU2V0TG9hZGVyW10pXG4gICAgICAuZmluZCh1c2VJdGVtID0+IHVzZUl0ZW0ubG9hZGVyICYmIC9zYXNzLWxvYWRlci8udGVzdCh1c2VJdGVtLmxvYWRlcikpO1xuICAgICAgaWYgKHVzZUl0ZW0gIT0gbnVsbCkge1xuICAgICAgICB1c2VJdGVtLm9wdGlvbnMgPSB7XG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHJlcXVpcmUoJ3Nhc3MnKSxcbiAgICAgICAgICB3ZWJwYWNrSW1wb3J0ZXI6IGZhbHNlLFxuICAgICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgICBzYXNzT3B0aW9uczoge1xuICAgICAgICAgICAgaW5jbHVkZVBhdGhzOiBbJ25vZGVfbW9kdWxlcycsIC4uLm5vZGVQYXRoXVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbn1cbiJdfQ==