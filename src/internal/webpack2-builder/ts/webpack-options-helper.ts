import api from '__api';
import * as Path from 'path';
// import * as log4js from 'log4js';
// const log = log4js.getLogger(api.packageName);

var devMode: boolean = api.config().devMode;

const cssAutoPrefixSetting = {
	browsers: [
		'ie >= 8',
		'ff >= 30',
		'chrome >= 34',
		'safari >= 7',
		'ios >= 7',
		'android >= 4.0'
	]
};

const styleLoaders = {
	css: getStyleLoaders('css'),
	less: getStyleLoaders('less'),
	scss: getStyleLoaders('scss')
};
export {cssAutoPrefixSetting, styleLoaders};

function getStyleLoaders(type: string): any[] {
	var loaders: any[] = [
		{loader: 'css-loader', options: {
			minimize: !devMode,
			sourceMap: api.config().enableSourceMaps
		}},
		{
			loader: 'autoprefixer-loader',
			options: cssAutoPrefixSetting
		},
		{loader: 'lib/css-scope-loader'},
		{loader: 'lib/css-url-assets-loader'}
	];

	switch (type) {
		case 'less':
			loaders.push({loader: 'less-loader', options: {
				sourceMap: api.config().enableSourceMaps
			}});
			break;
		case 'scss':
			loaders.push({loader: 'sass-loader', options: {
				sourceMap: api.config().enableSourceMaps
			}});
			break;
		default:
			break;
	}

	loaders.push({loader: 'require-injector/css-loader', options: {
		injector: api.browserInjector
	}});
	return loaders;
}

export function isIssuerAngular(file: string): boolean {
	var component = api.findPackageByFile(file);
	if (!(component && component.dr && component.dr.angularCompiler))
		return false;
	var relPath = Path.relative(component.realPackagePath, file);
	return !/^[^/\\]+\.(?:ts|js)x?$/.test(relPath);
}

export function isIssuerNotAngular(file: string): boolean {
	var component = api.findPackageByFile(file);
	if ((component && component.dr && component.dr.angularCompiler)) {
		var relPath = Path.relative(component.realPackagePath, file);
		return /^[^/\\]+\.(?:ts|js)x?$/.test(relPath);
	} else
		return true;
}
