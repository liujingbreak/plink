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
    __api_1.default.config.configHandlerMgr().runEachSync((cfgFile, result, handler) => {
        if (handler.webpack != null) {
            log.info('Execute command line Webpack configuration overrides', cfgFile);
            handler.webpack(config, webpackEnv, cmdOption);
        }
    });
    if (configFileInPackage) {
        const cfgMgr = new config_handler_1.ConfigHandlerMgr([configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            if (handler.webpack != null) {
                log.info('Execute Webpack configuration overrides from ', cfgFile);
                handler.webpack(config, webpackEnv, cmdOption);
            }
        });
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
                additionalData: __api_1.default.config.get([__api_1.default.packageName, 'lessLoaderAdditionalData'], '')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsNEJBQTRCO0FBQzVCLHVFQUFzRTtBQUV0RSx1RkFBb0U7QUFFcEUsd0RBQTBCO0FBRTFCLCtEQUErRDtBQUMvRCxvREFBNEI7QUFDNUIsZ0RBQXdCO0FBRXhCLGtEQUF3QjtBQUd4QixtQ0FBZ0U7QUFDaEUsaUZBQWlGO0FBQ2pGLGdFQUF1QztBQUV2Qyx5R0FBMkU7QUFDM0Usc0RBQWtDO0FBQ2xDLHdEQUF3RDtBQUV4RCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM1QyxNQUFNLEVBQUMsUUFBUSxFQUFFLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQStGekU7O0dBRUc7QUFDSCxTQUFTLHlCQUF5QixDQUFDLE1BQXFCO0lBQ3RELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFRLENBQUM7SUFDaEMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGlCQUFXLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxFQUNoRixFQUFDLE9BQU8sRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsMkJBQTJCO0lBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDOUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxFQUFFO1lBQzdCLE9BQU8sQ0FBQyxDQUFDLENBQVMsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO1lBQ3JDLHNCQUFzQjtZQUN0QixNQUFNO1NB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aXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCB7IENvbmZpZ0hhbmRsZXJNZ3IgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB0eXBlIHsgUGxpbmtFbnYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCc7XG5pbXBvcnQgc2V0dXBTcGxpdENodW5rcyBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3Qvc3BsaXRDaHVua3MnO1xuaW1wb3J0IHsgT3B0aW9ucyBhcyBUc0xvYWRlck9wdHMgfSBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvdHMtbG9hZGVyJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHdhbGtQYWNrYWdlc0FuZFNldHVwSW5qZWN0b3IgZnJvbSAnLi9pbmplY3Rvci1zZXR1cCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IENvbmZpZ3VyYXRpb24sIFJ1bGVTZXRMb2FkZXIsIFJ1bGVTZXRSdWxlLCBSdWxlU2V0VXNlSXRlbSB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG4vLyBpbXBvcnQgeyBmaW5kUGFja2FnZSB9IGZyb20gJy4vYnVpbGQtdGFyZ2V0LWhlbHBlcic7XG5pbXBvcnQgeyBSZWFjdFNjcmlwdHNIYW5kbGVyIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBkcmF3UHVwcHksIGdldENtZE9wdGlvbnMsIHByaW50Q29uZmlnIH0gZnJvbSAnLi91dGlscyc7XG4vLyBpbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjaGFuZ2U0bGliIGZyb20gJy4vd2VicGFjay1saWInO1xuaW1wb3J0ICogYXMgX2NyYVBhdGhzIGZyb20gJy4vY3JhLXNjcmlwdHMtcGF0aHMnO1xuaW1wb3J0IFRlbXBsYXRlUGx1Z2luIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC90ZW1wbGF0ZS1odG1sLXBsdWdpbic7XG5pbXBvcnQgbm9kZVJlc29sdmUgZnJvbSAncmVzb2x2ZSc7XG4vLyBpbXBvcnQge2NoYW5nZVRzQ29uZmlnRmlsZX0gZnJvbSAnLi9jaGFuZ2UtdHNjb25maWcnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdjcmEtc2NyaXB0cycpO1xuY29uc3Qge25vZGVQYXRoLCByb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG5leHBvcnQgPSBmdW5jdGlvbih3ZWJwYWNrRW52OiAncHJvZHVjdGlvbicgfCAnZGV2ZWxvcG1lbnQnKSB7XG4gIGRyYXdQdXBweSgnUG9vaW5nIG9uIGNyZWF0ZS1yZWFjdC1hcHAnLCBgSWYgeW91IHdhbnQgdG8ga25vdyBob3cgV2VicGFjayBpcyBjb25maWd1cmVkLCBjaGVjazogJHthcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnY3JhLXNjcmlwdHMucmVwb3J0Jyl9YCk7XG4gIGNvbnNvbGUubG9nKCdwcm9jZXNzLmVudi5QVUJMSUNfVVJMPScsIHByb2Nlc3MuZW52LlBVQkxJQ19VUkwpO1xuXG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcbiAgLy8gYG5wbSBydW4gYnVpbGRgIGJ5IGRlZmF1bHQgaXMgaW4gcHJvZHVjdGlvbiBtb2RlLCBiZWxvdyBoYWNrcyB0aGUgd2F5IHJlYWN0LXNjcmlwdHMgZG9lc1xuICBpZiAoY21kT3B0aW9uLmRldk1vZGUgfHwgY21kT3B0aW9uLndhdGNoKSB7XG4gICAgd2VicGFja0VudiA9ICdkZXZlbG9wbWVudCc7XG4gICAgbG9nLmluZm8oJ0RldmVsb3BtZW50IG1vZGUgaXMgb246Jywgd2VicGFja0Vudik7XG4gIH0gZWxzZSB7XG4gICAgLy8gcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ2ZhbHNlJztcbiAgfVxuICBsb2cuaW5mbygnd2VicGFja0VudiA9Jywgd2VicGFja0Vudik7XG4gIGNvbnN0IG9yaWdXZWJwYWNrQ29uZmlnID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvd2VicGFjay5jb25maWcnKTtcbiAgcmV2aXNlTm9kZVBhdGhFbnYoKTtcblxuICBwcm9jZXNzLmVudi5JTkxJTkVfUlVOVElNRV9DSFVOSyA9ICd0cnVlJztcblxuICBjb25zdCB7ZGVmYXVsdDogY3JhUGF0aHN9OiB0eXBlb2YgX2NyYVBhdGhzID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpO1xuXG4gIGNvbnN0IGNvbmZpZzogQ29uZmlndXJhdGlvbiA9IG9yaWdXZWJwYWNrQ29uZmlnKHdlYnBhY2tFbnYpO1xuICBpZiAod2VicGFja0VudiA9PT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgLy8gVHJ5IHRvIHdvcmthcm91bmQgY3JlYXRlLXJlYWN0LWFwcCBpc3N1ZTogZGVmYXVsdCBJbmxpbmVDaHVua1BsdWdpbiAncyB0ZXN0IHByb3BlcnR5IGRvZXMgbm90IG1hdGNoIFxuICAgIC8vIHJ1bnRpbWUgY2h1bmsgZmlsZSBuYW1lIHdoZW4gd2Ugc2V0IG9wdGltaXphdGlvbi5ydW50aW1lQ2h1bmsgdG8gXCJzaW5nbGVcIiBpbnN0ZWFkIG9mIGRlZmF1bHQgQ1JBJ3MgdmFsdWVcbiAgICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLVtjb250ZW50aGFzaDo4XS5qcyc7XG4gICAgY29uZmlnLm91dHB1dCEuY2h1bmtGaWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLVtjb250ZW50aGFzaDo4XS5jaHVuay5qcyc7XG4gICAgY29uZmlnLm91dHB1dCEuZGV2dG9vbE1vZHVsZUZpbGVuYW1lVGVtcGxhdGUgPVxuICAgICAgaW5mbyA9PiBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIGluZm8uYWJzb2x1dGVSZXNvdXJjZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgfSBlbHNlIHtcbiAgICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdzdGF0aWMvanMvW25hbWVdLmpzJztcbiAgICBjb25maWcub3V0cHV0IS5jaHVua0ZpbGVuYW1lID0gJ3N0YXRpYy9qcy9bbmFtZV0uY2h1bmsuanMnO1xuICB9XG5cbiAgY29uc3QgcmVwb3J0RGlyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2NyYS1zY3JpcHRzLnJlcG9ydCcpO1xuICBmcy5ta2RpcnBTeW5jKHJlcG9ydERpcik7XG4gIGZzLndyaXRlRmlsZShQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcuY3JhLmpzJyksIHByaW50Q29uZmlnKGNvbmZpZyksIChlcnIpID0+IHtcbiAgICBpZiAoZXJyKVxuICAgICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgJyArIFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICd3ZWJwYWNrLmNvbmZpZy5jcmEuanMnKSwgZXJyKTtcbiAgfSk7XG5cbiAgLy8gTWFrZSBzdXJlIGJhYmVsIGNvbXBpbGVzIHNvdXJjZSBmb2xkZXIgb3V0IHNpZGUgb2YgY3VycmVudCBzcmMgZGlyZWN0b3J5XG4gIGZpbmRBbmRDaGFuZ2VSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcbiAgcmVwbGFjZVNhc3NMb2FkZXIoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuICBhcHBlbmRPdXJPd25Uc0xvYWRlcihjb25maWcpO1xuICBpbnNlcnRMZXNzTG9hZGVyUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG4gIGNoYW5nZUZvcmtUc0NoZWNrZXJQbHVnaW4oY29uZmlnKTtcblxuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2FwcCcpIHtcbiAgICBjb25maWcub3V0cHV0IS5wYXRoID0gY3JhUGF0aHMoKS5hcHBCdWlsZDtcbiAgICAvLyBjb25maWcuZGV2dG9vbCA9ICdzb3VyY2UtbWFwJztcbiAgfVxuXG4gIC8vIFJlbW92ZSBNb2R1bGVzU2NvcGVQbHVnaW4gZnJvbSByZXNvbHZlIHBsdWdpbnMsIGl0IHN0b3BzIHVzIHVzaW5nIHNvdXJjZSBmb2xkIG91dCBzaWRlIG9mIHByb2plY3QgZGlyZWN0b3J5XG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5wbHVnaW5zKSB7XG4gICAgY29uc3QgTW9kdWxlU2NvcGVQbHVnaW4gPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvTW9kdWxlU2NvcGVQbHVnaW4nKTtcbiAgICBjb25zdCBzcmNTY29wZVBsdWdpbklkeCA9IGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuZmluZEluZGV4KHBsdWdpbiA9PiBwbHVnaW4gaW5zdGFuY2VvZiBNb2R1bGVTY29wZVBsdWdpbik7XG4gICAgaWYgKHNyY1Njb3BlUGx1Z2luSWR4ID49IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuc3BsaWNlKHNyY1Njb3BlUGx1Z2luSWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICAvLyBjb25maWcucmVzb2x2ZSEuc3ltbGlua3MgPSBmYWxzZTtcblxuICBjb25zdCByZXNvbHZlTW9kdWxlcyA9IFsnbm9kZV9tb2R1bGVzJywgLi4ubm9kZVBhdGhdO1xuICBjb25maWcucmVzb2x2ZSEubW9kdWxlcyA9IHJlc29sdmVNb2R1bGVzO1xuXG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLnJlc29sdmUhLmFsaWFzLCByZXF1aXJlKCdyeGpzL19lc20yMDE1L3BhdGgtbWFwcGluZycpKCkpO1xuXG4gIC8vIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyBQcm9ncmVzc1BsdWdpbih7IHByb2ZpbGU6IHRydWUgfSkpO1xuXG4gIGNvbmZpZy5zdGF0cyA9ICdub3JtYWwnOyAvLyBOb3Qgd29ya2luZ1xuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnbGliJykge1xuICAgIGNoYW5nZTRsaWIoY21kT3B0aW9uLmJ1aWxkVGFyZ2V0LCBjb25maWcsIG5vZGVQYXRoKTtcbiAgfSBlbHNlIHtcbiAgICBjb25maWcucGx1Z2lucyEudW5zaGlmdChuZXcgVGVtcGxhdGVQbHVnaW4oKSk7XG4gICAgc2V0dXBTcGxpdENodW5rcyhjb25maWcsIChtb2QpID0+IHtcbiAgICAgIGNvbnN0IGZpbGUgPSBtb2QubmFtZUZvckNvbmRpdGlvbiA/IG1vZC5uYW1lRm9yQ29uZGl0aW9uKCkgOiBudWxsO1xuICAgICAgaWYgKGZpbGUgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBjb25zdCBwa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICByZXR1cm4gcGtnID09IG51bGw7XG4gICAgfSk7XG4gIH1cblxuICBydW5Db25maWdIYW5kbGVycyhjb25maWcsIHdlYnBhY2tFbnYpO1xuICBsb2cuaW5mbyhgb3V0cHV0LnB1YmxpY1BhdGg6ICR7Y29uZmlnLm91dHB1dCEucHVibGljUGF0aH1gKTtcbiAgZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnd2VicGFjay5jb25maWcucGxpbmsuanMnKSwgcHJpbnRDb25maWcoY29uZmlnKSk7XG5cbiAgLy8gY2hhbmdlVHNDb25maWdGaWxlKCk7XG4gIHJldHVybiBjb25maWc7XG59O1xuXG4vKipcbiAqIGZvcmstdHMtY2hlY2tlciBkb2VzIG5vdCB3b3JrIGZvciBmaWxlcyBvdXRzaWRlIG9mIHdvcmtzcGFjZSB3aGljaCBpcyBhY3R1YWxseSBvdXIgbGlua2VkIHNvdXJjZSBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZUZvcmtUc0NoZWNrZXJQbHVnaW4oY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG4gIGNvbnN0IHBsdWdpbnMgPSBjb25maWcucGx1Z2lucyE7XG4gIGNvbnN0IGNuc3QgPSByZXF1aXJlKG5vZGVSZXNvbHZlLnN5bmMoJ3JlYWN0LWRldi11dGlscy9Gb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbicsXG4gICAge2Jhc2VkaXI6IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMnKX0pKTtcbiAgLy8gbGV0IGZvcmtUc0NoZWNrSWR4ID0gLTE7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcGx1Z2lucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAocGx1Z2luc1tpXSBpbnN0YW5jZW9mIGNuc3QpIHtcbiAgICAgIChwbHVnaW5zW2ldIGFzIGFueSkucmVwb3J0RmlsZXMgPSBbXTtcbiAgICAgIC8vIGZvcmtUc0NoZWNrSWR4ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICAvLyBpZiAoZm9ya1RzQ2hlY2tJZHggPj0gMCkge1xuICAvLyAgIHBsdWdpbnMuc3BsaWNlKGZvcmtUc0NoZWNrSWR4LCAxKTtcbiAgLy8gICBsb2cuaW5mbygnUmVtb3ZlIEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luIGR1ZSB0byBpdHMgbm90IHdvcmtpbmcgd2l0aCBsaW5rZWQgZmlsZXMnKTtcbiAgLy8gfVxufVxuLyoqXG4gKiByZWFjdC1zY3JpcHRzL2NvbmZpZy9lbnYuanMgZmlsdGVycyBOT0RFX1BBVEggZm9yIG9ubHkgYWxsb3dpbmcgcmVsYXRpdmUgcGF0aCwgdGhpcyBicmVha3NcbiAqIFBsaW5rJ3MgTk9ERV9QQVRIIHNldHRpbmcuXG4gKi9cbmZ1bmN0aW9uIHJldmlzZU5vZGVQYXRoRW52KCkge1xuICBjb25zdCB7bm9kZVBhdGh9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG4gIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IG5vZGVQYXRoLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG4vKipcbiAqIEhlbHAgdG8gcmVwbGFjZSB0cywganMgZmlsZSBieSBjb25maWd1cmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZE91ck93blRzTG9hZGVyKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBteVRzTG9hZGVyT3B0czogVHNMb2FkZXJPcHRzID0ge1xuICAgIHRzQ29uZmlnRmlsZTogUGF0aC5yZXNvbHZlKCd0c2NvbmZpZy5qc29uJyksXG4gICAgaW5qZWN0b3I6IGFwaS5icm93c2VySW5qZWN0b3IsXG4gICAgY29tcGlsZUV4cENvbnRleDogZmlsZSA9PiB7XG4gICAgICBjb25zdCBwa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICBpZiAocGtnKSB7XG4gICAgICAgIHJldHVybiB7X19hcGk6IGFwaS5nZXROb2RlQXBpRm9yUGFja2FnZShwa2cpfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIGNvbmZpZy5tb2R1bGUhLnJ1bGVzLnB1c2goe1xuICAgIHRlc3Q6IGNyZWF0ZVJ1bGVUZXN0RnVuYzRTcmMoL1xcLltqdF1zeD8kLyksXG4gICAgZW5mb3JjZTogJ3ByZScsXG4gICAgdXNlOiB7XG4gICAgICBvcHRpb25zOiBteVRzTG9hZGVyT3B0cyxcbiAgICAgIGxvYWRlcjogcmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvdHMtbG9hZGVyJylcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBydW5Db25maWdIYW5kbGVycyhjb25maWc6IENvbmZpZ3VyYXRpb24sIHdlYnBhY2tFbnY6IHN0cmluZykge1xuICBjb25zdCB7Y29uZmlnRmlsZUluUGFja2FnZX06IHR5cGVvZiBfY3JhUGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJyk7XG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcbiAgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaFN5bmM8UmVhY3RTY3JpcHRzSGFuZGxlcj4oKGNmZ0ZpbGUsIHJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLndlYnBhY2sgIT0gbnVsbCkge1xuICAgICAgbG9nLmluZm8oJ0V4ZWN1dGUgY29tbWFuZCBsaW5lIFdlYnBhY2sgY29uZmlndXJhdGlvbiBvdmVycmlkZXMnLCBjZmdGaWxlKTtcbiAgICAgIGhhbmRsZXIud2VicGFjayhjb25maWcsIHdlYnBhY2tFbnYsIGNtZE9wdGlvbik7XG4gICAgfVxuICB9KTtcblxuICBpZiAoY29uZmlnRmlsZUluUGFja2FnZSkge1xuICAgIGNvbnN0IGNmZ01nciA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFtjb25maWdGaWxlSW5QYWNrYWdlXSk7XG4gICAgY2ZnTWdyLnJ1bkVhY2hTeW5jPFJlYWN0U2NyaXB0c0hhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLndlYnBhY2sgIT0gbnVsbCkge1xuICAgICAgICBsb2cuaW5mbygnRXhlY3V0ZSBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gb3ZlcnJpZGVzIGZyb20gJywgY2ZnRmlsZSk7XG4gICAgICAgIGhhbmRsZXIud2VicGFjayhjb25maWcsIHdlYnBhY2tFbnYsIGNtZE9wdGlvbik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5zZXJ0TGVzc0xvYWRlclJ1bGUob3JpZ1J1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IG9uZU9mID0gb3JpZ1J1bGVzLmZpbmQocnVsZSA9PiBydWxlLm9uZU9mKT8ub25lT2YhO1xuICAvLyAxLiBsZXQncyB0YWtlIHJ1bGVzIGZvciBjc3MgYXMgYSB0ZW1wbGF0ZVxuICBjb25zdCBjc3NSdWxlVXNlID0gb25lT2YuZmluZChzdWJSdWxlID0+IHN1YlJ1bGUudGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJlxuICAgIChzdWJSdWxlLnRlc3QgYXMgUmVnRXhwKS5zb3VyY2UgPT09ICdcXFxcLmNzcyQnKT8udXNlIGFzIFJ1bGVTZXRVc2VJdGVtW107XG5cbiAgY29uc3QgY3NzTW9kdWxlUnVsZVVzZSA9IG9uZU9mLmZpbmQoc3ViUnVsZSA9PiBzdWJSdWxlLnRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiZcbiAgICAoc3ViUnVsZS50ZXN0IGFzIFJlZ0V4cCkuc291cmNlID09PSAnXFxcXC5tb2R1bGVcXFxcLmNzcyQnKT8udXNlIGFzIFJ1bGVTZXRVc2VJdGVtW107XG5cbiAgY29uc3QgbGVzc01vZHVsZVJ1bGU6IFJ1bGVTZXRSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC5tb2R1bGVcXC5sZXNzJC8sXG4gICAgdXNlOiBjcmVhdGVMZXNzUnVsZVVzZShjc3NNb2R1bGVSdWxlVXNlKSxcbiAgICBzaWRlRWZmZWN0czogdHJ1ZVxuICB9O1xuXG4gIGNvbnN0IGxlc3NSdWxlOiBSdWxlU2V0UnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwubGVzcyQvLFxuICAgIC8vIGV4Y2x1ZGU6IC9cXC5tb2R1bGVcXC5sZXNzJC8sXG4gICAgdXNlOiBjcmVhdGVMZXNzUnVsZVVzZShjc3NSdWxlVXNlKSxcbiAgICBzaWRlRWZmZWN0czogdHJ1ZVxuICB9O1xuXG4gIC8vIEluc2VydCBhdCBsYXN0IDJuZCBwb3NpdGlvbiwgcmlnaHQgYmVmb3JlIGZpbGUtbG9hZGVyXG4gIG9uZU9mLnNwbGljZShvbmVPZi5sZW5ndGggLTIsIDAsIGxlc3NNb2R1bGVSdWxlLCBsZXNzUnVsZSk7XG5cbiAgZnVuY3Rpb24gY3JlYXRlTGVzc1J1bGVVc2UodXNlSXRlbXM6IFJ1bGVTZXRVc2VJdGVtW10pIHtcbiAgICByZXR1cm4gdXNlSXRlbXMubWFwKHVzZUl0ZW0gPT4ge1xuICAgICAgaWYgKHR5cGVvZiB1c2VJdGVtID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdXNlSXRlbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gdXNlSXRlbTtcbiAgICAgIH1cbiAgICAgIGxldCBuZXdVc2VJdGVtOiBSdWxlU2V0TG9hZGVyID0gey4uLnVzZUl0ZW19O1xuICAgICAgaWYgKHVzZUl0ZW0ubG9hZGVyICYmIC9bXFxcXC9dY3NzXFwtbG9hZGVyW1xcXFwvXS8udGVzdCh1c2VJdGVtLmxvYWRlcikpIHtcbiAgICAgICAgbmV3VXNlSXRlbS5vcHRpb25zID0ge1xuICAgICAgICAgIC4uLihuZXdVc2VJdGVtLm9wdGlvbnMgYXMgYW55IHx8IHt9KSxcbiAgICAgICAgICBpbXBvcnRMb2FkZXJzOiAyXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3VXNlSXRlbTtcbiAgICB9KS5jb25jYXQoe1xuICAgICAgbG9hZGVyOiAnbGVzcy1sb2FkZXInLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBsZXNzT3B0aW9uczoge1xuICAgICAgICAgIGphdmFzY3JpcHRFbmFibGVkOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxEYXRhOiBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnbGVzc0xvYWRlckFkZGl0aW9uYWxEYXRhJ10sICcnKVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmNvbnN0IGZpbGVMb2FkZXJPcHRpb25zID0ge1xuICAvLyBlc01vZHVsZTogZmFsc2UsXG4gIG91dHB1dFBhdGgodXJsOiBzdHJpbmcsIHJlc291cmNlUGF0aDogc3RyaW5nLCBjb250ZXh0OiBzdHJpbmcpIHtcbiAgICBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBgJHsocGsgPyBway5zaG9ydE5hbWUgOiAnZXh0ZXJuYWwnKX0vJHt1cmx9YDtcbiAgfVxufTtcblxuZnVuY3Rpb24gZmluZEFuZENoYW5nZVJ1bGUocnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgY29uc3QgY3JhUGF0aHMgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy9wYXRocycpO1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgaW5zZXJ0UmF3TG9hZGVyKHJ1bGUub25lT2YpO1xuICAgICAgcmV0dXJuIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldC5sZW5ndGggOyBpKyspIHtcbiAgICAgIGNvbnN0IHJ1bGUgPSBzZXRbaV07XG4gICAgICBpZiAodHlwZW9mIHJ1bGUgPT09ICdzdHJpbmcnICYmIChydWxlLmluZGV4T2YoJ2ZpbGUtbG9hZGVyJykgPj0gMCB8fCBydWxlLmluZGV4T2YoJ3VybC1sb2FkZXInKSA+PSAwKSkge1xuICAgICAgICBzZXRbaV0gPSB7XG4gICAgICAgICAgbG9hZGVyOiBydWxlLFxuICAgICAgICAgIG9wdGlvbnM6IGZpbGVMb2FkZXJPcHRpb25zXG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKCh0eXBlb2YgKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5sb2FkZXIpID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAoKChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZignZmlsZS1sb2FkZXInKSA+PSAwIHx8XG4gICAgICAgICgocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLmxvYWRlciBhcyBzdHJpbmcpLmluZGV4T2YoJ3VybC1sb2FkZXInKSA+PSAwXG4gICAgICAgICkpIHtcbiAgICAgICAgICBpZiAoKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5vcHRpb25zKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikub3B0aW9ucywgZmlsZUxvYWRlck9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLm9wdGlvbnMgPSBmaWxlTG9hZGVyT3B0aW9ucztcbiAgICAgICAgICB9XG4gICAgICB9XG5cblxuICAgICAgY29uc3QgX3J1bGUgPSBydWxlIGFzIFJ1bGVTZXRSdWxlO1xuXG4gICAgICBpZiAoX3J1bGUuaW5jbHVkZSAmJiB0eXBlb2YgX3J1bGUubG9hZGVyID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAocnVsZSBhcyBSdWxlU2V0TG9hZGVyKS5sb2FkZXIhLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSA+PSAwKSB7XG4gICAgICAgIGRlbGV0ZSBfcnVsZS5pbmNsdWRlO1xuICAgICAgICBfcnVsZS50ZXN0ID0gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhfcnVsZS50ZXN0LCBjcmFQYXRocy5hcHBTcmMpO1xuICAgICAgfVxuICAgICAgaWYgKF9ydWxlLnRlc3QgJiYgX3J1bGUudGVzdC50b1N0cmluZygpID09PSAnL1xcLihqc3xtanN8anN4fHRzfHRzeCkkLycgJiZcbiAgICAgICAgX3J1bGUuaW5jbHVkZSkge1xuICAgICAgICAgIGRlbGV0ZSBfcnVsZS5pbmNsdWRlO1xuICAgICAgICAgIF9ydWxlLnRlc3QgPSBjcmVhdGVSdWxlVGVzdEZ1bmM0U3JjKF9ydWxlLnRlc3QsIGNyYVBhdGhzLmFwcFNyYyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUnVsZVRlc3RGdW5jNFNyYyhvcmlnVGVzdDogUnVsZVNldFJ1bGVbJ3Rlc3QnXSwgYXBwU3JjPzogc3RyaW5nKSB7XG4gIHJldHVybiBmdW5jdGlvbiB0ZXN0T3VyU291cmNlRmlsZShmaWxlOiBzdHJpbmcpICB7XG4gICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgaWYgKHBrID09IG51bGwgJiYgZmlsZS5pbmRleE9mKCcubGlua3MnKSA+IDApXG4gICAgICBsb2cud2FybignY3JlYXRlUnVsZVRlc3RGdW5jNFNyYycsIGZpbGUsIHBrKTtcbiAgICBjb25zdCB5ZXMgPSAoKHBrICYmIChway5qc29uLmRyIHx8IHBrLmpzb24ucGxpbmspKSB8fCAoYXBwU3JjICYmIGZpbGUuc3RhcnRzV2l0aChhcHBTcmMpKSkgJiZcbiAgICAgIChvcmlnVGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCkgPyBvcmlnVGVzdC50ZXN0KGZpbGUpIDpcbiAgICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcmlnVGVzdChmaWxlKSA6IG9yaWdUZXN0ID09PSBmaWxlKTtcbiAgICAvLyBsb2cuaW5mbyhgW3dlYnBhY2suY29uZmlnXSBiYWJlbC1sb2FkZXI6ICR7ZmlsZX1gLCB5ZXMpO1xuICAgIHJldHVybiB5ZXM7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGluc2VydFJhd0xvYWRlcihydWxlczogUnVsZVNldFJ1bGVbXSkge1xuICBjb25zdCBodG1sTG9hZGVyUnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwuaHRtbCQvLFxuICAgIHVzZTogW1xuICAgICAge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIF1cbiAgfTtcbiAgcnVsZXMucHVzaChodG1sTG9hZGVyUnVsZSk7XG59XG5cbi8qKiBUbyBzdXBwb3J0IE1hdGVyaWFsLWNvbXBvbmVudC13ZWIgKi9cbmZ1bmN0aW9uIHJlcGxhY2VTYXNzTG9hZGVyKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKSB7XG4gIGNvbnN0IG9uZU9mID0gcnVsZXMuZmluZChydWxlID0+IHJ1bGUub25lT2YpPy5vbmVPZiE7XG4gIG9uZU9mLmZpbHRlcihzdWJSdWxlID0+IEFycmF5LmlzQXJyYXkoc3ViUnVsZS51c2UpKVxuICAgIC5mb3JFYWNoKHN1YlJ1bGUgPT4ge1xuICAgICAgY29uc3QgdXNlSXRlbSA9IChzdWJSdWxlLnVzZSBhcyBSdWxlU2V0TG9hZGVyW10pXG4gICAgICAuZmluZCh1c2VJdGVtID0+IHVzZUl0ZW0ubG9hZGVyICYmIC9zYXNzLWxvYWRlci8udGVzdCh1c2VJdGVtLmxvYWRlcikpO1xuICAgICAgaWYgKHVzZUl0ZW0gIT0gbnVsbCkge1xuICAgICAgICB1c2VJdGVtLm9wdGlvbnMgPSB7XG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHJlcXVpcmUoJ3Nhc3MnKSxcbiAgICAgICAgICB3ZWJwYWNrSW1wb3J0ZXI6IGZhbHNlLFxuICAgICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgICBzYXNzT3B0aW9uczoge1xuICAgICAgICAgICAgaW5jbHVkZVBhdGhzOiBbJ25vZGVfbW9kdWxlcycsIC4uLm5vZGVQYXRoXVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbn1cbiJdfQ==