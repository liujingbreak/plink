/**
 * At the beginning, I designed this platform running on Node 5.x with NPM 3.x environment.
 * which has a flat node_modules structure, I forgot to consider NPM 2.x 's nested
 * node_modules structure issue.
 *
 * So, this file helps to resolve NPM 2.x's nested node_modules structure issue,
 * and some dependencies conflict check function.
 */
var fs = require('fs');
var _ = require('lodash');
var del = require('del');
var mkdirp = require('mkdirp');
var chalk = require('chalk');
var Path = require('path');
var config = require('../config');
// var glob = require('glob');
// var recipeManager = require('./recipeManager');
var log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
var semver = require('semver');
var packageUtils = require('../packageMgr/packageUtils');
var getPackageJsonGuarder = require('./packageJsonGuarder');
var recipeManager = require('./recipeManager');

exports.listCompDependency = listCompDependency;

/**
 * @return true if there are newly found dependencies added to package.json
 */
function listCompDependency(pkJsonFiles, write, isDrcpSymlink) {
	log.info('scan components from:\n', pkJsonFiles.join('\n'));
	var installer = new InstallManager();
	installer.scanSrcDeps(pkJsonFiles);
	installer.scanInstalledPeerDeps();
	return installer.printComponentDep(write, isDrcpSymlink);
}

class InstallManager {
	constructor() {
		if (!(this instanceof InstallManager)) {
			return new InstallManager();
		}
		this.srcDeps = {}; // src packages needed dependencies and all packages needed peer dependencies
		//this.peerDeps = {}; // all packages needed peer dependencies
		this.versionReg = /^(\D*)(\d.*?)$/;
	}

	scanSrcDeps(jsonFiles) {
		var self = this;
		this.componentMap = {};
		for (let packageJson of jsonFiles) {
			log.debug('scanSrcDepsAsync() ' + Path.relative(config().rootPath, packageJson));
			var json = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
			if (!json.dr)
				continue;
			this.componentMap[json.name] = {ver: json.version, toInstall: false};
			var deps = json.dependencies;
			if (deps) {
				for (let name of Object.keys(deps)) {
					let version = deps[name];
					//log.debug('scanSrcDepsAsync() dep ' + name);
					self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
				}
			}
			if (json.devDependencies) {
				// log.warn(`$${json.name} contains "devDepenendies", if they are necessary for compiling this component` +
				// 	'you should move them to "dependencies" or "peerDependencies"');
				for (let name of Object.keys(json.devDependencies)) {
					let version = json.devDependencies[name];
					self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
				}
			}
			if (json.peerDependencies) {
				for (let name of Object.keys(json.peerDependencies)) {
					let version = json.peerDependencies[name];
					self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
				}
			}
		}
	}

	scanInstalledPeerDeps() {
		// TODO: Here I want to determine expected component version to install with, but so far the version number of each component that I get is currently installed
		// one which might be incorrect or outdated, in case like developer did not run "yarn install" before "drcp init".
		// One problem is: 
		// Without running "yarn install" to download "recipe" package, I can't know exact up to date version number of those components
		// which belong to a certain "recipe" pacakge.
		// So firstly, always "yarn install" before "drcp init"

		// Another problem is:
		// These old component versions are tracked in dist/dr.package.json waiting for being compared with newly changed version list.
		// But ...
		packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
			if (_.has(this.componentMap, name))
				return; // Skip it, since most likely there is a duplicate "installed" dependency in package.json against an symbolic linked component
			this.componentMap[name] = {ver: json.version, toInstall: true};
			_.each(json.peerDependencies, (version, name) => {
				this._trackDependency(this.srcDeps, name, version, json.name, Path.join(packagePath, 'package.josn'));
			});
		}, 'installed');
	}

	_trackDependency(trackTo, name, version, byWhom, path) {
		if (!_.has(trackTo, name)) {
			trackTo[name] = [];
		}
		var m = this.versionReg.exec(version);
		trackTo[name].push({
			ver: version === '*' || version === '' ? 'latest' : version,
			verNum: m ? m[2] : null,
			pre: m ? m[1] : '',
			by: byWhom,
			path
		});
	}

	printDep() {
		this.printComponentDep(false);
	}

	_containsDiffVersion(sortedVersions) {
		//var self = this;
		for (let i = 0, l = sortedVersions.length - 1; i < l; i++) {
			let a = sortedVersions[i].ver;
			let b = sortedVersions[i + 1].ver;

			if (b === '*' || b === '')
				continue;
			if (a !== b)
				return true;
		}
		return false;
	}

	/**
	 * @return true if there are newly found dependencies added to package.json
	 */
	printComponentDep(write, isDrcpSymlink) {
		var self = this;
		var rootPath = config().rootPath;
		var packageJsonGuarder = getPackageJsonGuarder(rootPath);
		var mainPkjson, mainDeps;

		if (!packageJsonGuarder.isPackageJsonDirty) {
			var mainPkFile = Path.resolve(rootPath, 'package.json');
			log.info('Checking', mainPkFile);
			mainPkjson = JSON.parse(fs.readFileSync(mainPkFile, 'utf8'));
			mainDeps = mainPkjson.dependencies;
			if (mainDeps == null)
				mainDeps = mainPkjson.dependencies = {};
			if (process.env.NODE_ENV === 'development')
				_.assign(mainDeps, mainPkjson.devDependencies);
			_.each(packageJsonGuarder.getChanges().dependencies, (ver, name) => {
				// If there is a same dependency in original package.json, we use the version of that one, cuz' that might be manually set
				if (!_.has(mainDeps, name))
					mainDeps[name] = ver;
			});
		} else {
			mainPkjson = packageJsonGuarder.getChanges();
			mainDeps = mainPkjson.dependencies;
		}

		var depNames = Object.keys(this.srcDeps);
		depNames.sort();
		//var peerDepNames = Object.keys(this.peerDeps);
		if (depNames.length === 0)
			return;
		var nameWidth = _.maxBy(depNames, name => name.length).length;

		// log.warn(Object.keys(this.componentMap));

		if (depNames.length > 0) {
			let printOut = _.pad(' Associated Components Dependencies & ' + chalk.cyan('Components Peer Dependencies'), 60, '-') + '\n';
			printOut += _.padStart('Dependency ', nameWidth + 13) + '| By\n';
			printOut += _.repeat('-', nameWidth + 13) + '|' + _.repeat('-', 10) + '\n';
			let countDep = 0;
			for (let name of depNames) {
				let versionList = this.srcDeps[name];
				let firstVersion = self.sortByVersion(versionList, name)[0];
				let markNew = '  ';
				if (name !== '@dr/internal-recipe' && (!_.has(this.componentMap, name)) &&
					(mainDeps[name] !== firstVersion.ver)) {
					mainDeps[name] = firstVersion.ver;
					markNew = '+ ';
				}

				let hasDiffVersion = self._containsDiffVersion(versionList);
				let printName = (hasDiffVersion ? chalk.red : chalk.cyan)(_.padStart(markNew + name, nameWidth, ' '));
				printOut += `${printName} ${versionList.length > 1 ? '─┬─' : '───'}${_.padEnd(firstVersion.ver, 9, '─')} ${firstVersion.by}\n`;
				var i = versionList.length - 1;
				for (let rest of versionList.slice(1)) {
					printOut += `${_.repeat(' ', nameWidth)} ${i === 1 ? ' └─' : ' ├─'}${_.padEnd(rest.ver, 9, '─')} ${rest.by}\n`;
					i--;
				}
				countDep++;
			}
			printOut += _.pad(` total ${chalk.green(countDep)} `, 60, '-');
			log.info(printOut);
		}
		mkdirp.sync(config().destDir);
		if (write) {
			//_.assign(mainPkjson.dependencies, newDepJson);
			_.each(mainDeps, (ver, name) => {
				if (_.get(this.componentMap, [name, 'toInstall']) === false) {
					delete mainDeps[name];
					log.info(chalk.blue('Remove source linked dependency: ' + name));
				}
			});
			recipeManager.eachRecipeSrc((srcDir, recipeDir, recipeName) => {
				if (recipeName && _.has(mainDeps, recipeName)) {
					delete mainDeps[recipeName];
					log.info(chalk.blue('Remove recipe dependency: ' + recipeName));
				}
			});
			var changeList = packageJsonGuarder.markChanges(mainPkjson);
			var needInstall = _.size(changeList) > 0;
			if (needInstall) {
				let changed = [];
				let removed = [];
				for (let row of changeList) {
					if (row[1] == null)
						removed.push(row[0]);
					else
						changed.push(row[0] + '@' + row[1]);
				}
				if (changed.length > 0)
					log.info('Changed dependencies:', changed.join(', '));
				if (removed.length > 0)
					log.info(chalk.blue('Removed dependencies:'), removed.join(', '));
			}
			// fs.writeFileSync(mainPkFile, JSON.stringify(mainPkjson, null, '  '));
			// log.info('%s is written.', mainPkFile);
			return needInstall;
		}
		return false;
	}

	/**
	 * Sort by descending
	 * @param verInfoList {ver: string, by: string, name: string}
	 */
	sortByVersion(verInfoList, name) {
		if (verInfoList == null)
			return verInfoList;
		try {
			verInfoList.sort((info1, info2) => {
				if (info1.verNum != null && info2.verNum != null) {
					let res = semver.rcompare(info1.verNum, info2.verNum);
					if (res === 0)
						return info1.pre === '' && info2.pre !== '' ? -1 :
							(info1.pre !== '' && info2.pre === '' ? 1 : 0);
					else
						return res;
				} else if (info1.verNum != null && info2.verNum == null)
					return -1;
				else if (info2.verNum != null && info1.verNum == null)
					return 1;
				else if (info1.ver > info2.ver)
					return -1;
				else if (info1.ver < info2.ver)
					return 1;
				else
					return 0;
			});
		} catch (e) {
			log.error(`Invalid semver format for ${name || ''}: ` + JSON.stringify(verInfoList, null, '  '));
			throw e;
		}
		return verInfoList;
	}
}

InstallManager.fileExists = fileExists;
InstallManager.moveFile = moveFile;

function fileExists(file) {
	try {
		fs.accessSync(file, fs.R_OK);
		return true;
	} catch (e) {
		return false;
	}
}

function moveFile(src, target) {
	try {
		if (fileExists(target)) {
			var targetMtime = fs.statSync(target).mtime.getTime();
			var srcMtime = fs.statSync(src).mtime.getTime();
			if (srcMtime > targetMtime) {
				log.info('move ' + Path.relative(config().rootPath, src) + '\nto ' +
					Path.relative(config().rootPath, target));
				del.sync(target);
				mkdirp.sync(Path.dirname(target));
				fs.renameSync(src, target);
			}
		} else {
			log.info('move ' + src + ' to ' + target);
			mkdirp.sync(Path.dirname(target));
			fs.renameSync(src, target);
		}
	} catch (err) {
		log.error(err);
		if (err.toString().indexOf('EPERM') > 0 ) {
			log.error('Please try this command again.');
		}
		throw err;
	}
}

InstallManager.prototype = {
	versionReg: /^(\D*)(\d.*?)$/,


};
