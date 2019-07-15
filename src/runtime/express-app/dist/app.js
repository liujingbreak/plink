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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9leHByZXNzLWFwcC90cy9hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtQ0FBb0M7QUFFcEMsbURBQTZCO0FBQzdCLCtDQUF5QjtBQUN6QiwwQ0FBMEM7QUFDMUMsdURBQWlDO0FBQ2pDLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM1QywyQ0FBMkM7QUFDM0Msc0VBQXFDO0FBQ3JDLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNyQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNyQyxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDdEMsMERBQXdCO0FBQ3hCLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzVDLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN6Qyw4REFBOEQ7QUFFOUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUNuRCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUMxQyxJQUFJLEdBQW9CLENBQUM7QUFzQnpCLFNBQVMsTUFBTSxDQUFDLEdBQW9CLEVBQUUsT0FBWTtJQUNoRCxvQkFBb0I7SUFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNmLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7UUFDekIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUTtLQUMxQyxDQUFDLENBQUM7SUFDSCx3Q0FBd0M7SUFDeEMseUVBQXlFO0lB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LEdBQVcsQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUM7UUFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLENBQUMsRUFBRTtZQUMzRCxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU87WUFDcEIsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQWxIRCxpQkFBUztJQUNQLFFBQVE7UUFDTixHQUFHLEdBQUcsT0FBTyxFQUFFLENBQUM7UUFDaEIsUUFBUSxDQUFDLGVBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNuQixlQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxVQUFTLFlBQVk7WUFDeEQsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO2dCQUNwQixNQUFNLENBQUMsR0FBRyxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQixlQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFDRCxJQUFJLEdBQUcsQ0FBQyxVQUEyQjtRQUNqQyxHQUFHLEdBQUcsVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFDRCxJQUFJLEdBQUc7UUFDTCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FDRixDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9leHByZXNzLWFwcC9kaXN0L2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBleHByZXNzID0gcmVxdWlyZSgnZXhwcmVzcycpO1xuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG4vLyB2YXIgZmF2aWNvbiA9IHJlcXVpcmUoJ3NlcnZlLWZhdmljb24nKTtcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xudmFyIGNvb2tpZVBhcnNlciA9IHJlcXVpcmUoJ2Nvb2tpZS1wYXJzZXInKTtcbi8vIHZhciBib2R5UGFyc2VyID0gcmVxdWlyZSgnYm9keS1wYXJzZXInKTtcbmltcG9ydCBib2R5UGFyc2VyIGZyb20gJ2JvZHktcGFyc2VyJztcbnZhciBlbmdpbmVzID0gcmVxdWlyZSgnY29uc29saWRhdGUnKTtcbnZhciBzd2lnID0gcmVxdWlyZSgnc3dpZy10ZW1wbGF0ZXMnKTtcbnZhciBzZXR1cEFwaSA9IHJlcXVpcmUoJy4uL3NldHVwQXBpJyk7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbnZhciBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG52YXIgY29tcHJlc3Npb24gPSByZXF1aXJlKCdjb21wcmVzc2lvbicpO1xuLy8gdmFyIHN3aWdJbmplY3RMb2FkZXIgPSByZXF1aXJlKCdzd2lnLXBhY2thZ2UtdG1wbC1sb2FkZXInKTtcblxuY29uc3QgVklFV19QQVRIID0gUGF0aC5yZWxhdGl2ZShhcGkuY29uZmlnKCkucm9vdFBhdGgsXG4gIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICd2aWV3cycpKTtcbnZhciBhcHA6IGV4cHJlc3MuRXhwcmVzcztcblxuZXhwb3J0ID0ge1xuICBhY3RpdmF0ZSgpIHtcbiAgICBhcHAgPSBleHByZXNzKCk7XG4gICAgc2V0dXBBcGkoYXBpLCBhcHApO1xuICAgIGFwaS5ldmVudEJ1cy5vbigncGFja2FnZXNBY3RpdmF0ZWQnLCBmdW5jdGlvbihwYWNrYWdlQ2FjaGUpIHtcbiAgICAgIGxvZy5pbmZvKCdwYWNrYWdlc0FjdGl2YXRlZCcpO1xuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIGNyZWF0ZShhcHAsIGFwaS5jb25maWcoKSk7XG4gICAgICAgIGFwaS5ldmVudEJ1cy5lbWl0KCdhcHBDcmVhdGVkJywgYXBwKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuICBzZXQgYXBwKGV4cHJlc3NBcHA6IGV4cHJlc3MuRXhwcmVzcykge1xuICAgIGFwcCA9IGV4cHJlc3NBcHA7XG4gIH0sXG4gIGdldCBhcHAoKSB7XG4gICAgcmV0dXJuIGFwcDtcbiAgfVxufTtcblxuZnVuY3Rpb24gY3JlYXRlKGFwcDogZXhwcmVzcy5FeHByZXNzLCBzZXR0aW5nOiBhbnkpIHtcbiAgLy8gdmlldyBlbmdpbmUgc2V0dXBcbiAgc3dpZy5zZXREZWZhdWx0cyh7XG4gICAgdmFyQ29udHJvbHM6IFsnez0nLCAnPX0nXSxcbiAgICBjYWNoZTogc2V0dGluZy5kZXZNb2RlID8gZmFsc2UgOiAnbWVtb3J5J1xuICB9KTtcbiAgLy8gdmFyIGluamVjdG9yID0gcmVxdWlyZSgnX19pbmplY3RvcicpO1xuICAvLyB2YXIgdHJhbnNsYXRlSHRtbCA9IHJlcXVpcmUoJ0Bkci90cmFuc2xhdGUtZ2VuZXJhdG9yJykuaHRtbFJlcGxhY2VyKCk7XG4gIC8vIHN3aWdJbmplY3RMb2FkZXIuc3dpZ1NldHVwKHN3aWcsIHtcbiAgLy8gXHRpbmplY3RvcjogaW5qZWN0b3JcbiAgLy8gXHQvLyBmaWxlQ29udGVudEhhbmRsZXI6IGZ1bmN0aW9uKGZpbGUsIHNvdXJjZSkge1xuICAvLyBcdC8vIFx0cmV0dXJuIHRyYW5zbGF0ZUh0bWwoc291cmNlLCBmaWxlLCBhcGkuY29uZmlnLmdldCgnbG9jYWxlc1swXScpKTtcbiAgLy8gXHQvLyB9XG4gIC8vIH0pO1xuXG4gIGVuZ2luZXMucmVxdWlyZXMuc3dpZyA9IHN3aWc7XG4gIGFwcC5lbmdpbmUoJ2h0bWwnLCBlbmdpbmVzLnN3aWcpO1xuICBhcHAuc2V0KCd2aWV3IGNhY2hlJywgZmFsc2UpO1xuICAvLyBhcHAuZW5naW5lKCdqYWRlJywgZW5naW5lcy5qYWRlKTtcbiAgYXBwLnNldCgndHJ1c3QgcHJveHknLCB0cnVlKTtcbiAgYXBwLnNldCgndmlld3MnLCBbc2V0dGluZy5yb290UGF0aF0pO1xuICBhcHAuc2V0KCd2aWV3IGVuZ2luZScsICdodG1sJyk7XG4gIGFwcC5zZXQoJ3gtcG93ZXJlZC1ieScsIGZhbHNlKTtcbiAgYXBwLnNldCgnZW52JywgYXBpLmNvbmZpZygpLmRldk1vZGUgPyAnZGV2ZWxvcG1lbnQnIDogJ3Byb2R1Y3Rpb24nKTtcbiAgc2V0dXBBcGkuYXBwbHlQYWNrYWdlRGVmaW5lZEFwcFNldHRpbmcoYXBwKTtcbiAgLy8gdW5jb21tZW50IGFmdGVyIHBsYWNpbmcgeW91ciBmYXZpY29uIGluIC9wdWJsaWNcbiAgLy8gYXBwLnVzZShmYXZpY29uKHBhdGguam9pbihfX2Rpcm5hbWUsICdwdWJsaWMnLCAnZmF2aWNvbi5pY28nKSkpO1xuICAvLyBhcHAudXNlKGxvZ2dlcignZGV2JykpO1xuICBhcHAudXNlKGxvZzRqcy5jb25uZWN0TG9nZ2VyKGxvZywge1xuICAgIGxldmVsOiAnSU5GTydcbiAgfSkpO1xuICBhcHAudXNlKGJvZHlQYXJzZXIuanNvbih7XG4gICAgbGltaXQ6ICc1MG1iJ1xuICB9KSk7XG4gIGFwcC51c2UoYm9keVBhcnNlci51cmxlbmNvZGVkKHtcbiAgICBleHRlbmRlZDogZmFsc2UsXG4gICAgbGltaXQ6ICc1MG1iJ1xuICB9KSk7XG4gIGFwcC51c2UoYm9keVBhcnNlci5yYXcoe1xuICAgIGxpbWl0OiAnNTBtYidcbiAgfSkpO1xuICBhcHAudXNlKGJvZHlQYXJzZXIudGV4dCh7XG4gICAgbGltaXQ6ICc1MG1iJ1xuICB9KSk7XG4gIGFwcC51c2UoY29va2llUGFyc2VyKCkpO1xuICBhcHAudXNlKGNvbXByZXNzaW9uKCkpO1xuICAvLyBzZXR1cEFwaS5jcmVhdGVQYWNrYWdlRGVmaW5lZE1pZGRsZXdhcmUoYXBwKTtcbiAgc2V0dXBBcGkuY3JlYXRlUGFja2FnZURlZmluZWRSb3V0ZXJzKGFwcCk7XG5cbiAgY29uc3QgaGFzaEZpbGUgPSBQYXRoLmpvaW4oYXBpLmNvbmZpZygpLnJvb3RQYXRoLCAnZ2l0aGFzaC1zZXJ2ZXIudHh0Jyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGhhc2hGaWxlKSkge1xuICAgIGNvbnN0IGdpdGhhc2ggPSBmcy5yZWFkRmlsZVN5bmMoaGFzaEZpbGUsICd1dGY4Jyk7XG4gICAgYXBwLmdldCgnL2dpdGhhc2gtc2VydmVyJywgKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSkgPT4ge1xuICAgICAgcmVzLnNldCgnQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKTtcbiAgICAgIHJlcy5zZW5kKGdpdGhhc2gpO1xuICAgIH0pO1xuICAgIGFwcC5nZXQoJy9naXRoYXNoLXNlcnZlci50eHQnLCAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlKSA9PiB7XG4gICAgICByZXMuc2V0KCdDb250ZW50LVR5cGUnLCAndGV4dC9wbGFpbicpO1xuICAgICAgcmVzLnNlbmQoZ2l0aGFzaCk7XG4gICAgfSk7XG4gIH1cbiAgLy8gZXJyb3IgaGFuZGxlcnNcbiAgLy8gY2F0Y2ggNDA0IGFuZCBmb3J3YXJkIHRvIGVycm9yIGhhbmRsZXJcbiAgYXBwLnVzZShmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuICAgIGxvZy5pbmZvKCdOb3QgRm91bmQ6ICcgKyByZXEub3JpZ2luYWxVcmwpO1xuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ05vdCBGb3VuZCcpO1xuICAgIChlcnIgYXMgYW55KS5zdGF0dXMgPSA0MDQ7XG4gICAgbmV4dChlcnIpO1xuICB9KTtcblxuICAvLyBkZXZlbG9wbWVudCBlcnJvciBoYW5kbGVyXG4gIC8vIHdpbGwgcHJpbnQgc3RhY2t0cmFjZVxuICBpZiAoc2V0dGluZy5kZXZNb2RlIHx8IGFwcC5nZXQoJ2VudicpID09PSAnZGV2ZWxvcG1lbnQnKSB7XG4gICAgYXBwLnVzZShmdW5jdGlvbihlcnI6IEVycm9yLCByZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICAgICAgcmVzLnN0YXR1cygoZXJyIGFzIGFueSkuc3RhdHVzIHx8IDUwMCk7XG4gICAgICBsb2cuZXJyb3IocmVxLm9yaWdpbmFsVXJsLCBlcnIpO1xuICAgICAgcmVzLnJlbmRlcihQYXRoLmpvaW4oVklFV19QQVRILCAnX2RyY3AtZXhwcmVzcy1lcnJvci5odG1sJyksIHtcbiAgICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXG4gICAgICAgIGVycm9yOiBlcnJcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gcHJvZHVjdGlvbiBlcnJvciBoYW5kbGVyXG4gIC8vIG5vIHN0YWNrdHJhY2VzIGxlYWtlZCB0byB1c2VyXG4gIGFwcC51c2UoZnVuY3Rpb24oZXJyOiBFcnJvciwgcmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgICByZXMuc3RhdHVzKChlcnIgYXMgYW55KS5zdGF0dXMgfHwgNTAwKTtcbiAgICBsb2cuZXJyb3IocmVxLm9yaWdpbmFsVXJsLCBlcnIpO1xuICAgIHJlcy5yZW5kZXIoUGF0aC5qb2luKFZJRVdfUEFUSCwgJ19kcmNwLWV4cHJlc3MtZXJyb3IuaHRtbCcpLCB7XG4gICAgICBtZXNzYWdlOiBlcnIubWVzc2FnZSxcbiAgICAgIGVycm9yOiB7fVxuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIGFwcDtcbn1cbiJdfQ==
