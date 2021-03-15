import express, {Application} from 'express';
import api, {DrcpApi} from '__api';
import {ExtensionContext} from '@wfh/plink';
import _ from 'lodash';
import Path from 'path';
import _cors from 'cors';

let log = require('log4js').getLogger(api.packageName + '.setApi');
// let swig = require('swig-templates');

interface RouterDefCallback {
  (app: Application, exp: typeof express): void;
  packageName?: string;
}

let routerSetupFuncs: RouterDefCallback[] = [];
// let middlewares = [];
let appSets: RouterDefCallback[] = [];


export function createPackageDefinedRouters(app: Application) {
  routerSetupFuncs.forEach(function(routerDef) {
    try {
      log.debug(routerDef.packageName, 'defines router/middleware');
      routerDef(app, express);
    } catch (er) {
      log.error('package ' + routerDef.packageName + ' router', er);
      throw er;
    }
  });
  // app.use(revertRenderFunction);
  // app.use(revertRenderFunctionForError);//important
}

export function applyPackageDefinedAppSetting(app: Application) {
  appSets.forEach(callback => {
    callback(app, express);
  });
}

export function setupApi(api: ExtensionContext, app: Application) {
  let apiPrototype: DrcpApi = Object.getPrototypeOf(api);
  apiPrototype.express = express;
  apiPrototype.expressApp = app;
  // apiPrototype.swig = swig;

  /**
	 * setup a router under package context path
	 * same as app.use('/<package-path>', router);
	 * @return {[type]} [description]
	 */
  apiPrototype.router = function(this: typeof api) {
    let self = this;
    let calleePackageName = this.packageName;
    if (self._router) {
      return self._router;
    }
    let router = self._router = express.Router();
    let contextPath = self.contextPath;

    let packageRelPath = self.packageInstance.realPath;
    if (Path.sep === '\\') {
      packageRelPath = packageRelPath.replace(/\\/g, '/');
    }
    log.debug('package relative path: ' + packageRelPath);
    packageRelPath += '/';
    let oldRender: express.Response['render'];
    function setupRouter(app: Application) {
      app.use(contextPath, function(req, res, next) {
        log.debug('In package', calleePackageName, self.packageName, 'middleware customized res.render');
        if (!oldRender)
          oldRender = Object.getPrototypeOf(res).render;
        res.render = customizedRender;
        next();
      });
      // log.debug(self.packageName + ': app.use context path = ' + contextPath);
      app.use(contextPath, router);
      app.use(contextPath, function(req, res, next) {
        delete (res as any).render;
        log.debug('Out package', calleePackageName, self.packageName, 'cleanup customized res.render');
        next();
      });
      // If an error encountered in previous middlewares, we still need to cleanup render method
      app.use(contextPath, function(err, req, res, next) {
        log.warn('cleanup render() when encountering error in ', contextPath);
        delete (res as any).render;
        next(err);
      } as express.ErrorRequestHandler);
    }
    setupRouter.packageName = self.packageName;
    // this function will be
    // cached in array and executed later.
    // Thus save current stack for later debug.
    setupRouter.stack = new Error().stack;
    routerSetupFuncs.push(setupRouter);

    function customizedRender() {
      let args = [].slice.call(arguments);
      if (arguments[0].endsWith('_drcp-express-error.html'))
        return oldRender.apply(this, args);
      else if (_.startsWith(args[0], '/')) {
        args[0] = args[0].substring(1);
      } else {
        args[0] = packageRelPath + arguments[0];
      }

      return oldRender.apply(this, args);
    }

    return router;
  };

  /**
	 * set an express middleware
	 * same as calling `app.use('/optional-path', middleware)`
	 * Middleware is always registered before routers getting registered, so each
	 * request will pass through middleware prior to routers.
	 */
  ['use',
  /**
	 * same as calling `app.param('/optional-path', middleware)`
	 */
    'param'].forEach(function(method) {
    apiPrototype[method] = function(_x: any) {
      let args = [].slice.apply(arguments);
      function setupMiddleware(app: Application) {
        app[method].apply(app, args);
      }
      setupMiddleware.packageName = this.packageName;
      // this function will be
      // cached in array and executed later, the current stack information
      // won't be shown if there is error in later execution progress.
      // Thus save current stack for later debug.
      setupMiddleware.stack = new Error().stack;
      routerSetupFuncs.push(setupMiddleware);
    };
  });

  /**
	 * Callback functions will be called after express app being created
	 * @param  {Function} callback function(app, express)
	 * e.g.
	 * 	api.expressAppSet((app, express) => {
 	 * 		app.set('trust proxy', true);
 	 * 		app.set('views', Path.resolve(api.config().rootPath, '../web/views/'));
 	 * 	});
	 * @return void
	 */
  apiPrototype.expressAppSet = (callback) => appSets.push(callback);
  apiPrototype.expressAppUse = (callback) => routerSetupFuncs.push(callback);
  /**
	 * e.g.
	 * 	api.router().options('/api', api.cors());
	 * 	api.router().get('/api', api.cors());
	 * Or
	 *  api.router().use('/api', api.cors());
	 * @return void
	 */
  apiPrototype.cors = function(allowedOrigins?: string[]) {
    const setting = api.config()['@wfh/express-app'];
    let corsOpt = setting?.enableCORS;
    const cors = require('cors') as typeof _cors;
    const whiteOriginSet = new Set<string>();
    if (_.isArray(corsOpt)) {
      corsOpt.forEach(domain => whiteOriginSet.add(domain));
    }
    let corsOptions: _cors.CorsOptions;
    if (allowedOrigins) {
      corsOptions = {
        origin: allowedOrigins,
        credentials: true
      };
    } else {
      corsOptions = {
        // origin: ['http://localhost:14333'],
        origin(origin: string, callback: (_arg: any, pass: boolean) => void) {
          let pass = origin == null || corsOpt === true || whiteOriginSet.has(origin);
          callback(pass ? null : {status: 400, message: 'Bad Request (CORS) for origin: ' + origin},
            pass);
          if (!pass)
            log.info('CORS request blocked for origin: ' + origin);
        },
        credentials: true
      };
    }
    return cors(corsOptions);
  };
}
