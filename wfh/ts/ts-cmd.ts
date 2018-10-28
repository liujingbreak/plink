const ts = require('gulp-typescript');
const packageUtils = require('../lib/packageMgr/packageUtils');
const chalk = require('chalk');
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as Path from 'path';
const gulp = require('gulp');
const through = require('through2');
const chokidar = require('chokidar');
const merge = require('merge2');
const sourcemaps = require('gulp-sourcemaps');
// const mapSources = require('@gulp-sourcemaps/map-sources');
const config = require('../lib/config');
const SEP = Path.sep;

require('../lib/logConfig')(config());
const log = require('log4js').getLogger('wfh.typescript');

exports.tsc = tsc;
// exports.init = init;
const root = config().rootPath;
const nodeModules = Path.join(root, 'node_modules');

interface ComponentInfo {
	srcDir: string;
	destDir: string;
	dir: string;
}

interface Args {
	package: string[];
	project: string[];
	watch: boolean;
	sourceMap: string;
}
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
function tsc(argv: Args, onCompiled: () => void) {
	var compGlobs: string[] = [];
	// var compStream = [];
	const compDirInfo: {[name: string]: ComponentInfo} = {}; // {[name: string]: {srcDir: string, destDir: string}}
	const baseTsconfig = require('../tsconfig.json');

	const tsProject = ts.createProject(Object.assign({}, baseTsconfig.compilerOptions, {
		typescript: require('typescript'),
		// Compiler options
		outDir: '',
		baseUrl: root,
		rootDir: undefined,
		typeRoots: [
			Path.join(root, 'node_modules/@types'),
			Path.join(Path.dirname(require.resolve('dr-comp-package/package.json')), '/wfh/types')
		]
	}));
	if (argv.package.length > 0)
		packageUtils.findAllPackages(argv.package, onComponent, 'src');
	else if (argv.project && argv.project.length > 0) {
		packageUtils.findAllPackages(onComponent, 'src', argv.project);
	} else
		packageUtils.findAllPackages(onComponent, 'src');

	function onComponent(name: string, entryPath: string, parsedName: string, json: any, packagePath: string) {
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

	const delayCompile = _.debounce(() => {
		const toCompile = compGlobs;
		compGlobs = [];
		promCompile = promCompile.catch(() => {})
			.then(() => compile(toCompile, tsProject, compDirInfo, argv.sourceMap === 'inline'))
			.catch(() => {});
		if (onCompiled)
			promCompile = promCompile.then(onCompiled);
	}, 200);

	var promCompile = Promise.resolve();
	if (argv.watch) {
		log.info('Watch mode');
		const watchDirs: string[] = [];
		compGlobs = [];

		_.each(compDirInfo, (info, name) => {
			watchDirs.push(Path.join(info.dir, info.srcDir).replace(/\\/g, '/') + '/**/*.ts');
		});
		const watcher = chokidar.watch(watchDirs, {ignored: /(\.d\.ts|\.js)$/ });
		watcher.on('add', (path: string) => onChangeFile(path, 'added'));
		watcher.on('change', (path: string) => onChangeFile(path, 'changed'));
		watcher.on('unlink', (path: string) => onChangeFile(path, 'removed'));
	} else {
		return compile(compGlobs, tsProject, compDirInfo, argv.sourceMap === 'inline');
	}

	function onChangeFile(path: string, reason: string) {
		if (reason !== 'removed')
			compGlobs.push(path);
		log.info(`File ${chalk.cyan(Path.relative(root, path))} has been ` + chalk.yellow(reason));
		delayCompile();
	}

	return promCompile;
}

function compile(compGlobs: string[], tsProject: any,
	compDirInfo: {[name: string]: ComponentInfo}, inlineSourceMap: boolean) {
	const gulpBase = root + SEP;
	const startTime = new Date().getTime();

	function printDuration(isError: boolean) {
		const sec = Math.ceil((new Date().getTime() - startTime) / 1000);
		const min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
		log.info(`Compiled ${isError ? 'with errors ' : ''}in ` + min);
	}

	function changePath() {
		return through.obj(function(file: any, en: string, next: (...arg: any[]) => void) {
			const shortPath = Path.relative(nodeModules, file.path);
			let packageName = /^((?:@[^/\\]+[/\\])?[^/\\]+)/.exec(shortPath)[1];
			if (SEP === '\\')
				packageName = packageName.replace(/\\/g, '/');
			const {srcDir, destDir} = compDirInfo[packageName];
			file.path = Path.resolve(nodeModules, packageName, destDir,
				shortPath.substring(packageName.length + 1 + (srcDir.length > 0 ? srcDir.length + 1 : 0)));
			next(null, file);
		});
	}

	return new Promise((resolve, reject) => {
		const compileErrors: string[] = [];
		const tsResult = gulp.src(compGlobs)
		.pipe(sourcemaps.init())
		.pipe(through.obj(function(file: any, en: string, next: (...arg: any[]) => void) {
			file.base = gulpBase;
			next(null, file);
		}))
		.pipe(tsProject())
		.on('error', (err: Error) => {
			compileErrors.push(err.message);
		});

		const jsStream = tsResult.js
		.pipe(changePath())
		.pipe(inlineSourceMap ? sourcemaps.write() : sourcemaps.write('.', {includeContent: false, sourceRoot: ''}))
		.pipe(through.obj(function(file: any, en: string, next: (...arg: any[]) => void) {
			if (file.extname === '.map') {
				const sm = JSON.parse(file.contents.toString());
				let sFileDir;
				sm.sources =
					sm.sources.map( (spath: string) => {
						const realFile = fs.realpathSync(spath);
						sFileDir = Path.dirname(realFile);
						return Path.relative(file.base, realFile).replace(/\\/g, '/');
					});
				sm.sourceRoot = Path.relative(sFileDir, file.base).replace(/\\/g, '/');
				file.contents = Buffer.from(JSON.stringify(sm), 'utf8');
			}
			next(null, file);
		}));

		const all = merge([jsStream, tsResult.dts.pipe(changePath())])
		.pipe(through.obj(function(file: any, en: string, next: (...arg: any[]) => void) {
			log.info('%s %s Kb', Path.relative(nodeModules, file.path),
				chalk.blue(Math.round(file.contents.length / 1024 * 10) / 10));
			next(null, file);
		}))
		.pipe(gulp.dest(root));
		all.resume();
		all.on('end', () => {
			if (compileErrors.length > 0) {
				/* tslint:disable no-console */
				console.log('\n---------- Failed to compile Typescript files, check out below error message -------------\n');
				compileErrors.forEach(msg => log.error(msg));
				return reject(new Error(compileErrors.join(',')));
			}
			resolve();
		});
		all.on('error', reject);
	})
	.then(() => {
		printDuration(false);
	})
	.catch(err => {
		printDuration(true);
		return Promise.reject(err);
	});
}
