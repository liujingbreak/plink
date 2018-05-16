/* eslint max-lines: "off", no-console: 0 */
var fs = require('fs-extra');
var Path = require('path');
var _ = require('lodash');
var chalk = require('chalk');
var shell = require('shelljs');
var Promise = require('bluebird');
var buildUtils = require('./buildUtils');
var PackageJsonGuarder = require('./packageJsonGuarder');

const isWin32 = require('os').platform().indexOf('win32') >= 0;
//var argv = require('../cmd-args'); //require('./showHelp');
var startTime;
module.exports = {
	//initGulpfile: initGulpfile,
	writeProjectListFile,
	getProjects: getProjectDirs,
	setStartTime
};

var cmdFunctions = {
	init,
	clean,
	install,
	addProject,
	removeProject,
	listProject,
	ls,
	compile,
	lint,
	publish,
	unpublish,
	bumpDirs,
	bumpProjects,
	runUnitTest,
	runE2eTest,
	tsc
};

var delegatedCmds = {};
_.each(cmdFunctions, (func, name) => {
	Object.defineProperty(module.exports, name, {
		get() {
			return function() {
				try {
					Promise.resolve(func.apply(this, arguments))
						.then(() => {
							var sec = Math.ceil((new Date().getTime() - startTime) / 1000);
							var min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
							console.log('Done in ' + min);
						})
						.catch(e => {
							console.error(e);
							var sec = Math.ceil((new Date().getTime() - startTime) / 1000);
							var min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
							console.log('Failed in ' + min);
							process.exit(1);
						});
				} catch (e) {
					console.error(e);
					console.log('Failed.');
					process.exit(1);
				}
			};
		}
	});
});

Object.assign(module.exports, delegatedCmds);

var rootPath = process.cwd();
var argv;

var packageJsonGuarder = PackageJsonGuarder(rootPath);
function init(_argv, noPuppy) {
	argv = _argv;
	maybeCopyTemplate(Path.resolve(__dirname, 'templates/config.local-template.yaml'), rootPath + '/config.local.yaml');
	fs.mkdirpSync(Path.join(rootPath, 'dist'));
	maybeCopyTemplate(Path.resolve(__dirname, 'templates/config.local-template.yaml'), Path.join(rootPath, 'dist', 'config.local.yaml'));
	maybeCopyTemplate(Path.resolve(__dirname, 'templates/log4js.js'), rootPath + '/log4js.js');
	maybeCopyTemplate(Path.resolve(__dirname, 'templates/app-template.js'), rootPath + '/app.js');
	maybeCopyTemplate(Path.resolve(__dirname, 'templates', 'module-resolve.server.tmpl.js '), rootPath + '/module-resolve.server.js');
	maybeCopyTemplate(Path.resolve(__dirname, 'templates', 'module-resolve.browser.tmpl.js'), rootPath + '/module-resolve.browser.js');


	packageJsonGuarder.beforeChange();
	var wi = new WorkspaceInstaller(null, argv.offline);
	var initProm = Promise.resolve(wi.run(packageJsonGuarder.isModulesChanged()));
	return initProm.then(() => {
		packageJsonGuarder.afterChange();
		if (!noPuppy)
			_drawPuppy();
	})
		.catch(err => {
			packageJsonGuarder.afterChangeFail();
			throw err;
		});
}

class WorkspaceInstaller {
	constructor(isDrcpSymlink, isOffline) {
		this.isDrcpSymlink = isDrcpSymlink;
		//this.installed = false;
		this.isOffline = isOffline;
	}

	run(forceInstall) {
		var helper = require('./cliAdvanced');
		// mkdirp(Path.join(rootPath, 'node_modules'));
		if (this.isDrcpSymlink == null)
			this.isDrcpSymlink = fs.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink();

		// logs
		shell.mkdir('-p', Path.join(rootPath, 'logs'));
		var self = this;
		return Promise.coroutine(function*() {
			var needRunInstall = yield _initDependency(self.isDrcpSymlink);
			if (forceInstall || needRunInstall) {
				//this.installed = true;
				return yield packageJsonGuarder.installAsync(false, self.isOffline)
					.then(() => self.run(false));
			}
			packageJsonGuarder.markInstallNum();
			yield helper.addupConfigs((file, configContent) => {
				// writeFile(file, '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
				writeFile(Path.resolve(rootPath || process.cwd(), 'dist', file),
					'\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
			});
			argv['package-cache'] = false;
			return yield require('../packageMgr/packageRunner').runBuilder(argv, 'init', true);
		})();
	}
}

function _initDependency(isDrcpSymlink) {
	var rm = require('./recipeManager');
	var helper = require('./cliAdvanced');
	var nodePath = fs.realpathSync(Path.resolve(rootPath, 'node_modules'));
	// Create project folder node_modules
	listProject().forEach(prjdir => {
		_writeGitHook(prjdir);
		maybeCopyTemplate(Path.resolve(__dirname, '../../.eslintrc.json'), prjdir + '/.eslintrc.json');
		maybeCopyTemplate(Path.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
		let moduleDir = Path.resolve(prjdir, 'node_modules');
		let needCreateSymlink = false;
		let stats;

		try {
			stats = fs.lstatSync(moduleDir);
			if (stats.isSymbolicLink() || stats.isDirectory() || stats.isFile()) {
				if (!fs.existsSync(moduleDir) || fs.realpathSync(moduleDir) !== nodePath) {
					if (stats.isSymbolicLink())
						fs.unlinkSync(moduleDir);
					else {
						if (fs.existsSync(moduleDir + '.bak'))
							fs.removeSync(moduleDir + '.bak');
						fs.renameSync(moduleDir, moduleDir + '.bak');
						console.log(`Backup "${moduleDir}" to "${moduleDir}.bak"`);
					}
					needCreateSymlink = true;
				}
			} else
				needCreateSymlink = true;
		} catch (e) {
			// node_modules does not exists, fs.lstatSync() throws error
			needCreateSymlink = true;
		}
		if (needCreateSymlink) {
			console.log('Create symlink "%s"', Path.resolve(prjdir, 'node_modules'));
			fs.symlinkSync(Path.relative(prjdir, fs.realpathSync(nodePath)), moduleDir, isWin32 ? 'junction' : 'dir');
		}
	});

	return Promise.coroutine(function*() {
		var pkJsonFiles = yield rm.linkComponentsAsync();
		if (isDrcpSymlink) {
			console.log('node_modules/dr-comp-package is symbolic link, add its dependencies to %s', chalk.cyan(Path.resolve('package.json')));
			pkJsonFiles.push(Path.resolve('node_modules', 'dr-comp-package', 'package.json'));
		}
		var needRunInstall = helper.listCompDependency(pkJsonFiles, true, isDrcpSymlink);
		return needRunInstall;
	})()
		.catch(err => {
			console.error(chalk.red(err), err.stack);
			throw err;
		});
}

function _writeGitHook(project) {
	// if (!isWin32) {
	var gitPath = Path.resolve(project, '.git/hooks');
	if (fs.existsSync(gitPath)) {
		var hookStr = '#!/bin/sh\n' +
			`cd "${rootPath}"\n` +
			'drcp init\n' +
			`drcp lint --pj "${project}"\n`;
		fs.writeFileSync(gitPath + '/pre-commit', hookStr);
		console.log('Write ' + gitPath + '/pre-commit');
		if (!isWin32)
			shell.chmod('-R', '+x', project + '/.git/hooks/*');
	}
	// }
}

function addProject(_argv, dirs) {
	writeProjectListFile(dirs);
	return Promise.resolve(require('../config').reload())
		.then(() => init(_argv))
		.catch(e => {
			console.log('Roll back dr.project.list.json');
			fs.renameSync(Path.join(rootPath, 'dr.project.list.json.bak'), Path.join(rootPath, 'dr.project.list.json'));
			throw e;
		});
}

function writeProjectListFile(dirs) {
	if (rootPath == null)
		rootPath = process.cwd();
	var projectListFile = Path.join(rootPath, 'dr.project.list.json');
	if (fs.existsSync(projectListFile))
		fs.copySync(Path.join(rootPath, 'dr.project.list.json'), Path.join(rootPath, 'dr.project.list.json.bak'));
	var prj;
	if (fs.existsSync(projectListFile)) {
		prj = JSON.parse(fs.readFileSync(projectListFile, 'utf8'));
		let toAdd = _.differenceBy(dirs, prj, dir => Path.resolve(dir));
		if (toAdd.length > 0) {
			prj.push(...toAdd);
			writeFile(projectListFile, JSON.stringify(prj, null, '  '));
		}
	} else {
		prj = [...dirs];
		writeFile(projectListFile, JSON.stringify(prj, null, '  '));
	}
}

function ls(_argv) {
	argv = _argv;
	var config = require('../config');
	require('../logConfig')(config().rootPath);
	// require('log4js').getLogger('lib.injector').setLevel('warn');
	// require('log4js').getLogger('packagePriorityHelper').setLevel('warn');
	var rj = require('../injectorFactory');
	var injector = rj(require.resolve);
	injector.fromPackage('@dr-core/build-util')
		.factory('__api', function() {
			return {compileNodePath: [config().nodePath]};
		});

	return Promise.coroutine(function*() {
		var browserCompInfo = require('@dr-core/build-util').walkPackages.listBundleInfo(
			config, argv, require('../packageMgr/packageUtils'));
		console.log(chalk.green(_.pad('[ BROWSER COMPONENTS ]', 50, '=')));
		var index = 0;
		var sorted = browserCompInfo.allModules.slice(0).sort((a, b) => b.longName.length - a.longName.length);
		var maxNameLen = sorted[0].longName.length;

		_.each(browserCompInfo.bundleMap, (packages, bundle) => {
			console.log(chalk.cyan('Webpack chunk ' + _.pad(' ' + bundle + ' ', 50, '-')));
			_.each(packages, pk => {
				if (pk.isOtherEntry)
					return;
				var path = pk.realPackagePath ? pk.realPackagePath : pk.packagePath;
				console.log(' ' + (++index) + '. ' + _.padEnd(pk.longName, maxNameLen + 3) +
					(path ? chalk.blue(Path.relative(config().rootPath, path)) : ''));
			});
		});

		if (_.size(browserCompInfo.noChunkPackageMap) > 0) {
			console.log('No bundle setting packages: ');
			_.each(browserCompInfo.noChunkPackageMap, pk => {
				if (pk.isOtherEntry)
					return;
				var path = pk.realPackagePath ? pk.realPackagePath : pk.packagePath;
				console.log(' ' + (++index) + '. ' + _.padEnd(pk.longName, maxNameLen + 3) +
					(path ? chalk.blue(Path.relative(config().rootPath, path)) : ''));
			});
		}

		console.log('\n' + chalk.green(_.pad('[ SERVER COMPONENTS ]', 50, '=')) + '\n');
		var list = yield require('../packageMgr/packageRunner').listServerComponents();
		list.forEach(row => console.log(' ' + row.desc + '   ' + chalk.blue(Path.relative(config().rootPath, row.pk.path))));
		console.log('');
		console.log('\n' + chalk.green(_.pad('[ BUILDER COMPONENTS ]', 50, '=')) + '\n');
		list = yield require('../packageMgr/packageRunner').listBuilderComponents();
		list.forEach(row => console.log(' ' + row.desc + '   ' + chalk.blue(Path.relative(config().rootPath, row.pk.path))));
	})();
}

function removeProject(_argv, dirs) {
	argv = _argv;
	var projectListFile = Path.join(rootPath, 'dr.project.list.json');
	if (fs.existsSync(projectListFile)) {
		console.log('Removing project: %s', dirs.join(', '));
		var prjs = JSON.parse(fs.readFileSync(projectListFile, 'utf8'));
		prjs = _.differenceBy(prjs, dirs, dir => Path.resolve(dir));
		var str = JSON.stringify(prjs, null, '  ');
		writeFile(projectListFile, str);
		listProject(_argv, prjs);
	}
}

function listProject(_argv, projects) {
	if (_argv)
		argv = _argv;
	var projectListFile = Path.join(rootPath, 'dr.project.list.json');
	if (projects == null && fs.existsSync(projectListFile))
		projects = require(projectListFile);
	if (projects && projects.length > 0) {
		console.log(_.pad(' Projects directory ', 40, '-'));
		//var nameLen = _.maxBy(projects, dir => dir.length).length + 3;
		_.each(projects, (dir, i) => {
			dir = Path.resolve(rootPath, dir);
			console.log(_.padEnd(i + 1 + '. ', 5, ' ') + dir);
			//return _updateProjectFolder(dir);
		});
		return projects;
	} else {
		console.log('No projects');
		return [];
	}
}

function getProjectDirs(_rootPath) {
	var projectListFile = Path.join(_rootPath || rootPath, 'dr.project.list.json');
	var proList = [];
	if (fs.existsSync(projectListFile)) {
		var projects = require(projectListFile);
		proList = _.map(projects, dir => Path.resolve(_rootPath || rootPath, dir));
	}
	return proList;
}

function install(isDrcpSymlink) {
	if (isDrcpSymlink === undefined)
		isDrcpSymlink = fs.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink();

	var drcpLocation = Path.resolve('node_modules', 'dr-comp-package');
	var realDrcpPath;
	if (isDrcpSymlink)
		realDrcpPath = fs.realpathSync(drcpLocation);
	return buildUtils.promisifyExe('yarn', 'install', '--non-interactive', '--pure-lockfile', {cwd: rootPath})
		.then(res => new Promise(resolve => setTimeout(() => resolve(res), 500)))
		.then(res => {
			if (isDrcpSymlink && !fs.existsSync(drcpLocation)) {
				fs.symlinkSync(Path.relative('node_modules', realDrcpPath), drcpLocation, isWin32 ? 'junction' : 'dir');
				console.log('Write symlink dr-comp-package');
			}
			return res;
		});
}

function clean(_argv) {
	argv = _argv;
	// if (!fs.existsSync(rootPath + '/config.yaml'))
	// 	return;
	var drcpFolder = Path.resolve('node_modules', 'dr-comp-package');

	return require('./cliAdvanced').clean()
		.then(() => {
			if (fs.lstatSync(drcpFolder).isSymbolicLink())
				removeProject(_argv, [fs.realpathSync(drcpFolder)]);

			getProjectDirs().forEach(prjdir => {
				let moduleDir = Path.resolve(prjdir, 'node_modules');
				try {
					if (fs.lstatSync(moduleDir).isSymbolicLink() &&
						fs.realpathSync(moduleDir) === Path.resolve(rootPath, 'node_modules'))
						fs.unlinkSync(moduleDir);
				} catch (e) {
					if (fs.existsSync(moduleDir))
						fs.unlinkSync(moduleDir);
				}
			});
			fs.remove(Path.resolve(rootPath, 'config.yaml'));
			fs.remove(Path.resolve(rootPath, 'config.local.yaml'));
		});
}

function compile(_argv) {
	return init(_argv, true)
		.then(() => require('../config').reload())
		.then(() => require('../packageMgr/packageRunner').runBuilder(_argv));
}

function tsc(_argv, onCompiled) {
	return require('../typescript/ts-cmd').tsc(_argv, onCompiled);
}

function lint(_argv) {
	return require('./cliAdvanced').lint(_argv);
	// return init(_argv)
	// .then(() => require('./cliAdvanced').lint(_argv));
}

function publish(_argv) {
	return require('./cliAdvanced').publish(_argv);
}

function unpublish(_argv) {
	return require('./cliAdvanced').unpublish(_argv);
}

function bumpDirs(dirs, versionType) {
	return require('./cliAdvanced').bumpDirsAsync(dirs, versionType);
}

function bumpProjects(projects, versionType) {
	return require('./cliAdvanced').bumpProjectsAsync(projects, versionType);
}

function runUnitTest(_argv) {
	return require('./testRunner').runUnitTest(_argv);
}

function runE2eTest(_argv) {
	return require('./testRunner').runE2eTest(_argv);
}

function writeFile(file, content) {
	fs.writeFileSync(file, content);
	console.log('%s is written', chalk.cyan(Path.relative(rootPath, file)));
}

function cp(from, to) {
	if (_.startsWith(from, '-')) {
		from = arguments[1];
		to = arguments[2];
	}
	shell.cp(...arguments);
	if (/[/\\]$/.test(to))
		to = Path.basename(from); // to is a folder
	else
		to = Path.relative(rootPath, to);
	console.log('copy to %s', chalk.cyan(to));
}

function maybeCopyTemplate(from, to) {
	if (!fs.existsSync(Path.resolve(rootPath, to)))
		cp(Path.resolve(__dirname, from), to);
}

function _drawPuppy(slogon, message) {
	if (!slogon)
		slogon = 'Congrads! Time to publish your shit!';

	console.log(chalk.magenta('\n   ' + _.repeat('-', slogon.length) + '\n' +
		` < ${slogon} >\n` +
		'   ' + _.repeat('-', slogon.length) + '\n' +
		'\t\\   ^__^\n\t \\  (oo)\\_______\n\t    (__)\\       )\\/\\\n\t        ||----w |\n\t        ||     ||'));
	if (message)
		console.log(message);
}

function setStartTime(time) {
	if (startTime == null)
		startTime = time;
}

