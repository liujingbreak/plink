const gutil = require('gulp-util');
const PluginError = gutil.PluginError;
const through = require('through2');
const Promise = require('bluebird');
const fs = require('fs-extra');
const mkdirp = require('mkdirp');
//const fs = require('fs');
const Path = require('path');
const File = require('vinyl');
const jsonLint = require('json-lint');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
const _ = require('lodash');
const config = require('../config');
const isWin32 = require('os').platform().indexOf('win32') >= 0;

module.exports = {
	symbolicLinkPackages,
	addDependency,
	removeDependency,
	readAsJson
};

const readFileAsync = Promise.promisify(fs.readFile);

/**
 * [readAsJson description]
 * @param  {function} onFile  [description]
 */
function readAsJson(toFile, onFlush) {
	return through.obj(function(file, encoding, callback) {
		gutil.log('reading ' + file.path);
		var self = this;
		readFileAsync(file.path, {encoding: 'utf-8'})
			.then(function(content) {
				var json = JSON.parse(content);
				return toFile(json, file);
			}).then(function(newFile) {
				callback(null, newFile);
			}).catch(function(err) {
				gutil.log(err);
				self.emit('error', new PluginError('rwPackageJson.readAsJson', err.stack, {showStack: true}));
				callback(err);
			});
	},
	function flush(callback) {
		onFlush();
		callback();
	}
	);
}

function symbolicLinkPackages(destDir) {
	return through.obj(function(file, encoding, callback) {
		var self = this;
		var newPath, json;
		Promise.coroutine(function*() {
			var content = yield readFileAsync(file.path, {encoding: 'utf-8'});
			var lint = jsonLint(content);
			if (lint.error) {
				log.error(lint);
				this.emit('error', new PluginError('rwPackageJson', lint, {showStack: true}));
				return callback();
			}
			json = JSON.parse(content);
			newPath = Path.join(fs.realpathSync(Path.join(destDir, 'node_modules')), json.name);
			var stat, exists;
			try {
				stat = fs.lstatSync(newPath);
				exists = true;
			} catch (e) {
				if (e.code === 'ENOENT') {
					_symbolicLink(Path.dirname(file.path), newPath); // file doesn't exist, create a new link
					exists = false;
				} else
					throw e;
			}
			log.debug('symblink to %s', newPath);
			if (exists) {
				if (stat.isFile() ||
					(stat.isSymbolicLink() &&
						(stat.mtime.getTime() < file.stat.mtime.getTime() || !fs.existsSync(newPath)))) {
					fs.unlinkSync(newPath);
					_symbolicLink(Path.dirname(file.path), newPath);
				} else if (stat.isDirectory()) {
					log.info('Remove installed package "%s"', Path.relative(process.cwd(), newPath));
					//del.sync([newPath]);
					yield fs.remove(newPath);
					_symbolicLink(Path.dirname(file.path), newPath);
				}
			}
			self.push(new File({
				base: destDir,
				path: newPath,
				contents: new Buffer(JSON.stringify(json, null, '\t'))
			}));
			callback();
		})()
		.catch(function(err) {
			log.error(err);
			self.emit('error', new PluginError('rwPackageJson', err.stack, {showStack: true}));
			callback(err);
		});
	}, function(callback) {
		callback();
	});
}

function _symbolicLink(dir, link) {
	mkdirp.sync(Path.dirname(link));
	fs.symlinkSync(Path.relative(Path.dirname(link), dir), link, isWin32 ? 'junction' : 'dir');
	log.info('Create symlink "%s"', Path.relative(process.cwd(), link));
}

var packageJsonTemp = {
	name: '@dr/',
	version: '0.1.0',
	description: 'Component group: ',
	dependencies: null
};

/**
 * Write recipe file
 * Write an array of linked package path, and a recipe package.json file
 * @param {string} recipeAbsDir null when there is no recipe dir for those linked package file
 */
function addDependency(recipeAbsDir) {
	var linkFiles = [];
	var destJson;
	if (recipeAbsDir) {
		var recipeFile = Path.resolve(recipeAbsDir, 'package.json');
		if (fs.existsSync(recipeFile)) {
			log.debug('Existing recipeFile %s', recipeFile);
			var content = fs.readFileSync(recipeFile, 'utf8');
			try {
				destJson = JSON.parse(content);
			} catch (err) {}
		}
		if (!destJson) {
			destJson = _.cloneDeep(packageJsonTemp);
			var recipeDirName = Path.basename(recipeAbsDir);
			destJson.name += recipeDirName.replace(/[\/\\]/g, '-');
			destJson.description += recipeDirName;
		}
	}

	return through.obj(function(file, encoding, callback) {
		var json = JSON.parse(file.contents.toString('utf8'));

		log.debug('add to recipe: ' + recipeAbsDir + ' : ' + file.path);
		linkFiles.push(Path.relative(config().rootPath, file.path));
		if (!destJson)
			return callback();
		if (!destJson.dependencies) {
			destJson.dependencies = {};
		}
		destJson.dependencies[json.name] = json.version;
		callback();
	}, function flush(callback) {
		var self = this;
		self.push(linkFiles);
		if (destJson) {
			var destFile = new File({
				base: Path.resolve(config().rootPath),
				path: Path.resolve(recipeFile),
				contents: new Buffer(JSON.stringify(destJson, null, '  '))
			});
			self.push(destFile);
		}
		callback();
	});
}

function removeDependency() {
	return through.obj(function(file, encoding, callback) {
		log.info('removing dependencies from recipe file ' + file.path);
		var content = file.contents.toString('utf8');
		//read destJson
		var lint = jsonLint(content);
		if (lint.error) {
			log.error(lint);
			this.emit('error', lint.error);
			return callback();
		}
		var destJson = JSON.parse(content);
		// var promises = _.map(destJson.dependencies, (x, name) => {
		// 	return buildUtils.promisifyExe('npm', 'uninstall', name);
		// });
		destJson.dependencies = {};
		content = JSON.stringify(destJson, null, '\t');
		log.debug(content);
		file.contents = new Buffer(content);
		// Promise.all(promises).then(()=> {
		// 	callback(null, file);
		// });
		callback(null, file);
	});
}
