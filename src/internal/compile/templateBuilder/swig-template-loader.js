const Promise = require('bluebird');
const api = require('__api');
const log = require('log4js').getLogger(api.packageName + '.swig-template-loader');
const _ = require('lodash');
const Path = require('path');
const loaderUtils = require('loader-utils');
const templateBuilder = require('./templateBuilder');
const swig = templateBuilder.swig;

module.exports = function(content, sourcemap) {
	var callback = this.async();
	if (!callback) {
		log.error('swig-template-loader only supports async environment');
		throw new Error('swig-template-loader only supports async environment');
	}
	// templateBuilder.fileHandler.onFile = file => {
	// 	if (this.resourcePath !== file) {
	// 		log.warn('add dependency %s for %s', file, this.resourcePath);
	// 		this.addDependency(file);
	// 	}
	// };
	var self = this;
	try {
		return loadAsync(content, this)
		.then(function(result) {
			return callback(null, result, sourcemap);
		})
		.catch(function(err) {
			log.error(err);
			self.emitError(err);
			return callback(err);
		});
	} catch (e) {
		log.error(e);
		self.emitError(e);
		callback(e);
	}
};

function loadAsync(content, loader) {
	var file = loader.resourcePath;
	var browserPackage = api.findPackageByFile(file);
	if (browserPackage) {
		if (loader.resourceQuery) {
			let params = loaderUtils.parseQuery(loader.resourceQuery);
			if (params && params.rename)
				file = Path.resolve(Path.dirname(file), params.rename);
		}

		var packageExports = templateBuilder.runPackage(browserPackage);
		if (packageExports && _.isFunction(packageExports.onCompileTemplate)) {
			log.debug('swig template: ', file);
			loader.addDependency(require.resolve(browserPackage.longName));
			var includedFileSet = {};
			templateBuilder.fileHandler.onFile = includedFile => {
				if (_.has(includedFileSet, includedFile))
					return;
				includedFileSet[includedFile] = 1;
				loader.addDependency(includedFile);
				log.debug('Swig includes file %s as dependency', Path.relative(api.config().rootPath, includedFile));
			};
			return Promise.resolve(packageExports.onCompileTemplate(
				Path.relative(browserPackage.realPackagePath, file).replace(/\\/g, '/'),
				swig))
			.then(swigOptions => {
				if (!swigOptions)
					swigOptions = {locals: {}};
				if (!swigOptions.locals)
					swigOptions.locals = {};
				swigOptions.locals.__api = api.apiForPackage(browserPackage.longName);
				swigOptions.locals.__renderFile = (targetFile) => {
					return templateBuilder.renderFile(targetFile, file, swigOptions);
				};
				if (swigOptions.emitFiles) {
					return createNewHtmls(swigOptions.emitFiles, loader)
					.then(() => swigOptions);
				}
				return swigOptions;
			})
			.then(swigOptions => templateBuilder.compileTemplate(swigOptions, content, file))
			.catch(err => {
				log.error('Faild to compile template %s for ', file, err);
				return Promise.reject(err);
			});
		}
	}
	return Promise.resolve(content);
}

function createNewHtmls(emitFiles, loader) {
	var allEmitProms = _.map(emitFiles, filePath => {
		let newRequest = '!' + loader.request;
		if (newRequest.indexOf('entry-html-loader') < 0)
			newRequest = '!lib/entry-html-loader' + newRequest;
		newRequest = newRequest + '?rename=' + filePath;
		return new Promise((resolve, reject) => {
			loader.loadModule(newRequest, (err, source, sourceMap, module) => {
				if (err)
					return reject(err);
				return resolve();
			});
		});
	});
	return Promise.all(allEmitProms);
}
