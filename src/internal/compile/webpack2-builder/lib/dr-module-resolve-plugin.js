var log = require('log4js').getLogger('wfh.DrModuleResolvePlugin');
var _ = require('lodash');

/**
 * Reference to enhanced-resolver/lib/ModulesInRootPlugin.js
 */
class DrModuleResolvePlugin {
	constructor(options, target) {
		this.target = 'resolve';
	}

	apply(resolver) {
		var target = this.target;
		resolver.plugin('module', function(request, callback) {
			var drSetting = _.get(request, 'descriptionFileData.dr.resolveModule');
			if (drSetting === true) {
				var path = request.descriptionFileRoot;
				log.debug('Looking for %s / %s from %s', path, request.request, request.path);
				var obj = Object.assign({}, request, {
					path,
					request: './' + request.request
				});
				return resolver.doResolve(target, obj, 'looking for modules in ' + path, callback, true);
			}
			return callback();
		});
	}
}

module.exports = DrModuleResolvePlugin;
