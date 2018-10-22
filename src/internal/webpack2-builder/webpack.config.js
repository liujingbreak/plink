/* eslint max-lines: 0*/
const api = require('__api');
const webpack = require('webpack');
const _ = require('lodash');
// const chalk = require('chalk');
const Path = require('path');
const log4js = require('log4js');
const log = log4js.getLogger(api.packageName);
const ExtractTextPlugin = require('extract-text-webpack-plugin');
// const fs = require('fs');
//const atl = require('awesome-typescript-loader');
// const ManualChunkPlugin = require('./lib/manual-chunk-plugin');
const MultiEntryHtmlPlugin = require('./lib/multi-entry-html-plugin');
const DrModuleResolvePlugin = require('./lib/dr-module-resolve-plugin');
const loaderConfig = require('./configs/loader-config');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const { LicenseWebpackPlugin } = require('license-webpack-plugin');
const HappyPack = require('happypack');
const { WatchIgnorePlugin, DefinePlugin, NoEmitOnErrorsPlugin, HashedModuleIdsPlugin, NamedModulesPlugin} = require('webpack');
const {styleLoaders, isIssuerAngular, isIssuerNotAngular} = require('./dist/webpack-options-helper');
// const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');

module.exports = function(webpackConfigEntry, noParseChecker, file2ChunkName,
	legoConfig, chunk4package, sendlivereload, entryHtmlOutputPathPlugin, entryHtmlCssScopePlugin) {
	var useHappypack = api.config.get(api.packageName + '.useHappypack', false);
	var useSymlinks = api.config.get(api.packageName + '.symlinks', true);
	var happyThreadPool = HappyPack.ThreadPool({size: api.config.get(api.packageName + '.happyThreadPoolSize', 2)});

	var devMode = api.config().devMode;
	//var astCache = {};
	var componentScopes = api.config().packageScopes || [];

	var entryFileSet = new Set();
	_.values(webpackConfigEntry).forEach(file => entryFileSet.add(file));

	var webpackConfig = {
		context: api.config().rootPath,
		entry: webpackConfigEntry,
		output: {
			filename: api.webpackConfigTapable.applyPluginsWaterfall('wp-filename', devMode ? '[name].js' : '[name].[chunkhash:10].js'),
			chunkFilename: api.webpackConfigTapable.applyPluginsWaterfall('wp-filename', devMode ? '[id].[name].js' : '[id].[name].[chunkhash:10].js'),
			// https://webpack.js.org/loaders/style-loader/
			// We must provide complete protocal:hostname:port, because of blob URL issue of style-loader
			//
			// Note about source maps support and assets referenced with url: when style loader is used
			// with ?sourceMap option, the CSS modules will be generated as Blobs, so relative paths
			// don't work (they would be relative to chrome:blob or chrome:devtools).
			// In order for assets to maintain correct paths setting output.publicPath property of
			// webpack configuration must be set, so that absolute paths are generated.
			publicPath: api.config().publicPath + (api.isDefaultLocale() ? '' : api.getBuildLocale() + '/'),
			path: api.config.resolve('staticDir') + (api.isDefaultLocale() ? '' : '/' + api.getBuildLocale()),
			pathinfo: devMode
		},
		watch: false,
		module: {
			noParse(file) {
				return noParseChecker.isNoParseFor(file);
			},
			rules: [
				{
					test: /\.jade$/,
					use: [
						{loader: 'html-loader', options: {attrs: 'img:src'}},
						{loader: 'lib/html-loader'}, // Replace keyward assets:// in *[src|href|srcset|ng-src]
						{loader: '@dr/translate-generator'},
						{loader: 'lib/jade-to-html-loader'}
					]
				},
				{
					test: /\.html$/,
					use: [
						{loader: 'html-loader', options: {attrs: 'img:src'}},
						//{loader: 'html-minify-loader'},
						{loader: 'lib/html-loader'}, // Replace keyward assets:// in *[src|href|srcset|ng-src]
						{loader: '@dr/translate-generator'},
						{loader: '@dr/template-builder'}
					]
				},
				{
					test: /\.md$/,
					use: [
						{loader: 'html-loader', options: {attrs: 'img:src'}},
						{loader: 'lib/html-loader'}, // Replace keyward assets:// in *[src|href|srcset|ng-src]
						{loader: 'lib/markdown-loader'}//,
						//{loader: 'lib/debug-loader', options: {id: 0}}
					]
				},
				{
					test: /\.txt$/,
					use: {loader: 'raw-loader'}
				}, {
					test: /\.(yaml|yml)$/,
					use: [
						{loader: 'json-loader'},
						{loader: 'yaml-loader'}
					]
				}, {
					test: /\.(eot|woff2|woff|ttf|svg|cur)$/,
					use: [{loader: 'lib/dr-file-loader'}]
				}, {
					test: /\.(jpg|png|gif|svg|jpeg)$/,
					use: [
						{
							loader: 'url-loader',
							options: {
								limit: !devMode ? 10000 : 1, // <10k ,use base64 format, dev mode only use url for speed
								fallback: 'lib/dr-file-loader'
							}
						}
					]
				},
				{
					test: /\.css$/,
					issuer: isIssuerNotAngular,
					use: api.argv.hmr ? ['style-loader', ...styleLoaders.css] :
						ExtractTextPlugin.extract({
							fallback: 'style-loader',
							use: styleLoaders.css
						})
				},
				{
					test: /\.scss$/,
					issuer: isIssuerNotAngular,
					use: api.argv.hmr ? ['style-loader', ...styleLoaders.scss] :
						ExtractTextPlugin.extract({
							fallback: 'style-loader',
							use: styleLoaders.scss
						})
				},
				{
					test: /\.less$/,
					issuer: isIssuerNotAngular,
					use: api.argv.hmr ? ['style-loader', ...styleLoaders.less] :
						ExtractTextPlugin.extract({
							fallback: 'style-loader',
							use: styleLoaders.less
						})
				},
				{
					// test if it is our component
					test: isDrFile(/\.[jt]sx?$/),
					use: [
						//{loader: 'lib/debug-loader', options: {label: 'My debug loader'}},
						{loader: '@dr/translate-generator'},
						// {loader: 'dist/lib/ie8-keyword-loader', options: {replace: false}},
						{loader: 'lib/api-loader'}
					]
				},
				// {
				// 	test: /\.(js|ts)x?$/,
				// 	use: [{loader: 'require-injector', options: {injector: api.browserInjector}}],
				// 	parser: {
				// 		amd: false // Do not parse some 3rd-party library as AMD module, like GSAP will fail in AMD module mode
				// 	}
				// },
				// babel
				{
					test: isDrFile(/\.[jt]sx?$/),
					// test: /\.(?:jsx?|tsx?)$/,
					use: useHappypack ? ['happypack/loader?id=babel'] : [loaderConfig.babel()]
				},
				// typescript loader
				{
					test: isDrFile(['.ts', '.tsx'], notAngularCompiler), ///\.(?:tsx?|jsx?)$/,
					use: useHappypack ? ['happypack/loader?id=ts'] : [loaderConfig.tsloader(false)]
				},
				{
					test: /\.[jt]sx?$/,
					use: [{loader: 'require-injector', options: {injector: api.browserInjector}}],
					parser: {
						amd: false // Do not parse some 3rd-party library as AMD module, like GSAP will fail in AMD module mode
					}
				},
				{
					// test if it is our component
					test: isDrFile(/\.[jt]sx?$/),
					use: [
						{loader: 'lib/insert-line-loader'},
						{loader: 'dist/lib/require-lodash-loader',
							options: {disabled: api.config.get(api.packageName + '.no-require-lodash-loader', false)}
						}
					]
				}
			]
		},
		resolve: {
			modules: ['node_modules'],
			plugins: [
				//new atl.TsConfigPathsPlugin(),
				new DrModuleResolvePlugin()
			],
			extensions: ['.ts', '.tsx', '.js', '.jsx', 'json'],
			symlinks: useSymlinks
		},
		resolveLoader: {
			modules: [__dirname, 'node_modules']
		},
		devtool: api.config().enableSourceMaps ? 'source-map' : false, //'hidden-source-map',
		plugins: [
			new NoEmitOnErrorsPlugin(),
			(api.argv.report || api.argv.openReport || !devMode) ?
				new BundleAnalyzerPlugin({
					analyzerMode: 'static',
					reportFilename: 'bundle-report.html',
					openAnalyzer: api.argv.openReport
				}) : () => {},
			new webpack.NoEmitOnErrorsPlugin(),
			new MultiEntryHtmlPlugin({
				inlineChunk: 'runtime',
				inlineCssSize: api.config.get([api.packageName, 'inlineCssSize']),
				inlineJsSize: api.config.get([api.packageName, 'inlineJsSize']),
				es5shimUrl: api.assetsUrl(devMode ? 'es5-shim/es5-shim.js' : 'es5-shim/es5-shim.min.js'),
				es5shamUrl: api.assetsUrl(devMode ? 'es5-shim/es5-sham.js' : 'es5-shim/es5-sham.min.js')
				// promisePolyfillChunk: 'promise-polyfill'
				// promisePolyfillCode: fs.readFileSync(require.resolve(api.packageName +
				// 	'/assets/promise-polyfill/' + (devMode ? 'polyfill.js' : 'polyfill.min.js'), 'utf-8'))
			}),
			api.argv.pgs ? new ProgressPlugin() : () => {},
			// TODO: new CircularDependencyPlugin({
			// 	exclude: /(\\|\/)node_modules(\\|\/)/,
			// 	failOnError: false,
			// 	onDetected: false,
			// 	cwd: '/Users/liujing/3rdparty/angular-app'
			// }),
			//new webpack.optimize.ModuleConcatenationPlugin(),
			api.argv.hmr ? new NamedModulesPlugin() : new HashedModuleIdsPlugin(),
			api.argv.hmr ? new webpack.HotModuleReplacementPlugin() : function() {},
			new WatchIgnorePlugin([api.config.resolve('destDir', 'webpack-temp')]),
			//new atl.CheckerPlugin(),
			new ForkTsCheckerWebpackPlugin({
				// tsconfig: api.config.resolve('destDir', 'webpack-temp', 'tsconfig.json'),
				tsconfig: Path.resolve(__dirname, 'configs', 'tsconfig.json'),
				memoryLimit: api.config.get(api.packageName + '.tsChecker.memoryLimit', 512),
				logger: log4js.getLogger(api.packageName + '.ts-checker'),
				async: devMode,
				checkSyntacticErrors: useHappypack
			}),
			// TODO: Webpack 4
			// new ManualChunkPlugin({
			// 	hasExtractTextWebpackPlugin: true,
			// 	manifest: 'runtime',
			// 	defaultChunkName: api.config.get([api.packageName, 'defaultChunkName']),
			// 	getChunkName: (file) => {
			// 		var bundle = file2ChunkName[file];
			// 		if (bundle) {
			// 			log.debug('chunk %s, for file %s', bundle, file);
			// 			return bundle;
			// 		}
			// 		var pk = api.findPackageByFile(file);
			// 		if (!pk) {
			// 			log.debug('No chunk(bundle) name for: %s', chalk.yellow(Path.relative(webpackConfig.context, file)));
			// 			return null;
			// 		}
			// 		return chunk4package(pk);
			// 	}
			// }),
			api.argv.hmr ? () => {} :
				new ExtractTextPlugin({
					//disable: api.argv.dll != null || (api.argv['ref-dll'] != null && api.argv.ww),
					filename: api.argv.dll != null ? '[name].css' :
						api.webpackConfigTapable.applyPluginsWaterfall('wp-filename', devMode ? '[name].css' : '[name].[contenthash:10].css')
				}),
			entryHtmlOutputPathPlugin,
			entryHtmlCssScopePlugin,
			new DefinePlugin({
				LEGO_CONFIG: JSON.stringify(legoConfig),
				'LEGO_CONFIG.buildLocale': JSON.stringify(legoConfig.buildLocale),
				'process.env.NODE_ENV': legoConfig.devMode ? '"development"' : '"production"'
			}),
			function() {
				if (api.config.get('devMode') === true && api.config.get('livereload.enabled', true)) {
					this.plugin('done', function() {
						log.info('live reload page'); // tiny-lr server is started
						sendlivereload();
					});
				}
			},
			// new LodashModuleReplacementPlugin()
			// More dynamically added plugins at end of this function: gzipSizePlugin and UglifyJSPlugin
		],
		watchOptions: {
			aggregateTimeout: 700,
			poll: false
		},
		node: {
			fs: 'empty',
			global: true,
			crypto: 'empty',
			tls: 'empty',
			net: 'empty',
			process: true,
			module: false,
			clearImmediate: false,
			setImmediate: false
		},
	};

	if (useHappypack) {
		log.info('Use happypack');
		webpackConfig.plugins.push(new HappyPack({
			id: 'babel',
			threadPool: happyThreadPool,
			loaders: [
				loaderConfig.babel()
			]
		}),
		new HappyPack({
			id: 'ts',
			threadPool: happyThreadPool,
			loaders: [loaderConfig.tsloader(true)]
		})
			// new HappyPack({
			// 	id: 'html',
			// 	threadPool: happyThreadPool,
			// 	loaders: [
			// 		{loader: 'html-loader', options: {attrs: 'img:src'}},
			// 		//{loader: 'html-minify-loader'},
			// 		{loader: 'lib/html-loader'}, // Replace keyward assets:// in *[src|href|srcset|ng-src]
			// 		{loader: '@dr/translate-generator'},
			// 		{loader: '@dr/template-builder'}
			// 	]
			// })
		);
	}
	if (!devMode) {
		webpackConfig.plugins.push(
			new LicenseWebpackPlugin({
				licenseFilenames: [
					'LICENSE',
					'LICENSE.md',
					'LICENSE.txt',
					'license',
					'license.md',
					'license.txt'
				],
				perChunkOutput: false,
				outputTemplate: require.resolve('license-webpack-plugin/output.template.ejs'),
				outputFilename: '3rdpartylicenses.txt',
				suppressErrors: true,
				includePackagesWithoutLicense: false,
				abortOnUnacceptableLicense: false,
				addBanner: false,
				bannerTemplate: '/*! 3rd party license information is available at <%- filename %> */',
				includedChunks: [],
				excludedChunks: [],
				additionalPackages: [],
				pattern: /^(MIT|ISC|BSD.*)$/
			}),
			require('./lib/gzipSizePlugin'),
			// https://webpack.js.org/plugins/uglifyjs-webpack-plugin
			new UglifyJsPlugin({
				test: /\.js$/i,
				extractComments: false,
				sourceMap: api.config().enableSourceMaps,
				cache: false,
				parallel: false,
				uglifyOptions: {
					output: {
						ascii_only: true,
						comments: false,
						webkit: true
					},
					ecma: 5,
					warnings: false,
					ie8: true,
					mangle: {
						safari10: true
					},
					compress: {
						typeofs: false,
						pure_getters: true,
						passes: 3
					}
				}
			}));
	}

	function isDrFile(fileSuffix, compareFunc) {
		return function(file) {
			var pattern;
			if (fileSuffix instanceof RegExp) {
				pattern = fileSuffix;
			} else if (!_.some([].concat(fileSuffix), suffix => file.endsWith(suffix)))
				return false;
			if (entryFileSet.has(file))
				return false;
			if (noParseChecker.isNoParseFor(file))
				return false;
			var component = api.findPackageByFile(file);
			var isOurs = !!(component && (_.includes(componentScopes, component.parsedName.scope) ||
				component.dr));
			if (!isOurs)
				return false;
			if (component && component.dr) {
				if (pattern) {
					var relativePath = Path.relative(useSymlinks ? component.realPackagePath : component.packagePath, file);
					if (Path.sep === '\\')
						relativePath = relativePath.replace(/\\/g, '/'); // Replace all back slash with slash
					if (!pattern.test(relativePath))
						return false;
				}
				if (compareFunc != null) {
					return compareFunc(relativePath, component);
				}
			}
			return true;
		};
	}

	Object.assign(Object.getPrototypeOf(api), {
		isDrFile,
		isIssuerAngular
	});

	function notAngularCompiler(relPath, component) {
		return !component.dr.angularCompiler;
	}

	return webpackConfig;
};





