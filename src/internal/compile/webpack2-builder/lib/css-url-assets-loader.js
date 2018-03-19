const api = require('__api');
const log = require('log4js').getLogger('wfh.' + __filename.substring(0, __filename.length - 3));
// const Path = require('path');
//const _ = require('lodash');

module.exports = function(content, map) {
	var callback = this.async();
	if (!callback)
		return load(content, this);
	loadAsync(content, this)
	.then(result => callback(null, result, map))
	.catch(e => {
		this.emitError(e);
		log.error(e);
		callback(e);
	});
};
module.exports.replaceAssetsUrl = replaceAssetsUrl;

function load(content, loader) {
	var file = loader.resourcePath;
	return replaceUrl.call(loader, content, file);
}

function loadAsync(content, loader) {
	try {
		return Promise.resolve(load(content, loader));
	} catch (e) {
		return Promise.reject(e);
	}
}

function replaceUrl(css, file) {
	return css.replace(/(\W)url\(\s*['"]?\s*([^'"\)]*)['"]?\s*\)/g,
		function(match, preChar, url) {
			var resolvedTo = preChar + 'url(' + replaceAssetsUrl(file, url) + ')';
			log.debug('url: %s  -> %s', url, resolvedTo);
			return resolvedTo;
		});
}

function replaceAssetsUrl(file, url) {
	var res = api.normalizeAssetsUrl(url, file);
	if (typeof res === 'string')
		return res;
	else if (res.isTilde)
		return `~${res.packageName}/${res.path}`;
	else
		return api.assetsUrl(res.packageName, res.path);
}

// function resolveUrl(packageName, path) {
// 	var assetsDirMap = api.config.get('outputPathMap.' + packageName);
// 	if (assetsDirMap != null)
// 		assetsDirMap = _.trim(api.config.get('outputPathMap.' + packageName), '/');
// 	else
// 		assetsDirMap = /(?:@([^\/]+)\/)?(\S+)/.exec(packageName)[2];
// 	if (_.startsWith(path, '/')) {
// 		path = path.substring(1);
// 	}
// 	assetsDirMap = _.trimStart(assetsDirMap, '/');
// 	return publicPath + _.trimStart((assetsDirMap + '/' + path).replace('//', '/'), '/');
// }
