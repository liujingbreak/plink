var fs = require('fs');
var Path = require('path');
var Promise = require('bluebird');
var _ = require('lodash');
var log = require('@dr/logger').getLogger('browserifyBuilder.fileCache');
var readFileAsync = Promise.promisify(fs.readFile, {context: fs});
var writeFileAsync = Promise.promisify(fs.writeFile, {context: fs});

module.exports = SimpleCache;

/**
 * This module helps builder.js to incrementally analyse browserify dependency graph
 * @param {string} tempDir
 */
function SimpleCache(tempDir) {
	this.dir = tempDir;
	this.fileJsonCache = {};
}

SimpleCache.prototype.newJsonCache = function(fileName, newJson) {
	this.fileJsonCache[fileName] = newJson;
	return newJson;
};

/**
 * @param  {[type]} fileName
 * @param  {[type]} override partial object data
 * @return {Promise}         resolve to merged new object
 */
SimpleCache.prototype.mergeWithJsonCache = function(fileName, override) {
	var self = this;
	var cache = this.fileJsonCache[fileName];
	if (cache) {
		let newJson = _.assign(cache, override);
		this.fileJsonCache[fileName] = newJson;
		return Promise.resolve(newJson);
	} else {
		log.debug('no memory cache available');
		return this.loadFromFile(fileName).then(function(cached) {
			var newJson = _.assign(cached, override);
			self.fileJsonCache[fileName] = newJson;
			return newJson;
		});
	}
};

SimpleCache.prototype.loadFromFile = function(fileName) {
	if (this.fileJsonCache[fileName]) {
		log.debug('use memory cache, skip reading file');
		return Promise.resolve(this.fileJsonCache[fileName]);
	}
	var filePath = Path.resolve(this.dir, fileName);
	var self = this;
	if (fs.existsSync(filePath)) {
		return readFileAsync(filePath, 'utf8').then(function(data) {
			log.debug('Read dependency information from cache file: ' + filePath);
			var cached = JSON.parse(data);
			self.fileJsonCache[fileName] = cached;
			return cached;
		});
	} else {
		log.debug('Dependency information cache file doesn\'t exist: ' + filePath);
		var cached = this.fileJsonCache[fileName] = {};
		return Promise.resolve(cached);
	}
};

/**
 * write cache to file
 * @return {promise}
 */
SimpleCache.prototype.flush =
SimpleCache.prototype.tailDown = function() {
	var proms = [];
	var self = this;
	_.forOwn(this.fileJsonCache, function(cache, file) {
		file = Path.resolve(self.dir, file);
		log.debug('writing to cache ' + file);
		proms.push(
			writeFileAsync(file, JSON.stringify(cache, null, '\t')));
	});
	return Promise.all(proms);
};
