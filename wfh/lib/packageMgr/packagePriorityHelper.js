var Promise = require('bluebird');
var _ = require('lodash');
var log = require('log4js').getLogger('packagePriorityHelper');
module.exports = {
	orderPackages
};

var beforeOrAfter = {};
var priorityStrReg = /(before|after)\s+(\S+)/;

function orderPackages(packages, run, priorityProperty) {
	var numberTypePrio = [];
	var beforePackages = {};
	var afterPackages = {};
	priorityProperty = priorityProperty || 'priority';
	packages.forEach(pk => {
		var priority = _.get(pk, priorityProperty);
		if (_.isNumber(priority)) {
			numberTypePrio.push(pk);
		} else if (_.isString(priority)) {
			var res = priorityStrReg.exec(priority);
			if (!res) {
				throw new Error('Invalid format of package.json - priority in ' +
					pk.longName + ': ' + priority);
			}
			var targetPackageName = res[2];
			if (res[1] === 'before') {
				if (!beforePackages[targetPackageName]) {
					beforePackages[targetPackageName] = [];
					beforeOrAfter[targetPackageName] = 1; // track target package
				}
				beforePackages[targetPackageName].push(pk);
			} else if (res[1] === 'after') {
				if (!afterPackages[targetPackageName]) {
					afterPackages[targetPackageName] = [];
					beforeOrAfter[targetPackageName] = 1; // track target package
				}
				afterPackages[targetPackageName].push(pk);
			}
		} else {
			_.set(pk, priorityProperty, 5000);
			numberTypePrio.push(pk);
		}
	});

	numberTypePrio.sort(function(pk1, pk2) {
		return _.get(pk2, priorityProperty) - _.get(pk1, priorityProperty);
	});

	var notFound = _.difference(_.keys(beforeOrAfter), _.map(packages, pk => pk.longName));
	if (notFound.length > 0) {
		var err = 'Priority depended packages are not found: ' +  notFound;
		log.error(err);
		return Promise.reject(new Error(err));
	}

	function runPackagesSync(packages) {
		return Promise.coroutine(function*() {
			for (var pk of packages) {
				yield runPackage(pk);
			}
		})();
	}

	function runPackagesAsync(packages) {
		return Promise.all(packages.map(runPackage));
	}

	function runPackage(pk) {
		return Promise.coroutine(function*() {
			yield beforeHandlersFor(pk.longName);
			log.debug(pk.longName, ' starts with priority: ', _.get(pk, priorityProperty));
			var anyRes = run(pk);
			yield Promise.resolve(anyRes);
			log.debug(pk.longName, ' ends');
			yield afterHandlersFor(pk.longName);
		})();
	}

	function beforeHandlersFor(name) {
		return runPackagesAsync(beforePackages[name] ? beforePackages[name] : []);
	}

	function afterHandlersFor(name) {
		return runPackagesAsync(afterPackages[name] ? afterPackages[name] : []);
	}

	return runPackagesSync(numberTypePrio);
}
