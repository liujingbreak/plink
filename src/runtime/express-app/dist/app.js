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
const rx = __importStar(require("rxjs"));
const express_1 = __importDefault(require("express"));
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// var favicon = require('serve-favicon');
const plink_1 = require("@wfh/plink");
const body_parser_1 = __importDefault(require("body-parser"));
const routes_1 = require("./routes");
const __api_1 = __importDefault(require("__api"));
const cookieParser = require('cookie-parser');
const engines = require('consolidate');
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
    (0, routes_1.applyPackageDefinedAppSetting)(app);
    // uncomment after placing your favicon in /public
    // app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
    // app.use(logger('dev'));
    app.use(plink_1.logger.connectLogger(log, {
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
    (0, routes_1.createPackageDefinedRouters)(app);
    // error handlers
    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
        // log.info('Not Found: ' + req.originalUrl);
        if (req.url.indexOf('/favicon/') >= 0) {
            return res.status(404);
        }
        // const err = new Error('Not Found');
        res.status(404);
        // next(err);
        log.info(`Not found: ${req.originalUrl}, UA: "${req.header('user-agent')}"`);
        res.render(Path.join(VIEW_PATH, '_drcp-express-error.html'), {
            message: 'Sorry, page is not found',
            error: null
        });
    });
    // development error handler
    // will print stacktrace
    if (setting.devMode || app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status((err).status || 500);
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
        app = (0, express_1.default)();
        (0, routes_1.setupApi)(api, app);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBQzNCLHNEQUE4RTtBQUM5RSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDBDQUEwQztBQUMxQyxzQ0FBb0Q7QUFDcEQsOERBQXFDO0FBQ3JDLHFDQUE4RjtBQUM5RixrREFBd0I7QUFDeEIsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN2QyxNQUFNLEdBQUcsR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDakQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzNDLDhEQUE4RDtBQUU5RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzFDLElBQUksR0FBb0IsQ0FBQztBQUV6QixNQUFNLGdCQUFnQixHQUFHLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBYyxDQUFDLENBQUMsQ0FBQztBQTBCOUQsU0FBUyxNQUFNLENBQUMsR0FBb0IsRUFBRSxPQUFZO0lBQ2hELG9CQUFvQjtJQUNwQixxQkFBcUI7SUFDckIsK0JBQStCO0lBQy9CLDhDQUE4QztJQUM5QyxNQUFNO0lBQ04sd0NBQXdDO0lBQ3hDLHlFQUF5RTtJQUN6RSxxQ0FBcUM7SUFDckMsc0JBQXNCO0lBQ3RCLG1EQUFtRDtJQUNuRCx5RUFBeUU7SUFDekUsUUFBUTtJQUNSLE1BQU07SUFFTixnQ0FBZ0M7SUFDaEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFN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QzFCLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0IsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzVCLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUNELGdCQUFnQjtJQUVoQixJQUFJLEdBQUcsQ0FBQyxVQUEyQjtRQUNqQyxHQUFHLEdBQUcsVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFDRCxJQUFJLEdBQUc7UUFDTCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgZXhwcmVzcywge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb24sIEFwcGxpY2F0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG4vLyB2YXIgZmF2aWNvbiA9IHJlcXVpcmUoJ3NlcnZlLWZhdmljb24nKTtcbmltcG9ydCB7bG9nZ2VyLCBFeHRlbnNpb25Db250ZXh0fSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBib2R5UGFyc2VyIGZyb20gJ2JvZHktcGFyc2VyJztcbmltcG9ydCB7c2V0dXBBcGksIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nLCBjcmVhdGVQYWNrYWdlRGVmaW5lZFJvdXRlcnN9IGZyb20gJy4vcm91dGVzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgY29va2llUGFyc2VyID0gcmVxdWlyZSgnY29va2llLXBhcnNlcicpO1xuY29uc3QgZW5naW5lcyA9IHJlcXVpcmUoJ2NvbnNvbGlkYXRlJyk7XG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdAd2ZoL2V4cHJlc3MtYXBwJyk7XG5jb25zdCBjb21wcmVzc2lvbiA9IHJlcXVpcmUoJ2NvbXByZXNzaW9uJyk7XG4vLyB2YXIgc3dpZ0luamVjdExvYWRlciA9IHJlcXVpcmUoJ3N3aWctcGFja2FnZS10bXBsLWxvYWRlcicpO1xuXG5jb25zdCBWSUVXX1BBVEggPSBQYXRoLnJlbGF0aXZlKGFwaS5jb25maWcoKS5yb290UGF0aCxcbiAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJ3ZpZXdzJykpO1xudmFyIGFwcDogZXhwcmVzcy5FeHByZXNzO1xuXG5jb25zdCBleHByZXNzQXBwUmVhZHkkID0gbmV3IHJ4LlJlcGxheVN1YmplY3Q8QXBwbGljYXRpb24+KDEpO1xuXG5leHBvcnQgPSB7XG4gIGFjdGl2YXRlKGFwaTogRXh0ZW5zaW9uQ29udGV4dCkge1xuICAgIGFwcCA9IGV4cHJlc3MoKTtcbiAgICBzZXR1cEFwaShhcGksIGFwcCk7XG4gICAgYXBpLmV2ZW50QnVzLm9uKCdwYWNrYWdlc0FjdGl2YXRlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgbG9nLmluZm8oJ3BhY2thZ2VzQWN0aXZhdGVkJyk7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgY3JlYXRlKGFwcCwgYXBpLmNvbmZpZygpKTtcbiAgICAgICAgZXhwcmVzc0FwcFJlYWR5JC5uZXh0KGFwcCk7XG4gICAgICAgIGV4cHJlc3NBcHBSZWFkeSQuY29tcGxldGUoKTtcbiAgICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ2FwcENyZWF0ZWQnLCBhcHApO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIGV4cHJlc3NBcHBSZWFkeSQsXG5cbiAgc2V0IGFwcChleHByZXNzQXBwOiBleHByZXNzLkV4cHJlc3MpIHtcbiAgICBhcHAgPSBleHByZXNzQXBwO1xuICB9LFxuICBnZXQgYXBwKCkge1xuICAgIHJldHVybiBhcHA7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZShhcHA6IGV4cHJlc3MuRXhwcmVzcywgc2V0dGluZzogYW55KSB7XG4gIC8vIHZpZXcgZW5naW5lIHNldHVwXG4gIC8vIHN3aWcuc2V0RGVmYXVsdHMoe1xuICAvLyAgIHZhckNvbnRyb2xzOiBbJ3s9JywgJz19J10sXG4gIC8vICAgY2FjaGU6IHNldHRpbmcuZGV2TW9kZSA/IGZhbHNlIDogJ21lbW9yeSdcbiAgLy8gfSk7XG4gIC8vIHZhciBpbmplY3RvciA9IHJlcXVpcmUoJ19faW5qZWN0b3InKTtcbiAgLy8gdmFyIHRyYW5zbGF0ZUh0bWwgPSByZXF1aXJlKCdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcicpLmh0bWxSZXBsYWNlcigpO1xuICAvLyBzd2lnSW5qZWN0TG9hZGVyLnN3aWdTZXR1cChzd2lnLCB7XG4gIC8vIFx0aW5qZWN0b3I6IGluamVjdG9yXG4gIC8vIFx0Ly8gZmlsZUNvbnRlbnRIYW5kbGVyOiBmdW5jdGlvbihmaWxlLCBzb3VyY2UpIHtcbiAgLy8gXHQvLyBcdHJldHVybiB0cmFuc2xhdGVIdG1sKHNvdXJjZSwgZmlsZSwgYXBpLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSk7XG4gIC8vIFx0Ly8gfVxuICAvLyB9KTtcblxuICAvLyBlbmdpbmVzLnJlcXVpcmVzLnN3aWcgPSBzd2lnO1xuICBhcHAuZW5naW5lKCdodG1sJywgZW5naW5lcy5sb2Rhc2gpO1xuICAvLyBhcHAuc2V0KCd2aWV3IGNhY2hlJywgZmFsc2UpO1xuICAvLyBhcHAuZW5naW5lKCdqYWRlJywgZW5naW5lcy5qYWRlKTtcbiAgYXBwLnNldCgndHJ1c3QgcHJveHknLCB0cnVlKTtcbiAgYXBwLnNldCgndmlld3MnLCBbc2V0dGluZy5yb290UGF0aF0pO1xuICBhcHAuc2V0KCd2aWV3IGVuZ2luZScsICdodG1sJyk7XG4gIGFwcC5zZXQoJ3gtcG93ZXJlZC1ieScsIGZhbHNlKTtcbiAgYXBwLnNldCgnZW52JywgYXBpLmNvbmZpZygpLmRldk1vZGUgPyAnZGV2ZWxvcG1lbnQnIDogJ3Byb2R1Y3Rpb24nKTtcbiAgYXBwbHlQYWNrYWdlRGVmaW5lZEFwcFNldHRpbmcoYXBwKTtcbiAgLy8gdW5jb21tZW50IGFmdGVyIHBsYWNpbmcgeW91ciBmYXZpY29uIGluIC9wdWJsaWNcbiAgLy8gYXBwLnVzZShmYXZpY29uKHBhdGguam9pbihfX2Rpcm5hbWUsICdwdWJsaWMnLCAnZmF2aWNvbi5pY28nKSkpO1xuICAvLyBhcHAudXNlKGxvZ2dlcignZGV2JykpO1xuICBhcHAudXNlKGxvZ2dlci5jb25uZWN0TG9nZ2VyKGxvZywge1xuICAgIGxldmVsOiAnREVCVUcnXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLmpzb24oe1xuICAgIGxpbWl0OiAnNTBtYidcbiAgfSkpO1xuICBhcHAudXNlKGJvZHlQYXJzZXIudXJsZW5jb2RlZCh7XG4gICAgZXh0ZW5kZWQ6IGZhbHNlLFxuICAgIGxpbWl0OiAnNTBtYidcbiAgfSkpO1xuICBhcHAudXNlKGJvZHlQYXJzZXIucmF3KHtcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLnRleHQoe1xuICAgIGxpbWl0OiAnNTBtYidcbiAgfSkpO1xuICBhcHAudXNlKGNvb2tpZVBhcnNlcigpKTtcbiAgYXBwLnVzZShjb21wcmVzc2lvbigpKTtcblxuICBjb25zdCBub2RlVmVyID0gcHJvY2Vzcy52ZXJzaW9uO1xuICBhcHAudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIHJlcy5zZXRIZWFkZXIoJ1gtTm9kZWpzJywgbm9kZVZlcik7XG4gICAgbmV4dCgpO1xuICB9KTtcbiAgY29uc3QgaGFzaEZpbGUgPSBQYXRoLmpvaW4oYXBpLmNvbmZpZygpLnJvb3RQYXRoLCAnZ2l0aGFzaC1zZXJ2ZXIudHh0Jyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGhhc2hGaWxlKSkge1xuICAgIGNvbnN0IGdpdGhhc2ggPSBmcy5yZWFkRmlsZVN5bmMoaGFzaEZpbGUsICd1dGY4Jyk7XG4gICAgYXBwLmdldCgnL2dpdGhhc2gtc2VydmVyJywgKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSkgPT4ge1xuICAgICAgcmVzLnNldCgnQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKTtcbiAgICAgIHJlcy5zZW5kKGdpdGhhc2gpO1xuICAgIH0pO1xuICAgIGFwcC5nZXQoJy9naXRoYXNoLXNlcnZlci50eHQnLCAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlKSA9PiB7XG4gICAgICByZXMuc2V0KCdDb250ZW50LVR5cGUnLCAndGV4dC9wbGFpbicpO1xuICAgICAgcmVzLnNlbmQoZ2l0aGFzaCk7XG4gICAgfSk7XG4gIH1cbiAgY3JlYXRlUGFja2FnZURlZmluZWRSb3V0ZXJzKGFwcCk7XG4gIC8vIGVycm9yIGhhbmRsZXJzXG4gIC8vIGNhdGNoIDQwNCBhbmQgZm9yd2FyZCB0byBlcnJvciBoYW5kbGVyXG4gIGFwcC51c2UoZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgICAvLyBsb2cuaW5mbygnTm90IEZvdW5kOiAnICsgcmVxLm9yaWdpbmFsVXJsKTtcbiAgICBpZiAocmVxLnVybC5pbmRleE9mKCcvZmF2aWNvbi8nKSA+PSAwKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpO1xuICAgIH1cbiAgICAvLyBjb25zdCBlcnIgPSBuZXcgRXJyb3IoJ05vdCBGb3VuZCcpO1xuICAgIHJlcy5zdGF0dXMoNDA0KTtcbiAgICAvLyBuZXh0KGVycik7XG4gICAgbG9nLmluZm8oYE5vdCBmb3VuZDogJHtyZXEub3JpZ2luYWxVcmx9LCBVQTogXCIke3JlcS5oZWFkZXIoJ3VzZXItYWdlbnQnKSBhcyBzdHJpbmd9XCJgKTtcbiAgICByZXMucmVuZGVyKFBhdGguam9pbihWSUVXX1BBVEgsICdfZHJjcC1leHByZXNzLWVycm9yLmh0bWwnKSwge1xuICAgICAgbWVzc2FnZTogJ1NvcnJ5LCBwYWdlIGlzIG5vdCBmb3VuZCcsXG4gICAgICBlcnJvcjogbnVsbFxuICAgIH0pO1xuICB9KTtcblxuICAvLyBkZXZlbG9wbWVudCBlcnJvciBoYW5kbGVyXG4gIC8vIHdpbGwgcHJpbnQgc3RhY2t0cmFjZVxuICBpZiAoc2V0dGluZy5kZXZNb2RlIHx8IGFwcC5nZXQoJ2VudicpID09PSAnZGV2ZWxvcG1lbnQnKSB7XG4gICAgYXBwLnVzZShmdW5jdGlvbihlcnI6IGFueSwgcmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgICAgIHJlcy5zdGF0dXMoKGVyciApLnN0YXR1cyB8fCA1MDApO1xuICAgICAgbG9nLmVycm9yKHJlcS5vcmlnaW5hbFVybCwgZXJyLmluc3BlY3QgPyBlcnIuaW5zcGVjdCgpIDogZXJyKTtcbiAgICAgIHJlcy5yZW5kZXIoUGF0aC5qb2luKFZJRVdfUEFUSCwgJ19kcmNwLWV4cHJlc3MtZXJyb3IuaHRtbCcpLCB7XG4gICAgICAgIG1lc3NhZ2U6IGVyci5tZXNzYWdlLFxuICAgICAgICBlcnJvcjogZXJyXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHByb2R1Y3Rpb24gZXJyb3IgaGFuZGxlclxuICAvLyBubyBzdGFja3RyYWNlcyBsZWFrZWQgdG8gdXNlclxuICBhcHAudXNlKGZ1bmN0aW9uKGVycjogRXJyb3IsIHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSB7XG4gICAgcmVzLnN0YXR1cygoZXJyIGFzIGFueSkuc3RhdHVzIHx8IDUwMCk7XG4gICAgbG9nLmVycm9yKHJlcS5vcmlnaW5hbFVybCwgZXJyKTtcbiAgICByZXMucmVuZGVyKFBhdGguam9pbihWSUVXX1BBVEgsICdfZHJjcC1leHByZXNzLWVycm9yLmh0bWwnKSwge1xuICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXG4gICAgICBlcnJvcjoge31cbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBhcHA7XG59XG4iXX0=