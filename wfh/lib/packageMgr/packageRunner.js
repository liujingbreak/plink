var _ = require('lodash');
var log = require('log4js').getLogger('packageRunner');
var config = require('../config');
var NodeApi = require('../../dist/package-mgr/node-package-api');
var Promise = require('bluebird');
var util = require('util');
var helper = require('./packageRunnerHelper');
var priorityHelper = require('./packagePriorityHelper');
const {ServerRunner} = require('../../dist/package-runner');

var packageCache = {};
var corePackages = {};
var deactivateOrder;
var eventBus;

eventBus = NodeApi.prototype.eventBus;
module.exports = {
	runServer,
	runBuilder,
	eventBus,
	requireServerPackages,
	activateNormalComponents,
	activateCoreComponents,
	packages: packageCache,
	corePackages,
	listServerComponents,
	listBuilderComponents
};

function runServer(argv) {
	var packagesTypeMap;
	NodeApi.prototype.argv = argv;
	NodeApi.prototype.runBuilder = function(buildArgv, skipNames) {
		_.assign(buildArgv, argv);
		if (!Array.isArray(skipNames))
			skipNames = [skipNames];
		// var builders = _.filter(packagesTypeMap.builder, packageIns => !_.includes(excludeNames, packageIns.longName) );

		return helper.runBuilderComponents(packagesTypeMap.builder, buildArgv, skipNames);
	};
	return Promise.coroutine(function*() {
		packagesTypeMap = yield requireServerPackages();
		deactivateOrder = [];
		yield activateCoreComponents()
		yield activateNormalComponents();
		var newRunner = new ServerRunner();
		deactivateOrder.reverse();
		newRunner.deactivatePackages = deactivateOrder;
		yield new Promise(resolve => setTimeout(resolve, 500));
		return () => {
			newRunner.shutdownServer();
		}
	})();
}

function runBuilder(argv, funcName, skipOnFail) {
	if (NodeApi.prototype.argv == null) {
		NodeApi.prototype.argv = argv;
	}
	return helper.traversePackages(true)
	.then(packagesTypeMap => {
		return helper.runBuilderComponentsWith(funcName, packagesTypeMap.builder, argv, [], skipOnFail)
	}).then(buildRes => {
		helper.sendlivereload(buildRes, argv);
		eventBus.emit('build-done');
	});
}

function requireServerPackages(dontLoad) {
	return helper.traversePackages(!dontLoad)
	.then(packagesTypeMap => {
		// var proto = NodeApi.prototype;
		// proto.argv = argv;

		// create API instance and inject factories

		_.each(packagesTypeMap.server, (p, idx) => {
			if (!checkPackageName(p.scope, p.shortName, false)) {
				return;
			}
			if (_.includes([].concat(_.get(p, 'json.dr.type')), 'core')) {
				corePackages[p.shortName] = p;
			} else {
				packageCache[p.shortName] = p;
			}
			if (!dontLoad)
				p.exports = require(p.moduleName);
		});
		eventBus.emit('loadEnd', packageCache);
		return packagesTypeMap;
	});
}

function activateCoreComponents() {
	return _activePackages(corePackages, 'coreActivated');
}

function activateNormalComponents() {
	return _activePackages(packageCache, 'packagesActivated');
}

function _activePackages(packages, eventName) {
	return priorityHelper.orderPackages(_.values(packages), pkInstance => {
		deactivateOrder.push(pkInstance);
		return helper.runServerComponent(pkInstance);
	}, 'json.dr.serverPriority')
	.then(function() {
		NodeApi.prototype.eventBus.emit(eventName, packages);
	});
}

/**
 * Console list package in order of running priority
 * @return Array<Object<{pk: {package}, desc: {string}}>>
 */
function listServerComponents() {
	return Promise.coroutine(function*() {
		yield requireServerPackages(true);
		var idx = 0;

		var coreList = _.values(corePackages);
		var normalList = _.values(packageCache);
		var packages = [];
		packages.push(...coreList, ...normalList);
		var maxNameLe = _.maxBy(packages, pk => pk.longName.length).longName.length;

		var list = [];
		yield priorityHelper.orderPackages(coreList, pk => {
			idx++;
			var gapLen = maxNameLe - pk.longName.length;
			var gap = new Array(gapLen);
			_.fill(gap, ' ');
			list.push({
				pk,
				desc: util.format('%d. %s %s[core] priority: %s',
					idx, pk.longName, gap.join(''), _.get(pk, 'json.dr.serverPriority')),
			});
		}, 'json.dr.serverPriority');
		yield priorityHelper.orderPackages(normalList, pk => {
			idx++;
			var gapLen = maxNameLe - pk.longName.length;
			var gap = new Array(gapLen);
			_.fill(gap, ' ');
			list.push({
				pk,
				desc: util.format('%d. %s %s       priority: %s',
					idx, pk.longName, gap.join(''), _.get(pk, 'json.dr.serverPriority')),
			});
		}, 'json.dr.serverPriority');
		return list;
	})();
}

function listBuilderComponents() {
	var util = require('util');
	return Promise.coroutine(function*() {
		var {builder: packages} = yield helper.traversePackages(false);
		var idx = 0;
		var maxNameLe = _.maxBy(packages, pk => pk.longName.length).longName.length;
		var list = [];

		yield priorityHelper.orderPackages(packages, pk => {
			idx++;
			var gapLen = maxNameLe - pk.longName.length;
			var gap = new Array(gapLen);
			_.fill(gap, ' ');
			list.push({
				pk,
				desc: util.format('%d. %s %s priority: %s', idx, pk.longName, gap.join(''), _.get(pk, 'json.dr.builderPriority')),
			});
		}, 'json.dr.builderPriority');
		return list;
	})();
}

function checkPackageName(scope, shortName, unknownScopeWarn) {
	if (!_.includes(config().packageScopes, scope)) {
		if (unknownScopeWarn) {
			log.warn('Skip node module of unknown scope: ' + shortName);
		}
		return false;
	}
	//log.debug('', new Error())
	if (_.has(packageCache, shortName) ||
		_.has(corePackages, shortName)) {
		log.debug(shortName + ' has already been loaded');
		return false;
	}
	return true;
}
