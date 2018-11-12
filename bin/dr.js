#!/usr/bin/env node
/* eslint no-console:0 */
var Path = require('path');
var fs = require('fs');
var os = require('os');
var versionChecker = require('../wfh/lib/versionChecker');
//var processUtils = require('../wfh/lib/gulp/processUtils');
var getGuarder = require('../wfh/dist/package-json-guarder').getInstance;

var drcpPkJson = require('../package.json');
//const isWin32 = require('os').platform().indexOf('win32') >= 0;

process.on('SIGINT', function() {
	console.log('Recieve SIGINT, bye.');
	process.exit(0);
});
process.on('message', function(msg) {
	if (msg === 'shutdown') {
		console.log('Recieve shutdown message from PM2, bye.');
		process.exit(0);
	}
});
var startTime = new Date().getTime();
var cwd = process.cwd();
var packageJsonGuarder = getGuarder(cwd);
//process.env.SASS_BINARY_SITE = 'https://npm.taobao.org/mirrors/node-sass';


var isSymbolicLink = false;
var cmdPromise;
if (fs.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink()) {
	isSymbolicLink = true;
	cmdPromise = ensurePackageJsonFile(isSymbolicLink)
		.then(latestRecipe => versionChecker.checkVersions(isSymbolicLink))
	.then( infoText => {
		require('../wfh/lib/gulp/cli').writeProjectListFile([Path.resolve(__dirname, '..')]);
		return infoText;
	})
	.then(infoText => processCmd(infoText));
} else {
	cmdPromise = ensurePackageJsonFile(false)
		.then(latestRecipe => versionChecker.checkVersions(isSymbolicLink))
	.then(infoText => processCmd(infoText));
}
cmdPromise.catch(e => {
	console.error(e);
	process.exit(1);
});

/**
 * @param {*} isDrcpDevMode denote true to copy dr-comp-package dependency list to workspace package.json file
 * @return true if workspace package.json file is changed
 */
function ensurePackageJsonFile(isDrcpDevMode) {
	var workspaceJson;
	var needCreateFile = false;
	var backupJson = null;
	var needInstall = false;
	if (fs.existsSync('dr.backup.package.json')) {
		console.log('Found "dr.backup.package.json", will recover package.json from dr.backup.package.json');
		fs.unlinkSync('package.json');
		fs.renameSync('dr.backup.package.json', 'package.json');
	}
	if (!fs.existsSync('package.json')) {
		console.log('Creating package.json');
		needCreateFile = true;
		workspaceJson = JSON.parse(fs.readFileSync(
			Path.resolve(__dirname, './package.json.template'), 'utf8'));
		workspaceJson.author = os.userInfo().username;
		workspaceJson.name = Path.basename(cwd);
		workspaceJson.description = '@dr web component platform workspace';
		backupJson = JSON.stringify(workspaceJson, null, '  ');
	} else {
		workspaceJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
	}
	if (!workspaceJson.dependencies)
		workspaceJson.dependencies = {};
	if (isDrcpDevMode) {
		needInstall = needInstallWfh(workspaceJson);
	}
	if (needCreateFile)
		fs.writeFileSync(Path.join(cwd, 'package.json'), backupJson);
	if (needInstall) {
		removeProjectSymlink();
		packageJsonGuarder.beforeChange();
		return packageJsonGuarder.installAsync(false, process.argv.some(arg => arg === '--yarn'), process.argv.some(arg => arg === '--offline'))
		.then(() => packageJsonGuarder.afterChange())
		.catch(err => {
			packageJsonGuarder.afterChangeFail();
			throw err;
		});
	}
	return Promise.resolve(null);
}

function removeProjectSymlink() {
	let projects;
	var projectListFile = Path.join(process.cwd(), 'dr.project.list.json');
	if (fs.existsSync(projectListFile))
		projects = require(projectListFile);
	if (projects && projects.length > 0) {
		for (let prjdir of projects) {
			let moduleDir = Path.resolve(prjdir, 'node_modules');
			try {
				let stats = fs.lstatSync(moduleDir);
				if (stats.isSymbolicLink()) {
					fs.unlinkSync(moduleDir);
				}
			} catch (e) {}
		}
	}
}

function needInstallWfh(workspaceJson) {
	var newWorkspaceJson = Object.assign({}, workspaceJson);
	var currDeps = packageJsonGuarder.getChanges().dependencies;
	newWorkspaceJson.dependencies = Object.assign({}, drcpPkJson.dependencies, currDeps);

	var newAdds = packageJsonGuarder.markChanges(newWorkspaceJson);
	for (let entry of newAdds) {
		console.log(` ${entry[1] != null ? '+' : '-'} ${entry[0]} ${entry[1] || ''}`);
	}
	return newAdds.length > 0 || packageJsonGuarder.isModulesChanged();
}

function processCmd(versionText) {
	console.log(versionText);
	require('source-map-support/register');
	return require('../wfh/lib/cmd-args').drcpCommand(startTime);
}


