var rj = require('require-injector');
// var config = require('./config');
var log = require('log4js').getLogger('lib.injectorFactory');
var _ = require('lodash');
var fs = require('fs');
var Path = require('path');
const {doInjectorConfig} = require('../dist/require-injectors');


exports.nodeInjector = createInjector(require.resolve);
exports.webInjector = createInjector(null, true);

function createInjector(resolve, noNode) {
	var injector = rj({
		basedir: process.cwd(),
		resolve,
		// debug: config.devMode,
		enableFactoryParamFile: false,
		noNode
	});
	function ComponentInjector() {}
	ComponentInjector.prototype = injector;
	monkeyPatchRequireInjector(injector, ComponentInjector.prototype);
	let cj = new ComponentInjector();
	cj.isNode = !noNode;
	return cj;
}

var packageNamePathMap = {};

var emptyFactoryMap = {
	factory: emptryChainableFunction,
	substitute: emptryChainableFunction,
	value: emptryChainableFunction,
	alias: emptryChainableFunction
};

function monkeyPatchRequireInjector(superInjector, proto) {
	var superProto = Object.getPrototypeOf(superInjector);

	proto.addPackage = function(name, dir) {
		log.debug('add %s %s', name, dir);
		packageNamePathMap[name] = dir;
	};

	proto.fromComponent = function(name, dir) {
		if (dir) {
			this.addPackage(name, dir);
		}
		if (_.isArray(name)) {
			throw new Error('Sorry, you can\'t use Array value as fromComponent()\'s argument, we have this limitation which is not like require-injector does');
		}
		if (_.has(packageNamePathMap, name)) {
			return superInjector.fromDir(packageNamePathMap[name]);
		} else {
			return superProto.fromPackage.call(superInjector, name);
			//log.warn('Injection for %s is skipped', name);
			//return emptyFactoryMap;
		}
	};

	proto.fromPackage = function(name, dir) {
		if (dir) {
			this.addPackage(name, dir);
		}
		if (!_.isArray(name) && _.has(packageNamePathMap, name)) {
			return superInjector.fromDir(packageNamePathMap[name]);
		} else {
			log.debug('from vendor package', name);
			return superProto.fromPackage.call(superInjector, name);
			//log.warn('Injection for %s is skipped', name);
			//return emptyFactoryMap;
		}
	};

	proto.fromAllComponents = proto.fromAllPackages =
	function() {
		return superInjector.fromDir(_.values(packageNamePathMap));
	};

	/**
	 * @name injector.notFromPackages
	 * @param  {string|array} excludePackages
	 * @return {FactoryMap}
	 */
	proto.notFromPackages = function(excludePackages) {
		excludePackages = [].concat(excludePackages);
		var names = _.difference(_.keys(packageNamePathMap), excludePackages);
		var dirs = names.map(pkName => packageNamePathMap[pkName]);
		log.debug('from ' + dirs);
		return superInjector.fromDir(dirs);
	};

	/**
	 * read and evaluate inject setting file
	 * @param  {string} fileName optional, default is 'module-resolve.server.js'
	 * @return {Promise<void>}
	 */
	proto.readInjectFile = function(fileName) {
		if (!fileName) {
			fileName = 'module-resolve.server.js';
		}
		log.debug('execute internal ' + fileName);
		require('../' + fileName)(this);
		var file = Path.resolve(process.cwd(), fileName);
		if (fs.existsSync(file)) {
			log.debug('execute ' + file);
			require(process.cwd().replace(/\\/g, '/') + '/' + fileName)(this);
		} else {
			log.warn(file + ' doesn\'t exist');
		}
		return doInjectorConfig(this, this.isNode);
	};
}

function emptryChainableFunction() {
	return emptyFactoryMap;
}
