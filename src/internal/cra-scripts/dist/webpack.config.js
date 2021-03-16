"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// tslint:disable:no-console
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const splitChunks_1 = __importDefault(require("@wfh/webpack-common/dist/splitChunks"));
const fs_extra_1 = __importDefault(require("fs-extra"));
// import walkPackagesAndSetupInjector from './injector-setup';
const log4js_1 = __importDefault(require("log4js"));
const path_1 = __importDefault(require("path"));
const __api_1 = __importDefault(require("__api"));
const utils_1 = require("./utils");
// import {createLazyPackageFileFinder} from '@wfh/plink/wfh/dist/package-utils';
const webpack_lib_1 = __importDefault(require("./webpack-lib"));
const template_html_plugin_1 = __importDefault(require("@wfh/webpack-common/dist/template-html-plugin"));
const resolve_1 = __importDefault(require("resolve"));
const cra_scripts_setting_1 = require("../isom/cra-scripts-setting");
// import {changeTsConfigFile} from './change-tsconfig';
const log = log4js_1.default.getLogger('cra-scripts');
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
    console.log('process.env.PUBLIC_URL=', process.env.PUBLIC_URL);
    const cmdOption = utils_1.getCmdOptions();
    // `npm run build` by default is in production mode, below hacks the way react-scripts does
    if (cmdOption.devMode || cmdOption.watch) {
        webpackEnv = 'development';
        log.info('Development mode is on:', webpackEnv);
    }
    else {
        // process.env.GENERATE_SOURCEMAP = 'false';
    }
    log.info('webpackEnv =', webpackEnv);
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
    log.info(`output.publicPath: ${config.output.publicPath}`);
    fs_extra_1.default.writeFileSync(path_1.default.resolve(reportDir, 'webpack.config.plink.js'), utils_1.printConfig(config));
    // changeTsConfigFile();
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsNEJBQTRCO0FBQzVCLHVFQUFzRTtBQUV0RSx1RkFBb0U7QUFFcEUsd0RBQTBCO0FBRTFCLCtEQUErRDtBQUMvRCxvREFBNEI7QUFDNUIsZ0RBQXdCO0FBRXhCLGtEQUF3QjtBQUd4QixtQ0FBZ0U7QUFDaEUsaUZBQWlGO0FBQ2pGLGdFQUF1QztBQUV2Qyx5R0FBMkU7QUFDM0Usc0RBQWtDO0FBQ2xDLHFFQUF1RDtBQUN2RCx3REFBd0Q7QUFFeEQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDNUMsTUFBTSxFQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBUSxDQUFhLENBQUM7QUFrR3pFOztHQUVHO0FBQ0gsU0FBUyx5QkFBeUIsQ0FBQyxNQUFxQjtJQUN0RCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBUSxDQUFDO0lBQ2hDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxpQkFBVyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFDaEYsRUFBQyxPQUFPLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELDJCQUEyQjtJQUMzQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzlDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZLElBQUksRUFBRTtZQUM3QixPQUFPLENBQUMsQ0FBQyxDQUFTLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztZQUNyQyxzQkFBc0I7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QkFBeUIsQ0FBQyxFQUFFLG1CQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUUxRix3QkFBd0I7SUFDeEIsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IHsgQ29uZmlnSGFuZGxlck1nciB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHR5cGUgeyBQbGlua0VudiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3Qvbm9kZS1wYXRoJztcbmltcG9ydCBzZXR1cFNwbGl0Q2h1bmtzIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC9zcGxpdENodW5rcyc7XG5pbXBvcnQgeyBPcHRpb25zIGFzIFRzTG9hZGVyT3B0cyB9IGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC90cy1sb2FkZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvciBmcm9tICcuL2luamVjdG9yLXNldHVwJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29uZmlndXJhdGlvbiwgUnVsZVNldExvYWRlciwgUnVsZVNldFJ1bGUsIFJ1bGVTZXRVc2VJdGVtIH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbi8vIGltcG9ydCB7IGZpbmRQYWNrYWdlIH0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbmltcG9ydCB7IFJlYWN0U2NyaXB0c0hhbmRsZXIgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGRyYXdQdXBweSwgZ2V0Q21kT3B0aW9ucywgcHJpbnRDb25maWcgfSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNoYW5nZTRsaWIgZnJvbSAnLi93ZWJwYWNrLWxpYic7XG5pbXBvcnQgKiBhcyBfY3JhUGF0aHMgZnJvbSAnLi9jcmEtc2NyaXB0cy1wYXRocyc7XG5pbXBvcnQgVGVtcGxhdGVQbHVnaW4gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RlbXBsYXRlLWh0bWwtcGx1Z2luJztcbmltcG9ydCBub2RlUmVzb2x2ZSBmcm9tICdyZXNvbHZlJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9jcmEtc2NyaXB0cy1zZXR0aW5nJztcbi8vIGltcG9ydCB7Y2hhbmdlVHNDb25maWdGaWxlfSBmcm9tICcuL2NoYW5nZS10c2NvbmZpZyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2NyYS1zY3JpcHRzJyk7XG5jb25zdCB7bm9kZVBhdGgsIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cbmV4cG9ydCA9IGZ1bmN0aW9uKHdlYnBhY2tFbnY6ICdwcm9kdWN0aW9uJyB8ICdkZXZlbG9wbWVudCcpIHtcbiAgZHJhd1B1cHB5KCdQb29pbmcgb24gY3JlYXRlLXJlYWN0LWFwcCcsIGBJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBXZWJwYWNrIGlzIGNvbmZpZ3VyZWQsIGNoZWNrOiAke2FwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdjcmEtc2NyaXB0cy5yZXBvcnQnKX1gKTtcbiAgY29uc29sZS5sb2coJ3Byb2Nlc3MuZW52LlBVQkxJQ19VUkw9JywgcHJvY2Vzcy5lbnYuUFVCTElDX1VSTCk7XG5cbiAgY29uc3QgY21kT3B0aW9uID0gZ2V0Q21kT3B0aW9ucygpO1xuICAvLyBgbnBtIHJ1biBidWlsZGAgYnkgZGVmYXVsdCBpcyBpbiBwcm9kdWN0aW9uIG1vZGUsIGJlbG93IGhhY2tzIHRoZSB3YXkgcmVhY3Qtc2NyaXB0cyBkb2VzXG4gIGlmIChjbWRPcHRpb24uZGV2TW9kZSB8fCBjbWRPcHRpb24ud2F0Y2gpIHtcbiAgICB3ZWJwYWNrRW52ID0gJ2RldmVsb3BtZW50JztcbiAgICBsb2cuaW5mbygnRGV2ZWxvcG1lbnQgbW9kZSBpcyBvbjonLCB3ZWJwYWNrRW52KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBwcm9jZXNzLmVudi5HRU5FUkFURV9TT1VSQ0VNQVAgPSAnZmFsc2UnO1xuICB9XG4gIGxvZy5pbmZvKCd3ZWJwYWNrRW52ID0nLCB3ZWJwYWNrRW52KTtcbiAgY29uc3Qgb3JpZ1dlYnBhY2tDb25maWcgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy93ZWJwYWNrLmNvbmZpZycpO1xuICByZXZpc2VOb2RlUGF0aEVudigpO1xuXG4gIHByb2Nlc3MuZW52LklOTElORV9SVU5USU1FX0NIVU5LID0gJ3RydWUnO1xuXG4gIGNvbnN0IHtkZWZhdWx0OiBjcmFQYXRoc306IHR5cGVvZiBfY3JhUGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJyk7XG5cbiAgY29uc3QgY29uZmlnOiBDb25maWd1cmF0aW9uID0gb3JpZ1dlYnBhY2tDb25maWcod2VicGFja0Vudik7XG4gIGlmICh3ZWJwYWNrRW52ID09PSAncHJvZHVjdGlvbicpIHtcbiAgICAvLyBUcnkgdG8gd29ya2Fyb3VuZCBjcmVhdGUtcmVhY3QtYXBwIGlzc3VlOiBkZWZhdWx0IElubGluZUNodW5rUGx1Z2luICdzIHRlc3QgcHJvcGVydHkgZG9lcyBub3QgbWF0Y2ggXG4gICAgLy8gcnVudGltZSBjaHVuayBmaWxlIG5hbWUgd2hlbiB3ZSBzZXQgb3B0aW1pemF0aW9uLnJ1bnRpbWVDaHVuayB0byBcInNpbmdsZVwiIGluc3RlYWQgb2YgZGVmYXVsdCBDUkEncyB2YWx1ZVxuICAgIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0tW2NvbnRlbnRoYXNoOjhdLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5jaHVua0ZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0tW2NvbnRlbnRoYXNoOjhdLmNodW5rLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5kZXZ0b29sTW9kdWxlRmlsZW5hbWVUZW1wbGF0ZSA9XG4gICAgICBpbmZvID0+IFBhdGgucmVsYXRpdmUocm9vdERpciwgaW5mby5hYnNvbHV0ZVJlc291cmNlUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICB9IGVsc2Uge1xuICAgIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0uanMnO1xuICAgIGNvbmZpZy5vdXRwdXQhLmNodW5rRmlsZW5hbWUgPSAnc3RhdGljL2pzL1tuYW1lXS5jaHVuay5qcyc7XG4gIH1cblxuICBjb25zdCByZXBvcnREaXIgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnY3JhLXNjcmlwdHMucmVwb3J0Jyk7XG4gIGZzLm1rZGlycFN5bmMocmVwb3J0RGlyKTtcbiAgZnMud3JpdGVGaWxlKFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICd3ZWJwYWNrLmNvbmZpZy5jcmEuanMnKSwgcHJpbnRDb25maWcoY29uZmlnKSwgKGVycikgPT4ge1xuICAgIGlmIChlcnIpXG4gICAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSAnICsgUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ3dlYnBhY2suY29uZmlnLmNyYS5qcycpLCBlcnIpO1xuICB9KTtcblxuICAvLyBNYWtlIHN1cmUgYmFiZWwgY29tcGlsZXMgc291cmNlIGZvbGRlciBvdXQgc2lkZSBvZiBjdXJyZW50IHNyYyBkaXJlY3RvcnlcbiAgZmluZEFuZENoYW5nZVJ1bGUoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICByZXBsYWNlU2Fzc0xvYWRlcihjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIGFwcGVuZE91ck93blRzTG9hZGVyKGNvbmZpZyk7XG4gIGluc2VydExlc3NMb2FkZXJSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcbiAgY2hhbmdlRm9ya1RzQ2hlY2tlclBsdWdpbihjb25maWcpO1xuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnYXBwJykge1xuICAgIGNvbmZpZy5vdXRwdXQhLnBhdGggPSBjcmFQYXRocygpLmFwcEJ1aWxkO1xuICAgIC8vIGNvbmZpZy5kZXZ0b29sID0gJ3NvdXJjZS1tYXAnO1xuICB9XG5cbiAgLy8gUmVtb3ZlIE1vZHVsZXNTY29wZVBsdWdpbiBmcm9tIHJlc29sdmUgcGx1Z2lucywgaXQgc3RvcHMgdXMgdXNpbmcgc291cmNlIGZvbGQgb3V0IHNpZGUgb2YgcHJvamVjdCBkaXJlY3RvcnlcbiAgaWYgKGNvbmZpZy5yZXNvbHZlICYmIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMpIHtcbiAgICBjb25zdCBNb2R1bGVTY29wZVBsdWdpbiA9IHJlcXVpcmUoJ3JlYWN0LWRldi11dGlscy9Nb2R1bGVTY29wZVBsdWdpbicpO1xuICAgIGNvbnN0IHNyY1Njb3BlUGx1Z2luSWR4ID0gY29uZmlnLnJlc29sdmUucGx1Z2lucy5maW5kSW5kZXgocGx1Z2luID0+IHBsdWdpbiBpbnN0YW5jZW9mIE1vZHVsZVNjb3BlUGx1Z2luKTtcbiAgICBpZiAoc3JjU2NvcGVQbHVnaW5JZHggPj0gMCkge1xuICAgICAgY29uZmlnLnJlc29sdmUucGx1Z2lucy5zcGxpY2Uoc3JjU2NvcGVQbHVnaW5JZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNvbmZpZy5yZXNvbHZlIS5zeW1saW5rcyA9IGZhbHNlO1xuXG4gIGNvbnN0IHJlc29sdmVNb2R1bGVzID0gWydub2RlX21vZHVsZXMnLCAuLi5ub2RlUGF0aF07XG4gIGNvbmZpZy5yZXNvbHZlIS5tb2R1bGVzID0gcmVzb2x2ZU1vZHVsZXM7XG4gIGlmIChjb25maWcucmVzb2x2ZUxvYWRlciA9PSBudWxsKVxuICAgIGNvbmZpZy5yZXNvbHZlTG9hZGVyID0ge307XG4gIGNvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMgPSByZXNvbHZlTW9kdWxlcztcblxuICBPYmplY3QuYXNzaWduKGNvbmZpZy5yZXNvbHZlIS5hbGlhcywgcmVxdWlyZSgncnhqcy9fZXNtMjAxNS9wYXRoLW1hcHBpbmcnKSgpKTtcblxuICAvLyBjb25maWcucGx1Z2lucyEucHVzaChuZXcgUHJvZ3Jlc3NQbHVnaW4oeyBwcm9maWxlOiB0cnVlIH0pKTtcblxuICBjb25maWcuc3RhdHMgPSAnbm9ybWFsJzsgLy8gTm90IHdvcmtpbmdcblxuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2xpYicpIHtcbiAgICBjaGFuZ2U0bGliKGNtZE9wdGlvbi5idWlsZFRhcmdldCwgY29uZmlnLCBub2RlUGF0aCk7XG4gIH0gZWxzZSB7XG4gICAgY29uZmlnLnBsdWdpbnMhLnVuc2hpZnQobmV3IFRlbXBsYXRlUGx1Z2luKCkpO1xuICAgIHNldHVwU3BsaXRDaHVua3MoY29uZmlnLCAobW9kKSA9PiB7XG4gICAgICBjb25zdCBmaWxlID0gbW9kLm5hbWVGb3JDb25kaXRpb24gPyBtb2QubmFtZUZvckNvbmRpdGlvbigpIDogbnVsbDtcbiAgICAgIGlmIChmaWxlID09IG51bGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY29uc3QgcGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgICAgcmV0dXJuIHBrZyA9PSBudWxsO1xuICAgIH0pO1xuICB9XG5cbiAgcnVuQ29uZmlnSGFuZGxlcnMoY29uZmlnLCB3ZWJwYWNrRW52KTtcbiAgbG9nLmluZm8oYG91dHB1dC5wdWJsaWNQYXRoOiAke2NvbmZpZy5vdXRwdXQhLnB1YmxpY1BhdGh9YCk7XG4gIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ3dlYnBhY2suY29uZmlnLnBsaW5rLmpzJyksIHByaW50Q29uZmlnKGNvbmZpZykpO1xuXG4gIC8vIGNoYW5nZVRzQ29uZmlnRmlsZSgpO1xuICByZXR1cm4gY29uZmlnO1xufTtcblxuLyoqXG4gKiBmb3JrLXRzLWNoZWNrZXIgZG9lcyBub3Qgd29yayBmb3IgZmlsZXMgb3V0c2lkZSBvZiB3b3Jrc3BhY2Ugd2hpY2ggaXMgYWN0dWFsbHkgb3VyIGxpbmtlZCBzb3VyY2UgcGFja2FnZVxuICovXG5mdW5jdGlvbiBjaGFuZ2VGb3JrVHNDaGVja2VyUGx1Z2luKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBwbHVnaW5zID0gY29uZmlnLnBsdWdpbnMhO1xuICBjb25zdCBjbnN0ID0gcmVxdWlyZShub2RlUmVzb2x2ZS5zeW5jKCdyZWFjdC1kZXYtdXRpbHMvRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4nLFxuICAgIHtiYXNlZGlyOiBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzJyl9KSk7XG4gIC8vIGxldCBmb3JrVHNDaGVja0lkeCA9IC0xO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHBsdWdpbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHBsdWdpbnNbaV0gaW5zdGFuY2VvZiBjbnN0KSB7XG4gICAgICAocGx1Z2luc1tpXSBhcyBhbnkpLnJlcG9ydEZpbGVzID0gW107XG4gICAgICAvLyBmb3JrVHNDaGVja0lkeCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgLy8gaWYgKGZvcmtUc0NoZWNrSWR4ID49IDApIHtcbiAgLy8gICBwbHVnaW5zLnNwbGljZShmb3JrVHNDaGVja0lkeCwgMSk7XG4gIC8vICAgbG9nLmluZm8oJ1JlbW92ZSBGb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbiBkdWUgdG8gaXRzIG5vdCB3b3JraW5nIHdpdGggbGlua2VkIGZpbGVzJyk7XG4gIC8vIH1cbn1cbi8qKlxuICogcmVhY3Qtc2NyaXB0cy9jb25maWcvZW52LmpzIGZpbHRlcnMgTk9ERV9QQVRIIGZvciBvbmx5IGFsbG93aW5nIHJlbGF0aXZlIHBhdGgsIHRoaXMgYnJlYWtzXG4gKiBQbGluaydzIE5PREVfUEFUSCBzZXR0aW5nLlxuICovXG5mdW5jdGlvbiByZXZpc2VOb2RlUGF0aEVudigpIHtcbiAgY29uc3Qge25vZGVQYXRofSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuICBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBub2RlUGF0aC5qb2luKFBhdGguZGVsaW1pdGVyKTtcbn1cblxuLyoqXG4gKiBIZWxwIHRvIHJlcGxhY2UgdHMsIGpzIGZpbGUgYnkgY29uZmlndXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBlbmRPdXJPd25Uc0xvYWRlcihjb25maWc6IENvbmZpZ3VyYXRpb24pIHtcbiAgY29uc3QgbXlUc0xvYWRlck9wdHM6IFRzTG9hZGVyT3B0cyA9IHtcbiAgICB0c0NvbmZpZ0ZpbGU6IFBhdGgucmVzb2x2ZSgndHNjb25maWcuanNvbicpLFxuICAgIGluamVjdG9yOiBhcGkuYnJvd3NlckluamVjdG9yLFxuICAgIGNvbXBpbGVFeHBDb250ZXg6IGZpbGUgPT4ge1xuICAgICAgY29uc3QgcGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgICAgaWYgKHBrZykge1xuICAgICAgICByZXR1cm4ge19fYXBpOiBhcGkuZ2V0Tm9kZUFwaUZvclBhY2thZ2UocGtnKX07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ge307XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBjb25maWcubW9kdWxlIS5ydWxlcy5wdXNoKHtcbiAgICB0ZXN0OiBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKC9cXC5banRdc3g/JC8pLFxuICAgIGVuZm9yY2U6ICdwcmUnLFxuICAgIHVzZToge1xuICAgICAgb3B0aW9uczogbXlUc0xvYWRlck9wdHMsXG4gICAgICBsb2FkZXI6IHJlcXVpcmUucmVzb2x2ZSgnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RzLWxvYWRlcicpXG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gcnVuQ29uZmlnSGFuZGxlcnMoY29uZmlnOiBDb25maWd1cmF0aW9uLCB3ZWJwYWNrRW52OiBzdHJpbmcpIHtcbiAgY29uc3Qge2NvbmZpZ0ZpbGVJblBhY2thZ2V9OiB0eXBlb2YgX2NyYVBhdGhzID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpO1xuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG4gIGFwaS5jb25maWcuY29uZmlnSGFuZGxlck1nckNoYW5nZWQobWdyID0+IG1nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGhhbmRsZXIud2VicGFjayAhPSBudWxsKSB7XG4gICAgICBsb2cuaW5mbygnRXhlY3V0ZSBjb21tYW5kIGxpbmUgV2VicGFjayBjb25maWd1cmF0aW9uIG92ZXJyaWRlcycsIGNmZ0ZpbGUpO1xuICAgICAgaGFuZGxlci53ZWJwYWNrKGNvbmZpZywgd2VicGFja0VudiwgY21kT3B0aW9uKTtcbiAgICB9XG4gIH0sICdjcmVhdGUtcmVhY3QtYXBwIFdlYnBhY2sgY29uZmlnJykpO1xuXG4gIGlmIChjb25maWdGaWxlSW5QYWNrYWdlKSB7XG4gICAgY29uc3QgY2ZnTWdyID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoW2NvbmZpZ0ZpbGVJblBhY2thZ2VdKTtcbiAgICBjZmdNZ3IucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIHJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgICAgaWYgKGhhbmRsZXIud2VicGFjayAhPSBudWxsKSB7XG4gICAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFdlYnBhY2sgY29uZmlndXJhdGlvbiBvdmVycmlkZXMgZnJvbSAnLCBjZmdGaWxlKTtcbiAgICAgICAgaGFuZGxlci53ZWJwYWNrKGNvbmZpZywgd2VicGFja0VudiwgY21kT3B0aW9uKTtcbiAgICAgIH1cbiAgICB9LCAnY3JlYXRlLXJlYWN0LWFwcCBXZWJwYWNrIGNvbmZpZycpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluc2VydExlc3NMb2FkZXJSdWxlKG9yaWdSdWxlczogUnVsZVNldFJ1bGVbXSk6IHZvaWQge1xuICBjb25zdCBvbmVPZiA9IG9yaWdSdWxlcy5maW5kKHJ1bGUgPT4gcnVsZS5vbmVPZik/Lm9uZU9mITtcbiAgLy8gMS4gbGV0J3MgdGFrZSBydWxlcyBmb3IgY3NzIGFzIGEgdGVtcGxhdGVcbiAgY29uc3QgY3NzUnVsZVVzZSA9IG9uZU9mLmZpbmQoc3ViUnVsZSA9PiBzdWJSdWxlLnRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiZcbiAgICAoc3ViUnVsZS50ZXN0IGFzIFJlZ0V4cCkuc291cmNlID09PSAnXFxcXC5jc3MkJyk/LnVzZSBhcyBSdWxlU2V0VXNlSXRlbVtdO1xuXG4gIGNvbnN0IGNzc01vZHVsZVJ1bGVVc2UgPSBvbmVPZi5maW5kKHN1YlJ1bGUgPT4gc3ViUnVsZS50ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmXG4gICAgKHN1YlJ1bGUudGVzdCBhcyBSZWdFeHApLnNvdXJjZSA9PT0gJ1xcXFwubW9kdWxlXFxcXC5jc3MkJyk/LnVzZSBhcyBSdWxlU2V0VXNlSXRlbVtdO1xuXG4gIGNvbnN0IGxlc3NNb2R1bGVSdWxlOiBSdWxlU2V0UnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwubW9kdWxlXFwubGVzcyQvLFxuICAgIHVzZTogY3JlYXRlTGVzc1J1bGVVc2UoY3NzTW9kdWxlUnVsZVVzZSksXG4gICAgc2lkZUVmZmVjdHM6IHRydWVcbiAgfTtcblxuICBjb25zdCBsZXNzUnVsZTogUnVsZVNldFJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmxlc3MkLyxcbiAgICAvLyBleGNsdWRlOiAvXFwubW9kdWxlXFwubGVzcyQvLFxuICAgIHVzZTogY3JlYXRlTGVzc1J1bGVVc2UoY3NzUnVsZVVzZSksXG4gICAgc2lkZUVmZmVjdHM6IHRydWVcbiAgfTtcblxuICAvLyBJbnNlcnQgYXQgbGFzdCAybmQgcG9zaXRpb24sIHJpZ2h0IGJlZm9yZSBmaWxlLWxvYWRlclxuICBvbmVPZi5zcGxpY2Uob25lT2YubGVuZ3RoIC0yLCAwLCBsZXNzTW9kdWxlUnVsZSwgbGVzc1J1bGUpO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUxlc3NSdWxlVXNlKHVzZUl0ZW1zOiBSdWxlU2V0VXNlSXRlbVtdKSB7XG4gICAgcmV0dXJuIHVzZUl0ZW1zLm1hcCh1c2VJdGVtID0+IHtcbiAgICAgIGlmICh0eXBlb2YgdXNlSXRlbSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHVzZUl0ZW0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIHVzZUl0ZW07XG4gICAgICB9XG4gICAgICBsZXQgbmV3VXNlSXRlbTogUnVsZVNldExvYWRlciA9IHsuLi51c2VJdGVtfTtcbiAgICAgIGlmICh1c2VJdGVtLmxvYWRlciAmJiAvW1xcXFwvXWNzc1xcLWxvYWRlcltcXFxcL10vLnRlc3QodXNlSXRlbS5sb2FkZXIpKSB7XG4gICAgICAgIG5ld1VzZUl0ZW0ub3B0aW9ucyA9IHtcbiAgICAgICAgICAuLi4obmV3VXNlSXRlbS5vcHRpb25zIGFzIGFueSB8fCB7fSksXG4gICAgICAgICAgaW1wb3J0TG9hZGVyczogMlxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ld1VzZUl0ZW07XG4gICAgfSkuY29uY2F0KHtcbiAgICAgIGxvYWRlcjogJ2xlc3MtbG9hZGVyJyxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgbGVzc09wdGlvbnM6IHtcbiAgICAgICAgICBqYXZhc2NyaXB0RW5hYmxlZDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBhZGRpdGlvbmFsRGF0YTogZ2V0U2V0dGluZygpLmxlc3NMb2FkZXJBZGRpdGlvbmFsRGF0YVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmNvbnN0IGZpbGVMb2FkZXJPcHRpb25zID0ge1xuICAvLyBlc01vZHVsZTogZmFsc2UsXG4gIG91dHB1dFBhdGgodXJsOiBzdHJpbmcsIHJlc291cmNlUGF0aDogc3RyaW5nLCBjb250ZXh0OiBzdHJpbmcpIHtcbiAgICBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBgJHsocGsgPyBway5zaG9ydE5hbWUgOiAnZXh0ZXJuYWwnKX0vJHt1cmx9YDtcbiAgfVxufTtcblxuZnVuY3Rpb24gZmluZEFuZENoYW5nZVJ1bGUocnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3QgY3JhUGF0aHMgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy9wYXRocycpO1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgaW5zZXJ0UmF3TG9hZGVyKHJ1bGUub25lT2YpO1xuICAgICAgcmV0dXJuIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldC5sZW5ndGggOyBpKyspIHtcbiAgICAgIGNvbnN0IHJ1bGUgPSBzZXRbaV07XG4gICAgICBpZiAodHlwZW9mIHJ1bGUgPT09ICdzdHJpbmcnICYmIChydWxlLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fCBydWxlLmluZGV4T2YoJ3VybC1sb2FkZXInKSA+PSAwKSkge1xuICAgICAgICBzZXRbaV0gPSB7XG4gICAgICAgICAgbG9hZGVyOiBydWxlLFxuICAgICAgICAgIG9wdGlvbnM6IGZpbGVMb2FkZXJPcHRpb25zXG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKCh0eXBlb2YgKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5sb2FkZXIpID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAoKChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZignZmlsZS1sb2FkZXInKSA+PSAwIHx8XG4gICAgICAgICgocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLmxvYWRlciBhcyBzdHJpbmcpLmluZGV4T2YoJ3VybC1sb2FkZXInKSA+PSAwXG4gICAgICAgICkpIHtcbiAgICAgICAgICBpZiAoKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5vcHRpb25zKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikub3B0aW9ucywgZmlsZUxvYWRlck9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLm9wdGlvbnMgPSBmaWxlTG9hZGVyT3B0aW9ucztcbiAgICAgICAgICB9XG4gICAgICB9XG5cblxuICAgICAgY29uc3QgX3J1bGUgPSBydWxlIGFzIFJ1bGVTZXRSdWxlO1xuXG4gICAgICBpZiAoX3J1bGUuaW5jbHVkZSAmJiB0eXBlb2YgX3J1bGUubG9hZGVyID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAocnVsZSBhcyBSdWxlU2V0TG9hZGVyKS5sb2FkZXIhLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSA+PSAwKSB7XG4gICAgICAgIGRlbGV0ZSBfcnVsZS5pbmNsdWRlO1xuICAgICAgICBfcnVsZS50ZXN0ID0gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhfcnVsZS50ZXN0LCBjcmFQYXRocy5hcHBTcmMpO1xuICAgICAgfVxuICAgICAgaWYgKF9ydWxlLnRlc3QgJiYgX3J1bGUudGVzdC50b1N0cmluZygpID09PSAnL1xcLihqc3xtanN8anN4fHRzfHRzeCkkLycgJiZcbiAgICAgICAgX3J1bGUuaW5jbHVkZSkge1xuICAgICAgICAgIGRlbGV0ZSBfcnVsZS5pbmNsdWRlO1xuICAgICAgICAgIF9ydWxlLnRlc3QgPSBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKF9ydWxlLnRlc3QsIGNyYVBhdGhzLmFwcFNyYyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhvcmlnVGVzdDogUnVsZVNldFJ1bGVbJ3Rlc3QnXSwgYXBwU3JjPzogc3RyaW5nKSB7XG4gIHJldHVybiBmdW5jdGlvbiB0ZXN0T3VyU291cmNlRmlsZShmaWxlOiBzdHJpbmcpICB7XG4gICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgaWYgKHBrID09IG51bGwgJiYgZmlsZS5pbmRleE9mKCcubGlua3MnKSA+IDApXG4gICAgICBsb2cud2FybignY3JlYXRlUnVsZVRlc3RGdW5jNFNyYycsIGZpbGUsIHBrKTtcbiAgICBjb25zdCB5ZXMgPSAoKHBrICYmIChway5qc29uLmRyIHx8IHBrLmpzb24ucGxpbmspKSB8fCAoYXBwU3JjICYmIGZpbGUuc3RhcnRzV2l0aChhcHBTcmMpKSkgJiZcbiAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCkgPyBvcmlnVGVzdC50ZXN0KGZpbGUpIDpcbiAgICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcmlnVGVzdChmaWxlKSA6IG9yaWdUZXN0ID09PSBmaWxlKTtcbiAgICAvLyBsb2cuaW5mbyhgW3dlYnBhY2suY29uZmlnXSBiYWJlbC1sb2FkZXI6ICR7ZmlsZX1gLCB5ZXMpO1xuICAgIHJldHVybiB5ZXM7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGluc2VydFJhd0xvYWRlcihydWxlczogUnVsZVNldFJ1bGVbXSkge1xuICBjb25zdCBodG1sTG9hZGVyUnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwuaHRtbCQvLFxuICAgIHVzZTogW1xuICAgICAge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIF1cbiAgfTtcbiAgcnVsZXMucHVzaChodG1sTG9hZGVyUnVsZSk7XG59XG5cbi8qKiBUbyBzdXBwb3J0IE1hdGVyaWFsLWNvbXBvbmVudC13ZWIgKi9cbmZ1bmN0aW9uIHJlcGxhY2VTYXNzTG9hZGVyKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKSB7XG4gIGNvbnN0IG9uZU9mID0gcnVsZXMuZmluZChydWxlID0+IHJ1bGUub25lT2YpPy5vbmVPZiE7XG4gIG9uZU9mLmZpbHRlcihzdWJSdWxlID0+IEFycmF5LmlzQXJyYXkoc3ViUnVsZS51c2UpKVxuICAgIC5mb3JFYWNoKHN1YlJ1bGUgPT4ge1xuICAgICAgY29uc3QgdXNlSXRlbSA9IChzdWJSdWxlLnVzZSBhcyBSdWxlU2V0TG9hZGVyW10pXG4gICAgICAuZmluZCh1c2VJdGVtID0+IHVzZUl0ZW0ubG9hZGVyICYmIC9zYXNzLWxvYWRlci8udGVzdCh1c2VJdGVtLmxvYWRlcikpO1xuICAgICAgaWYgKHVzZUl0ZW0gIT0gbnVsbCkge1xuICAgICAgICB1c2VJdGVtLm9wdGlvbnMgPSB7XG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHJlcXVpcmUoJ3Nhc3MnKSxcbiAgICAgICAgICB3ZWJwYWNrSW1wb3J0ZXI6IGZhbHNlLFxuICAgICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgICBzYXNzT3B0aW9uczoge1xuICAgICAgICAgICAgaW5jbHVkZVBhdGhzOiBbJ25vZGVfbW9kdWxlcycsIC4uLm5vZGVQYXRoXVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbn1cbiJdfQ==