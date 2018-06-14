/*eslint no-loop-func: 0*/
const ts = require('gulp-typescript');
const packageUtils = require('../packageMgr/packageUtils');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('lodash');
const gulp = require('gulp');
const Path = require('path');
const through = require('through2');
const chokidar = require('chokidar');
const merge = require('merge2');
const sourcemaps = require('gulp-sourcemaps');
// const mapSources = require('@gulp-sourcemaps/map-sources');
var config = require('../config');
var SEP = Path.sep;

require('../logConfig')(config());
var log = require('log4js').getLogger('wfh.typescript');

exports.tsc = tsc;
// exports.init = init;
const root = config().rootPath;
const nodeModules = Path.join(root, 'node_modules');
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
function tsc(argv, onCompiled) {
	var compGlobs = [];
	// var compStream = [];
	var compDirInfo = {}; // {[name: string]: {srcDir: string, destDir: string}}
	var baseTsconfig = require('../../tsconfig.json');

	var tsProject = ts.createProject(Object.assign({}, baseTsconfig.compilerOptions, {
		typescript: require('typescript'),
		// Compiler options
		outDir: '',
		baseUrl: root,
		paths: {
			'*': [
				'node_modules/*'
			]
		},
		typeRoots: [
			Path.join(root, 'node_modules/@types'),
			Path.join(root, 'node_modules/@dr-types'),
			Path.join(Path.dirname(require.resolve('dr-comp-package/package.json')), '/wfh/types')
		]
	}));
	if (argv.package.length > 0)
		packageUtils.findAllPackages(argv.package, onComponent, 'src');
	else if (argv.project && argv.project.length > 0) {
		packageUtils.findAllPackages(onComponent, 'src', argv.project);
	} else
		packageUtils.findAllPackages(onComponent, 'src');

	function onComponent(name, entryPath, parsedName, json, packagePath) {
		var srcDir = _.get(json, 'dr.ts.src', 'ts');
		var destDir = _.get(json, 'dr.ts.dest', 'dist');
		destDir = _.trim(destDir, '\\');
		destDir = _.trim(destDir, '/');
		srcDir = _.trim(srcDir, '\\');
		srcDir = _.trim(srcDir, '/');
		compDirInfo[name] = {srcDir, destDir, dir: packagePath};
		try {
			if (fs.statSync(Path.join(packagePath, srcDir)).isDirectory()) {
				compGlobs.push(Path.resolve(packagePath, srcDir).replace(/\\/g, '/') + '/**/*.ts');
			}
		} catch (e) {}
	}

	var promCompile = Promise.resolve();
	if (argv.watch) {
		log.info('Watch mode');
		var watchDirs = [];
		compGlobs = [];

		var delayCompile = _.debounce(() => {
			let toCompile = compGlobs;
			compGlobs = [];
			promCompile = promCompile.catch(() => {})
				.then(() => compile(toCompile, tsProject, compDirInfo, argv.sourceMap === 'inline'))
				.catch(() => {});
			if (onCompiled)
				promCompile = promCompile.then(onCompiled);
		}, 200);

		_.each(compDirInfo, (info, name) => {
			watchDirs.push(Path.join(info.dir, info.srcDir) + '/**/*.ts');
		});
		var watcher = chokidar.watch(watchDirs);
		watcher.on('add', path => onChangeFile(path, 'added'));
		watcher.on('change', path => onChangeFile(path, 'changed'));
		watcher.on('unlink', path => onChangeFile(path, 'removed'));
	} else {
		return compile(compGlobs, tsProject, compDirInfo, argv.sourceMap === 'inline');
	}

	function onChangeFile(path, reason) {
		if (reason !== 'removed')
			compGlobs.push(path);
		log.info(`File ${Path.relative(root, path)} has been ` + reason);
		delayCompile();
	}

	return promCompile;
}

function compile(compGlobs, tsProject, compDirInfo, inlineSourceMap) {
	var gulpBase = root + SEP;
	var startTime = new Date().getTime();
	function printDuration(isError) {
		var sec = Math.ceil((new Date().getTime() - startTime) / 1000);
		var min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
		log.info(`Compiled ${isError ? 'with errors ' : ''}in ` + min);
	}

	function changePath() {
		return through.obj(function(file, en, next) {
			var shortPath = Path.relative(nodeModules, file.path);
			var packageName = /^((?:@[^/\\]+[/\\])?[^/\\]+)/.exec(shortPath)[1];
			if (SEP === '\\')
				packageName = packageName.replace(/\\/g, '/');
			var {srcDir, destDir} = compDirInfo[packageName];
			file.path = Path.resolve(nodeModules, packageName, destDir, shortPath.substring(packageName.length + 2 + srcDir.length));
			next(null, file);
		});
	}

	return new Promise((resolve, reject) => {
		var compileErrors = [];
		var tsResult = gulp.src(compGlobs)
		.pipe(sourcemaps.init())
		.pipe(through.obj(function(file, en, next) {
			file.base = gulpBase;
			next(null, file);
		}))
		.pipe(tsProject())
		.on('error', err => {
			compileErrors.push(err.message);
		});

		var jsStream = tsResult.js
		.pipe(changePath())
		.pipe(inlineSourceMap ? sourcemaps.write() : sourcemaps.write('.', {includeContent: false, sourceRoot: ''}))
		.pipe(through.obj(function(file, en, next) {
			if (file.extname === '.map') {
				var sm = JSON.parse(file.contents.toString());
				let sFileDir;
				sm.sources =
					sm.sources.map( spath => {
						let realFile = fs.realpathSync(spath);
						sFileDir = Path.dirname(realFile);
						return Path.relative(file.base, realFile);
					});
				sm.sourceRoot = Path.relative(sFileDir, file.base).replace(/\\/g, '/');
				file.contents = Buffer.from(JSON.stringify(sm), 'utf8');
			}
			next(null, file);
		}));

		var all = merge([jsStream, tsResult.dts.pipe(changePath())])
		.pipe(through.obj(function(file, en, next) {
			log.info('%s %s Kb', Path.relative(nodeModules, file.path),
				chalk.blue(Math.round(file.contents.length / 1024 * 10) / 10));
			next(null, file);
		}))
		.pipe(gulp.dest(root));
		all.resume();
		all.on('end', () => {
			if (compileErrors.length > 0) {
				compileErrors.forEach(msg => log.error(msg));
				return reject('Failed to compile Typescript files, check out above error message');
			}
			resolve();
		});
		all.on('error', reject);
	})
	.then(() => {
		printDuration();
	})
	.catch(err => {
		printDuration(err);
		return Promise.reject(err);
	});
}
