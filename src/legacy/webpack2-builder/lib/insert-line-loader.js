/**
 * Insert a line of comment at beginning of each DRCP source file as a placeholder line for
 * api-loader.js inserting some API helper code later on, so that the line number of source map
 * will not be messed up.
 */
const log = require('log4js').getLogger('wfh.insert-line-loader');
const EOL = require('os').EOL;
module.exports = function(content, map) {
	var callback = this.async();
	if (!callback)
		throw new Error('api-loader is Not a sync loader!');
	loadAsync(content, this)
	.then(result => callback(null, result, map))
	.catch(err => {
		log.error(err);
		callback(err);
	});
};

var BANNER = '/* Powered by @wfh/plink */';

module.exports.banner = BANNER;

function loadAsync(content, loader) {
	return Promise.resolve(BANNER + EOL + content);
}
