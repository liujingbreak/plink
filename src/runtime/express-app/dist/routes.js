"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupApi = exports.applyPackageDefinedAppSetting = exports.createPackageDefinedRouters = void 0;
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const plink_1 = require("@wfh/plink");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
let log = (0, plink_1.log4File)(__filename);
let routerSetupFuncs = [];
// let middlewares = [];
let appSets = [];
function createPackageDefinedRouters(app) {
    log.debug('createPackageDefinedRouters');
    routerSetupFuncs.forEach(function (routerDef) {
        try {
            if (routerDef.packageName)
                log.debug(routerDef.packageName, 'defines router/middleware');
            else
                log.debug(routerDef.stack);
            routerDef(app, express_1.default);
        }
        catch (er) {
            log.error('package ' + routerDef.packageName + ' router', er);
            throw er;
        }
    });
}
exports.createPackageDefinedRouters = createPackageDefinedRouters;
function applyPackageDefinedAppSetting(app) {
    log.debug('applyPackageDefinedAppSetting');
    appSets.forEach(callback => {
        log.debug(callback.stack);
        callback(app, express_1.default);
    });
}
exports.applyPackageDefinedAppSetting = applyPackageDefinedAppSetting;
function setupApi(api, app) {
    let apiPrototype = Object.getPrototypeOf(api);
    apiPrototype.express = express_1.default;
    apiPrototype.expressApp = app;
    // apiPrototype.swig = swig;
    /**
       * setup a router under package context path
       * same as app.use('/<package-path>', router);
       * @return {[type]} [description]
       */
    apiPrototype.router = function () {
        const self = this;
        let calleePackageName = this.packageName;
        if (self._router) {
            return self._router;
        }
        let router = self._router = express_1.default.Router();
        let contextPath = self.contextPath;
        let packageRelPath = self.packageInstance.realPath;
        if (path_1.default.sep === '\\') {
            packageRelPath = packageRelPath.replace(/\\/g, '/');
        }
        log.debug('package relative path: ' + packageRelPath);
        packageRelPath += '/';
        let oldRender;
        function setupRouter(app) {
            app.use(contextPath, function (req, res, next) {
                log.debug('In package', calleePackageName, self.packageName, 'middleware customized res.render');
                if (!oldRender)
                    oldRender = Object.getPrototypeOf(res).render;
                res.render = customizedRender;
                next();
            });
            // log.debug(self.packageName + ': app.use context path = ' + contextPath);
            app.use(contextPath, router);
            app.use(contextPath, function (req, res, next) {
                delete res.render;
                log.debug('Out package', calleePackageName, self.packageName, 'cleanup customized res.render');
                next();
            });
            // If an error encountered in previous middlewares, we still need to cleanup render method
            app.use(contextPath, function (err, req, res, next) {
                log.warn('cleanup render() when encountering error in ', contextPath);
                delete res.render;
                next(err);
            });
        }
        setupRouter.packageName = self.packageName;
        // this function will be
        // cached in array and executed later.
        // Thus save current stack for later debug.
        setupRouter.stack = new Error().stack;
        routerSetupFuncs.push(setupRouter);
        function customizedRender(...args) {
            // let args = ([] as any).slice.call(arguments);
            if (args[0].endsWith('_drcp-express-error.html'))
                return oldRender.apply(this, args);
            else if (lodash_1.default.startsWith(args[0], '/')) {
                args[0] = args[0].substring(1);
            }
            else {
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
        'param'].forEach(function (method) {
        apiPrototype[method] = function (_x) {
            let args = [].slice.apply(arguments);
            function setupMiddleware(app) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                app[method](...args);
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
       * @param  callback function(app, express)
       * e.g.
       * 	api.expressAppSet((app, express) => {
       * 		app.set('trust proxy', true);
       * 		app.set('views', Path.resolve(api.config().rootPath, '../web/views/'));
       * 	});
       * @return void
       */
    apiPrototype.expressAppSet = (callback) => {
        appSets.push(callback);
        callback.stack = new Error('info').stack;
    };
    apiPrototype.expressAppUse = (callback) => {
        routerSetupFuncs.push(callback);
        callback.stack = new Error('info').stack;
    };
    /**
       * e.g.
       * 	api.router().options('/api', api.cors());
       * 	api.router().get('/api', api.cors());
       * Or
       *  api.router().use('/api', api.cors());
       * @return void
       */
    apiPrototype.cors = function (allowedOrigins) {
        const setting = api.config()['@wfh/express-app'];
        let corsOpt = setting === null || setting === void 0 ? void 0 : setting.enableCORS;
        const cors = require('cors');
        const whiteOriginSet = new Set();
        if (lodash_1.default.isArray(corsOpt)) {
            corsOpt.forEach(domain => whiteOriginSet.add(domain));
        }
        let corsOptions;
        if (allowedOrigins) {
            corsOptions = {
                origin: allowedOrigins,
                credentials: true
            };
        }
        else {
            corsOptions = {
                // origin: ['http://localhost:14333'],
                origin(origin, callback) {
                    let pass = origin == null || corsOpt === true || whiteOriginSet.has(origin);
                    callback(pass ? null : { status: 400, message: 'Bad Request (CORS) for origin: ' + origin }, pass);
                    if (!pass)
                        log.info('CORS request blocked for origin: ' + origin);
                },
                credentials: true
            };
        }
        return cors(corsOptions);
    };
}
exports.setupApi = setupApi;
//# sourceMappingURL=routes.js.map