"use strict";
const tslib_1 = require("tslib");
const express = require("express");
const Path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
// var favicon = require('serve-favicon');
const log4js = tslib_1.__importStar(require("log4js"));
var cookieParser = require('cookie-parser');
// var bodyParser = require('body-parser');
const body_parser_1 = tslib_1.__importDefault(require("body-parser"));
var engines = require('consolidate');
var swig = require('swig-templates');
var setupApi = require('../setupApi');
const __api_1 = tslib_1.__importDefault(require("__api"));
var log = log4js.getLogger(__api_1.default.packageName);
var compression = require('compression');
// var swigInjectLoader = require('swig-package-tmpl-loader');
const VIEW_PATH = Path.relative(__api_1.default.config().rootPath, Path.resolve(__dirname, '..', 'views'));
var app;
function create(app, setting) {
    // view engine setup
    swig.setDefaults({
        varControls: ['{=', '=}'],
        cache: setting.devMode ? false : 'memory'
    });
    // var injector = require('__injector');
    // var translateHtml = require('@dr/translate-generator').htmlReplacer();
    // swigInjectLoader.swigSetup(swig, {
    // 	injector: injector
    // 	// fileContentHandler: function(file, source) {
    // 	// 	return translateHtml(source, file, api.config.get('locales[0]'));
    // 	// }
    // });
    engines.requires.swig = swig;
    app.engine('html', engines.swig);
    app.set('view cache', false);
    // app.engine('jade', engines.jade);
    app.set('trust proxy', true);
    app.set('views', [setting.rootPath]);
    app.set('view engine', 'html');
    app.set('x-powered-by', false);
    app.set('env', __api_1.default.config().devMode ? 'development' : 'production');
    setupApi.applyPackageDefinedAppSetting(app);
    // uncomment after placing your favicon in /public
    // app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
    // app.use(logger('dev'));
    app.use(log4js.connectLogger(log, {
        level: 'INFO'
    }));
    app.use(body_parser_1.default.json({
        limit: '50mb'
    }));
    app.use(body_parser_1.default.urlencoded({
        extended: false,
        limit: '50mb'
    }));
    app.use(body_parser_1.default.raw({
        limit: '50mb'
    }));
    app.use(body_parser_1.default.text({
        limit: '50mb'
    }));
    app.use(cookieParser());
    app.use(compression());
    // setupApi.createPackageDefinedMiddleware(app);
    setupApi.createPackageDefinedRouters(app);
    const hashFile = Path.join(__api_1.default.config().rootPath, 'githash-server.txt');
    if (fs.existsSync(hashFile)) {
        const githash = fs.readFileSync(hashFile, 'utf8');
        app.get('/githash-server', (req, res) => {
            res.set('Content-Type', 'text/plain');
            res.send(githash);
        });
        app.get('/githash-server.txt', (req, res) => {
            res.set('Content-Type', 'text/plain');
            res.send(githash);
        });
    }
    // error handlers
    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
        log.info('Not Found: ' + req.originalUrl);
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });
    // development error handler
    // will print stacktrace
    if (setting.devMode || app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            log.error(req.originalUrl, err);
            res.render(Path.join(VIEW_PATH, '_drcp-express-error.html'), {
                message: err.message,
                error: err
            });
        });
    }
    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        log.error(req.originalUrl, err);
        res.render(Path.join(VIEW_PATH, '_drcp-express-error.html'), {
            message: err.message,
            error: {}
        });
    });
    return app;
}
module.exports = {
    activate() {
        app = express();
        setupApi(__api_1.default, app);
        __api_1.default.eventBus.on('packagesActivated', function (packageCache) {
            log.info('packagesActivated');
            process.nextTick(() => {
                create(app, __api_1.default.config());
                __api_1.default.eventBus.emit('appCreated', app);
            });
        });
    },
    set app(expressApp) {
        app = expressApp;
    },
    get app() {
        return app;
    }
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9leHByZXNzLWFwcC90cy9hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtQ0FBb0M7QUFFcEMsbURBQTZCO0FBQzdCLCtDQUF5QjtBQUN6QiwwQ0FBMEM7QUFDMUMsdURBQWlDO0FBQ2pDLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM1QywyQ0FBMkM7QUFDM0Msc0VBQXFDO0FBQ3JDLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNyQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNyQyxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDdEMsMERBQXdCO0FBQ3hCLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzVDLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN6Qyw4REFBOEQ7QUFFOUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUNwRCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUN6QyxJQUFJLEdBQW9CLENBQUM7QUFzQnpCLFNBQVMsTUFBTSxDQUFDLEdBQW9CLEVBQUUsT0FBWTtJQUNqRCxvQkFBb0I7SUFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNoQixXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQ3pCLEtBQUssRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVE7S0FDekMsQ0FBQyxDQUFDO0lBQ0gsd0NBQXdDO0lBQ3hDLHlFQUF5RTtJ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RSxHQUFXLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDBCQUEwQixDQUFDLEVBQUU7WUFDNUQsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO1lBQ3BCLEtBQUssRUFBRSxFQUFFO1NBQ1QsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFsSEQsaUJBQVM7SUFDUixRQUFRO1FBQ1AsR0FBRyxHQUFHLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLFFBQVEsQ0FBQyxlQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbkIsZUFBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxZQUFZO1lBQ3pELEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUM5QixPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtnQkFDckIsTUFBTSxDQUFDLEdBQUcsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDMUIsZUFBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsSUFBSSxHQUFHLENBQUMsVUFBMkI7UUFDbEMsR0FBRyxHQUFHLFVBQVUsQ0FBQztJQUNsQixDQUFDO0lBQ0QsSUFBSSxHQUFHO1FBQ04sT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0NBQ0QsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvZXhwcmVzcy1hcHAvZGlzdC9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcyA9IHJlcXVpcmUoJ2V4cHJlc3MnKTtcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gdmFyIGZhdmljb24gPSByZXF1aXJlKCdzZXJ2ZS1mYXZpY29uJyk7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbnZhciBjb29raWVQYXJzZXIgPSByZXF1aXJlKCdjb29raWUtcGFyc2VyJyk7XG4vLyB2YXIgYm9keVBhcnNlciA9IHJlcXVpcmUoJ2JvZHktcGFyc2VyJyk7XG5pbXBvcnQgYm9keVBhcnNlciBmcm9tICdib2R5LXBhcnNlcic7XG52YXIgZW5naW5lcyA9IHJlcXVpcmUoJ2NvbnNvbGlkYXRlJyk7XG52YXIgc3dpZyA9IHJlcXVpcmUoJ3N3aWctdGVtcGxhdGVzJyk7XG52YXIgc2V0dXBBcGkgPSByZXF1aXJlKCcuLi9zZXR1cEFwaScpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG52YXIgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xudmFyIGNvbXByZXNzaW9uID0gcmVxdWlyZSgnY29tcHJlc3Npb24nKTtcbi8vIHZhciBzd2lnSW5qZWN0TG9hZGVyID0gcmVxdWlyZSgnc3dpZy1wYWNrYWdlLXRtcGwtbG9hZGVyJyk7XG5cbmNvbnN0IFZJRVdfUEFUSCA9IFBhdGgucmVsYXRpdmUoYXBpLmNvbmZpZygpLnJvb3RQYXRoLFxuXHRQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAndmlld3MnKSk7XG52YXIgYXBwOiBleHByZXNzLkV4cHJlc3M7XG5cbmV4cG9ydCA9IHtcblx0YWN0aXZhdGUoKSB7XG5cdFx0YXBwID0gZXhwcmVzcygpO1xuXHRcdHNldHVwQXBpKGFwaSwgYXBwKTtcblx0XHRhcGkuZXZlbnRCdXMub24oJ3BhY2thZ2VzQWN0aXZhdGVkJywgZnVuY3Rpb24ocGFja2FnZUNhY2hlKSB7XG5cdFx0XHRsb2cuaW5mbygncGFja2FnZXNBY3RpdmF0ZWQnKTtcblx0XHRcdHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuXHRcdFx0XHRjcmVhdGUoYXBwLCBhcGkuY29uZmlnKCkpO1xuXHRcdFx0XHRhcGkuZXZlbnRCdXMuZW1pdCgnYXBwQ3JlYXRlZCcsIGFwcCk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcblx0c2V0IGFwcChleHByZXNzQXBwOiBleHByZXNzLkV4cHJlc3MpIHtcblx0XHRhcHAgPSBleHByZXNzQXBwO1xuXHR9LFxuXHRnZXQgYXBwKCkge1xuXHRcdHJldHVybiBhcHA7XG5cdH1cbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZShhcHA6IGV4cHJlc3MuRXhwcmVzcywgc2V0dGluZzogYW55KSB7XG5cdC8vIHZpZXcgZW5naW5lIHNldHVwXG5cdHN3aWcuc2V0RGVmYXVsdHMoe1xuXHRcdHZhckNvbnRyb2xzOiBbJ3s9JywgJz19J10sXG5cdFx0Y2FjaGU6IHNldHRpbmcuZGV2TW9kZSA/IGZhbHNlIDogJ21lbW9yeSdcblx0fSk7XG5cdC8vIHZhciBpbmplY3RvciA9IHJlcXVpcmUoJ19faW5qZWN0b3InKTtcblx0Ly8gdmFyIHRyYW5zbGF0ZUh0bWwgPSByZXF1aXJlKCdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcicpLmh0bWxSZXBsYWNlcigpO1xuXHQvLyBzd2lnSW5qZWN0TG9hZGVyLnN3aWdTZXR1cChzd2lnLCB7XG5cdC8vIFx0aW5qZWN0b3I6IGluamVjdG9yXG5cdC8vIFx0Ly8gZmlsZUNvbnRlbnRIYW5kbGVyOiBmdW5jdGlvbihmaWxlLCBzb3VyY2UpIHtcblx0Ly8gXHQvLyBcdHJldHVybiB0cmFuc2xhdGVIdG1sKHNvdXJjZSwgZmlsZSwgYXBpLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSk7XG5cdC8vIFx0Ly8gfVxuXHQvLyB9KTtcblxuXHRlbmdpbmVzLnJlcXVpcmVzLnN3aWcgPSBzd2lnO1xuXHRhcHAuZW5naW5lKCdodG1sJywgZW5naW5lcy5zd2lnKTtcblx0YXBwLnNldCgndmlldyBjYWNoZScsIGZhbHNlKTtcblx0Ly8gYXBwLmVuZ2luZSgnamFkZScsIGVuZ2luZXMuamFkZSk7XG5cdGFwcC5zZXQoJ3RydXN0IHByb3h5JywgdHJ1ZSk7XG5cdGFwcC5zZXQoJ3ZpZXdzJywgW3NldHRpbmcucm9vdFBhdGhdKTtcblx0YXBwLnNldCgndmlldyBlbmdpbmUnLCAnaHRtbCcpO1xuXHRhcHAuc2V0KCd4LXBvd2VyZWQtYnknLCBmYWxzZSk7XG5cdGFwcC5zZXQoJ2VudicsIGFwaS5jb25maWcoKS5kZXZNb2RlID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJyk7XG5cdHNldHVwQXBpLmFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nKGFwcCk7XG5cdC8vIHVuY29tbWVudCBhZnRlciBwbGFjaW5nIHlvdXIgZmF2aWNvbiBpbiAvcHVibGljXG5cdC8vIGFwcC51c2UoZmF2aWNvbihwYXRoLmpvaW4oX19kaXJuYW1lLCAncHVibGljJywgJ2Zhdmljb24uaWNvJykpKTtcblx0Ly8gYXBwLnVzZShsb2dnZXIoJ2RldicpKTtcblx0YXBwLnVzZShsb2c0anMuY29ubmVjdExvZ2dlcihsb2csIHtcblx0XHRsZXZlbDogJ0lORk8nXG5cdH0pKTtcblx0YXBwLnVzZShib2R5UGFyc2VyLmpzb24oe1xuXHRcdGxpbWl0OiAnNTBtYidcblx0fSkpO1xuXHRhcHAudXNlKGJvZHlQYXJzZXIudXJsZW5jb2RlZCh7XG5cdFx0ZXh0ZW5kZWQ6IGZhbHNlLFxuXHRcdGxpbWl0OiAnNTBtYidcblx0fSkpO1xuXHRhcHAudXNlKGJvZHlQYXJzZXIucmF3KHtcblx0XHRsaW1pdDogJzUwbWInXG5cdH0pKTtcblx0YXBwLnVzZShib2R5UGFyc2VyLnRleHQoe1xuXHRcdGxpbWl0OiAnNTBtYidcblx0fSkpO1xuXHRhcHAudXNlKGNvb2tpZVBhcnNlcigpKTtcblx0YXBwLnVzZShjb21wcmVzc2lvbigpKTtcblx0Ly8gc2V0dXBBcGkuY3JlYXRlUGFja2FnZURlZmluZWRNaWRkbGV3YXJlKGFwcCk7XG5cdHNldHVwQXBpLmNyZWF0ZVBhY2thZ2VEZWZpbmVkUm91dGVycyhhcHApO1xuXG5cdGNvbnN0IGhhc2hGaWxlID0gUGF0aC5qb2luKGFwaS5jb25maWcoKS5yb290UGF0aCwgJ2dpdGhhc2gtc2VydmVyLnR4dCcpO1xuXHRpZiAoZnMuZXhpc3RzU3luYyhoYXNoRmlsZSkpIHtcblx0XHRjb25zdCBnaXRoYXNoID0gZnMucmVhZEZpbGVTeW5jKGhhc2hGaWxlLCAndXRmOCcpO1xuXHRcdGFwcC5nZXQoJy9naXRoYXNoLXNlcnZlcicsIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UpID0+IHtcblx0XHRcdHJlcy5zZXQoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L3BsYWluJyk7XG5cdFx0XHRyZXMuc2VuZChnaXRoYXNoKTtcblx0XHR9KTtcblx0XHRhcHAuZ2V0KCcvZ2l0aGFzaC1zZXJ2ZXIudHh0JywgKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSkgPT4ge1xuXHRcdFx0cmVzLnNldCgnQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKTtcblx0XHRcdHJlcy5zZW5kKGdpdGhhc2gpO1xuXHRcdH0pO1xuXHR9XG5cdC8vIGVycm9yIGhhbmRsZXJzXG5cdC8vIGNhdGNoIDQwNCBhbmQgZm9yd2FyZCB0byBlcnJvciBoYW5kbGVyXG5cdGFwcC51c2UoZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcblx0XHRsb2cuaW5mbygnTm90IEZvdW5kOiAnICsgcmVxLm9yaWdpbmFsVXJsKTtcblx0XHR2YXIgZXJyID0gbmV3IEVycm9yKCdOb3QgRm91bmQnKTtcblx0XHQoZXJyIGFzIGFueSkuc3RhdHVzID0gNDA0O1xuXHRcdG5leHQoZXJyKTtcblx0fSk7XG5cblx0Ly8gZGV2ZWxvcG1lbnQgZXJyb3IgaGFuZGxlclxuXHQvLyB3aWxsIHByaW50IHN0YWNrdHJhY2Vcblx0aWYgKHNldHRpbmcuZGV2TW9kZSB8fCBhcHAuZ2V0KCdlbnYnKSA9PT0gJ2RldmVsb3BtZW50Jykge1xuXHRcdGFwcC51c2UoZnVuY3Rpb24oZXJyOiBFcnJvciwgcmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcblx0XHRcdHJlcy5zdGF0dXMoKGVyciBhcyBhbnkpLnN0YXR1cyB8fCA1MDApO1xuXHRcdFx0bG9nLmVycm9yKHJlcS5vcmlnaW5hbFVybCwgZXJyKTtcblx0XHRcdHJlcy5yZW5kZXIoUGF0aC5qb2luKFZJRVdfUEFUSCwgJ19kcmNwLWV4cHJlc3MtZXJyb3IuaHRtbCcpLCB7XG5cdFx0XHRcdG1lc3NhZ2U6IGVyci5tZXNzYWdlLFxuXHRcdFx0XHRlcnJvcjogZXJyXG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIHByb2R1Y3Rpb24gZXJyb3IgaGFuZGxlclxuXHQvLyBubyBzdGFja3RyYWNlcyBsZWFrZWQgdG8gdXNlclxuXHRhcHAudXNlKGZ1bmN0aW9uKGVycjogRXJyb3IsIHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSB7XG5cdFx0cmVzLnN0YXR1cygoZXJyIGFzIGFueSkuc3RhdHVzIHx8IDUwMCk7XG5cdFx0bG9nLmVycm9yKHJlcS5vcmlnaW5hbFVybCwgZXJyKTtcblx0XHRyZXMucmVuZGVyKFBhdGguam9pbihWSUVXX1BBVEgsICdfZHJjcC1leHByZXNzLWVycm9yLmh0bWwnKSwge1xuXHRcdFx0bWVzc2FnZTogZXJyLm1lc3NhZ2UsXG5cdFx0XHRlcnJvcjoge31cblx0XHR9KTtcblx0fSk7XG5cdHJldHVybiBhcHA7XG59XG4iXX0=
