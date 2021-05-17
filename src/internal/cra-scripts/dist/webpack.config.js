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
    __plink_1.default.config.configHandlerMgrChanged(mgr => mgr.runEachSync((cfgFile, result, handler) => {
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
            const pkg = __plink_1.default.findPackageByFile(file);
            return pkg == null;
        });
    }
    runConfigHandlers(config, webpackEnv);
    log.debug(`output.publicPath: ${config.output.publicPath}`);
    fs_extra_1.default.writeFileSync(path_1.default.resolve(reportDir, 'webpack.config.plink.js'), utils_1.printConfig(config));
    // changeTsConfigFile();
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsNEJBQTRCO0FBQzVCLHVFQUFzRTtBQUV0RSx1RkFBb0U7QUFFcEUsd0RBQTBCO0FBRTFCLCtEQUErRDtBQUMvRCxzQ0FBa0M7QUFDbEMsZ0RBQXdCO0FBRXhCLHNEQUEwQjtBQUcxQixtQ0FBNkU7QUFDN0UsaUZBQWlGO0FBQ2pGLGdFQUF1QztBQUV2Qyx5R0FBMkU7QUFDM0Usc0RBQWtDO0FBQ2xDLDZGQUE2RjtBQUM3RixxRUFBdUQ7QUFDdkQsd0RBQXdEO0FBRXhELE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQUNoRSxNQUFNLEVBQUMsUUFBUSxFQUFFLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQXNHekU7O0dBRUc7QUFDSCxTQUFTLHlCQUF5QixDQUFDLE1BQXFCO0lBQ3RELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFRLENBQUM7SUFDaEMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGlCQUFXLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxFQUNoRixFQUFDLE9BQU8sRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsMkJBQTJCO0lBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDOUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxFQUFFO1lBQzdCLE9BQU8sQ0FBQyxDQUFDLENBQVMsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFD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QyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixNQUFNLENBQUMsTUFBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDN0Qsa0JBQUUsQ0FBQyxhQUFhLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUseUJBQXlCLENBQUMsRUFBRSxtQkFBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFMUYsd0JBQXdCO0lBQ3hCLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCB7IENvbmZpZ0hhbmRsZXJNZ3IgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB0eXBlIHsgUGxpbmtFbnYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCc7XG5pbXBvcnQgc2V0dXBTcGxpdENodW5rcyBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3Qvc3BsaXRDaHVua3MnO1xuaW1wb3J0IHsgT3B0aW9ucyBhcyBUc0xvYWRlck9wdHMgfSBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvdHMtbG9hZGVyJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHdhbGtQYWNrYWdlc0FuZFNldHVwSW5qZWN0b3IgZnJvbSAnLi9pbmplY3Rvci1zZXR1cCc7XG5pbXBvcnQge2xvZ2dlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IENvbmZpZ3VyYXRpb24sIFJ1bGVTZXRMb2FkZXIsIFJ1bGVTZXRSdWxlLCBSdWxlU2V0VXNlSXRlbSB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbi8vIGltcG9ydCB7IGZpbmRQYWNrYWdlIH0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbmltcG9ydCB7IFJlYWN0U2NyaXB0c0hhbmRsZXIgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGRyYXdQdXBweSwgZ2V0Q21kT3B0aW9ucywgcHJpbnRDb25maWcsZ2V0UmVwb3J0RGlyIH0gZnJvbSAnLi91dGlscyc7XG4vLyBpbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjaGFuZ2U0bGliIGZyb20gJy4vd2VicGFjay1saWInO1xuaW1wb3J0ICogYXMgX2NyYVBhdGhzIGZyb20gJy4vY3JhLXNjcmlwdHMtcGF0aHMnO1xuaW1wb3J0IFRlbXBsYXRlUGx1Z2luIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC90ZW1wbGF0ZS1odG1sLXBsdWdpbic7XG5pbXBvcnQgbm9kZVJlc29sdmUgZnJvbSAncmVzb2x2ZSc7XG4vLyBpbXBvcnQge1BsaW5rV2VicGFja1Jlc29sdmVQbHVnaW59IGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC93ZWJwYWNrLXJlc29sdmUtcGx1Z2luJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9jcmEtc2NyaXB0cy1zZXR0aW5nJztcbi8vIGltcG9ydCB7Y2hhbmdlVHNDb25maWdGaWxlfSBmcm9tICcuL2NoYW5nZS10c2NvbmZpZyc7XG5cbmNvbnN0IGxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0B3ZmgvY3JhLXNjcmlwdHMud2VicGFjay1jb25maWcnKTtcbmNvbnN0IHtub2RlUGF0aCwgcm9vdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxuZXhwb3J0ID0gZnVuY3Rpb24od2VicGFja0VudjogJ3Byb2R1Y3Rpb24nIHwgJ2RldmVsb3BtZW50Jykge1xuICBkcmF3UHVwcHkoJ1Bvb2luZyBvbiBjcmVhdGUtcmVhY3QtYXBwJywgYElmIHlvdSB3YW50IHRvIGtub3cgaG93IFdlYnBhY2sgaXMgY29uZmlndXJlZCwgY2hlY2s6ICR7YXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2NyYS1zY3JpcHRzLnJlcG9ydCcpfWApO1xuXG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcbiAgLy8gYG5wbSBydW4gYnVpbGRgIGJ5IGRlZmF1bHQgaXMgaW4gcHJvZHVjdGlvbiBtb2RlLCBiZWxvdyBoYWNrcyB0aGUgd2F5IHJlYWN0LXNjcmlwdHMgZG9lc1xuICBpZiAoY21kT3B0aW9uLmRldk1vZGUgfHwgY21kT3B0aW9uLndhdGNoKSB7XG4gICAgd2VicGFja0VudiA9ICdkZXZlbG9wbWVudCc7XG4gICAgbG9nLmluZm8oJ0RldmVsb3BtZW50IG1vZGUgaXMgb246Jywgd2VicGFja0Vudik7XG4gIH0gZWxzZSB7XG4gICAgLy8gcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ2ZhbHNlJztcbiAgfVxuICBsb2cuaW5mbygnd2VicGFja0VudiA6Jywgd2VicGFja0Vudik7XG4gIHByb2Nlc3MuZW52LklOTElORV9SVU5USU1FX0NIVU5LID0gJ3RydWUnO1xuICBjb25zdCBvcmlnV2VicGFja0NvbmZpZyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3dlYnBhY2suY29uZmlnJyk7XG4gIHJldmlzZU5vZGVQYXRoRW52KCk7XG5cbiAgY29uc3Qge2RlZmF1bHQ6IGNyYVBhdGhzfTogdHlwZW9mIF9jcmFQYXRocyA9IHJlcXVpcmUoJy4vY3JhLXNjcmlwdHMtcGF0aHMnKTtcblxuICBjb25zdCBjb25maWc6IENvbmZpZ3VyYXRpb24gPSBvcmlnV2VicGFja0NvbmZpZyh3ZWJwYWNrRW52KTtcbiAgaWYgKHdlYnBhY2tFbnYgPT09ICdwcm9kdWN0aW9uJykge1xuICAgIC8vIFRyeSB0byB3b3JrYXJvdW5kIGlzc3VlOiBkZWZhdWx0IElubGluZUNodW5rUGx1Z2luICdzIHRlc3QgcHJvcGVydHkgZG9lcyBub3QgbWF0Y2ggXG4gICAgLy8gQ1JBJ3Mgb3V0cHV0IGNodW5rIGZpbGUgbmFtZSB0ZW1wbGF0ZSxcbiAgICAvLyB3aGVuIHdlIHNldCBvcHRpbWl6YXRpb24ucnVudGltZUNodW5rIHRvIFwic2luZ2xlXCIgaW5zdGVhZCBvZiBkZWZhdWx0IENSQSdzIHZhbHVlXG4gICAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnc3RhdGljL2pzL1tuYW1lXS1bY29udGVudGhhc2g6OF0uanMnO1xuICAgIGNvbmZpZy5vdXRwdXQhLmNodW5rRmlsZW5hbWUgPSAnc3RhdGljL2pzL1tuYW1lXS1bY29udGVudGhhc2g6OF0uY2h1bmsuanMnO1xuICAgIGNvbmZpZy5vdXRwdXQhLmRldnRvb2xNb2R1bGVGaWxlbmFtZVRlbXBsYXRlID1cbiAgICAgIGluZm8gPT4gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBpbmZvLmFic29sdXRlUmVzb3VyY2VQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIH0gZWxzZSB7XG4gICAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnc3RhdGljL2pzL1tuYW1lXS5qcyc7XG4gICAgY29uZmlnLm91dHB1dCEuY2h1bmtGaWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLmNodW5rLmpzJztcbiAgfVxuXG4gIGNvbnN0IHJlcG9ydERpciA9IGdldFJlcG9ydERpcigpO1xuICBmcy5ta2RpcnBTeW5jKHJlcG9ydERpcik7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcuY3JhLmpzJyksIHByaW50Q29uZmlnKGNvbmZpZyksIChlcnIpID0+IHtcbiAgICBpZiAoZXJyKVxuICAgICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgJyArIFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICd3ZWJwYWNrLmNvbmZpZy5jcmEuanMnKSwgZXJyKTtcbiAgfSk7XG5cbiAgLy8gTWFrZSBzdXJlIGJhYmVsIGNvbXBpbGVzIHNvdXJjZSBmb2xkZXIgb3V0IHNpZGUgb2YgY3VycmVudCBzcmMgZGlyZWN0b3J5XG4gIGNoYW5nZUZpbGVMb2FkZXIoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICByZXBsYWNlU2Fzc0xvYWRlcihjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIGFwcGVuZE91ck93blRzTG9hZGVyKGNvbmZpZyk7XG4gIGluc2VydExlc3NMb2FkZXJSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcbiAgY2hhbmdlRm9ya1RzQ2hlY2tlclBsdWdpbihjb25maWcpO1xuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnYXBwJykge1xuICAgIGNvbmZpZy5vdXRwdXQhLnBhdGggPSBjcmFQYXRocygpLmFwcEJ1aWxkO1xuICAgIC8vIGNvbmZpZy5kZXZ0b29sID0gJ3NvdXJjZS1tYXAnO1xuICB9XG5cbiAgLy8gUmVtb3ZlIE1vZHVsZXNTY29wZVBsdWdpbiBmcm9tIHJlc29sdmUgcGx1Z2lucywgaXQgc3RvcHMgdXMgdXNpbmcgc291cmNlIGZvbGQgb3V0IHNpZGUgb2YgcHJvamVjdCBkaXJlY3RvcnlcbiAgaWYgKGNvbmZpZy5yZXNvbHZlICYmIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMpIHtcbiAgICBjb25zdCBNb2R1bGVTY29wZVBsdWdpbiA9IHJlcXVpcmUoJ3JlYWN0LWRldi11dGlscy9Nb2R1bGVTY29wZVBsdWdpbicpO1xuICAgIGNvbnN0IHNyY1Njb3BlUGx1Z2luSWR4ID0gY29uZmlnLnJlc29sdmUucGx1Z2lucy5maW5kSW5kZXgocGx1Z2luID0+IHBsdWdpbiBpbnN0YW5jZW9mIE1vZHVsZVNjb3BlUGx1Z2luKTtcbiAgICBpZiAoc3JjU2NvcGVQbHVnaW5JZHggPj0gMCkge1xuICAgICAgY29uZmlnLnJlc29sdmUucGx1Z2lucy5zcGxpY2Uoc3JjU2NvcGVQbHVnaW5JZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNvbmZpZy5yZXNvbHZlIS5zeW1saW5rcyA9IGZhbHNlO1xuXG4gIGNvbnN0IHJlc29sdmVNb2R1bGVzID0gWydub2RlX21vZHVsZXMnLCAuLi5ub2RlUGF0aF07XG4gIGNvbmZpZy5yZXNvbHZlIS5tb2R1bGVzID0gcmVzb2x2ZU1vZHVsZXM7XG4gIGlmIChjb25maWcucmVzb2x2ZUxvYWRlciA9PSBudWxsKVxuICAgIGNvbmZpZy5yZXNvbHZlTG9hZGVyID0ge307XG4gIGNvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMgPSByZXNvbHZlTW9kdWxlcztcblxuICBpZiAoY29uZmlnLnJlc29sdmUhLnBsdWdpbnMgPT0gbnVsbCkge1xuICAgIGNvbmZpZy5yZXNvbHZlIS5wbHVnaW5zID0gW107XG4gIH1cbiAgLy8gY29uZmlnLnJlc29sdmUhLnBsdWdpbnMudW5zaGlmdChuZXcgUGxpbmtXZWJwYWNrUmVzb2x2ZVBsdWdpbigpKTtcblxuICBPYmplY3QuYXNzaWduKGNvbmZpZy5yZXNvbHZlIS5hbGlhcywgcmVxdWlyZSgncnhqcy9fZXNtMjAxNS9wYXRoLW1hcHBpbmcnKSgpKTtcblxuICAvLyBjb25maWcucGx1Z2lucyEucHVzaChuZXcgUHJvZ3Jlc3NQbHVnaW4oeyBwcm9maWxlOiB0cnVlIH0pKTtcblxuICBjb25maWcuc3RhdHMgPSAnbm9ybWFsJzsgLy8gTm90IHdvcmtpbmdcblxuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2xpYicpIHtcbiAgICBjaGFuZ2U0bGliKGNtZE9wdGlvbi5idWlsZFRhcmdldCwgY29uZmlnLCBub2RlUGF0aCk7XG4gIH0gZWxzZSB7XG4gICAgY29uZmlnLnBsdWdpbnMhLnVuc2hpZnQobmV3IFRlbXBsYXRlUGx1Z2luKCkpO1xuICAgIHNldHVwU3BsaXRDaHVua3MoY29uZmlnLCAobW9kKSA9PiB7XG4gICAgICBjb25zdCBmaWxlID0gbW9kLm5hbWVGb3JDb25kaXRpb24gPyBtb2QubmFtZUZvckNvbmRpdGlvbigpIDogbnVsbDtcbiAgICAgIGlmIChmaWxlID09IG51bGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY29uc3QgcGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgICAgcmV0dXJuIHBrZyA9PSBudWxsO1xuICAgIH0pO1xuICB9XG5cbiAgcnVuQ29uZmlnSGFuZGxlcnMoY29uZmlnLCB3ZWJwYWNrRW52KTtcbiAgbG9nLmRlYnVnKGBvdXRwdXQucHVibGljUGF0aDogJHtjb25maWcub3V0cHV0IS5wdWJsaWNQYXRofWApO1xuICBmcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICd3ZWJwYWNrLmNvbmZpZy5wbGluay5qcycpLCBwcmludENvbmZpZyhjb25maWcpKTtcblxuICAvLyBjaGFuZ2VUc0NvbmZpZ0ZpbGUoKTtcbiAgcmV0dXJuIGNvbmZpZztcbn07XG5cbi8qKlxuICogZm9yay10cy1jaGVja2VyIGRvZXMgbm90IHdvcmsgZm9yIGZpbGVzIG91dHNpZGUgb2Ygd29ya3NwYWNlIHdoaWNoIGlzIGFjdHVhbGx5IG91ciBsaW5rZWQgc291cmNlIHBhY2thZ2VcbiAqL1xuZnVuY3Rpb24gY2hhbmdlRm9ya1RzQ2hlY2tlclBsdWdpbihjb25maWc6IENvbmZpZ3VyYXRpb24pIHtcbiAgY29uc3QgcGx1Z2lucyA9IGNvbmZpZy5wbHVnaW5zITtcbiAgY29uc3QgY25zdCA9IHJlcXVpcmUobm9kZVJlc29sdmUuc3luYygncmVhY3QtZGV2LXV0aWxzL0ZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luJyxcbiAgICB7YmFzZWRpcjogUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cycpfSkpO1xuICAvLyBsZXQgZm9ya1RzQ2hlY2tJZHggPSAtMTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBwbHVnaW5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChwbHVnaW5zW2ldIGluc3RhbmNlb2YgY25zdCkge1xuICAgICAgKHBsdWdpbnNbaV0gYXMgYW55KS5yZXBvcnRGaWxlcyA9IFtdO1xuICAgICAgLy8gZm9ya1RzQ2hlY2tJZHggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIC8vIGlmIChmb3JrVHNDaGVja0lkeCA+PSAwKSB7XG4gIC8vICAgcGx1Z2lucy5zcGxpY2UoZm9ya1RzQ2hlY2tJZHgsIDEpO1xuICAvLyAgIGxvZy5pbmZvKCdSZW1vdmUgRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4gZHVlIHRvIGl0cyBub3Qgd29ya2luZyB3aXRoIGxpbmtlZCBmaWxlcycpO1xuICAvLyB9XG59XG4vKipcbiAqIHJlYWN0LXNjcmlwdHMvY29uZmlnL2Vudi5qcyBmaWx0ZXJzIE5PREVfUEFUSCBmb3Igb25seSBhbGxvd2luZyByZWxhdGl2ZSBwYXRoLCB0aGlzIGJyZWFrc1xuICogUGxpbmsncyBOT0RFX1BBVEggc2V0dGluZy5cbiAqL1xuZnVuY3Rpb24gcmV2aXNlTm9kZVBhdGhFbnYoKSB7XG4gIGNvbnN0IHtub2RlUGF0aH0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gbm9kZVBhdGguam9pbihQYXRoLmRlbGltaXRlcik7XG59XG5cbi8qKlxuICogSGVscCB0byByZXBsYWNlIHRzLCBqcyBmaWxlIGJ5IGNvbmZpZ3VyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwZW5kT3VyT3duVHNMb2FkZXIoY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG4gIGNvbnN0IG15VHNMb2FkZXJPcHRzOiBUc0xvYWRlck9wdHMgPSB7XG4gICAgdHNDb25maWdGaWxlOiBQYXRoLnJlc29sdmUoJ3RzY29uZmlnLmpzb24nKSxcbiAgICBpbmplY3RvcjogYXBpLmJyb3dzZXJJbmplY3RvcixcbiAgICBjb21waWxlRXhwQ29udGV4dDogZmlsZSA9PiB7XG4gICAgICBjb25zdCBwa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICBpZiAocGtnKSB7XG4gICAgICAgIHJldHVybiB7X19hcGk6IGFwaS5nZXROb2RlQXBpRm9yUGFja2FnZShwa2cpfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIGNvbmZpZy5tb2R1bGUhLnJ1bGVzLnB1c2goe1xuICAgIHRlc3Q6IGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMoL1xcLltqdF1zeD8kLyksXG4gICAgZW5mb3JjZTogJ3ByZScsXG4gICAgdXNlOiB7XG4gICAgICBvcHRpb25zOiBteVRzTG9hZGVyT3B0cyxcbiAgICAgIGxvYWRlcjogcmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvdHMtbG9hZGVyJylcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBydW5Db25maWdIYW5kbGVycyhjb25maWc6IENvbmZpZ3VyYXRpb24sIHdlYnBhY2tFbnY6IHN0cmluZykge1xuICBjb25zdCB7Z2V0Q29uZmlnRmlsZUluUGFja2FnZX06IHR5cGVvZiBfY3JhUGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJyk7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVJblBhY2thZ2UgPSBnZXRDb25maWdGaWxlSW5QYWNrYWdlKCk7XG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcbiAgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChtZ3IgPT4gbWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci53ZWJwYWNrICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKCdFeGVjdXRlIGNvbW1hbmQgbGluZSBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gb3ZlcnJpZGVzJywgY2ZnRmlsZSk7XG4gICAgICBoYW5kbGVyLndlYnBhY2soY29uZmlnLCB3ZWJwYWNrRW52LCBjbWRPcHRpb24pO1xuICAgIH1cbiAgfSwgJ2NyZWF0ZS1yZWFjdC1hcHAgV2VicGFjayBjb25maWcnKSk7XG5cbiAgaWYgKGNvbmZpZ0ZpbGVJblBhY2thZ2UpIHtcbiAgICBjb25zdCBjZmdNZ3IgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihbY29uZmlnRmlsZUluUGFja2FnZV0pO1xuICAgIGNmZ01nci5ydW5FYWNoU3luYzxSZWFjdFNjcmlwdHNIYW5kbGVyPigoY2ZnRmlsZSwgcmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci53ZWJwYWNrICE9IG51bGwpIHtcbiAgICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgV2VicGFjayBjb25maWd1cmF0aW9uIG92ZXJyaWRlcyBmcm9tICcsIGNmZ0ZpbGUpO1xuICAgICAgICBoYW5kbGVyLndlYnBhY2soY29uZmlnLCB3ZWJwYWNrRW52LCBjbWRPcHRpb24pO1xuICAgICAgfVxuICAgIH0sICdjcmVhdGUtcmVhY3QtYXBwIFdlYnBhY2sgY29uZmlnJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5zZXJ0TGVzc0xvYWRlclJ1bGUob3JpZ1J1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IG9uZU9mID0gb3JpZ1J1bGVzLmZpbmQocnVsZSA9PiBydWxlLm9uZU9mKT8ub25lT2YhO1xuICAvLyAxLiBsZXQncyB0YWtlIHJ1bGVzIGZvciBjc3MgYXMgYSB0ZW1wbGF0ZVxuICBjb25zdCBjc3NSdWxlVXNlID0gb25lT2YuZmluZChzdWJSdWxlID0+IHN1YlJ1bGUudGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJlxuICAgIChzdWJSdWxlLnRlc3QgYXMgUmVnRXhwKS5zb3VyY2UgPT09ICdcXFxcLmNzcyQnKT8udXNlIGFzIFJ1bGVTZXRVc2VJdGVtW107XG5cbiAgY29uc3QgY3NzTW9kdWxlUnVsZVVzZSA9IG9uZU9mLmZpbmQoc3ViUnVsZSA9PiBzdWJSdWxlLnRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiZcbiAgICAoc3ViUnVsZS50ZXN0IGFzIFJlZ0V4cCkuc291cmNlID09PSAnXFxcXC5tb2R1bGVcXFxcLmNzcyQnKT8udXNlIGFzIFJ1bGVTZXRVc2VJdGVtW107XG5cbiAgY29uc3QgbGVzc01vZHVsZVJ1bGU6IFJ1bGVTZXRSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC5tb2R1bGVcXC5sZXNzJC8sXG4gICAgdXNlOiBjcmVhdGVMZXNzUnVsZVVzZShjc3NNb2R1bGVSdWxlVXNlKSxcbiAgICBzaWRlRWZmZWN0czogdHJ1ZVxuICB9O1xuXG4gIGNvbnN0IGxlc3NSdWxlOiBSdWxlU2V0UnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwubGVzcyQvLFxuICAgIC8vIGV4Y2x1ZGU6IC9cXC5tb2R1bGVcXC5sZXNzJC8sXG4gICAgdXNlOiBjcmVhdGVMZXNzUnVsZVVzZShjc3NSdWxlVXNlKSxcbiAgICBzaWRlRWZmZWN0czogdHJ1ZVxuICB9O1xuXG4gIC8vIEluc2VydCBhdCBsYXN0IDJuZCBwb3NpdGlvbiwgcmlnaHQgYmVmb3JlIGZpbGUtbG9hZGVyXG4gIG9uZU9mLnNwbGljZShvbmVPZi5sZW5ndGggLTIsIDAsIGxlc3NNb2R1bGVSdWxlLCBsZXNzUnVsZSk7XG5cbiAgZnVuY3Rpb24gY3JlYXRlTGVzc1J1bGVVc2UodXNlSXRlbXM6IFJ1bGVTZXRVc2VJdGVtW10pIHtcbiAgICByZXR1cm4gdXNlSXRlbXMubWFwKHVzZUl0ZW0gPT4ge1xuICAgICAgaWYgKHR5cGVvZiB1c2VJdGVtID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdXNlSXRlbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gdXNlSXRlbTtcbiAgICAgIH1cbiAgICAgIGxldCBuZXdVc2VJdGVtOiBSdWxlU2V0TG9hZGVyID0gey4uLnVzZUl0ZW19O1xuICAgICAgaWYgKHVzZUl0ZW0ubG9hZGVyICYmIC9bXFxcXC9dY3NzXFwtbG9hZGVyW1xcXFwvXS8udGVzdCh1c2VJdGVtLmxvYWRlcikpIHtcbiAgICAgICAgbmV3VXNlSXRlbS5vcHRpb25zID0ge1xuICAgICAgICAgIC4uLihuZXdVc2VJdGVtLm9wdGlvbnMgYXMgYW55IHx8IHt9KSxcbiAgICAgICAgICBpbXBvcnRMb2FkZXJzOiAyXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3VXNlSXRlbTtcbiAgICB9KS5jb25jYXQoe1xuICAgICAgbG9hZGVyOiAnbGVzcy1sb2FkZXInLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBsZXNzT3B0aW9uczoge1xuICAgICAgICAgIGphdmFzY3JpcHRFbmFibGVkOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxEYXRhOiBnZXRTZXR0aW5nKCkubGVzc0xvYWRlckFkZGl0aW9uYWxEYXRhXG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuY29uc3QgZmlsZUxvYWRlck9wdGlvbnMgPSB7XG4gIC8vIGVzTW9kdWxlOiBmYWxzZSxcbiAgb3V0cHV0UGF0aCh1cmw6IHN0cmluZywgcmVzb3VyY2VQYXRoOiBzdHJpbmcsIGNvbnRleHQ6IHN0cmluZykge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGAkeyhwayA/IHBrLnNob3J0TmFtZSA6ICdleHRlcm5hbCcpfS8ke3VybH1gO1xuICB9XG59O1xuXG4vKipcbiAqIFxuICogQHBhcmFtIHJ1bGVzIFxuICovXG5mdW5jdGlvbiBjaGFuZ2VGaWxlTG9hZGVyKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IGNyYVBhdGhzID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHMnKTtcbiAgLy8gVE9ETzogY2hlY2sgaW4gY2FzZSBDUkEgd2lsbCB1c2UgUnVsZS51c2UgaW5zdGVhZCBvZiBcImxvYWRlclwiXG4gIGNoZWNrU2V0KHJ1bGVzKTtcbiAgZm9yIChjb25zdCBydWxlIG9mIHJ1bGVzKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocnVsZS51c2UpKSB7XG4gICAgICBjaGVja1NldChydWxlLnVzZSk7XG5cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocnVsZS5sb2FkZXIpKSB7XG4gICAgICAgIGNoZWNrU2V0KHJ1bGUubG9hZGVyKTtcbiAgICB9IGVsc2UgaWYgKHJ1bGUub25lT2YpIHtcbiAgICAgIGluc2VydFJhd0xvYWRlcihydWxlLm9uZU9mKTtcbiAgICAgIHJldHVybiBjaGFuZ2VGaWxlTG9hZGVyKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldC5sZW5ndGggOyBpKyspIHtcbiAgICAgIGNvbnN0IHJ1bGUgPSBzZXRbaV07XG5cbiAgICAgIGlmICh0eXBlb2YgcnVsZSA9PT0gJ3N0cmluZycgJiYgKHJ1bGUuaW5kZXhPZignZmlsZS1sb2FkZXInKSA+PSAwIHx8IHJ1bGUuaW5kZXhPZigndXJsLWxvYWRlcicpID49IDApKSB7XG4gICAgICAgIHNldFtpXSA9IHtcbiAgICAgICAgICBsb2FkZXI6IHJ1bGUsXG4gICAgICAgICAgb3B0aW9uczogZmlsZUxvYWRlck9wdGlvbnNcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJ1bGVTZXRSdWxlID0gcnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXI7XG4gICAgICAgICBpZiAoKHR5cGVvZiBydWxlU2V0UnVsZS5sb2FkZXIpID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAoKHJ1bGVTZXRSdWxlLmxvYWRlciBhcyBzdHJpbmcpLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fFxuICAgICAgICAocnVsZVNldFJ1bGUubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZigndXJsLWxvYWRlcicpID49IDBcbiAgICAgICAgKSkge1xuICAgICAgICAgIGlmIChydWxlU2V0UnVsZS5vcHRpb25zKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHJ1bGVTZXRSdWxlLm9wdGlvbnMsIGZpbGVMb2FkZXJPcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVsZVNldFJ1bGUub3B0aW9ucyA9IGZpbGVMb2FkZXJPcHRpb25zO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG5cbiAgICAgIGNvbnN0IF9ydWxlID0gcnVsZSBhcyBSdWxlU2V0UnVsZTtcblxuICAgICAgaWYgKF9ydWxlLmluY2x1ZGUgJiYgdHlwZW9mIF9ydWxlLmxvYWRlciA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgKHJ1bGUgYXMgUnVsZVNldExvYWRlcikubG9hZGVyIS5pbmRleE9mKFBhdGguc2VwICsgJ2JhYmVsLWxvYWRlcicgKyBQYXRoLnNlcCkgPj0gMCkge1xuICAgICAgICBkZWxldGUgX3J1bGUuaW5jbHVkZTtcbiAgICAgICAgX3J1bGUudGVzdCA9IGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMoX3J1bGUudGVzdCwgY3JhUGF0aHMuYXBwU3JjKTtcbiAgICAgIH1cbiAgICAgIGlmIChfcnVsZS50ZXN0ICYmIF9ydWxlLnRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXC4oanN8bWpzfGpzeHx0c3x0c3gpJC8nICYmXG4gICAgICAgIF9ydWxlLmluY2x1ZGUpIHtcbiAgICAgICAgICBkZWxldGUgX3J1bGUuaW5jbHVkZTtcbiAgICAgICAgICBfcnVsZS50ZXN0ID0gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhfcnVsZS50ZXN0LCBjcmFQYXRocy5hcHBTcmMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMob3JpZ1Rlc3Q6IFJ1bGVTZXRSdWxlWyd0ZXN0J10sIGFwcFNyYz86IHN0cmluZykge1xuICByZXR1cm4gZnVuY3Rpb24gdGVzdE91clNvdXJjZUZpbGUoZmlsZTogc3RyaW5nKSAge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgIGlmIChwayA9PSBudWxsICYmIGZpbGUuaW5kZXhPZignLmxpbmtzJykgPiAwKVxuICAgICAgbG9nLndhcm4oJ2NyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMnLCBmaWxlLCBwayk7XG4gICAgY29uc3QgeWVzID0gKChwayAmJiAocGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rKSkgfHwgKGFwcFNyYyAmJiBmaWxlLnN0YXJ0c1dpdGgoYXBwU3JjKSkpICYmXG4gICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBSZWdFeHApID8gb3JpZ1Rlc3QudGVzdChmaWxlKSA6XG4gICAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gb3JpZ1Rlc3QoZmlsZSkgOiBvcmlnVGVzdCA9PT0gZmlsZSk7XG4gICAgLy8gbG9nLmluZm8oYFt3ZWJwYWNrLmNvbmZpZ10gYmFiZWwtbG9hZGVyOiAke2ZpbGV9YCwgeWVzKTtcbiAgICByZXR1cm4geWVzO1xuICB9O1xufVxuXG5mdW5jdGlvbiBpbnNlcnRSYXdMb2FkZXIocnVsZXM6IFJ1bGVTZXRSdWxlW10pIHtcbiAgY29uc3QgaHRtbExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmh0bWwkLyxcbiAgICB1c2U6IFtcbiAgICAgIHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cbiAgICBdXG4gIH07XG4gIHJ1bGVzLnB1c2goaHRtbExvYWRlclJ1bGUpO1xufVxuXG4vKiogVG8gc3VwcG9ydCBNYXRlcmlhbC1jb21wb25lbnQtd2ViICovXG5mdW5jdGlvbiByZXBsYWNlU2Fzc0xvYWRlcihydWxlczogUnVsZVNldFJ1bGVbXSkge1xuICBjb25zdCBvbmVPZiA9IHJ1bGVzLmZpbmQocnVsZSA9PiBydWxlLm9uZU9mKT8ub25lT2YhO1xuICBvbmVPZi5maWx0ZXIoc3ViUnVsZSA9PiBBcnJheS5pc0FycmF5KHN1YlJ1bGUudXNlKSlcbiAgICAuZm9yRWFjaChzdWJSdWxlID0+IHtcbiAgICAgIGNvbnN0IHVzZUl0ZW0gPSAoc3ViUnVsZS51c2UgYXMgUnVsZVNldExvYWRlcltdKVxuICAgICAgLmZpbmQodXNlSXRlbSA9PiB1c2VJdGVtLmxvYWRlciAmJiAvc2Fzcy1sb2FkZXIvLnRlc3QodXNlSXRlbS5sb2FkZXIpKTtcbiAgICAgIGlmICh1c2VJdGVtICE9IG51bGwpIHtcbiAgICAgICAgdXNlSXRlbS5vcHRpb25zID0ge1xuICAgICAgICAgIGltcGxlbWVudGF0aW9uOiByZXF1aXJlKCdzYXNzJyksXG4gICAgICAgICAgd2VicGFja0ltcG9ydGVyOiBmYWxzZSxcbiAgICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgICAgc2Fzc09wdGlvbnM6IHtcbiAgICAgICAgICAgIGluY2x1ZGVQYXRoczogWydub2RlX21vZHVsZXMnLCAuLi5ub2RlUGF0aF1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG59XG4iXX0=