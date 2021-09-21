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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBQzNCLHNEQUE4RTtBQUM5RSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDBDQUEwQztBQUMxQyxzQ0FBNEQ7QUFDNUQsOERBQXFDO0FBQ3JDLHFDQUE4RjtBQUU5RixNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3ZDLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNqRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDM0MsOERBQThEO0FBRTlELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBQSxjQUFNLEdBQUUsQ0FBQyxRQUFRLEVBQy9DLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzFDLElBQUksR0FBb0IsQ0FBQztBQUV6QixNQUFNLGdCQUFnQixHQUFHLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBYyxDQUFDLENBQUMsQ0FBQztBQTBCOUQsU0FBUyxNQUFNLENBQUMsR0FBb0IsRUFBRSxPQUFrQztJQUN0RSxvQkFBb0I7SUFDcEIscUJBQXFCO0lBQ3JCLCtCQUErQjtJQUMvQiw4Q0FBOEM7SUFDOUMsTUFBTTtJQUNOLHdDQUF3QztJQUN4Qyx5RUFBeUU7SUFDekUscUNBQXFDO0lBQ3JDLHNCQUFzQjtJQUN0QixtREFBbUQ7SUFDbkQseUVBQXlFO0lBQ3pFLFFBQVE7SUFDUixNQUFNO0lBRU4sZ0NBQWdDO0lBQ2hDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxN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QUFDLENBQUM7Z0JBQzNCLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUM1QixHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFDRCxnQkFBZ0I7SUFFaEIsSUFBSSxHQUFHLENBQUMsVUFBMkI7UUFDakMsR0FBRyxHQUFHLFVBQVUsQ0FBQztJQUNuQixDQUFDO0lBQ0QsSUFBSSxHQUFHO1FBQ0wsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0NBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IGV4cHJlc3MsIHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9uLCBBcHBsaWNhdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gdmFyIGZhdmljb24gPSByZXF1aXJlKCdzZXJ2ZS1mYXZpY29uJyk7XG5pbXBvcnQge2xvZ2dlciwgRXh0ZW5zaW9uQ29udGV4dCwgY29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBib2R5UGFyc2VyIGZyb20gJ2JvZHktcGFyc2VyJztcbmltcG9ydCB7c2V0dXBBcGksIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nLCBjcmVhdGVQYWNrYWdlRGVmaW5lZFJvdXRlcnN9IGZyb20gJy4vcm91dGVzJztcblxuY29uc3QgY29va2llUGFyc2VyID0gcmVxdWlyZSgnY29va2llLXBhcnNlcicpO1xuY29uc3QgZW5naW5lcyA9IHJlcXVpcmUoJ2NvbnNvbGlkYXRlJyk7XG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdAd2ZoL2V4cHJlc3MtYXBwJyk7XG5jb25zdCBjb21wcmVzc2lvbiA9IHJlcXVpcmUoJ2NvbXByZXNzaW9uJyk7XG4vLyB2YXIgc3dpZ0luamVjdExvYWRlciA9IHJlcXVpcmUoJ3N3aWctcGFja2FnZS10bXBsLWxvYWRlcicpO1xuXG5jb25zdCBWSUVXX1BBVEggPSBQYXRoLnJlbGF0aXZlKGNvbmZpZygpLnJvb3RQYXRoLFxuICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAndmlld3MnKSk7XG52YXIgYXBwOiBleHByZXNzLkV4cHJlc3M7XG5cbmNvbnN0IGV4cHJlc3NBcHBSZWFkeSQgPSBuZXcgcnguUmVwbGF5U3ViamVjdDxBcHBsaWNhdGlvbj4oMSk7XG5cbmV4cG9ydCA9IHtcbiAgYWN0aXZhdGUoYXBpOiBFeHRlbnNpb25Db250ZXh0KSB7XG4gICAgYXBwID0gZXhwcmVzcygpO1xuICAgIHNldHVwQXBpKGFwaSwgYXBwKTtcbiAgICBhcGkuZXZlbnRCdXMub24oJ3BhY2thZ2VzQWN0aXZhdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICBsb2cuaW5mbygncGFja2FnZXNBY3RpdmF0ZWQnKTtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICBjcmVhdGUoYXBwLCBjb25maWcoKSk7XG4gICAgICAgIGV4cHJlc3NBcHBSZWFkeSQubmV4dChhcHApO1xuICAgICAgICBleHByZXNzQXBwUmVhZHkkLmNvbXBsZXRlKCk7XG4gICAgICAgIGFwaS5ldmVudEJ1cy5lbWl0KCdhcHBDcmVhdGVkJywgYXBwKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuICBleHByZXNzQXBwUmVhZHkkLFxuXG4gIHNldCBhcHAoZXhwcmVzc0FwcDogZXhwcmVzcy5FeHByZXNzKSB7XG4gICAgYXBwID0gZXhwcmVzc0FwcDtcbiAgfSxcbiAgZ2V0IGFwcCgpIHtcbiAgICByZXR1cm4gYXBwO1xuICB9XG59O1xuXG5mdW5jdGlvbiBjcmVhdGUoYXBwOiBleHByZXNzLkV4cHJlc3MsIHNldHRpbmc6IFJldHVyblR5cGU8dHlwZW9mIGNvbmZpZz4pIHtcbiAgLy8gdmlldyBlbmdpbmUgc2V0dXBcbiAgLy8gc3dpZy5zZXREZWZhdWx0cyh7XG4gIC8vICAgdmFyQ29udHJvbHM6IFsnez0nLCAnPX0nXSxcbiAgLy8gICBjYWNoZTogc2V0dGluZy5kZXZNb2RlID8gZmFsc2UgOiAnbWVtb3J5J1xuICAvLyB9KTtcbiAgLy8gdmFyIGluamVjdG9yID0gcmVxdWlyZSgnX19pbmplY3RvcicpO1xuICAvLyB2YXIgdHJhbnNsYXRlSHRtbCA9IHJlcXVpcmUoJ0Bkci90cmFuc2xhdGUtZ2VuZXJhdG9yJykuaHRtbFJlcGxhY2VyKCk7XG4gIC8vIHN3aWdJbmplY3RMb2FkZXIuc3dpZ1NldHVwKHN3aWcsIHtcbiAgLy8gXHRpbmplY3RvcjogaW5qZWN0b3JcbiAgLy8gXHQvLyBmaWxlQ29udGVudEhhbmRsZXI6IGZ1bmN0aW9uKGZpbGUsIHNvdXJjZSkge1xuICAvLyBcdC8vIFx0cmV0dXJuIHRyYW5zbGF0ZUh0bWwoc291cmNlLCBmaWxlLCBhcGkuY29uZmlnLmdldCgnbG9jYWxlc1swXScpKTtcbiAgLy8gXHQvLyB9XG4gIC8vIH0pO1xuXG4gIC8vIGVuZ2luZXMucmVxdWlyZXMuc3dpZyA9IHN3aWc7XG4gIGFwcC5lbmdpbmUoJ2h0bWwnLCBlbmdpbmVzLmxvZGFzaCk7XG4gIC8vIGFwcC5zZXQoJ3ZpZXcgY2FjaGUnLCBmYWxzZSk7XG4gIC8vIGFwcC5lbmdpbmUoJ2phZGUnLCBlbmdpbmVzLmphZGUpO1xuICBhcHAuc2V0KCd0cnVzdCBwcm94eScsIHRydWUpO1xuICBhcHAuc2V0KCd2aWV3cycsIFtzZXR0aW5nLnJvb3RQYXRoXSk7XG4gIGFwcC5zZXQoJ3ZpZXcgZW5naW5lJywgJ2h0bWwnKTtcbiAgYXBwLnNldCgneC1wb3dlcmVkLWJ5JywgZmFsc2UpO1xuICBhcHAuc2V0KCdlbnYnLCBjb25maWcoKS5kZXZNb2RlID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJyk7XG4gIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nKGFwcCk7XG4gIC8vIHVuY29tbWVudCBhZnRlciBwbGFjaW5nIHlvdXIgZmF2aWNvbiBpbiAvcHVibGljXG4gIC8vIGFwcC51c2UoZmF2aWNvbihwYXRoLmpvaW4oX19kaXJuYW1lLCAncHVibGljJywgJ2Zhdmljb24uaWNvJykpKTtcbiAgLy8gYXBwLnVzZShsb2dnZXIoJ2RldicpKTtcbiAgYXBwLnVzZShsb2dnZXIuY29ubmVjdExvZ2dlcihsb2csIHtcbiAgICBsZXZlbDogJ0RFQlVHJ1xuICB9KSk7XG4gIGFwcC51c2UoYm9keVBhcnNlci5qc29uKHtcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLnVybGVuY29kZWQoe1xuICAgIGV4dGVuZGVkOiBmYWxzZSxcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShib2R5UGFyc2VyLnJhdyh7XG4gICAgbGltaXQ6ICc1MG1iJ1xuICB9KSk7XG4gIGFwcC51c2UoYm9keVBhcnNlci50ZXh0KHtcbiAgICBsaW1pdDogJzUwbWInXG4gIH0pKTtcbiAgYXBwLnVzZShjb29raWVQYXJzZXIoKSk7XG4gIGFwcC51c2UoY29tcHJlc3Npb24oKSk7XG5cbiAgY29uc3Qgbm9kZVZlciA9IHByb2Nlc3MudmVyc2lvbjtcbiAgYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICByZXMuc2V0SGVhZGVyKCdYLU5vZGVqcycsIG5vZGVWZXIpO1xuICAgIG5leHQoKTtcbiAgfSk7XG4gIGNvbnN0IGhhc2hGaWxlID0gUGF0aC5qb2luKGNvbmZpZygpLnJvb3RQYXRoLCAnZ2l0aGFzaC1zZXJ2ZXIudHh0Jyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGhhc2hGaWxlKSkge1xuICAgIGNvbnN0IGdpdGhhc2ggPSBmcy5yZWFkRmlsZVN5bmMoaGFzaEZpbGUsICd1dGY4Jyk7XG4gICAgYXBwLmdldCgnL2dpdGhhc2gtc2VydmVyJywgKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSkgPT4ge1xuICAgICAgcmVzLnNldCgnQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKTtcbiAgICAgIHJlcy5zZW5kKGdpdGhhc2gpO1xuICAgIH0pO1xuICAgIGFwcC5nZXQoJy9naXRoYXNoLXNlcnZlci50eHQnLCAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlKSA9PiB7XG4gICAgICByZXMuc2V0KCdDb250ZW50LVR5cGUnLCAndGV4dC9wbGFpbicpO1xuICAgICAgcmVzLnNlbmQoZ2l0aGFzaCk7XG4gICAgfSk7XG4gIH1cbiAgY3JlYXRlUGFja2FnZURlZmluZWRSb3V0ZXJzKGFwcCk7XG4gIC8vIGVycm9yIGhhbmRsZXJzXG4gIC8vIGNhdGNoIDQwNCBhbmQgZm9yd2FyZCB0byBlcnJvciBoYW5kbGVyXG4gIGFwcC51c2UoZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgICAvLyBsb2cuaW5mbygnTm90IEZvdW5kOiAnICsgcmVxLm9yaWdpbmFsVXJsKTtcbiAgICBpZiAocmVxLnVybC5pbmRleE9mKCcvZmF2aWNvbi8nKSA+PSAwKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpO1xuICAgIH1cbiAgICAvLyBjb25zdCBlcnIgPSBuZXcgRXJyb3IoJ05vdCBGb3VuZCcpO1xuICAgIHJlcy5zdGF0dXMoNDA0KTtcbiAgICAvLyBuZXh0KGVycik7XG4gICAgbG9nLmluZm8oYE5vdCBmb3VuZDogJHtyZXEub3JpZ2luYWxVcmx9LCBVQTogXCIke3JlcS5oZWFkZXIoJ3VzZXItYWdlbnQnKSBhcyBzdHJpbmd9XCJgKTtcbiAgICByZXMucmVuZGVyKFBhdGguam9pbihWSUVXX1BBVEgsICdfZHJjcC1leHByZXNzLWVycm9yLmh0bWwnKSwge1xuICAgICAgbWVzc2FnZTogJ1NvcnJ5LCBwYWdlIGlzIG5vdCBmb3VuZCcsXG4gICAgICBlcnJvcjogbnVsbFxuICAgIH0pO1xuICB9KTtcblxuICAvLyBkZXZlbG9wbWVudCBlcnJvciBoYW5kbGVyXG4gIC8vIHdpbGwgcHJpbnQgc3RhY2t0cmFjZVxuICBpZiAoc2V0dGluZy5kZXZNb2RlIHx8IGFwcC5nZXQoJ2VudicpID09PSAnZGV2ZWxvcG1lbnQnKSB7XG4gICAgYXBwLnVzZShmdW5jdGlvbihlcnI6IGFueSwgcmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgICAgIHJlcy5zdGF0dXMoKGVyciApLnN0YXR1cyB8fCA1MDApO1xuICAgICAgbG9nLmVycm9yKHJlcS5vcmlnaW5hbFVybCwgZXJyLmluc3BlY3QgPyBlcnIuaW5zcGVjdCgpIDogZXJyKTtcbiAgICAgIHJlcy5yZW5kZXIoUGF0aC5qb2luKFZJRVdfUEFUSCwgJ19kcmNwLWV4cHJlc3MtZXJyb3IuaHRtbCcpLCB7XG4gICAgICAgIG1lc3NhZ2U6IGVyci5tZXNzYWdlLFxuICAgICAgICBlcnJvcjogZXJyXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHByb2R1Y3Rpb24gZXJyb3IgaGFuZGxlclxuICAvLyBubyBzdGFja3RyYWNlcyBsZWFrZWQgdG8gdXNlclxuICBhcHAudXNlKGZ1bmN0aW9uKGVycjogRXJyb3IsIHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSB7XG4gICAgcmVzLnN0YXR1cygoZXJyIGFzIGFueSkuc3RhdHVzIHx8IDUwMCk7XG4gICAgbG9nLmVycm9yKHJlcS5vcmlnaW5hbFVybCwgZXJyKTtcbiAgICByZXMucmVuZGVyKFBhdGguam9pbihWSUVXX1BBVEgsICdfZHJjcC1leHByZXNzLWVycm9yLmh0bWwnKSwge1xuICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXG4gICAgICBlcnJvcjoge31cbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBhcHA7XG59XG4iXX0=