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
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const rx = __importStar(require("rxjs"));
const express_1 = __importDefault(require("express"));
// var favicon = require('serve-favicon');
const plink_1 = require("@wfh/plink");
const body_parser_1 = __importDefault(require("body-parser"));
const routes_1 = require("./routes");
const cookieParser = require('cookie-parser');
const engines = require('consolidate');
const log = plink_1.logger.getLogger('@wfh/express-app');
const compression = require('compression');
// var swigInjectLoader = require('swig-package-tmpl-loader');
const VIEW_PATH = Path.relative((0, plink_1.config)().rootPath, Path.resolve(__dirname, '..', 'views'));
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
    app.set('env', (0, plink_1.config)().devMode ? 'development' : 'production');
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
    // app.use((req, res, next) => {
    //   if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
    //     // in case request HOST is a unknown name, most likely is proxied
    //     req.url = new URL(req.url).pathname;
    //     req.originalUrl = req.url;
    //     log.warn('rewrite url to', req.url);
    //   }
    //   next();
    // });
    const nodeVer = process.version;
    app.use((req, res, next) => {
        res.setHeader('X-Nodejs', nodeVer);
        next();
    });
    const hashFile = Path.join((0, plink_1.config)().rootPath, 'githash-server.txt');
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
    app.use(function (req, res) {
        // log.info('Not Found: ' + req.originalUrl);
        if (req.url.indexOf('/favicon/') >= 0) {
            return res.status(404);
        }
        // const err = new Error('Not Found');
        res.status(404);
        // next(err);
        log.info(`Not found: ${req.originalUrl}, ${req.url}, UA: "${req.header('user-agent')}"`);
        res.render(Path.join(VIEW_PATH, '_drcp-express-error.html'), {
            message: 'Sorry, page is not found',
            error: null
        });
    });
    // development error handler
    // will print stacktrace
    if (setting.devMode || app.get('env') === 'development') {
        app.use(function (err, req, res) {
            res.status((err).status || 500);
            log.error(req.originalUrl, ',', req.url, req.header('user-agent'), err.inspect ? err.inspect() : err);
            res.render(Path.join(VIEW_PATH, '_drcp-express-error.html'), {
                message: err.message,
                error: err
            });
        });
    }
    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res) {
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
                create(app, (0, plink_1.config)());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLHVDQUF5QjtBQUN6Qix5Q0FBMkI7QUFDM0Isc0RBQWdFO0FBQ2hFLDBDQUEwQztBQUMxQyxzQ0FBNEQ7QUFDNUQsOERBQXFDO0FBQ3JDLHFDQUE4RjtBQUU5RixNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3ZDLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNqRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDM0MsOERBQThEO0FBRTlELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBQSxjQUFNLEdBQUUsQ0FBQyxRQUFRLEVBQy9DLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzFDLElBQUksR0FBb0IsQ0FBQztBQUV6QixNQUFNLGdCQUFnQixHQUFHLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBYyxDQUFDLENBQUMsQ0FBQztBQTBCOUQsU0FBUyxNQUFNLENBQUMsR0FBb0IsRUFBRSxPQUFrQztJQUN0RSxvQkFBb0I7SUFDcEIscUJBQXFCO0lBQ3JCLCtCQUErQjtJQUMvQiw4Q0FBOEM7SUFDOUMsTUFBTTtJQUNOLHdDQUF3QztJQUN4Qyx5RUFBeUU7SUFDekUscUNBQXFDO0lBQ3JDLHNCQUFzQjtJQUN0QixtREFBbUQ7SUFDbkQseUVBQXlFO0lBQ3pFLFFBQVE7SUFDUixNQUFNO0lBRU4sZ0NBQWdDO0lBQ2hDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxN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LEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUM5QixPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtnQkFDcEIsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFBLGNBQU0sR0FBRSxDQUFDLENBQUM7Z0JBQ3RCLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0IsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzVCLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUNELGdCQUFnQjtJQUVoQixJQUFJLEdBQUcsQ0FBQyxVQUEyQjtRQUNqQyxHQUFHLEdBQUcsVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFDRCxJQUFJLEdBQUc7UUFDTCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IGV4cHJlc3MsIHtSZXF1ZXN0LCBSZXNwb25zZSwgQXBwbGljYXRpb259IGZyb20gJ2V4cHJlc3MnO1xuLy8gdmFyIGZhdmljb24gPSByZXF1aXJlKCdzZXJ2ZS1mYXZpY29uJyk7XG5pbXBvcnQge2xvZ2dlciwgRXh0ZW5zaW9uQ29udGV4dCwgY29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBib2R5UGFyc2VyIGZyb20gJ2JvZHktcGFyc2VyJztcbmltcG9ydCB7c2V0dXBBcGksIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nLCBjcmVhdGVQYWNrYWdlRGVmaW5lZFJvdXRlcnN9IGZyb20gJy4vcm91dGVzJztcblxuY29uc3QgY29va2llUGFyc2VyID0gcmVxdWlyZSgnY29va2llLXBhcnNlcicpO1xuY29uc3QgZW5naW5lcyA9IHJlcXVpcmUoJ2NvbnNvbGlkYXRlJyk7XG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdAd2ZoL2V4cHJlc3MtYXBwJyk7XG5jb25zdCBjb21wcmVzc2lvbiA9IHJlcXVpcmUoJ2NvbXByZXNzaW9uJyk7XG4vLyB2YXIgc3dpZ0luamVjdExvYWRlciA9IHJlcXVpcmUoJ3N3aWctcGFja2FnZS10bXBsLWxvYWRlcicpO1xuXG5jb25zdCBWSUVXX1BBVEggPSBQYXRoLnJlbGF0aXZlKGNvbmZpZygpLnJvb3RQYXRoLFxuICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAndmlld3MnKSk7XG52YXIgYXBwOiBleHByZXNzLkV4cHJlc3M7XG5cbmNvbnN0IGV4cHJlc3NBcHBSZWFkeSQgPSBuZXcgcnguUmVwbGF5U3ViamVjdDxBcHBsaWNhdGlvbj4oMSk7XG5cbmV4cG9ydCA9IHtcbiAgYWN0aXZhdGUoYXBpOiBFeHRlbnNpb25Db250ZXh0KSB7XG4gICAgYXBwID0gZXhwcmVzcygpO1xuICAgIHNldHVwQXBpKGFwaSwgYXBwKTtcbiAgICBhcGkuZXZlbnRCdXMub24oJ3BhY2thZ2VzQWN0aXZhdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICBsb2cuaW5mbygncGFja2FnZXNBY3RpdmF0ZWQnKTtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICBjcmVhdGUoYXBwLCBjb25maWcoKSk7XG4gICAgICAgIGV4cHJlc3NBcHBSZWFkeSQubmV4dChhcHApO1xuICAgICAgICBleHByZXNzQXBwUmVhZHkkLmNvbXBsZXRlKCk7XG4gICAgICAgIGFwaS5ldmVudEJ1cy5lbWl0KCdhcHBDcmVhdGVkJywgYXBwKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuICBleHByZXNzQXBwUmVhZHkkLFxuXG4gIHNldCBhcHAoZXhwcmVzc0FwcDogZXhwcmVzcy5FeHByZXNzKSB7XG4gICAgYXBwID0gZXhwcmVzc0FwcDtcbiAgfSxcbiAgZ2V0IGFwcCgpIHtcbiAgICByZXR1cm4gYXBwO1xuICB9XG59O1xuXG5mdW5jdGlvbiBjcmVhdGUoYXBwOiBleHByZXNzLkV4cHJlc3MsIHNldHRpbmc6IFJldHVyblR5cGU8dHlwZW9mIGNvbmZpZz4pIHtcbiAgLy8gdmlldyBlbmdpbmUgc2V0dXBcbiAgLy8gc3dpZy5zZXREZWZhdWx0cyh7XG4gIC8vICAgdmFyQ29udHJvbHM6IFsnez0nLCAnPX0nXSxcbiAgLy8gICBjYWNoZTogc2V0dGluZy5kZXZNb2RlID8gZmFsc2UgOiAnbWVtb3J5J1xuICAvLyB9KTtcbiAgLy8gdmFyIGluamVjdG9yID0gcmVxdWlyZSgnX19pbmplY3RvcicpO1xuICAvLyB2YXIgdHJhbnNsYXRlSHRtbCA9IHJlcXVpcmUoJ0Bkci90cmFuc2xhdGUtZ2VuZXJhdG9yJykuaHRtbFJlcGxhY2VyKCk7XG4gIC8vIHN3aWdJbmplY3RMb2FkZXIuc3dpZ1NldHVwKHN3aWcsIHtcbiAgLy8gXHRpbmplY3RvcjogaW5qZWN0b3JcbiAgLy8gXHQvLyBmaWxlQ29udGVudEhhbmRsZXI6IGZ1bmN0aW9uKGZpbGUsIHNvdXJjZSkge1xuICAvLyBcdC8vIFx0cmV0dXJuIHRyYW5zbGF0ZUh0bWwoc291cmNlLCBmaWxlLCBhcGkuY29uZmlnLmdldCgnbG9jYWxlc1swXScpKTtcbiAgLy8gXHQvLyB9XG4gIC8vIH0pO1xuXG4gIC8vIGVuZ2luZXMucmVxdWlyZXMuc3dpZyA9IHN3aWc7XG4gIGFwcC5lbmdpbmUoJ2h0bWwnLCBlbmdpbmVzLmxvZGFzaCk7XG4gIC8vIGFwcC5zZXQoJ3ZpZXcgY2FjaGUnLCBmYWxzZSk7XG4gIC8vIGFwcC5lbmdpbmUoJ2phZGUnLCBlbmdpbmVzLmphZGUpO1xuICBhcHAuc2V0KCd0cnVzdCBwcm94eScsIHRydWUpO1xuICBhcHAuc2V0KCd2aWV3cycsIFtzZXR0aW5nLnJvb3RQYXRoXSk7XG4gIGFwcC5zZXQoJ3ZpZXcgZW5naW5lJywgJ2h0bWwnKTtcbiAgYXBwLnNldCgneC1wb3dlcmVkLWJ5JywgZmFsc2UpO1xuICBhcHAuc2V0KCdlbnYnLCBjb25maWcoKS5kZXZNb2RlID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJyk7XG4gIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nKGFwcCk7XG4gIC8vIHVuY29tbWVudCBhZnRlciBwbGFjaW5nIHlvdXIgZmF2aWNvbiBpbiAvcHVibGljXG4gIC8vIGFwcC51c2UoZmF2aWNvbihwYXRoLmpvaW4oX19kaXJuYW1lLCAncHVibGljJywgJ2Zhdmljb24uaWNvJykpKTtcbiAgLy8gYXBwLnVzZShsb2dnZXIoJ2RldicpKTtcbiAgYXBwLnVzZShsb2dnZXIuY29ubmVjdExvZ2dlcihsb2csIHtcbiAgICBsZXZlbDogJ0RFQlVHJ1xuICB9KSk7XG4gIGFwcC51c2UoYm9keVBhcnNlci5qc29uKHtcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLnVybGVuY29kZWQoe1xuICAgIGV4dGVuZGVkOiBmYWxzZSxcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLnJhdyh7XG4gICAgbGltaXQ6ICc1MG1iJ1xuICB9KSk7XG4gIGFwcC51c2UoYm9keVBhcnNlci50ZXh0KHtcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShjb29raWVQYXJzZXIoKSk7XG4gIGFwcC51c2UoY29tcHJlc3Npb24oKSk7XG4gIC8vIGFwcC51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gIC8vICAgaWYgKHJlcS51cmwuc3RhcnRzV2l0aCgnaHR0cDovLycpIHx8IHJlcS51cmwuc3RhcnRzV2l0aCgnaHR0cHM6Ly8nKSkge1xuICAvLyAgICAgLy8gaW4gY2FzZSByZXF1ZXN0IEhPU1QgaXMgYSB1bmtub3duIG5hbWUsIG1vc3QgbGlrZWx5IGlzIHByb3hpZWRcbiAgLy8gICAgIHJlcS51cmwgPSBuZXcgVVJMKHJlcS51cmwpLnBhdGhuYW1lO1xuICAvLyAgICAgcmVxLm9yaWdpbmFsVXJsID0gcmVxLnVybDtcbiAgLy8gICAgIGxvZy53YXJuKCdyZXdyaXRlIHVybCB0bycsIHJlcS51cmwpO1xuICAvLyAgIH1cbiAgLy8gICBuZXh0KCk7XG4gIC8vIH0pO1xuXG4gIGNvbnN0IG5vZGVWZXIgPSBwcm9jZXNzLnZlcnNpb247XG4gIGFwcC51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgcmVzLnNldEhlYWRlcignWC1Ob2RlanMnLCBub2RlVmVyKTtcbiAgICBuZXh0KCk7XG4gIH0pO1xuICBjb25zdCBoYXNoRmlsZSA9IFBhdGguam9pbihjb25maWcoKS5yb290UGF0aCwgJ2dpdGhhc2gtc2VydmVyLnR4dCcpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhoYXNoRmlsZSkpIHtcbiAgICBjb25zdCBnaXRoYXNoID0gZnMucmVhZEZpbGVTeW5jKGhhc2hGaWxlLCAndXRmOCcpO1xuICAgIGFwcC5nZXQoJy9naXRoYXNoLXNlcnZlcicsIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UpID0+IHtcbiAgICAgIHJlcy5zZXQoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L3BsYWluJyk7XG4gICAgICByZXMuc2VuZChnaXRoYXNoKTtcbiAgICB9KTtcbiAgICBhcHAuZ2V0KCcvZ2l0aGFzaC1zZXJ2ZXIudHh0JywgKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSkgPT4ge1xuICAgICAgcmVzLnNldCgnQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKTtcbiAgICAgIHJlcy5zZW5kKGdpdGhhc2gpO1xuICAgIH0pO1xuICB9XG4gIGNyZWF0ZVBhY2thZ2VEZWZpbmVkUm91dGVycyhhcHApO1xuICAvLyBlcnJvciBoYW5kbGVyc1xuICAvLyBjYXRjaCA0MDQgYW5kIGZvcndhcmQgdG8gZXJyb3IgaGFuZGxlclxuICBhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG4gICAgLy8gbG9nLmluZm8oJ05vdCBGb3VuZDogJyArIHJlcS5vcmlnaW5hbFVybCk7XG4gICAgaWYgKHJlcS51cmwuaW5kZXhPZignL2Zhdmljb24vJykgPj0gMCkge1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KTtcbiAgICB9XG4gICAgLy8gY29uc3QgZXJyID0gbmV3IEVycm9yKCdOb3QgRm91bmQnKTtcbiAgICByZXMuc3RhdHVzKDQwNCk7XG4gICAgLy8gbmV4dChlcnIpO1xuICAgIGxvZy5pbmZvKGBOb3QgZm91bmQ6ICR7cmVxLm9yaWdpbmFsVXJsfSwgJHtyZXEudXJsfSwgVUE6IFwiJHtyZXEuaGVhZGVyKCd1c2VyLWFnZW50JykgYXMgc3RyaW5nfVwiYCk7XG4gICAgcmVzLnJlbmRlcihQYXRoLmpvaW4oVklFV19QQVRILCAnX2RyY3AtZXhwcmVzcy1lcnJvci5odG1sJyksIHtcbiAgICAgIG1lc3NhZ2U6ICdTb3JyeSwgcGFnZSBpcyBub3QgZm91bmQnLFxuICAgICAgZXJyb3I6IG51bGxcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gZGV2ZWxvcG1lbnQgZXJyb3IgaGFuZGxlclxuICAvLyB3aWxsIHByaW50IHN0YWNrdHJhY2VcbiAgaWYgKHNldHRpbmcuZGV2TW9kZSB8fCBhcHAuZ2V0KCdlbnYnKSA9PT0gJ2RldmVsb3BtZW50Jykge1xuICAgIGFwcC51c2UoZnVuY3Rpb24oZXJyOiBhbnksIHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSkge1xuICAgICAgcmVzLnN0YXR1cygoZXJyICkuc3RhdHVzIHx8IDUwMCk7XG4gICAgICBsb2cuZXJyb3IocmVxLm9yaWdpbmFsVXJsLCAnLCcsIHJlcS51cmwsIHJlcS5oZWFkZXIoJ3VzZXItYWdlbnQnKSwgZXJyLmluc3BlY3QgPyBlcnIuaW5zcGVjdCgpIDogZXJyKTtcbiAgICAgIHJlcy5yZW5kZXIoUGF0aC5qb2luKFZJRVdfUEFUSCwgJ19kcmNwLWV4cHJlc3MtZXJyb3IuaHRtbCcpLCB7XG4gICAgICAgIG1lc3NhZ2U6IGVyci5tZXNzYWdlLFxuICAgICAgICBlcnJvcjogZXJyXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHByb2R1Y3Rpb24gZXJyb3IgaGFuZGxlclxuICAvLyBubyBzdGFja3RyYWNlcyBsZWFrZWQgdG8gdXNlclxuICBhcHAudXNlKGZ1bmN0aW9uKGVycjogRXJyb3IsIHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSkge1xuICAgIHJlcy5zdGF0dXMoKGVyciBhcyBhbnkpLnN0YXR1cyB8fCA1MDApO1xuICAgIGxvZy5lcnJvcihyZXEub3JpZ2luYWxVcmwsIGVycik7XG4gICAgcmVzLnJlbmRlcihQYXRoLmpvaW4oVklFV19QQVRILCAnX2RyY3AtZXhwcmVzcy1lcnJvci5odG1sJyksIHtcbiAgICAgIG1lc3NhZ2U6IGVyci5tZXNzYWdlLFxuICAgICAgZXJyb3I6IHt9XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gYXBwO1xufVxuIl19