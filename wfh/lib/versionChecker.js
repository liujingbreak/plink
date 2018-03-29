/* eslint no-console: 0 */
var fs = require('fs');
var Path = require('path');
var os = require('os');
const cacheFile = Path.resolve(os.tmpdir(), 'drcpLatestVersion.json');
var processUtils = require('./gulp/processUtils');
const INTERNAL_RECIPE_VER = '0.7.6';

exports.checkVersions = checkVersions;
exports.getLatestRecipeVer = getLatestRecipeVer;

var versionsFromCache = false;
var cachedVersionsInfo = readCachedVersionInfo();


function checkVersions(latestRecipe, isSymbolicLink) {
	var chalk = require('chalk'); // do not require any 3rd-party util bin/dr.js installDeps() is done
	var _ = require('lodash');
	var buildUtils = require('./gulp/buildUtils');
	var osLocale = require('os-locale');
	var semver = require('semver');
	const PAD_SPACE = 28;

	return Promise.all([buildUtils.getYarnVersion(), getLatestDrcpVer(), osLocale()])
		.then(outputs => {
			var sline = _.repeat('-', 60);
			var infoText = sline;
			var drcpVer = getVersion();
			var recipeVer = getRecipeVersion();
			var latestDrcp = outputs[1];

			var isDrcpOutdated = latestDrcp && semver.gt(latestDrcp, drcpVer);
			var isRecipeOutdated = recipeVer && latestRecipe && semver.lt(recipeVer, latestRecipe);
			// infoText += '\n' + _.padStart('Latest dr-comp-package: ' + chalk.yellow(latestDrcp), PAD_SPACE);
			// //let msg = outputs[2].startsWith('zh') ? '\n当前Workspace下的drcp不是最新的, 如果升级执行命令:\n\t' : '\nCurrent drcp is not latest, you can upgrade it by execute:\n\t';
			// //infoText += `${msg} ${chalk.red('yarn add dr-comp-package@' + latestDrcp)}`;
			// }
			// if (recipeVer && latestRecipe && semver.lt(recipeVer, latestRecipe)) {
			// 	infoText += '\n' + _.padStart('Latest @dr/internal-recipe: ' + chalk.yellow(latestRecipe), PAD_SPACE);
			// 	//let msg = outputs[2].startsWith('zh') ? '\n当前Workspace下的@dr/internal-recipe不是最新的, 如果升级执行命令:\n\t' : '\nCurrent @dr/internal-recipe is not latest, you can upgrade it by execute:\n\t';
			// 	//infoText += `${msg} ${chalk.red('yarn add @dr/internal-recipe@' + latestRecipe)}`;
			// }
			infoText += '\n' + _.padStart('Node.js version: ', PAD_SPACE) + chalk.green(process.version);
			infoText += '\n' + _.padStart('Yarn version: ', PAD_SPACE) + chalk.green(outputs[0]);
			infoText += '\n' + _.padStart('dr-comp-package version: ', PAD_SPACE) + chalk.green(drcpVer) +
				(isSymbolicLink ? chalk.green(' (symlink)') : '') +
				(isDrcpOutdated ? chalk.yellow(` (latest: ${latestDrcp})`) : '');
			if (recipeVer)
				infoText += '\n' + _.padStart('@dr/internal-recipe version: ', PAD_SPACE) + chalk.green(recipeVer) +
					(isRecipeOutdated ? chalk.yellow(`(latest: ${latestRecipe})`) : '');

			infoText += '\n' + sline;
			if (latestDrcp)
				cacheVersionInfo(latestDrcp, latestRecipe);
			return infoText;
		});
}

function cacheVersionInfo(latestDrcpVer, latestRecipeVer) {
	if (versionsFromCache)
		return;
	fs.writeFileSync(cacheFile, JSON.stringify({
		drcpVersion: latestDrcpVer,
		recipeVersion: latestRecipeVer,
		date: new Date().toDateString()
	}, null, '  '));
}

function getVersion() {
	var path = Path.resolve(__dirname, '..', '..', 'package.json');
	return require(path).version;
}

function getRecipeVersion() {
	try {
		return require('@dr/internal-recipe/package.json').version;
	} catch (e) {
		return null;
	}
}

var npmViewReg = /latest:[^"']*['"]([^"']+)['"]/;

function getLatestRecipeVer() {
	if (cachedVersionsInfo)
		return Promise.resolve(cachedVersionsInfo.recipeVersion || INTERNAL_RECIPE_VER);
	console.log('Check versions');
	return checkTimeout(processUtils.promisifyExe('yarn', 'info', '@dr/internal-recipe', {cwd: process.cwd(), silent: true}))
		.then(output => {
			var m = npmViewReg.exec(output);
			return (m && m[1]) ? m[1] : INTERNAL_RECIPE_VER;
		})
		.catch(e => {
			console.error('[WARN] Command "' + ['yarn', 'info', '@dr/internal-recipe'].join(' ') + '" timeout');
			return INTERNAL_RECIPE_VER;
		});
}

function getLatestDrcpVer() {
	if (cachedVersionsInfo)
		return Promise.resolve(cachedVersionsInfo.drcpVersion);
	return checkTimeout(processUtils.promisifyExe('yarn', 'info', 'dr-comp-package', {cwd: process.cwd(), silent: true}))
		.then(output => {
			var m = npmViewReg.exec(output);
			return (m && m[1]) ? m[1] : null;
		})
		.catch(e => {
			console.error('[WARN] Command "' + ['yarn', 'info', 'dr-comp-package'].join(' ') + '" timeout');
			return null;
		});
}

function checkTimeout(origPromise) {
	var timeout;
	return new Promise((resolve, reject) => {
		origPromise.then(res => {
			clearTimeout(timeout);
			resolve(res);
		})
			.catch(reject);
		timeout = setTimeout(() => reject('Timeout'), 12000);
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
