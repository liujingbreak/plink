var has = Object.prototype.hasOwnProperty;
import * as assetsUrl from 'dr-comp-package/wfh/share/assets-url';
import {ngRouterPath} from '../../dist/api-share';

import * as lodash from 'lodash';

declare const LEGO_CONFIG: any & {buildLocale: string};
let _: any = null;
declare const __drcpEntryPage: string;
declare const __drcpEntryPackage: string;

const packageNameReg = /(?:@([^/]+)\/)?(\S+)/;

export default class BrowserApi {
	static packageApiMap: {[k: string]: BrowserApi} = {};
	static setup(obj: any) {
		BrowserApi.prototype.extend(obj);
	}
	static getCachedApi(name: string): BrowserApi {
		return has.call(BrowserApi.packageApiMap, name) ? BrowserApi.packageApiMap[name] : null;
	}
	default = this;
	packageShortName: string;
	i18nLoaded: false;
	_config = LEGO_CONFIG;
	buildLocale = LEGO_CONFIG.buildLocale;

	entryPage = __drcpEntryPage;
	entryPackage = __drcpEntryPackage;

	_ensureLodash = ensureLodash;
	contextPath: string;

	// patchToApi = assetsUrl.patchToApi;
	entryPageUrl = assetsUrl.entryPageUrl;
	assetsUrl = assetsUrl.assetsUrl;
	ngBaseRouterPath = __api.ngBaseRouterPath;
	ngRouterPath = ngRouterPath;
	// publicUrl = assetsUrl.publicUrl;
	// serverUrl = assetsUrl.serverUrl;

	constructor(public packageName: string, packageConfig?: any) {
		var m = packageNameReg.exec(packageName);
		this.packageShortName = m[2];
		var _config = BrowserApi.prototype._config;
		for (var propName in packageConfig) {
			if (has.call(packageConfig, propName))
				_config[propName] = packageConfig[propName];
		}

		var configSetting = this.config();
		var path = configSetting.packageContextPathMapping ?
			configSetting.packageContextPathMapping[this.packageShortName] : null;
		path = path != null ? path : '/' + this.packageShortName;
		this.contextPath = configSetting.serverURL + path;
		BrowserApi.packageApiMap[packageName] = this;
	}

	config() {
		return this._config;
	}

	isDebug() {
		return this.config().devMode;
	}

	isBrowser() {
		return true;
	}

	isNode() {
		return false;
	}

	extend(obj: any) {
		var proto = BrowserApi.prototype;
		for (var f in obj) {
			if (has.call(obj, f))
				proto[f] = obj[f];
		}
	}

	urlSearchParam(searchString: string) {
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
	}

	_joinUrl(...url: string[]) {
		var joined = url[0];
		for (var i = 1, l = url.length; i < l; i++) {
			if (url[i] == null || url[i].length === 0)
				continue;
			if (joined.length > 0 && joined.charAt(joined.length - 1) !== '/' &&
				url[i] && url[i].charAt(0) !== '/')
				joined += '/';
			joined += url[i];
		}
		return joined;
	}

	set(path: string, value: any) {
		ensureLodash();
		_.set(this._config, path, value);
		return this._config;
	}

	get(propPath: string, defaultValue?: any) {
		ensureLodash();
		return _.get(this._config, propPath, defaultValue);
	}
}

function ensureLodash() {
	if (!_) {
		_ = {
			set: require('lodash/set') as typeof lodash.set,
			get: require('lodash/get') as typeof lodash.get,
			some: require('lodash/some') as typeof lodash.some,
			includes: require('lodash/includes') as typeof lodash.includes,
			trim: require('lodash/trim') as typeof lodash.trim,
			startsWith: require('lodash/startsWith') as typeof lodash.startsWith
		};
	}
	return _;
}

// ---- css scope -----------------

var classAddedSet: {[k: string]: boolean};
var htmlDom: Element;

export function writeCssClassToHtml(classnames: string[]) {
	if (!classAddedSet)
		classAddedSet = getHtmlClassSet();
	for (var clnIdx = 0, len = classnames.length; clnIdx < len; clnIdx++) {
		var cls = classnames[clnIdx];
		if (!has.call(classAddedSet, cls)) {
			htmlDom.className += ' ' + cls;
			classAddedSet[cls] = true;
		}
	}
}

function getHtmlClassSet(): {[k: string]: boolean} {
	var classSet: {[k: string]: boolean} = {};
	htmlDom = document.getElementsByTagName('html')[0];
	var classes = htmlDom.className.split(' ');
	for (var clnIdx = 0, len = classes.length; clnIdx < len; clnIdx++) {
		if (classes[clnIdx].length > 0)
			classSet[classes[clnIdx]] = true;
	}
	return classSet;
}
