"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const express = require("express");
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// var favicon = require('serve-favicon');
const log4js = __importStar(require("log4js"));
var cookieParser = require('cookie-parser');
// var bodyParser = require('body-parser');
const body_parser_1 = __importDefault(require("body-parser"));
var engines = require('consolidate');
var swig = require('swig-templates');
const routes_1 = require("./routes");
const __api_1 = __importDefault(require("__api"));
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
    routes_1.applyPackageDefinedAppSetting(app);
    // uncomment after placing your favicon in /public
    // app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
    // app.use(logger('dev'));
    app.use(log4js.connectLogger(log, {
        level: 'DEBUG'
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
    const nodeVer = process.version;
    app.use((req, res, next) => {
        res.setHeader('X-Nodejs', nodeVer);
        next();
    });
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
    routes_1.createPackageDefinedRouters(app);
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
            log.error(req.originalUrl, err.inspect ? err.inspect() : err);
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
        routes_1.setupApi(__api_1.default, app);
        __api_1.default.eventBus.on('packagesActivated', function () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQW9DO0FBRXBDLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsMENBQTBDO0FBQzFDLCtDQUFpQztBQUNqQyxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDNUMsMkNBQTJDO0FBQzNDLDhEQUFxQztBQUNyQyxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDckMsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDckMscUNBQThGO0FBQzlGLGtEQUF3QjtBQUN4QixJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM1QyxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDekMsOERBQThEO0FBRTlELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFDbkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDMUMsSUFBSSxHQUFvQixDQUFDO0FBc0J6QixTQUFTLE1BQU0sQ0FBQyxHQUFvQixFQUFFLE9BQVk7SUFDaEQsb0JBQW9CO0lBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDZixXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQ3pCLEtBQUssRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVE7S0FDMUMsQ0FBQyxDQUFDO0lBQ0gsd0NBQXdDO0lBQ3hDLHlFQUF5RTtJQUN6RSxxQ0FBcUM7SUFDckMs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LEdBQUcsQ0FBQyxVQUEyQjtRQUNqQyxHQUFHLEdBQUcsVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFDRCxJQUFJLEdBQUc7UUFDTCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGV4cHJlc3MgPSByZXF1aXJlKCdleHByZXNzJyk7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vIHZhciBmYXZpY29uID0gcmVxdWlyZSgnc2VydmUtZmF2aWNvbicpO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG52YXIgY29va2llUGFyc2VyID0gcmVxdWlyZSgnY29va2llLXBhcnNlcicpO1xuLy8gdmFyIGJvZHlQYXJzZXIgPSByZXF1aXJlKCdib2R5LXBhcnNlcicpO1xuaW1wb3J0IGJvZHlQYXJzZXIgZnJvbSAnYm9keS1wYXJzZXInO1xudmFyIGVuZ2luZXMgPSByZXF1aXJlKCdjb25zb2xpZGF0ZScpO1xudmFyIHN3aWcgPSByZXF1aXJlKCdzd2lnLXRlbXBsYXRlcycpO1xuaW1wb3J0IHtzZXR1cEFwaSwgYXBwbHlQYWNrYWdlRGVmaW5lZEFwcFNldHRpbmcsIGNyZWF0ZVBhY2thZ2VEZWZpbmVkUm91dGVyc30gZnJvbSAnLi9yb3V0ZXMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG52YXIgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xudmFyIGNvbXByZXNzaW9uID0gcmVxdWlyZSgnY29tcHJlc3Npb24nKTtcbi8vIHZhciBzd2lnSW5qZWN0TG9hZGVyID0gcmVxdWlyZSgnc3dpZy1wYWNrYWdlLXRtcGwtbG9hZGVyJyk7XG5cbmNvbnN0IFZJRVdfUEFUSCA9IFBhdGgucmVsYXRpdmUoYXBpLmNvbmZpZygpLnJvb3RQYXRoLFxuICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAndmlld3MnKSk7XG52YXIgYXBwOiBleHByZXNzLkV4cHJlc3M7XG5cbmV4cG9ydCA9IHtcbiAgYWN0aXZhdGUoKSB7XG4gICAgYXBwID0gZXhwcmVzcygpO1xuICAgIHNldHVwQXBpKGFwaSwgYXBwKTtcbiAgICBhcGkuZXZlbnRCdXMub24oJ3BhY2thZ2VzQWN0aXZhdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICBsb2cuaW5mbygncGFja2FnZXNBY3RpdmF0ZWQnKTtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICBjcmVhdGUoYXBwLCBhcGkuY29uZmlnKCkpO1xuICAgICAgICBhcGkuZXZlbnRCdXMuZW1pdCgnYXBwQ3JlYXRlZCcsIGFwcCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcbiAgc2V0IGFwcChleHByZXNzQXBwOiBleHByZXNzLkV4cHJlc3MpIHtcbiAgICBhcHAgPSBleHByZXNzQXBwO1xuICB9LFxuICBnZXQgYXBwKCkge1xuICAgIHJldHVybiBhcHA7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZShhcHA6IGV4cHJlc3MuRXhwcmVzcywgc2V0dGluZzogYW55KSB7XG4gIC8vIHZpZXcgZW5naW5lIHNldHVwXG4gIHN3aWcuc2V0RGVmYXVsdHMoe1xuICAgIHZhckNvbnRyb2xzOiBbJ3s9JywgJz19J10sXG4gICAgY2FjaGU6IHNldHRpbmcuZGV2TW9kZSA/IGZhbHNlIDogJ21lbW9yeSdcbiAgfSk7XG4gIC8vIHZhciBpbmplY3RvciA9IHJlcXVpcmUoJ19faW5qZWN0b3InKTtcbiAgLy8gdmFyIHRyYW5zbGF0ZUh0bWwgPSByZXF1aXJlKCdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcicpLmh0bWxSZXBsYWNlcigpO1xuICAvLyBzd2lnSW5qZWN0TG9hZGVyLnN3aWdTZXR1cChzd2lnLCB7XG4gIC8vIFx0aW5qZWN0b3I6IGluamVjdG9yXG4gIC8vIFx0Ly8gZmlsZUNvbnRlbnRIYW5kbGVyOiBmdW5jdGlvbihmaWxlLCBzb3VyY2UpIHtcbiAgLy8gXHQvLyBcdHJldHVybiB0cmFuc2xhdGVIdG1sKHNvdXJjZSwgZmlsZSwgYXBpLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSk7XG4gIC8vIFx0Ly8gfVxuICAvLyB9KTtcblxuICBlbmdpbmVzLnJlcXVpcmVzLnN3aWcgPSBzd2lnO1xuICBhcHAuZW5naW5lKCdodG1sJywgZW5naW5lcy5zd2lnKTtcbiAgYXBwLnNldCgndmlldyBjYWNoZScsIGZhbHNlKTtcbiAgLy8gYXBwLmVuZ2luZSgnamFkZScsIGVuZ2luZXMuamFkZSk7XG4gIGFwcC5zZXQoJ3RydXN0IHByb3h5JywgdHJ1ZSk7XG4gIGFwcC5zZXQoJ3ZpZXdzJywgW3NldHRpbmcucm9vdFBhdGhdKTtcbiAgYXBwLnNldCgndmlldyBlbmdpbmUnLCAnaHRtbCcpO1xuICBhcHAuc2V0KCd4LXBvd2VyZWQtYnknLCBmYWxzZSk7XG4gIGFwcC5zZXQoJ2VudicsIGFwaS5jb25maWcoKS5kZXZNb2RlID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJyk7XG4gIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nKGFwcCk7XG4gIC8vIHVuY29tbWVudCBhZnRlciBwbGFjaW5nIHlvdXIgZmF2aWNvbiBpbiAvcHVibGljXG4gIC8vIGFwcC51c2UoZmF2aWNvbihwYXRoLmpvaW4oX19kaXJuYW1lLCAncHVibGljJywgJ2Zhdmljb24uaWNvJykpKTtcbiAgLy8gYXBwLnVzZShsb2dnZXIoJ2RldicpKTtcbiAgYXBwLnVzZShsb2c0anMuY29ubmVjdExvZ2dlcihsb2csIHtcbiAgICBsZXZlbDogJ0RFQlVHJ1xuICB9KSk7XG4gIGFwcC51c2UoYm9keVBhcnNlci5qc29uKHtcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLnVybGVuY29kZWQoe1xuICAgIGV4dGVuZGVkOiBmYWxzZSxcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLnJhdyh7XG4gICAgbGltaXQ6ICc1MG1iJ1xuICB9KSk7XG4gIGFwcC51c2UoYm9keVBhcnNlci50ZXh0KHtcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShjb29raWVQYXJzZXIoKSk7XG4gIGFwcC51c2UoY29tcHJlc3Npb24oKSk7XG5cbiAgY29uc3Qgbm9kZVZlciA9IHByb2Nlc3MudmVyc2lvbjtcbiAgYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICByZXMuc2V0SGVhZGVyKCdYLU5vZGVqcycsIG5vZGVWZXIpO1xuICAgIG5leHQoKTtcbiAgfSk7XG4gIGNvbnN0IGhhc2hGaWxlID0gUGF0aC5qb2luKGFwaS5jb25maWcoKS5yb290UGF0aCwgJ2dpdGhhc2gtc2VydmVyLnR4dCcpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhoYXNoRmlsZSkpIHtcbiAgICBjb25zdCBnaXRoYXNoID0gZnMucmVhZEZpbGVTeW5jKGhhc2hGaWxlLCAndXRmOCcpO1xuICAgIGFwcC5nZXQoJy9naXRoYXNoLXNlcnZlcicsIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UpID0+IHtcbiAgICAgIHJlcy5zZXQoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L3BsYWluJyk7XG4gICAgICByZXMuc2VuZChnaXRoYXNoKTtcbiAgICB9KTtcbiAgICBhcHAuZ2V0KCcvZ2l0aGFzaC1zZXJ2ZXIudHh0JywgKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSkgPT4ge1xuICAgICAgcmVzLnNldCgnQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKTtcbiAgICAgIHJlcy5zZW5kKGdpdGhhc2gpO1xuICAgIH0pO1xuICB9XG4gIGNyZWF0ZVBhY2thZ2VEZWZpbmVkUm91dGVycyhhcHApO1xuICAvLyBlcnJvciBoYW5kbGVyc1xuICAvLyBjYXRjaCA0MDQgYW5kIGZvcndhcmQgdG8gZXJyb3IgaGFuZGxlclxuICBhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgbG9nLmluZm8oJ05vdCBGb3VuZDogJyArIHJlcS5vcmlnaW5hbFVybCk7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcignTm90IEZvdW5kJyk7XG4gICAgKGVyciBhcyBhbnkpLnN0YXR1cyA9IDQwNDtcbiAgICBuZXh0KGVycik7XG4gIH0pO1xuXG4gIC8vIGRldmVsb3BtZW50IGVycm9yIGhhbmRsZXJcbiAgLy8gd2lsbCBwcmludCBzdGFja3RyYWNlXG4gIGlmIChzZXR0aW5nLmRldk1vZGUgfHwgYXBwLmdldCgnZW52JykgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICBhcHAudXNlKGZ1bmN0aW9uKGVycjogYW55LCByZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICAgICAgcmVzLnN0YXR1cygoZXJyIGFzIGFueSkuc3RhdHVzIHx8IDUwMCk7XG4gICAgICBsb2cuZXJyb3IocmVxLm9yaWdpbmFsVXJsLCBlcnIuaW5zcGVjdCA/IGVyci5pbnNwZWN0KCkgOiBlcnIpO1xuICAgICAgcmVzLnJlbmRlcihQYXRoLmpvaW4oVklFV19QQVRILCAnX2RyY3AtZXhwcmVzcy1lcnJvci5odG1sJyksIHtcbiAgICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXG4gICAgICAgIGVycm9yOiBlcnJcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gcHJvZHVjdGlvbiBlcnJvciBoYW5kbGVyXG4gIC8vIG5vIHN0YWNrdHJhY2VzIGxlYWtlZCB0byB1c2VyXG4gIGFwcC51c2UoZnVuY3Rpb24oZXJyOiBFcnJvciwgcmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgICByZXMuc3RhdHVzKChlcnIgYXMgYW55KS5zdGF0dXMgfHwgNTAwKTtcbiAgICBsb2cuZXJyb3IocmVxLm9yaWdpbmFsVXJsLCBlcnIpO1xuICAgIHJlcy5yZW5kZXIoUGF0aC5qb2luKFZJRVdfUEFUSCwgJ19kcmNwLWV4cHJlc3MtZXJyb3IuaHRtbCcpLCB7XG4gICAgICBtZXNzYWdlOiBlcnIubWVzc2FnZSxcbiAgICAgIGVycm9yOiB7fVxuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIGFwcDtcbn1cbiJdfQ==