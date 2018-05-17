/**
 * A lot of hack of nodejs in this file.
 */
var Path = require('path');
var Module = require('module').Module;
var oldNodePath = Module._nodeModulePaths;

module.exports = function() {
	setContextPath(getRootPath());
};

module.exports.setContextPath = setContextPath;
function setContextPath(rootPath) {
	var packagePaths = [Path.resolve(rootPath, 'node_modules')];
	if (process.env.WFH_NODE_PATH)
		packagePaths.push(process.env.WFH_NODE_PATH);
	// --- Attention: Hack is here ---
	// `process.env.WFH_NODE_PATH` is allowed to be set as extra Node and Browserify search path
	Module._nodeModulePaths = function(from) {
		var paths = oldNodePath.call(this, from);
		paths.push.apply(paths, packagePaths);
		return paths;
	};
	module.paths = Module._nodeModulePaths(__dirname || process.cwd());
	module.parent.paths = Module._nodeModulePaths(module.parent.filename);
}

module.exports.getRootPath = getRootPath;
function getRootPath() {
	var rootPath;
	var containerArgIdx = process.argv.indexOf('--root');
	if (containerArgIdx >= 0)
		rootPath = Path.resolve(process.argv[containerArgIdx + 1]);
	else
		rootPath = process.env.DR_ROOT_DIR || process.cwd();
	return rootPath;
}
