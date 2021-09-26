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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsMkdBQTJHO0FBQzNHLHVFQUFzRTtBQUV0RSx1RkFBb0U7QUFDcEUseUdBQXdFO0FBRXhFLHdEQUEwQjtBQUUxQiwrREFBK0Q7QUFDL0Qsc0NBQXdEO0FBQ3hELG9GQUEyRDtBQUMzRCxnREFBd0I7QUFDeEIscUNBQThHO0FBQzlHLHNEQUEwQjtBQUcxQixtQ0FBNkU7QUFDN0UsaUZBQWlGO0FBQ2pGLGdFQUF1QztBQUV2Qyx5R0FBK0U7QUFDL0Usc0RBQWtDO0FBQ2xDLDZGQUE2RjtBQUM3RixxRUFBdUQ7QUFFdkQsNkRBQTZEO0FBRTdELE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQUNoRSxNQUFNLEVBQUMsUUFBUSxFQUFFLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQThIekUsc0RBQXNEO0FBRXRELDBDQUEwQztBQUUxQyw4Q0FBOEM7QUFDOUMsMkJBQTJCO0FBQzNCLHFCQUFxQjtBQUNyQix5QkFBeUI7QUFDekIsZ0RBQWdEO0FBQ2hELCtCQUErQjtBQUMvQix1Q0FBdUM7QUFDdkMsMkJBQTJCO0FBQzNCLFVBQVU7QUFDVixzRkFBc0Y7QUFDdEYsc0VBQXNFO0FBQ3RFLG9DQUFvQztBQUNwQyw4QkFBOEI7QUFDOUIsYUFBYTtBQUNiLFFBQVE7QUFDUixTQUFTO0FBQ1QsSUFBSTtBQUVKOztHQUVHO0FBQ0gsU0FBUyx5QkFBeUIsQ0FBQyxNQUFxQjtJQUN0RCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBUSxDQUFDO0lBQ2hDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxpQkFBVyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFDaEYsRUFBQyxP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QyxDQUFDO1FBQ3hFLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsTUFBTSxDQUFDLE1BQU8sQ0FBQyxVQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzlELGtCQUFFLENBQUMsYUFBYSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHlCQUF5QixDQUFDLEVBQUUsSUFBQSxtQkFBVyxFQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFMUYsd0JBQXdCO0lBQ3hCLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUsQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4sQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50ICovXG5pbXBvcnQgeyBDb25maWdIYW5kbGVyTWdyIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQgdHlwZSB7IFBsaW5rRW52IH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9ub2RlLXBhdGgnO1xuaW1wb3J0IHNldHVwU3BsaXRDaHVua3MgZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3NwbGl0Q2h1bmtzJztcbmltcG9ydCBTdGF0c1BsdWdpbiBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3Qvd2VicGFjay1zdGF0cy1wbHVnaW4nO1xuaW1wb3J0IHsgT3B0aW9ucyBhcyBUc0xvYWRlck9wdHMgfSBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvdHMtbG9hZGVyJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHdhbGtQYWNrYWdlc0FuZFNldHVwSW5qZWN0b3IgZnJvbSAnLi9pbmplY3Rvci1zZXR1cCc7XG5pbXBvcnQge2xvZ2dlciwgcGFja2FnZU9mRmlsZUZhY3Rvcnl9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IG1lbVN0YXRzIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29uZmlndXJhdGlvbiwgUnVsZVNldExvYWRlciwgUnVsZVNldFJ1bGUsIFJ1bGVTZXRVc2VJdGVtLCBDb21waWxlciwgUHJvZ3Jlc3NQbHVnaW4gfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG4vLyBpbXBvcnQgeyBmaW5kUGFja2FnZSB9IGZyb20gJy4vYnVpbGQtdGFyZ2V0LWhlbHBlcic7XG5pbXBvcnQgeyBSZWFjdFNjcmlwdHNIYW5kbGVyIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBkcmF3UHVwcHksIGdldENtZE9wdGlvbnMsIHByaW50Q29uZmlnLGdldFJlcG9ydERpciB9IGZyb20gJy4vdXRpbHMnO1xuLy8gaW1wb3J0IHtjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXJ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS11dGlscyc7XG5pbXBvcnQgY2hhbmdlNGxpYiBmcm9tICcuL3dlYnBhY2stbGliJztcbmltcG9ydCAqIGFzIF9jcmFQYXRocyBmcm9tICcuL2NyYS1zY3JpcHRzLXBhdGhzJztcbmltcG9ydCBUZW1wbGF0ZUh0bWxQbHVnaW4gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RlbXBsYXRlLWh0bWwtcGx1Z2luJztcbmltcG9ydCBub2RlUmVzb2x2ZSBmcm9tICdyZXNvbHZlJztcbi8vIGltcG9ydCB7UGxpbmtXZWJwYWNrUmVzb2x2ZVBsdWdpbn0gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3dlYnBhY2stcmVzb2x2ZS1wbHVnaW4nO1xuaW1wb3J0IHtnZXRTZXR0aW5nfSBmcm9tICcuLi9pc29tL2NyYS1zY3JpcHRzLXNldHRpbmcnO1xuaW1wb3J0IF9vcmEgZnJvbSAnb3JhJztcbi8vIGNvbnN0IG9yYVByb20gPSByZXF1aXJlKCcuLi9vcmEnKSBhcyBQcm9taXNlPHR5cGVvZiBfb3JhPjtcblxuY29uc3QgbG9nID0gbG9nZ2VyLmdldExvZ2dlcignQHdmaC9jcmEtc2NyaXB0cy53ZWJwYWNrLWNvbmZpZycpO1xuY29uc3Qge25vZGVQYXRoLCByb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG5leHBvcnQgPSBmdW5jdGlvbih3ZWJwYWNrRW52OiAncHJvZHVjdGlvbicgfCAnZGV2ZWxvcG1lbnQnKSB7XG4gIGRyYXdQdXBweSgnUG9vaW5nIG9uIGNyZWF0ZS1yZWFjdC1hcHAnLCBgSWYgeW91IHdhbnQgdG8ga25vdyBob3cgV2VicGFjayBpcyBjb25maWd1cmVkLCBjaGVjazogJHthcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnY3JhLXNjcmlwdHMucmVwb3J0Jyl9YCk7XG5cbiAgY29uc3QgY21kT3B0aW9uID0gZ2V0Q21kT3B0aW9ucygpO1xuICAvLyBgbnBtIHJ1biBidWlsZGAgYnkgZGVmYXVsdCBpcyBpbiBwcm9kdWN0aW9uIG1vZGUsIGJlbG93IGhhY2tzIHRoZSB3YXkgcmVhY3Qtc2NyaXB0cyBkb2VzXG4gIGlmIChjbWRPcHRpb24uZGV2TW9kZSB8fCBjbWRPcHRpb24ud2F0Y2gpIHtcbiAgICB3ZWJwYWNrRW52ID0gJ2RldmVsb3BtZW50JztcbiAgICBsb2cuaW5mbygnRGV2ZWxvcG1lbnQgbW9kZSBpcyBvbjonLCB3ZWJwYWNrRW52KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBwcm9jZXNzLmVudi5HRU5FUkFURV9TT1VSQ0VNQVAgPSAnZmFsc2UnO1xuICB9XG4gIGxvZy5pbmZvKCd3ZWJwYWNrRW52IDonLCB3ZWJwYWNrRW52KTtcbiAgcHJvY2Vzcy5lbnYuSU5MSU5FX1JVTlRJTUVfQ0hVTksgPSAndHJ1ZSc7XG4gIGNvbnN0IG9yaWdXZWJwYWNrQ29uZmlnID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvd2VicGFjay5jb25maWcnKTtcbiAgcmV2aXNlTm9kZVBhdGhFbnYoKTtcblxuICBjb25zdCB7ZGVmYXVsdDogY3JhUGF0aHN9OiB0eXBlb2YgX2NyYVBhdGhzID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpO1xuXG4gIGNvbnN0IGNvbmZpZzogQ29uZmlndXJhdGlvbiA9IG9yaWdXZWJwYWNrQ29uZmlnKHdlYnBhY2tFbnYpO1xuICBpZiAod2VicGFja0VudiA9PT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgLy8gVHJ5IHRvIHdvcmthcm91bmQgaXNzdWU6IGRlZmF1bHQgSW5saW5lQ2h1bmtQbHVnaW4gJ3MgdGVzdCBwcm9wZXJ0eSBkb2VzIG5vdCBtYXRjaCBcbiAgICAvLyBDUkEncyBvdXRwdXQgY2h1bmsgZmlsZSBuYW1lIHRlbXBsYXRlLFxuICAgIC8vIHdoZW4gd2Ugc2V0IG9wdGltaXphdGlvbi5ydW50aW1lQ2h1bmsgdG8gXCJzaW5nbGVcIiBpbnN0ZWFkIG9mIGRlZmF1bHQgQ1JBJ3MgdmFsdWVcbiAgICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLVtjb250ZW50aGFzaDo4XS5qcyc7XG4gICAgY29uZmlnLm91dHB1dCEuY2h1bmtGaWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLVtjb250ZW50aGFzaDo4XS5jaHVuay5qcyc7XG4gICAgY29uZmlnLm91dHB1dCEuZGV2dG9vbE1vZHVsZUZpbGVuYW1lVGVtcGxhdGUgPVxuICAgICAgaW5mbyA9PiBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIGluZm8uYWJzb2x1dGVSZXNvdXJjZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgfSBlbHNlIHtcbiAgICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5jaHVua0ZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0uY2h1bmsuanMnO1xuICB9XG5cbiAgY29uc3QgcmVwb3J0RGlyID0gZ2V0UmVwb3J0RGlyKCk7XG4gIGZzLm1rZGlycFN5bmMocmVwb3J0RGlyKTtcbiAgZnMud3JpdGVGaWxlKFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICd3ZWJwYWNrLmNvbmZpZy5jcmEuanMnKSwgcHJpbnRDb25maWcoY29uZmlnKSwgKGVycikgPT4ge1xuICAgIGlmIChlcnIpXG4gICAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSAnICsgUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ3dlYnBhY2suY29uZmlnLmNyYS5qcycpLCBlcnIpO1xuICB9KTtcblxuICAvLyBNYWtlIHN1cmUgYmFiZWwgY29tcGlsZXMgc291cmNlIGZvbGRlciBvdXQgc2lkZSBvZiBjdXJyZW50IHNyYyBkaXJlY3RvcnlcbiAgY2hhbmdlRmlsZUxvYWRlcihjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIHJlcGxhY2VTYXNzTG9hZGVyKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcbiAgYXBwZW5kT3VyT3duVHNMb2FkZXIoY29uZmlnKTtcbiAgaW5zZXJ0TGVzc0xvYWRlclJ1bGUoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICBjaGFuZ2VGb3JrVHNDaGVja2VyUGx1Z2luKGNvbmZpZyk7XG4gIGlmIChwcm9jZXNzLnN0ZG91dC5pc1RUWSlcbiAgICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgUHJvZ3Jlc3NQbHVnaW4oe3Byb2ZpbGU6IHRydWV9KSk7XG4gIC8vIGFkZFByb2dyZXNzUGx1Z2luKGNvbmZpZyk7XG5cbiAgaWYgKGNtZE9wdGlvbi5idWlsZFR5cGUgPT09ICdhcHAnKSB7XG4gICAgY29uZmlnLm91dHB1dCEucGF0aCA9IGNyYVBhdGhzKCkuYXBwQnVpbGQ7XG4gIH1cblxuICAvLyBSZW1vdmUgTW9kdWxlc1Njb3BlUGx1Z2luIGZyb20gcmVzb2x2ZSBwbHVnaW5zLCBpdCBzdG9wcyB1cyB1c2luZyBzb3VyY2UgZm9sZCBvdXQgc2lkZSBvZiBwcm9qZWN0IGRpcmVjdG9yeVxuICBpZiAoY29uZmlnLnJlc29sdmUgJiYgY29uZmlnLnJlc29sdmUucGx1Z2lucykge1xuICAgIGNvbnN0IE1vZHVsZVNjb3BlUGx1Z2luID0gcmVxdWlyZSgncmVhY3QtZGV2LXV0aWxzL01vZHVsZVNjb3BlUGx1Z2luJyk7XG4gICAgY29uc3Qgc3JjU2NvcGVQbHVnaW5JZHggPSBjb25maWcucmVzb2x2ZS5wbHVnaW5zLmZpbmRJbmRleChwbHVnaW4gPT4gcGx1Z2luIGluc3RhbmNlb2YgTW9kdWxlU2NvcGVQbHVnaW4pO1xuICAgIGlmIChzcmNTY29wZVBsdWdpbklkeCA+PSAwKSB7XG4gICAgICBjb25maWcucmVzb2x2ZS5wbHVnaW5zLnNwbGljZShzcmNTY29wZVBsdWdpbklkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgLy8gY29uZmlnLnJlc29sdmUhLnN5bWxpbmtzID0gZmFsc2U7XG4gIGNvbnN0IHtnZXRQa2dPZkZpbGV9ID0gcGFja2FnZU9mRmlsZUZhY3RvcnkoKTtcblxuICBjb25zdCByZXNvbHZlTW9kdWxlcyA9IFsnbm9kZV9tb2R1bGVzJywgLi4ubm9kZVBhdGhdO1xuICBjb25maWcucmVzb2x2ZSEuc3ltbGlua3MgPSBmYWxzZTtcbiAgY29uZmlnLnJlc29sdmUhLm1vZHVsZXMgPSByZXNvbHZlTW9kdWxlcztcbiAgaWYgKGNvbmZpZy5yZXNvbHZlTG9hZGVyID09IG51bGwpXG4gICAgY29uZmlnLnJlc29sdmVMb2FkZXIgPSB7fTtcbiAgY29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcyA9IHJlc29sdmVNb2R1bGVzO1xuICBjb25maWcucmVzb2x2ZUxvYWRlci5zeW1saW5rcyA9IGZhbHNlO1xuXG4gIGlmIChjb25maWcucmVzb2x2ZSEucGx1Z2lucyA9PSBudWxsKSB7XG4gICAgY29uZmlnLnJlc29sdmUhLnBsdWdpbnMgPSBbXTtcbiAgfVxuICAvLyBjb25maWcucmVzb2x2ZSEucGx1Z2lucy51bnNoaWZ0KG5ldyBQbGlua1dlYnBhY2tSZXNvbHZlUGx1Z2luKCkpO1xuXG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLnJlc29sdmUhLmFsaWFzLCByZXF1aXJlKCdyeGpzL19lc20yMDE1L3BhdGgtbWFwcGluZycpKCkpO1xuXG4gIGlmIChjbWRPcHRpb24uY21kID09PSAnY3JhLWJ1aWxkJylcbiAgICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgU3RhdHNQbHVnaW4oKSk7XG4gIC8vIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBQcm9ncmVzc1BsdWdpbih7IHByb2ZpbGU6IHRydWUgfSkpO1xuXG4gIC8vIGNvbnN0IFRhcmdlUGx1Z2luID0gcmVxdWlyZSgnY2FzZS1zZW5zaXRpdmUtcGF0aHMtd2VicGFjay1wbHVnaW4nKTtcblxuICAvLyBSZW1vdmUgcHJvYmxlbWF0aWMgcGx1Z2luIGZvciBNYWMgT1NcbiAgLy8gY29uc3QgZm91bmQgPSBjb25maWcucGx1Z2lucyEuZmluZEluZGV4KHBsdWdpbiA9PiBwbHVnaW4gaW5zdGFuY2VvZiBUYXJnZVBsdWdpbik7XG4gIC8vIGlmIChmb3VuZCA+PSAwKVxuICAvLyAgIGNvbmZpZy5wbHVnaW5zPy5zcGxpY2UoZm91bmQsIDEpO1xuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnbGliJykge1xuICAgIGNoYW5nZTRsaWIoY21kT3B0aW9uLmJ1aWxkVGFyZ2V0LCBjb25maWcsIG5vZGVQYXRoKTtcbiAgfSBlbHNlIHtcbiAgICBjb25maWcucGx1Z2lucyEudW5zaGlmdChuZXcgVGVtcGxhdGVIdG1sUGx1Z2luKCkpO1xuXG4gICAgY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IChjbGFzcyB7XG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXAoJ2NyYS1zY3JpcHRzJywgX3N0YXRzID0+IHtcbiAgICAgICAgICAvLyBpZiAoLyhefFxccyktLWV4cG9zZS1nYyhcXHN8JCkvLnRlc3QocHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TISkgfHxcbiAgICAgICAgICAvLyAgIClcbiAgICAgICAgICBpZiAoZ2xvYmFsLmdjKVxuICAgICAgICAgICAgZ2xvYmFsLmdjKCk7XG4gICAgICAgICAgbWVtU3RhdHMoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkoKSk7XG4gICAgc2V0dXBTcGxpdENodW5rcyhjb25maWcsIChtb2QpID0+IHtcbiAgICAgIGNvbnN0IGZpbGUgPSBtb2QubmFtZUZvckNvbmRpdGlvbiA/IG1vZC5uYW1lRm9yQ29uZGl0aW9uKCkgOiBudWxsO1xuICAgICAgaWYgKGZpbGUgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBjb25zdCBwa2cgPSBnZXRQa2dPZkZpbGUoZmlsZSk7XG4gICAgICByZXR1cm4gcGtnID09IG51bGwgfHwgKHBrZy5qc29uLmRyID09IG51bGwgJiYgcGtnLmpzb24ucGxpbmsgPT0gbnVsbCk7XG4gICAgfSk7XG4gIH1cblxuICBydW5Db25maWdIYW5kbGVycyhjb25maWcsIHdlYnBhY2tFbnYpO1xuICBsb2cuZGVidWcoYG91dHB1dC5wdWJsaWNQYXRoOiAke2NvbmZpZy5vdXRwdXQhLnB1YmxpY1BhdGghfWApO1xuICBmcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICd3ZWJwYWNrLmNvbmZpZy5wbGluay5qcycpLCBwcmludENvbmZpZyhjb25maWcpKTtcblxuICAvLyBjaGFuZ2VUc0NvbmZpZ0ZpbGUoKTtcbiAgcmV0dXJuIGNvbmZpZztcbn07XG5cbi8vIGZ1bmN0aW9uIGFkZFByb2dyZXNzUGx1Z2luKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuXG4vLyAgIGxldCBzcGlubmVyOiBSZXR1cm5UeXBlPHR5cGVvZiBfb3JhPjtcblxuLy8gICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgUHJvZ3Jlc3NQbHVnaW4oe1xuLy8gICAgIGFjdGl2ZU1vZHVsZXM6IHRydWUsXG4vLyAgICAgbW9kdWxlczogdHJ1ZSxcbi8vICAgICBtb2R1bGVzQ291bnQ6IDEwMCxcbi8vICAgICBhc3luYyBoYW5kbGVyKHBlcmNlbnRhZ2UsIG1zZywgLi4uYXJncykge1xuLy8gICAgICAgaWYgKHNwaW5uZXIgPT0gbnVsbCkge1xuLy8gICAgICAgICBzcGlubmVyID0gKGF3YWl0IG9yYVByb20pKCk7XG4vLyAgICAgICAgIHNwaW5uZXIuc3RhcnQoKTtcbi8vICAgICAgIH1cbi8vICAgICAgIHNwaW5uZXIhLnRleHQgPSBgJHtNYXRoLnJvdW5kKHBlcmNlbnRhZ2UgKiAxMDApfSAlICR7bXNnfSAke2FyZ3Muam9pbignICcpfWA7XG4vLyAgICAgICAvLyBsb2cuaW5mbyhNYXRoLnJvdW5kKHBlcmNlbnRhZ2UgKiAxMDApLCAnJScsIG1zZywgLi4uYXJncyk7XG4vLyAgICAgICAvLyBpZiAocGVyY2VudGFnZSA+IDAuOTgpIHtcbi8vICAgICAgIC8vICAgc3Bpbm5lciEuc3RvcCgpO1xuLy8gICAgICAgLy8gfVxuLy8gICAgIH1cbi8vICAgfSkpO1xuLy8gfVxuXG4vKipcbiAqIGZvcmstdHMtY2hlY2tlciBkb2VzIG5vdCB3b3JrIGZvciBmaWxlcyBvdXRzaWRlIG9mIHdvcmtzcGFjZSB3aGljaCBpcyBhY3R1YWxseSBvdXIgbGlua2VkIHNvdXJjZSBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZUZvcmtUc0NoZWNrZXJQbHVnaW4oY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG4gIGNvbnN0IHBsdWdpbnMgPSBjb25maWcucGx1Z2lucyE7XG4gIGNvbnN0IGNuc3QgPSByZXF1aXJlKG5vZGVSZXNvbHZlLnN5bmMoJ3JlYWN0LWRldi11dGlscy9Gb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbicsXG4gICAge2Jhc2VkaXI6IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMnKX0pKTtcbiAgLy8gbGV0IGZvcmtUc0NoZWNrSWR4ID0gLTE7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcGx1Z2lucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAocGx1Z2luc1tpXSBpbnN0YW5jZW9mIGNuc3QpIHtcbiAgICAgIChwbHVnaW5zW2ldIGFzIGFueSkucmVwb3J0RmlsZXMgPSBbXTtcbiAgICAgIC8vIGZvcmtUc0NoZWNrSWR4ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICAvLyBpZiAoZm9ya1RzQ2hlY2tJZHggPj0gMCkge1xuICAvLyAgIHBsdWdpbnMuc3BsaWNlKGZvcmtUc0NoZWNrSWR4LCAxKTtcbiAgLy8gICBsb2cuaW5mbygnUmVtb3ZlIEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luIGR1ZSB0byBpdHMgbm90IHdvcmtpbmcgd2l0aCBsaW5rZWQgZmlsZXMnKTtcbiAgLy8gfVxufVxuLyoqXG4gKiByZWFjdC1zY3JpcHRzL2NvbmZpZy9lbnYuanMgZmlsdGVycyBOT0RFX1BBVEggZm9yIG9ubHkgYWxsb3dpbmcgcmVsYXRpdmUgcGF0aCwgdGhpcyBicmVha3NcbiAqIFBsaW5rJ3MgTk9ERV9QQVRIIHNldHRpbmcuXG4gKi9cbmZ1bmN0aW9uIHJldmlzZU5vZGVQYXRoRW52KCkge1xuICBjb25zdCB7bm9kZVBhdGh9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG4gIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IG5vZGVQYXRoLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG4vKipcbiAqIEhlbHAgdG8gcmVwbGFjZSB0cywganMgZmlsZSBieSBjb25maWd1cmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZE91ck93blRzTG9hZGVyKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBteVRzTG9hZGVyT3B0czogVHNMb2FkZXJPcHRzID0ge1xuICAgIHRzQ29uZmlnRmlsZTogUGF0aC5yZXNvbHZlKCd0c2NvbmZpZy5qc29uJyksXG4gICAgaW5qZWN0b3I6IGFwaS5icm93c2VySW5qZWN0b3IsXG4gICAgY29tcGlsZUV4cENvbnRleHQ6IGZpbGUgPT4ge1xuICAgICAgY29uc3QgcGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgICAgaWYgKHBrZykge1xuICAgICAgICByZXR1cm4ge19fYXBpOiBhcGkuZ2V0Tm9kZUFwaUZvclBhY2thZ2UocGtnKX07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ge307XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBjb25maWcubW9kdWxlIS5ydWxlcy5wdXNoKHtcbiAgICB0ZXN0OiBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKC9cXC5banRdc3g/JC8pLFxuICAgIGVuZm9yY2U6ICdwcmUnLFxuICAgIHVzZToge1xuICAgICAgb3B0aW9uczogbXlUc0xvYWRlck9wdHMsXG4gICAgICBsb2FkZXI6IHJlcXVpcmUucmVzb2x2ZSgnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3RzLWxvYWRlcicpXG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gcnVuQ29uZmlnSGFuZGxlcnMoY29uZmlnOiBDb25maWd1cmF0aW9uLCB3ZWJwYWNrRW52OiBzdHJpbmcpIHtcbiAgY29uc3Qge2dldENvbmZpZ0ZpbGVJblBhY2thZ2V9OiB0eXBlb2YgX2NyYVBhdGhzID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpO1xuICBjb25zdCBjb25maWdGaWxlSW5QYWNrYWdlID0gZ2V0Q29uZmlnRmlsZUluUGFja2FnZSgpO1xuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG4gIGlmIChjb25maWdGaWxlSW5QYWNrYWdlKSB7XG4gICAgY29uc3QgY2ZnTWdyID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoW2NvbmZpZ0ZpbGVJblBhY2thZ2VdKTtcbiAgICBjZmdNZ3IucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIF9yZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLndlYnBhY2sgIT0gbnVsbCkge1xuICAgICAgICBsb2cuaW5mbygnRXhlY3V0ZSBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gb3ZlcnJpZGVzIGZyb20gJywgY2ZnRmlsZSk7XG4gICAgICAgIGhhbmRsZXIud2VicGFjayhjb25maWcsIHdlYnBhY2tFbnYsIGNtZE9wdGlvbik7XG4gICAgICB9XG4gICAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgV2VicGFjayBjb25maWcnKTtcbiAgfVxuICBhcGkuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkKG1nciA9PiBtZ3IucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIF9yZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci53ZWJwYWNrICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIGNvbW1hbmQgbGluZSBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gb3ZlcnJpZGVzJywgY2ZnRmlsZSk7XG4gICAgICBoYW5kbGVyLndlYnBhY2soY29uZmlnLCB3ZWJwYWNrRW52LCBjbWRPcHRpb24pO1xuICAgIH1cbiAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgV2VicGFjayBjb25maWcnKSk7XG59XG5cbmZ1bmN0aW9uIGluc2VydExlc3NMb2FkZXJSdWxlKG9yaWdSdWxlczogUnVsZVNldFJ1bGVbXSk6IHZvaWQge1xuICBjb25zdCBvbmVPZiA9IG9yaWdSdWxlcy5maW5kKHJ1bGUgPT4gcnVsZS5vbmVPZik/Lm9uZU9mITtcbiAgLy8gMS4gbGV0J3MgdGFrZSBydWxlcyBmb3IgY3NzIGFzIGEgdGVtcGxhdGVcbiAgY29uc3QgY3NzUnVsZVVzZSA9IG9uZU9mLmZpbmQoc3ViUnVsZSA9PiBzdWJSdWxlLnRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiZcbiAgICAoc3ViUnVsZS50ZXN0IGFzIFJlZ0V4cCkuc291cmNlID09PSAnXFxcXC5jc3MkJyk/LnVzZSBhcyBSdWxlU2V0VXNlSXRlbVtdO1xuXG4gIGNvbnN0IGNzc01vZHVsZVJ1bGVVc2UgPSBvbmVPZi5maW5kKHN1YlJ1bGUgPT4gc3ViUnVsZS50ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmXG4gICAgKHN1YlJ1bGUudGVzdCBhcyBSZWdFeHApLnNvdXJjZSA9PT0gJ1xcXFwubW9kdWxlXFxcXC5jc3MkJyk/LnVzZSBhcyBSdWxlU2V0VXNlSXRlbVtdO1xuXG4gIGNvbnN0IGxlc3NNb2R1bGVSdWxlOiBSdWxlU2V0UnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwubW9kdWxlXFwubGVzcyQvLFxuICAgIHVzZTogY3JlYXRlTGVzc1J1bGVVc2UoY3NzTW9kdWxlUnVsZVVzZSksXG4gICAgc2lkZUVmZmVjdHM6IHRydWVcbiAgfTtcblxuICBjb25zdCBsZXNzUnVsZTogUnVsZVNldFJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmxlc3MkLyxcbiAgICAvLyBleGNsdWRlOiAvXFwubW9kdWxlXFwubGVzcyQvLFxuICAgIHVzZTogY3JlYXRlTGVzc1J1bGVVc2UoY3NzUnVsZVVzZSksXG4gICAgc2lkZUVmZmVjdHM6IHRydWVcbiAgfTtcblxuICAvLyBJbnNlcnQgYXQgbGFzdCAybmQgcG9zaXRpb24sIHJpZ2h0IGJlZm9yZSBmaWxlLWxvYWRlclxuICBvbmVPZi5zcGxpY2Uob25lT2YubGVuZ3RoIC0yLCAwLCBsZXNzTW9kdWxlUnVsZSwgbGVzc1J1bGUpO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUxlc3NSdWxlVXNlKHVzZUl0ZW1zOiBSdWxlU2V0VXNlSXRlbVtdKSB7XG4gICAgcmV0dXJuIHVzZUl0ZW1zLm1hcCh1c2VJdGVtID0+IHtcbiAgICAgIGlmICh0eXBlb2YgdXNlSXRlbSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHVzZUl0ZW0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIHVzZUl0ZW07XG4gICAgICB9XG4gICAgICBsZXQgbmV3VXNlSXRlbTogUnVsZVNldExvYWRlciA9IHsuLi51c2VJdGVtfTtcbiAgICAgIGlmICh1c2VJdGVtLmxvYWRlciAmJiAvW1xcXFwvXWNzc1xcLWxvYWRlcltcXFxcL10vLnRlc3QodXNlSXRlbS5sb2FkZXIpKSB7XG4gICAgICAgIG5ld1VzZUl0ZW0ub3B0aW9ucyA9IHtcbiAgICAgICAgICAuLi4obmV3VXNlSXRlbS5vcHRpb25zIGFzIGFueSB8fCB7fSksXG4gICAgICAgICAgaW1wb3J0TG9hZGVyczogMlxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ld1VzZUl0ZW07XG4gICAgfSkuY29uY2F0KHtcbiAgICAgIGxvYWRlcjogJ2xlc3MtbG9hZGVyJyxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgbGVzc09wdGlvbnM6IHtcbiAgICAgICAgICBqYXZhc2NyaXB0RW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAuLi5nZXRTZXR0aW5nKCkubGVzc0xvYWRlck90aGVyT3B0aW9uc1xuICAgICAgICB9LFxuICAgICAgICBhZGRpdGlvbmFsRGF0YTogZ2V0U2V0dGluZygpLmxlc3NMb2FkZXJBZGRpdGlvbmFsRGF0YVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmNvbnN0IGZpbGVMb2FkZXJPcHRpb25zID0ge1xuICAvLyBlc01vZHVsZTogZmFsc2UsXG4gIG91dHB1dFBhdGgodXJsOiBzdHJpbmcsIHJlc291cmNlUGF0aDogc3RyaW5nLCBfY29udGV4dDogc3RyaW5nKSB7XG4gICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUocmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gYCR7KHBrID8gcGsuc2hvcnROYW1lIDogJ2V4dGVybmFsJyl9LyR7dXJsfWA7XG4gIH1cbn07XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcnVsZXMgXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZUZpbGVMb2FkZXIocnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3QgY3JhUGF0aHMgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy9wYXRocycpO1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgaW5zZXJ0UmF3TG9hZGVyKHJ1bGUub25lT2YpO1xuICAgICAgcmV0dXJuIGNoYW5nZUZpbGVMb2FkZXIocnVsZS5vbmVPZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tTZXQoc2V0OiAoUnVsZVNldFJ1bGUgfCBSdWxlU2V0VXNlSXRlbSlbXSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2V0Lmxlbmd0aCA7IGkrKykge1xuICAgICAgY29uc3QgcnVsZSA9IHNldFtpXTtcblxuICAgICAgaWYgKHR5cGVvZiBydWxlID09PSAnc3RyaW5nJyAmJiAocnVsZS5pbmRleE9mKCdmaWxlLWxvYWRlcicpID49IDAgfHwgcnVsZS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMCkpIHtcbiAgICAgICAgc2V0W2ldID0ge1xuICAgICAgICAgIGxvYWRlcjogcnVsZSxcbiAgICAgICAgICBvcHRpb25zOiBmaWxlTG9hZGVyT3B0aW9uc1xuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcnVsZVNldFJ1bGUgPSBydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcjtcbiAgICAgICAgIGlmICgodHlwZW9mIHJ1bGVTZXRSdWxlLmxvYWRlcikgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICgocnVsZVNldFJ1bGUubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZignZmlsZS1sb2FkZXInKSA+PSAwIHx8XG4gICAgICAgIChydWxlU2V0UnVsZS5sb2FkZXIgYXMgc3RyaW5nKS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMFxuICAgICAgICApKSB7XG4gICAgICAgICAgaWYgKHJ1bGVTZXRSdWxlLm9wdGlvbnMpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocnVsZVNldFJ1bGUub3B0aW9ucywgZmlsZUxvYWRlck9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydWxlU2V0UnVsZS5vcHRpb25zID0gZmlsZUxvYWRlck9wdGlvbnM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cblxuICAgICAgY29uc3QgX3J1bGUgPSBydWxlIGFzIFJ1bGVTZXRSdWxlO1xuXG4gICAgICBpZiAoX3J1bGUuaW5jbHVkZSAmJiB0eXBlb2YgX3J1bGUubG9hZGVyID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAocnVsZSBhcyBSdWxlU2V0TG9hZGVyKS5sb2FkZXIhLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSA+PSAwKSB7XG4gICAgICAgIGRlbGV0ZSBfcnVsZS5pbmNsdWRlO1xuICAgICAgICBfcnVsZS50ZXN0ID0gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhfcnVsZS50ZXN0LCBjcmFQYXRocy5hcHBTcmMpO1xuICAgICAgfVxuICAgICAgaWYgKF9ydWxlLnRlc3QgJiYgX3J1bGUudGVzdC50b1N0cmluZygpID09PSAnL1xcLihqc3xtanN8anN4fHRzfHRzeCkkLycgJiZcbiAgICAgICAgX3J1bGUuaW5jbHVkZSkge1xuICAgICAgICAgIGRlbGV0ZSBfcnVsZS5pbmNsdWRlO1xuICAgICAgICAgIF9ydWxlLnRlc3QgPSBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKF9ydWxlLnRlc3QsIGNyYVBhdGhzLmFwcFNyYyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhvcmlnVGVzdDogUnVsZVNldFJ1bGVbJ3Rlc3QnXSwgYXBwU3JjPzogc3RyaW5nKSB7XG4gIHJldHVybiBmdW5jdGlvbiB0ZXN0T3VyU291cmNlRmlsZShmaWxlOiBzdHJpbmcpICB7XG4gICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG5cbiAgICBjb25zdCB5ZXMgPSAoKHBrICYmIChway5qc29uLmRyIHx8IHBrLmpzb24ucGxpbmspKSB8fCAoYXBwU3JjICYmIGZpbGUuc3RhcnRzV2l0aChhcHBTcmMpKSkgJiZcbiAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCkgPyBvcmlnVGVzdC50ZXN0KGZpbGUpIDpcbiAgICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcmlnVGVzdChmaWxlKSA6IG9yaWdUZXN0ID09PSBmaWxlKTtcbiAgICAvLyBsb2cud2FybihgW3dlYnBhY2suY29uZmlnXSBiYWJlbC1sb2FkZXI6ICR7ZmlsZX1gLCB5ZXMpO1xuICAgIHJldHVybiB5ZXM7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGluc2VydFJhd0xvYWRlcihydWxlczogUnVsZVNldFJ1bGVbXSkge1xuICBjb25zdCBodG1sTG9hZGVyUnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwuaHRtbCQvLFxuICAgIHVzZTogW1xuICAgICAge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIF1cbiAgfTtcbiAgcnVsZXMucHVzaChodG1sTG9hZGVyUnVsZSk7XG59XG5cbi8qKiBUbyBzdXBwb3J0IE1hdGVyaWFsLWNvbXBvbmVudC13ZWIgKi9cbmZ1bmN0aW9uIHJlcGxhY2VTYXNzTG9hZGVyKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKSB7XG4gIGNvbnN0IG9uZU9mID0gcnVsZXMuZmluZChydWxlID0+IHJ1bGUub25lT2YpPy5vbmVPZiE7XG4gIG9uZU9mLmZpbHRlcihzdWJSdWxlID0+IEFycmF5LmlzQXJyYXkoc3ViUnVsZS51c2UpKVxuICAgIC5mb3JFYWNoKHN1YlJ1bGUgPT4ge1xuICAgICAgY29uc3QgdXNlSXRlbSA9IChzdWJSdWxlLnVzZSBhcyBSdWxlU2V0TG9hZGVyW10pXG4gICAgICAuZmluZCh1c2VJdGVtID0+IHVzZUl0ZW0ubG9hZGVyICYmIC9zYXNzLWxvYWRlci8udGVzdCh1c2VJdGVtLmxvYWRlcikpO1xuICAgICAgaWYgKHVzZUl0ZW0gIT0gbnVsbCkge1xuICAgICAgICB1c2VJdGVtLm9wdGlvbnMgPSB7XG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHJlcXVpcmUoJ3Nhc3MnKSxcbiAgICAgICAgICB3ZWJwYWNrSW1wb3J0ZXI6IGZhbHNlLFxuICAgICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgICBzYXNzT3B0aW9uczoge1xuICAgICAgICAgICAgaW5jbHVkZVBhdGhzOiBbJ25vZGVfbW9kdWxlcycsIC4uLm5vZGVQYXRoXVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbn1cbiJdfQ==