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
// const oraProm = require('../ora') as Promise<typeof _ora>;
const log = plink_1.logger.getLogger('@wfh/cra-scripts.webpack-config');
const { nodePath, rootDir } = JSON.parse(process.env.__plink);
// function addProgressPlugin(config: Configuration) {
//   let spinner: ReturnType<typeof _ora>;
//   config.plugins!.push(new ProgressPlugin({
//     activeModules: true,
//     modules: true,
//     modulesCount: 100,
//     async handler(percentage, msg, ...args) {
//       if (spinner == null) {
//         spinner = (await oraProm)();
//         spinner.start();
//       }
//       spinner!.text = `${Math.round(percentage * 100)} % ${msg} ${args.join(' ')}`;
//       // log.info(Math.round(percentage * 100), '%', msg, ...args);
//       // if (percentage > 0.98) {
//       //   spinner!.stop();
//       // }
//     }
//   }));
// }
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
    if (process.stdout.isTTY)
        config.plugins.push(new webpack_1.ProgressPlugin({ profile: true }));
    // addProgressPlugin(config);
    if (cmdOption.buildType === 'app') {
        config.output.path = craPaths().appBuild;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsMkdBQTJHO0FBQzNHLHVFQUFzRTtBQUV0RSx1RkFBb0U7QUFDcEUseUdBQXdFO0FBRXhFLHdEQUEwQjtBQUUxQiwrREFBK0Q7QUFDL0Qsc0NBQXdEO0FBQ3hELG9GQUEyRDtBQUMzRCxnREFBd0I7QUFDeEIscUNBQThHO0FBQzlHLHNEQUEwQjtBQUcxQixtQ0FBNkU7QUFDN0UsaUZBQWlGO0FBQ2pGLGdFQUF1QztBQUV2Qyx5R0FBK0U7QUFDL0Usc0RBQWtDO0FBQ2xDLDZGQUE2RjtBQUM3RixxRUFBdUQ7QUFDdkQsNkRBQTZEO0FBRTdELE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQUNoRSxNQUFNLEVBQUMsUUFBUSxFQUFFLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQThIekUsc0RBQXNEO0FBRXRELDBDQUEwQztBQUUxQyw4Q0FBOEM7QUFDOUMsMkJBQTJCO0FBQzNCLHFCQUFxQjtBQUNyQix5QkFBeUI7QUFDekIsZ0RBQWdEO0FBQ2hELCtCQUErQjtBQUMvQix1Q0FBdUM7QUFDdkMsMkJBQTJCO0FBQzNCLFVBQVU7QUFDVixzRkFBc0Y7QUFDdEYsc0VBQXNFO0FBQ3RFLG9DQUFvQztBQUNwQyw4QkFBOEI7QUFDOUIsYUFBYTtBQUNiLFFBQVE7QUFDUixTQUFTO0FBQ1QsSUFBSTtBQUVKOztHQUVHO0FBQ0gsU0FBUyx5QkFBeUIsQ0FBQyxNQUFxQjtJQUN0RCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBUSxDQUFDO0lBQ2hDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxpQkFBVyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFDaEYsRUFBQyxP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QyxDQUFDO1FBQ3hFLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsTUFBTSxDQUFDLE1BQU8sQ0FBQyxVQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzlELGtCQUFFLENBQUMsYUFBYSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHlCQUF5QixDQUFDLEVBQUUsSUFBQSxtQkFBVyxFQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFMUYsd0JBQXdCO0lBQ3hCLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUsQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4sQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50ICovXG5pbXBvcnQgeyBDb25maWdIYW5kbGVyTWdyIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQgdHlwZSB7IFBsaW5rRW52IH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9ub2RlLXBhdGgnO1xuaW1wb3J0IHNldHVwU3BsaXRDaHVua3MgZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3NwbGl0Q2h1bmtzJztcbmltcG9ydCBTdGF0c1BsdWdpbiBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3Qvd2VicGFjay1zdGF0cy1wbHVnaW4nO1xuaW1wb3J0IHsgT3B0aW9ucyBhcyBUc0xvYWRlck9wdHMgfSBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvdHMtbG9hZGVyJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHdhbGtQYWNrYWdlc0FuZFNldHVwSW5qZWN0b3IgZnJvbSAnLi9pbmplY3Rvci1zZXR1cCc7XG5pbXBvcnQge2xvZ2dlciwgcGFja2FnZU9mRmlsZUZhY3Rvcnl9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IG1lbVN0YXRzIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29uZmlndXJhdGlvbiwgUnVsZVNldExvYWRlciwgUnVsZVNldFJ1bGUsIFJ1bGVTZXRVc2VJdGVtLCBDb21waWxlciwgUHJvZ3Jlc3NQbHVnaW4gfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG4vLyBpbXBvcnQgeyBmaW5kUGFja2FnZSB9IGZyb20gJy4vYnVpbGQtdGFyZ2V0LWhlbHBlcic7XG5pbXBvcnQgeyBSZWFjdFNjcmlwdHNIYW5kbGVyIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBkcmF3UHVwcHksIGdldENtZE9wdGlvbnMsIHByaW50Q29uZmlnLGdldFJlcG9ydERpciB9IGZyb20gJy4vdXRpbHMnO1xuLy8gaW1wb3J0IHtjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXJ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS11dGlscyc7XG5pbXBvcnQgY2hhbmdlNGxpYiBmcm9tICcuL3dlYnBhY2stbGliJztcbmltcG9ydCAqIGFzIF9jcmFQYXRocyBmcm9tICcuL2NyYS1zY3JpcHRzLXBhdGhzJztcbmltcG9ydCBUZW1wbGF0ZUh0bWxQbHVnaW4gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RlbXBsYXRlLWh0bWwtcGx1Z2luJztcbmltcG9ydCBub2RlUmVzb2x2ZSBmcm9tICdyZXNvbHZlJztcbi8vIGltcG9ydCB7UGxpbmtXZWJwYWNrUmVzb2x2ZVBsdWdpbn0gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3dlYnBhY2stcmVzb2x2ZS1wbHVnaW4nO1xuaW1wb3J0IHtnZXRTZXR0aW5nfSBmcm9tICcuLi9pc29tL2NyYS1zY3JpcHRzLXNldHRpbmcnO1xuLy8gY29uc3Qgb3JhUHJvbSA9IHJlcXVpcmUoJy4uL29yYScpIGFzIFByb21pc2U8dHlwZW9mIF9vcmE+O1xuXG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdAd2ZoL2NyYS1zY3JpcHRzLndlYnBhY2stY29uZmlnJyk7XG5jb25zdCB7bm9kZVBhdGgsIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cbmV4cG9ydCA9IGZ1bmN0aW9uKHdlYnBhY2tFbnY6ICdwcm9kdWN0aW9uJyB8ICdkZXZlbG9wbWVudCcpIHtcbiAgZHJhd1B1cHB5KCdQb29pbmcgb24gY3JlYXRlLXJlYWN0LWFwcCcsIGBJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBXZWJwYWNrIGlzIGNvbmZpZ3VyZWQsIGNoZWNrOiAke2FwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdjcmEtc2NyaXB0cy5yZXBvcnQnKX1gKTtcblxuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG4gIC8vIGBucG0gcnVuIGJ1aWxkYCBieSBkZWZhdWx0IGlzIGluIHByb2R1Y3Rpb24gbW9kZSwgYmVsb3cgaGFja3MgdGhlIHdheSByZWFjdC1zY3JpcHRzIGRvZXNcbiAgaWYgKGNtZE9wdGlvbi5kZXZNb2RlIHx8IGNtZE9wdGlvbi53YXRjaCkge1xuICAgIHdlYnBhY2tFbnYgPSAnZGV2ZWxvcG1lbnQnO1xuICAgIGxvZy5pbmZvKCdEZXZlbG9wbWVudCBtb2RlIGlzIG9uOicsIHdlYnBhY2tFbnYpO1xuICB9IGVsc2Uge1xuICAgIC8vIHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCA9ICdmYWxzZSc7XG4gIH1cbiAgbG9nLmluZm8oJ3dlYnBhY2tFbnYgOicsIHdlYnBhY2tFbnYpO1xuICBwcm9jZXNzLmVudi5JTkxJTkVfUlVOVElNRV9DSFVOSyA9ICd0cnVlJztcbiAgY29uc3Qgb3JpZ1dlYnBhY2tDb25maWcgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy93ZWJwYWNrLmNvbmZpZycpO1xuICByZXZpc2VOb2RlUGF0aEVudigpO1xuXG4gIGNvbnN0IHtkZWZhdWx0OiBjcmFQYXRoc306IHR5cGVvZiBfY3JhUGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJyk7XG5cbiAgY29uc3QgY29uZmlnOiBDb25maWd1cmF0aW9uID0gb3JpZ1dlYnBhY2tDb25maWcod2VicGFja0Vudik7XG4gIGlmICh3ZWJwYWNrRW52ID09PSAncHJvZHVjdGlvbicpIHtcbiAgICAvLyBUcnkgdG8gd29ya2Fyb3VuZCBpc3N1ZTogZGVmYXVsdCBJbmxpbmVDaHVua1BsdWdpbiAncyB0ZXN0IHByb3BlcnR5IGRvZXMgbm90IG1hdGNoIFxuICAgIC8vIENSQSdzIG91dHB1dCBjaHVuayBmaWxlIG5hbWUgdGVtcGxhdGUsXG4gICAgLy8gd2hlbiB3ZSBzZXQgb3B0aW1pemF0aW9uLnJ1bnRpbWVDaHVuayB0byBcInNpbmdsZVwiIGluc3RlYWQgb2YgZGVmYXVsdCBDUkEncyB2YWx1ZVxuICAgIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0tW2NvbnRlbnRoYXNoOjhdLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5jaHVua0ZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0tW2NvbnRlbnRoYXNoOjhdLmNodW5rLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5kZXZ0b29sTW9kdWxlRmlsZW5hbWVUZW1wbGF0ZSA9XG4gICAgICBpbmZvID0+IFBhdGgucmVsYXRpdmUocm9vdERpciwgaW5mby5hYnNvbHV0ZVJlc291cmNlUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICB9IGVsc2Uge1xuICAgIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0uanMnO1xuICAgIGNvbmZpZy5vdXRwdXQhLmNodW5rRmlsZW5hbWUgPSAnc3RhdGljL2pzL1tuYW1lXS5jaHVuay5qcyc7XG4gIH1cblxuICBjb25zdCByZXBvcnREaXIgPSBnZXRSZXBvcnREaXIoKTtcbiAgZnMubWtkaXJwU3luYyhyZXBvcnREaXIpO1xuICBmcy53cml0ZUZpbGUoUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ3dlYnBhY2suY29uZmlnLmNyYS5qcycpLCBwcmludENvbmZpZyhjb25maWcpLCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycilcbiAgICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIHdyaXRlICcgKyBQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcuY3JhLmpzJyksIGVycik7XG4gIH0pO1xuXG4gIC8vIE1ha2Ugc3VyZSBiYWJlbCBjb21waWxlcyBzb3VyY2UgZm9sZGVyIG91dCBzaWRlIG9mIGN1cnJlbnQgc3JjIGRpcmVjdG9yeVxuICBjaGFuZ2VGaWxlTG9hZGVyKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcbiAgcmVwbGFjZVNhc3NMb2FkZXIoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICBhcHBlbmRPdXJPd25Uc0xvYWRlcihjb25maWcpO1xuICBpbnNlcnRMZXNzTG9hZGVyUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIGNoYW5nZUZvcmtUc0NoZWNrZXJQbHVnaW4oY29uZmlnKTtcbiAgaWYgKHByb2Nlc3Muc3Rkb3V0LmlzVFRZKVxuICAgIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBQcm9ncmVzc1BsdWdpbih7cHJvZmlsZTogdHJ1ZX0pKTtcbiAgLy8gYWRkUHJvZ3Jlc3NQbHVnaW4oY29uZmlnKTtcblxuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2FwcCcpIHtcbiAgICBjb25maWcub3V0cHV0IS5wYXRoID0gY3JhUGF0aHMoKS5hcHBCdWlsZDtcbiAgfVxuXG4gIC8vIFJlbW92ZSBNb2R1bGVzU2NvcGVQbHVnaW4gZnJvbSByZXNvbHZlIHBsdWdpbnMsIGl0IHN0b3BzIHVzIHVzaW5nIHNvdXJjZSBmb2xkIG91dCBzaWRlIG9mIHByb2plY3QgZGlyZWN0b3J5XG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5wbHVnaW5zKSB7XG4gICAgY29uc3QgTW9kdWxlU2NvcGVQbHVnaW4gPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvTW9kdWxlU2NvcGVQbHVnaW4nKTtcbiAgICBjb25zdCBzcmNTY29wZVBsdWdpbklkeCA9IGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuZmluZEluZGV4KHBsdWdpbiA9PiBwbHVnaW4gaW5zdGFuY2VvZiBNb2R1bGVTY29wZVBsdWdpbik7XG4gICAgaWYgKHNyY1Njb3BlUGx1Z2luSWR4ID49IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuc3BsaWNlKHNyY1Njb3BlUGx1Z2luSWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICAvLyBjb25maWcucmVzb2x2ZSEuc3ltbGlua3MgPSBmYWxzZTtcbiAgY29uc3Qge2dldFBrZ09mRmlsZX0gPSBwYWNrYWdlT2ZGaWxlRmFjdG9yeSgpO1xuXG4gIGNvbnN0IHJlc29sdmVNb2R1bGVzID0gWydub2RlX21vZHVsZXMnLCAuLi5ub2RlUGF0aF07XG4gIGNvbmZpZy5yZXNvbHZlIS5zeW1saW5rcyA9IGZhbHNlO1xuICBjb25maWcucmVzb2x2ZSEubW9kdWxlcyA9IHJlc29sdmVNb2R1bGVzO1xuICBpZiAoY29uZmlnLnJlc29sdmVMb2FkZXIgPT0gbnVsbClcbiAgICBjb25maWcucmVzb2x2ZUxvYWRlciA9IHt9O1xuICBjb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID0gcmVzb2x2ZU1vZHVsZXM7XG4gIGNvbmZpZy5yZXNvbHZlTG9hZGVyLnN5bWxpbmtzID0gZmFsc2U7XG5cbiAgaWYgKGNvbmZpZy5yZXNvbHZlIS5wbHVnaW5zID09IG51bGwpIHtcbiAgICBjb25maWcucmVzb2x2ZSEucGx1Z2lucyA9IFtdO1xuICB9XG4gIC8vIGNvbmZpZy5yZXNvbHZlIS5wbHVnaW5zLnVuc2hpZnQobmV3IFBsaW5rV2VicGFja1Jlc29sdmVQbHVnaW4oKSk7XG5cbiAgT2JqZWN0LmFzc2lnbihjb25maWcucmVzb2x2ZSEuYWxpYXMsIHJlcXVpcmUoJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJykoKSk7XG5cbiAgaWYgKGNtZE9wdGlvbi5jbWQgPT09ICdjcmEtYnVpbGQnKVxuICAgIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBTdGF0c1BsdWdpbigpKTtcbiAgLy8gY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IFByb2dyZXNzUGx1Z2luKHsgcHJvZmlsZTogdHJ1ZSB9KSk7XG5cbiAgLy8gY29uc3QgVGFyZ2VQbHVnaW4gPSByZXF1aXJlKCdjYXNlLXNlbnNpdGl2ZS1wYXRocy13ZWJwYWNrLXBsdWdpbicpO1xuXG4gIC8vIFJlbW92ZSBwcm9ibGVtYXRpYyBwbHVnaW4gZm9yIE1hYyBPU1xuICAvLyBjb25zdCBmb3VuZCA9IGNvbmZpZy5wbHVnaW5zIS5maW5kSW5kZXgocGx1Z2luID0+IHBsdWdpbiBpbnN0YW5jZW9mIFRhcmdlUGx1Z2luKTtcbiAgLy8gaWYgKGZvdW5kID49IDApXG4gIC8vICAgY29uZmlnLnBsdWdpbnM/LnNwbGljZShmb3VuZCwgMSk7XG5cbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdsaWInKSB7XG4gICAgY2hhbmdlNGxpYihjbWRPcHRpb24uYnVpbGRUYXJnZXQsIGNvbmZpZywgbm9kZVBhdGgpO1xuICB9IGVsc2Uge1xuICAgIGNvbmZpZy5wbHVnaW5zIS51bnNoaWZ0KG5ldyBUZW1wbGF0ZUh0bWxQbHVnaW4oKSk7XG5cbiAgICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgKGNsYXNzIHtcbiAgICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcCgnY3JhLXNjcmlwdHMnLCBfc3RhdHMgPT4ge1xuICAgICAgICAgIC8vIGlmICgvKF58XFxzKS0tZXhwb3NlLWdjKFxcc3wkKS8udGVzdChwcm9jZXNzLmVudi5OT0RFX09QVElPTlMhKSB8fFxuICAgICAgICAgIC8vICAgKVxuICAgICAgICAgIGlmIChnbG9iYWwuZ2MpXG4gICAgICAgICAgICBnbG9iYWwuZ2MoKTtcbiAgICAgICAgICBtZW1TdGF0cygpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KSgpKTtcbiAgICBzZXR1cFNwbGl0Q2h1bmtzKGNvbmZpZywgKG1vZCkgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IG1vZC5uYW1lRm9yQ29uZGl0aW9uID8gbW9kLm5hbWVGb3JDb25kaXRpb24oKSA6IG51bGw7XG4gICAgICBpZiAoZmlsZSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNvbnN0IHBrZyA9IGdldFBrZ09mRmlsZShmaWxlKTtcbiAgICAgIHJldHVybiBwa2cgPT0gbnVsbCB8fCAocGtnLmpzb24uZHIgPT0gbnVsbCAmJiBwa2cuanNvbi5wbGluayA9PSBudWxsKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbmZpZ0hhbmRsZXJzKGNvbmZpZywgd2VicGFja0Vudik7XG4gIGxvZy5kZWJ1Zyhgb3V0cHV0LnB1YmxpY1BhdGg6ICR7Y29uZmlnLm91dHB1dCEucHVibGljUGF0aCF9YCk7XG4gIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ3dlYnBhY2suY29uZmlnLnBsaW5rLmpzJyksIHByaW50Q29uZmlnKGNvbmZpZykpO1xuXG4gIC8vIGNoYW5nZVRzQ29uZmlnRmlsZSgpO1xuICByZXR1cm4gY29uZmlnO1xufTtcblxuLy8gZnVuY3Rpb24gYWRkUHJvZ3Jlc3NQbHVnaW4oY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG5cbi8vICAgbGV0IHNwaW5uZXI6IFJldHVyblR5cGU8dHlwZW9mIF9vcmE+O1xuXG4vLyAgIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBQcm9ncmVzc1BsdWdpbih7XG4vLyAgICAgYWN0aXZlTW9kdWxlczogdHJ1ZSxcbi8vICAgICBtb2R1bGVzOiB0cnVlLFxuLy8gICAgIG1vZHVsZXNDb3VudDogMTAwLFxuLy8gICAgIGFzeW5jIGhhbmRsZXIocGVyY2VudGFnZSwgbXNnLCAuLi5hcmdzKSB7XG4vLyAgICAgICBpZiAoc3Bpbm5lciA9PSBudWxsKSB7XG4vLyAgICAgICAgIHNwaW5uZXIgPSAoYXdhaXQgb3JhUHJvbSkoKTtcbi8vICAgICAgICAgc3Bpbm5lci5zdGFydCgpO1xuLy8gICAgICAgfVxuLy8gICAgICAgc3Bpbm5lciEudGV4dCA9IGAke01hdGgucm91bmQocGVyY2VudGFnZSAqIDEwMCl9ICUgJHttc2d9ICR7YXJncy5qb2luKCcgJyl9YDtcbi8vICAgICAgIC8vIGxvZy5pbmZvKE1hdGgucm91bmQocGVyY2VudGFnZSAqIDEwMCksICclJywgbXNnLCAuLi5hcmdzKTtcbi8vICAgICAgIC8vIGlmIChwZXJjZW50YWdlID4gMC45OCkge1xuLy8gICAgICAgLy8gICBzcGlubmVyIS5zdG9wKCk7XG4vLyAgICAgICAvLyB9XG4vLyAgICAgfVxuLy8gICB9KSk7XG4vLyB9XG5cbi8qKlxuICogZm9yay10cy1jaGVja2VyIGRvZXMgbm90IHdvcmsgZm9yIGZpbGVzIG91dHNpZGUgb2Ygd29ya3NwYWNlIHdoaWNoIGlzIGFjdHVhbGx5IG91ciBsaW5rZWQgc291cmNlIHBhY2thZ2VcbiAqL1xuZnVuY3Rpb24gY2hhbmdlRm9ya1RzQ2hlY2tlclBsdWdpbihjb25maWc6IENvbmZpZ3VyYXRpb24pIHtcbiAgY29uc3QgcGx1Z2lucyA9IGNvbmZpZy5wbHVnaW5zITtcbiAgY29uc3QgY25zdCA9IHJlcXVpcmUobm9kZVJlc29sdmUuc3luYygncmVhY3QtZGV2LXV0aWxzL0ZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luJyxcbiAgICB7YmFzZWRpcjogUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cycpfSkpO1xuICAvLyBsZXQgZm9ya1RzQ2hlY2tJZHggPSAtMTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBwbHVnaW5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChwbHVnaW5zW2ldIGluc3RhbmNlb2YgY25zdCkge1xuICAgICAgKHBsdWdpbnNbaV0gYXMgYW55KS5yZXBvcnRGaWxlcyA9IFtdO1xuICAgICAgLy8gZm9ya1RzQ2hlY2tJZHggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIC8vIGlmIChmb3JrVHNDaGVja0lkeCA+PSAwKSB7XG4gIC8vICAgcGx1Z2lucy5zcGxpY2UoZm9ya1RzQ2hlY2tJZHgsIDEpO1xuICAvLyAgIGxvZy5pbmZvKCdSZW1vdmUgRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4gZHVlIHRvIGl0cyBub3Qgd29ya2luZyB3aXRoIGxpbmtlZCBmaWxlcycpO1xuICAvLyB9XG59XG4vKipcbiAqIHJlYWN0LXNjcmlwdHMvY29uZmlnL2Vudi5qcyBmaWx0ZXJzIE5PREVfUEFUSCBmb3Igb25seSBhbGxvd2luZyByZWxhdGl2ZSBwYXRoLCB0aGlzIGJyZWFrc1xuICogUGxpbmsncyBOT0RFX1BBVEggc2V0dGluZy5cbiAqL1xuZnVuY3Rpb24gcmV2aXNlTm9kZVBhdGhFbnYoKSB7XG4gIGNvbnN0IHtub2RlUGF0aH0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gbm9kZVBhdGguam9pbihQYXRoLmRlbGltaXRlcik7XG59XG5cbi8qKlxuICogSGVscCB0byByZXBsYWNlIHRzLCBqcyBmaWxlIGJ5IGNvbmZpZ3VyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwZW5kT3VyT3duVHNMb2FkZXIoY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG4gIGNvbnN0IG15VHNMb2FkZXJPcHRzOiBUc0xvYWRlck9wdHMgPSB7XG4gICAgdHNDb25maWdGaWxlOiBQYXRoLnJlc29sdmUoJ3RzY29uZmlnLmpzb24nKSxcbiAgICBpbmplY3RvcjogYXBpLmJyb3dzZXJJbmplY3RvcixcbiAgICBjb21waWxlRXhwQ29udGV4dDogZmlsZSA9PiB7XG4gICAgICBjb25zdCBwa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICBpZiAocGtnKSB7XG4gICAgICAgIHJldHVybiB7X19hcGk6IGFwaS5nZXROb2RlQXBpRm9yUGFja2FnZShwa2cpfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIGNvbmZpZy5tb2R1bGUhLnJ1bGVzLnB1c2goe1xuICAgIHRlc3Q6IGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMoL1xcLltqdF1zeD8kLyksXG4gICAgZW5mb3JjZTogJ3ByZScsXG4gICAgdXNlOiB7XG4gICAgICBvcHRpb25zOiBteVRzTG9hZGVyT3B0cyxcbiAgICAgIGxvYWRlcjogcmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvdHMtbG9hZGVyJylcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBydW5Db25maWdIYW5kbGVycyhjb25maWc6IENvbmZpZ3VyYXRpb24sIHdlYnBhY2tFbnY6IHN0cmluZykge1xuICBjb25zdCB7Z2V0Q29uZmlnRmlsZUluUGFja2FnZX06IHR5cGVvZiBfY3JhUGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJyk7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVJblBhY2thZ2UgPSBnZXRDb25maWdGaWxlSW5QYWNrYWdlKCk7XG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgX3Jlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgICAgaWYgKGhhbmRsZXIud2VicGFjayAhPSBudWxsKSB7XG4gICAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIFdlYnBhY2sgY29uZmlndXJhdGlvbiBvdmVycmlkZXMgZnJvbSAnLCBjZmdGaWxlKTtcbiAgICAgICAgaGFuZGxlci53ZWJwYWNrKGNvbmZpZywgd2VicGFja0VudiwgY21kT3B0aW9uKTtcbiAgICAgIH1cbiAgICB9LCAnY3JlYXRlLXJlYWN0LWFwcCBXZWJwYWNrIGNvbmZpZycpO1xuICB9XG4gIGFwaS5jb25maWcuY29uZmlnSGFuZGxlck1nckNoYW5nZWQobWdyID0+IG1nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgX3Jlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLndlYnBhY2sgIT0gbnVsbCkge1xuICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgY29tbWFuZCBsaW5lIFdlYnBhY2sgY29uZmlndXJhdGlvbiBvdmVycmlkZXMnLCBjZmdGaWxlKTtcbiAgICAgIGhhbmRsZXIud2VicGFjayhjb25maWcsIHdlYnBhY2tFbnYsIGNtZE9wdGlvbik7XG4gICAgfVxuICB9LCAnY3JlYXRlLXJlYWN0LWFwcCBXZWJwYWNrIGNvbmZpZycpKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0TGVzc0xvYWRlclJ1bGUob3JpZ1J1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IG9uZU9mID0gb3JpZ1J1bGVzLmZpbmQocnVsZSA9PiBydWxlLm9uZU9mKT8ub25lT2YhO1xuICAvLyAxLiBsZXQncyB0YWtlIHJ1bGVzIGZvciBjc3MgYXMgYSB0ZW1wbGF0ZVxuICBjb25zdCBjc3NSdWxlVXNlID0gb25lT2YuZmluZChzdWJSdWxlID0+IHN1YlJ1bGUudGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJlxuICAgIChzdWJSdWxlLnRlc3QgYXMgUmVnRXhwKS5zb3VyY2UgPT09ICdcXFxcLmNzcyQnKT8udXNlIGFzIFJ1bGVTZXRVc2VJdGVtW107XG5cbiAgY29uc3QgY3NzTW9kdWxlUnVsZVVzZSA9IG9uZU9mLmZpbmQoc3ViUnVsZSA9PiBzdWJSdWxlLnRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiZcbiAgICAoc3ViUnVsZS50ZXN0IGFzIFJlZ0V4cCkuc291cmNlID09PSAnXFxcXC5tb2R1bGVcXFxcLmNzcyQnKT8udXNlIGFzIFJ1bGVTZXRVc2VJdGVtW107XG5cbiAgY29uc3QgbGVzc01vZHVsZVJ1bGU6IFJ1bGVTZXRSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC5tb2R1bGVcXC5sZXNzJC8sXG4gICAgdXNlOiBjcmVhdGVMZXNzUnVsZVVzZShjc3NNb2R1bGVSdWxlVXNlKSxcbiAgICBzaWRlRWZmZWN0czogdHJ1ZVxuICB9O1xuXG4gIGNvbnN0IGxlc3NSdWxlOiBSdWxlU2V0UnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwubGVzcyQvLFxuICAgIC8vIGV4Y2x1ZGU6IC9cXC5tb2R1bGVcXC5sZXNzJC8sXG4gICAgdXNlOiBjcmVhdGVMZXNzUnVsZVVzZShjc3NSdWxlVXNlKSxcbiAgICBzaWRlRWZmZWN0czogdHJ1ZVxuICB9O1xuXG4gIC8vIEluc2VydCBhdCBsYXN0IDJuZCBwb3NpdGlvbiwgcmlnaHQgYmVmb3JlIGZpbGUtbG9hZGVyXG4gIG9uZU9mLnNwbGljZShvbmVPZi5sZW5ndGggLTIsIDAsIGxlc3NNb2R1bGVSdWxlLCBsZXNzUnVsZSk7XG5cbiAgZnVuY3Rpb24gY3JlYXRlTGVzc1J1bGVVc2UodXNlSXRlbXM6IFJ1bGVTZXRVc2VJdGVtW10pIHtcbiAgICByZXR1cm4gdXNlSXRlbXMubWFwKHVzZUl0ZW0gPT4ge1xuICAgICAgaWYgKHR5cGVvZiB1c2VJdGVtID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdXNlSXRlbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gdXNlSXRlbTtcbiAgICAgIH1cbiAgICAgIGxldCBuZXdVc2VJdGVtOiBSdWxlU2V0TG9hZGVyID0gey4uLnVzZUl0ZW19O1xuICAgICAgaWYgKHVzZUl0ZW0ubG9hZGVyICYmIC9bXFxcXC9dY3NzXFwtbG9hZGVyW1xcXFwvXS8udGVzdCh1c2VJdGVtLmxvYWRlcikpIHtcbiAgICAgICAgbmV3VXNlSXRlbS5vcHRpb25zID0ge1xuICAgICAgICAgIC4uLihuZXdVc2VJdGVtLm9wdGlvbnMgYXMgYW55IHx8IHt9KSxcbiAgICAgICAgICBpbXBvcnRMb2FkZXJzOiAyXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3VXNlSXRlbTtcbiAgICB9KS5jb25jYXQoe1xuICAgICAgbG9hZGVyOiAnbGVzcy1sb2FkZXInLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBsZXNzT3B0aW9uczoge1xuICAgICAgICAgIGphdmFzY3JpcHRFbmFibGVkOiB0cnVlLFxuICAgICAgICAgIC4uLmdldFNldHRpbmcoKS5sZXNzTG9hZGVyT3RoZXJPcHRpb25zXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxEYXRhOiBnZXRTZXR0aW5nKCkubGVzc0xvYWRlckFkZGl0aW9uYWxEYXRhXG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuY29uc3QgZmlsZUxvYWRlck9wdGlvbnMgPSB7XG4gIC8vIGVzTW9kdWxlOiBmYWxzZSxcbiAgb3V0cHV0UGF0aCh1cmw6IHN0cmluZywgcmVzb3VyY2VQYXRoOiBzdHJpbmcsIF9jb250ZXh0OiBzdHJpbmcpIHtcbiAgICBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBgJHsocGsgPyBway5zaG9ydE5hbWUgOiAnZXh0ZXJuYWwnKX0vJHt1cmx9YDtcbiAgfVxufTtcblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBydWxlcyBcbiAqL1xuZnVuY3Rpb24gY2hhbmdlRmlsZUxvYWRlcihydWxlczogUnVsZVNldFJ1bGVbXSk6IHZvaWQge1xuICBjb25zdCBjcmFQYXRocyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzJyk7XG4gIC8vIFRPRE86IGNoZWNrIGluIGNhc2UgQ1JBIHdpbGwgdXNlIFJ1bGUudXNlIGluc3RlYWQgb2YgXCJsb2FkZXJcIlxuICBjaGVja1NldChydWxlcyk7XG4gIGZvciAoY29uc3QgcnVsZSBvZiBydWxlcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHJ1bGUudXNlKSkge1xuICAgICAgY2hlY2tTZXQocnVsZS51c2UpO1xuXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJ1bGUubG9hZGVyKSkge1xuICAgICAgICBjaGVja1NldChydWxlLmxvYWRlcik7XG4gICAgfSBlbHNlIGlmIChydWxlLm9uZU9mKSB7XG4gICAgICBpbnNlcnRSYXdMb2FkZXIocnVsZS5vbmVPZik7XG4gICAgICByZXR1cm4gY2hhbmdlRmlsZUxvYWRlcihydWxlLm9uZU9mKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja1NldChzZXQ6IChSdWxlU2V0UnVsZSB8IFJ1bGVTZXRVc2VJdGVtKVtdKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZXQubGVuZ3RoIDsgaSsrKSB7XG4gICAgICBjb25zdCBydWxlID0gc2V0W2ldO1xuXG4gICAgICBpZiAodHlwZW9mIHJ1bGUgPT09ICdzdHJpbmcnICYmIChydWxlLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fCBydWxlLmluZGV4T2YoJ3VybC1sb2FkZXInKSA+PSAwKSkge1xuICAgICAgICBzZXRbaV0gPSB7XG4gICAgICAgICAgbG9hZGVyOiBydWxlLFxuICAgICAgICAgIG9wdGlvbnM6IGZpbGVMb2FkZXJPcHRpb25zXG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBydWxlU2V0UnVsZSA9IHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyO1xuICAgICAgICAgaWYgKCh0eXBlb2YgcnVsZVNldFJ1bGUubG9hZGVyKSA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgKChydWxlU2V0UnVsZS5sb2FkZXIgYXMgc3RyaW5nKS5pbmRleE9mKCdmaWxlLWxvYWRlcicpID49IDAgfHxcbiAgICAgICAgKHJ1bGVTZXRSdWxlLmxvYWRlciBhcyBzdHJpbmcpLmluZGV4T2YoJ3VybC1sb2FkZXInKSA+PSAwXG4gICAgICAgICkpIHtcbiAgICAgICAgICBpZiAocnVsZVNldFJ1bGUub3B0aW9ucykge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihydWxlU2V0UnVsZS5vcHRpb25zLCBmaWxlTG9hZGVyT3B0aW9ucyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJ1bGVTZXRSdWxlLm9wdGlvbnMgPSBmaWxlTG9hZGVyT3B0aW9ucztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuXG4gICAgICBjb25zdCBfcnVsZSA9IHJ1bGUgYXMgUnVsZVNldFJ1bGU7XG5cbiAgICAgIGlmIChfcnVsZS5pbmNsdWRlICYmIHR5cGVvZiBfcnVsZS5sb2FkZXIgPT09ICdzdHJpbmcnICYmXG4gICAgICAgIChydWxlIGFzIFJ1bGVTZXRMb2FkZXIpLmxvYWRlciEuaW5kZXhPZihQYXRoLnNlcCArICdiYWJlbC1sb2FkZXInICsgUGF0aC5zZXApID49IDApIHtcbiAgICAgICAgZGVsZXRlIF9ydWxlLmluY2x1ZGU7XG4gICAgICAgIF9ydWxlLnRlc3QgPSBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKF9ydWxlLnRlc3QsIGNyYVBhdGhzLmFwcFNyYyk7XG4gICAgICB9XG4gICAgICBpZiAoX3J1bGUudGVzdCAmJiBfcnVsZS50ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFwuKGpzfG1qc3xqc3h8dHN8dHN4KSQvJyAmJlxuICAgICAgICBfcnVsZS5pbmNsdWRlKSB7XG4gICAgICAgICAgZGVsZXRlIF9ydWxlLmluY2x1ZGU7XG4gICAgICAgICAgX3J1bGUudGVzdCA9IGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMoX3J1bGUudGVzdCwgY3JhUGF0aHMuYXBwU3JjKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKG9yaWdUZXN0OiBSdWxlU2V0UnVsZVsndGVzdCddLCBhcHBTcmM/OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHRlc3RPdXJTb3VyY2VGaWxlKGZpbGU6IHN0cmluZykgIHtcbiAgICBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcblxuICAgIGNvbnN0IHllcyA9ICgocGsgJiYgKHBrLmpzb24uZHIgfHwgcGsuanNvbi5wbGluaykpIHx8IChhcHBTcmMgJiYgZmlsZS5zdGFydHNXaXRoKGFwcFNyYykpKSAmJlxuICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgUmVnRXhwKSA/IG9yaWdUZXN0LnRlc3QoZmlsZSkgOlxuICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IG9yaWdUZXN0KGZpbGUpIDogb3JpZ1Rlc3QgPT09IGZpbGUpO1xuICAgIC8vIGxvZy53YXJuKGBbd2VicGFjay5jb25maWddIGJhYmVsLWxvYWRlcjogJHtmaWxlfWAsIHllcyk7XG4gICAgcmV0dXJuIHllcztcbiAgfTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0UmF3TG9hZGVyKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKSB7XG4gIGNvbnN0IGh0bWxMb2FkZXJSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC5odG1sJC8sXG4gICAgdXNlOiBbXG4gICAgICB7bG9hZGVyOiAncmF3LWxvYWRlcid9XG4gICAgXVxuICB9O1xuICBydWxlcy5wdXNoKGh0bWxMb2FkZXJSdWxlKTtcbn1cblxuLyoqIFRvIHN1cHBvcnQgTWF0ZXJpYWwtY29tcG9uZW50LXdlYiAqL1xuZnVuY3Rpb24gcmVwbGFjZVNhc3NMb2FkZXIocnVsZXM6IFJ1bGVTZXRSdWxlW10pIHtcbiAgY29uc3Qgb25lT2YgPSBydWxlcy5maW5kKHJ1bGUgPT4gcnVsZS5vbmVPZik/Lm9uZU9mITtcbiAgb25lT2YuZmlsdGVyKHN1YlJ1bGUgPT4gQXJyYXkuaXNBcnJheShzdWJSdWxlLnVzZSkpXG4gICAgLmZvckVhY2goc3ViUnVsZSA9PiB7XG4gICAgICBjb25zdCB1c2VJdGVtID0gKHN1YlJ1bGUudXNlIGFzIFJ1bGVTZXRMb2FkZXJbXSlcbiAgICAgIC5maW5kKHVzZUl0ZW0gPT4gdXNlSXRlbS5sb2FkZXIgJiYgL3Nhc3MtbG9hZGVyLy50ZXN0KHVzZUl0ZW0ubG9hZGVyKSk7XG4gICAgICBpZiAodXNlSXRlbSAhPSBudWxsKSB7XG4gICAgICAgIHVzZUl0ZW0ub3B0aW9ucyA9IHtcbiAgICAgICAgICBpbXBsZW1lbnRhdGlvbjogcmVxdWlyZSgnc2FzcycpLFxuICAgICAgICAgIHdlYnBhY2tJbXBvcnRlcjogZmFsc2UsXG4gICAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICAgIHNhc3NPcHRpb25zOiB7XG4gICAgICAgICAgICBpbmNsdWRlUGF0aHM6IFsnbm9kZV9tb2R1bGVzJywgLi4ubm9kZVBhdGhdXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pO1xufVxuIl19