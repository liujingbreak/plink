"use strict";
const tslib_1 = require("tslib");
const express = require("express");
const Path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
// var favicon = require('serve-favicon');
const log4js = tslib_1.__importStar(require("log4js"));
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9leHByZXNzLWFwcC90cy9hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtQ0FBb0M7QUFFcEMsbURBQTZCO0FBQzdCLCtDQUF5QjtBQUN6QiwwQ0FBMEM7QUFDMUMsdURBQWlDO0FBQ2pDLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM1QyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDeEMsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3JDLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3JDLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN0QywwREFBd0I7QUFDeEIsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDNUMsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3pDLDhEQUE4RDtBQUU5RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQ3BELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLElBQUksR0FBb0IsQ0FBQztBQXNCekIsU0FBUyxNQUFNLENBQUMsR0FBb0IsRUFBRSxPQUFZO0lBQ2pELG9CQUFvQjtJQUNwQixJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ2hCLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7UUFDekIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUTtLQUN6QyxDQUFDLENBQUM7SUFDSCx3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QUFHLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLENBQUMsRUFBRTtZQUM1RCxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU87WUFDcEIsS0FBSyxFQUFFLEVBQUU7U0FDVCxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sR0FBRyxDQUFDO0FBQ1osQ0FBQztBQTdHRCxpQkFBUztJQUNSLFFBQVE7UUFDUCxHQUFHLEdBQUcsT0FBTyxFQUFFLENBQUM7UUFDaEIsUUFBUSxDQUFDLGVBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNuQixlQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxVQUFTLFlBQVk7WUFDekQsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO2dCQUNyQixNQUFNLENBQUMsR0FBRyxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQixlQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxJQUFJLEdBQUcsQ0FBQyxVQUEyQjtRQUNsQyxHQUFHLEdBQUcsVUFBVSxDQUFDO0lBQ2xCLENBQUM7SUFDRCxJQUFJLEdBQUc7UUFDTixPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7Q0FDRCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9leHByZXNzLWFwcC9kaXN0L2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBleHByZXNzID0gcmVxdWlyZSgnZXhwcmVzcycpO1xuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG4vLyB2YXIgZmF2aWNvbiA9IHJlcXVpcmUoJ3NlcnZlLWZhdmljb24nKTtcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xudmFyIGNvb2tpZVBhcnNlciA9IHJlcXVpcmUoJ2Nvb2tpZS1wYXJzZXInKTtcbnZhciBib2R5UGFyc2VyID0gcmVxdWlyZSgnYm9keS1wYXJzZXInKTtcbnZhciBlbmdpbmVzID0gcmVxdWlyZSgnY29uc29saWRhdGUnKTtcbnZhciBzd2lnID0gcmVxdWlyZSgnc3dpZy10ZW1wbGF0ZXMnKTtcbnZhciBzZXR1cEFwaSA9IHJlcXVpcmUoJy4uL3NldHVwQXBpJyk7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbnZhciBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG52YXIgY29tcHJlc3Npb24gPSByZXF1aXJlKCdjb21wcmVzc2lvbicpO1xuLy8gdmFyIHN3aWdJbmplY3RMb2FkZXIgPSByZXF1aXJlKCdzd2lnLXBhY2thZ2UtdG1wbC1sb2FkZXInKTtcblxuY29uc3QgVklFV19QQVRIID0gUGF0aC5yZWxhdGl2ZShhcGkuY29uZmlnKCkucm9vdFBhdGgsXG5cdFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICd2aWV3cycpKTtcbnZhciBhcHA6IGV4cHJlc3MuRXhwcmVzcztcblxuZXhwb3J0ID0ge1xuXHRhY3RpdmF0ZSgpIHtcblx0XHRhcHAgPSBleHByZXNzKCk7XG5cdFx0c2V0dXBBcGkoYXBpLCBhcHApO1xuXHRcdGFwaS5ldmVudEJ1cy5vbigncGFja2FnZXNBY3RpdmF0ZWQnLCBmdW5jdGlvbihwYWNrYWdlQ2FjaGUpIHtcblx0XHRcdGxvZy5pbmZvKCdwYWNrYWdlc0FjdGl2YXRlZCcpO1xuXHRcdFx0cHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG5cdFx0XHRcdGNyZWF0ZShhcHAsIGFwaS5jb25maWcoKSk7XG5cdFx0XHRcdGFwaS5ldmVudEJ1cy5lbWl0KCdhcHBDcmVhdGVkJywgYXBwKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXHRzZXQgYXBwKGV4cHJlc3NBcHA6IGV4cHJlc3MuRXhwcmVzcykge1xuXHRcdGFwcCA9IGV4cHJlc3NBcHA7XG5cdH0sXG5cdGdldCBhcHAoKSB7XG5cdFx0cmV0dXJuIGFwcDtcblx0fVxufTtcblxuZnVuY3Rpb24gY3JlYXRlKGFwcDogZXhwcmVzcy5FeHByZXNzLCBzZXR0aW5nOiBhbnkpIHtcblx0Ly8gdmlldyBlbmdpbmUgc2V0dXBcblx0c3dpZy5zZXREZWZhdWx0cyh7XG5cdFx0dmFyQ29udHJvbHM6IFsnez0nLCAnPX0nXSxcblx0XHRjYWNoZTogc2V0dGluZy5kZXZNb2RlID8gZmFsc2UgOiAnbWVtb3J5J1xuXHR9KTtcblx0Ly8gdmFyIGluamVjdG9yID0gcmVxdWlyZSgnX19pbmplY3RvcicpO1xuXHQvLyB2YXIgdHJhbnNsYXRlSHRtbCA9IHJlcXVpcmUoJ0Bkci90cmFuc2xhdGUtZ2VuZXJhdG9yJykuaHRtbFJlcGxhY2VyKCk7XG5cdC8vIHN3aWdJbmplY3RMb2FkZXIuc3dpZ1NldHVwKHN3aWcsIHtcblx0Ly8gXHRpbmplY3RvcjogaW5qZWN0b3Jcblx0Ly8gXHQvLyBmaWxlQ29udGVudEhhbmRsZXI6IGZ1bmN0aW9uKGZpbGUsIHNvdXJjZSkge1xuXHQvLyBcdC8vIFx0cmV0dXJuIHRyYW5zbGF0ZUh0bWwoc291cmNlLCBmaWxlLCBhcGkuY29uZmlnLmdldCgnbG9jYWxlc1swXScpKTtcblx0Ly8gXHQvLyB9XG5cdC8vIH0pO1xuXG5cdGVuZ2luZXMucmVxdWlyZXMuc3dpZyA9IHN3aWc7XG5cdGFwcC5lbmdpbmUoJ2h0bWwnLCBlbmdpbmVzLnN3aWcpO1xuXHRhcHAuc2V0KCd2aWV3IGNhY2hlJywgZmFsc2UpO1xuXHQvLyBhcHAuZW5naW5lKCdqYWRlJywgZW5naW5lcy5qYWRlKTtcblx0YXBwLnNldCgndHJ1c3QgcHJveHknLCB0cnVlKTtcblx0YXBwLnNldCgndmlld3MnLCBbc2V0dGluZy5yb290UGF0aF0pO1xuXHRhcHAuc2V0KCd2aWV3IGVuZ2luZScsICdodG1sJyk7XG5cdGFwcC5zZXQoJ3gtcG93ZXJlZC1ieScsIGZhbHNlKTtcblx0YXBwLnNldCgnZW52JywgYXBpLmNvbmZpZygpLmRldk1vZGUgPyAnZGV2ZWxvcG1lbnQnIDogJ3Byb2R1Y3Rpb24nKTtcblx0c2V0dXBBcGkuYXBwbHlQYWNrYWdlRGVmaW5lZEFwcFNldHRpbmcoYXBwKTtcblx0Ly8gdW5jb21tZW50IGFmdGVyIHBsYWNpbmcgeW91ciBmYXZpY29uIGluIC9wdWJsaWNcblx0Ly8gYXBwLnVzZShmYXZpY29uKHBhdGguam9pbihfX2Rpcm5hbWUsICdwdWJsaWMnLCAnZmF2aWNvbi5pY28nKSkpO1xuXHQvLyBhcHAudXNlKGxvZ2dlcignZGV2JykpO1xuXHRhcHAudXNlKGxvZzRqcy5jb25uZWN0TG9nZ2VyKGxvZywge1xuXHRcdGxldmVsOiAnSU5GTydcblx0fSkpO1xuXHRhcHAudXNlKGJvZHlQYXJzZXIuanNvbih7XG5cdFx0bGltaXQ6ICc1MG1iJ1xuXHR9KSk7XG5cdGFwcC51c2UoYm9keVBhcnNlci51cmxlbmNvZGVkKHtcblx0XHRleHRlbmRlZDogZmFsc2Vcblx0fSkpO1xuXHRhcHAudXNlKGJvZHlQYXJzZXIucmF3KCkpO1xuXHRhcHAudXNlKGJvZHlQYXJzZXIudGV4dCgpKTtcblx0YXBwLnVzZShjb29raWVQYXJzZXIoKSk7XG5cdGFwcC51c2UoY29tcHJlc3Npb24oKSk7XG5cdC8vIHNldHVwQXBpLmNyZWF0ZVBhY2thZ2VEZWZpbmVkTWlkZGxld2FyZShhcHApO1xuXHRzZXR1cEFwaS5jcmVhdGVQYWNrYWdlRGVmaW5lZFJvdXRlcnMoYXBwKTtcblxuXHRjb25zdCBoYXNoRmlsZSA9IFBhdGguam9pbihhcGkuY29uZmlnKCkucm9vdFBhdGgsICdnaXRoYXNoLXNlcnZlci50eHQnKTtcblx0aWYgKGZzLmV4aXN0c1N5bmMoaGFzaEZpbGUpKSB7XG5cdFx0Y29uc3QgZ2l0aGFzaCA9IGZzLnJlYWRGaWxlU3luYyhoYXNoRmlsZSwgJ3V0ZjgnKTtcblx0XHRhcHAuZ2V0KCcvZ2l0aGFzaC1zZXJ2ZXInLCAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlKSA9PiB7XG5cdFx0XHRyZXMuc2V0KCdDb250ZW50LVR5cGUnLCAndGV4dC9wbGFpbicpO1xuXHRcdFx0cmVzLnNlbmQoZ2l0aGFzaCk7XG5cdFx0fSk7XG5cdFx0YXBwLmdldCgnL2dpdGhhc2gtc2VydmVyLnR4dCcsIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UpID0+IHtcblx0XHRcdHJlcy5zZXQoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L3BsYWluJyk7XG5cdFx0XHRyZXMuc2VuZChnaXRoYXNoKTtcblx0XHR9KTtcblx0fVxuXHQvLyBlcnJvciBoYW5kbGVyc1xuXHQvLyBjYXRjaCA0MDQgYW5kIGZvcndhcmQgdG8gZXJyb3IgaGFuZGxlclxuXHRhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cdFx0bG9nLmluZm8oJ05vdCBGb3VuZDogJyArIHJlcS5vcmlnaW5hbFVybCk7XG5cdFx0dmFyIGVyciA9IG5ldyBFcnJvcignTm90IEZvdW5kJyk7XG5cdFx0KGVyciBhcyBhbnkpLnN0YXR1cyA9IDQwNDtcblx0XHRuZXh0KGVycik7XG5cdH0pO1xuXG5cdC8vIGRldmVsb3BtZW50IGVycm9yIGhhbmRsZXJcblx0Ly8gd2lsbCBwcmludCBzdGFja3RyYWNlXG5cdGlmIChzZXR0aW5nLmRldk1vZGUgfHwgYXBwLmdldCgnZW52JykgPT09ICdkZXZlbG9wbWVudCcpIHtcblx0XHRhcHAudXNlKGZ1bmN0aW9uKGVycjogRXJyb3IsIHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSB7XG5cdFx0XHRyZXMuc3RhdHVzKChlcnIgYXMgYW55KS5zdGF0dXMgfHwgNTAwKTtcblx0XHRcdGxvZy5lcnJvcihyZXEub3JpZ2luYWxVcmwsIGVycik7XG5cdFx0XHRyZXMucmVuZGVyKFBhdGguam9pbihWSUVXX1BBVEgsICdfZHJjcC1leHByZXNzLWVycm9yLmh0bWwnKSwge1xuXHRcdFx0XHRtZXNzYWdlOiBlcnIubWVzc2FnZSxcblx0XHRcdFx0ZXJyb3I6IGVyclxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBwcm9kdWN0aW9uIGVycm9yIGhhbmRsZXJcblx0Ly8gbm8gc3RhY2t0cmFjZXMgbGVha2VkIHRvIHVzZXJcblx0YXBwLnVzZShmdW5jdGlvbihlcnI6IEVycm9yLCByZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuXHRcdHJlcy5zdGF0dXMoKGVyciBhcyBhbnkpLnN0YXR1cyB8fCA1MDApO1xuXHRcdGxvZy5lcnJvcihyZXEub3JpZ2luYWxVcmwsIGVycik7XG5cdFx0cmVzLnJlbmRlcihQYXRoLmpvaW4oVklFV19QQVRILCAnX2RyY3AtZXhwcmVzcy1lcnJvci5odG1sJyksIHtcblx0XHRcdG1lc3NhZ2U6IGVyci5tZXNzYWdlLFxuXHRcdFx0ZXJyb3I6IHt9XG5cdFx0fSk7XG5cdH0pO1xuXHRyZXR1cm4gYXBwO1xufVxuIl19
