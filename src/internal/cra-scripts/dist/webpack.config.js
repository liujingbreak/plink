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
const webpack_1 = require("webpack");
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
        config.plugins.push(new webpack_1.ProgressPlugin({
            activeModules: true,
            modules: true,
            modulesCount: 30,
            handler(percentage, msg, ...args) {
                log.info(percentage, '%', msg, ...args);
            }
        }));
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
    config.resolve.symlinks = false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsMkdBQTJHO0FBQzNHLHVFQUFzRTtBQUV0RSx1RkFBb0U7QUFDcEUseUdBQXdFO0FBRXhFLHdEQUEwQjtBQUUxQiwrREFBK0Q7QUFDL0Qsc0NBQXdEO0FBQ3hELG9GQUEyRDtBQUMzRCxnREFBd0I7QUFDeEIscUNBQThHO0FBQzlHLHNEQUEwQjtBQUcxQixtQ0FBNkU7QUFDN0UsaUZBQWlGO0FBQ2pGLGdFQUF1QztBQUV2Qyx5R0FBK0U7QUFDL0Usc0RBQWtDO0FBQ2xDLDZGQUE2RjtBQUM3RixxRUFBdUQ7QUFDdkQsd0RBQXdEO0FBRXhELE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQUNoRSxNQUFNLEVBQUMsUUFBUSxFQUFFLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQW1JekU7O0dBRUc7QUFDSCxTQUFTLHlCQUF5QixDQUFDLE1BQXFCO0lBQ3RELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFRLENBQUM7SUFDaEMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGlCQUFXLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxFQUNoRixFQUFDLE9BQU8sRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsMkJBQTJCO0lBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDOUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxFQUFFO1lBQzdCLE9BQU8s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QixNQUFNLENBQUMsTUFBTyxDQUFDLFVBQVcsRUFBRSxDQUFDLENBQUM7SUFDOUQsa0JBQUUsQ0FBQyxhQUFhLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUseUJBQXlCLENBQUMsRUFBRSxJQUFBLG1CQUFXLEVBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUUxRix3QkFBd0I7SUFDeEIsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSxAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVybixAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnQgKi9cbmltcG9ydCB7IENvbmZpZ0hhbmRsZXJNZ3IgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB0eXBlIHsgUGxpbmtFbnYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCc7XG5pbXBvcnQgc2V0dXBTcGxpdENodW5rcyBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3Qvc3BsaXRDaHVua3MnO1xuaW1wb3J0IFN0YXRzUGx1Z2luIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC93ZWJwYWNrLXN0YXRzLXBsdWdpbic7XG5pbXBvcnQgeyBPcHRpb25zIGFzIFRzTG9hZGVyT3B0cyB9IGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC90cy1sb2FkZXInO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvciBmcm9tICcuL2luamVjdG9yLXNldHVwJztcbmltcG9ydCB7bG9nZ2VyLCBwYWNrYWdlT2ZGaWxlRmFjdG9yeX0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgbWVtU3RhdHMgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBDb25maWd1cmF0aW9uLCBSdWxlU2V0TG9hZGVyLCBSdWxlU2V0UnVsZSwgUnVsZVNldFVzZUl0ZW0sIENvbXBpbGVyLCBQcm9ncmVzc1BsdWdpbiB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbi8vIGltcG9ydCB7IGZpbmRQYWNrYWdlIH0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbmltcG9ydCB7IFJlYWN0U2NyaXB0c0hhbmRsZXIgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGRyYXdQdXBweSwgZ2V0Q21kT3B0aW9ucywgcHJpbnRDb25maWcsZ2V0UmVwb3J0RGlyIH0gZnJvbSAnLi91dGlscyc7XG4vLyBpbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjaGFuZ2U0bGliIGZyb20gJy4vd2VicGFjay1saWInO1xuaW1wb3J0ICogYXMgX2NyYVBhdGhzIGZyb20gJy4vY3JhLXNjcmlwdHMtcGF0aHMnO1xuaW1wb3J0IFRlbXBsYXRlSHRtbFBsdWdpbiBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvdGVtcGxhdGUtaHRtbC1wbHVnaW4nO1xuaW1wb3J0IG5vZGVSZXNvbHZlIGZyb20gJ3Jlc29sdmUnO1xuLy8gaW1wb3J0IHtQbGlua1dlYnBhY2tSZXNvbHZlUGx1Z2lufSBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3Qvd2VicGFjay1yZXNvbHZlLXBsdWdpbic7XG5pbXBvcnQge2dldFNldHRpbmd9IGZyb20gJy4uL2lzb20vY3JhLXNjcmlwdHMtc2V0dGluZyc7XG4vLyBpbXBvcnQge2NoYW5nZVRzQ29uZmlnRmlsZX0gZnJvbSAnLi9jaGFuZ2UtdHNjb25maWcnO1xuXG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdAd2ZoL2NyYS1zY3JpcHRzLndlYnBhY2stY29uZmlnJyk7XG5jb25zdCB7bm9kZVBhdGgsIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cbmV4cG9ydCA9IGZ1bmN0aW9uKHdlYnBhY2tFbnY6ICdwcm9kdWN0aW9uJyB8ICdkZXZlbG9wbWVudCcpIHtcbiAgZHJhd1B1cHB5KCdQb29pbmcgb24gY3JlYXRlLXJlYWN0LWFwcCcsIGBJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBXZWJwYWNrIGlzIGNvbmZpZ3VyZWQsIGNoZWNrOiAke2FwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdjcmEtc2NyaXB0cy5yZXBvcnQnKX1gKTtcblxuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG4gIC8vIGBucG0gcnVuIGJ1aWxkYCBieSBkZWZhdWx0IGlzIGluIHByb2R1Y3Rpb24gbW9kZSwgYmVsb3cgaGFja3MgdGhlIHdheSByZWFjdC1zY3JpcHRzIGRvZXNcbiAgaWYgKGNtZE9wdGlvbi5kZXZNb2RlIHx8IGNtZE9wdGlvbi53YXRjaCkge1xuICAgIHdlYnBhY2tFbnYgPSAnZGV2ZWxvcG1lbnQnO1xuICAgIGxvZy5pbmZvKCdEZXZlbG9wbWVudCBtb2RlIGlzIG9uOicsIHdlYnBhY2tFbnYpO1xuICB9IGVsc2Uge1xuICAgIC8vIHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCA9ICdmYWxzZSc7XG4gIH1cbiAgbG9nLmluZm8oJ3dlYnBhY2tFbnYgOicsIHdlYnBhY2tFbnYpO1xuICBwcm9jZXNzLmVudi5JTkxJTkVfUlVOVElNRV9DSFVOSyA9ICd0cnVlJztcbiAgY29uc3Qgb3JpZ1dlYnBhY2tDb25maWcgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy93ZWJwYWNrLmNvbmZpZycpO1xuICByZXZpc2VOb2RlUGF0aEVudigpO1xuXG4gIGNvbnN0IHtkZWZhdWx0OiBjcmFQYXRoc306IHR5cGVvZiBfY3JhUGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJyk7XG5cbiAgY29uc3QgY29uZmlnOiBDb25maWd1cmF0aW9uID0gb3JpZ1dlYnBhY2tDb25maWcod2VicGFja0Vudik7XG4gIGlmICh3ZWJwYWNrRW52ID09PSAncHJvZHVjdGlvbicpIHtcbiAgICAvLyBUcnkgdG8gd29ya2Fyb3VuZCBpc3N1ZTogZGVmYXVsdCBJbmxpbmVDaHVua1BsdWdpbiAncyB0ZXN0IHByb3BlcnR5IGRvZXMgbm90IG1hdGNoIFxuICAgIC8vIENSQSdzIG91dHB1dCBjaHVuayBmaWxlIG5hbWUgdGVtcGxhdGUsXG4gICAgLy8gd2hlbiB3ZSBzZXQgb3B0aW1pemF0aW9uLnJ1bnRpbWVDaHVuayB0byBcInNpbmdsZVwiIGluc3RlYWQgb2YgZGVmYXVsdCBDUkEncyB2YWx1ZVxuICAgIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0tW2NvbnRlbnRoYXNoOjhdLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5jaHVua0ZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0tW2NvbnRlbnRoYXNoOjhdLmNodW5rLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5kZXZ0b29sTW9kdWxlRmlsZW5hbWVUZW1wbGF0ZSA9XG4gICAgICBpbmZvID0+IFBhdGgucmVsYXRpdmUocm9vdERpciwgaW5mby5hYnNvbHV0ZVJlc291cmNlUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICB9IGVsc2Uge1xuICAgIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0uanMnO1xuICAgIGNvbmZpZy5vdXRwdXQhLmNodW5rRmlsZW5hbWUgPSAnc3RhdGljL2pzL1tuYW1lXS5jaHVuay5qcyc7XG4gIH1cblxuICBjb25zdCByZXBvcnREaXIgPSBnZXRSZXBvcnREaXIoKTtcbiAgZnMubWtkaXJwU3luYyhyZXBvcnREaXIpO1xuICBmcy53cml0ZUZpbGUoUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ3dlYnBhY2suY29uZmlnLmNyYS5qcycpLCBwcmludENvbmZpZyhjb25maWcpLCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycilcbiAgICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIHdyaXRlICcgKyBQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcuY3JhLmpzJyksIGVycik7XG4gIH0pO1xuXG4gIC8vIE1ha2Ugc3VyZSBiYWJlbCBjb21waWxlcyBzb3VyY2UgZm9sZGVyIG91dCBzaWRlIG9mIGN1cnJlbnQgc3JjIGRpcmVjdG9yeVxuICBjaGFuZ2VGaWxlTG9hZGVyKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcbiAgcmVwbGFjZVNhc3NMb2FkZXIoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICBhcHBlbmRPdXJPd25Uc0xvYWRlcihjb25maWcpO1xuICBpbnNlcnRMZXNzTG9hZGVyUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIGNoYW5nZUZvcmtUc0NoZWNrZXJQbHVnaW4oY29uZmlnKTtcblxuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2FwcCcpIHtcbiAgICBjb25maWcub3V0cHV0IS5wYXRoID0gY3JhUGF0aHMoKS5hcHBCdWlsZDtcbiAgICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgUHJvZ3Jlc3NQbHVnaW4oe1xuICAgICAgYWN0aXZlTW9kdWxlczogdHJ1ZSxcbiAgICAgIG1vZHVsZXM6IHRydWUsXG4gICAgICBtb2R1bGVzQ291bnQ6IDMwLFxuICAgICAgaGFuZGxlcihwZXJjZW50YWdlLCBtc2csIC4uLmFyZ3MpIHtcbiAgICAgICAgbG9nLmluZm8ocGVyY2VudGFnZSwgJyUnLCBtc2csIC4uLmFyZ3MpO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfVxuXG4gIC8vIFJlbW92ZSBNb2R1bGVzU2NvcGVQbHVnaW4gZnJvbSByZXNvbHZlIHBsdWdpbnMsIGl0IHN0b3BzIHVzIHVzaW5nIHNvdXJjZSBmb2xkIG91dCBzaWRlIG9mIHByb2plY3QgZGlyZWN0b3J5XG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5wbHVnaW5zKSB7XG4gICAgY29uc3QgTW9kdWxlU2NvcGVQbHVnaW4gPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvTW9kdWxlU2NvcGVQbHVnaW4nKTtcbiAgICBjb25zdCBzcmNTY29wZVBsdWdpbklkeCA9IGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuZmluZEluZGV4KHBsdWdpbiA9PiBwbHVnaW4gaW5zdGFuY2VvZiBNb2R1bGVTY29wZVBsdWdpbik7XG4gICAgaWYgKHNyY1Njb3BlUGx1Z2luSWR4ID49IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuc3BsaWNlKHNyY1Njb3BlUGx1Z2luSWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICAvLyBjb25maWcucmVzb2x2ZSEuc3ltbGlua3MgPSBmYWxzZTtcbiAgY29uc3Qge2dldFBrZ09mRmlsZX0gPSBwYWNrYWdlT2ZGaWxlRmFjdG9yeSgpO1xuXG4gIGNvbnN0IHJlc29sdmVNb2R1bGVzID0gWydub2RlX21vZHVsZXMnLCAuLi5ub2RlUGF0aF07XG4gIGNvbmZpZy5yZXNvbHZlIS5zeW1saW5rcyA9IGZhbHNlO1xuICBjb25maWcucmVzb2x2ZSEubW9kdWxlcyA9IHJlc29sdmVNb2R1bGVzO1xuICBpZiAoY29uZmlnLnJlc29sdmVMb2FkZXIgPT0gbnVsbClcbiAgICBjb25maWcucmVzb2x2ZUxvYWRlciA9IHt9O1xuICBjb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID0gcmVzb2x2ZU1vZHVsZXM7XG4gIGNvbmZpZy5yZXNvbHZlTG9hZGVyLnN5bWxpbmtzID0gZmFsc2U7XG5cbiAgaWYgKGNvbmZpZy5yZXNvbHZlIS5wbHVnaW5zID09IG51bGwpIHtcbiAgICBjb25maWcucmVzb2x2ZSEucGx1Z2lucyA9IFtdO1xuICB9XG4gIC8vIGNvbmZpZy5yZXNvbHZlIS5wbHVnaW5zLnVuc2hpZnQobmV3IFBsaW5rV2VicGFja1Jlc29sdmVQbHVnaW4oKSk7XG5cbiAgT2JqZWN0LmFzc2lnbihjb25maWcucmVzb2x2ZSEuYWxpYXMsIHJlcXVpcmUoJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJykoKSk7XG5cbiAgaWYgKGNtZE9wdGlvbi5jbWQgPT09ICdjcmEtYnVpbGQnKVxuICAgIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBTdGF0c1BsdWdpbigpKTtcbiAgLy8gY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IFByb2dyZXNzUGx1Z2luKHsgcHJvZmlsZTogdHJ1ZSB9KSk7XG5cbiAgLy8gY29uc3QgVGFyZ2VQbHVnaW4gPSByZXF1aXJlKCdjYXNlLXNlbnNpdGl2ZS1wYXRocy13ZWJwYWNrLXBsdWdpbicpO1xuXG4gIC8vIFJlbW92ZSBwcm9ibGVtYXRpYyBwbHVnaW4gZm9yIE1hYyBPU1xuICAvLyBjb25zdCBmb3VuZCA9IGNvbmZpZy5wbHVnaW5zIS5maW5kSW5kZXgocGx1Z2luID0+IHBsdWdpbiBpbnN0YW5jZW9mIFRhcmdlUGx1Z2luKTtcbiAgLy8gaWYgKGZvdW5kID49IDApXG4gIC8vICAgY29uZmlnLnBsdWdpbnM/LnNwbGljZShmb3VuZCwgMSk7XG5cbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdsaWInKSB7XG4gICAgY2hhbmdlNGxpYihjbWRPcHRpb24uYnVpbGRUYXJnZXQsIGNvbmZpZywgbm9kZVBhdGgpO1xuICB9IGVsc2Uge1xuICAgIGNvbmZpZy5wbHVnaW5zIS51bnNoaWZ0KG5ldyBUZW1wbGF0ZUh0bWxQbHVnaW4oKSk7XG5cbiAgICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgKGNsYXNzIHtcbiAgICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcCgnY3JhLXNjcmlwdHMnLCBfc3RhdHMgPT4ge1xuICAgICAgICAgIC8vIGlmICgvKF58XFxzKS0tZXhwb3NlLWdjKFxcc3wkKS8udGVzdChwcm9jZXNzLmVudi5OT0RFX09QVElPTlMhKSB8fFxuICAgICAgICAgIC8vICAgKVxuICAgICAgICAgIGlmIChnbG9iYWwuZ2MpXG4gICAgICAgICAgICBnbG9iYWwuZ2MoKTtcbiAgICAgICAgICBtZW1TdGF0cygpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KSgpKTtcbiAgICBzZXR1cFNwbGl0Q2h1bmtzKGNvbmZpZywgKG1vZCkgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IG1vZC5uYW1lRm9yQ29uZGl0aW9uID8gbW9kLm5hbWVGb3JDb25kaXRpb24oKSA6IG51bGw7XG4gICAgICBpZiAoZmlsZSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNvbnN0IHBrZyA9IGdldFBrZ09mRmlsZShmaWxlKTtcbiAgICAgIHJldHVybiBwa2cgPT0gbnVsbCB8fCAocGtnLmpzb24uZHIgPT0gbnVsbCAmJiBwa2cuanNvbi5wbGluayA9PSBudWxsKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbmZpZ0hhbmRsZXJzKGNvbmZpZywgd2VicGFja0Vudik7XG4gIGxvZy5kZWJ1Zyhgb3V0cHV0LnB1YmxpY1BhdGg6ICR7Y29uZmlnLm91dHB1dCEucHVibGljUGF0aCF9YCk7XG4gIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ3dlYnBhY2suY29uZmlnLnBsaW5rLmpzJyksIHByaW50Q29uZmlnKGNvbmZpZykpO1xuXG4gIC8vIGNoYW5nZVRzQ29uZmlnRmlsZSgpO1xuICByZXR1cm4gY29uZmlnO1xufTtcblxuLyoqXG4gKiBmb3JrLXRzLWNoZWNrZXIgZG9lcyBub3Qgd29yayBmb3IgZmlsZXMgb3V0c2lkZSBvZiB3b3Jrc3BhY2Ugd2hpY2ggaXMgYWN0dWFsbHkgb3VyIGxpbmtlZCBzb3VyY2UgcGFja2FnZVxuICovXG5mdW5jdGlvbiBjaGFuZ2VGb3JrVHNDaGVja2VyUGx1Z2luKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBwbHVnaW5zID0gY29uZmlnLnBsdWdpbnMhO1xuICBjb25zdCBjbnN0ID0gcmVxdWlyZShub2RlUmVzb2x2ZS5zeW5jKCdyZWFjdC1kZXYtdXRpbHMvRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4nLFxuICAgIHtiYXNlZGlyOiBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzJyl9KSk7XG4gIC8vIGxldCBmb3JrVHNDaGVja0lkeCA9IC0xO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHBsdWdpbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHBsdWdpbnNbaV0gaW5zdGFuY2VvZiBjbnN0KSB7XG4gICAgICAocGx1Z2luc1tpXSBhcyBhbnkpLnJlcG9ydEZpbGVzID0gW107XG4gICAgICAvLyBmb3JrVHNDaGVja0lkeCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgLy8gaWYgKGZvcmtUc0NoZWNrSWR4ID49IDApIHtcbiAgLy8gICBwbHVnaW5zLnNwbGljZShmb3JrVHNDaGVja0lkeCwgMSk7XG4gIC8vICAgbG9nLmluZm8oJ1JlbW92ZSBGb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbiBkdWUgdG8gaXRzIG5vdCB3b3JraW5nIHdpdGggbGlua2VkIGZpbGVzJyk7XG4gIC8vIH1cbn1cbi8qKlxuICogcmVhY3Qtc2NyaXB0cy9jb25maWcvZW52LmpzIGZpbHRlcnMgTk9ERV9QQVRIIGZvciBvbmx5IGFsbG93aW5nIHJlbGF0aXZlIHBhdGgsIHRoaXMgYnJlYWtzXG4gKiBQbGluaydzIE5PREVfUEFUSCBzZXR0aW5nLlxuICovXG5mdW5jdGlvbiByZXZpc2VOb2RlUGF0aEVudigpIHtcbiAgY29uc3Qge25vZGVQYXRofSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuICBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBub2RlUGF0aC5qb2luKFBhdGguZGVsaW1pdGVyKTtcbn1cblxuLyoqXG4gKiBIZWxwIHRvIHJlcGxhY2UgdHMsIGpzIGZpbGUgYnkgY29uZmlndXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBlbmRPdXJPd25Uc0xvYWRlcihjb25maWc6IENvbmZpZ3VyYXRpb24pIHtcbiAgY29uc3QgbXlUc0xvYWRlck9wdHM6IFRzTG9hZGVyT3B0cyA9IHtcbiAgICB0c0NvbmZpZ0ZpbGU6IFBhdGgucmVzb2x2ZSgndHNjb25maWcuanNvbicpLFxuICAgIGluamVjdG9yOiBhcGkuYnJvd3NlckluamVjdG9yLFxuICAgIGNvbXBpbGVFeHBDb250ZXh0OiBmaWxlID0+IHtcbiAgICAgIGNvbnN0IHBrZyA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgcmV0dXJuIHtfX2FwaTogYXBpLmdldE5vZGVBcGlGb3JQYWNrYWdlKHBrZyl9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgY29uZmlnLm1vZHVsZSEucnVsZXMucHVzaCh7XG4gICAgdGVzdDogY3JlYXRlUnVsZVRlc3RGdW5jNFNyYygvXFwuW2p0XXN4PyQvKSxcbiAgICBlbmZvcmNlOiAncHJlJyxcbiAgICB1c2U6IHtcbiAgICAgIG9wdGlvbnM6IG15VHNMb2FkZXJPcHRzLFxuICAgICAgbG9hZGVyOiByZXF1aXJlLnJlc29sdmUoJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC90cy1sb2FkZXInKVxuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJ1bkNvbmZpZ0hhbmRsZXJzKGNvbmZpZzogQ29uZmlndXJhdGlvbiwgd2VicGFja0Vudjogc3RyaW5nKSB7XG4gIGNvbnN0IHtnZXRDb25maWdGaWxlSW5QYWNrYWdlfTogdHlwZW9mIF9jcmFQYXRocyA9IHJlcXVpcmUoJy4vY3JhLXNjcmlwdHMtcGF0aHMnKTtcbiAgY29uc3QgY29uZmlnRmlsZUluUGFja2FnZSA9IGdldENvbmZpZ0ZpbGVJblBhY2thZ2UoKTtcbiAgY29uc3QgY21kT3B0aW9uID0gZ2V0Q21kT3B0aW9ucygpO1xuICBpZiAoY29uZmlnRmlsZUluUGFja2FnZSkge1xuICAgIGNvbnN0IGNmZ01nciA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFtjb25maWdGaWxlSW5QYWNrYWdlXSk7XG4gICAgY2ZnTWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCBfcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci53ZWJwYWNrICE9IG51bGwpIHtcbiAgICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgV2VicGFjayBjb25maWd1cmF0aW9uIG92ZXJyaWRlcyBmcm9tICcsIGNmZ0ZpbGUpO1xuICAgICAgICBoYW5kbGVyLndlYnBhY2soY29uZmlnLCB3ZWJwYWNrRW52LCBjbWRPcHRpb24pO1xuICAgICAgfVxuICAgIH0sICdjcmVhdGUtcmVhY3QtYXBwIFdlYnBhY2sgY29uZmlnJyk7XG4gIH1cbiAgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCBfcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGhhbmRsZXIud2VicGFjayAhPSBudWxsKSB7XG4gICAgICBsb2cuaW5mbygnRXhlY3V0ZSBjb21tYW5kIGxpbmUgV2VicGFjayBjb25maWd1cmF0aW9uIG92ZXJyaWRlcycsIGNmZ0ZpbGUpO1xuICAgICAgaGFuZGxlci53ZWJwYWNrKGNvbmZpZywgd2VicGFja0VudiwgY21kT3B0aW9uKTtcbiAgICB9XG4gIH0sICdjcmVhdGUtcmVhY3QtYXBwIFdlYnBhY2sgY29uZmlnJykpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRMZXNzTG9hZGVyUnVsZShvcmlnUnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3Qgb25lT2YgPSBvcmlnUnVsZXMuZmluZChydWxlID0+IHJ1bGUub25lT2YpPy5vbmVPZiE7XG4gIC8vIDEuIGxldCdzIHRha2UgcnVsZXMgZm9yIGNzcyBhcyBhIHRlbXBsYXRlXG4gIGNvbnN0IGNzc1J1bGVVc2UgPSBvbmVPZi5maW5kKHN1YlJ1bGUgPT4gc3ViUnVsZS50ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmXG4gICAgKHN1YlJ1bGUudGVzdCBhcyBSZWdFeHApLnNvdXJjZSA9PT0gJ1xcXFwuY3NzJCcpPy51c2UgYXMgUnVsZVNldFVzZUl0ZW1bXTtcblxuICBjb25zdCBjc3NNb2R1bGVSdWxlVXNlID0gb25lT2YuZmluZChzdWJSdWxlID0+IHN1YlJ1bGUudGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJlxuICAgIChzdWJSdWxlLnRlc3QgYXMgUmVnRXhwKS5zb3VyY2UgPT09ICdcXFxcLm1vZHVsZVxcXFwuY3NzJCcpPy51c2UgYXMgUnVsZVNldFVzZUl0ZW1bXTtcblxuICBjb25zdCBsZXNzTW9kdWxlUnVsZTogUnVsZVNldFJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLm1vZHVsZVxcLmxlc3MkLyxcbiAgICB1c2U6IGNyZWF0ZUxlc3NSdWxlVXNlKGNzc01vZHVsZVJ1bGVVc2UpLFxuICAgIHNpZGVFZmZlY3RzOiB0cnVlXG4gIH07XG5cbiAgY29uc3QgbGVzc1J1bGU6IFJ1bGVTZXRSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC5sZXNzJC8sXG4gICAgLy8gZXhjbHVkZTogL1xcLm1vZHVsZVxcLmxlc3MkLyxcbiAgICB1c2U6IGNyZWF0ZUxlc3NSdWxlVXNlKGNzc1J1bGVVc2UpLFxuICAgIHNpZGVFZmZlY3RzOiB0cnVlXG4gIH07XG5cbiAgLy8gSW5zZXJ0IGF0IGxhc3QgMm5kIHBvc2l0aW9uLCByaWdodCBiZWZvcmUgZmlsZS1sb2FkZXJcbiAgb25lT2Yuc3BsaWNlKG9uZU9mLmxlbmd0aCAtMiwgMCwgbGVzc01vZHVsZVJ1bGUsIGxlc3NSdWxlKTtcblxuICBmdW5jdGlvbiBjcmVhdGVMZXNzUnVsZVVzZSh1c2VJdGVtczogUnVsZVNldFVzZUl0ZW1bXSkge1xuICAgIHJldHVybiB1c2VJdGVtcy5tYXAodXNlSXRlbSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHVzZUl0ZW0gPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB1c2VJdGVtID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiB1c2VJdGVtO1xuICAgICAgfVxuICAgICAgbGV0IG5ld1VzZUl0ZW06IFJ1bGVTZXRMb2FkZXIgPSB7Li4udXNlSXRlbX07XG4gICAgICBpZiAodXNlSXRlbS5sb2FkZXIgJiYgL1tcXFxcL11jc3NcXC1sb2FkZXJbXFxcXC9dLy50ZXN0KHVzZUl0ZW0ubG9hZGVyKSkge1xuICAgICAgICBuZXdVc2VJdGVtLm9wdGlvbnMgPSB7XG4gICAgICAgICAgLi4uKG5ld1VzZUl0ZW0ub3B0aW9ucyBhcyBhbnkgfHwge30pLFxuICAgICAgICAgIGltcG9ydExvYWRlcnM6IDJcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXdVc2VJdGVtO1xuICAgIH0pLmNvbmNhdCh7XG4gICAgICBsb2FkZXI6ICdsZXNzLWxvYWRlcicsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGxlc3NPcHRpb25zOiB7XG4gICAgICAgICAgamF2YXNjcmlwdEVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgLi4uZ2V0U2V0dGluZygpLmxlc3NMb2FkZXJPdGhlck9wdGlvbnNcbiAgICAgICAgfSxcbiAgICAgICAgYWRkaXRpb25hbERhdGE6IGdldFNldHRpbmcoKS5sZXNzTG9hZGVyQWRkaXRpb25hbERhdGFcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5jb25zdCBmaWxlTG9hZGVyT3B0aW9ucyA9IHtcbiAgLy8gZXNNb2R1bGU6IGZhbHNlLFxuICBvdXRwdXRQYXRoKHVybDogc3RyaW5nLCByZXNvdXJjZVBhdGg6IHN0cmluZywgX2NvbnRleHQ6IHN0cmluZykge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGAkeyhwayA/IHBrLnNob3J0TmFtZSA6ICdleHRlcm5hbCcpfS8ke3VybH1gO1xuICB9XG59O1xuXG4vKipcbiAqIFxuICogQHBhcmFtIHJ1bGVzIFxuICovXG5mdW5jdGlvbiBjaGFuZ2VGaWxlTG9hZGVyKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IGNyYVBhdGhzID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHMnKTtcbiAgLy8gVE9ETzogY2hlY2sgaW4gY2FzZSBDUkEgd2lsbCB1c2UgUnVsZS51c2UgaW5zdGVhZCBvZiBcImxvYWRlclwiXG4gIGNoZWNrU2V0KHJ1bGVzKTtcbiAgZm9yIChjb25zdCBydWxlIG9mIHJ1bGVzKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocnVsZS51c2UpKSB7XG4gICAgICBjaGVja1NldChydWxlLnVzZSk7XG5cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocnVsZS5sb2FkZXIpKSB7XG4gICAgICAgIGNoZWNrU2V0KHJ1bGUubG9hZGVyKTtcbiAgICB9IGVsc2UgaWYgKHJ1bGUub25lT2YpIHtcbiAgICAgIGluc2VydFJhd0xvYWRlcihydWxlLm9uZU9mKTtcbiAgICAgIHJldHVybiBjaGFuZ2VGaWxlTG9hZGVyKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldC5sZW5ndGggOyBpKyspIHtcbiAgICAgIGNvbnN0IHJ1bGUgPSBzZXRbaV07XG5cbiAgICAgIGlmICh0eXBlb2YgcnVsZSA9PT0gJ3N0cmluZycgJiYgKHJ1bGUuaW5kZXhPZignZmlsZS1sb2FkZXInKSA+PSAwIHx8IHJ1bGUuaW5kZXhPZigndXJsLWxvYWRlcicpID49IDApKSB7XG4gICAgICAgIHNldFtpXSA9IHtcbiAgICAgICAgICBsb2FkZXI6IHJ1bGUsXG4gICAgICAgICAgb3B0aW9uczogZmlsZUxvYWRlck9wdGlvbnNcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJ1bGVTZXRSdWxlID0gcnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXI7XG4gICAgICAgICBpZiAoKHR5cGVvZiBydWxlU2V0UnVsZS5sb2FkZXIpID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAoKHJ1bGVTZXRSdWxlLmxvYWRlciBhcyBzdHJpbmcpLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fFxuICAgICAgICAocnVsZVNldFJ1bGUubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZigndXJsLWxvYWRlcicpID49IDBcbiAgICAgICAgKSkge1xuICAgICAgICAgIGlmIChydWxlU2V0UnVsZS5vcHRpb25zKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHJ1bGVTZXRSdWxlLm9wdGlvbnMsIGZpbGVMb2FkZXJPcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVsZVNldFJ1bGUub3B0aW9ucyA9IGZpbGVMb2FkZXJPcHRpb25zO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG5cbiAgICAgIGNvbnN0IF9ydWxlID0gcnVsZSBhcyBSdWxlU2V0UnVsZTtcblxuICAgICAgaWYgKF9ydWxlLmluY2x1ZGUgJiYgdHlwZW9mIF9ydWxlLmxvYWRlciA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgKHJ1bGUgYXMgUnVsZVNldExvYWRlcikubG9hZGVyIS5pbmRleE9mKFBhdGguc2VwICsgJ2JhYmVsLWxvYWRlcicgKyBQYXRoLnNlcCkgPj0gMCkge1xuICAgICAgICBkZWxldGUgX3J1bGUuaW5jbHVkZTtcbiAgICAgICAgX3J1bGUudGVzdCA9IGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMoX3J1bGUudGVzdCwgY3JhUGF0aHMuYXBwU3JjKTtcbiAgICAgIH1cbiAgICAgIGlmIChfcnVsZS50ZXN0ICYmIF9ydWxlLnRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXC4oanN8bWpzfGpzeHx0c3x0c3gpJC8nICYmXG4gICAgICAgIF9ydWxlLmluY2x1ZGUpIHtcbiAgICAgICAgICBkZWxldGUgX3J1bGUuaW5jbHVkZTtcbiAgICAgICAgICBfcnVsZS50ZXN0ID0gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhfcnVsZS50ZXN0LCBjcmFQYXRocy5hcHBTcmMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMob3JpZ1Rlc3Q6IFJ1bGVTZXRSdWxlWyd0ZXN0J10sIGFwcFNyYz86IHN0cmluZykge1xuICByZXR1cm4gZnVuY3Rpb24gdGVzdE91clNvdXJjZUZpbGUoZmlsZTogc3RyaW5nKSAge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuXG4gICAgY29uc3QgeWVzID0gKChwayAmJiAocGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rKSkgfHwgKGFwcFNyYyAmJiBmaWxlLnN0YXJ0c1dpdGgoYXBwU3JjKSkpICYmXG4gICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBSZWdFeHApID8gb3JpZ1Rlc3QudGVzdChmaWxlKSA6XG4gICAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gb3JpZ1Rlc3QoZmlsZSkgOiBvcmlnVGVzdCA9PT0gZmlsZSk7XG4gICAgLy8gbG9nLndhcm4oYFt3ZWJwYWNrLmNvbmZpZ10gYmFiZWwtbG9hZGVyOiAke2ZpbGV9YCwgeWVzKTtcbiAgICByZXR1cm4geWVzO1xuICB9O1xufVxuXG5mdW5jdGlvbiBpbnNlcnRSYXdMb2FkZXIocnVsZXM6IFJ1bGVTZXRSdWxlW10pIHtcbiAgY29uc3QgaHRtbExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmh0bWwkLyxcbiAgICB1c2U6IFtcbiAgICAgIHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cbiAgICBdXG4gIH07XG4gIHJ1bGVzLnB1c2goaHRtbExvYWRlclJ1bGUpO1xufVxuXG4vKiogVG8gc3VwcG9ydCBNYXRlcmlhbC1jb21wb25lbnQtd2ViICovXG5mdW5jdGlvbiByZXBsYWNlU2Fzc0xvYWRlcihydWxlczogUnVsZVNldFJ1bGVbXSkge1xuICBjb25zdCBvbmVPZiA9IHJ1bGVzLmZpbmQocnVsZSA9PiBydWxlLm9uZU9mKT8ub25lT2YhO1xuICBvbmVPZi5maWx0ZXIoc3ViUnVsZSA9PiBBcnJheS5pc0FycmF5KHN1YlJ1bGUudXNlKSlcbiAgICAuZm9yRWFjaChzdWJSdWxlID0+IHtcbiAgICAgIGNvbnN0IHVzZUl0ZW0gPSAoc3ViUnVsZS51c2UgYXMgUnVsZVNldExvYWRlcltdKVxuICAgICAgLmZpbmQodXNlSXRlbSA9PiB1c2VJdGVtLmxvYWRlciAmJiAvc2Fzcy1sb2FkZXIvLnRlc3QodXNlSXRlbS5sb2FkZXIpKTtcbiAgICAgIGlmICh1c2VJdGVtICE9IG51bGwpIHtcbiAgICAgICAgdXNlSXRlbS5vcHRpb25zID0ge1xuICAgICAgICAgIGltcGxlbWVudGF0aW9uOiByZXF1aXJlKCdzYXNzJyksXG4gICAgICAgICAgd2VicGFja0ltcG9ydGVyOiBmYWxzZSxcbiAgICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgICAgc2Fzc09wdGlvbnM6IHtcbiAgICAgICAgICAgIGluY2x1ZGVQYXRoczogWydub2RlX21vZHVsZXMnLCAuLi5ub2RlUGF0aF1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG59XG4iXX0=