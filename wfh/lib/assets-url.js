
exports.publicUrl = publicUrl;

exports.patchToApi = function(apiPrototype) {
	apiPrototype.assetsUrl = function(packageName, path) {
		if (arguments.length === 1) {
			path = arguments[0];
			packageName = this.packageName;
		}
		return publicUrl(this.config().staticAssetsURL, this.config().outputPathMap, null,
			packageName, path);
	};

	apiPrototype.entryPageUrl = function(packageName, path, locale) {
		if (arguments.length === 1) {
			path = arguments[0];
			packageName = this.packageName;
		}
		if (!locale)
			locale = this.isDefaultLocale() ? null : this.getBuildLocale();
		path = path.replace(/([^./\\]+\.)[^?./\\]+(\?.*)?$/, '$1html$2');
		return publicUrl(this.config().staticAssetsURL, this.config().outputPathMap,
			locale, packageName, path);
	};
};
/**
 * Helper for dealing with url like "npm://<package>/<path>", "assets://<package>/<path>"
 * @param {string} staticAssetsURL, like Webpack's output.publicPath
 * @param {object} outputPathMap
 * @param {string} useLocale the final URL will includes locale path (for entry page URL) "zh" or "us",
 * use `null` or "" denotes default locale
 * @param {string} packageName if null, the package name will be extracted from url
 * @param {string} path
 * @return {string}
 */
function publicUrl(staticAssetsURL, outputPathMap, useLocale, packageName, path) {
	var m = /(?:assets:\/\/|~|npm:\/\/|page(?:-([^:]+))?:\/\/)((?:@[^/]+\/)?[^/]+)?\/(.*)/.exec(path);
	if (m) {
		packageName = m[2];
		path = m[3];
	}

	var outputPath = outputPathMap[packageName];
	if (outputPath != null)
		outputPath = /^\/*(.*?)\/*$/.exec(outputPath)[1];// _.trim(outputPath, '/');
	else
		outputPath = /(?:@([^/]+)\/)?(\S+)/.exec(packageName)[2];
	var finalUrl = joinUrl(staticAssetsURL, useLocale, outputPath, path);
	if (finalUrl.charAt(0) !== '/')
		finalUrl = '/' + finalUrl;
	return finalUrl;
}

function joinUrl(url, url2, urlN) {
	var joined = arguments[0];
	for (var i = 1, l = arguments.length; i < l; i++) {
		if (arguments[i] == null || arguments[i].length === 0)
			continue;
		if (joined.length > 0 && joined.charAt(joined.length - 1) !== '/' &&
			arguments[i] && arguments[i].charAt(0) !== '/')
			joined += '/';
		joined += arguments[i];
	}
	return joined;
}
