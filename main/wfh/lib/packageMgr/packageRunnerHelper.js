const packageUtils = require('../../dist/package-utils');
var config = require('../config');
var Package = require('../../dist/packageNodeInstance').default;
var NodeApi = require('../../dist/package-mgr/node-package-api');
var priorityHelper = require('../../dist/package-priority-helper');
var LRU = require('lru-cache');
var _ = require('lodash');
var log = require('log4js').getLogger('wfh.packageMgr.packageRunnerHelper');
var {webInjector, nodeInjector} = require('../../dist/injector-factory');
const {mapPackagesByType} = require('../../dist/package-runner');
var Promise = require('bluebird');
var http = require('http');
var fs = require('fs');

exports.sendlivereload = sendlivereload;
exports.runBuilderComponents = runBuilderComponents;
exports.runBuilderComponentsWith = runBuilderComponentsWith;
exports.runServerComponent = runServerComponent;
exports.runBuilderComponent = runBuilderComponent;
exports.traversePackages = traversePackages;
exports.getApiForPackage = getApiForPackage;

var apiCache = {};
NodeApi.prototype.apiForPackage = function(name) {
	return apiCache[name] || getApiForPackage(name);
};
var initialized = false;

function runBuilderComponents(builderComponents, argv, skips) {
	return runBuilderComponentsWith('compile', builderComponents, argv, skips);
}

function runBuilderComponentsWith(funcName, builderComponents, argv, skips, skipOnFail) {
	if (funcName === undefined)
		funcName = 'compile';
	var proto = NodeApi.prototype;
	proto.argv = argv;
	var {walkPackages, saveCache} = require('../../dist/build-util/ts');
	var packageInfo = walkPackages(config, packageUtils);
	return initWebInjector(packageInfo, proto)
	.then(() => {
		proto.packageInfo = packageInfo;
		var cache = new LRU({max: 20, maxAge: 20000});
		proto.findPackageByFile = function(file) {
			var found = cache.get(file);
			if (!found) {
				found = packageInfo.dirTree.getAllData(file).pop();
				if (found)
					cache.set(file, found);
			}
			return found;
		};
		proto.getNodeApiForPackage = function(packageInstance) {
			return getApiForPackage(packageInstance);
		};
		return priorityHelper.orderPackages(builderComponents, pkInstance => {
			if (_.includes(skips, pkInstance.longName)) {
				log.info('skip builder: %s', pkInstance.longName);
				return;
			}
			var res;
			try {
				res = runBuilderComponent(pkInstance, funcName);
			} catch (ex) {
				if (skipOnFail) {
					log.warn(`Skip error on ${pkInstance.longName} ${funcName}()`, ex);
					return;
				} else
					throw ex;
			}
			if (skipOnFail)
				return res.catch(err => {
					log.warn(`Skip error on ${pkInstance.longName} ${funcName}()`, err);
				});
			return res;
		}, 'json.dr.builderPriority');
	})
	.then(() => saveCache(packageInfo, config));
}

function sendlivereload(buildRes, argv) {
	if (config.get('devMode') === true && config.get('livereload.enabled', true)) {
		var changedFile = argv['only-css'] ? 'yyy.css' : 'xxx.js';
		return new Promise((resolve, reject) => {
			var req = http.request({
				method: 'GET',
				hostname: 'localhost',
				port: config.get('livereload.port'),
				path: '/changed?files=' + changedFile
			}, response => {
				response.on('data', (chunk) => {
					log.info(chunk.toString('utf8'));
				});
				response.resume();
				response.on('end', () => resolve(buildRes));
			})
			.on('error', err => resolve(buildRes)); // Never mind, server is not on.
			req.end();
		});
	}
	return Promise.resolve(null);
}

function runBuilderComponent(pkInstance, funcName) {
	var res;
	if (funcName === undefined)
		funcName = 'compile';
	var api = getApiForPackage(pkInstance);
	var packageExports = require(pkInstance.longName);
	if (_.isFunction(packageExports[funcName])) {
		log.info(`${funcName}: ` + pkInstance.longName);
		res = packageExports[funcName](api);
	} else if (_.isFunction(packageExports) && funcName === 'compile') {
		log.info(`${funcName}: ` + pkInstance.longName);
		res = packageExports(packageUtils, config, api.argv);
	}
	if (res && _.isFunction(res.pipe)) {
		// is stream
		return new Promise((resolve, reject) => {
			res.on('end', function() {
				log.debug('builder' + pkInstance.longName + ' done');
				resolve();
			}).on('error', function(er) {
				log.debug(er);
				reject(er);
			});
		});
	} else {
		return Promise.resolve(res);
	}
}

function runServerComponent(pkInstance) {
	var packageExports = require(pkInstance.longName);
	if (packageExports && _.isFunction(packageExports.activate)) {
		log.info('Activate server component: ' + pkInstance.longName);
		var api = getApiForPackage(pkInstance);
		return packageExports.activate(api, Object.getPrototypeOf(api));
	}
	return Promise.resolve();
}

/**
 * Initialize browser side package injector
 */
function initWebInjector(packageInfo, apiPrototype) {
	if (initialized)
		return;
	initialized = true;
	_.each(packageInfo.allModules, pack => {
		if (pack.dr) {
			// no vendor package's path information
			webInjector.addPackage(pack.longName, pack.packagePath);
		}
	});
	webInjector.fromAllPackages()
	.replaceCode('__api', '__api')
	.substitute(/^([^{]*)\{locale\}(.*)$/,
		(filePath, match) => match[1] + apiPrototype.getBuildLocale() + match[2]);

	let done = webInjector.readInjectFile('module-resolve.browser');
	apiPrototype.browserInjector = webInjector;
	return done;
}

/**
 * @param {*} needInject
 * @return a hash object, key is {string} type, value is packageInstance[]
 */
function traversePackages(needInject) {
	var packagesTypeMap = mapPackagesByType(['builder', 'server'], needInject ?
		(pkInstance) => {
			setupNodeInjectorFor(pkInstance);
		} : null);
	let done;
	if (needInject)
		done = nodeInjector.readInjectFile();
	else
		done = Promise.resolve();
	return done.then(() => packagesTypeMap);
}

function setupNodeInjectorFor(pkInstance) {
	log.debug('setupNodeInjectorFor %s resolved to: %s', pkInstance.name, pkInstance.path, pkInstance.realPath);
	let api = getApiForPackage(pkInstance);
	nodeInjector.fromComponent(pkInstance.name, pkInstance.realPath)
	.value('__injector', nodeInjector)
	.value('__api', api);
	nodeInjector.fromComponent(pkInstance.name, pkInstance.path)
	.value('__injector', nodeInjector)
	.value('__api', api);
	nodeInjector.default = nodeInjector; // For ES6 import syntax
}

function getApiForPackage(pkInstance) {
	if (_.has(apiCache, pkInstance.longName)) {
		return apiCache[pkInstance.longName];
	}

	var api = new NodeApi(pkInstance.longName, pkInstance);
	// api.constructor = NodeApi;
	pkInstance.api = api;
	apiCache[pkInstance.longName] = api;
	api.default = api; // For ES6 import syntax
	return api;
}

