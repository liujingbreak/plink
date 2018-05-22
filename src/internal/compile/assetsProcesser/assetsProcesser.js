var gulp = require('gulp');
var through = require('through2');
var Path = require('path');
var fs = require('fs');
var es = require('event-stream');
var _ = require('lodash');
var shell = require('shelljs');
var mkdirp = require('mkdirp');
var api = require('__api');
var log = require('log4js').getLogger(api.packageName);
var serverFavicon = require('serve-favicon');

var buildUtils = api.buildUtils;

var packageUtils = api.packageUtils;
var config = api.config;

module.exports = {
	compile,
	activate
};

function compile(api) {
	var argv = api.argv;
	packageUtils = api.packageUtils;
	config = api.config;
	if (config().devMode && !argv.copyAssets) {
		log.info('DevMode enabled, skip copying assets to static folder');
		return;
	}
	if (!api.isDefaultLocale() && !argv.copyAssets) {
		log.info('Build for "%s" which is not default locale, skip copying assets to static folder',
			api.getBuildLocale());
		return;
	}

	copyRootPackageFavicon();
	const {zipStatic} = require('./dist/zip');
	return copyAssets()
	.then(zipStatic);
}

function activate() {
	var staticFolder = api.config.resolve('staticDir');
	log.debug('express static path: ' + staticFolder);

	var favicon = findFavicon();
	if (favicon)
		api.use(serverFavicon(favicon));

	var maxAgeMap = api.config.get('cacheControlMaxAge', {
		js: '365 days',
		css: '365 days',
		less: '365 days',
		html: 0,
		png: '365 days',
		jpg: '365 days',
		gif: '365 days',
		svg: '365 days',
	});
	log.info('Serve static dir', staticFolder);
	api.use('/', staticRoute(staticFolder));
	api.use('/', staticRoute(api.config.resolve('dllDestDir')));
	if (!api.config().devMode) {
		return;
	}

	var localePrefix = '';
	// if (!api.isDefaultLocale())
	// 	localePrefix = api.getBuildLocale() + '/';
	api.packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
		var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
		var assetsDir = Path.join(packagePath, assetsFolder);
		var assetsDirMap = api.config.get('outputPathMap.' + name);
		if (assetsDirMap != null)
			assetsDirMap = _.trim(assetsDirMap, '/');
		if (fs.existsSync(assetsDir)) {
			var path = '/' + localePrefix + (assetsDirMap != null ? assetsDirMap : parsedName.name);
			if (path.length > 1)
				path += '/';
			log.info('route ' + path + ' -> ' + assetsDir);

			api.use(path, staticRoute(assetsDir));
		}
	});

	function staticRoute(staticDir) {
		return function(req, res, next) {
			var ext = Path.extname(req.path).toLowerCase();
			if (ext.startsWith('.'))
				ext = ext.substring(1);
			api.express.static(staticDir, {
				maxAge: _.isObject(maxAgeMap) ?
					(_.has(maxAgeMap, ext) ? maxAgeMap[ext] : 0) :
					maxAgeMap,
				setHeaders: setCORSHeader
			})(req, res, next);
		};
	}
}

function copyRootPackageFavicon() {
	var favicon = findFavicon();
	if (!favicon)
		return;
	log.info('Copy favicon.ico from ' + favicon);
	mkdirp.sync(config.resolve('staticDir'));
	shell.cp('-f', Path.resolve(favicon), Path.resolve(config().rootPath, config.resolve('staticDir')));
}

function findFavicon() {
	return _findFaviconInConfig('packageContextPathMapping') || _findFaviconInConfig('outputPathMap');
}

function _findFaviconInConfig(property) {
	if (!api.config()[property]) {
		return null;
	}
	var faviconFile = null;
	var faviconPackage;
	_.each(config()[property], (path, pkName) => {
		if (path === '/') {
			packageUtils.lookForPackages(pkName, (fullName, entryPath, parsedName, json, packagePath) => {
				var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
				var favicon = Path.join(packagePath, assetsFolder, 'favicon.ico');
				if (fs.existsSync(favicon)) {
					if (faviconFile) {
						log.warn('Found duplicate favicon file in', fullName, 'existing', faviconPackage);
					}
					faviconFile = Path.resolve(favicon);
				}
			});
		}
	});
	return faviconFile;
}

function copyAssets() {
	var streams = [];
	packageUtils.findBrowserPackageByType(['*'], function(name, entryPath, parsedName, json, packagePath) {
		var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
		var assetsDir = Path.join(packagePath, assetsFolder);
		if (fs.existsSync(assetsDir)) {
			var assetsDirMap = api.config.get('outputPathMap.' + name);
			if (assetsDirMap != null)
				assetsDirMap = _.trim(assetsDirMap, '/');
			var src = [Path.join(packagePath, assetsFolder, '**', '*')];
			var stream = gulp.src(src, {base: Path.join(packagePath, assetsFolder)})
			.pipe(through.obj(function(file, enc, next) {
				var pathInPk = Path.relative(assetsDir, file.path);
				file.path = Path.join(assetsDir, assetsDirMap != null ? assetsDirMap : parsedName.name, pathInPk);
				log.debug(file.path);
				//file.path = file.path
				next(null, file);
			}));
			streams.push(stream);
		}
	});
	if (streams.length === 0) {
		return null;
	}
	return new Promise((resolve, reject) => {
		es.merge(streams)
		.pipe(gulp.dest(config.resolve('staticDir')))
		.on('end', function() {
			log.debug('flush');
			buildUtils.writeTimestamp('assets');
			resolve();
		})
		.on('error', reject);
	});
}

function setCORSHeader(res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
}
