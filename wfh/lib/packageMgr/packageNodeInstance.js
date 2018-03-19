var _ = require('lodash');

module.exports = Package;

/**
 * Package instance constructor
 * @param {string} attrs.name package name
 * @paream {string} attrs.scope module scope like 'dr' is for module name '@dr/<pacakge name>'
 * @param {string} attrs.path absolute path of package folder
 * @param {function} attrs.exports the module.exports object returned from executed package main module
 * @param {number|string} attrs.serverPriority the running priority, could be number or event string
 * in form of 'before <another package name>' or 'after <another package name>'
 */
function Package(attrs) {
	_.assign(this, attrs);
}
