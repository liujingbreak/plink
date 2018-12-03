/*eslint no-loop-func: 0*/
// var gulp = require('gulp');
// var webpackStream = require('webpack-stream');
const webpack = require('webpack');
const chalk = require('chalk');
const api = require('__api');
const fs = require('fs-extra');
//const mkdirp = require('mkdirp');
const Tapable = require('tapable');
const _ = require('lodash');
const log = require('log4js').getLogger(api.packageName);
const Promise = require('bluebird');
const moreWebpackOptions = require('./configs/moreWebpackOptions.js');
const hotMiddleware = require('webpack-hot-middleware');
// const mutilEntryHtmlPlugin = require('../lib/multi-entry-html-plugin');
const dllConfig = require('./configs/dll-plugin-config');
const createWebpackConfig = require('./webpack.config.js');
const lr = require('tiny-lr');
const Url = require('url');
//const LiveReloadPlugin = require('webpack-livereload-plugin');

const tapable = new Tapable();

exports.tapable = tapable;
api.webpackConfigTapable = tapable;

tapable.plugin('wp-filename', function(nameFormat) {
	return nameFormat.replace(/^(.*)\.([^.]*)?$/, `$1${api.config.get([api.packageName, 'fileNameSuffix'], '')}.$2`);
});

require('./dist/extend-builder-api');

exports.compile = () => {
	var angularCliParam = api.config()._angularCli;
	if (angularCliParam)
		return;
	return initWebpackConfig()
	.then(webpackConfig => {
		if (_.size(webpackConfig.entry) === 0)
			return null;
		return Promise.promisify(webpack)(webpackConfig);
	})
	.then(stats => {
		onSuccess(stats);
	});
	//.catch(onFail);
};

exports.activate = function() {
	var angularCliParam = api.config()._angularCli;
	if (!angularCliParam && !api.argv.ww && !api.argv.poll)
		return;
	var webpackMiddleware = require('webpack-dev-middleware');
	fs.mkdirsSync(api.config.resolve('destDir', 'webpack-temp'));

	let webpackRootPath = '/';
	if (angularCliParam.browserOptions.deployUrl) {
		webpackRootPath = _.trimEnd(Url.parse(angularCliParam.browserOptions.deployUrl).pathname, '/');
	}


	return Promise.coroutine(function*() {
		if (!api.argv.hmr) {
			yield startLivereloadAsyc();
		}
		yield api.runBuilder({browserify: false}, api.packageName);
		var webpackConfig;
		if (api.webpackConfig) {
			// From Angular cli, ng-app-builder
			webpackConfig = api.webpackConfig;
		} else
			webpackConfig = yield initWebpackConfig();
		if (_.size(webpackConfig.entry) === 0)
			return;
		var compiler = webpack(webpackConfig);
		api.use(webpackMiddleware(compiler, {
			//noInfo: true,
			watchOptions: {
				poll: api.argv.poll ? true : false,
				aggregateTimeout: 300
			},
			stats: webpackStateOption(),
			publicPath: api.isDefaultLocale() ? webpackRootPath : webpackRootPath + '/' + api.getBuildLocale()
		}));
		if (api.argv.hmr) {
			log.info('Enable ' + chalk.yellow('Hot module replacement mode (HMR)'));
			api.use(hotMiddleware(compiler));
		}
	})()
	.catch(onFail);
};

function initWebpackConfig() {
	return Promise.coroutine(function*() {
		var pluginParams = moreWebpackOptions.createParams(api.config().rootPath);
		var webpackConfig = createWebpackConfig(...pluginParams.params);
		yield dllConfig(webpackConfig);

		// Allow other LEGO component extends this webpack configure object
		var changedConfig = yield Promise.promisify(tapable.applyPluginsAsyncWaterfall.bind(tapable))(
			'webpackConfig', webpackConfig);
		yield pluginParams.writeEntryFileAsync(changedConfig.module.rules);
		return changedConfig;
	})();
}

function onSuccess(stats) {
	if (!stats)
		return null;
	log.info(_.repeat('=', 30));
	log.info(stats.toString(webpackStateOption()));
	if (stats.hasErrors()) {
		throw new Error('Webpack build contains errors');
	}
	return stats;
}

function onFail(err) {
	log.error(err.stack || err);
	if (err.details) {
		_.each([].concat(err.details), err => log.error('webpack failure detail', err));
	}
}

function webpackStateOption() {
	return {
		chunks: false,  // Makes the build much quieter
		colors: true,    // Shows colors in the console
		publicPath: true,
		children: false,
		moduleTrace: false,
		chunkModules: false,
		chunkOrigins: false,
		entrypoints: false,
		modules: false,
		reasons: false
	};
}

function startLivereloadAsyc() {
	if (api.config.get('devMode') === true && api.config.get('livereload.enabled', true)) {
		return _tryLrOnPort();
	}
	return Promise.resolve(null);
}

function _tryLrOnPort(lrPort, lrServer) {
	if (lrPort)
		api.config.set('livereload.port', lrPort);
	else
		lrPort = api.config.get('livereload.port');
	return new Promise((resolve, reject) => {
		if (!lrServer)
			lrServer = lr({
				errorListener: err => {
					if (err.code === 'EADDRINUSE') {
						log.warn('Livereload port conflict in ', lrPort);
						resolve(lrPort + 1);
					}
					reject(err);
				}
			});
		lrServer.listen(lrPort, (m) => {
			resolve(null);
		});
	})
	.then(port => {
		if (port != null)
			return _tryLrOnPort(port, lrServer);
		log.info('Yo~ Live reload(tiny-lr) server is running on port %d', lrPort);
		return null;
	});
}


