'use strict';
var Path = require('path');
var fs = require('fs');
// var cycle = require('cycle');
// var mkdirp = require('mkdirp');
var packageBrowserInstance = require('./dist/package-instance').default;
var _ = require('lodash');
var bResolve = require('browser-resolve');
var resolve = require('resolve');
//var chalk = require('chalk');
var log = require('log4js').getLogger('buildUtil.' + Path.basename(__filename, '.js'));
const DirTree = require('require-injector/lib/dir-tree').DirTree;

module.exports = walkPackages;
module.exports.saveCache = saveCache;
module.exports.listBundleInfo = listBundleInfo;

// var packageInfoCacheFile, isFromCache;
/**
 * walkPackages
 * @param {*} config 
 * @param {*} argv 
 * @param {*} packageUtils 
 * @param {*} ignoreCache
 * @return {PackageInfo}
 */
function walkPackages(config, argv, packageUtils, ignoreCache) {
	//packageInfoCacheFile = config.resolve('destDir', 'packageInfo.json');
	var packageInfo;
	// if (!ignoreCache && fs.existsSync(packageInfoCacheFile)) {
	// 	isFromCache = true;
	// 	log.info('Reading build info cache from ' + packageInfoCacheFile);
	// 	packageInfo = JSON.parse(fs.readFileSync(packageInfoCacheFile, {encoding: 'utf8'}));
	// 	packageInfo = cycle.retrocycle(packageInfo);
	// } else {
	// 	isFromCache = false;
	log.info('scan for packages info');
	packageInfo = _walkPackages(packageUtils, config);
	// }
	createPackageDirTree(packageInfo);
	return packageInfo;
}

function listBundleInfo(_config, _argv, _packageUtils) {
	_config.set('bundlePerPackage', false);
	var packageInfo = walkPackages(_config, _argv, _packageUtils, false);
	saveCache(packageInfo, _config);
	return packageInfo;
}


function saveCache(packageInfo, config) {
	// if (isFromCache)
	// 	return;
	// mkdirp.sync(Path.join(config().rootPath, config().destDir));
	// fs.writeFileSync(packageInfoCacheFile, JSON.stringify(cycle.decycle(packageInfo)));
	// log.debug('write to cache ', packageInfoCacheFile);
}

function _walkPackages(packageUtils, config) {
	var nodePaths = [config().nodePath];
	var configBundleInfo = readBundleMapConfig(packageUtils, config);
	var info = {
		allModules: null, // array
		moduleMap: _.clone(configBundleInfo.moduleMap),
		shortNameMap: _.clone(configBundleInfo.shortNameMap),
		noBundlePackageMap: {},
		bundleMap: configBundleInfo.bundleMap,
		bundleUrlMap: configBundleInfo.bundleUrlMap,
		urlPackageSet: configBundleInfo.urlPackageSet,
		entryPageMap: {}
	};
	var bundleMap = info.bundleMap;

	packageUtils.findBrowserPackageByType('*', function(
		name, entryPath, parsedName, pkJson, packagePath) {
		addPackageToInfo(packageUtils, info, nodePaths, name, parsedName, pkJson, packagePath);
	});
	addPackageToInfo(packageUtils, info, nodePaths, 'dr-comp-package',
		require.resolve('dr-comp-package'), packageUtils.parseName('dr-comp-package'),
		require('dr-comp-package/package.json'), packageUtils.findBrowserPackagePath('dr-comp-package'));
	_.each(bundleMap, (packageMap, bundle) => {
		bundleMap[bundle] = _.values(packageMap); // turn Object.<moduleName, packageInstance> to Array.<packageInstance>
	});
	info.allModules = _.values(info.moduleMap);

	return info;
}

function addPackageToInfo(packageUtils, info, nodePaths, name, parsedName, pkJson, packagePath) {
	var entryViews, entryPages;
	var isEntryServerTemplate = true;
	var noParseFiles, instance;
	if (_.has(info.moduleMap, name))
		instance = info.moduleMap[name];
	else {
		// There are also node packages
		instance = new packageBrowserInstance({
			isVendor: true,
			bundle: null,
			longName: name,
			shortName: packageUtils.parseName(name).name,
			packagePath,
			realPackagePath: fs.realpathSync(packagePath),
		});
	}
	if (!pkJson.dr) {
		pkJson.dr = {};
	}
	if (pkJson.dr.entryPage) {
		isEntryServerTemplate = false;
		entryPages = [].concat(pkJson.dr.entryPage);
		info.entryPageMap[name] = instance;
	} else if (pkJson.dr.entryView) {
		isEntryServerTemplate = true;
		entryViews = [].concat(pkJson.dr.entryView);
		info.entryPageMap[name] = instance;
	}
	if (pkJson.dr.noParse) {
		noParseFiles = [].concat(pkJson.dr.noParse).map(trimNoParseSetting);
	}
	if (pkJson.dr.browserifyNoParse) {
		noParseFiles = [].concat(pkJson.dr.browserifyNoParse).map(trimNoParseSetting);
	}
	var mainFile;
	try {
		// For package like e2etest, it could have no main file
		mainFile = bResolve.sync(name, {paths: nodePaths});
	} catch (err) {}
	instance.init({
		isVendor: false,
		file: mainFile ? fs.realpathSync(mainFile) : null, // package.json "browser"
		main: pkJson.main, // package.json "main"
		style: pkJson.style ? resolveStyle(name, nodePaths) : null,
		parsedName,
		entryPages,
		entryViews,
		browserifyNoParse: noParseFiles,
		isEntryServerTemplate,
		translatable: !_.has(pkJson, 'dr.translatable') || _.get(pkJson, 'dr.translatable'),
		dr: pkJson.dr,
		json: pkJson,
		compiler: pkJson.dr.compiler,
		browser: pkJson.browser,
		i18n: pkJson.dr.i18n ? pkJson.dr.i18n : null,
		appType: pkJson.dr.appType
	});
	if (instance.file == null && (instance.entryPages || instance.entryViews))
		throw new Error(`Entry package "${instance.longName}"'s "browser" or "main" file ${mainFile} doesn't exist!`);
	info.moduleMap[instance.longName] = instance;
	info.shortNameMap[instance.shortName] = instance;
	if (!instance.bundle)
		info.noBundlePackageMap[instance.longName] = instance;
}

function trimNoParseSetting(p) {
	p = p.replace(/\\/g, '/');
	if (p.startsWith('./')) {
		p = p.substring(2);
	}
	return p;
}

function resolveStyle(name, nodePaths) {
	var entry;
	try {
		return fs.realpathSync(resolve.sync(name, {
			paths: nodePaths,
			packageFilter: (pkg, pkgfile) => {
				entry = pkg.main = pkg.style;
				return pkg;
			}
		}));
	} catch (err) {
		log.warn('Can not resolve style file "%s" of package %s', entry, name);
		return null;
	}
}

function readBundleMapConfig(packageUtils, config) {
	var info = {
		moduleMap: {},
		/** @type {Object.<bundleName, Object.<moduleName, packageInstance>>} */
		bundleMap: {},
		shortNameMap: {},
		/** @type {Object.<bundleName, URL[]>} */
		bundleUrlMap: {},
		urlPackageSet: null
	};
	_readBundles(packageUtils, info, config, true);
	_readPackageChunkMap(packageUtils, config, info);
	return info;
}

function _readPackageChunkMap(packageUtils, config, info) {
	var bmap = info.bundleMap;
	var mmap = info.moduleMap;
	_.each(config()._package2Chunk, (bundle, moduleName) => {
		try {
			var packagePath = packageUtils.findBrowserPackagePath(moduleName);
			if (!packagePath)
				return;
			var parsedName = packageUtils.parseName(moduleName);
			var instance = new packageBrowserInstance({
				isVendor: true,
				bundle,
				longName: moduleName,
				parsedName,
				shortName: parsedName.name,
				packagePath,
				realPackagePath: fs.realpathSync(packagePath)
			});
			mmap[moduleName] = instance;
			info.shortNameMap[parsedName.name] = instance;
			info.urlPackageSet[moduleName] = 1;
			if (_.has(bmap, bundle) && _.isArray(bmap[bundle]))
				bmap[bundle].push(instance);
			else
				bmap[bundle] = [instance];
		} catch (err) {
			log.warn(err);
			throw err;
		}
	});
}

function _readBundles(packageUtils, info, config, isExternal) {
	var bmap = info.bundleMap;
	var mmap = info.moduleMap;
	var mapConfig = config().externalBundleMap;
	if (isExternal)
		info.urlPackageSet = {};
	_.forOwn(mapConfig, function(bundleData, bundle) {
		var moduleNames = _.isArray(bundleData.modules) ? bundleData.modules : bundleData;
		var bundleModules = _.map(moduleNames, function(moduleName) {
			try {
				var packagePath = packageUtils.findBrowserPackagePath(moduleName);
				var instance = new packageBrowserInstance({
					isVendor: true,
					bundle,
					longName: moduleName,
					shortName: packageUtils.parseName(moduleName).name,
					packagePath,
					realPackagePath: fs.realpathSync(packagePath)
				});
				mmap[moduleName] = instance;
				info.shortNameMap[instance.shortName] = instance;
				info.urlPackageSet[moduleName] = 1;
				return instance;
			} catch (err) {
				log.warn(err);
				throw err;
			}
		});
		if (isExternal) {
			if (_.isArray(bundleData))
				info.bundleUrlMap[bundle] = bundleData;
			else if (_.has(bundleData, 'URLs'))
				info.bundleUrlMap[bundle] = bundleData.URLs;
			else if (_.isObject(bundleData)) {
				info.bundleUrlMap[bundle] = bundleData; // bundleData.css, bundleData.js
				if (!_.has(bundleData, 'js') && !_.has(bundleData, 'css'))
					throw new Error('config property "externalBundleMap" must be array of object {css: string[], js: string[]}');
			} else {
				info.bundleUrlMap[bundle] = [bundleData];
			}
		} else
			bmap[bundle] = bundleModules;
	});
}

function createPackageDirTree(packageInfo) {
	var tree = new DirTree();
	var count = 0;
	packageInfo.allModules.forEach(moduleInstance => {
		// log.info(moduleInstance.longName);
		if (moduleInstance == null)
			return;
		if (moduleInstance.realPackagePath)
			tree.putData(moduleInstance.realPackagePath, moduleInstance);
		if (moduleInstance.packagePath !== moduleInstance.realPackagePath)
			tree.putData(moduleInstance.packagePath, moduleInstance);
		count++;
	});
	log.info('Total %s node packages', count);
	packageInfo.dirTree = tree;
}
