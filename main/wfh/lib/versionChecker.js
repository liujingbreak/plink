/* eslint no-console: 0 */
var fs = require('fs');
var Path = require('path');
var os = require('os');
const cacheFile = Path.resolve(os.tmpdir(), 'drcpLatestVersion.json');
var processUtils = require('../dist/process-utils');
const INTERNAL_RECIPE_VER = '0.7.9';

exports.checkVersions = checkVersions;

var versionsFromCache = false;
var cachedVersionsInfo = readCachedVersionInfo();

function checkVersions(isSymbolicLink) {
	const {red, yellow, green} = require('chalk'); // do not require any 3rd-party util bin/dr.js installDeps() is done
	var _ = require('lodash');
	var buildUtils = require('./gulp/buildUtils');
	// var osLocale = require('os-locale');
	var semver = require('semver');
	const PAD_SPACE = 28;

	return Promise.all([buildUtils.getNpmVersion(),
		getLatestDrcpVer(),
		getLatestRecipeVer('@wfh/runtime-recipe'),
		getLatestRecipeVer('@wfh/internal-recipe')
	])
	.then(outputs => {
		var sline = _.repeat('-', 60);
		var infoText = sline;
		var drcpVer = getVersion();

		var latestDrcp = outputs[1];

		var isDrcpOutdated = latestDrcp && semver.gt(latestDrcp, drcpVer);

		infoText += '\n' + _.padStart('Node.js version: ', PAD_SPACE) + green(process.version);
		infoText += '\n' + _.padStart('NPM version: ', PAD_SPACE) + green(outputs[0]);
		infoText += '\n' + _.padStart('dr-comp-package version: ', PAD_SPACE) + green(drcpVer) +
			(isSymbolicLink ? green(' (symlink)') : '') +
			(isDrcpOutdated ? yellow(` (latest: ${latestDrcp})`) : ` (published: ${latestDrcp}) `);

		let runtimeVer = getRecipeVersion('@wfh/runtime-recipe');
		if (runtimeVer) {
			infoText += '\n' + _.padStart('@wfh/runtime-recipe version: ', PAD_SPACE) + green(runtimeVer) +
				((runtimeVer && outputs[2] && semver.lt(runtimeVer, outputs[2])) ? yellow(`(latest: ${outputs[2]})`) : '');
		} else if (!isSymbolicLink) {
			infoText += '\n' + red('Missing @wfh/runtime-recipe, Need to install it.');
		}
		let recipeVer = getRecipeVersion('@wfh/internal-recipe');
		if (recipeVer) {
			infoText += '\n' + _.padStart('@wfh/internal-recipe version: ', PAD_SPACE) + green(recipeVer) +
				((recipeVer && outputs[3] && semver.lt(recipeVer, outputs[3])) ? yellow(`(latest: ${outputs[3]})`) : '');
		}

		infoText += '\n' + sline;
		if (latestDrcp)
			cacheVersionInfo(latestDrcp, {'@wfh/runtime-recipe': outputs[2], '@wfh/internal-recipe': outputs[3]});
		return infoText;
	});
}

function cacheVersionInfo(latestDrcpVer, recipeVersions) {
	if (versionsFromCache)
		return;
	fs.writeFileSync(cacheFile, JSON.stringify({
		drcpVersion: latestDrcpVer,
		recipeVersions,
		date: new Date().toDateString()
	}, null, '  '));
}

function getVersion() {
	var path = Path.resolve(__dirname, '..', '..', 'package.json');
	return require(path).version;
}

function getRecipeVersion(recipeName) {
	try {
		return require(recipeName + '/package.json').version;
	} catch (e) {
		return null;
	}
}

var npmViewReg = /latest:[^"']*['"]([^"']+)['"]/; // Adaptive to npm 5.x and yarn
var npm6ViewReg = /latest:\s*(\S+)/;

function getLatestRecipeVer(recipeName) {
	if (cachedVersionsInfo)
		return Promise.resolve(cachedVersionsInfo.recipeVersions ? cachedVersionsInfo.recipeVersions[recipeName] : INTERNAL_RECIPE_VER);
	console.log(`Check ${recipeName} version`);
	return processUtils.promisifyExe('npm', 'info', recipeName, {cwd: process.cwd(), silent: true, timeout: 8000})
		.then(output => {
			var m = npmViewReg.exec(output);
			return (m && m[1]) ? m[1] : INTERNAL_RECIPE_VER;
		})
		.catch(e => {
			console.error('[WARN] Command "' + ['npm', 'info', recipeName].join(' ') + '" timeout');
			return INTERNAL_RECIPE_VER;
		});
}

function getLatestDrcpVer() {
	if (cachedVersionsInfo)
		return Promise.resolve(cachedVersionsInfo.drcpVersion);
	return processUtils.promisifyExe('npm', 'info', 'dr-comp-package', {cwd: process.cwd(), silent: true, timeout: 8000})
		.then(output => {
			output = output.replace(/(\[[0-9]+m|\u{001b})/ug, '');
			var m = npmViewReg.exec(output);
			if (m == null) {
				m = npm6ViewReg.exec(output);
			}
			return (m && m[1]) ? m[1] : null;
		})
		.catch(e => {
			console.error('[WARN] Command "' + ['npm', 'info', 'dr-comp-package'].join(' ') + '" timeout');
			return null;
		});
}

function readCachedVersionInfo() {
	if (fs.existsSync(cacheFile)) {
		try {
			var json = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
			if (json.date === new Date().toDateString()) {
				versionsFromCache = true;
				return json;
			}
		} catch (e) {
			return null;
		}
	}
	return null;
}
