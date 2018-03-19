var fs = require('fs');
var Path = require('path');

var mkdirp = require('mkdirp');
var _ = require('lodash');
var processUtils = require('./processUtils');
// var log = require('log4js').getLogger(Path.basename(__filename));

exports.readTimestamp = readTimestamp;
exports.writeTimestamp = writeTimestamp;
exports.promisifyExe = processUtils.promisifyExe;
exports.promisifySpawn = processUtils.promisifySpawn;

var timeStampCache = null;

/**
 * @param  {string} name [description]
 * @return {number}      returns null if there is no timestamp file
 */
function readTimestamp(name) {
	var config = require('../config');
	var file = Path.join(config.resolve('destDir'), 'timestamp.txt');

	if (timeStampCache) {
		return timeStampCache[name];
	}
	if (!fs.existsSync(file)) {
		return null;
	}
	var txt = fs.readFileSync(file, 'utf8');
	timeStampCache = JSON.parse(txt);
	return timeStampCache ? timeStampCache[name] : null;
}

function writeTimestamp(name) {
	var config = require('../config');
	var file = Path.join(config.resolve('destDir'), 'timestamp.txt');

	var time = new Date().getTime();
	if (!timeStampCache) {
		if (!fs.existsSync(file)) {
			timeStampCache = {};
		} else {
			var txt = fs.readFileSync(file, 'utf8');
			timeStampCache = JSON.parse(txt);
		}
	}
	timeStampCache[name] = time;
	mkdirp.sync(Path.dirname(file));
	fs.writeFileSync(file, JSON.stringify(timeStampCache, null, '\t'));
}

exports.getNpmVersion = function() {
	return exports.promisifyExe('npm', '-v', {silent: true})
	.then(raw => {
		return _.trim(raw);
	});
};

exports.getYarnVersion = function() {
	return exports.promisifyExe('yarn', '-v', {silent: true})
	.then(raw => {
		return _.trim(raw);
	});
};

/**
 * Major version of `npm -v`
 * @return {Promise} resolved to number
 */
exports.npmMajorVersion = function() {
	return exports.getNpmVersion()
	.then(ver => {
		var m = /^([0-9]+)\./.exec(ver);
		if (m) {
			var major = [1];
			return parseInt(major, 10);
		} else
			return 2;
	});
};
