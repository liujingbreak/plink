// tslint:disable:max-line-length
const through = require('through2');
const merge = require('merge2');
const config = require('../lib/config');
import * as _ from 'lodash';
import * as Path from 'path';
import * as gulp from 'gulp';
import * as fs from 'fs-extra';
const findPackageJson = require('../lib/gulp/findPackageJson');
const rwPackageJson = require('./rwPackageJson');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename));
const File = require('vinyl');
import {getInstance} from './package-json-guarder';
const packageJsonGuarder = getInstance(process.cwd());

let linkListFile: string;

config.done.then(() => {
	linkListFile = config.resolve('destDir', 'link-list.json');
});

module.exports = {
	linkComponentsAsync,
	link, // return a piped stream
	clean,
	// eachSrcPkJson: eachSrcPkJson,
	eachRecipeSrc,
	eachRecipe,
	eachInstalledRecipe
};

export type EachRecipeSrcCallback = (srcDir: string, recipeDir: string, recipeName: string) => void;
/**
 * Iterate src folder for component items
 * @param {string | string[]} projectDir optional, if not present or null, includes all project src folders
 * @param  {Function} callback (srcDir, recipeDir, recipeName): void
 */
export function eachRecipeSrc(callback: EachRecipeSrcCallback): void;
export function eachRecipeSrc(projectDir: string, callback: EachRecipeSrcCallback): void;
export function eachRecipeSrc(projectDir: string | EachRecipeSrcCallback,
	callback?: (srcDir: string, recipeDir: string, recipeName: string) => void): void {
	if (arguments.length === 1) {
		callback = arguments[0];
		forProject(config().projectList);
	} else if (arguments.length === 2) {
		if (typeof projectDir === 'string' || Array.isArray(projectDir)) {
			forProject(projectDir);
		} else {
			forProject(config().projectList);
		}
	}

	function forProject(prjDirs: string[] | string) {
		[].concat(prjDirs).forEach(prjDir => {
			_.each(_projectSrcRecipeMap(prjDir), onEachSrcRecipePair);
			const e2eDir = Path.join(prjDir, 'e2etest');
			if (fs.existsSync(e2eDir))
				callback(e2eDir, null, null);
		});
	}

	function onEachSrcRecipePair(srcDir: string, recipeDir: string) {
		let recipeName;
		try {
			recipeName = require(Path.resolve(recipeDir, 'package.json')).name;
		} catch (e) {
			log.error(`Can't read ${Path.resolve(recipeDir, 'package.json')}`);
		}
		callback(srcDir, recipeDir, recipeName);
	}
}

function _projectSrcRecipeMap(projectDir: string) {
	const srcRecipeMapFile = Path.resolve(projectDir, 'dr.recipes.json');
	const recipeSrcMapping: {[recipe: string]: string} = {};
	let nameSrcSetting: {[key: string]: string} = {};

	if (fs.existsSync(srcRecipeMapFile)) {
		nameSrcSetting = JSON.parse(fs.readFileSync(srcRecipeMapFile, 'utf8'));
	} else {
		const pkJsonFile = Path.resolve(projectDir, 'package.json');
		const projectName = fs.existsSync(pkJsonFile) ? require(pkJsonFile).name : Path.basename(projectDir);
		if (fs.existsSync(Path.join(projectDir, 'src'))) {
			nameSrcSetting['recipes/' + projectName] = 'src';
		} else {
			const testSrcDir = Path.join(projectDir, 'app');
			if (fs.existsSync(testSrcDir) && fs.statSync(testSrcDir))
				nameSrcSetting['recipes/' + projectName] = 'app';
			else
				nameSrcSetting['recipes/' + projectName] = '.';
		}
	}
	_.each(nameSrcSetting, (srcDir, recipeName) => {
		let srcDirs: string[];
		if (!_.endsWith(recipeName, '-recipe'))
			recipeName += '-recipe';
		srcDirs = Array.isArray(srcDir) ? srcDir : [srcDir];
		const recipeDir = Path.join(projectDir, recipeName);
		srcDirs.forEach(srcDir => recipeSrcMapping[recipeDir] = Path.resolve(projectDir, srcDir));
	});
	return recipeSrcMapping;
}
export type EachRecipeCallback = (recipeDir: string, isFromInstallation: boolean, jsonFileName: string) => void;
function eachDownloadedRecipe(callback: EachRecipeCallback, excludeRecipeSet?: Set<string>) {
	let srcRecipeSet: Set<string>;
	if (excludeRecipeSet) {
		srcRecipeSet = excludeRecipeSet;
	} else {
		srcRecipeSet = new Set();
		eachRecipeSrc((x, y, recipeName) => {
			if (recipeName) srcRecipeSet.add(recipeName);
		});
	}
	if (config().installedRecipes) {
		const regexList = (config().installedRecipes as string[]).map(s => new RegExp(s));
		const pkjson = require(Path.resolve(config().rootPath, 'package.json'));
		const deps = Object.assign({}, pkjson.dependencies || {}, pkjson.devDependencies || {});
		// let deps = require(Path.resolve(config().rootPath, 'package.json')).dependencies;
		// log.warn('delete ', require('../../../package.json').name);
		if (!deps)
			return;
		const drcpName = require('../../package.json').name;
		// delete deps[require('../../../package.json').name];
		_.each(deps, function(ver, depName) {
			if (depName !== drcpName && !srcRecipeSet.has(depName) && _.some(regexList, regex => regex.test(depName))) {
				log.debug('looking for installed recipe: %s', depName);
				let p;
				try {
					p = Path.resolve(config().nodePath, depName);
					callback(p, true, 'package.json');
				} catch (e) {
					log.info(`${depName} seems to be not installed`);
// 					log.error(`Weird things happened, I can't detect ${depName}, has it been installed?
// Please run command "drcp init" one more time, let me try again.`, e);
					// throw e;
				}
			}
		});
	}
}

/**
 * @name eachRecipe
 * @param  {Function} callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
 */
export function eachRecipe(callback: EachRecipeCallback) {
	// const srcRecipeSet = new Set();
	eachRecipeSrc((srcDir, recipeDir, recipeName) => {
		// srcRecipeSet.add(recipeName);
		if (recipeDir)
			callback(recipeDir, false, 'package.json');
	});
	eachInstalledRecipe(callback);
}

/**
 * eachInstalledRecipe
 * @param callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
*/
export function eachInstalledRecipe(callback: EachRecipeCallback) {
	eachDownloadedRecipe(callback);
	callback(config().rootPath, true, Path.relative(config().rootPath, packageJsonGuarder.getJsonFile()));
}

export function link(onPkJsonFile: (filePath: string, recipeDir: string) => void) {
	const streams: any[] = [];
	let linkFiles = fs.existsSync(linkListFile) ? JSON.parse(fs.readFileSync(linkListFile, 'utf8')) : [];
	eachRecipeSrc(function(src, recipeDir) {
		// tslint:disable-next-line:no-console
		console.log('[recipeManager]link recipe', recipeDir);
		streams.push(linkToRecipeFile(src, recipeDir, onPkJsonFile));
	});
	return merge(streams)
	.pipe(through.obj(function(file: any, enc: string, next: () => void) {
		if (_.isArray(file)) {
			linkFiles.push(...file);
		} else {
			log.debug('out: ' + file.path);
			this.push(file);
		}
		next();
	}, function flush(next: () => void) {
		linkFiles = _.uniq(linkFiles);
		const linkFileTrack = new File({
			base: Path.resolve(config().rootPath),
			path: Path.relative(config().rootPath, linkListFile),
			contents: new Buffer(JSON.stringify(linkFiles, null, ' '))
		});
		this.push(linkFileTrack);
		log.debug('out: ' + linkFileTrack.path);
		next();
	}))
	.pipe(gulp.dest(config().rootPath))
	.on('error', function(err: Error) {
		log.error(err);
	});
}

/**
 * @return array of linked package's package.json file path
 */
export function linkComponentsAsync() {
	const pkJsonFiles: string[] = [];
	return new Promise((resolve, reject) => {
		link(file => pkJsonFiles.push(file))
		.on('end', () => resolve(pkJsonFiles))
		.on('error', reject)
		.resume();
	});
}

export async function clean() {
	await config.done;
	linkListFile = config.resolve('destDir', 'link-list.json');
	const recipes: string[] = [];
	let removalProms: Promise<void>[] = [];
	if (fs.existsSync(linkListFile)) {
		const list: string[] = JSON.parse(fs.readFileSync(linkListFile, 'utf8'));
		removalProms = list.map(linkPath => {
			log.info('Removing symbolic link file %s', linkPath);
			return fs.remove(Path.resolve(config().rootPath, linkPath));
		});
	}
	await Promise.all(removalProms);

	eachRecipeSrc(function(src: string, recipeDir: string) {
		if (recipeDir)
			recipes.push(Path.join(recipeDir, 'package.json'));
	});
	return new Promise((resolve, j) => {
		gulp.src(recipes, {base: config().rootPath})
		.pipe(rwPackageJson.removeDependency())
		.pipe(through.obj(function(file: any, enc: string, next: (...args: any[]) => void) {
			log.debug('out: ' + file.path);
			next(null, file);
		}))
		.pipe(gulp.dest(config().rootPath))
		.on('end', () => resolve())
		.on('error', j);
	});
}

function linkToRecipeFile(srcDir: string, recipeDir: string, onPkJsonFile: (filePath: string, recipeDir: string) => void) {
	return gulp.src('')
		.pipe(findPackageJson(srcDir, true))
		.pipe(through.obj(function(file: any, enc: string, next: (...arg: any[]) => void) {
			log.debug('Found recipeDir %s: file: %s', recipeDir, file.path);
			if (onPkJsonFile)
				onPkJsonFile(file.path, recipeDir);
			next(null, file);
		}))
		// .pipe(rwPackageJson.symbolicLinkPackages(config.resolve('destDir', 'links')))
		.pipe(rwPackageJson.symbolicLinkPackages(config.resolve('rootPath')))
		.pipe(rwPackageJson.addDependency(recipeDir))
		.on('error', function(err: Error) {
			log.error(err);
		});
}

