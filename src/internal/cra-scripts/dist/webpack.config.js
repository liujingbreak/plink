"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
///<reference path="./module-declare.d.ts" />
/* eslint-disable no-console,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment */
const path_1 = tslib_1.__importDefault(require("path"));
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const splitChunks_1 = tslib_1.__importDefault(require("@wfh/webpack-common/dist/splitChunks"));
const webpack_stats_plugin_1 = tslib_1.__importDefault(require("@wfh/webpack-common/dist/webpack-stats-plugin"));
const webpack_bundle_analyzer_1 = require("webpack-bundle-analyzer");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const plink_1 = require("@wfh/plink");
const mem_stats_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/utils/mem-stats"));
const webpack_1 = require("webpack");
const resolve_1 = tslib_1.__importDefault(require("resolve"));
const utils_1 = require("./utils");
const webpack_lib_1 = tslib_1.__importDefault(require("./webpack-lib"));
const webpack_dll_1 = require("./webpack-dll");
const change_tsconfig_1 = require("./change-tsconfig");
const termux_issue_webpack_plugin_1 = require("./termux-issue-webpack-plugin");
// import inspector from 'node:inspector';
// inspector.open(9222, 'localhost', true);
const log = plink_1.logger.getLogger('@wfh/cra-scripts.webpack-config');
const { nodePath, rootDir } = JSON.parse(process.env.__plink);
function default_1(webpackEnv) {
    var _a, _b, _c, _d, _e, _f, _g;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const { addResolveAlias } = require('./webpack-resolve');
    (0, utils_1.drawPuppy)('Hack create-react-app', `If you want to know how Webpack is configured, check: ${plink_1.config.resolve('destDir', 'cra-scripts.report')}`);
    const printMsg = (0, utils_1.createCliPrinter)('[Build Progress]');
    const cmdOption = (0, utils_1.getCmdOptions)();
    if (cmdOption.cmd !== 'cra-start') {
        process.env.FAST_REFRESH = 'false';
    }
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
    const reactScriptsInstalledDir = path_1.default.resolve(plink_1.plinkEnv.workDir, 'node_modules/react-scripts');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const config = origWebpackConfig(webpackEnv);
    if (webpackEnv === 'production') {
        // Try to workaround issue: default InlineChunkPlugin 's test property does not match
        // CRA's output chunk file name template,
        // when we set optimization.runtimeChunk to "single" instead of default CRA's value
        config.output.filename = 'static/js/[name]-[contenthash:8].js';
        config.output.chunkFilename = 'static/js/[name]-[contenthash:8].chunk.js';
        config.output.devtoolModuleFilenameTemplate =
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (info) => path_1.default.relative(rootDir, info.absoluteResourcePath).replace(/\\/g, '/');
    }
    else {
        config.output.filename = 'static/js/[name].js';
        config.output.chunkFilename = 'static/js/[name].chunk.js';
    }
    config.stats = 'normal';
    addResolveAlias(config);
    const reportDir = (0, utils_1.getReportDir)();
    fs_extra_1.default.mkdirpSync(reportDir);
    fs_extra_1.default.writeFile(path_1.default.resolve(reportDir, 'webpack.config.cra.js'), (0, utils_1.printConfig)(config), (err) => {
        if (err)
            log.error('Failed to write ' + path_1.default.resolve(reportDir, 'webpack.config.cra.js'), err);
    });
    // if (cmdOption.buildType === 'app') {
    //   config.output!.path = craPaths().appBuild;
    // }
    // Remove ModulesScopePlugin from resolve plugins, it stops us using source fold out side of project directory
    if ((_a = config.resolve) === null || _a === void 0 ? void 0 : _a.plugins) {
        const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
        const srcScopePluginIdx = config.resolve.plugins.findIndex(plugin => plugin instanceof ModuleScopePlugin);
        if (srcScopePluginIdx >= 0) {
            config.resolve.plugins.splice(srcScopePluginIdx, 1);
        }
    }
    // config.resolve!.symlinks = false;
    const { getPkgOfFile } = (0, plink_1.packageOfFileFactory)();
    config.cache.buildDependencies.plink = [getPkgOfFile(__filename).path.replace(/\\/g, '/') + '/'];
    const resolveModules = lodash_1.default.uniq(['node_modules', ...nodePath]);
    // config.resolve!.symlinks = false;
    config.resolve.modules = lodash_1.default.uniq([...(_c = (_b = config.resolve) === null || _b === void 0 ? void 0 : _b.modules) !== null && _c !== void 0 ? _c : [], ...nodePath]);
    if (config.resolveLoader == null)
        config.resolveLoader = {};
    config.resolveLoader.modules = resolveModules;
    // config.resolveLoader.symlinks = false;
    if (config.watchOptions == null)
        config.watchOptions = {};
    if (cmdOption.usePoll) {
        config.watchOptions.poll = 1000;
    }
    config.watchOptions.aggregateTimeout = 900;
    config.watchOptions.ignored = /(?:\bnode_modules\b|^(?:\/(?:data(?:\/data)?)?)$)/;
    // config.watchOptions.followSymlinks = false;
    // config.resolve!.plugins.unshift(new PlinkWebpackResolvePlugin());
    // Object.assign(config.resolve!.alias, require('rxjs/_esm2015/path-mapping')());
    if (cmdOption.cmd === 'cra-build')
        config.plugins.push(new webpack_stats_plugin_1.default());
    addProgressPlugin(config, (...s) => void printMsg(...s));
    if (config.infrastructureLogging)
        config.infrastructureLogging.level = 'warn';
    if (cmdOption.buildType === 'lib') {
        (0, webpack_lib_1.default)(cmdOption.buildTargets[0].pkg, config);
    }
    else if (cmdOption.buildType === 'dll') {
        if (cmdOption.refDllManifest) {
            (0, webpack_dll_1.setupDllReferencePlugin)(cmdOption.refDllManifest, config);
        }
        (0, webpack_dll_1.setupDllPlugin)(cmdOption.buildTargets, config, getPluginConstructor);
    }
    else {
        let dllJsFiles = [];
        if (cmdOption.refDllManifest) {
            dllJsFiles = (0, webpack_dll_1.setupDllReferencePlugin)(cmdOption.refDllManifest, config);
        }
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
        const htmlWebpackPluginConstrutor = getPluginConstructor('html-webpack-plugin'); // require(nodeResolve.sync('html-webpack-plugin', {basedir: reactScriptsInstalledDir}));
        const htmlWebpackPluginInstance = config.plugins.find(plugin => plugin instanceof htmlWebpackPluginConstrutor);
        htmlWebpackPluginInstance.userOptions.templateParameters = {
            _config: (0, plink_1.config)(),
            _dllJsFiles: dllJsFiles.map(p => config.output.publicPath + p)
        };
        (0, splitChunks_1.default)(config, (mod) => {
            var _a;
            const file = (_a = mod.resource) !== null && _a !== void 0 ? _a : null;
            if (file == null)
                return true;
            const pkg = getPkgOfFile(file);
            return pkg == null || (pkg.json.dr == null && pkg.json.plink == null);
        });
    }
    const now = new Date();
    const timeStr = now.getDate() + '_' + now.getHours() + '-' + now.getMinutes() + '-' + now.getSeconds() + '-' + now.getMilliseconds();
    (_d = config.plugins) === null || _d === void 0 ? void 0 : _d.push(new termux_issue_webpack_plugin_1.TermuxWebpackPlugin());
    if (cmdOption.cmd === 'cra-build' && !cmdOption.watch) {
        (_e = config.plugins) === null || _e === void 0 ? void 0 : _e.push(new termux_issue_webpack_plugin_1.TermuxWebpackPlugin(), new webpack_bundle_analyzer_1.BundleAnalyzerPlugin({
            analyzerMode: 'disabled',
            generateStatsFile: true,
            statsFilename: path_1.default.join(plink_1.plinkEnv.distDir, `webpack-bundle-analyzer.stats-${timeStr}.json`)
        }));
    }
    function getPluginConstructor(pluginPkgName) {
        return require(resolve_1.default.sync(pluginPkgName, { basedir: reactScriptsInstalledDir }));
    }
    const rules = [...(_g = (_f = config.module) === null || _f === void 0 ? void 0 : _f.rules) !== null && _g !== void 0 ? _g : []]; // BFS array contains both RuleSetRule and RuleSetUseItem
    for (const rule of rules) {
        if (typeof rule !== 'string') {
            if (rule.oneOf) {
                rules.push(...rule.oneOf);
            }
            else if (Array.isArray(rule.use)) {
                rules.push(...rule.use); // In factor rule.use is RuleSetUseItem not RuleSetRule
            }
            else if (rule.loader) {
                const appSrc = path_1.default.join(plink_1.plinkEnv.workDir, 'src');
                if (/\bbabel-loader\b/.test(rule.loader) && rule.include) {
                    delete rule.include;
                    rule.test = createRuleTestFunc4Src(rule.test, appSrc);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    rule.options.plugins.push([
                        'formatjs',
                        {
                            idInterpolationPattern: '[sha512:contenthash:base64:6]',
                            ast: true
                        }
                    ]);
                }
                else if (/\bsass-loader\b/.test(rule.loader)) {
                    /** To support Material-component-web */
                    rule.options = {
                        implementation: require('sass'),
                        webpackImporter: false,
                        sourceMap: true,
                        sassOptions: {
                            // According to https://github.com/material-components/material-components-web/blob/master/docs/getting-started.md#appendix-configuring-a-sass-importer-for-nested-node_modules
                            // it's better to implement a "importer" property here to help Sass resolve @matertial modules,
                            // otherwise Sass will always load top level packages from "includePaths" (node_modules) instead of Node's module resolution algorithm
                            includePaths: ['node_modules', ...nodePath]
                        }
                    };
                }
                else if (/\bsource-map-loader\b/.test(rule.loader)) {
                    rule.test = createRuleTestFunc4Src(rule.test, appSrc);
                }
            }
        }
    }
    changeForkTsCheckerOptions(config, craPaths().appIndexJs, getPluginConstructor, cmdOption);
    runConfigHandlers(config, webpackEnv);
    log.info(`output.publicPath: ${config.output.publicPath}`);
    fs_extra_1.default.writeFileSync(path_1.default.resolve(reportDir, 'webpack.config.plink.js'), (0, utils_1.printConfig)(config));
    return config;
}
exports.default = default_1;
function addProgressPlugin(config, send) {
    // let spinner: ReturnType<typeof _ora>;
    if (process.stdout.isTTY) {
        config.plugins.push(new webpack_1.ProgressPlugin({
            activeModules: true,
            modules: true,
            modulesCount: 100,
            handler(percentage, msg, ...args) {
                send(Math.round(percentage * 100), '%', msg, ...args);
            }
        }));
    }
}
function createRuleTestFunc4Src(origTest, appSrc) {
    const { getPkgOfFile } = (0, plink_1.packageOfFileFactory)();
    const appSrcDir = appSrc + path_1.default.sep;
    return function testOurSourceFile(file) {
        const pk = getPkgOfFile(file);
        const yes = ((pk && (pk.json.dr || pk.json.plink)) || file.startsWith(appSrcDir)) &&
            (origTest instanceof RegExp)
            ? origTest.test(file) :
            (origTest instanceof Function ? origTest(file) : origTest === file);
        // if (file.indexOf('service-worker') >= 0)
        //   log.warn(`[webpack.config] testOurSourceFile: ${file} ${yes}, appSrc: ${appSrc}\n\n\n\n`);
        return yes;
    };
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
// function appendOurOwnTsLoader(config: Configuration) {
//   const myTsLoaderOpts: TsLoaderOpts = {
//     tsConfigFile: Path.resolve('tsconfig.json'),
//     injector: api.browserInjector!,
//     compileExpContext: file => {
//       const pkg = api.findPackageByFile(file);
//       if (pkg) {
//         return {__api: api.getNodeApiForPackage!(pkg)};
//       } else {
//         return {};
//       }
//     }
//   };
//   config.module?.rules?.push({
//     test: createRuleTestFunc4Src(/\.[jt]sx?$/),
//     // enforce: 'pre',
//     use: {
//       options: myTsLoaderOpts,
//       loader: require.resolve('@wfh/webpack-common/dist/ts-loader')
//     }
//   });
// }
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
    plink_1.config.configHandlerMgrChanged(mgr => mgr.runEachSync((cfgFile, _result, handler) => {
        if (handler.webpack != null) {
            log.info('Execute command line Webpack configuration overrides', cfgFile);
            handler.webpack(config, webpackEnv, cmdOption);
        }
    }, 'create-react-app Webpack config'));
}
function changeForkTsCheckerOptions(config, appIndexFile, pluginConstFinder, cmdOptions) {
    var _a;
    const plugins = config.plugins;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cnst = pluginConstFinder('react-dev-utils/ForkTsCheckerWebpackPlugin');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cnst2 = pluginConstFinder('react-dev-utils/ForkTsCheckerWarningWebpackPlugin');
    const plugin = plugins.find(p => p instanceof cnst || p instanceof cnst2);
    if (plugin == null) {
        throw new Error('Can not find fork-ts-checker-webpack-plugin in existing Webpack configuation');
    }
    const opts = plugin.options;
    if (!cmdOptions.tsck) {
        log.warn('fork-ts-checker-webpack-plugin is disabled');
        // (opts.typescript as Exclude<ForkTsCheckerWebpackPluginOptions['typescript'], boolean | undefined>).enabled = false;
        config.plugins = config.plugins.filter(p => p !== plugin);
        return;
    }
    const tsconfig = opts.typescript.configOverwrite;
    const typescriptOpts = opts.typescript;
    typescriptOpts.diagnosticOptions = {
        /**
         * If we set "declaration": true,
         * there will be Typescript compile error like "This is likely not portable, a type annotation is necessary"
         * https://github.com/microsoft/TypeScript/issues/30858
    
         * It usally happens when you are using a "monorepo", with a resolved symlink pointing to some directory which is not under "node_modules",
         * the alternative solution is, **try not to resolve symlinks** in compiler options, and don't use real file path in "file", "include" property in tsconfig.
         */
        declaration: false,
        global: true,
        syntactic: true,
        semantic: true
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (_a = opts.issue) === null || _a === void 0 ? true : delete _a.include;
    log.info('CRA fork-ts-checker configuration:', opts.typescript);
    const override = (0, change_tsconfig_1.changeTsConfigFile)(appIndexFile).tsconfigJson;
    for (const coProp of ['sourceMap', 'inlineSourceMap', 'declarationMap']) {
        delete override.compilerOptions[coProp];
    }
    Object.assign(tsconfig.compilerOptions, override.compilerOptions);
    for (const [prop, value] of Object.entries(override)) {
        if (prop !== 'compilerOptions')
            tsconfig[prop] = value;
    }
    const tsconfigReport = path_1.default.resolve((0, utils_1.getReportDir)(), 'tsconfig.json');
    log.info('tsconfig for forked-ts-checker', tsconfigReport);
    void fs_extra_1.default.promises.writeFile(tsconfigReport, JSON.stringify(tsconfig, null, '  '));
}
//# sourceMappingURL=webpack.config.js.map