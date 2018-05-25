var api = require('__api');
var Path = require('path');

exports.babel = babel;
function babel() {
	return {
		loader: 'babel-loader',
		options: {
			cacheDirectory: api.config.resolve('destDir', 'babel-cache' + (api.isDefaultLocale() ? '' : '/' + api.getBuildLocale())),
			presets: [
				['es2015', {modules: false}],
				'react',
				'stage-0'
			],
			plugins: [
				'lodash',
				'transform-es3-property-literals',
				'transform-es3-member-expression-literals',
				'transform-decorators-legacy',
				'transform-object-assign',
				'syntax-dynamic-import',
				'transform-async-to-generator',
				['import', {libraryName: 'antd', style: 'css'}]
			],
			// Workaround enhanced-resolve, put an nonexisting file here
			babelrc: Path.resolve(api.config().rootPath, '.babelrc')
		}
	};
}

exports.tsloader = function(useHappypack) {
	return {
		loader: 'ts-loader',
		options: {
			transpileOnly: true,
			onlyCompileBundledFiles: true,
			context: api.config().rootPath,
			happyPackMode: useHappypack,
			configFile: Path.resolve(__dirname, 'tsconfig.json')
		}
	};
};

// exports.atl = function typescript() {
// 	var babelOptions = babel().options;
// 	delete babelOptions.cacheDirectory;
// 	var root = api.config().rootPath;
// 	return {
// 		loader: 'awesome-typescript-loader',
// 		options: {
// 			configFile: Path.resolve(__dirname, 'tsconfig.json'),
// 			useBabel: true,
// 			cacheDirectory: api.config.resolve('destDir', 'awcache' + (api.isDefaultLocale() ? '' : '/' + api.getBuildLocale())),
// 			useCache: true,
// 			babelOptions,
// 			usePrecompiledFiles: true,

// 			noImplicitAny: false,
// 			suppressImplicitAnyIndexErrors: true,
// 			removeComments: true,
// 			//inlineSourceMap: true,
// 			sourceMap: true,
// 			module: 'es6',
// 			allowJs: true,
// 			skipLibCheck: true,
// 			experimentalDecorators: true,
// 			emitDecoratorMetadata: true,
// 			target: 'es6',
// 			moduleResolution: 'Node',
// 			baseUrl: root,
// 			paths: {
// 				'*': [Path.join(root, 'node_modules/*')]
// 			},
// 			typeRoots: [
// 				Path.join(root, 'node_modules/@types'),
// 				Path.join(root, 'node_modules/@dr-types')
// 			]
// 		},
// 	};
// };
