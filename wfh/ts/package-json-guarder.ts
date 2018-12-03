// tslint:disable:no-console
import * as fs from 'fs';
import * as Path from 'path';
import * as processUtils from './process-utils';
import {EOL, platform} from 'os';
const isWin32 = platform().indexOf('win32') >= 0;

const logName = '[Installer] ';

interface PackageJson {
	dependencies: {[k: string]: string};
	devDependencies: {[k: string]: string};
}
/**
 * This class helps to install dependencies for command "init",
 * it is in charge of manipulating <drcp-workspace>/dr.package.json
 * and run "yarn install", to protect the original package.json file
*/
class Guarder {
	static instances: {[k: string]: Guarder} = {};
	changes: PackageJson = null;
	installChecksum: number | null = null;
	isPackageJsonDirty = false;
	isDrcpSymlink: boolean;
	isNodeModulesChanged: boolean | null = null;
	offline = false;
	protected lastInstalled: string[];

	constructor(public rootPath: string) {
		this.isDrcpSymlink = fs.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink();
	}

	/**
	 * Backup package.json
	 * @param {*} backupFileContent
	 */
	beforeChange(backupFileContent: any) {
		console.log(logName + 'Backup package.json to dr.backup.package.json');
		const backupFile = Path.join(this.rootPath, 'dr.backup.package.json');
		if (backupFileContent) {
			fs.writeFileSync(backupFile, backupFileContent);
		} else {
			const buf = fs.readFileSync(Path.join(this.rootPath, 'package.json'));
			fs.writeFileSync(backupFile, buf);
		}
	}

	/**
	 * Get last changed package.json json from dr.package.json or memory
	 * @returns {JSON} a cloned package.json
	 */
	getChanges() {
		if (this.changes) {
			return clonePkJson(this.changes);
		}
		const lastChanged = Path.join(this.rootPath, 'dist', 'dr.package.json');
		if (fs.existsSync(lastChanged)) {
			const changedJson = JSON.parse(fs.readFileSync(lastChanged, 'utf8'));
			this.changes = changedJson;
			return clonePkJson(changedJson);
		}
		return {dependencies: {}, devDependencies: {}};
	}

	getJsonFile() {
		if (this.isPackageJsonDirty || !fs.existsSync(this.rootPath + '/dist/dr.package.json'))
			return this.rootPath + '/package.json';
		return Path.resolve(this.rootPath + '/dist/dr.package.json');
	}

	/**
	 * Mark changes without writing dr.package.json
	 * return a complete list of this time marked dependencies together with last time marked
	 * @param {object} pk package.json
	 * @return changed list [string, string][]
	 */
	markChanges(pk: PackageJson) {
		const changeList: Array<[string, string]> = [];
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
			for (const dep in pk.devDependencies) {
				if (has(pk.devDependencies, dep) && has(pk.dependencies, dep))
					delete pk.devDependencies[dep];
			}
		}
		const lastDeps = this.getChanges().dependencies;
		const lastDevDeps = this.getChanges().devDependencies;
		forChanges(lastDeps, pk.dependencies);
		forChanges(lastDevDeps, pk.devDependencies);

		function forChanges(lastDep: {[k: string]: string}, newDep: {[k: string]: string}) {
			if (newDep != null) {
				for (const dep in newDep) {
					if (!has(newDep, dep))
						continue;
					const ver = newDep[dep];
					if (lastDep[dep] !== ver) {
						changeList.push([dep, ver]); // new or changed dependency
					}
					delete lastDep[dep];
				}
			}
			const restLastDep = Object.keys(lastDep).map<[string, string]>(row => {
				return [row, lastDep[row]];
			});
			// Complete dependencies = new/changed + rest
			changeList.push(...restLastDep);
		}
		// pk.dependencies = originalDeps;
		this.changes = pk;
		return changeList;
	}

	isModulesChanged() {
		if (this.isNodeModulesChanged != null)
			return this.isNodeModulesChanged;
		try {
			const moduleDir = Path.resolve(this.rootPath, 'node_modules');
			if (this.installChecksum == null) {
				const lastCountFile = Path.join(this.rootPath, 'dist', 'dr.integrity.txt');
				if (!fs.existsSync(moduleDir) || !fs.existsSync(lastCountFile)) {
					this.isNodeModulesChanged = true;
					return true;
				}
				const checksumData = fs.readFileSync(lastCountFile, 'utf8').split(EOL);
				this.installChecksum = parseInt(checksumData[0], 10);
				this.lastInstalled = checksumData.slice(1);
			}
		} catch (err) {
			console.log(logName, err);
			this.isNodeModulesChanged = true;
			return true;
		}
		const installed = this._countPackages();
		const currChecksum = installed.join(EOL).length;
		if (currChecksum !== this.installChecksum) {
			console.log(logName + `Installation integrity checksum has changed from ${this.installChecksum} to ${currChecksum}`);
			const installedSet = new Set<string>();
			for (const name of installed) {
				installedSet.add(name);
			}
			if (this.lastInstalled) {
				for (const name of this.lastInstalled) {
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

	async installAsync(doNotMarkInstallNum = false, useYarn = false, onlyProd = false, isOffline = false) {
		this.offline = isOffline;
		fs.writeFileSync(Path.resolve(this.rootPath, 'package.json'),
			JSON.stringify(this.getChanges(), null, '  '));
		this.isPackageJsonDirty = true;
		const drcpLocation = Path.resolve('node_modules', 'dr-comp-package');
		const realDrcpPath = fs.realpathSync(drcpLocation);
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
		// var installProm;
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
		// installProm = Promise.resolve();
		// }
		const self = this;
		function recreateSymlink() {
			if (!fs.existsSync(Path.resolve('node_modules', 'dr-comp-package'))) {
				fs.symlinkSync(Path.relative('node_modules', realDrcpPath), drcpLocation, isWin32 ? 'junction' : 'dir');
				console.log(logName + 'Write symlink dr-comp-package');
			}
			if (!doNotMarkInstallNum)
				self.markInstallNum();
		}
		let res: string;
		try {
			res = await processUtils.exe(
				useYarn ? 'yarn' : 'npm', ...npmArgv, {cwd: this.rootPath,
					env: Object.assign({}, process.env, {NODE_ENV: 'development'})}
					).promise;
		} catch (err) {
			console.log('Sorry, yarn/npm install failed');
			console.log(err);
			throw err;
		}
		if (this.isDrcpSymlink) {
			await new Promise(resolve => setTimeout(() => resolve(res), 500));
			try {
				recreateSymlink();
			} catch (err) {
				recreateSymlink();
				throw err;
			}
		} else
			return res;
	}

	markInstallNum() {
		this.isNodeModulesChanged = null;
		const installed = this.lastInstalled = this._countPackages();
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
		// var count = 0;
		const packageNames = [];
		const moduleDir = Path.resolve(this.rootPath, 'node_modules');
		for (const fname of fs.readdirSync(moduleDir)) {
			if (fname.startsWith('@')) {
				const scopeDir = Path.resolve(moduleDir, fname);
				for (const subfname of fs.readdirSync(scopeDir)) {
					if (subfname.startsWith('.'))
						continue;
					if (fs.existsSync(Path.resolve(scopeDir, subfname, 'package.json')) &&
						!fs.lstatSync(Path.resolve(scopeDir, subfname)).isSymbolicLink()) {
						// count++;
						packageNames.push(fname + '/' + subfname);
					}
				}
			}
			if (fname.startsWith('.'))
				continue;
			if (fs.existsSync(Path.resolve(moduleDir, fname, 'package.json'))) {
				packageNames.push(fname);
				// count++;
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
		// fs.renameSync(Path.join(this.rootPath, 'package.json'), Path.join(this.rootPath, 'dr.package.json'));
		fs.renameSync(Path.join(this.rootPath, 'dr.backup.package.json'), Path.join(this.rootPath, 'package.json'));
		if (!this.offline && fs.existsSync(this.rootPath + '/yarn.lock')) {
			fs.createReadStream(this.rootPath + '/yarn.lock')
				.pipe(fs.createWriteStream(this.rootPath + '/dr.offline-yarn.lock'));
			console.log(logName + 'Write dr.offline-yarn.lock');
		}
		this.isPackageJsonDirty = false;
		this.changes = null;
		console.log(logName + 'Save to dist/dr.package.json, restore package.json from dr.backup.package.json');
	}

	afterChangeFail() {
		const pkfile = Path.join(this.rootPath, 'package.json');
		if (fs.existsSync(pkfile))
			fs.renameSync(pkfile, Path.join(this.rootPath, 'dr.fail.package.json'));
		fs.renameSync(Path.join(this.rootPath, 'dr.backup.package.json'), Path.join(this.rootPath, 'package.json'));
		this.isPackageJsonDirty = false;
		this.changes = null;
		console.log(logName + 'Restore package.json from dr.backup.package.json');
	}
}

export function getInstance(rootPath: string) {
	rootPath = Path.resolve(rootPath);
	var g = Guarder.instances[rootPath];
	if (g)
		return g;
	g = new Guarder(rootPath);
	Guarder.instances[rootPath] = g;
	return g;
}

function clonePkJson(obj: PackageJson): PackageJson {
	// mimic lodash deeply clone
	const cloned = Object.assign({}, obj);
	cloned.dependencies = Object.assign({}, obj.dependencies);
	cloned.devDependencies = Object.assign({}, obj.devDependencies);
	return cloned;
}

function has(obj: any, prop: string) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}
