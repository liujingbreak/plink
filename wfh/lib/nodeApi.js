var EventEmitter = require('events');
var chalk = require('chalk');
var Path = require('path');
var config = require('./config');
var packageUitls = require('./packageMgr/packageUtils');
var npmimportCssLoader = require('require-injector/css-loader');
var assetsUrl = require('../dist/assets-url');
var _ = require('lodash');
const log = require('log4js').getLogger('wfh.nodeApi');

module.exports = NodeApi;
module.exports.default = NodeApi; // To be available for ES6/TS import syntax 

var suppressWarn4Urls = config.get('suppressWarning.assetsUrl', []).map(line => new RegExp(line));

function NodeApi(name, packageInstance) {
	this.packageName = name;
	this.packageShortName = packageUitls.parseName(name).name;
	this.packageInstance = packageInstance;
	this.contextPath = this._contextPath();
}

NodeApi.prototype = {
	buildUtils: require('./gulp/buildUtils'),
	packageUtils: require('./packageMgr/packageUtils'),
	compileNodePath: [config().nodePath],
	eventBus: new EventEmitter(),
	config,

	isBrowser() {
		return false;
	},

	isNode() {
		return true;
	},

	addBrowserSideConfig(path, value) {
		this.config.set(path, value);
		this.config().browserSideConfigProp.push(path);
	},

	getProjectDirs() {
		return this.config().projectList;
	},
	/**
	 * @param {string} url
	 * @param {string} sourceFile
	 * @return {string} | {packageName: string, path: string, isTilde: boolean, isPage: boolean}, returns string if it is a relative path, or object if
	 * it is in format of /^(?:assets:\/\/|~|page(?:-([^:]+))?:\/\/)((?:@[^\/]+\/)?[^\/]+)?\/(.*)$/
	 */
	normalizeAssetsUrl(url, sourceFile) {
		var match = /^(?:assets:\/\/|~|page(?:-([^:]+))?:\/\/)((?:@[^/]+\/)?[^/@][^/]*)?(?:\/([^@].*)?)?$/.exec(url);
		if (match) {
			let packageName = match[2];
			var relPath = match[3] || '';
			if (!packageName || packageName === '') {
				var compPackage = this.findPackageByFile(sourceFile);
				packageName = compPackage.longName;
			}
			let injectedPackageName = npmimportCssLoader.getInjectedPackage(packageName, sourceFile, this.browserInjector);
			if (injectedPackageName)
				packageName = injectedPackageName;

			return {
				packageName,
				path: relPath,
				isTilde: url.charAt(0) === '~',
				isPage: match[1] != null || _.startsWith(url, 'page://'),
				locale: match[1]
			};
		} else if (url.length > 1 && url.charAt(0) === '/' && url.charAt(1) !== '/' && url !== '/favicon.ico') {
			let m = /^\/(?:([^/]+)\/)?([^/].*)$/.exec(url);
			if (m && m[1]) {
				var nameMap = this.packageInfo.shortNameMap;
				if (_.has(nameMap, m[1])) {
					let packageName = nameMap[m[1]].longName;
					let injectedPackageName = npmimportCssLoader.getInjectedPackage(packageName, sourceFile, this.browserInjector);
					if (injectedPackageName)
						packageName = injectedPackageName;
					if (log.isDebugEnabled()) {
						let msg = `Replace assets URL "${chalk.yellow(url)}" to "assets://${packageName}/${m[2]}"` +
							`in\n  ${chalk.blue(Path.relative(this.config().rootPath, sourceFile))}`;
						log.debug(msg);
					}
					return {
						packageName,
						path: m[2],
						isTilde: false,
						isPage: false
					};
				}
			}
			if (!suppressWarn4Urls.some(path => path.test(url))) {
				let msg = `Problematic assets URL format "${chalk.yellow(url)}" used in\n` +
					`  ${chalk.blue(Path.relative(this.config().rootPath, sourceFile))}\n`;
				msg += '  Valid path should be a "relative path" or in format as "assets://<package>/<path>", "~<package>/<path>", "page://<package>/<path>"';
				log.warn(msg);
			}
			//throw new Error(msg);
			return url;
		} else {
			return url;
		}
	},
	/**
	 * join contextPath
	 * @param {string} path
	 * @return {[type]} [description]
	 */
	joinContextPath(path) {
		return (this.contextPath + '/' + path).replace(/\/\//g, '/');
	},

	_contextPath: function() {
		var path = config.get('packageContextPathMapping[' + this.packageShortName + ']') ||
			config.get(['packageContextPathMapping', this.packageName]);
		path = path != null ? path : '/' + this.packageShortName;
		if (this.config().nodeRoutePath) {
			path = this.config().nodeRoutePath + '/' + path;
		}
		return path.replace(/\/\/+/g, '/');
	},

	parsePackageName(packageName) {
		return this.packageUtils.parseName(packageName);
	},

	getBuildLocale() {
		return this.argv.locale || this.config.get('locales[0]');
	},

	localeBundleFolder() {
		return this.isDefaultLocale() ? '' : this.getBuildLocale() + '/';
	},

	isDefaultLocale() {
		return this.config.get('locales[0]') === this.getBuildLocale();
	}
};

assetsUrl.patchToApi(NodeApi.prototype);
