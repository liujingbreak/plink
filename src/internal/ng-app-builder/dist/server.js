"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-line-length */
const __api_1 = require("__api");
const log4js = require("log4js");
const _ = require("lodash");
const Path = require("path");
const config_webpack_1 = require("./config-webpack");
const ng_ts_replace_1 = require("./ng-ts-replace");
const Url = require("url");
const fs = require('fs-extra');
const sysFs = fs;
const log = log4js.getLogger(__api_1.default.packageName);
function compile() {
    setupApiForAngularCli();
    if (!__api_1.default.argv.ng)
        return;
    // var tsConfigPath = writeTsconfig();
    // var useHappypack = api.config.get('@dr-core/webpack2-builder.useHappypack', false);
    // var devMode = api.config().devMode;
    // var happyThreadPool = HappyPack.ThreadPool({
    // 	size: api.config.get('@dr-core/webpack2-builder.happyThreadPoolSize', 2)
    // });
    // api.configWebpackLater(
    // 	function(webpackConfig: WebpackConfig): WebpackConfig {
    // 		if (webpackConfig.resolve.alias)
    // 			Object.assign(webpackConfig.resolve.alias, rxPaths());
    // 		else
    // 			webpackConfig.resolve.alias = rxPaths();
    // 		webpackConfig.resolve.mainFields = [
    // 			'browser',
    // 			'module',
    // 			'main'
    // 		];
    // 		if (webpackConfig.resolveLoader.alias)
    // 			Object.assign(webpackConfig.resolveLoader.alias, rxPaths());
    // 		else
    // 			webpackConfig.resolveLoader.alias = rxPaths();
    // 		webpackConfig.module.rules.push(
    // 			{
    // 				test: /\.css$/,
    // 				compiler: AOT ? () => true : undefined,
    // 				issuer: AOT ? undefined: api.isIssuerAngular,
    // 				use: [
    // 					'exports-loader?module.exports.toString()',
    // 					{
    // 						loader: 'css-loader',
    // 						options: {
    // 							sourceMap: api.config().enableSourceMaps,
    // 							import: false
    // 						}
    // 					},
    // 					{
    // 						loader: 'postcss-loader',
    // 						options: {
    // 							ident: 'postcss',
    // 							plugins: postcssPlugins,
    // 							sourceMap: api.config().enableSourceMaps
    // 						}
    // 					},
    // 					{loader: 'lib/css-url-assets-loader'},
    // 					{loader: 'require-injector/css-loader', options: {
    // 						injector: api.browserInjector
    // 					}}
    // 				]
    // 			},
    // 			{
    // 				test: /\.scss$|\.sass$/,
    // 				compiler: AOT ? () => true : undefined,
    // 				issuer: AOT ? undefined: api.isIssuerAngular,
    // 				use: [
    // 					'exports-loader?module.exports.toString()',
    // 					{
    // 						loader: 'css-loader',
    // 						options: {
    // 							sourceMap: api.config().enableSourceMaps,
    // 							import: false
    // 						}
    // 					},
    // 					{
    // 						loader: 'postcss-loader',
    // 						options: {
    // 							ident: 'postcss',
    // 							plugins: postcssPlugins,
    // 							sourceMap: api.config().enableSourceMaps
    // 						}
    // 					},
    // 					{loader: 'lib/css-url-assets-loader'},
    // 					{
    // 						loader: 'sass-loader',
    // 						options: {
    // 							sourceMap: api.config().enableSourceMaps,
    // 							precision: 8,
    // 							includePaths: []
    // 						}
    // 					},
    // 					{loader: 'require-injector/css-loader', options: {
    // 						injector: api.browserInjector
    // 					}}
    // 				]
    // 			  },
    // 			{
    // 				test: /\.less$/,
    // 				compiler: AOT ? () => true : undefined,
    // 				issuer: AOT ? undefined: api.isIssuerAngular,
    // 				use: [
    // 					'exports-loader?module.exports.toString()',
    // 					{
    // 						loader: 'css-loader',
    // 						options: {
    // 							sourceMap: api.config().enableSourceMaps,
    // 							import: false
    // 						}
    // 					},
    // 					{
    // 						loader: 'postcss-loader',
    // 						options: {
    // 							ident: 'postcss',
    // 							plugins: postcssPlugins,
    // 							sourceMap: api.config().enableSourceMaps
    // 						}
    // 					},
    // 					{loader: 'lib/css-url-assets-loader'},
    // 					{loader: 'less-loader', options: {
    // 						sourceMap: api.config().enableSourceMaps
    // 					}},
    // 					{loader: 'require-injector/css-loader', options: {
    // 						injector: api.browserInjector
    // 					}}
    // 				]
    // 			},
    // 			devMode ?
    // 			{
    // 				test: shouldUseNgLoader,
    // 				use: ['@ngtools/webpack']
    // 			} : {
    // 				test: shouldUseNgLoader,
    // 				use: [
    // 					{
    // 						loader: '@angular-devkit/build-optimizer/webpack-loader',
    // 						options: {
    // 							sourceMap: api.config().enableSourceMaps
    // 						}
    // 					},
    // 					'@ngtools/webpack'
    // 				]
    // 			}
    // 		);
    // 		// var entryPackage = api.packageInfo.moduleMap['@dr-core/ng-app-builder'];
    // 		// TODO:
    // 		// var angularCompiler = new AngularCompilerPlugin({
    // 		// 	mainPath: Path.resolve(__dirname, '../browser/main.ts'),
    // 		// 	// mainPath: require.resolve('@dr/angular-app/main.ts'),
    // 		// 	basePath: api.config().rootPath,
    // 		// 	platform: 0,
    // 		// 	skipCodeGeneration: !AOT,
    // 		// 	// forkTypeChecker: true, // Only available at version above 6.0.0
    // 		// 	// Angular 5 has a bug with Typescript > 2.4.2:
    // 		// 	// "Host should not return a redirect source file from `getSourceFile`"
    // 		// 	hostReplacementPaths: environmentMap(),
    // 		// 	sourceMap: api.config().enableSourceMaps,
    // 		// 	tsConfigPath,
    // 		// 	compilerOptions: {
    // 		// 	}
    // 		// });
    // 		// TODO: require-injector
    // 		// (angularCompiler as any)._compilerHost.writeFile();
    // 		// webpackConfig.plugins.push(angularCompiler);
    // 		// let env = api.argv.env;
    // 		// if (env) {
    // 		// 	api.browserInjector.fromAllComponents().alias(
    // 		// 		/^.*\/environment(\?:.ts)?$/, (file: string, result: RegExpExecArray) => {
    // 		// 		if (file.endsWith('.ts')) {
    // 		// 			return result[0] + '.' + env;
    // 		// 		}
    // 		// 		log.warn(file, result);
    // 		// 		return result[0];
    // 		// 	});
    // 		// }
    // 		if (!devMode) {
    // 			webpackConfig.plugins.push(new PurifyPlugin());
    // 		}
    // 		return webpackConfig;
    // 	});
}
exports.compile = compile;
function init() {
    writeTsconfig();
}
exports.init = init;
function activate() {
    // setupApiForAngularCli();
    __api_1.default.router().get('/ok', (req, res) => {
        log.warn('cool');
        res.send('cool');
    });
}
exports.activate = activate;
// function shouldUseNgLoader(file: string): boolean {
// 	if (!/(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/.test(file))
// 		return false;
// 	var component = api.findPackageByFile(file);
// 	if (!component)
// 		return true;
// 	else if (_.get(component, 'dr.angularCompiler'))
// 		return true;
// 	return false;
// }
function writeTsconfig() {
    var root = __api_1.default.config().rootPath;
    var tempDir = __api_1.default.config.resolve('destDir', 'webpack-temp');
    sysFs.mkdirsSync(tempDir);
    var packageScopes = __api_1.default.config().packageScopes;
    var components = __api_1.default.packageInfo.moduleMap;
    var ngPackages = __api_1.default.packageInfo.allModules;
    if (__api_1.default.argv.package && __api_1.default.argv.package.length > 0) {
        var someComps = [];
        var packages = _.uniq([...__api_1.default.argv.package, __api_1.default.packageName]);
        for (const name of packages) {
            if (_.has(components, name) && _.has(components, [name, 'dr', 'angularCompiler'])) {
                someComps.push(components[name]);
            }
            else {
                packageScopes.some(scope => {
                    const testName = `@${scope}/${name}`;
                    if (_.has(components, testName) && _.get(components, [name, 'dr', 'angularCompiler'])) {
                        someComps.push(components[testName]);
                        return true;
                    }
                    return false;
                });
            }
        }
        ngPackages = someComps;
    }
    else {
        ngPackages = ngPackages.filter(comp => comp.dr && comp.dr.angularCompiler || comp.parsedName.scope === 'bk');
    }
    const tsInclude = [];
    const tsExclude = [];
    ngPackages.forEach(pk => {
        const dir = Path.relative(tempDir, _.get(pk, 'dr.ngAppModule') ? pk.realPackagePath : pk.packagePath)
            .replace(/\\/g, '/');
        tsInclude.push(dir + '/**/*.ts');
        tsExclude.push(dir + '/ts', dir + '/spec', dir + '/dist', dir + '/**/*.spec.ts');
    });
    tsExclude.push('**/test.ts');
    var tsjson = {
        extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
        include: tsInclude,
        exclude: tsExclude,
        compilerOptions: {
            baseUrl: root,
            paths: {
                '*': [
                    'node_modules/*'
                ]
            },
            typeRoots: [
                Path.resolve(root, 'node_modules/@types'),
                Path.resolve(root, 'node_modules/@dr-types'),
                Path.resolve(root, 'node_modules/dr-comp-package/wfh/types')
            ],
            module: 'esnext'
        },
        angularCompilerOptions: {
            trace: true,
            strictMetadataEmit: true
        }
    };
    var tsConfigPath = Path.resolve(tempDir, 'angular-app-tsconfig.json');
    fs.writeFileSync(tsConfigPath, JSON.stringify(tsjson, null, '  '));
    return tsConfigPath;
}
exports.writeTsconfig = writeTsconfig;
function setupApiForAngularCli() {
    const ngParam = __api_1.default.config()._angularCli;
    if (!ngParam || __api_1.default.ngEntryComponent)
        return;
    if (!ngParam.browserOptions.preserveSymlinks) {
        throw new Error('In order to get DRCP builder work,\
		you must set property `preserveSymlinks` to be true in project\'s angular.json file \
		');
    }
    const webpackConfig = ngParam.webpackConfig;
    const ngEntryComponent = __api_1.default.findPackageByFile(Path.resolve(ngParam.projectRoot));
    const publicUrlObj = Url.parse(webpackConfig.output.publicPath);
    Object.assign(Object.getPrototypeOf(__api_1.default), {
        webpackConfig,
        ngEntryComponent,
        deployUrlPath: publicUrlObj.pathname,
        ngRouterPath(packageName, subPath) {
            const url = this.assetsUrl(packageName, subPath);
            return _.trimStart(Url.parse(url).pathname, '/');
        }
    });
    __api_1.default.config.set(['outputPathMap', ngEntryComponent.longName], '/');
    __api_1.default.config.set('staticAssetsURL', webpackConfig.output.publicPath);
    config_webpack_1.default(ngParam, webpackConfig, __api_1.default.config());
    // ngParam.vfsHost.hookRead = createTsReadHook(ngParam);
    ngParam.vfsHost.hookRead = ng_ts_replace_1.default(ngParam);
    log.info('Setup api object for Angular');
}

//# sourceMappingURL=server.js.map
