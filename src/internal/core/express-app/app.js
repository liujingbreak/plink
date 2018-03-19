var express = require('express');
var path = require('path');
//var favicon = require('serve-favicon');
//var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var engines = require('consolidate');
var swig = require('swig-templates');
var setupApi = require('./setupApi');
var log4js = require('log4js');
var api = require('__api');
var log = log4js.getLogger(api.packageName);
var compression = require('compression');
//var swigInjectLoader = require('swig-package-tmpl-loader');

var app;
module.exports = {
	activate() {
		app = express();
		setupApi(api, app);
		api.eventBus.on('packagesActivated', function(packageCache) {
			process.nextTick(() => {
				create(app, api.config());
				api.eventBus.emit('appCreated', app);
			});
		});
	}
};

Object.defineProperties(module.exports, {
	/**
	 * Express app instance.
	 * Assign another express app instance instead of a default one,
	 * otherwise a default express app instance will be created.
	 * @type {Object}
	 */
	app: {
		enumerable: true,
		set: expressApp => app = expressApp,
		get: () => app
	}
});

function create(app, setting) {
	// view engine setup
	swig.setDefaults({
		varControls: ['{=', '=}'],
		cache: setting.devMode ? false : 'memory'
	});
	//var injector = require('__injector');
	//var translateHtml = require('@dr/translate-generator').htmlReplacer();
	// swigInjectLoader.swigSetup(swig, {
	// 	injector: injector
	// 	// fileContentHandler: function(file, source) {
	// 	// 	return translateHtml(source, file, api.config.get('locales[0]'));
	// 	// }
	// });

	engines.requires.swig = swig;
	app.engine('html', engines.swig);
	app.set('view cache', false);
	//app.engine('jade', engines.jade);
	app.set('trust proxy', true);
	app.set('views', [path.join(__dirname, 'views'), setting.rootPath]);
	app.set('view engine', 'html');
	app.set('x-powered-by', false);
	app.set('env', api.config().devMode ? 'development' : 'production');
	setupApi.applyPackageDefinedAppSetting(app);
	// uncomment after placing your favicon in /public
	//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
	//app.use(logger('dev'));
	app.use(log4js.connectLogger(log, {
		level: log4js.levels.INFO
	}));
	app.use(bodyParser.json({
		limit: '50mb'
	}));
	app.use(bodyParser.urlencoded({
		extended: false
	}));
	app.use(bodyParser.raw());
	app.use(bodyParser.text());
	app.use(cookieParser());
	app.use(compression());
	//setupApi.createPackageDefinedMiddleware(app);
	setupApi.createPackageDefinedRouters(app);

	// error handlers
	// catch 404 and forward to error handler
	app.use(function(req, res, next) {
		log.info('originalUrl: ' + req.originalUrl);
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});
	// development error handler
	// will print stacktrace
	if (setting.devMode || app.get('env') === 'development') {
		app.use(function(err, req, res, next) {
			res.status(err.status || 500);
			log.error(req.originalUrl, err);
			res.render('error.html', {
				message: err.message,
				error: err
			});
		});
	}

	// production error handler
	// no stacktraces leaked to user
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		log.error(req.originalUrl, err);
		res.render('error.html', {
			message: err.message,
			error: {}
		});
	});
	return app;
}
