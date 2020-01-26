/* globals LEGO_CONFIG:true, __drcpEntryPackage */
/* no import-lodash-loader */
var has = Object.prototype.hasOwnProperty;
var _ = null;
var assetsUrl = require('dr-comp-package/wfh/share/assets-url');

module.exports = BrowserApi;
module.exports.default = BrowserApi;

var packageNameReg = /(?:@([^/]+)\/)?(\S+)/;

function BrowserApi(packageName, packageConfig) {
	if (!(this instanceof BrowserApi)) {
		return new BrowserApi(packageName);
	}
	this.packageName = packageName;
	var m = packageNameReg.exec(packageName);
	this.packageShortName = m[2];
	var _config = BrowserApi.prototype._config;
	for (var propName in packageConfig) {
		if (has.call(packageConfig, propName))
			_config[propName] = packageConfig[propName];
	}

	var configSetting = this.config();
	var path = configSetting.packageContextPathMapping ? configSetting.packageContextPathMapping[this.packageShortName] : null;
	path = path != null ? path : '/' + this.packageShortName;
	this.contextPath = configSetting.serverURL + path;
	BrowserApi.packageApiMap[packageName] = this;
}

BrowserApi.setup = function(obj) {
	BrowserApi.prototype.extend(obj);
};

BrowserApi.packageApiMap = {}; // Cache browser side API instance by package name
BrowserApi.getCachedApi = function(name) {
	return has.call(BrowserApi.packageApiMap, name) ? BrowserApi.packageApiMap[name] : null;
};

BrowserApi.prototype = {
	i18nLoaded: false,
	_config: LEGO_CONFIG,
	buildLocale: LEGO_CONFIG.buildLocale,

	entryPage: __drcpEntryPage,
	entryPackage: __drcpEntryPackage,

	_ensureLodash: ensureLodash,

	config() {
		return BrowserApi.prototype._config;
	},

	isDebug() {
		return this.config().devMode;
	},

	isBrowser() {
		return true;
	},

	isNode() {
		return false;
	},

	extend(obj) {
		var proto = BrowserApi.prototype;
		for (var f in obj) {
			if (has.call(obj, f))
				proto[f] = obj[f];
		}
	},

	urlSearchParam(searchString) {
		var searchMap = {};
		var search = searchString ? searchString : window.location.search;
		if (search && search.length > 0) {
			if (search.charAt(0) === '?')
				search = search.substring(1);
			var pairs = search.split('&');
			for (var i = 0, l = pairs.length; i < l; i++) {
				var pair = pairs[i].split('=');
				searchMap[pair[0]] = pair[1];
			}
		}
		return searchMap;
	},

	_joinUrl(url, url2, urlN) {
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
};

var apiProt = BrowserApi.prototype;

apiProt.config.set = function(path, value) {
	ensureLodash();
	_.set(apiProt._config, path, value);
	return apiProt._config;
};

apiProt.config.get = function(propPath, defaultValue) {
	ensureLodash();
	return _.get(apiProt._config, propPath, defaultValue);
};

var outputPathMap = apiProt._config.outputPathMap;

for (var i = 0, l = apiProt._config._outputAsNames.length; i < l; i++) {
	var packageName = apiProt._config._outputAsNames[i];
	outputPathMap[packageName] = /(?:@([^/]+)\/)?(\S+)/.exec(packageName)[2];
}
// _.each(apiProt._config._outputAsNames, function(packageName) {
// 	outputPathMap[packageName] = /(?:@([^/]+)\/)?(\S+)/.exec(packageName)[2];
// });
delete apiProt._config._outputAsNames;

var apiI18n = require('./api-i18n');
for (var f in apiI18n) {
	if (has.call(apiI18n, f))
		apiProt[f] = apiI18n[f];
}
//_.assign(apiProt, require('./api-i18n'));


assetsUrl.patchToApi(apiProt);

function ensureLodash() {
	if (!_) {
		_ = {
			set: require('lodash/set'),
			get: require('lodash/get'),
			some: require('lodash/some'),
			includes: require('lodash/includes'),
			trim: require('lodash/trim'),
			startsWith: require('lodash/startsWith')
		};
	}
	return _;
}

// ---- css scope -----------------

var classAddedSet;
var htmlDom;

module.exports.writeCssClassToHtml = function(classnames) {
	if (!classAddedSet)
		classAddedSet = getHtmlClassSet();
	for (var clnIdx = 0, len = classnames.length; clnIdx < len; clnIdx++) {
		var cls = classnames[clnIdx];
		if (!has.call(classAddedSet, cls)) {
			htmlDom.className += ' ' + cls;
			classAddedSet[cls] = true;
		}
	}
};

function getHtmlClassSet() {
	var classSet = {};
	htmlDom = document.getElementsByTagName('html')[0];
	var classes = htmlDom.className.split(' ');
	for (var clnIdx = 0, len = classes.length; clnIdx < len; clnIdx++) {
		if (classes[clnIdx].length > 0)
			classSet[classes[clnIdx]] = true;
	}
	return classSet;
}
