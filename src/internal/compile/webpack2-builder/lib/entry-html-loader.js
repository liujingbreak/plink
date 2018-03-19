const api = require('__api');
const loaderUtils = require('loader-utils');
const log = require('log4js').getLogger('wfh.entry-html-loader');
const _ = require('lodash');
const Path = require('path');
var MutilEntryHtmlPlugin = require('./multi-entry-html-plugin');

var mutilEntryHtmlPlugin;
/**
 * options: {rename?: string, forPlugin: MutilEntryHtmlPlugin}
 * @param {string} content
 * @param {*} map
 */
module.exports = function(content, map) {
	var callback = this.async();
	if (!callback) {
		this.emitError('Only support async mode');
		throw new Error('Only support async mode');
	}
	loadAsync(content, this)
	.then(result => callback(null, result, map))
	.catch(err => {
		this.emitError(err);
		log.error(err);
		callback(err);
	});
};

function findMultiEntryHtmlPlugin(loader) {
	if (!mutilEntryHtmlPlugin)
		mutilEntryHtmlPlugin = _.find(loader.options.plugins, plugin => plugin instanceof MutilEntryHtmlPlugin);
	return mutilEntryHtmlPlugin;
}

function loadAsync(content, loader) {
	var file = loader.resourcePath;
	var component = api.findPackageByFile(file);
	const options = loaderUtils.getOptions(loader);
	if (options && options.rename)
		file = Path.resolve(Path.dirname(file), options.rename);
	if (loader.resourceQuery) {
		let params = loaderUtils.parseQuery(loader.resourceQuery);
		if (params && params.rename)
			file = Path.resolve(Path.dirname(file), params.rename);
	}
	var output = Path.relative(loader.options.context || process.cwd(), file);

	log.info('add entry html/view %s', output);
	findMultiEntryHtmlPlugin(loader).addFile(output, component ? component.bundle : null, content);
	return Promise.resolve('module.exports = null');
}
