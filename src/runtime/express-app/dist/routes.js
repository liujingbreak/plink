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
var log = require('log4js').getLogger(__api_1.default.packageName + '.setApi');
var swig = require('swig-templates');
var routerSetupFuncs = [];
// var middlewares = [];
var appSets = [];
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
    var apiPrototype = Object.getPrototypeOf(api);
    apiPrototype.express = express_1.default;
    apiPrototype.expressApp = app;
    apiPrototype.swig = swig;
    /**
       * setup a router under package context path
       * same as app.use('/<package-path>', router);
       * @return {[type]} [description]
       */
    apiPrototype.router = function () {
        var self = this;
        var calleePackageName = this.packageName;
        if (self._router) {
            return self._router;
        }
        var router = self._router = express_1.default.Router();
        var contextPath = self.contextPath;
        console.log(self.config().rootPath, self.packageInstance.path);
        var packageRelPath = path_1.default.relative(self.config().rootPath, self.packageInstance.path);
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
            var args = [].slice.call(arguments);
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
            var args = [].slice.apply(arguments);
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
        const setting = api.config();
        let corsOpt = lodash_1.default.get(setting, api.packageShortName + '-enableCORS') || lodash_1.default.get(setting, 'enableCORS');
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
                    var pass = origin == null || corsOpt === true || whiteOriginSet.has(origin);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicm91dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLHNEQUE2QztBQUM3QyxrREFBbUM7QUFDbkMsb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUd4QixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFDbkUsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFPckMsSUFBSSxnQkFBZ0IsR0FBd0IsRUFBRSxDQUFDO0FBQy9DLHdCQUF3QjtBQUN4QixJQUFJLE9BQU8sR0FBd0IsRUFBRSxDQUFDO0FBR3RDLFNBQWdCLDJCQUEyQixDQUFDLEdBQWdCO0lBQzFELGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFTLFNBQVM7UUFDekMsSUFBSTtZQUNGLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBQzlELFNBQVMsQ0FBQyxHQUFHLEVBQUUsaUJBQU8sQ0FBQyxDQUFDO1NBQ3pCO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsV0FBVyxHQUFHLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5RCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxpQ0FBaUM7SUFDakMsb0RBQW9EO0FBQ3RELENBQUM7QUFaRCxrRUFZQztBQUVELFNBQWdCLDZCQUE2QixDQUFDLEdBQWdCO0lBQzVELE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDekIsUUFBUSxDQUFDLEdBQUcsRUFBRSxpQkFBTyxDQUFDLENBQUM7SUFDekIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBSkQs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QUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztTQUN2RDtRQUNELElBQUksV0FBOEIsQ0FBQztRQUNuQyxJQUFJLGNBQWMsRUFBRTtZQUNsQixXQUFXLEdBQUc7Z0JBQ1osTUFBTSxFQUFFLGNBQWM7Z0JBQ3RCLFdBQVcsRUFBRSxJQUFJO2FBQ2xCLENBQUM7U0FDSDthQUFNO1lBQ0wsV0FBVyxHQUFHO2dCQUNaLHNDQUFzQztnQkFDdEMsTUFBTSxDQUFDLE1BQWMsRUFBRSxRQUE0QztvQkFDakUsSUFBSSxJQUFJLEdBQUcsTUFBTSxJQUFJLElBQUksSUFBSSxPQUFPLEtBQUssSUFBSSxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzVFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxpQ0FBaUMsR0FBRyxNQUFNLEVBQUMsRUFDdkYsSUFBSSxDQUFDLENBQUM7b0JBQ1IsSUFBSSxDQUFDLElBQUk7d0JBQ1AsR0FBRyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsR0FBRyxNQUFNLENBQUMsQ0FBQztnQkFDM0QsQ0FBQztnQkFDRCxXQUFXLEVBQUUsSUFBSTthQUNsQixDQUFDO1NBQ0g7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUM7QUFDSixDQUFDO0FBbkpELDRCQW1KQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBleHByZXNzLCB7QXBwbGljYXRpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGFwaSwge0RyY3BBcGl9IGZyb20gJ19fYXBpJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfY29ycyBmcm9tICdjb3JzJztcblxudmFyIGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnNldEFwaScpO1xudmFyIHN3aWcgPSByZXF1aXJlKCdzd2lnLXRlbXBsYXRlcycpO1xuXG5pbnRlcmZhY2UgUm91dGVyRGVmQ2FsbGJhY2sge1xuICAoYXBwOiBBcHBsaWNhdGlvbiwgZXhwOiB0eXBlb2YgZXhwcmVzcyk6IHZvaWQ7XG4gIHBhY2thZ2VOYW1lPzogc3RyaW5nO1xufVxuXG52YXIgcm91dGVyU2V0dXBGdW5jczogUm91dGVyRGVmQ2FsbGJhY2tbXSA9IFtdO1xuLy8gdmFyIG1pZGRsZXdhcmVzID0gW107XG52YXIgYXBwU2V0czogUm91dGVyRGVmQ2FsbGJhY2tbXSA9IFtdO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQYWNrYWdlRGVmaW5lZFJvdXRlcnMoYXBwOiBBcHBsaWNhdGlvbikge1xuICByb3V0ZXJTZXR1cEZ1bmNzLmZvckVhY2goZnVuY3Rpb24ocm91dGVyRGVmKSB7XG4gICAgdHJ5IHtcbiAgICAgIGxvZy5kZWJ1Zyhyb3V0ZXJEZWYucGFja2FnZU5hbWUsICdkZWZpbmVzIHJvdXRlci9taWRkbGV3YXJlJyk7XG4gICAgICByb3V0ZXJEZWYoYXBwLCBleHByZXNzKTtcbiAgICB9IGNhdGNoIChlcikge1xuICAgICAgbG9nLmVycm9yKCdwYWNrYWdlICcgKyByb3V0ZXJEZWYucGFja2FnZU5hbWUgKyAnIHJvdXRlcicsIGVyKTtcbiAgICAgIHRocm93IGVyO1xuICAgIH1cbiAgfSk7XG4gIC8vIGFwcC51c2UocmV2ZXJ0UmVuZGVyRnVuY3Rpb24pO1xuICAvLyBhcHAudXNlKHJldmVydFJlbmRlckZ1bmN0aW9uRm9yRXJyb3IpOy8vaW1wb3J0YW50XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhY2thZ2VEZWZpbmVkQXBwU2V0dGluZyhhcHA6IEFwcGxpY2F0aW9uKSB7XG4gIGFwcFNldHMuZm9yRWFjaChjYWxsYmFjayA9PiB7XG4gICAgY2FsbGJhY2soYXBwLCBleHByZXNzKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEFwaShhcGk6IERyY3BBcGksIGFwcDogQXBwbGljYXRpb24pIHtcbiAgdmFyIGFwaVByb3RvdHlwZTogRHJjcEFwaSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpO1xuICBhcGlQcm90b3R5cGUuZXhwcmVzcyA9IGV4cHJlc3M7XG4gIGFwaVByb3RvdHlwZS5leHByZXNzQXBwID0gYXBwO1xuICBhcGlQcm90b3R5cGUuc3dpZyA9IHN3aWc7XG5cbiAgLyoqXG5cdCAqIHNldHVwIGEgcm91dGVyIHVuZGVyIHBhY2thZ2UgY29udGV4dCBwYXRoXG5cdCAqIHNhbWUgYXMgYXBwLnVzZSgnLzxwYWNrYWdlLXBhdGg+Jywgcm91dGVyKTtcblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuICBhcGlQcm90b3R5cGUucm91dGVyID0gZnVuY3Rpb24odGhpczogdHlwZW9mIGFwaSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgY2FsbGVlUGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICAgIGlmIChzZWxmLl9yb3V0ZXIpIHtcbiAgICAgIHJldHVybiBzZWxmLl9yb3V0ZXI7XG4gICAgfVxuICAgIHZhciByb3V0ZXIgPSBzZWxmLl9yb3V0ZXIgPSBleHByZXNzLlJvdXRlcigpO1xuICAgIHZhciBjb250ZXh0UGF0aCA9IHNlbGYuY29udGV4dFBhdGg7XG4gICAgY29uc29sZS5sb2coc2VsZi5jb25maWcoKS5yb290UGF0aCwgc2VsZi5wYWNrYWdlSW5zdGFuY2UucGF0aCk7XG4gICAgdmFyIHBhY2thZ2VSZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShzZWxmLmNvbmZpZygpLnJvb3RQYXRoLCBzZWxmLnBhY2thZ2VJbnN0YW5jZS5wYXRoKTtcbiAgICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgcGFja2FnZVJlbFBhdGggPSBwYWNrYWdlUmVsUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgfVxuICAgIGxvZy5kZWJ1ZygncGFja2FnZSByZWxhdGl2ZSBwYXRoOiAnICsgcGFja2FnZVJlbFBhdGgpO1xuICAgIHBhY2thZ2VSZWxQYXRoICs9ICcvJztcbiAgICBsZXQgb2xkUmVuZGVyOiBleHByZXNzLlJlc3BvbnNlWydyZW5kZXInXTtcbiAgICBmdW5jdGlvbiBzZXR1cFJvdXRlcihhcHA6IEFwcGxpY2F0aW9uKSB7XG4gICAgICBhcHAudXNlKGNvbnRleHRQYXRoLCBmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuICAgICAgICBsb2cuZGVidWcoJ0luIHBhY2thZ2UnLCBjYWxsZWVQYWNrYWdlTmFtZSwgc2VsZi5wYWNrYWdlTmFtZSwgJ21pZGRsZXdhcmUgY3VzdG9taXplZCByZXMucmVuZGVyJyk7XG4gICAgICAgIGlmICghb2xkUmVuZGVyKVxuICAgICAgICAgIG9sZFJlbmRlciA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihyZXMpLnJlbmRlcjtcbiAgICAgICAgcmVzLnJlbmRlciA9IGN1c3RvbWl6ZWRSZW5kZXI7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgICAgLy8gbG9nLmRlYnVnKHNlbGYucGFja2FnZU5hbWUgKyAnOiBhcHAudXNlIGNvbnRleHQgcGF0aCA9ICcgKyBjb250ZXh0UGF0aCk7XG4gICAgICBhcHAudXNlKGNvbnRleHRQYXRoLCByb3V0ZXIpO1xuICAgICAgYXBwLnVzZShjb250ZXh0UGF0aCwgZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgZGVsZXRlIChyZXMgYXMgYW55KS5yZW5kZXI7XG4gICAgICAgIGxvZy5kZWJ1ZygnT3V0IHBhY2thZ2UnLCBjYWxsZWVQYWNrYWdlTmFtZSwgc2VsZi5wYWNrYWdlTmFtZSwgJ2NsZWFudXAgY3VzdG9taXplZCByZXMucmVuZGVyJyk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgICAgLy8gSWYgYW4gZXJyb3IgZW5jb3VudGVyZWQgaW4gcHJldmlvdXMgbWlkZGxld2FyZXMsIHdlIHN0aWxsIG5lZWQgdG8gY2xlYW51cCByZW5kZXIgbWV0aG9kXG4gICAgICBhcHAudXNlKGNvbnRleHRQYXRoLCBmdW5jdGlvbihlcnIsIHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIGxvZy53YXJuKCdjbGVhbnVwIHJlbmRlcigpIHdoZW4gZW5jb3VudGVyaW5nIGVycm9yIGluICcsIGNvbnRleHRQYXRoKTtcbiAgICAgICAgZGVsZXRlIChyZXMgYXMgYW55KS5yZW5kZXI7XG4gICAgICAgIG5leHQoZXJyKTtcbiAgICAgIH0gYXMgZXhwcmVzcy5FcnJvclJlcXVlc3RIYW5kbGVyKTtcbiAgICB9XG4gICAgc2V0dXBSb3V0ZXIucGFja2FnZU5hbWUgPSBzZWxmLnBhY2thZ2VOYW1lO1xuICAgIC8vIHRoaXMgZnVuY3Rpb24gd2lsbCBiZVxuICAgIC8vIGNhY2hlZCBpbiBhcnJheSBhbmQgZXhlY3V0ZWQgbGF0ZXIuXG4gICAgLy8gVGh1cyBzYXZlIGN1cnJlbnQgc3RhY2sgZm9yIGxhdGVyIGRlYnVnLlxuICAgIHNldHVwUm91dGVyLnN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s7XG4gICAgcm91dGVyU2V0dXBGdW5jcy5wdXNoKHNldHVwUm91dGVyKTtcblxuICAgIGZ1bmN0aW9uIGN1c3RvbWl6ZWRSZW5kZXIoKSB7XG4gICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uZW5kc1dpdGgoJ19kcmNwLWV4cHJlc3MtZXJyb3IuaHRtbCcpKVxuICAgICAgICByZXR1cm4gb2xkUmVuZGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgZWxzZSBpZiAoXy5zdGFydHNXaXRoKGFyZ3NbMF0sICcvJykpIHtcbiAgICAgICAgYXJnc1swXSA9IGFyZ3NbMF0uc3Vic3RyaW5nKDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXJnc1swXSA9IHBhY2thZ2VSZWxQYXRoICsgYXJndW1lbnRzWzBdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2xkUmVuZGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cblxuICAgIHJldHVybiByb3V0ZXI7XG4gIH07XG5cbiAgLyoqXG5cdCAqIHNldCBhbiBleHByZXNzIG1pZGRsZXdhcmVcblx0ICogc2FtZSBhcyBjYWxsaW5nIGBhcHAudXNlKCcvb3B0aW9uYWwtcGF0aCcsIG1pZGRsZXdhcmUpYFxuXHQgKiBNaWRkbGV3YXJlIGlzIGFsd2F5cyByZWdpc3RlcmVkIGJlZm9yZSByb3V0ZXJzIGdldHRpbmcgcmVnaXN0ZXJlZCwgc28gZWFjaFxuXHQgKiByZXF1ZXN0IHdpbGwgcGFzcyB0aHJvdWdoIG1pZGRsZXdhcmUgcHJpb3IgdG8gcm91dGVycy5cblx0ICovXG4gIFsndXNlJyxcbiAgLyoqXG5cdCAqIHNhbWUgYXMgY2FsbGluZyBgYXBwLnBhcmFtKCcvb3B0aW9uYWwtcGF0aCcsIG1pZGRsZXdhcmUpYFxuXHQgKi9cbiAgICAncGFyYW0nXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIGFwaVByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24oX3g6IGFueSkge1xuICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5hcHBseShhcmd1bWVudHMpO1xuICAgICAgZnVuY3Rpb24gc2V0dXBNaWRkbGV3YXJlKGFwcDogQXBwbGljYXRpb24pIHtcbiAgICAgICAgYXBwW21ldGhvZF0uYXBwbHkoYXBwLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHNldHVwTWlkZGxld2FyZS5wYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gICAgICAvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgYmVcbiAgICAgIC8vIGNhY2hlZCBpbiBhcnJheSBhbmQgZXhlY3V0ZWQgbGF0ZXIsIHRoZSBjdXJyZW50IHN0YWNrIGluZm9ybWF0aW9uXG4gICAgICAvLyB3b24ndCBiZSBzaG93biBpZiB0aGVyZSBpcyBlcnJvciBpbiBsYXRlciBleGVjdXRpb24gcHJvZ3Jlc3MuXG4gICAgICAvLyBUaHVzIHNhdmUgY3VycmVudCBzdGFjayBmb3IgbGF0ZXIgZGVidWcuXG4gICAgICBzZXR1cE1pZGRsZXdhcmUuc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcbiAgICAgIHJvdXRlclNldHVwRnVuY3MucHVzaChzZXR1cE1pZGRsZXdhcmUpO1xuICAgIH07XG4gIH0pO1xuXG4gIC8qKlxuXHQgKiBDYWxsYmFjayBmdW5jdGlvbnMgd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgZXhwcmVzcyBhcHAgYmVpbmcgY3JlYXRlZFxuXHQgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgZnVuY3Rpb24oYXBwLCBleHByZXNzKVxuXHQgKiBlLmcuXG5cdCAqIFx0YXBpLmV4cHJlc3NBcHBTZXQoKGFwcCwgZXhwcmVzcykgPT4ge1xuIFx0ICogXHRcdGFwcC5zZXQoJ3RydXN0IHByb3h5JywgdHJ1ZSk7XG4gXHQgKiBcdFx0YXBwLnNldCgndmlld3MnLCBQYXRoLnJlc29sdmUoYXBpLmNvbmZpZygpLnJvb3RQYXRoLCAnLi4vd2ViL3ZpZXdzLycpKTtcbiBcdCAqIFx0fSk7XG5cdCAqIEByZXR1cm4gdm9pZFxuXHQgKi9cbiAgYXBpUHJvdG90eXBlLmV4cHJlc3NBcHBTZXQgPSAoY2FsbGJhY2spID0+IGFwcFNldHMucHVzaChjYWxsYmFjayk7XG4gIGFwaVByb3RvdHlwZS5leHByZXNzQXBwVXNlID0gKGNhbGxiYWNrKSA9PiByb3V0ZXJTZXR1cEZ1bmNzLnB1c2goY2FsbGJhY2spO1xuICAvKipcblx0ICogZS5nLlxuXHQgKiBcdGFwaS5yb3V0ZXIoKS5vcHRpb25zKCcvYXBpJywgYXBpLmNvcnMoKSk7XG5cdCAqIFx0YXBpLnJvdXRlcigpLmdldCgnL2FwaScsIGFwaS5jb3JzKCkpO1xuXHQgKiBPclxuXHQgKiAgYXBpLnJvdXRlcigpLnVzZSgnL2FwaScsIGFwaS5jb3JzKCkpO1xuXHQgKiBAcmV0dXJuIHZvaWRcblx0ICovXG4gIGFwaVByb3RvdHlwZS5jb3JzID0gZnVuY3Rpb24oYWxsb3dlZE9yaWdpbnM/OiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHNldHRpbmcgPSBhcGkuY29uZmlnKCk7XG4gICAgbGV0IGNvcnNPcHQgPSBfLmdldChzZXR0aW5nLCBhcGkucGFja2FnZVNob3J0TmFtZSArICctZW5hYmxlQ09SUycpIHx8IF8uZ2V0KHNldHRpbmcsICdlbmFibGVDT1JTJyk7XG4gICAgY29uc3QgY29ycyA9IHJlcXVpcmUoJ2NvcnMnKSBhcyB0eXBlb2YgX2NvcnM7XG4gICAgY29uc3Qgd2hpdGVPcmlnaW5TZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBpZiAoXy5pc0FycmF5KGNvcnNPcHQpKSB7XG4gICAgICBjb3JzT3B0LmZvckVhY2goZG9tYWluID0+IHdoaXRlT3JpZ2luU2V0LmFkZChkb21haW4pKTtcbiAgICB9XG4gICAgbGV0IGNvcnNPcHRpb25zOiBfY29ycy5Db3JzT3B0aW9ucztcbiAgICBpZiAoYWxsb3dlZE9yaWdpbnMpIHtcbiAgICAgIGNvcnNPcHRpb25zID0ge1xuICAgICAgICBvcmlnaW46IGFsbG93ZWRPcmlnaW5zLFxuICAgICAgICBjcmVkZW50aWFsczogdHJ1ZVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29yc09wdGlvbnMgPSB7XG4gICAgICAgIC8vIG9yaWdpbjogWydodHRwOi8vbG9jYWxob3N0OjE0MzMzJ10sXG4gICAgICAgIG9yaWdpbihvcmlnaW46IHN0cmluZywgY2FsbGJhY2s6IChfYXJnOiBhbnksIHBhc3M6IGJvb2xlYW4pID0+IHZvaWQpIHtcbiAgICAgICAgICB2YXIgcGFzcyA9IG9yaWdpbiA9PSBudWxsIHx8IGNvcnNPcHQgPT09IHRydWUgfHwgd2hpdGVPcmlnaW5TZXQuaGFzKG9yaWdpbik7XG4gICAgICAgICAgY2FsbGJhY2socGFzcyA/IG51bGwgOiB7c3RhdHVzOiA0MDAsIG1lc3NhZ2U6ICdCYWQgUmVxdWVzdCAoQ09SUykgZm9yIG9yaWdpbjogJyArIG9yaWdpbn0sXG4gICAgICAgICAgICBwYXNzKTtcbiAgICAgICAgICBpZiAoIXBhc3MpXG4gICAgICAgICAgICBsb2cuaW5mbygnQ09SUyByZXF1ZXN0IGJsb2NrZWQgZm9yIG9yaWdpbjogJyArIG9yaWdpbik7XG4gICAgICAgIH0sXG4gICAgICAgIGNyZWRlbnRpYWxzOiB0cnVlXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gY29ycyhjb3JzT3B0aW9ucyk7XG4gIH07XG59XG5cbiJdfQ==