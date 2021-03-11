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
const rx = __importStar(require("rxjs"));
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
const expressAppReady$ = new rx.ReplaySubject(1);
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
        // log.info('Not Found: ' + req.originalUrl);
        if (req.url.indexOf('/favicon.ico/') >= 0) {
            return res.status(404);
        }
        const err = new Error('Not Found');
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
                expressAppReady$.next(app);
                expressAppReady$.complete();
                __api_1.default.eventBus.emit('appCreated', app);
            });
        });
    },
    expressAppReady$,
    set app(expressApp) {
        app = expressApp;
    },
    get app() {
        return app;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQW9DO0FBQ3BDLHlDQUEyQjtBQUUzQiwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDBDQUEwQztBQUMxQywrQ0FBaUM7QUFDakMsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzVDLDJDQUEyQztBQUMzQyw4REFBcUM7QUFDckMsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3JDLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3JDLHFDQUE4RjtBQUM5RixrREFBd0I7QUFDeEIsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDNUMsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3pDLDhEQUE4RDtBQUU5RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzFDLElBQUksR0FBb0IsQ0FBQztBQUV6QixNQUFNLGdCQUFnQixHQUFHLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBYyxDQUFDLENBQUMsQ0FBQztBQTJCOUQsU0FBUyxNQUFNLENBQUMsR0FBb0IsRUFBRSxPQUFZO0lBQ2hELG9CQUFvQjtJQUNwQixJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ2YsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztRQUN6QixLQUFLLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFD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QUMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDMUIsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMzQixnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDNUIsZUFBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ0QsZ0JBQWdCO0lBRWhCLElBQUksR0FBRyxDQUFDLFVBQTJCO1FBQ2pDLEdBQUcsR0FBRyxVQUFVLENBQUM7SUFDbkIsQ0FBQztJQUNELElBQUksR0FBRztRQUNMLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcyA9IHJlcXVpcmUoJ2V4cHJlc3MnKTtcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9uLCBBcHBsaWNhdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gdmFyIGZhdmljb24gPSByZXF1aXJlKCdzZXJ2ZS1mYXZpY29uJyk7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbnZhciBjb29raWVQYXJzZXIgPSByZXF1aXJlKCdjb29raWUtcGFyc2VyJyk7XG4vLyB2YXIgYm9keVBhcnNlciA9IHJlcXVpcmUoJ2JvZHktcGFyc2VyJyk7XG5pbXBvcnQgYm9keVBhcnNlciBmcm9tICdib2R5LXBhcnNlcic7XG52YXIgZW5naW5lcyA9IHJlcXVpcmUoJ2NvbnNvbGlkYXRlJyk7XG52YXIgc3dpZyA9IHJlcXVpcmUoJ3N3aWctdGVtcGxhdGVzJyk7XG5pbXBvcnQge3NldHVwQXBpLCBhcHBseVBhY2thZ2VEZWZpbmVkQXBwU2V0dGluZywgY3JlYXRlUGFja2FnZURlZmluZWRSb3V0ZXJzfSBmcm9tICcuL3JvdXRlcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbnZhciBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG52YXIgY29tcHJlc3Npb24gPSByZXF1aXJlKCdjb21wcmVzc2lvbicpO1xuLy8gdmFyIHN3aWdJbmplY3RMb2FkZXIgPSByZXF1aXJlKCdzd2lnLXBhY2thZ2UtdG1wbC1sb2FkZXInKTtcblxuY29uc3QgVklFV19QQVRIID0gUGF0aC5yZWxhdGl2ZShhcGkuY29uZmlnKCkucm9vdFBhdGgsXG4gIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICd2aWV3cycpKTtcbnZhciBhcHA6IGV4cHJlc3MuRXhwcmVzcztcblxuY29uc3QgZXhwcmVzc0FwcFJlYWR5JCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PEFwcGxpY2F0aW9uPigxKTtcblxuZXhwb3J0ID0ge1xuXG4gIGFjdGl2YXRlKCkge1xuICAgIGFwcCA9IGV4cHJlc3MoKTtcbiAgICBzZXR1cEFwaShhcGksIGFwcCk7XG4gICAgYXBpLmV2ZW50QnVzLm9uKCdwYWNrYWdlc0FjdGl2YXRlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgbG9nLmluZm8oJ3BhY2thZ2VzQWN0aXZhdGVkJyk7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgY3JlYXRlKGFwcCwgYXBpLmNvbmZpZygpKTtcbiAgICAgICAgZXhwcmVzc0FwcFJlYWR5JC5uZXh0KGFwcCk7XG4gICAgICAgIGV4cHJlc3NBcHBSZWFkeSQuY29tcGxldGUoKTtcbiAgICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ2FwcENyZWF0ZWQnLCBhcHApO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIGV4cHJlc3NBcHBSZWFkeSQsXG5cbiAgc2V0IGFwcChleHByZXNzQXBwOiBleHByZXNzLkV4cHJlc3MpIHtcbiAgICBhcHAgPSBleHByZXNzQXBwO1xuICB9LFxuICBnZXQgYXBwKCkge1xuICAgIHJldHVybiBhcHA7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZShhcHA6IGV4cHJlc3MuRXhwcmVzcywgc2V0dGluZzogYW55KSB7XG4gIC8vIHZpZXcgZW5naW5lIHNldHVwXG4gIHN3aWcuc2V0RGVmYXVsdHMoe1xuICAgIHZhckNvbnRyb2xzOiBbJ3s9JywgJz19J10sXG4gICAgY2FjaGU6IHNldHRpbmcuZGV2TW9kZSA/IGZhbHNlIDogJ21lbW9yeSdcbiAgfSk7XG4gIC8vIHZhciBpbmplY3RvciA9IHJlcXVpcmUoJ19faW5qZWN0b3InKTtcbiAgLy8gdmFyIHRyYW5zbGF0ZUh0bWwgPSByZXF1aXJlKCdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcicpLmh0bWxSZXBsYWNlcigpO1xuICAvLyBzd2lnSW5qZWN0TG9hZGVyLnN3aWdTZXR1cChzd2lnLCB7XG4gIC8vIFx0aW5qZWN0b3I6IGluamVjdG9yXG4gIC8vIFx0Ly8gZmlsZUNvbnRlbnRIYW5kbGVyOiBmdW5jdGlvbihmaWxlLCBzb3VyY2UpIHtcbiAgLy8gXHQvLyBcdHJldHVybiB0cmFuc2xhdGVIdG1sKHNvdXJjZSwgZmlsZSwgYXBpLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSk7XG4gIC8vIFx0Ly8gfVxuICAvLyB9KTtcblxuICBlbmdpbmVzLnJlcXVpcmVzLnN3aWcgPSBzd2lnO1xuICBhcHAuZW5naW5lKCdodG1sJywgZW5naW5lcy5zd2lnKTtcbiAgYXBwLnNldCgndmlldyBjYWNoZScsIGZhbHNlKTtcbiAgLy8gYXBwLmVuZ2luZSgnamFkZScsIGVuZ2luZXMuamFkZSk7XG4gIGFwcC5zZXQoJ3RydXN0IHByb3h5JywgdHJ1ZSk7XG4gIGFwcC5zZXQoJ3ZpZXdzJywgW3NldHRpbmcucm9vdFBhdGhdKTtcbiAgYXBwLnNldCgndmlldyBlbmdpbmUnLCAnaHRtbCcpO1xuICBhcHAuc2V0KCd4LXBvd2VyZWQtYnknLCBmYWxzZSk7XG4gIGFwcC5zZXQoJ2VudicsIGFwaS5jb25maWcoKS5kZXZNb2RlID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJyk7XG4gIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nKGFwcCk7XG4gIC8vIHVuY29tbWVudCBhZnRlciBwbGFjaW5nIHlvdXIgZmF2aWNvbiBpbiAvcHVibGljXG4gIC8vIGFwcC51c2UoZmF2aWNvbihwYXRoLmpvaW4oX19kaXJuYW1lLCAncHVibGljJywgJ2Zhdmljb24uaWNvJykpKTtcbiAgLy8gYXBwLnVzZShsb2dnZXIoJ2RldicpKTtcbiAgYXBwLnVzZShsb2c0anMuY29ubmVjdExvZ2dlcihsb2csIHtcbiAgICBsZXZlbDogJ0RFQlVHJ1xuICB9KSk7XG4gIGFwcC51c2UoYm9keVBhcnNlci5qc29uKHtcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLnVybGVuY29kZWQoe1xuICAgIGV4dGVuZGVkOiBmYWxzZSxcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLnJhdyh7XG4gICAgbGltaXQ6ICc1MG1iJ1xuICB9KSk7XG4gIGFwcC51c2UoYm9keVBhcnNlci50ZXh0KHtcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShjb29raWVQYXJzZXIoKSk7XG4gIGFwcC51c2UoY29tcHJlc3Npb24oKSk7XG5cbiAgY29uc3Qgbm9kZVZlciA9IHByb2Nlc3MudmVyc2lvbjtcbiAgYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICByZXMuc2V0SGVhZGVyKCdYLU5vZGVqcycsIG5vZGVWZXIpO1xuICAgIG5leHQoKTtcbiAgfSk7XG4gIGNvbnN0IGhhc2hGaWxlID0gUGF0aC5qb2luKGFwaS5jb25maWcoKS5yb290UGF0aCwgJ2dpdGhhc2gtc2VydmVyLnR4dCcpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhoYXNoRmlsZSkpIHtcbiAgICBjb25zdCBnaXRoYXNoID0gZnMucmVhZEZpbGVTeW5jKGhhc2hGaWxlLCAndXRmOCcpO1xuICAgIGFwcC5nZXQoJy9naXRoYXNoLXNlcnZlcicsIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UpID0+IHtcbiAgICAgIHJlcy5zZXQoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L3BsYWluJyk7XG4gICAgICByZXMuc2VuZChnaXRoYXNoKTtcbiAgICB9KTtcbiAgICBhcHAuZ2V0KCcvZ2l0aGFzaC1zZXJ2ZXIudHh0JywgKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSkgPT4ge1xuICAgICAgcmVzLnNldCgnQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKTtcbiAgICAgIHJlcy5zZW5kKGdpdGhhc2gpO1xuICAgIH0pO1xuICB9XG4gIGNyZWF0ZVBhY2thZ2VEZWZpbmVkUm91dGVycyhhcHApO1xuICAvLyBlcnJvciBoYW5kbGVyc1xuICAvLyBjYXRjaCA0MDQgYW5kIGZvcndhcmQgdG8gZXJyb3IgaGFuZGxlclxuICBhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgLy8gbG9nLmluZm8oJ05vdCBGb3VuZDogJyArIHJlcS5vcmlnaW5hbFVybCk7XG4gICAgaWYgKHJlcS51cmwuaW5kZXhPZignL2Zhdmljb24uaWNvLycpID49IDApIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwNCk7XG4gICAgfVxuICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcignTm90IEZvdW5kJyk7XG4gICAgKGVyciBhcyBhbnkpLnN0YXR1cyA9IDQwNDtcbiAgICBuZXh0KGVycik7XG4gIH0pO1xuXG4gIC8vIGRldmVsb3BtZW50IGVycm9yIGhhbmRsZXJcbiAgLy8gd2lsbCBwcmludCBzdGFja3RyYWNlXG4gIGlmIChzZXR0aW5nLmRldk1vZGUgfHwgYXBwLmdldCgnZW52JykgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICBhcHAudXNlKGZ1bmN0aW9uKGVycjogYW55LCByZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICAgICAgcmVzLnN0YXR1cygoZXJyIGFzIGFueSkuc3RhdHVzIHx8IDUwMCk7XG4gICAgICBsb2cuZXJyb3IocmVxLm9yaWdpbmFsVXJsLCBlcnIuaW5zcGVjdCA/IGVyci5pbnNwZWN0KCkgOiBlcnIpO1xuICAgICAgcmVzLnJlbmRlcihQYXRoLmpvaW4oVklFV19QQVRILCAnX2RyY3AtZXhwcmVzcy1lcnJvci5odG1sJyksIHtcbiAgICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXG4gICAgICAgIGVycm9yOiBlcnJcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gcHJvZHVjdGlvbiBlcnJvciBoYW5kbGVyXG4gIC8vIG5vIHN0YWNrdHJhY2VzIGxlYWtlZCB0byB1c2VyXG4gIGFwcC51c2UoZnVuY3Rpb24oZXJyOiBFcnJvciwgcmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgICByZXMuc3RhdHVzKChlcnIgYXMgYW55KS5zdGF0dXMgfHwgNTAwKTtcbiAgICBsb2cuZXJyb3IocmVxLm9yaWdpbmFsVXJsLCBlcnIpO1xuICAgIHJlcy5yZW5kZXIoUGF0aC5qb2luKFZJRVdfUEFUSCwgJ19kcmNwLWV4cHJlc3MtZXJyb3IuaHRtbCcpLCB7XG4gICAgICBtZXNzYWdlOiBlcnIubWVzc2FnZSxcbiAgICAgIGVycm9yOiB7fVxuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIGFwcDtcbn1cbiJdfQ==