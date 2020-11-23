"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// tslint:disable:no-console
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const webpack_sources_1 = require("webpack-sources");
const utils_1 = require("./utils");
// import {createLazyPackageFileFinder} from '@wfh/plink/wfh/dist/package-utils';
const webpack_lib_1 = __importDefault(require("./webpack-lib"));
const build_target_helper_1 = require("./build-target-helper");
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const splitChunks_1 = __importDefault(require("@wfh/webpack-common/dist/splitChunks"));
// import walkPackagesAndSetupInjector from './injector-setup';
const log4js_1 = __importDefault(require("log4js"));
const __api_1 = __importDefault(require("__api"));
const log = log4js_1.default.getLogger('cra-scripts');
const { nodePath } = JSON.parse(process.env.__plink);
function insertLessLoaderRule(origRules) {
    const rulesAndParents = origRules.map((rule, idx, set) => [rule, idx, set]);
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < rulesAndParents.length; i++) {
        const rule = rulesAndParents[i][0];
        const parentRules = rulesAndParents[i][2];
        const idx = rulesAndParents[i][1];
        if (rule.test) {
            if (rule.test.toString() === '/\\.(scss|sass)$/') {
                const use = rule.use;
                const postCss = use.find(item => item.loader && item.loader.indexOf('postcss-loader') >= 0);
                // log.info(chalk.redBright('' + i));
                parentRules.splice(idx, 0, createLessLoaderRule(postCss));
                break;
            }
        }
        else if (rule.oneOf) {
            rule.oneOf.forEach((r, idx, list) => {
                rulesAndParents.push([r, idx, list]);
            });
        }
    }
}
function createLessLoaderRule(postCssLoaderRule) {
    return {
        test: /\.less$/,
        use: [
            require.resolve('style-loader'),
            {
                loader: require.resolve('css-loader'),
                options: {
                    importLoaders: 2,
                    sourceMap: process.env.GENERATE_SOURCEMAP !== 'false'
                }
            },
            postCssLoaderRule,
            {
                loader: 'less-loader'
            }
        ]
    };
}
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
                    options: {
                        outputPath(url, resourcePath, context) {
                            const pk = __api_1.default.findPackageByFile(resourcePath);
                            return `${(pk ? pk.shortName : 'external')}/${url}`;
                        }
                    }
                };
            }
            else if ((typeof rule.loader) === 'string' &&
                (rule.loader.indexOf('file-loader') >= 0 ||
                    rule.loader.indexOf('url-loader') >= 0)) {
                set[i].options.outputPath = (url, resourcePath, context) => {
                    const pk = __api_1.default.findPackageByFile(resourcePath);
                    return `${(pk ? pk.shortName : 'external')}/${url}`;
                };
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
        const yes = ((pk && pk.dr) || (appSrc && file.startsWith(appSrc))) &&
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
    for (const rule of rules) {
        if (rule.oneOf) {
            for (const subRule of rule.oneOf) {
                if (Array.isArray(subRule.use)) {
                    for (const loaderObj of subRule.use) {
                        if (loaderObj.loader && /sass-loader/.test(loaderObj.loader)) {
                            loaderObj.options = {
                                implementation: require('sass'),
                                webpackImporter: false,
                                sourceMap: true,
                                sassOptions: {
                                    includePaths: ['node_modules', ...nodePath]
                                }
                            };
                        }
                    }
                }
            }
            break;
        }
    }
}
module.exports = function (webpackEnv) {
    utils_1.drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check: ${__api_1.default.config.resolve('destDir', 'cra-scripts.report')}`);
    console.log('process.env.PUBLIC_URL=', process.env.PUBLIC_URL);
    const cmdOption = utils_1.getCmdOptions();
    log.info('webpackEnv =', webpackEnv);
    // `npm run build` by default is in production mode, below hacks the way react-scripts does
    // if (cmdOption.devMode || cmdOption.watch) {
    //   webpackEnv = 'development';
    //   log.info('[cra-scripts] Development mode is on:', webpackEnv);
    // } else {
    //   process.env.GENERATE_SOURCEMAP = 'false';
    // }
    const origWebpackConfig = require('react-scripts/config/webpack.config');
    process.env.INLINE_RUNTIME_CHUNK = 'true';
    const config = origWebpackConfig(webpackEnv);
    if (webpackEnv === 'production') {
        // Try to workaround create-react-app issue: default InlineChunkPlugin 's test property does not match 
        // runtime chunk file name
        config.output.filename = 'static/js/[name]-[contenthash:8].js';
        config.output.chunkFilename = 'static/js/[name]-[contenthash:8].chunk.js';
    }
    const reportDir = __api_1.default.config.resolve('destDir', 'cra-scripts.report');
    fs_extra_1.default.mkdirpSync(reportDir);
    fs_extra_1.default.writeFile(path_1.default.resolve(reportDir, 'webpack.config.cra.js'), utils_1.printConfig(config), (err) => {
        if (err)
            log.error('Failed to write ' + path_1.default.resolve(reportDir, 'webpack.config.cra.js'), err);
    });
    log.info(`[cra-scripts] output.publicPath: ${config.output.publicPath}`);
    // Make sure babel compiles source folder out side of current src directory
    findAndChangeRule(config.module.rules);
    replaceSassLoader(config.module.rules);
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
    insertLessLoaderRule(config.module.rules);
    const foundPkg = build_target_helper_1.findPackage(cmdOption.buildTarget);
    if (foundPkg == null) {
        throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
    }
    const { dir, packageJson } = foundPkg;
    if (cmdOption.buildType === 'app') {
        // TODO: do not hard code
        // config.resolve!.alias!['alias:dr.cra-app-entry'] = packageJson.name + '/' + packageJson.dr['cra-app-entry'];
        // log.info(`[cra-scripts] alias:dr.cra-app-entry: ${config.resolve!.alias!['alias:dr.cra-app-entry']}`);
        config.output.path = __api_1.default.config.resolve('staticDir');
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
    const resolveModules = ['node_modules', ...nodePath];
    config.resolve.modules = resolveModules;
    Object.assign(config.resolve.alias, require('rxjs/_esm2015/path-mapping')());
    config.plugins.push(new (class {
        apply(compiler) {
            compiler.hooks.emit.tap('drcp-cli-stats', compilation => {
                const stats = compilation.getStats();
                compilation.assets['stats.json'] = new webpack_sources_1.RawSource(JSON.stringify(stats.toJson('verbose')));
                setTimeout(() => {
                    log.info('[cra-scripts] stats:');
                    log.info(stats.toString('normal'));
                    log.info('');
                }, 0);
                // const data = JSON.stringify(compilation.getStats().toJson('normal'));
                // compilation.assets['stats.json'] = new RawSource(data);
            });
        }
    })());
    // config.plugins!.push(new ProgressPlugin({ profile: true }));
    config.stats = 'normal'; // Not working
    if (cmdOption.buildType === 'lib') {
        webpack_lib_1.default(cmdOption.buildTarget, config, nodePath);
    }
    else {
        splitChunks_1.default(config, (mod) => {
            const file = mod.nameForCondition ? mod.nameForCondition() : null;
            if (file == null)
                return true;
            const pkg = __api_1.default.findPackageByFile(file);
            return pkg == null;
        });
    }
    __api_1.default.config.configHandlerMgr().runEachSync((cfgFile, result, handler) => {
        log.info('Execute command line Webpack configuration overrides', cfgFile);
        handler.webpack(config, webpackEnv, cmdOption);
    });
    const configFileInPackage = path_1.default.resolve(dir, lodash_1.default.get(packageJson, ['dr', 'config-overrides-path'], 'config-overrides.ts'));
    if (fs_extra_1.default.existsSync(configFileInPackage)) {
        const cfgMgr = new config_handler_1.ConfigHandlerMgr([configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            log.info('Execute Webpack configuration overrides from ', cfgFile);
            handler.webpack(config, webpackEnv, cmdOption);
        });
    }
    fs_extra_1.default.writeFile(path_1.default.resolve(reportDir, 'webpack.config.plink.js'), utils_1.printConfig(config), (err) => {
        if (err)
            console.error(err);
    });
    return config;
};

//# sourceMappingURL=webpack.config.js.map
