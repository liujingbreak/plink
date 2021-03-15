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
const plink_1 = require("@wfh/plink");
const cookieParser = require('cookie-parser');
const body_parser_1 = __importDefault(require("body-parser"));
const engines = require('consolidate');
const routes_1 = require("./routes");
const __api_1 = __importDefault(require("__api"));
const log = plink_1.logger.getLogger('@wfh/express-app');
const compression = require('compression');
// var swigInjectLoader = require('swig-package-tmpl-loader');
const VIEW_PATH = Path.relative(__api_1.default.config().rootPath, Path.resolve(__dirname, '..', 'views'));
var app;
const expressAppReady$ = new rx.ReplaySubject(1);
function create(app, setting) {
    // view engine setup
    // swig.setDefaults({
    //   varControls: ['{=', '=}'],
    //   cache: setting.devMode ? false : 'memory'
    // });
    // var injector = require('__injector');
    // var translateHtml = require('@dr/translate-generator').htmlReplacer();
    // swigInjectLoader.swigSetup(swig, {
    // 	injector: injector
    // 	// fileContentHandler: function(file, source) {
    // 	// 	return translateHtml(source, file, api.config.get('locales[0]'));
    // 	// }
    // });
    // engines.requires.swig = swig;
    app.engine('html', engines.lodash);
    // app.set('view cache', false);
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
    activate(api) {
        app = express();
        routes_1.setupApi(api, app);
        api.eventBus.on('packagesActivated', function () {
            log.info('packagesActivated');
            process.nextTick(() => {
                create(app, api.config());
                expressAppReady$.next(app);
                expressAppReady$.complete();
                api.eventBus.emit('appCreated', app);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQW9DO0FBQ3BDLHlDQUEyQjtBQUUzQiwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDBDQUEwQztBQUMxQywrQ0FBaUM7QUFDakMsc0NBQW9EO0FBQ3BELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5Qyw4REFBcUM7QUFDckMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3ZDLHFDQUE4RjtBQUM5RixrREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ2pELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMzQyw4REFBOEQ7QUFFOUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUNuRCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUMxQyxJQUFJLEdBQW9CLENBQUM7QUFFekIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQWMsQ0FBQyxDQUFDLENBQUM7QUEyQjlELFNBQVMsTUFBTSxDQUFDLEdBQW9CLEVBQUUsT0FBWTtJQUNoRCxvQkFBb0I7SUFDcEIscUJBQXFCO0lBQ3JCLCtCQUErQjtJQUMvQiw4Q0FBOEM7SUFDOUMsTUFBTTtJQUNOLHdDQUF3QztJQUN4Qyx5RUFBeUU7SUFDekUscUNBQXFDO0lBQ3JDLHNCQUFzQjtJQUN0QixtREFBbUQ7SUFDbkQseUVBQXlFO0lBQ3pFLFFBQVE7SUFDUixNQUFNO0lBRU4sZ0NBQWdDO0lBQ2hDLEdBQUcsQ0FBQyxN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LGdCQUFnQjtJQUVoQixJQUFJLEdBQUcsQ0FBQyxVQUEyQjtRQUNqQyxHQUFHLEdBQUcsVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFDRCxJQUFJLEdBQUc7UUFDTCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGV4cHJlc3MgPSByZXF1aXJlKCdleHByZXNzJyk7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbiwgQXBwbGljYXRpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vIHZhciBmYXZpY29uID0gcmVxdWlyZSgnc2VydmUtZmF2aWNvbicpO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2xvZ2dlciwgRXh0ZW5zaW9uQ29udGV4dH0gZnJvbSAnQHdmaC9wbGluayc7XG5jb25zdCBjb29raWVQYXJzZXIgPSByZXF1aXJlKCdjb29raWUtcGFyc2VyJyk7XG5pbXBvcnQgYm9keVBhcnNlciBmcm9tICdib2R5LXBhcnNlcic7XG5jb25zdCBlbmdpbmVzID0gcmVxdWlyZSgnY29uc29saWRhdGUnKTtcbmltcG9ydCB7c2V0dXBBcGksIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nLCBjcmVhdGVQYWNrYWdlRGVmaW5lZFJvdXRlcnN9IGZyb20gJy4vcm91dGVzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gbG9nZ2VyLmdldExvZ2dlcignQHdmaC9leHByZXNzLWFwcCcpO1xuY29uc3QgY29tcHJlc3Npb24gPSByZXF1aXJlKCdjb21wcmVzc2lvbicpO1xuLy8gdmFyIHN3aWdJbmplY3RMb2FkZXIgPSByZXF1aXJlKCdzd2lnLXBhY2thZ2UtdG1wbC1sb2FkZXInKTtcblxuY29uc3QgVklFV19QQVRIID0gUGF0aC5yZWxhdGl2ZShhcGkuY29uZmlnKCkucm9vdFBhdGgsXG4gIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICd2aWV3cycpKTtcbnZhciBhcHA6IGV4cHJlc3MuRXhwcmVzcztcblxuY29uc3QgZXhwcmVzc0FwcFJlYWR5JCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PEFwcGxpY2F0aW9uPigxKTtcblxuZXhwb3J0ID0ge1xuXG4gIGFjdGl2YXRlKGFwaTogRXh0ZW5zaW9uQ29udGV4dCkge1xuICAgIGFwcCA9IGV4cHJlc3MoKTtcbiAgICBzZXR1cEFwaShhcGksIGFwcCk7XG4gICAgYXBpLmV2ZW50QnVzLm9uKCdwYWNrYWdlc0FjdGl2YXRlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgbG9nLmluZm8oJ3BhY2thZ2VzQWN0aXZhdGVkJyk7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgY3JlYXRlKGFwcCwgYXBpLmNvbmZpZygpKTtcbiAgICAgICAgZXhwcmVzc0FwcFJlYWR5JC5uZXh0KGFwcCk7XG4gICAgICAgIGV4cHJlc3NBcHBSZWFkeSQuY29tcGxldGUoKTtcbiAgICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ2FwcENyZWF0ZWQnLCBhcHApO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIGV4cHJlc3NBcHBSZWFkeSQsXG5cbiAgc2V0IGFwcChleHByZXNzQXBwOiBleHByZXNzLkV4cHJlc3MpIHtcbiAgICBhcHAgPSBleHByZXNzQXBwO1xuICB9LFxuICBnZXQgYXBwKCkge1xuICAgIHJldHVybiBhcHA7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZShhcHA6IGV4cHJlc3MuRXhwcmVzcywgc2V0dGluZzogYW55KSB7XG4gIC8vIHZpZXcgZW5naW5lIHNldHVwXG4gIC8vIHN3aWcuc2V0RGVmYXVsdHMoe1xuICAvLyAgIHZhckNvbnRyb2xzOiBbJ3s9JywgJz19J10sXG4gIC8vICAgY2FjaGU6IHNldHRpbmcuZGV2TW9kZSA/IGZhbHNlIDogJ21lbW9yeSdcbiAgLy8gfSk7XG4gIC8vIHZhciBpbmplY3RvciA9IHJlcXVpcmUoJ19faW5qZWN0b3InKTtcbiAgLy8gdmFyIHRyYW5zbGF0ZUh0bWwgPSByZXF1aXJlKCdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcicpLmh0bWxSZXBsYWNlcigpO1xuICAvLyBzd2lnSW5qZWN0TG9hZGVyLnN3aWdTZXR1cChzd2lnLCB7XG4gIC8vIFx0aW5qZWN0b3I6IGluamVjdG9yXG4gIC8vIFx0Ly8gZmlsZUNvbnRlbnRIYW5kbGVyOiBmdW5jdGlvbihmaWxlLCBzb3VyY2UpIHtcbiAgLy8gXHQvLyBcdHJldHVybiB0cmFuc2xhdGVIdG1sKHNvdXJjZSwgZmlsZSwgYXBpLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSk7XG4gIC8vIFx0Ly8gfVxuICAvLyB9KTtcblxuICAvLyBlbmdpbmVzLnJlcXVpcmVzLnN3aWcgPSBzd2lnO1xuICBhcHAuZW5naW5lKCdodG1sJywgZW5naW5lcy5sb2Rhc2gpO1xuICAvLyBhcHAuc2V0KCd2aWV3IGNhY2hlJywgZmFsc2UpO1xuICAvLyBhcHAuZW5naW5lKCdqYWRlJywgZW5naW5lcy5qYWRlKTtcbiAgYXBwLnNldCgndHJ1c3QgcHJveHknLCB0cnVlKTtcbiAgYXBwLnNldCgndmlld3MnLCBbc2V0dGluZy5yb290UGF0aF0pO1xuICBhcHAuc2V0KCd2aWV3IGVuZ2luZScsICdodG1sJyk7XG4gIGFwcC5zZXQoJ3gtcG93ZXJlZC1ieScsIGZhbHNlKTtcbiAgYXBwLnNldCgnZW52JywgYXBpLmNvbmZpZygpLmRldk1vZGUgPyAnZGV2ZWxvcG1lbnQnIDogJ3Byb2R1Y3Rpb24nKTtcbiAgYXBwbHlQYWNrYWdlRGVmaW5lZEFwcFNldHRpbmcoYXBwKTtcbiAgLy8gdW5jb21tZW50IGFmdGVyIHBsYWNpbmcgeW91ciBmYXZpY29uIGluIC9wdWJsaWNcbiAgLy8gYXBwLnVzZShmYXZpY29uKHBhdGguam9pbihfX2Rpcm5hbWUsICdwdWJsaWMnLCAnZmF2aWNvbi5pY28nKSkpO1xuICAvLyBhcHAudXNlKGxvZ2dlcignZGV2JykpO1xuICBhcHAudXNlKGxvZzRqcy5jb25uZWN0TG9nZ2VyKGxvZywge1xuICAgIGxldmVsOiAnREVCVUcnXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLmpzb24oe1xuICAgIGxpbWl0OiAnNTBtYidcbiAgfSkpO1xuICBhcHAudXNlKGJvZHlQYXJzZXIudXJsZW5jb2RlZCh7XG4gICAgZXh0ZW5kZWQ6IGZhbHNlLFxuICAgIGxpbWl0OiAnNTBtYidcbiAgfSkpO1xuICBhcHAudXNlKGJvZHlQYXJzZXIucmF3KHtcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLnRleHQoe1xuICAgIGxpbWl0OiAnNTBtYidcbiAgfSkpO1xuICBhcHAudXNlKGNvb2tpZVBhcnNlcigpKTtcbiAgYXBwLnVzZShjb21wcmVzc2lvbigpKTtcblxuICBjb25zdCBub2RlVmVyID0gcHJvY2Vzcy52ZXJzaW9uO1xuICBhcHAudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIHJlcy5zZXRIZWFkZXIoJ1gtTm9kZWpzJywgbm9kZVZlcik7XG4gICAgbmV4dCgpO1xuICB9KTtcbiAgY29uc3QgaGFzaEZpbGUgPSBQYXRoLmpvaW4oYXBpLmNvbmZpZygpLnJvb3RQYXRoLCAnZ2l0aGFzaC1zZXJ2ZXIudHh0Jyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGhhc2hGaWxlKSkge1xuICAgIGNvbnN0IGdpdGhhc2ggPSBmcy5yZWFkRmlsZVN5bmMoaGFzaEZpbGUsICd1dGY4Jyk7XG4gICAgYXBwLmdldCgnL2dpdGhhc2gtc2VydmVyJywgKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSkgPT4ge1xuICAgICAgcmVzLnNldCgnQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKTtcbiAgICAgIHJlcy5zZW5kKGdpdGhhc2gpO1xuICAgIH0pO1xuICAgIGFwcC5nZXQoJy9naXRoYXNoLXNlcnZlci50eHQnLCAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlKSA9PiB7XG4gICAgICByZXMuc2V0KCdDb250ZW50LVR5cGUnLCAndGV4dC9wbGFpbicpO1xuICAgICAgcmVzLnNlbmQoZ2l0aGFzaCk7XG4gICAgfSk7XG4gIH1cbiAgY3JlYXRlUGFja2FnZURlZmluZWRSb3V0ZXJzKGFwcCk7XG4gIC8vIGVycm9yIGhhbmRsZXJzXG4gIC8vIGNhdGNoIDQwNCBhbmQgZm9yd2FyZCB0byBlcnJvciBoYW5kbGVyXG4gIGFwcC51c2UoZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgICAvLyBsb2cuaW5mbygnTm90IEZvdW5kOiAnICsgcmVxLm9yaWdpbmFsVXJsKTtcbiAgICBpZiAocmVxLnVybC5pbmRleE9mKCcvZmF2aWNvbi5pY28vJykgPj0gMCkge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KTtcbiAgICB9XG4gICAgY29uc3QgZXJyID0gbmV3IEVycm9yKCdOb3QgRm91bmQnKTtcbiAgICAoZXJyIGFzIGFueSkuc3RhdHVzID0gNDA0O1xuICAgIG5leHQoZXJyKTtcbiAgfSk7XG5cbiAgLy8gZGV2ZWxvcG1lbnQgZXJyb3IgaGFuZGxlclxuICAvLyB3aWxsIHByaW50IHN0YWNrdHJhY2VcbiAgaWYgKHNldHRpbmcuZGV2TW9kZSB8fCBhcHAuZ2V0KCdlbnYnKSA9PT0gJ2RldmVsb3BtZW50Jykge1xuICAgIGFwcC51c2UoZnVuY3Rpb24oZXJyOiBhbnksIHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSB7XG4gICAgICByZXMuc3RhdHVzKChlcnIgYXMgYW55KS5zdGF0dXMgfHwgNTAwKTtcbiAgICAgIGxvZy5lcnJvcihyZXEub3JpZ2luYWxVcmwsIGVyci5pbnNwZWN0ID8gZXJyLmluc3BlY3QoKSA6IGVycik7XG4gICAgICByZXMucmVuZGVyKFBhdGguam9pbihWSUVXX1BBVEgsICdfZHJjcC1leHByZXNzLWVycm9yLmh0bWwnKSwge1xuICAgICAgICBtZXNzYWdlOiBlcnIubWVzc2FnZSxcbiAgICAgICAgZXJyb3I6IGVyclxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBwcm9kdWN0aW9uIGVycm9yIGhhbmRsZXJcbiAgLy8gbm8gc3RhY2t0cmFjZXMgbGVha2VkIHRvIHVzZXJcbiAgYXBwLnVzZShmdW5jdGlvbihlcnI6IEVycm9yLCByZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICAgIHJlcy5zdGF0dXMoKGVyciBhcyBhbnkpLnN0YXR1cyB8fCA1MDApO1xuICAgIGxvZy5lcnJvcihyZXEub3JpZ2luYWxVcmwsIGVycik7XG4gICAgcmVzLnJlbmRlcihQYXRoLmpvaW4oVklFV19QQVRILCAnX2RyY3AtZXhwcmVzcy1lcnJvci5odG1sJyksIHtcbiAgICAgIG1lc3NhZ2U6IGVyci5tZXNzYWdlLFxuICAgICAgZXJyb3I6IHt9XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gYXBwO1xufVxuIl19