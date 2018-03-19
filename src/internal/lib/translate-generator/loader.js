var tr = require('./translate-replacer');
var Path = require('path');
var api = require('__api');
var log = require('log4js').getLogger(api.packageName);
var yamljs = require('yamljs');
var fs = require('fs');
var pify = require('pify');
var readFileASync = pify(fs.readFile.bind(fs));

var cache = new Map();
var JSTYPES = {ts: 1, js: 1, jsx: 1, tsx: 1};
module.exports = function(source, map, ast) {
	var callback = this.async();
	var loader = this;
	var prom;
	try {
		var skipPackageCache = {};
		var file = this.resourcePath;
		var ext = Path.extname(file).toLowerCase().substring(1);

		if (ext in JSTYPES) {
			prom = tr.replaceJS(source, file, api.getBuildLocale(), skipPackageCache, onLoadRes, ast);
		} else {
			prom = tr.replaceHtml(source, file, api.getBuildLocale(), skipPackageCache, onLoadRes);
		}
	} catch (err) {
		log.error(err);
		if (callback)
			return callback(err);
		throw err;
	}
	prom.then(replaced => {
		if (Array.isArray(replaced)) {
			ast = replaced[1];
			replaced = replaced[0];
		}
		// log.warn('%s, %s', this.resourcePath, map)
		callback(null, replaced, map, ast);
	})
	.catch(callback);

	function onLoadRes(name) {
		var cached = cache.get(name);
		if (cached)
			return Promise.resolve(cached);

		var file = require.resolve(name);
		loader.addDependency(file);
		return readFileASync(file, 'utf8')
		.then(content => {
			var json = yamljs.parse(content);
			cache.set(name, json);
			return json;
		});
	}
};

module.exports.clearCache = function() {
	cache.clear();
};

