const through = require('through2');
const merge = require('merge2');
const _ = require('lodash');
const Path = require('path');
const config = require('../config');
const gulp = require('gulp');
const findPackageJson = require('./findPackageJson');
const rwPackageJson = require('./rwPackageJson');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename));
const fs = require('fs-extra');
const File = require('vinyl');
var PackageJsonGuarder = require('./packageJsonGuarder');

var packageJsonGuarder = PackageJsonGuarder(process.cwd());

let linkListFile;
config.done.then(() => {
	linkListFile = config.resolve('destDir', 'link-list.json');
});

module.exports = {
	linkComponentsAsync,
	link, // return a piped stream
	clean,
	//eachSrcPkJson: eachSrcPkJson,
	eachRecipeSrc,
	eachRecipe,
	eachInstalledRecipe
};

/**
 * Iterate src folder for component items
 * @param {string | string[]} projectDir optional, if not present or null, includes all project src folders
 * @param  {Function} callback (srcDir, recipeDir, recipeName): void
 */
function eachRecipeSrc(projectDir, callback) {
	if (arguments.length === 1) {
		callback = arguments[0];
		forProject(config().projectList);
	} else if (arguments.length === 2) {
		if (projectDir)
			forProject(projectDir);
		else
			forProject(config().projectList);
	}

	function forProject(prjDirs) {
		[].concat(prjDirs).forEach(prjDir => {
			_.each(_projectSrcRecipeMap(prjDir), onEachSrcRecipePair);
			var e2eDir = Path.join(prjDir, 'e2etest');
			if (fs.existsSync(e2eDir))
				callback(e2eDir, null, null);
		});
	}

	function onEachSrcRecipePair(srcDir, recipeDir) {
		var recipeName;
		try {
			recipeName = require(Path.resolve(recipeDir, 'package.json')).name;
		} catch (e) {
			log.error(`Can't read ${Path.resolve(recipeDir, 'package.json')}`);
		}
		callback(srcDir, recipeDir, recipeName);
	}
}

function _projectSrcRecipeMap(projectDir) {
	var srcRecipeMapFile = Path.resolve(projectDir, 'dr.recipes.json');
	var recipeSrcMapping = {};
	var nameSrcSetting = {};

	if (fs.existsSync(srcRecipeMapFile))
		nameSrcSetting = JSON.parse(fs.readFileSync(srcRecipeMapFile, 'utf8'));
	else {
		var pkJsonFile = Path.resolve(projectDir, 'package.json');
		var projectName = fs.existsSync(pkJsonFile) ? require(pkJsonFile).name : Path.basename(projectDir);
		if (fs.existsSync(Path.join(projectDir, 'src')))
			nameSrcSetting['recipes/' + projectName] = 'src';
		else {
			let testSrcDir = Path.join(projectDir, 'app');
			if (fs.existsSync(testSrcDir) && fs.statSync(testSrcDir))
				nameSrcSetting['recipes/' + projectName] = 'app';
			else
				nameSrcSetting['recipes/' + projectName] = '.';
		}
	}
	_.each(nameSrcSetting, (srcDirs, recipeName) => {
		if (!_.endsWith(recipeName, '-recipe'))
			recipeName += '-recipe';
		if (!Array.isArray(srcDirs))
			srcDirs = [srcDirs];
		var recipeDir = Path.join(projectDir, recipeName);
		srcDirs.forEach(srcDir => recipeSrcMapping[recipeDir] = Path.resolve(projectDir, srcDir));
	});
	return recipeSrcMapping;
}

function eachDownloadedRecipe(callback, excludeRecipeSet) {
	var srcRecipeSet;
	if (excludeRecipeSet)
		srcRecipeSet = excludeRecipeSet;
	else {
		srcRecipeSet = new Set();
		eachRecipeSrc((x, y, recipeName) => {
			if (recipeName) srcRecipeSet.add(recipeName);
		});
	}
	if (config().installedRecipes) {
		var regexList = config().installedRecipes.map(s => new RegExp(s));
		const pkjson = require(Path.resolve(config().rootPath, 'package.json'));
		var deps = Object.assign({}, pkjson.dependencies || {}, pkjson.devDependencies || {});
		// var deps = require(Path.resolve(config().rootPath, 'package.json')).dependencies;
		// log.warn('delete ', require('../../../package.json').name);
		if (!deps)
			return;
		let drcpName = require('../../../package.json').name;
		//delete deps[require('../../../package.json').name];
		_.each(deps, function(ver, depName) {
			if (depName !== drcpName && !srcRecipeSet.has(depName) && _.some(regexList, regex => regex.test(depName))) {
				log.debug('looking for installed recipe: %s', depName);
				let p;
				try {
					p = Path.resolve(config().nodePath, depName);
					callback(p, true, 'package.json');
				} catch (e) {
					log.error(`Weird things happened, I can't detect ${depName}, has it been installed?
Please run command "drcp init" one more time, let me try again.`, e);
					//throw e;
				}
			}
		});
	}
}

/**
 * @name eachRecipe
 * @param  {Function} callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
 */
function eachRecipe(callback) {
	var srcRecipeSet = new Set();
	eachRecipeSrc((srcDir, recipeDir, recipeName) => {
		srcRecipeSet.add(recipeName);
		if (recipeDir)
			callback(recipeDir, false, 'package.json');
	});
	eachInstalledRecipe(callback, srcRecipeSet);
}

/**
 * eachInstalledRecipe
 * @param callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
*/
function eachInstalledRecipe(callback) {
	eachDownloadedRecipe(callback);
	callback(config().rootPath, true, Path.relative(config().rootPath, packageJsonGuarder.getJsonFile()));
}

function link(onPkJsonFile) {
	var streams = [];
	var linkFiles = fs.existsSync(linkListFile) ? JSON.parse(fs.readFileSync(linkListFile, 'utf8')) : [];
	eachRecipeSrc(function(src, recipeDir) {
		console.log('link recipeDir ', recipeDir);
		streams.push(linkToRecipeFile(src, recipeDir, onPkJsonFile));
	});
	return merge(streams)
	.pipe(through.obj(function(file, enc, next) {
		if (_.isArray(file)) {
			linkFiles.push(...file);
		} else {
			log.debug('out: ' + file.path);
			this.push(file);
		}
		next();
	}, function flush(next) {
		linkFiles = _.uniq(linkFiles);
		var linkFileTrack = new File({
			base: Path.resolve(config().rootPath),
			path: Path.relative(config().rootPath, linkListFile),
			contents: new Buffer(JSON.stringify(linkFiles, null, ' '))
		});
		this.push(linkFileTrack);
		log.debug('out: ' + linkFileTrack.path);
		next();
	}))
	.pipe(gulp.dest(config().rootPath))
	.on('error', function(err) {
		log.error(err);
	});
}

/**
 * @return array of linked package's package.json file path
 */
function linkComponentsAsync() {
	var pkJsonFiles = [];
	return new Promise((resolve, reject) => {
		link(file => pkJsonFiles.push(file))
		.on('end', () => resolve(pkJsonFiles))
		.on('error', reject)
		.resume();
	});
}

function clean() {
	return config.done.then(() => {
		linkListFile = config.resolve('destDir', 'link-list.json');
		var recipes = [];
		var removalProms = [];
		if (fs.existsSync(linkListFile)) {
			var list = fs.readFileSync(linkListFile, 'utf8');
			list = JSON.parse(list);
			removalProms = list.map(linkPath => {
				log.info('Removing symbolic link file %s', linkPath);
				return fs.remove(Path.resolve(config().rootPath, linkPath));
			});
		}
		return Promise.all(removalProms).then(() => recipes);
	})
	.then((recipes) => {
		eachRecipeSrc(function(src, recipeDir) {
			if (recipeDir)
				recipes.push(Path.join(recipeDir, 'package.json'));
		});
		return new Promise((resolve, j) => {
			gulp.src(recipes, {base: config().rootPath})
			.pipe(rwPackageJson.removeDependency())
			.pipe(through.obj(function(file, enc, next) {
				log.debug('out: ' + file.path);
				next(null, file);
			}))
			.pipe(gulp.dest(config().rootPath))
			.on('end', () => resolve())
			.on('error', j);
		});
	});
}

function linkToRecipeFile(srcDir, recipeDir, onPkJsonFile) {
	return gulp.src('')
		.pipe(findPackageJson(srcDir))
		.pipe(through.obj(function(file, enc, next) {
			log.debug('Found recipeDir %s: file: %s', recipeDir, file.path);
			if (onPkJsonFile)
				onPkJsonFile(file.path, recipeDir);
			next(null, file);
		}))
		//.pipe(rwPackageJson.symbolicLinkPackages(config.resolve('destDir', 'links')))
		.pipe(rwPackageJson.symbolicLinkPackages(config.resolve('rootPath')))
		.pipe(rwPackageJson.addDependency(recipeDir))
		.on('error', function(err) {
			log.error(err);
		});
}

