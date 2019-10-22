/* eslint max-lines: "off" */
/**
 * Do not require this file until wfh dependencies is installed and config.yaml file is generated
 */

var config = require('../config');
var jsYaml = require('js-yaml');
var Path = require('path');
var fs = require('fs-extra');
var _ = require('lodash');
var chalk = require('chalk');
var gulp = require('gulp');
var through = require('through2');
var recipeManager = require('../../dist/recipe-manager');
var pify = require('pify');
var File = require('vinyl');
var buildUtils = require('./buildUtils');
require('../logConfig')(config());
var log = require('log4js').getLogger('wfh.cliAdvanced');
var packageUtils = require('../packageMgr/packageUtils');
var {listCompDependency} = require('../../dist/dependency-installer');

exports.listCompDependency = listCompDependency;
exports.addupConfigs = addupConfigs;
exports.clean = clean;
exports.bumpDirsAsync = bumpDirsAsync;
exports.bumpProjectsAsync = bumpProjectsAsync;
exports.lint = lint;
exports.publish = publish;
exports.unpublish = unpublish;
exports.runPackages = runPackages;

function addupConfigs(onEachYaml) {
	var componentConfigs = {outputPathMap: {}, vendorBundleMap: {}, browserSideConfigProp: []};
	var vendorBundleMap = componentConfigs.vendorBundleMap;
	var browserSideConfigProp = componentConfigs.browserSideConfigProp;
	//var entryPageMapping = componentConfigs.entryPageMapping;
	var componentConfigs4Env = {}; // key is env:string, value is componentConfigs
	var trackOutputPath = {}; // For checking conflict
	packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
		var dr = json.dr;
		if (!dr)
			return;

		// component customized configuration properties
		_addupCompConfigProp(componentConfigs, name, browserSideConfigProp, dr.config);
		_.each(dr, (value, key) => {
			var m = /^config\.(.*)$/.exec(key);
			if (!m)
				return;
			var env = m[1];
			if (!_.has(componentConfigs4Env, env))
				componentConfigs4Env[env] = {browserSideConfigProp: []};
			_addupCompConfigProp(componentConfigs4Env[env], name, componentConfigs4Env[env].browserSideConfigProp, value);
		});

		// outputPath
		var outputPath = dr.outputPath;
		if (outputPath == null)
			outputPath = dr.ngRouterPath;
		if (outputPath == null)
			outputPath = _.get(json, 'dr.output.path', parsedName.name);

		if (_.has(trackOutputPath, outputPath) && trackOutputPath[outputPath] !== name) {
			log.warn(chalk.yellow('[Warning] Conflict package level outputPath setting (aka "ngRouterPath" in package.json) "%s" for both %s and %s, resolve conflict by adding a config file,'), outputPath, trackOutputPath[outputPath], name);
			log.warn(chalk.yellow('%s\'s "outputPath" will be changed to %s'), name, parsedName.name);
			outputPath = parsedName.name;
		}
		trackOutputPath[outputPath] = name;
		componentConfigs.outputPathMap[name] = outputPath;
		// chunks
		var chunk = _.has(json, 'dr.chunk') ? dr.chunk : dr.bundle;
		if (!chunk) {
			if ((dr.entryPage || dr.entryView))
				chunk = parsedName.name; // Entry package should have a default chunk name as its package short name
		}
		if (chunk) {
			if (_.has(vendorBundleMap, chunk))
				vendorBundleMap[chunk].push(name);
			else
				vendorBundleMap[chunk] = [name];
		}
	});

	var superConfig = require('../../config.yaml');
	deeplyMergeJson(superConfig, componentConfigs);
	if (onEachYaml) {
		onEachYaml('config.yaml', jsYaml.safeDump(superConfig));
	}
	//var res = {'config.yaml': jsYaml.safeDump(superConfig)};
	_.each(componentConfigs4Env, (configs, env) => {
		var tmplFile = Path.join(__dirname, 'templates', 'config.' + env + '-template.yaml');
		if (fs.existsSync(tmplFile)) {
			configs = Object.assign(jsYaml.safeLoad(fs.readFileSync(tmplFile, 'utf8'), {filename: tmplFile}), configs);
		}
		//res['config.' + env + '.yaml'] = jsYaml.safeDump(configs);
		if (onEachYaml) {
			onEachYaml('config.' + env + '.yaml', jsYaml.safeDump(configs));
		}
	});
	// cleanPackagesWalkerCache();
	config.reload();
	return Promise.resolve(null);
}

function _addupCompConfigProp(componentConfigs, compName, browserSideConfigProp, configJson) {
	if (!configJson)
		return;
	// component customized configuration properties
	var componentConfig = _.assign({}, configJson.public);
	deeplyMergeJson(componentConfig, configJson.server);

	if (_.size(componentConfig) > 0 )
		componentConfigs[compName] = componentConfig;

	// browserSideConfigProp
	browserSideConfigProp.push(..._.map(_.keys(configJson.public), key => compName + '.' + key));
}

function clean(onlySymlink) {
	let done = recipeManager.clean();
	if (!onlySymlink) {
		done = done.then(() => {
			fs.removeSync(config().staticDir);
			fs.removeSync(config().destDir);
			fs.removeSync(Path.join(config().rootPath, 'gulpfile.js'));
			fs.removeSync(Path.join(config().rootPath, 'yarn.lock'));
			fs.removeSync(Path.join(config().rootPath, 'package-lock.json'));
			fs.removeSync(Path.join(config().rootPath, 'yarn-error.log'));
		});
	}
	return done;
}

function lint(argv) {
	var eslint = require('gulp-eslint');
	var tslint = require('gulp-tslint');

	// let program = tslint.Linter.createPrograme('');
	var prom = Promise.resolve();
	var errors = [];
	const getPackDirs = require('../../dist/utils').getTsDirsOfPackage;
	if (argv.package && argv.package.length > 0) {
		packageUtils.lookForPackages(argv.package, (fullName, entryPath, parsedName, json, packagePath) => {
			if (json.dr && json.dr.noLint === true) {
				log.info('skip ' + fullName);
				return;
			}
			packagePath = fs.realpathSync(packagePath);
			prom = prom.catch(err => errors.push(err))
			.then(() => {
				log.info('Checking ', packagePath);
				return _lintPackageAsync(eslint, fullName, json, packagePath, getPackDirs(json), argv.fix);
			})
			.catch(err => errors.push(err))
			.then(() => {
				return _tsLintPackageAsync(tslint, fullName, json, packagePath, argv.fix);
			});
		});
	} else {
		packageUtils.findAllPackages((fullName, entryPath, parsedName, json, packagePath) => {
			if (json.dr && json.dr.noLint === true) {
				log.info('skip ' + fullName);
				return;
			}
			packagePath = fs.realpathSync(packagePath);
			prom = prom.catch(err => errors.push(err))
			.then(() => {
				log.info('Checking ', packagePath);
				return _lintPackageAsync(eslint, fullName, json, packagePath, getPackDirs(json), argv.fix);
			})
			.catch(err => errors.push(err))
			.then(() => {
				return _tsLintPackageAsync(tslint, fullName, json, packagePath, argv.fix);
			});
		}, 'src', argv.project);
	}
	return prom.catch(err => errors.push(err))
	.then(() => {
		if (errors.length > 0) {
			errors.forEach(error => log.error(error));
			throw new Error('Lint result contains errors');
		}
	});
}

function _tsLintPackageAsync(tslint, fullName, json, packagePath, fix) {
	let dir;
	// packagePath = fs.realpathSync(packagePath);
	log.debug('TSlint Scan', packagePath);
	if (fullName === 'dr-comp-package')
		packagePath = packagePath + '/wfh';
	for (let pDir = packagePath; dir !== pDir; pDir = Path.dirname(dir)) {
		dir = pDir;
		if (fs.existsSync(dir + '/tslint.json'))
			break;
	}
	let rcfile = Path.resolve(dir, 'tslint.json');
	log.debug('Use', rcfile);
	let packagePath0 = packagePath.replace(/\\/g, '/');

	// Unlike ESlint, TSLint fix does not write file to stream, but use fs.writeFileSync() instead
	return new Promise((resolve, reject) => {
		var tsDestDir = _.get(json, 'dr.ts.dest', 'dist');
		var stream = gulp.src([packagePath0 + '/**/*.{ts,tsx}',
			`!${packagePath}/**/*.spec.ts`,
			`!${packagePath}/**/*.d.ts`,
			`!${packagePath}/${tsDestDir}/**/*`,
			`!${packagePath0}/spec/**/*`,
			`!${packagePath}/${_.get(json, 'dr.assetsDir', 'assets')}/**/*`,
			`!${packagePath0}/node_modules/**/*`], {base: packagePath})
		.pipe(tslint({tslint: require('tslint'), formatter: 'verbose', configuration: rcfile, fix}))
		.pipe(tslint.report({
			summarizeFailureOutput: true,
			allowWarnings: true
		}))
		// .pipe(through.obj(function(file, en, next) {
		// 	log.info(Path.relative(packagePath, file.path));
		// 	next(null, file);
		// }))
		.on('error', err => reject(err));
		// else
		stream.resume();
		stream.on('end', () => resolve(null));
	});
}

function _lintPackageAsync(eslint, fullName, json, packagePath, pkTsDirs, fix) {
	if (fix)
		log.info('Fixing typescript file ...');

	let dir;
	// packagePath = fs.realpathSync(packagePath);
	log.debug('ESlint Scan', packagePath);
	if (fullName === 'dr-comp-package')
		packagePath = packagePath + '/wfh';
	for (let pDir = packagePath; dir !== pDir; pDir = Path.dirname(dir)) {
		dir = pDir;
		if (fs.existsSync(dir + '/.eslintrc.json'))
			break;
	}
	let rcfile = Path.resolve(dir, '.eslintrc.json');
	log.debug('Use', rcfile);
	packagePath = packagePath.replace(/\\/g, '/');
	return new Promise((resolve, reject) => {
		var tsDestDir = _.get(json, 'dr.ts.dest', 'dist');
		var stream = gulp.src([packagePath + '/**/*.{js,jsx}',
			`!${packagePath}/${pkTsDirs.isomDir}/**/*`,
			`!${packagePath}/${tsDestDir}/**/*`,
			`!${packagePath}/spec/**/*`,
			`!${packagePath}/${_.get(json, 'dr.assetsDir', 'assets')}/**/*`,
			`!${packagePath}/node_modules/**/*`], {base: packagePath})
		// .pipe(through.obj(function(file, en, next) {
		// 	log.info(Path.relative(packagePath, file.path));
		// 	next(null, file);
		// }))
		.pipe(eslint({fix, configFile: rcfile}))
		.pipe(eslint.format())
		.pipe(eslint.failAfterError())
		.on('error', err => reject(err));
		if (fix)
			stream = stream.pipe(gulp.dest(packagePath));
		stream.resume();
		stream.on('end', () => resolve(null));
	});
}

function deeplyMergeJson(target, src, customizer) {
	_.each(src, (sValue, key) => {
		var tValue = target[key];
		var c = customizer ? customizer(tValue, sValue, key) : undefined;
		if (c !== undefined)
			target[key] = c;
		else if (Array.isArray(tValue) && Array.isArray(sValue))
			target[key] = _.union(tValue, sValue);
		else if (_.isObject(tValue) && _.isObject(sValue))
			deeplyMergeJson(tValue, sValue);
		else
			target[key] = sValue;
	});
}

function bumpDirsAsync(dirs, versionType) {
	var findPackageJson = require('./findPackageJson');
	var srcMap = _srcRecipeMap();
	var srcDirs = Object.keys(srcMap);
	var bumpDirs = [...dirs];
	dirs.forEach(dir => {
		dir = Path.resolve(dir);
		var foundSrc = _.find(srcDirs, src => dir.startsWith(src));
		if (!foundSrc)
			return;
		var recipeDir = srcMap[foundSrc];
		if (recipeDir && !_.includes(bumpDirs, recipeDir)) {
			bumpDirs.push(recipeDir);
			log.info('Bump recipe package %s', recipeDir);
		}
	});

	return new Promise(resolve => {
		gulp.src('')
		.pipe(findPackageJson(bumpDirs))
		.pipe(through.obj(function(file, enc, next) {
			file.base = '/';
			//file.path = Path.relative(config().rootPath, file.path);
			log.info(file.path);
			file.contents = new Buffer(fs.readFileSync(file.path, 'utf8'));
			this.push(file);
			next();
		}))
		.pipe(bumpVersion(versionType))
		.pipe(gulp.dest('/'))
		.on('end', resolve);
	})
	.then(() => recipeManager.linkComponentsAsync());
}

function bumpProjectsAsync(projects, versionType) {
	var srcDirs = [];
	var recipes = [];
	recipeManager.eachRecipeSrc(projects, function(src, recipe) {
		srcDirs.push(src);
		if (recipe)
			recipes.push(recipe);
	});
	var realPathAsync = pify(fs.realpath.bind(fs));
	var stream = gulp.src('.')
		.pipe(through.obj(function(file, enc, next) {
			next(null);
		}, function(next) {
			var self = this;
			var proms = [];
			packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
				proms.push(realPathAsync(packagePath).then(packagePath => {
					self.push(new File({
						base: config().rootPath,
						path: Path.relative(config().rootPath, Path.join(packagePath, 'package.json')),
						contents: new Buffer(fs.readFileSync(Path.resolve(packagePath, 'package.json'), 'utf8'))
					}));
				}));
			}, 'src', projects);
			recipes.forEach(function(recipe) {
				self.push(new File({
					base: config().rootPath,
					path: Path.resolve(recipe, 'package.json'),
					contents: new Buffer(fs.readFileSync(Path.resolve(recipe, 'package.json'), 'utf8'))
				}));
			});
			Promise.all(proms).then(() => next());
		}))
		.pipe(through.obj(function(file, enc, next) {
			file.base = config().rootPath;
			log.info('bump: ' + file.path);
			next(null, file);
		}))
		.pipe(bumpVersion())
		.pipe(gulp.dest(config().rootPath));

	return new Promise((res, rej) => {
		stream.on('error', function(err) {
			rej(err);
		})
		.on('end', function() {
			recipeManager.linkComponentsAsync()
			.then(res)
			.catch(rej);
		});
	});
}

function bumpVersion(versionType) {
	var type = 'patch';
	if (versionType) {
		if (!{major: 1, minor: 1, patch: 1, prerelease: 1}.hasOwnProperty(versionType)) {
			log.info(chalk.red('expecting bump type is one of "major|minor|patch|prerelease", but get: ' + versionType));
			throw new Error('Invalid -v parameter');
		}
		type = versionType;
	}
	return require('gulp-bump')({
		type
	});
}

function publish(argv) {
	var promises = [];
	//var count = 0;
	var Q = require('promise-queue');
	var q = new Q(5, Infinity);
	packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
		promises.push(
			q.add(() => {
				return buildUtils.promisifyExe('npm', 'publish', packagePath, {silent: true});
			})
			.then(sucess).catch(e => handleExption(json.name + '@' + json.version, e))
		);
	}, 'src', argv.projectDir);
	recipeManager.eachRecipeSrc(argv.projectDir, function(src, recipeDir) {
		if (!recipeDir)
			return;
		var data = JSON.parse(fs.readFileSync(Path.join(recipeDir, 'package.json'), 'utf8'));
		promises.push(
			q.add(() => {
				return buildUtils.promisifyExe('npm', 'publish', recipeDir, {silent: true});
			})
			.then(sucess)
			.catch(e => handleExption(data.name + '@' + data.version, e))
		);
	});

	function sucess(m) {
		//count++;
		log.info(m);
	}

	function handleExption(packageName, e) {
		if (e && e.message && e.message.indexOf('EPUBLISHCONFLICT') > 0)
			log.info(packageName + ' exists.');
		else
			log.error(packageName, e);
	}
	return Promise.all(promises);
}

function unpublish(argv) {
	var promises = [];
	var count = 0;

	var Q = require('promise-queue');
	var q = new Q(5, Infinity);
	packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
		promises.push(
			q.add(() => {
				log.info('unpublish ' + json.name + '@' + json.version);
				return buildUtils.promisifyExe('npm', 'unpublish', json.name + '@' + json.version);
			})
			.then(sucess).catch(() => {})
		);
	}, 'src', argv.projectDir);
	recipeManager.eachRecipeSrc(argv.projectDir, function(src, recipeDir) {
		if (!recipeDir)
			return;
		promises.push(
			q.add(() => {
				var data = JSON.parse(fs.readFileSync(Path.join(recipeDir, 'package.json'), 'utf8'));
				log.info('unpublish ' + data.name + '@' + data.version);
				return buildUtils.promisifyExe('npm', 'unpublish', data.name + '@' + data.version);
			})
			.then(sucess).catch(() => {})
		);
	});

	function sucess(m) {
		count++;
	}

	return Promise.all(promises).then(() => {
		log.info(count + ' unpublished');
	});
}

function _srcRecipeMap() {
	var rsMap = {};
	recipeManager.eachRecipeSrc((srcDir, recipeDir) => {
		if (srcDir && recipeDir) {
			rsMap[Path.resolve(srcDir)] = Path.resolve(recipeDir);
		}
	});
	return rsMap;
}

function runPackages(argv) {
	return require('../../dist/package-runner').runSinglePackage(argv, argv._);
}
