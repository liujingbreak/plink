"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// tslint:disable:no-console
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const splitChunks_1 = __importDefault(require("@wfh/webpack-common/dist/splitChunks"));
const fs_extra_1 = __importDefault(require("fs-extra"));
// import walkPackagesAndSetupInjector from './injector-setup';
const plink_1 = require("@wfh/plink");
const path_1 = __importDefault(require("path"));
const __api_1 = __importDefault(require("__api"));
const utils_1 = require("./utils");
// import {createLazyPackageFileFinder} from '@wfh/plink/wfh/dist/package-utils';
const webpack_lib_1 = __importDefault(require("./webpack-lib"));
const template_html_plugin_1 = __importDefault(require("@wfh/webpack-common/dist/template-html-plugin"));
const resolve_1 = __importDefault(require("resolve"));
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
        injector: __api_1.default.browserInjector,
        compileExpContex: file => {
            const pkg = __api_1.default.findPackageByFile(file);
            if (pkg) {
                return { __api: __api_1.default.getNodeApiForPackage(pkg) };
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
    const { configFileInPackage } = require('./cra-scripts-paths');
    const cmdOption = utils_1.getCmdOptions();
    __api_1.default.config.configHandlerMgrChanged(mgr => mgr.runEachSync((cfgFile, result, handler) => {
        if (handler.webpack != null) {
            log.info('Execute command line Webpack configuration overrides', cfgFile);
            handler.webpack(config, webpackEnv, cmdOption);
        }
    }, 'create-react-app Webpack config'));
    if (configFileInPackage) {
        const cfgMgr = new config_handler_1.ConfigHandlerMgr([configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            if (handler.webpack != null) {
                log.info('Execute Webpack configuration overrides from ', cfgFile);
                handler.webpack(config, webpackEnv, cmdOption);
            }
        }, 'create-react-app Webpack config');
    }
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
                lessOptions: {
                    javascriptEnabled: true
                },
                additionalData: cra_scripts_setting_1.getSetting().lessLoaderAdditionalData
            }
        });
    }
}
const fileLoaderOptions = {
    // esModule: false,
    outputPath(url, resourcePath, context) {
        const pk = __api_1.default.findPackageByFile(resourcePath);
        return `${(pk ? pk.shortName : 'external')}/${url}`;
    }
};
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
            insertRawLoader(rule.oneOf);
            return findAndChangeRule(rule.oneOf);
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
            else if ((typeof rule.loader) === 'string' &&
                (rule.loader.indexOf('file-loader') >= 0 ||
                    rule.loader.indexOf('url-loader') >= 0)) {
                if (rule.options) {
                    Object.assign(rule.options, fileLoaderOptions);
                }
                else {
                    rule.options = fileLoaderOptions;
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
        const pk = __api_1.default.findPackageByFile(file);
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
    utils_1.drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check: ${__api_1.default.config.resolve('destDir', 'cra-scripts.report')}`);
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
    const origWebpackConfig = require('react-scripts/config/webpack.config');
    reviseNodePathEnv();
    process.env.INLINE_RUNTIME_CHUNK = 'true';
    const { default: craPaths } = require('./cra-scripts-paths');
    const config = origWebpackConfig(webpackEnv);
    if (webpackEnv === 'production') {
        // Try to workaround create-react-app issue: default InlineChunkPlugin 's test property does not match 
        // runtime chunk file name when we set optimization.runtimeChunk to "single" instead of default CRA's value
        config.output.filename = 'static/js/[name]-[contenthash:8].js';
        config.output.chunkFilename = 'static/js/[name]-[contenthash:8].chunk.js';
        config.output.devtoolModuleFilenameTemplate =
            info => path_1.default.relative(rootDir, info.absoluteResourcePath).replace(/\\/g, '/');
    }
    else {
        config.output.filename = 'static/js/[name].js';
        config.output.chunkFilename = 'static/js/[name].chunk.js';
    }
    const reportDir = __api_1.default.config.resolve('destDir', 'cra-scripts.report');
    fs_extra_1.default.mkdirpSync(reportDir);
    fs_extra_1.default.writeFile(path_1.default.resolve(reportDir, 'webpack.config.cra.js'), utils_1.printConfig(config), (err) => {
        if (err)
            log.error('Failed to write ' + path_1.default.resolve(reportDir, 'webpack.config.cra.js'), err);
    });
    // Make sure babel compiles source folder out side of current src directory
    findAndChangeRule(config.module.rules);
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
    Object.assign(config.resolve.alias, require('rxjs/_esm2015/path-mapping')());
    // config.plugins!.push(new ProgressPlugin({ profile: true }));
    config.stats = 'normal'; // Not working
    if (cmdOption.buildType === 'lib') {
        webpack_lib_1.default(cmdOption.buildTarget, config, nodePath);
    }
    else {
        config.plugins.unshift(new template_html_plugin_1.default());
        splitChunks_1.default(config, (mod) => {
            const file = mod.nameForCondition ? mod.nameForCondition() : null;
            if (file == null)
                return true;
            const pkg = __api_1.default.findPackageByFile(file);
            return pkg == null;
        });
    }
    runConfigHandlers(config, webpackEnv);
    log.debug(`output.publicPath: ${config.output.publicPath}`);
    fs_extra_1.default.writeFileSync(path_1.default.resolve(reportDir, 'webpack.config.plink.js'), utils_1.printConfig(config));
    // changeTsConfigFile();
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsNEJBQTRCO0FBQzVCLHVFQUFzRTtBQUV0RSx1RkFBb0U7QUFFcEUsd0RBQTBCO0FBRTFCLCtEQUErRDtBQUMvRCxzQ0FBa0M7QUFDbEMsZ0RBQXdCO0FBRXhCLGtEQUF3QjtBQUd4QixtQ0FBZ0U7QUFDaEUsaUZBQWlGO0FBQ2pGLGdFQUF1QztBQUV2Qyx5R0FBMkU7QUFDM0Usc0RBQWtDO0FBQ2xDLHFFQUF1RDtBQUN2RCx3REFBd0Q7QUFFeEQsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0FBQ2hFLE1BQU0sRUFBQyxRQUFRLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBaUd6RTs7R0FFRztBQUNILFNBQVMseUJBQXlCLENBQUMsTUFBcUI7SUFDdEQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQVEsQ0FBQztJQUNoQyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsaUJBQVcsQ0FBQyxJQUFJLENBQUMsNENBQTRDLEVBQ2hGLEVBQUMsT0FBTyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztJQUMxRCwyQkFBMkI7SUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM5QyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLEVBQUU7WUFDN0IsT0FBTyxDQUFDLENBQUMsQ0FBUyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDckMsc0JBQXNC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QUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IHsgQ29uZmlnSGFuZGxlck1nciB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHR5cGUgeyBQbGlua0VudiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3Qvbm9kZS1wYXRoJztcbmltcG9ydCBzZXR1cFNwbGl0Q2h1bmtzIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC9zcGxpdENodW5rcyc7XG5pbXBvcnQgeyBPcHRpb25zIGFzIFRzTG9hZGVyT3B0cyB9IGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC90cy1sb2FkZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvciBmcm9tICcuL2luamVjdG9yLXNldHVwJztcbmltcG9ydCB7bG9nZ2VyfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29uZmlndXJhdGlvbiwgUnVsZVNldExvYWRlciwgUnVsZVNldFJ1bGUsIFJ1bGVTZXRVc2VJdGVtIH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbi8vIGltcG9ydCB7IGZpbmRQYWNrYWdlIH0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbmltcG9ydCB7IFJlYWN0U2NyaXB0c0hhbmRsZXIgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGRyYXdQdXBweSwgZ2V0Q21kT3B0aW9ucywgcHJpbnRDb25maWcgfSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNoYW5nZTRsaWIgZnJvbSAnLi93ZWJwYWNrLWxpYic7XG5pbXBvcnQgKiBhcyBfY3JhUGF0aHMgZnJvbSAnLi9jcmEtc2NyaXB0cy1wYXRocyc7XG5pbXBvcnQgVGVtcGxhdGVQbHVnaW4gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RlbXBsYXRlLWh0bWwtcGx1Z2luJztcbmltcG9ydCBub2RlUmVzb2x2ZSBmcm9tICdyZXNvbHZlJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9jcmEtc2NyaXB0cy1zZXR0aW5nJztcbi8vIGltcG9ydCB7Y2hhbmdlVHNDb25maWdGaWxlfSBmcm9tICcuL2NoYW5nZS10c2NvbmZpZyc7XG5cbmNvbnN0IGxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0B3ZmgvY3JhLXNjcmlwdHMud2VicGFjay1jb25maWcnKTtcbmNvbnN0IHtub2RlUGF0aCwgcm9vdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxuZXhwb3J0ID0gZnVuY3Rpb24od2VicGFja0VudjogJ3Byb2R1Y3Rpb24nIHwgJ2RldmVsb3BtZW50Jykge1xuICBkcmF3UHVwcHkoJ1Bvb2luZyBvbiBjcmVhdGUtcmVhY3QtYXBwJywgYElmIHlvdSB3YW50IHRvIGtub3cgaG93IFdlYnBhY2sgaXMgY29uZmlndXJlZCwgY2hlY2s6ICR7YXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2NyYS1zY3JpcHRzLnJlcG9ydCcpfWApO1xuXG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcbiAgLy8gYG5wbSBydW4gYnVpbGRgIGJ5IGRlZmF1bHQgaXMgaW4gcHJvZHVjdGlvbiBtb2RlLCBiZWxvdyBoYWNrcyB0aGUgd2F5IHJlYWN0LXNjcmlwdHMgZG9lc1xuICBpZiAoY21kT3B0aW9uLmRldk1vZGUgfHwgY21kT3B0aW9uLndhdGNoKSB7XG4gICAgd2VicGFja0VudiA9ICdkZXZlbG9wbWVudCc7XG4gICAgbG9nLmluZm8oJ0RldmVsb3BtZW50IG1vZGUgaXMgb246Jywgd2VicGFja0Vudik7XG4gIH0gZWxzZSB7XG4gICAgLy8gcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ2ZhbHNlJztcbiAgfVxuICBsb2cuaW5mbygnd2VicGFja0VudiA6Jywgd2VicGFja0Vudik7XG4gIGNvbnN0IG9yaWdXZWJwYWNrQ29uZmlnID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvd2VicGFjay5jb25maWcnKTtcbiAgcmV2aXNlTm9kZVBhdGhFbnYoKTtcblxuICBwcm9jZXNzLmVudi5JTkxJTkVfUlVOVElNRV9DSFVOSyA9ICd0cnVlJztcblxuICBjb25zdCB7ZGVmYXVsdDogY3JhUGF0aHN9OiB0eXBlb2YgX2NyYVBhdGhzID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpO1xuXG4gIGNvbnN0IGNvbmZpZzogQ29uZmlndXJhdGlvbiA9IG9yaWdXZWJwYWNrQ29uZmlnKHdlYnBhY2tFbnYpO1xuICBpZiAod2VicGFja0VudiA9PT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgLy8gVHJ5IHRvIHdvcmthcm91bmQgY3JlYXRlLXJlYWN0LWFwcCBpc3N1ZTogZGVmYXVsdCBJbmxpbmVDaHVua1BsdWdpbiAncyB0ZXN0IHByb3BlcnR5IGRvZXMgbm90IG1hdGNoIFxuICAgIC8vIHJ1bnRpbWUgY2h1bmsgZmlsZSBuYW1lIHdoZW4gd2Ugc2V0IG9wdGltaXphdGlvbi5ydW50aW1lQ2h1bmsgdG8gXCJzaW5nbGVcIiBpbnN0ZWFkIG9mIGRlZmF1bHQgQ1JBJ3MgdmFsdWVcbiAgICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLVtjb250ZW50aGFzaDo4XS5qcyc7XG4gICAgY29uZmlnLm91dHB1dCEuY2h1bmtGaWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLVtjb250ZW50aGFzaDo4XS5jaHVuay5qcyc7XG4gICAgY29uZmlnLm91dHB1dCEuZGV2dG9vbE1vZHVsZUZpbGVuYW1lVGVtcGxhdGUgPVxuICAgICAgaW5mbyA9PiBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIGluZm8uYWJzb2x1dGVSZXNvdXJjZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgfSBlbHNlIHtcbiAgICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5jaHVua0ZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0uY2h1bmsuanMnO1xuICB9XG5cbiAgY29uc3QgcmVwb3J0RGlyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2NyYS1zY3JpcHRzLnJlcG9ydCcpO1xuICBmcy5ta2RpcnBTeW5jKHJlcG9ydERpcik7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcuY3JhLmpzJyksIHByaW50Q29uZmlnKGNvbmZpZyksIChlcnIpID0+IHtcbiAgICBpZiAoZXJyKVxuICAgICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgJyArIFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICd3ZWJwYWNrLmNvbmZpZy5jcmEuanMnKSwgZXJyKTtcbiAgfSk7XG5cbiAgLy8gTWFrZSBzdXJlIGJhYmVsIGNvbXBpbGVzIHNvdXJjZSBmb2xkZXIgb3V0IHNpZGUgb2YgY3VycmVudCBzcmMgZGlyZWN0b3J5XG4gIGZpbmRBbmRDaGFuZ2VSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcbiAgcmVwbGFjZVNhc3NMb2FkZXIoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICBhcHBlbmRPdXJPd25Uc0xvYWRlcihjb25maWcpO1xuICBpbnNlcnRMZXNzTG9hZGVyUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIGNoYW5nZUZvcmtUc0NoZWNrZXJQbHVnaW4oY29uZmlnKTtcblxuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2FwcCcpIHtcbiAgICBjb25maWcub3V0cHV0IS5wYXRoID0gY3JhUGF0aHMoKS5hcHBCdWlsZDtcbiAgICAvLyBjb25maWcuZGV2dG9vbCA9ICdzb3VyY2UtbWFwJztcbiAgfVxuXG4gIC8vIFJlbW92ZSBNb2R1bGVzU2NvcGVQbHVnaW4gZnJvbSByZXNvbHZlIHBsdWdpbnMsIGl0IHN0b3BzIHVzIHVzaW5nIHNvdXJjZSBmb2xkIG91dCBzaWRlIG9mIHByb2plY3QgZGlyZWN0b3J5XG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5wbHVnaW5zKSB7XG4gICAgY29uc3QgTW9kdWxlU2NvcGVQbHVnaW4gPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvTW9kdWxlU2NvcGVQbHVnaW4nKTtcbiAgICBjb25zdCBzcmNTY29wZVBsdWdpbklkeCA9IGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuZmluZEluZGV4KHBsdWdpbiA9PiBwbHVnaW4gaW5zdGFuY2VvZiBNb2R1bGVTY29wZVBsdWdpbik7XG4gICAgaWYgKHNyY1Njb3BlUGx1Z2luSWR4ID49IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuc3BsaWNlKHNyY1Njb3BlUGx1Z2luSWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICAvLyBjb25maWcucmVzb2x2ZSEuc3ltbGlua3MgPSBmYWxzZTtcblxuICBjb25zdCByZXNvbHZlTW9kdWxlcyA9IFsnbm9kZV9tb2R1bGVzJywgLi4ubm9kZVBhdGhdO1xuICBjb25maWcucmVzb2x2ZSEubW9kdWxlcyA9IHJlc29sdmVNb2R1bGVzO1xuICBpZiAoY29uZmlnLnJlc29sdmVMb2FkZXIgPT0gbnVsbClcbiAgICBjb25maWcucmVzb2x2ZUxvYWRlciA9IHt9O1xuICBjb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID0gcmVzb2x2ZU1vZHVsZXM7XG5cbiAgT2JqZWN0LmFzc2lnbihjb25maWcucmVzb2x2ZSEuYWxpYXMsIHJlcXVpcmUoJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJykoKSk7XG5cbiAgLy8gY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IFByb2dyZXNzUGx1Z2luKHsgcHJvZmlsZTogdHJ1ZSB9KSk7XG5cbiAgY29uZmlnLnN0YXRzID0gJ25vcm1hbCc7IC8vIE5vdCB3b3JraW5nXG5cbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdsaWInKSB7XG4gICAgY2hhbmdlNGxpYihjbWRPcHRpb24uYnVpbGRUYXJnZXQsIGNvbmZpZywgbm9kZVBhdGgpO1xuICB9IGVsc2Uge1xuICAgIGNvbmZpZy5wbHVnaW5zIS51bnNoaWZ0KG5ldyBUZW1wbGF0ZVBsdWdpbigpKTtcbiAgICBzZXR1cFNwbGl0Q2h1bmtzKGNvbmZpZywgKG1vZCkgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IG1vZC5uYW1lRm9yQ29uZGl0aW9uID8gbW9kLm5hbWVGb3JDb25kaXRpb24oKSA6IG51bGw7XG4gICAgICBpZiAoZmlsZSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNvbnN0IHBrZyA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICAgIHJldHVybiBwa2cgPT0gbnVsbDtcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbmZpZ0hhbmRsZXJzKGNvbmZpZywgd2VicGFja0Vudik7XG4gIGxvZy5kZWJ1Zyhgb3V0cHV0LnB1YmxpY1BhdGg6ICR7Y29uZmlnLm91dHB1dCEucHVibGljUGF0aH1gKTtcbiAgZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcucGxpbmsuanMnKSwgcHJpbnRDb25maWcoY29uZmlnKSk7XG5cbiAgLy8gY2hhbmdlVHNDb25maWdGaWxlKCk7XG4gIHJldHVybiBjb25maWc7XG59O1xuXG4vKipcbiAqIGZvcmstdHMtY2hlY2tlciBkb2VzIG5vdCB3b3JrIGZvciBmaWxlcyBvdXRzaWRlIG9mIHdvcmtzcGFjZSB3aGljaCBpcyBhY3R1YWxseSBvdXIgbGlua2VkIHNvdXJjZSBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZUZvcmtUc0NoZWNrZXJQbHVnaW4oY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG4gIGNvbnN0IHBsdWdpbnMgPSBjb25maWcucGx1Z2lucyE7XG4gIGNvbnN0IGNuc3QgPSByZXF1aXJlKG5vZGVSZXNvbHZlLnN5bmMoJ3JlYWN0LWRldi11dGlscy9Gb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbicsXG4gICAge2Jhc2VkaXI6IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMnKX0pKTtcbiAgLy8gbGV0IGZvcmtUc0NoZWNrSWR4ID0gLTE7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcGx1Z2lucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAocGx1Z2luc1tpXSBpbnN0YW5jZW9mIGNuc3QpIHtcbiAgICAgIChwbHVnaW5zW2ldIGFzIGFueSkucmVwb3J0RmlsZXMgPSBbXTtcbiAgICAgIC8vIGZvcmtUc0NoZWNrSWR4ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICAvLyBpZiAoZm9ya1RzQ2hlY2tJZHggPj0gMCkge1xuICAvLyAgIHBsdWdpbnMuc3BsaWNlKGZvcmtUc0NoZWNrSWR4LCAxKTtcbiAgLy8gICBsb2cuaW5mbygnUmVtb3ZlIEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luIGR1ZSB0byBpdHMgbm90IHdvcmtpbmcgd2l0aCBsaW5rZWQgZmlsZXMnKTtcbiAgLy8gfVxufVxuLyoqXG4gKiByZWFjdC1zY3JpcHRzL2NvbmZpZy9lbnYuanMgZmlsdGVycyBOT0RFX1BBVEggZm9yIG9ubHkgYWxsb3dpbmcgcmVsYXRpdmUgcGF0aCwgdGhpcyBicmVha3NcbiAqIFBsaW5rJ3MgTk9ERV9QQVRIIHNldHRpbmcuXG4gKi9cbmZ1bmN0aW9uIHJldmlzZU5vZGVQYXRoRW52KCkge1xuICBjb25zdCB7bm9kZVBhdGh9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG4gIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IG5vZGVQYXRoLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG4vKipcbiAqIEhlbHAgdG8gcmVwbGFjZSB0cywganMgZmlsZSBieSBjb25maWd1cmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZE91ck93blRzTG9hZGVyKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBteVRzTG9hZGVyT3B0czogVHNMb2FkZXJPcHRzID0ge1xuICAgIHRzQ29uZmlnRmlsZTogUGF0aC5yZXNvbHZlKCd0c2NvbmZpZy5qc29uJyksXG4gICAgaW5qZWN0b3I6IGFwaS5icm93c2VySW5qZWN0b3IsXG4gICAgY29tcGlsZUV4cENvbnRleDogZmlsZSA9PiB7XG4gICAgICBjb25zdCBwa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICBpZiAocGtnKSB7XG4gICAgICAgIHJldHVybiB7X19hcGk6IGFwaS5nZXROb2RlQXBpRm9yUGFja2FnZShwa2cpfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIGNvbmZpZy5tb2R1bGUhLnJ1bGVzLnB1c2goe1xuICAgIHRlc3Q6IGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMoL1xcLltqdF1zeD8kLyksXG4gICAgZW5mb3JjZTogJ3ByZScsXG4gICAgdXNlOiB7XG4gICAgICBvcHRpb25zOiBteVRzTG9hZGVyT3B0cyxcbiAgICAgIGxvYWRlcjogcmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvdHMtbG9hZGVyJylcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBydW5Db25maWdIYW5kbGVycyhjb25maWc6IENvbmZpZ3VyYXRpb24sIHdlYnBhY2tFbnY6IHN0cmluZykge1xuICBjb25zdCB7Y29uZmlnRmlsZUluUGFja2FnZX06IHR5cGVvZiBfY3JhUGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJyk7XG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcbiAgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci53ZWJwYWNrICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIGNvbW1hbmQgbGluZSBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gb3ZlcnJpZGVzJywgY2ZnRmlsZSk7XG4gICAgICBoYW5kbGVyLndlYnBhY2soY29uZmlnLCB3ZWJwYWNrRW52LCBjbWRPcHRpb24pO1xuICAgIH1cbiAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgV2VicGFjayBjb25maWcnKSk7XG5cbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci53ZWJwYWNrICE9IG51bGwpIHtcbiAgICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgV2VicGFjayBjb25maWd1cmF0aW9uIG92ZXJyaWRlcyBmcm9tICcsIGNmZ0ZpbGUpO1xuICAgICAgICBoYW5kbGVyLndlYnBhY2soY29uZmlnLCB3ZWJwYWNrRW52LCBjbWRPcHRpb24pO1xuICAgICAgfVxuICAgIH0sICdjcmVhdGUtcmVhY3QtYXBwIFdlYnBhY2sgY29uZmlnJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5zZXJ0TGVzc0xvYWRlclJ1bGUob3JpZ1J1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IG9uZU9mID0gb3JpZ1J1bGVzLmZpbmQocnVsZSA9PiBydWxlLm9uZU9mKT8ub25lT2YhO1xuICAvLyAxLiBsZXQncyB0YWtlIHJ1bGVzIGZvciBjc3MgYXMgYSB0ZW1wbGF0ZVxuICBjb25zdCBjc3NSdWxlVXNlID0gb25lT2YuZmluZChzdWJSdWxlID0+IHN1YlJ1bGUudGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJlxuICAgIChzdWJSdWxlLnRlc3QgYXMgUmVnRXhwKS5zb3VyY2UgPT09ICdcXFxcLmNzcyQnKT8udXNlIGFzIFJ1bGVTZXRVc2VJdGVtW107XG5cbiAgY29uc3QgY3NzTW9kdWxlUnVsZVVzZSA9IG9uZU9mLmZpbmQoc3ViUnVsZSA9PiBzdWJSdWxlLnRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiZcbiAgICAoc3ViUnVsZS50ZXN0IGFzIFJlZ0V4cCkuc291cmNlID09PSAnXFxcXC5tb2R1bGVcXFxcLmNzcyQnKT8udXNlIGFzIFJ1bGVTZXRVc2VJdGVtW107XG5cbiAgY29uc3QgbGVzc01vZHVsZVJ1bGU6IFJ1bGVTZXRSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC5tb2R1bGVcXC5sZXNzJC8sXG4gICAgdXNlOiBjcmVhdGVMZXNzUnVsZVVzZShjc3NNb2R1bGVSdWxlVXNlKSxcbiAgICBzaWRlRWZmZWN0czogdHJ1ZVxuICB9O1xuXG4gIGNvbnN0IGxlc3NSdWxlOiBSdWxlU2V0UnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwubGVzcyQvLFxuICAgIC8vIGV4Y2x1ZGU6IC9cXC5tb2R1bGVcXC5sZXNzJC8sXG4gICAgdXNlOiBjcmVhdGVMZXNzUnVsZVVzZShjc3NSdWxlVXNlKSxcbiAgICBzaWRlRWZmZWN0czogdHJ1ZVxuICB9O1xuXG4gIC8vIEluc2VydCBhdCBsYXN0IDJuZCBwb3NpdGlvbiwgcmlnaHQgYmVmb3JlIGZpbGUtbG9hZGVyXG4gIG9uZU9mLnNwbGljZShvbmVPZi5sZW5ndGggLTIsIDAsIGxlc3NNb2R1bGVSdWxlLCBsZXNzUnVsZSk7XG5cbiAgZnVuY3Rpb24gY3JlYXRlTGVzc1J1bGVVc2UodXNlSXRlbXM6IFJ1bGVTZXRVc2VJdGVtW10pIHtcbiAgICByZXR1cm4gdXNlSXRlbXMubWFwKHVzZUl0ZW0gPT4ge1xuICAgICAgaWYgKHR5cGVvZiB1c2VJdGVtID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdXNlSXRlbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gdXNlSXRlbTtcbiAgICAgIH1cbiAgICAgIGxldCBuZXdVc2VJdGVtOiBSdWxlU2V0TG9hZGVyID0gey4uLnVzZUl0ZW19O1xuICAgICAgaWYgKHVzZUl0ZW0ubG9hZGVyICYmIC9bXFxcXC9dY3NzXFwtbG9hZGVyW1xcXFwvXS8udGVzdCh1c2VJdGVtLmxvYWRlcikpIHtcbiAgICAgICAgbmV3VXNlSXRlbS5vcHRpb25zID0ge1xuICAgICAgICAgIC4uLihuZXdVc2VJdGVtLm9wdGlvbnMgYXMgYW55IHx8IHt9KSxcbiAgICAgICAgICBpbXBvcnRMb2FkZXJzOiAyXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3VXNlSXRlbTtcbiAgICB9KS5jb25jYXQoe1xuICAgICAgbG9hZGVyOiAnbGVzcy1sb2FkZXInLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBsZXNzT3B0aW9uczoge1xuICAgICAgICAgIGphdmFzY3JpcHRFbmFibGVkOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxEYXRhOiBnZXRTZXR0aW5nKCkubGVzc0xvYWRlckFkZGl0aW9uYWxEYXRhXG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuY29uc3QgZmlsZUxvYWRlck9wdGlvbnMgPSB7XG4gIC8vIGVzTW9kdWxlOiBmYWxzZSxcbiAgb3V0cHV0UGF0aCh1cmw6IHN0cmluZywgcmVzb3VyY2VQYXRoOiBzdHJpbmcsIGNvbnRleHQ6IHN0cmluZykge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGAkeyhwayA/IHBrLnNob3J0TmFtZSA6ICdleHRlcm5hbCcpfS8ke3VybH1gO1xuICB9XG59O1xuXG5mdW5jdGlvbiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlczogUnVsZVNldFJ1bGVbXSk6IHZvaWQge1xuICBjb25zdCBjcmFQYXRocyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzJyk7XG4gIC8vIFRPRE86IGNoZWNrIGluIGNhc2UgQ1JBIHdpbGwgdXNlIFJ1bGUudXNlIGluc3RlYWQgb2YgXCJsb2FkZXJcIlxuICBjaGVja1NldChydWxlcyk7XG4gIGZvciAoY29uc3QgcnVsZSBvZiBydWxlcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHJ1bGUudXNlKSkge1xuICAgICAgY2hlY2tTZXQocnVsZS51c2UpO1xuXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJ1bGUubG9hZGVyKSkge1xuICAgICAgICBjaGVja1NldChydWxlLmxvYWRlcik7XG4gICAgfSBlbHNlIGlmIChydWxlLm9uZU9mKSB7XG4gICAgICBpbnNlcnRSYXdMb2FkZXIocnVsZS5vbmVPZik7XG4gICAgICByZXR1cm4gZmluZEFuZENoYW5nZVJ1bGUocnVsZS5vbmVPZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tTZXQoc2V0OiAoUnVsZVNldFJ1bGUgfCBSdWxlU2V0VXNlSXRlbSlbXSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2V0Lmxlbmd0aCA7IGkrKykge1xuICAgICAgY29uc3QgcnVsZSA9IHNldFtpXTtcbiAgICAgIGlmICh0eXBlb2YgcnVsZSA9PT0gJ3N0cmluZycgJiYgKHJ1bGUuaW5kZXhPZignZmlsZS1sb2FkZXInKSA+PSAwIHx8IHJ1bGUuaW5kZXhPZigndXJsLWxvYWRlcicpID49IDApKSB7XG4gICAgICAgIHNldFtpXSA9IHtcbiAgICAgICAgICBsb2FkZXI6IHJ1bGUsXG4gICAgICAgICAgb3B0aW9uczogZmlsZUxvYWRlck9wdGlvbnNcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAoKHR5cGVvZiAocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLmxvYWRlcikgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICgoKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5sb2FkZXIgYXMgc3RyaW5nKS5pbmRleE9mKCdmaWxlLWxvYWRlcicpID49IDAgfHxcbiAgICAgICAgKChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZigndXJsLWxvYWRlcicpID49IDBcbiAgICAgICAgKSkge1xuICAgICAgICAgIGlmICgocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLm9wdGlvbnMpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5vcHRpb25zLCBmaWxlTG9hZGVyT3B0aW9ucyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikub3B0aW9ucyA9IGZpbGVMb2FkZXJPcHRpb25zO1xuICAgICAgICAgIH1cbiAgICAgIH1cblxuXG4gICAgICBjb25zdCBfcnVsZSA9IHJ1bGUgYXMgUnVsZVNldFJ1bGU7XG5cbiAgICAgIGlmIChfcnVsZS5pbmNsdWRlICYmIHR5cGVvZiBfcnVsZS5sb2FkZXIgPT09ICdzdHJpbmcnICYmXG4gICAgICAgIChydWxlIGFzIFJ1bGVTZXRMb2FkZXIpLmxvYWRlciEuaW5kZXhPZihQYXRoLnNlcCArICdiYWJlbC1sb2FkZXInICsgUGF0aC5zZXApID49IDApIHtcbiAgICAgICAgZGVsZXRlIF9ydWxlLmluY2x1ZGU7XG4gICAgICAgIF9ydWxlLnRlc3QgPSBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKF9ydWxlLnRlc3QsIGNyYVBhdGhzLmFwcFNyYyk7XG4gICAgICB9XG4gICAgICBpZiAoX3J1bGUudGVzdCAmJiBfcnVsZS50ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFwuKGpzfG1qc3xqc3h8dHN8dHN4KSQvJyAmJlxuICAgICAgICBfcnVsZS5pbmNsdWRlKSB7XG4gICAgICAgICAgZGVsZXRlIF9ydWxlLmluY2x1ZGU7XG4gICAgICAgICAgX3J1bGUudGVzdCA9IGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMoX3J1bGUudGVzdCwgY3JhUGF0aHMuYXBwU3JjKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKG9yaWdUZXN0OiBSdWxlU2V0UnVsZVsndGVzdCddLCBhcHBTcmM/OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHRlc3RPdXJTb3VyY2VGaWxlKGZpbGU6IHN0cmluZykgIHtcbiAgICBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICBpZiAocGsgPT0gbnVsbCAmJiBmaWxlLmluZGV4T2YoJy5saW5rcycpID4gMClcbiAgICAgIGxvZy53YXJuKCdjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjJywgZmlsZSwgcGspO1xuICAgIGNvbnN0IHllcyA9ICgocGsgJiYgKHBrLmpzb24uZHIgfHwgcGsuanNvbi5wbGluaykpIHx8IChhcHBTcmMgJiYgZmlsZS5zdGFydHNXaXRoKGFwcFNyYykpKSAmJlxuICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgUmVnRXhwKSA/IG9yaWdUZXN0LnRlc3QoZmlsZSkgOlxuICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IG9yaWdUZXN0KGZpbGUpIDogb3JpZ1Rlc3QgPT09IGZpbGUpO1xuICAgIC8vIGxvZy5pbmZvKGBbd2VicGFjay5jb25maWddIGJhYmVsLWxvYWRlcjogJHtmaWxlfWAsIHllcyk7XG4gICAgcmV0dXJuIHllcztcbiAgfTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0UmF3TG9hZGVyKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKSB7XG4gIGNvbnN0IGh0bWxMb2FkZXJSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC5odG1sJC8sXG4gICAgdXNlOiBbXG4gICAgICB7bG9hZGVyOiAncmF3LWxvYWRlcid9XG4gICAgXVxuICB9O1xuICBydWxlcy5wdXNoKGh0bWxMb2FkZXJSdWxlKTtcbn1cblxuLyoqIFRvIHN1cHBvcnQgTWF0ZXJpYWwtY29tcG9uZW50LXdlYiAqL1xuZnVuY3Rpb24gcmVwbGFjZVNhc3NMb2FkZXIocnVsZXM6IFJ1bGVTZXRSdWxlW10pIHtcbiAgY29uc3Qgb25lT2YgPSBydWxlcy5maW5kKHJ1bGUgPT4gcnVsZS5vbmVPZik/Lm9uZU9mITtcbiAgb25lT2YuZmlsdGVyKHN1YlJ1bGUgPT4gQXJyYXkuaXNBcnJheShzdWJSdWxlLnVzZSkpXG4gICAgLmZvckVhY2goc3ViUnVsZSA9PiB7XG4gICAgICBjb25zdCB1c2VJdGVtID0gKHN1YlJ1bGUudXNlIGFzIFJ1bGVTZXRMb2FkZXJbXSlcbiAgICAgIC5maW5kKHVzZUl0ZW0gPT4gdXNlSXRlbS5sb2FkZXIgJiYgL3Nhc3MtbG9hZGVyLy50ZXN0KHVzZUl0ZW0ubG9hZGVyKSk7XG4gICAgICBpZiAodXNlSXRlbSAhPSBudWxsKSB7XG4gICAgICAgIHVzZUl0ZW0ub3B0aW9ucyA9IHtcbiAgICAgICAgICBpbXBsZW1lbnRhdGlvbjogcmVxdWlyZSgnc2FzcycpLFxuICAgICAgICAgIHdlYnBhY2tJbXBvcnRlcjogZmFsc2UsXG4gICAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICAgIHNhc3NPcHRpb25zOiB7XG4gICAgICAgICAgICBpbmNsdWRlUGF0aHM6IFsnbm9kZV9tb2R1bGVzJywgLi4ubm9kZVBhdGhdXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pO1xufVxuIl19