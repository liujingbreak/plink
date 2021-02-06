"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupApi = exports.applyPackageDefinedAppSetting = exports.createPackageDefinedRouters = void 0;
const express_1 = __importDefault(require("express"));
const __api_1 = __importDefault(require("__api"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
let log = require('log4js').getLogger(__api_1.default.packageName + '.setApi');
let swig = require('swig-templates');
let routerSetupFuncs = [];
// let middlewares = [];
let appSets = [];
function createPackageDefinedRouters(app) {
    routerSetupFuncs.forEach(function (routerDef) {
        try {
            log.debug(routerDef.packageName, 'defines router/middleware');
            routerDef(app, express_1.default);
        }
        catch (er) {
            log.error('package ' + routerDef.packageName + ' router', er);
            throw er;
        }
    });
    // app.use(revertRenderFunction);
    // app.use(revertRenderFunctionForError);//important
}
exports.createPackageDefinedRouters = createPackageDefinedRouters;
function applyPackageDefinedAppSetting(app) {
    appSets.forEach(callback => {
        callback(app, express_1.default);
    });
}
exports.applyPackageDefinedAppSetting = applyPackageDefinedAppSetting;
function setupApi(api, app) {
    let apiPrototype = Object.getPrototypeOf(api);
    apiPrototype.express = express_1.default;
    apiPrototype.expressApp = app;
    apiPrototype.swig = swig;
    /**
       * setup a router under package context path
       * same as app.use('/<package-path>', router);
       * @return {[type]} [description]
       */
    apiPrototype.router = function () {
        let self = this;
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
        function customizedRender() {
            let args = [].slice.call(arguments);
            if (arguments[0].endsWith('_drcp-express-error.html'))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicm91dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLHNEQUE2QztBQUM3QyxrREFBbUM7QUFDbkMsb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUd4QixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFDbkUsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFPckMsSUFBSSxnQkFBZ0IsR0FBd0IsRUFBRSxDQUFDO0FBQy9DLHdCQUF3QjtBQUN4QixJQUFJLE9BQU8sR0FBd0IsRUFBRSxDQUFDO0FBR3RDLFNBQWdCLDJCQUEyQixDQUFDLEdBQWdCO0lBQzFELGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFTLFNBQVM7UUFDekMsSUFBSTtZQUNGLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBQzlELFNBQVMsQ0FBQyxHQUFHLEVBQUUsaUJBQU8sQ0FBQyxDQUFDO1NBQ3pCO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsV0FBVyxHQUFHLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5RCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxpQ0FBaUM7SUFDakMsb0RBQW9EO0FBQ3RELENBQUM7QUFaRCxrRUFZQztBQUVELFNBQWdCLDZCQUE2QixDQUFDLEdBQWdCO0lBQzVELE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDekIsUUFBUSxDQUFDLEdBQUcsRUFBRSxpQkFBTyxDQUFDLENBQUM7SUFDekIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBSkQs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R0FBRztnQkFDWixzQ0FBc0M7Z0JBQ3RDLE1BQU0sQ0FBQyxNQUFjLEVBQUUsUUFBNEM7b0JBQ2pFLElBQUksSUFBSSxHQUFHLE1BQU0sSUFBSSxJQUFJLElBQUksT0FBTyxLQUFLLElBQUksSUFBSSxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUM1RSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsaUNBQWlDLEdBQUcsTUFBTSxFQUFDLEVBQ3ZGLElBQUksQ0FBQyxDQUFDO29CQUNSLElBQUksQ0FBQyxJQUFJO3dCQUNQLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUNBQW1DLEdBQUcsTUFBTSxDQUFDLENBQUM7Z0JBQzNELENBQUM7Z0JBQ0QsV0FBVyxFQUFFLElBQUk7YUFDbEIsQ0FBQztTQUNIO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQW5KRCw0QkFtSkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcywge0FwcGxpY2F0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBhcGksIHtEcmNwQXBpfSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgX2NvcnMgZnJvbSAnY29ycyc7XG5cbmxldCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5zZXRBcGknKTtcbmxldCBzd2lnID0gcmVxdWlyZSgnc3dpZy10ZW1wbGF0ZXMnKTtcblxuaW50ZXJmYWNlIFJvdXRlckRlZkNhbGxiYWNrIHtcbiAgKGFwcDogQXBwbGljYXRpb24sIGV4cDogdHlwZW9mIGV4cHJlc3MpOiB2b2lkO1xuICBwYWNrYWdlTmFtZT86IHN0cmluZztcbn1cblxubGV0IHJvdXRlclNldHVwRnVuY3M6IFJvdXRlckRlZkNhbGxiYWNrW10gPSBbXTtcbi8vIGxldCBtaWRkbGV3YXJlcyA9IFtdO1xubGV0IGFwcFNldHM6IFJvdXRlckRlZkNhbGxiYWNrW10gPSBbXTtcblxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGFja2FnZURlZmluZWRSb3V0ZXJzKGFwcDogQXBwbGljYXRpb24pIHtcbiAgcm91dGVyU2V0dXBGdW5jcy5mb3JFYWNoKGZ1bmN0aW9uKHJvdXRlckRlZikge1xuICAgIHRyeSB7XG4gICAgICBsb2cuZGVidWcocm91dGVyRGVmLnBhY2thZ2VOYW1lLCAnZGVmaW5lcyByb3V0ZXIvbWlkZGxld2FyZScpO1xuICAgICAgcm91dGVyRGVmKGFwcCwgZXhwcmVzcyk7XG4gICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgIGxvZy5lcnJvcigncGFja2FnZSAnICsgcm91dGVyRGVmLnBhY2thZ2VOYW1lICsgJyByb3V0ZXInLCBlcik7XG4gICAgICB0aHJvdyBlcjtcbiAgICB9XG4gIH0pO1xuICAvLyBhcHAudXNlKHJldmVydFJlbmRlckZ1bmN0aW9uKTtcbiAgLy8gYXBwLnVzZShyZXZlcnRSZW5kZXJGdW5jdGlvbkZvckVycm9yKTsvL2ltcG9ydGFudFxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlQYWNrYWdlRGVmaW5lZEFwcFNldHRpbmcoYXBwOiBBcHBsaWNhdGlvbikge1xuICBhcHBTZXRzLmZvckVhY2goY2FsbGJhY2sgPT4ge1xuICAgIGNhbGxiYWNrKGFwcCwgZXhwcmVzcyk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBBcGkoYXBpOiBEcmNwQXBpLCBhcHA6IEFwcGxpY2F0aW9uKSB7XG4gIGxldCBhcGlQcm90b3R5cGU6IERyY3BBcGkgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKTtcbiAgYXBpUHJvdG90eXBlLmV4cHJlc3MgPSBleHByZXNzO1xuICBhcGlQcm90b3R5cGUuZXhwcmVzc0FwcCA9IGFwcDtcbiAgYXBpUHJvdG90eXBlLnN3aWcgPSBzd2lnO1xuXG4gIC8qKlxuXHQgKiBzZXR1cCBhIHJvdXRlciB1bmRlciBwYWNrYWdlIGNvbnRleHQgcGF0aFxuXHQgKiBzYW1lIGFzIGFwcC51c2UoJy88cGFja2FnZS1wYXRoPicsIHJvdXRlcik7XG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cbiAgYXBpUHJvdG90eXBlLnJvdXRlciA9IGZ1bmN0aW9uKHRoaXM6IHR5cGVvZiBhcGkpIHtcbiAgICBsZXQgc2VsZiA9IHRoaXM7XG4gICAgbGV0IGNhbGxlZVBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgICBpZiAoc2VsZi5fcm91dGVyKSB7XG4gICAgICByZXR1cm4gc2VsZi5fcm91dGVyO1xuICAgIH1cbiAgICBsZXQgcm91dGVyID0gc2VsZi5fcm91dGVyID0gZXhwcmVzcy5Sb3V0ZXIoKTtcbiAgICBsZXQgY29udGV4dFBhdGggPSBzZWxmLmNvbnRleHRQYXRoO1xuXG4gICAgbGV0IHBhY2thZ2VSZWxQYXRoID0gc2VsZi5wYWNrYWdlSW5zdGFuY2UucmVhbFBhdGg7XG4gICAgaWYgKFBhdGguc2VwID09PSAnXFxcXCcpIHtcbiAgICAgIHBhY2thZ2VSZWxQYXRoID0gcGFja2FnZVJlbFBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIH1cbiAgICBsb2cuZGVidWcoJ3BhY2thZ2UgcmVsYXRpdmUgcGF0aDogJyArIHBhY2thZ2VSZWxQYXRoKTtcbiAgICBwYWNrYWdlUmVsUGF0aCArPSAnLyc7XG4gICAgbGV0IG9sZFJlbmRlcjogZXhwcmVzcy5SZXNwb25zZVsncmVuZGVyJ107XG4gICAgZnVuY3Rpb24gc2V0dXBSb3V0ZXIoYXBwOiBBcHBsaWNhdGlvbikge1xuICAgICAgYXBwLnVzZShjb250ZXh0UGF0aCwgZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdJbiBwYWNrYWdlJywgY2FsbGVlUGFja2FnZU5hbWUsIHNlbGYucGFja2FnZU5hbWUsICdtaWRkbGV3YXJlIGN1c3RvbWl6ZWQgcmVzLnJlbmRlcicpO1xuICAgICAgICBpZiAoIW9sZFJlbmRlcilcbiAgICAgICAgICBvbGRSZW5kZXIgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocmVzKS5yZW5kZXI7XG4gICAgICAgIHJlcy5yZW5kZXIgPSBjdXN0b21pemVkUmVuZGVyO1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9KTtcbiAgICAgIC8vIGxvZy5kZWJ1ZyhzZWxmLnBhY2thZ2VOYW1lICsgJzogYXBwLnVzZSBjb250ZXh0IHBhdGggPSAnICsgY29udGV4dFBhdGgpO1xuICAgICAgYXBwLnVzZShjb250ZXh0UGF0aCwgcm91dGVyKTtcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIGRlbGV0ZSAocmVzIGFzIGFueSkucmVuZGVyO1xuICAgICAgICBsb2cuZGVidWcoJ091dCBwYWNrYWdlJywgY2FsbGVlUGFja2FnZU5hbWUsIHNlbGYucGFja2FnZU5hbWUsICdjbGVhbnVwIGN1c3RvbWl6ZWQgcmVzLnJlbmRlcicpO1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9KTtcbiAgICAgIC8vIElmIGFuIGVycm9yIGVuY291bnRlcmVkIGluIHByZXZpb3VzIG1pZGRsZXdhcmVzLCB3ZSBzdGlsbCBuZWVkIHRvIGNsZWFudXAgcmVuZGVyIG1ldGhvZFxuICAgICAgYXBwLnVzZShjb250ZXh0UGF0aCwgZnVuY3Rpb24oZXJyLCByZXEsIHJlcywgbmV4dCkge1xuICAgICAgICBsb2cud2FybignY2xlYW51cCByZW5kZXIoKSB3aGVuIGVuY291bnRlcmluZyBlcnJvciBpbiAnLCBjb250ZXh0UGF0aCk7XG4gICAgICAgIGRlbGV0ZSAocmVzIGFzIGFueSkucmVuZGVyO1xuICAgICAgICBuZXh0KGVycik7XG4gICAgICB9IGFzIGV4cHJlc3MuRXJyb3JSZXF1ZXN0SGFuZGxlcik7XG4gICAgfVxuICAgIHNldHVwUm91dGVyLnBhY2thZ2VOYW1lID0gc2VsZi5wYWNrYWdlTmFtZTtcbiAgICAvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgYmVcbiAgICAvLyBjYWNoZWQgaW4gYXJyYXkgYW5kIGV4ZWN1dGVkIGxhdGVyLlxuICAgIC8vIFRodXMgc2F2ZSBjdXJyZW50IHN0YWNrIGZvciBsYXRlciBkZWJ1Zy5cbiAgICBzZXR1cFJvdXRlci5zdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrO1xuICAgIHJvdXRlclNldHVwRnVuY3MucHVzaChzZXR1cFJvdXRlcik7XG5cbiAgICBmdW5jdGlvbiBjdXN0b21pemVkUmVuZGVyKCkge1xuICAgICAgbGV0IGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICBpZiAoYXJndW1lbnRzWzBdLmVuZHNXaXRoKCdfZHJjcC1leHByZXNzLWVycm9yLmh0bWwnKSlcbiAgICAgICAgcmV0dXJuIG9sZFJlbmRlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIGVsc2UgaWYgKF8uc3RhcnRzV2l0aChhcmdzWzBdLCAnLycpKSB7XG4gICAgICAgIGFyZ3NbMF0gPSBhcmdzWzBdLnN1YnN0cmluZygxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFyZ3NbMF0gPSBwYWNrYWdlUmVsUGF0aCArIGFyZ3VtZW50c1swXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9sZFJlbmRlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcm91dGVyO1xuICB9O1xuXG4gIC8qKlxuXHQgKiBzZXQgYW4gZXhwcmVzcyBtaWRkbGV3YXJlXG5cdCAqIHNhbWUgYXMgY2FsbGluZyBgYXBwLnVzZSgnL29wdGlvbmFsLXBhdGgnLCBtaWRkbGV3YXJlKWBcblx0ICogTWlkZGxld2FyZSBpcyBhbHdheXMgcmVnaXN0ZXJlZCBiZWZvcmUgcm91dGVycyBnZXR0aW5nIHJlZ2lzdGVyZWQsIHNvIGVhY2hcblx0ICogcmVxdWVzdCB3aWxsIHBhc3MgdGhyb3VnaCBtaWRkbGV3YXJlIHByaW9yIHRvIHJvdXRlcnMuXG5cdCAqL1xuICBbJ3VzZScsXG4gIC8qKlxuXHQgKiBzYW1lIGFzIGNhbGxpbmcgYGFwcC5wYXJhbSgnL29wdGlvbmFsLXBhdGgnLCBtaWRkbGV3YXJlKWBcblx0ICovXG4gICAgJ3BhcmFtJ10uZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICBhcGlQcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKF94OiBhbnkpIHtcbiAgICAgIGxldCBhcmdzID0gW10uc2xpY2UuYXBwbHkoYXJndW1lbnRzKTtcbiAgICAgIGZ1bmN0aW9uIHNldHVwTWlkZGxld2FyZShhcHA6IEFwcGxpY2F0aW9uKSB7XG4gICAgICAgIGFwcFttZXRob2RdLmFwcGx5KGFwcCwgYXJncyk7XG4gICAgICB9XG4gICAgICBzZXR1cE1pZGRsZXdhcmUucGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICAgICAgLy8gdGhpcyBmdW5jdGlvbiB3aWxsIGJlXG4gICAgICAvLyBjYWNoZWQgaW4gYXJyYXkgYW5kIGV4ZWN1dGVkIGxhdGVyLCB0aGUgY3VycmVudCBzdGFjayBpbmZvcm1hdGlvblxuICAgICAgLy8gd29uJ3QgYmUgc2hvd24gaWYgdGhlcmUgaXMgZXJyb3IgaW4gbGF0ZXIgZXhlY3V0aW9uIHByb2dyZXNzLlxuICAgICAgLy8gVGh1cyBzYXZlIGN1cnJlbnQgc3RhY2sgZm9yIGxhdGVyIGRlYnVnLlxuICAgICAgc2V0dXBNaWRkbGV3YXJlLnN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s7XG4gICAgICByb3V0ZXJTZXR1cEZ1bmNzLnB1c2goc2V0dXBNaWRkbGV3YXJlKTtcbiAgICB9O1xuICB9KTtcblxuICAvKipcblx0ICogQ2FsbGJhY2sgZnVuY3Rpb25zIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGV4cHJlc3MgYXBwIGJlaW5nIGNyZWF0ZWRcblx0ICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uKGFwcCwgZXhwcmVzcylcblx0ICogZS5nLlxuXHQgKiBcdGFwaS5leHByZXNzQXBwU2V0KChhcHAsIGV4cHJlc3MpID0+IHtcbiBcdCAqIFx0XHRhcHAuc2V0KCd0cnVzdCBwcm94eScsIHRydWUpO1xuIFx0ICogXHRcdGFwcC5zZXQoJ3ZpZXdzJywgUGF0aC5yZXNvbHZlKGFwaS5jb25maWcoKS5yb290UGF0aCwgJy4uL3dlYi92aWV3cy8nKSk7XG4gXHQgKiBcdH0pO1xuXHQgKiBAcmV0dXJuIHZvaWRcblx0ICovXG4gIGFwaVByb3RvdHlwZS5leHByZXNzQXBwU2V0ID0gKGNhbGxiYWNrKSA9PiBhcHBTZXRzLnB1c2goY2FsbGJhY2spO1xuICBhcGlQcm90b3R5cGUuZXhwcmVzc0FwcFVzZSA9IChjYWxsYmFjaykgPT4gcm91dGVyU2V0dXBGdW5jcy5wdXNoKGNhbGxiYWNrKTtcbiAgLyoqXG5cdCAqIGUuZy5cblx0ICogXHRhcGkucm91dGVyKCkub3B0aW9ucygnL2FwaScsIGFwaS5jb3JzKCkpO1xuXHQgKiBcdGFwaS5yb3V0ZXIoKS5nZXQoJy9hcGknLCBhcGkuY29ycygpKTtcblx0ICogT3Jcblx0ICogIGFwaS5yb3V0ZXIoKS51c2UoJy9hcGknLCBhcGkuY29ycygpKTtcblx0ICogQHJldHVybiB2b2lkXG5cdCAqL1xuICBhcGlQcm90b3R5cGUuY29ycyA9IGZ1bmN0aW9uKGFsbG93ZWRPcmlnaW5zPzogc3RyaW5nW10pIHtcbiAgICBjb25zdCBzZXR0aW5nID0gYXBpLmNvbmZpZygpWydAd2ZoL2V4cHJlc3MtYXBwJ107XG4gICAgbGV0IGNvcnNPcHQgPSBzZXR0aW5nPy5lbmFibGVDT1JTO1xuICAgIGNvbnN0IGNvcnMgPSByZXF1aXJlKCdjb3JzJykgYXMgdHlwZW9mIF9jb3JzO1xuICAgIGNvbnN0IHdoaXRlT3JpZ2luU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgaWYgKF8uaXNBcnJheShjb3JzT3B0KSkge1xuICAgICAgY29yc09wdC5mb3JFYWNoKGRvbWFpbiA9PiB3aGl0ZU9yaWdpblNldC5hZGQoZG9tYWluKSk7XG4gICAgfVxuICAgIGxldCBjb3JzT3B0aW9uczogX2NvcnMuQ29yc09wdGlvbnM7XG4gICAgaWYgKGFsbG93ZWRPcmlnaW5zKSB7XG4gICAgICBjb3JzT3B0aW9ucyA9IHtcbiAgICAgICAgb3JpZ2luOiBhbGxvd2VkT3JpZ2lucyxcbiAgICAgICAgY3JlZGVudGlhbHM6IHRydWVcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvcnNPcHRpb25zID0ge1xuICAgICAgICAvLyBvcmlnaW46IFsnaHR0cDovL2xvY2FsaG9zdDoxNDMzMyddLFxuICAgICAgICBvcmlnaW4ob3JpZ2luOiBzdHJpbmcsIGNhbGxiYWNrOiAoX2FyZzogYW55LCBwYXNzOiBib29sZWFuKSA9PiB2b2lkKSB7XG4gICAgICAgICAgbGV0IHBhc3MgPSBvcmlnaW4gPT0gbnVsbCB8fCBjb3JzT3B0ID09PSB0cnVlIHx8IHdoaXRlT3JpZ2luU2V0LmhhcyhvcmlnaW4pO1xuICAgICAgICAgIGNhbGxiYWNrKHBhc3MgPyBudWxsIDoge3N0YXR1czogNDAwLCBtZXNzYWdlOiAnQmFkIFJlcXVlc3QgKENPUlMpIGZvciBvcmlnaW46ICcgKyBvcmlnaW59LFxuICAgICAgICAgICAgcGFzcyk7XG4gICAgICAgICAgaWYgKCFwYXNzKVxuICAgICAgICAgICAgbG9nLmluZm8oJ0NPUlMgcmVxdWVzdCBibG9ja2VkIGZvciBvcmlnaW46ICcgKyBvcmlnaW4pO1xuICAgICAgICB9LFxuICAgICAgICBjcmVkZW50aWFsczogdHJ1ZVxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGNvcnMoY29yc09wdGlvbnMpO1xuICB9O1xufVxuXG4iXX0=