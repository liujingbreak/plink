/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require('path').posix;
var loaderUtils = require('loader-utils');
var api = require('__api');
var _ = require('lodash');
// var log = require('log4js').getLogger('wfh.dr-file-loader');
var resolveSymlink = null;

module.exports = function(content) {
	if (resolveSymlink === null)
		resolveSymlink = _.get(this, '_compiler.options.resolve.symlinks');
	if (this.cacheable)
		this.cacheable();
	var callback = this.async();

	try {
		if (!this.emitFile) throw new Error('emitFile is required from module system');

		var query = loaderUtils.getOptions(this) || {};
		// var configKey = query.config || 'fileLoader';
		// var options = this.options[configKey] || {};
		var config = {
			publicPath: false,
			useRelativePath: false,
			name: '[path][name].[md5:hash:hex:8].[ext]' // hack
		};

		// options takes precedence over config
		// Object.keys(options).forEach(function(attr) {
		// 	config[attr] = options[attr];
		// });

		// query takes precedence over config and options
		Object.keys(query).forEach(function(attr) {
			config[attr] = query[attr];
		});

		var context = config.context || this.rootContext;
		var url = loaderUtils.interpolateName(this, config.name, {
			context,
			content,
			regExp: config.regExp
		});

		var filePath = this.resourcePath;
		var browserPackage = api.findPackageByFile(filePath);
		// if (browserPackage) {
		let outputPath = _.trimStart(api.config.get(['outputPathMap', browserPackage.longName]), '/');

		let packageDir;
		if (browserPackage.realPackagePath.startsWith(process.cwd()) || resolveSymlink) {
			packageDir = browserPackage.realPackagePath;
		} else {
			packageDir = browserPackage.packagePath;
		}
		outputPath = path.join(outputPath, path.dirname(path.relative(packageDir, filePath)));
		url = path.join(outputPath, url.split('/').pop()); // only file name part
		// } else
		url = url.replace(/(^|\/)node_modules(\/|$)/g, '$1n-m$2').replace(/@/g, 'a');

		var publicPath = '__webpack_public_path__ + ' + JSON.stringify(url);

		if (query.emitFile === undefined || query.emitFile) {
			this.emitFile(url, content);
		}
		callback(null, 'module.exports = ' + publicPath + ';');
	} catch (e) {
		callback(e);
	}
};

module.exports.raw = true;
