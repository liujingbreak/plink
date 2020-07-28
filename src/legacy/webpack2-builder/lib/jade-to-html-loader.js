const api = require('__api');
//const log = require('log4js').getLogger('wfh.' + __filename.substring(0, __filename.length - 3));
const _ = require('lodash');
//const pify = require('pify');
const Path = require('path');
const jade = require('jade');
// const vm = require('vm');

module.exports = function(content, map) {
	var callback = this.async();
	if (!callback) {
		this.emitError('Only support async mode');
		throw new Error('Only support async mode');
	}
	loadAsync(content, this)
	.then(result => callback(null, result, map))
	.catch(err => callback(err));
};

function loadAsync(content, loader) {
	var prom;
	var browserPackage = api.findPackageByFile(loader.resourcePath);
	if (browserPackage) {
		var packageExports = require(browserPackage.longName);
		if (packageExports && _.isFunction(packageExports.onCompileTemplate)) {
			loader.addDependency(require.resolve(browserPackage.longName));
			prom = Promise.resolve(packageExports.onCompileTemplate(
				Path.relative(_.get(loader, 'options.resolve.symlinks') ?
					browserPackage.realPackagePath : browserPackage.packagePath,
				loader.resourcePath).replace(/\\/g, '/'),
				null))
			.then(data => data.locals ? data.locals : data);
		} else
			prom = Promise.resolve({});
		return prom.then(locals => {
			return jade.render(content, Object.assign(locals, {
				filename: loader.resourcePath,
				compileDebug: api.config().devMode,
				basedir: browserPackage.realPackagePath
			}));
		});
	} else
		return Promise.resolve(content);
}

