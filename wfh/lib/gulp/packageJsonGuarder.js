/* eslint no-console: 0 */
var fs = require('fs');
var Path = require('path');
var processUtils = require('../../dist/process-utils');
const EOL = require('os').EOL;
const isWin32 = require('os').platform().indexOf('win32') >= 0;

const logName = '[Installer] ';

/**
 * This class helps to install dependencies for command "init",
 * it is in charge of manipulating <drcp-workspace>/dr.package.json
 * and run "yarn install", to protect the original package.json file
*/
class Guarder {
	constructor(rootPath) {
		this.rootPath = rootPath;
		this.changes = null;
		this.installChecksum = null;
		this.isPackageJsonDirty = false;
		this.isDrcpSymlink = fs.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink();
		this.isNodeModulesChanged = null;
		this.offline = false;
	}

	/**
	 * Backup package.json
	 * @param {*} backupFileContent
	 */
	beforeChange(backupFileContent) {
		console.log(logName + 'Backup package.json to dr.backup.package.json');
		var backupFile = Path.join(this.rootPath, 'dr.backup.package.json');
		//var json;
		if (backupFileContent) {
			fs.writeFileSync(backupFile, backupFileContent);
			//json = JSON.parse(backupFileContent);
		} else {
			var buf = fs.readFileSync(Path.join(this.rootPath, 'package.json'));
			fs.writeFileSync(backupFile, buf);
			//json = JSON.parse(buf);
		}
	}

	/**
	 * Get last changed package.json json from dr.package.json or memory
	 * @returns {JSON} package.json
	 */
	getChanges() {
		if (this.changes) {
			return clonePkJson(this.changes);
		}
		var lastChanged = Path.join(this.rootPath, 'dist', 'dr.package.json');
		if (fs.existsSync(lastChanged)) {
			let changedJson = JSON.parse(fs.readFileSync(lastChanged, 'utf8'));
			this.changes = changedJson;
			return clonePkJson(changedJson);
		}
		return {dependencies: {}};
	}

	getJsonFile() {
		if (this.isPackageJsonDirty || !fs.existsSync(this.rootPath + '/dist/dr.package.json'))
			return this.rootPath + '/package.json';
		return Path.resolve(this.rootPath + '/dist/dr.package.json');
	}

	/**
	 * Mark changes without writing dr.package.json
	 * @param {object} pk package.json
	 * @return changed list [string, string][]
	 */
	markChanges(pk) {
		var changeList = [];
		if (this.isDrcpSymlink) {
			if (pk.dependencies) {
				delete pk.dependencies['dr-comp-package'];
				delete pk.dependencies['@dr/internal-recipe'];
			}
			if (pk.devDependencies) {
				delete pk.devDependencies['dr-comp-package'];
				delete pk.devDependencies['@dr/internal-recipe'];
			}
		}
		// clean duplicates in devDependencies
		if (pk.devDependencies) {
			for (let dep in pk.devDependencies) {
				if (has(pk.devDependencies, dep) && has(pk.dependencies, dep))
					delete pk.devDependencies[dep];
			}
		}
		var deps = pk.dependencies;
		var originalDeps = this.getChanges().dependencies;
		if (deps) {
			for (let dep in deps) {
				if (has(deps, dep)) {
					let ver = deps[dep];
					if (originalDeps[dep] !== ver) {
						changeList.push([dep, ver]); // new or changed dependency
					}
					delete originalDeps[dep];
				}
			}
		}
		changeList.push(...Object.keys(originalDeps).map(row => [row, null]));
		//pk.dependencies = originalDeps;
		this.changes = pk;
		return changeList;
	}

	isModulesChanged() {
		if (this.isNodeModulesChanged != null)
			return this.isNodeModulesChanged;
		try {
			var moduleDir = Path.resolve(this.rootPath, 'node_modules');
			if (this.installChecksum == null) {
				var lastCountFile = Path.join(this.rootPath, 'dist', 'dr.integrity.txt');
				if (!fs.existsSync(moduleDir) || !fs.existsSync(lastCountFile)) {
					this.isNodeModulesChanged = true;
					return true;
				}
				var checksumData = fs.readFileSync(lastCountFile, 'utf8').split(EOL);
				this.installChecksum = parseInt(checksumData[0], 10);
				this.lastInstalled = checksumData.slice(1);
			}
		} catch (err) {
			console.log(logName, err);
			this.isNodeModulesChanged = true;
			return true;
		}
		var installed = this._countPackages();
		var currChecksum = installed.join(EOL).length;
		if (currChecksum !== this.installChecksum) {
			console.log(logName + `Installation integrity checksum has changed from ${this.installChecksum} to ${currChecksum}`);
			var installedSet = new Set();
			for (let name of installed) {
				installedSet.add(name);
			}
			if (this.lastInstalled) {
				for (let name of this.lastInstalled) {
					if (!installedSet.has(name))
						console.log(logName + 'Missing ' + name);
				}
			}
			this.isNodeModulesChanged = true;
			return true;
		}
		this.isNodeModulesChanged = false;
		return false;
	}

	installAsync(doNotMarkInstallNum, useYarn, onlyProd, isOffline) {
		this.offline = isOffline;
		fs.writeFileSync(Path.resolve(this.rootPath, 'package.json'),
			JSON.stringify(this.getChanges(), null, '  '));
		this.isPackageJsonDirty = true;
		var drcpLocation = Path.resolve('node_modules', 'dr-comp-package');
		var realDrcpPath = fs.realpathSync(drcpLocation);
		// var yarnArgv = ['install', '--non-interactive', '--check-files'];
		const npmArgv = ['install'];
		if (onlyProd) {
			npmArgv.push(useYarn ? '--production' : '--only=prod');
		}
		// if (isOffline) {
		// 	console.log(logName + 'offline mode is on');
		// 	yarnArgv.push('--offline');
		// } else {
		// 	// console.log(logName + '--prefer-offline mode is on');
		// 	// yarnArgv.push('--prefer-offline');
		// }
		var installProm;
		// if (isOffline && fs.existsSync(this.rootPath + '/dr.offline-yarn.lock')) {
		// 	console.log(logName + 'Read existing dr.offline-yarn.lock');
		// 	installProm = new Promise((resolve, rej) => {
		// 		var to = fs.createWriteStream(this.rootPath + '/yarn.lock');
		// 		var from = fs.createReadStream(this.rootPath + '/dr.offline-yarn.lock');
		// 		to.on('finish', resolve)
		// 		.on('error', err => {
		// 			console.log(err);
		// 			to.end();
		// 			rej(err);
		// 		});
		// 		from.pipe(to);
		// 	});
		// } else {
		installProm = Promise.resolve();
		// }
		installProm = installProm.then(() => processUtils.promisifyExe(useYarn ? 'yarn' : 'npm', ...npmArgv, {cwd: this.rootPath}))
		.then(res => {
			if (this.isDrcpSymlink) {
				return new Promise(resolve => setTimeout(() => resolve(res), 500))
				.then(recreateSymlink)
				.catch(err => {
					recreateSymlink();
					throw err;
				});
			} else
				return res;
		});
		var self = this;
		function recreateSymlink() {
			if (!fs.existsSync(Path.resolve('node_modules', 'dr-comp-package'))) {
				fs.symlinkSync(Path.relative('node_modules', realDrcpPath), drcpLocation, isWin32 ? 'junction' : 'dir');
				console.log(logName + 'Write symlink dr-comp-package');
			}
			if (!doNotMarkInstallNum)
				self.markInstallNum();
		}
		return installProm
		.catch(err => {
			console.log('Sorry, my bad.');
			console.log(err);
			throw err;
		});
	}

	markInstallNum() {
		this.isNodeModulesChanged = null;
		var installed = this.lastInstalled = this._countPackages();
		var data = installed.join(EOL);
		this.installChecksum = data.length;
		data = this.installChecksum + EOL + data;
		console.log(logName + 'Number of packages: ' + installed.length);
		if (!fs.existsSync(Path.resolve(this.rootPath, 'dist')))
			fs.mkdirSync(Path.resolve(this.rootPath, 'dist'));
		fs.writeFileSync(Path.resolve(this.rootPath, 'dist', 'dr.integrity.txt'), data, 'utf8');
	}

	/**
	 * Not including symlink components
	 */
	_countPackages() {
		console.log(logName + 'Counting installed modules...');
		//var count = 0;
		var packageNames = [];
		var moduleDir = Path.resolve(this.rootPath, 'node_modules');
		for (let fname of fs.readdirSync(moduleDir)) {
			if (fname.startsWith('@')) {
				let scopeDir = Path.resolve(moduleDir, fname);
				for (let subfname of fs.readdirSync(scopeDir)) {
					if (subfname.startsWith('.'))
						continue;
					if (fs.existsSync(Path.resolve(scopeDir, subfname, 'package.json')) &&
						!fs.lstatSync(Path.resolve(scopeDir, subfname)).isSymbolicLink()) {
						//count++;
						packageNames.push(fname + '/' + subfname);
					}
				}
			}
			if (fname.startsWith('.'))
				continue;
			if (fs.existsSync(Path.resolve(moduleDir, fname, 'package.json'))) {
				packageNames.push(fname);
				//count++;
			}
		}
		return packageNames;
	}

	/**
	 * Mark changes and writing dr.package.json, and restore package.json and create dr.yarn.lock
	 * @param {*} dependencies
	 */
	afterChange() {
		if (this.changes) {
			if (!fs.existsSync(this.rootPath + '/dist'))
				fs.mkdirSync(this.rootPath + '/dist');
			fs.writeFileSync(Path.join(this.rootPath, 'dist', 'dr.package.json'), JSON.stringify(this.changes, null, '  '));
		}
		//fs.renameSync(Path.join(this.rootPath, 'package.json'), Path.join(this.rootPath, 'dr.package.json'));
		fs.renameSync(Path.join(this.rootPath, 'dr.backup.package.json'), Path.join(this.rootPath, 'package.json'));
		if (!this.offline && fs.existsSync(this.rootPath + '/yarn.lock')) {
			fs.createReadStream(this.rootPath + '/yarn.lock').pipe(fs.createWriteStream(this.rootPath + '/dr.offline-yarn.lock'));
			console.log(logName + 'Write dr.offline-yarn.lock');
		}
		this.isPackageJsonDirty = false;
		this.changes = null;
		console.log(logName + 'Save to dist/dr.package.json, restore package.json from dr.backup.package.json');
	}

	afterChangeFail() {
		var pkfile = Path.join(this.rootPath, 'package.json');
		if (fs.existsSync(pkfile))
			fs.renameSync(pkfile, Path.join(this.rootPath, 'dr.fail.package.json'));
		fs.renameSync(Path.join(this.rootPath, 'dr.backup.package.json'), Path.join(this.rootPath, 'package.json'));
		this.isPackageJsonDirty = false;
		this.changes = null;
		console.log(logName + 'Restore package.json from dr.backup.package.json');
	}
}

Guarder.instances = {};
function getInstance(rootPath) {
	rootPath = Path.resolve(rootPath);
	var g = Guarder.instances[rootPath];
	if (g)
		return g;
	g = new Guarder(rootPath);
	Guarder.instances[rootPath] = g;
	return g;
}

function clonePkJson(obj) {
	var cloned = Object.assign({}, obj);
	cloned.dependencies = Object.assign({}, obj.dependencies);
	return cloned;
}

function has(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = getInstance;
