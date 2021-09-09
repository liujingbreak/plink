import * as rx from 'rxjs';
import express, {Request, Response, NextFunction, Application} from 'express';
import * as Path from 'path';
import * as fs from 'fs';
// var favicon = require('serve-favicon');
import {logger, ExtensionContext} from '@wfh/plink';
import bodyParser from 'body-parser';
import {setupApi, applyPackageDefinedAppSetting, createPackageDefinedRouters} from './routes';
import api from '__api';
const cookieParser = require('cookie-parser');
const engines = require('consolidate');
const log = logger.getLogger('@wfh/express-app');
const compression = require('compression');
// var swigInjectLoader = require('swig-package-tmpl-loader');

const VIEW_PATH = Path.relative(api.config().rootPath,
  Path.resolve(__dirname, '..', 'views'));
var app: express.Express;

const expressAppReady$ = new rx.ReplaySubject<Application>(1);

export = {
  activate(api: ExtensionContext) {
    app = express();
    setupApi(api, app);
    api.eventBus.on('packagesActivated', function() {
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

  set app(expressApp: express.Express) {
    app = expressApp;
  },
  get app() {
    return app;
  }
};

function create(app: express.Express, setting: any) {
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
  app.set('env', api.config().devMode ? 'development' : 'production');
  applyPackageDefinedAppSetting(app);
  // uncomment after placing your favicon in /public
  // app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
  // app.use(logger('dev'));
  app.use(logger.connectLogger(log, {
    level: 'DEBUG'
  }));
  app.use(bodyParser.json({
    limit: '50mb'
  }));
  app.use(bodyParser.urlencoded({
    extended: false,
    limit: '50mb'
  }));
  app.use(bodyParser.raw({
    limit: '50mb'
  }));
  app.use(bodyParser.text({
    limit: '50mb'
  }));
  app.use(cookieParser());
  app.use(compression());

  const nodeVer = process.version;
  app.use((req, res, next) => {
    res.setHeader('X-Nodejs', nodeVer);
    next();
  });
  const hashFile = Path.join(api.config().rootPath, 'githash-server.txt');
  if (fs.existsSync(hashFile)) {
    const githash = fs.readFileSync(hashFile, 'utf8');
    app.get('/githash-server', (req: Request, res: Response) => {
      res.set('Content-Type', 'text/plain');
      res.send(githash);
    });
    app.get('/githash-server.txt', (req: Request, res: Response) => {
      res.set('Content-Type', 'text/plain');
      res.send(githash);
    });
  }
  createPackageDefinedRouters(app);
  // error handlers
  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    // log.info('Not Found: ' + req.originalUrl);
    if (req.url.indexOf('/favicon/') >= 0) {
      return res.status(404);
    }
    // const err = new Error('Not Found');
    res.status(404);
    // next(err);
    log.info(`Not found: ${req.originalUrl}, UA: "${req.header('user-agent') as string}"`);
    res.render(Path.join(VIEW_PATH, '_drcp-express-error.html'), {
      message: 'Sorry, page is not found',
      error: null
    });
  });

  // development error handler
  // will print stacktrace
  if (setting.devMode || app.get('env') === 'development') {
    app.use(function(err: any, req: Request, res: Response, next: NextFunction) {
      res.status((err ).status || 500);
      log.error(req.originalUrl, err.inspect ? err.inspect() : err);
      res.render(Path.join(VIEW_PATH, '_drcp-express-error.html'), {
        message: err.message,
        error: err
      });
    });
  }

  // production error handler
  // no stacktraces leaked to user
  app.use(function(err: Error, req: Request, res: Response, next: NextFunction) {
    res.status((err as any).status || 500);
    log.error(req.originalUrl, err);
    res.render(Path.join(VIEW_PATH, '_drcp-express-error.html'), {
      message: err.message,
      error: {}
    });
  });
  return app;
}
