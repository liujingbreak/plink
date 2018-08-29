var Path = require('path');
var Jasmine = require('jasmine');
var fs = require('fs');
//var _ = require('lodash');
var packageUtils = require('../packageMgr/packageUtils');
var log = require('log4js').getLogger('test.' + Path.basename(__filename, '.js'));
var chalk = require('chalk');
var config = require('../config');
var Package = require('../packageMgr/packageNodeInstance');
var NodeApi = require('../nodeApi');
var {nodeInjector} = require('../injectorFactory');
const {LazyPackageFactory} = require('@dr-core/build-util/dist/package-instance');
// var LRU = require('lru-cache');

require('../logConfig')(config());

exports.runUnitTest = runUnitTest;
exports.runE2eTest = runE2eTest;

var simpleReporter = {
	jasmineStarted(suiteInfo) {
		log.info(chalk.cyan('Total specs defined: ' + suiteInfo.totalSpecsDefined));
	},
	specStarted(result) {
		log.info(chalk.cyan.underline(result.fullName));
	},
	specDone(result) {
		result.failedExpectations.forEach(ex => {
			log.error('spec done with Failed expectation: ', ex.stack);
		});
	}
};

function defaultConfig() {
	return {
		spec_dir: Path.relative(process.cwd(), config().rootPath),
		spec_files: [],
		helpers: [],
		stopSpecOnExpectationFailure: false,
		random: false
	};
}

function runUnitTest(argv) {
	if (argv.f) {
		for (const singleFile of argv.f) {
			let pk = new LazyPackageFactory().getPackageByPath(Path.resolve(singleFile));
			nodeInjector.fromPackage(pk.longName, pk.packagePath)
			.value('__injector', nodeInjector)
			.value('__api', getApiForPackage(pk));
			nodeInjector.fromPackage(pk.longName, pk.realPackagePath)
			.value('__injector', nodeInjector)
			.value('__api', getApiForPackage(pk));
		}
		return runJasmine(defaultConfig(), [].concat(argv.f), argv.spec);
	}
	var jasmineSetting = defaultConfig();
	var wfhPath = config().wfhSrcPath;
	var i = argv.package.indexOf('dr-comp-package');
	if (i >= 0) {
		argv.package.splice(i, 1);
		jasmineSetting.spec_files.push(wfhPath + '/spec/**/*[sS]pec.js',
			wfhPath + '/dist/spec/**/*[sS]pec.js');
		jasmineSetting.helpers.push(wfhPath + 'spec/helpers/**/*.js');
	}
	var packages = argv.package && argv.package.length === 0 ? null : argv.package;
	packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
		// inject global modules start
		var pkInstance = new Package({
			moduleName: parsedName.name,
			name,
			longName: name,
			scope: parsedName.scope,
			path: packagePath,
			priority: json.dr ? json.dr.builderPriority : null
		});
		nodeInjector.fromPackage(name, packagePath)
			.value('__injector', nodeInjector)
			.factory('__api', function() {
				return getApiForPackage(pkInstance);
			});
		nodeInjector.fromPackage(name, fs.realpathSync(packagePath))
			.value('__injector', nodeInjector)
			.factory('__api', function() {
				return getApiForPackage(pkInstance);
			});
	});
	packageUtils.findAllPackages(packages, (name, entryPath, parsedName, json, packagePath) => {
		if (!fs.existsSync(Path.join(packagePath, 'spec')) && !fs.existsSync(Path.join(packagePath, 'dist', 'spec'))) {
			return;
		}
		log.info('Found test for package: ' + name);
		var relativePkPath = Path.relative(Path.resolve(), packagePath).replace(/\\/g, '/');
		jasmineSetting.spec_files.push(
			relativePkPath + '/spec/**/*[sS]pec.js',
			relativePkPath + '/dist/spec/**/*[sS]pec.js');
		jasmineSetting.helpers.push(relativePkPath + '/spec/helpers/**/*[sS]pec.js');
	}, 'src');
	// var cache = LRU(20);
	// var proto = NodeApi.prototype;
	// proto.findPackageByFile = function(file) {
	// 	var found = cache.get(file);
	// 	if (!found) {
	// 		found = packageInfo.dirTree.getAllData(file).pop();
	// 		cache.set(file, found);
	// 	}
	// 	return found;
	// };
	// log.info(jasmineSetting.spec_files);
	return runJasmine(jasmineSetting);
}

function runE2eTest(argv) {
	var injector = require('../injectorFactory').nodeInjector;
	var factoryMap = injector.fromDir(Path.resolve(config().rootPath, 'e2etest'));
	factoryMap.value('__injector', injector);
	factoryMap.value('__config', config);

	var helper = require('@dr/e2etest-helper');
	return helper.run(require('../config'), argv.browser, argv.server, argv.dir, () => {
		if (argv.f) {
			return runJasmine(defaultConfig(), [].concat(argv.f), argv.spec);
		}
		var jasmineSetting = defaultConfig();
		packageUtils.findNodePackageByType('e2etest', (name, entryPath, parsedName, json, packagePath) => {
			jasmineSetting.spec_files.push(packagePath + '/spec/**/*[sS]pec.js');
			jasmineSetting.helpers.push(packagePath + '/spec/helpers/**/*.js');
		});
		log.info('jasmineSetting.spec_files: %s', jasmineSetting.spec_files.join('\n'));
		return runJasmine(jasmineSetting);
	});
}

function runJasmine(jasmineSetting, files, spec) {
	var jasmine = new Jasmine();
	var prom = new Promise((resolve, reject) => {
		jasmine.onComplete(function(passed) {
			return passed ? resolve() : reject(new Error('Jasmine test failed'));
		});
	});
	jasmine.configureDefaultReporter({});
	jasmine.addReporter(simpleReporter);
	if (files) {
		jasmine.execute(files, spec);
	} else {
		jasmine.loadConfig(jasmineSetting);
		jasmine.execute();
	}
	return prom;
}

function getApiForPackage(pkInstance) {
	// if (_.has(apiCache, pkInstance.longName)) {
	// 	return apiCache[pkInstance.longName];
	// }

	var api = new NodeApi(pkInstance.longName, pkInstance);
	api.constructor = NodeApi;
	pkInstance.api = api;
	api.default = api; // For ES6 import syntax
	// NodeApi.prototype.buildUtils = buildUtils;
	// NodeApi.prototype.packageUtils = packageUtils;
	// NodeApi.prototype.argv = argv;
	NodeApi.prototype.compileNodePath = [config().rootPath];
	return api;
}
