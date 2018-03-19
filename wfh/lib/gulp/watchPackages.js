var gulp = require('gulp');
var _ = require('lodash');
var Promise = require('bluebird');
var config = require('../config');
var cycle = require('cycle');
var fs = require('fs');
var Path = require('path');
var packageUtils = require('../packageMgr/packageUtils');
var log = require('log4js').getLogger('gulp.watchPackages');
var chokidar = require('chokidar');
// const buildUtils = require('./buildUtils');

module.exports = watch;

function watch(packageList, argv) {
	var dirty = {};
	var packageInfo;
	try {
		packageInfo = JSON.parse(fs.readFileSync(config.resolve('destDir', 'packageInfo.json'), {encoding: 'utf8'}));
	} catch (er) {
		if (er.code === 'ENOENT')
			log.error('\nPlease run `gulp compile` for a clean environment before your run `gulp watch`!\n');
		return;
	}
	packageInfo = cycle.retrocycle(packageInfo);


	var buildPromise = Promise.resolve(null);
	var onChange = _.debounce(function() {
		if (dirty.__clean) {
			delete dirty.__clean;
			buildPromise = buildPromise.then(() => {
				return new Promise((resolve) => {
					log.info('gulp clean');
					gulp.start('clean', function(err) {
						resolve(null);
					});
				});
			});
		}
		buildPromise = buildPromise
		.then(function() {
			var currDirty = dirty;
			dirty = {};
			if (_.get(currDirty, '__all') === true) {
				log.info('compile all');
				delete argv.p;
			} else {
				argv.p = _.keys(currDirty);
				if (argv.p.length === 0) {
					return null;
				}
				log.debug('building ... ' + argv.p);
				if (argv.p.length === 1 && currDirty[argv.p[0]].js && !currDirty[argv.p[0]].css) {
					argv['only-js'] = true;
				}
				if (argv.p.length === 1 && currDirty[argv.p[0]].css && !currDirty[argv.p[0]].js) {
					argv['only-css'] = true;
				}
			}
			return new Promise(function(resolve, reject) {
				gulp.start('compile', function(err) {
					delete argv.p;
					delete argv['only-js'];
					delete argv['only-css'];
					log.debug('done');
					resolve(null);
				});
			});
		})
		.timeout(config.get('gulp.watchTimeout', 20000))
		.catch(function(e) {
			log.error('compile failure: ', e);
			// buildPromise = Promise.resolve(null);
			// TODO: fix problem of waiting for too long
			// If it is caused by timeout, then we need to check 1 more round to see
			// if there are new changes in waiting queue.
			//onChange();
		});
	}, config.get('gulp.watchDebounceDelay', 1000));

	if (packageList) {
		packageList = [].concat(packageList);
		packageUtils.findAllPackages(packageList, watchPackage);
	} else {
		packageUtils.findBrowserPackageByType('*', watchPackage, 'src');
	}

	function watchPackage(name, entryPath, parsedName, json, packagePath) {
		packagePath = fs.realpathSync(packagePath);
		var noWatchList = _.get(json, 'dr.noWatch');
		if (noWatchList === true) {
			log.info('Skip package %s as its "noWatch: true"', name);
			return;
		}
		log.info('watching package %s  (%s)', name, packagePath);
		var sourceCode = [];
		var chokidarOpt = {
			ignoreInitial: true
			// ignored: [
			// 	packagePath + '/spec/**/*',
			// 	packagePath + '/assets/**/*',
			// 	packagePath + '/README.md',
			// 	packagePath + '/dist/**/*'
			// ]
		};
		sourceCode.push(packagePath);
		//sourceCode.push(packagePath + '/**/*');
		sourceCode.push('!' + packagePath + '/spec/**/*');
		sourceCode.push('!' + packagePath + '/assets/**/*');
		sourceCode.push('!' + packagePath + '/README.md');
		sourceCode.push('!' + packagePath + '/dist/**/*');

		if (_.isString(noWatchList) || _.isArray(noWatchList)) {
			noWatchList = [].concat(noWatchList);
			_.each(noWatchList, noWatchPath => {
				if (!noWatchPath.startsWith('/'))
					noWatchPath = '/' + noWatchPath;
				sourceCode.push('!' + packagePath + noWatchPath);
			});
			//[].push.apply(chokidarOpt.ignored, noWatchList);
		}
		var watcher = chokidar.watch(sourceCode, chokidarOpt);
		watcher.on('add', file => onEvent('add', file));
		watcher.on('change', file => onEvent('change', file));
		watcher.on('link', file => onEvent('link', file));
		watcher.on('unlink', file => onEvent('unlink', file));
		function onEvent(evtName, file) {
			var changedPackage = name;
			if (!{}.hasOwnProperty.call(dirty, changedPackage)) {
				dirty[changedPackage] = {};
			}
			var bundle = _.get(packageInfo, ['moduleMap', changedPackage, 'bundle']);
			log.debug('Event:%s file = %j, bundle = %s', evtName, Path.relative(config().rootPath, file), bundle);
			if (!bundle || Path.relative(packagePath, file) === 'package.json') {
				if (evtName === 'unlink')
					dirty.__clean = true;
				dirty.__all = true;
			}
			if (file.endsWith('.less') || file.endsWith('.css') || file.endsWith('.scss'))
				dirty[changedPackage].css = true;
			else
				dirty[changedPackage].js = true;
			onChange();
		}
	}
}
