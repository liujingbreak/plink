"use strict";
const tslib_1 = require("tslib");
const Path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const express_1 = tslib_1.__importDefault(require("express"));
// var favicon = require('serve-favicon');
const plink_1 = require("@wfh/plink");
const body_parser_1 = tslib_1.__importDefault(require("body-parser"));
const routes_1 = require("./routes");
const cookieParser = require('cookie-parser');
const engines = require('consolidate');
const log = plink_1.logger.getLogger('@wfh/express-app');
const compression = require('compression');
// var swigInjectLoader = require('swig-package-tmpl-loader');
const VIEW_PATH = Path.relative((0, plink_1.config)().rootPath, Path.resolve(__dirname, '..', 'views'));
let app;
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
    app.use('/ping', (req, res) => {
        log.info('response header', JSON.stringify(res.getHeaders()));
        log.info('response:', req.body);
        res.write('...\n');
        setTimeout(() => {
            log.info('Pong');
            res.end('Pong\n');
        }, 2000);
        // res.destroy();
        // req.on('data', (data: Buffer) => {
        //   log.info('Recieve', data.toString());
        // });
        // req.on('end', () => res.end('Pong\n'));
        // res.end('recieving\n');
    });
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
//# sourceMappingURL=app.js.map