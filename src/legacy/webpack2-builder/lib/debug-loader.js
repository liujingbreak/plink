const api = require('__api');
const log = require('log4js').getLogger(api.packageName + '.debug-loader');
const lu = require('loader-utils');

module.exports = function(content, map) {
	var callback = this.async();
	if (!callback)
		return load(content, this);
	loadAsync(content, this)
	.then(result => callback(null, result, map))
	.catch(err => callback(err));
};

module.exports.pitch = function(remainingRequest, precedingRequest, data) {
	log.warn(`Pitching: remainingRequest: ${remainingRequest}
	precedingRequest: ${precedingRequest}
	data: ${JSON.stringify(data)}`);
};

function load(content, loader) {
	var options = lu.getOptions(loader);
	log.warn(`[%s]: %s, sourceMap: %s\n%s
	request: ${loader.request}`, options.label || options.id, loader.resourcePath,
	loader.sourceMap, content);
	return content;
}

function loadAsync(content, loader) {
	try {
		return Promise.resolve(load(content, loader));
	} catch (e) {
		log.error(e);
		return Promise.reject(e);
	}
}
