var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var through = require('through2');
var File = require('vinyl');
var fs = require('fs');
var Path = require('path');
var Promise = require('bluebird');

module.exports = findPackageJson;

/**
 * Recursively lookup `fromDir` folder for private module's package.json file
 */
function findPackageJson(fromDirs, startFromSubDir) {
	if (!Array.isArray(fromDirs))
		fromDirs = [fromDirs];
	return through.obj(
		function(whatever, encoding, callback) {callback();},
		function flush(callback) {
			var me = this;
			var proms = fromDirs.map(d => new FolderScanner(d, me).run(startFromSubDir));

			Promise.all(proms)
			.then(function() {
				callback();
			})
			.catch(function(err) {
				gutil.log(err);
				me.emit('error', new PluginError('findPackageJson', err.stack, {showStack: true}));
			});
		});
}

function FolderScanner(fromDir, through) {
	this.fromDir = Path.resolve(fromDir);
	this.proms = null;
	this.through = through;
}

FolderScanner.prototype = {
	run(startFromSubDir) {
		this.proms = [];
		if (startFromSubDir)
			this.checkSubFolders(this.fromDir);
		else
			this.checkFolder(this.fromDir);
		return Promise.all(this.proms);
	},

	checkSubFolders(parentDir) {
		var self = this;
		var folders = fs.readdirSync(parentDir);
		folders.forEach(function(name) {
			try {
				if (name === 'node_modules') {
					return;
				}
				var dir = Path.join(parentDir, name);
				self.checkFolder(dir);
			} catch (er) {
				gutil.log(er);
			}
		});
	},

	checkFolder(dir) {
		var self = this;
		if (fs.statSync(dir).isDirectory()) {
			var pkJsonPath = Path.join(dir, 'package.json');
			if (fs.existsSync(pkJsonPath)) {
				self.proms.push(createFile(pkJsonPath, self.fromDir)
					.then(function(file) {
						return self.through.push(file);
					}));
			} else {
				self.checkSubFolders(dir);
			}
		}
	}
};

var fsStateAsync = Promise.promisify(fs.stat);
function createFile(path, base) {
	return fsStateAsync(path).then(function(stat) {
		return new File({
			base,
			path,
			stat
		});
	});
}
