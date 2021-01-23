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
    apiPrototype.cors = function () {
        var setting = api.config();
        var corsOpt = lodash_1.default.get(setting, api.packageShortName + '-enableCORS') || lodash_1.default.get(setting, 'enableCORS');
        var cors = require('cors');
        var whiteOriginSet = {};
        if (lodash_1.default.isArray(corsOpt)) {
            corsOpt.forEach(domain => whiteOriginSet[domain] = true);
        }
        var corsOptions = {
            origin(origin, callback) {
                var pass = origin == null || corsOpt === true || lodash_1.default.has(whiteOriginSet, origin);
                callback(pass ? null : { status: 400, message: 'Bad Request (CORS) for origin: ' + origin }, pass);
                if (!pass)
                    log.info('CORS request blocked for origin: ' + origin);
            },
            credentials: true
        };
        return cors(corsOptions);
    };
}
exports.setupApi = setupApi;
// function revertRenderFunction(req, res, next) {
// 	log.trace('release hijacked res.render()');
// 	if (res.__origRender) {
// 		res.render = res.__origRender;
// 		delete res.__origRender;
// 	}
// 	next();
// }
// function revertRenderFunctionForError(err, req, res, next) {
// 	log.trace('encounter error, release hijacked res.render()');
// 	if (res.__origRender) {
// 		res.render = res.__origRender;
// 		delete res.__origRender;
// 	}
// 	next(err);
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicm91dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLHNEQUE2QztBQUM3QyxrREFBbUM7QUFDbkMsb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUV4QixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFDbkUsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFPckMsSUFBSSxnQkFBZ0IsR0FBd0IsRUFBRSxDQUFDO0FBQy9DLHdCQUF3QjtBQUN4QixJQUFJLE9BQU8sR0FBd0IsRUFBRSxDQUFDO0FBR3RDLFNBQWdCLDJCQUEyQixDQUFDLEdBQWdCO0lBQzFELGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFTLFNBQVM7UUFDekMsSUFBSTtZQUNGLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBQzlELFNBQVMsQ0FBQyxHQUFHLEVBQUUsaUJBQU8sQ0FBQyxDQUFDO1NBQ3pCO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsV0FBVyxHQUFHLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5RCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxpQ0FBaUM7SUFDakMsb0RBQW9EO0FBQ3RELENBQUM7QUFaRCxrRUFZQztBQUVELFNBQWdCLDZCQUE2QixDQUFDLEdBQWdCO0lBQzVELE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDekIsUUFBUSxDQUFDLEdBQUcsRUFBRSxpQkFBTyxDQUFDLENBQUM7SUFDekIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBSkQs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QWMsRUFBRSxRQUE0QztnQkFDakUsSUFBSSxJQUFJLEdBQUcsTUFBTSxJQUFJLElBQUksSUFBSSxPQUFPLEtBQUssSUFBSSxJQUFJLGdCQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDL0UsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLGlDQUFpQyxHQUFHLE1BQU0sRUFBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNqRyxJQUFJLENBQUMsSUFBSTtvQkFDUCxHQUFHLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO1lBQzNELENBQUM7WUFDRCxXQUFXLEVBQUUsSUFBSTtTQUNsQixDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXhJRCw0QkF3SUM7QUFFRCxrREFBa0Q7QUFDbEQsK0NBQStDO0FBQy9DLDJCQUEyQjtBQUMzQixtQ0FBbUM7QUFDbkMsNkJBQTZCO0FBQzdCLEtBQUs7QUFDTCxXQUFXO0FBQ1gsSUFBSTtBQUVKLCtEQUErRDtBQUMvRCxnRUFBZ0U7QUFDaEUsMkJBQTJCO0FBQzNCLG1DQUFtQztBQUNuQyw2QkFBNkI7QUFDN0IsS0FBSztBQUNMLGNBQWM7QUFDZCxJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGV4cHJlc3MsIHtBcHBsaWNhdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgYXBpLCB7RHJjcEFwaX0gZnJvbSAnX19hcGknO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG52YXIgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuc2V0QXBpJyk7XG52YXIgc3dpZyA9IHJlcXVpcmUoJ3N3aWctdGVtcGxhdGVzJyk7XG5cbmludGVyZmFjZSBSb3V0ZXJEZWZDYWxsYmFjayB7XG4gIChhcHA6IEFwcGxpY2F0aW9uLCBleHA6IHR5cGVvZiBleHByZXNzKTogdm9pZDtcbiAgcGFja2FnZU5hbWU/OiBzdHJpbmc7XG59XG5cbnZhciByb3V0ZXJTZXR1cEZ1bmNzOiBSb3V0ZXJEZWZDYWxsYmFja1tdID0gW107XG4vLyB2YXIgbWlkZGxld2FyZXMgPSBbXTtcbnZhciBhcHBTZXRzOiBSb3V0ZXJEZWZDYWxsYmFja1tdID0gW107XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VEZWZpbmVkUm91dGVycyhhcHA6IEFwcGxpY2F0aW9uKSB7XG4gIHJvdXRlclNldHVwRnVuY3MuZm9yRWFjaChmdW5jdGlvbihyb3V0ZXJEZWYpIHtcbiAgICB0cnkge1xuICAgICAgbG9nLmRlYnVnKHJvdXRlckRlZi5wYWNrYWdlTmFtZSwgJ2RlZmluZXMgcm91dGVyL21pZGRsZXdhcmUnKTtcbiAgICAgIHJvdXRlckRlZihhcHAsIGV4cHJlc3MpO1xuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBsb2cuZXJyb3IoJ3BhY2thZ2UgJyArIHJvdXRlckRlZi5wYWNrYWdlTmFtZSArICcgcm91dGVyJywgZXIpO1xuICAgICAgdGhyb3cgZXI7XG4gICAgfVxuICB9KTtcbiAgLy8gYXBwLnVzZShyZXZlcnRSZW5kZXJGdW5jdGlvbik7XG4gIC8vIGFwcC51c2UocmV2ZXJ0UmVuZGVyRnVuY3Rpb25Gb3JFcnJvcik7Ly9pbXBvcnRhbnRcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nKGFwcDogQXBwbGljYXRpb24pIHtcbiAgYXBwU2V0cy5mb3JFYWNoKGNhbGxiYWNrID0+IHtcbiAgICBjYWxsYmFjayhhcHAsIGV4cHJlc3MpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwQXBpKGFwaTogRHJjcEFwaSwgYXBwOiBBcHBsaWNhdGlvbikge1xuICB2YXIgYXBpUHJvdG90eXBlOiBEcmNwQXBpID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSk7XG4gIGFwaVByb3RvdHlwZS5leHByZXNzID0gZXhwcmVzcztcbiAgYXBpUHJvdG90eXBlLmV4cHJlc3NBcHAgPSBhcHA7XG4gIGFwaVByb3RvdHlwZS5zd2lnID0gc3dpZztcblxuICAvKipcblx0ICogc2V0dXAgYSByb3V0ZXIgdW5kZXIgcGFja2FnZSBjb250ZXh0IHBhdGhcblx0ICogc2FtZSBhcyBhcHAudXNlKCcvPHBhY2thZ2UtcGF0aD4nLCByb3V0ZXIpO1xuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG4gIGFwaVByb3RvdHlwZS5yb3V0ZXIgPSBmdW5jdGlvbih0aGlzOiB0eXBlb2YgYXBpKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBjYWxsZWVQYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gICAgaWYgKHNlbGYuX3JvdXRlcikge1xuICAgICAgcmV0dXJuIHNlbGYuX3JvdXRlcjtcbiAgICB9XG4gICAgdmFyIHJvdXRlciA9IHNlbGYuX3JvdXRlciA9IGV4cHJlc3MuUm91dGVyKCk7XG4gICAgdmFyIGNvbnRleHRQYXRoID0gc2VsZi5jb250ZXh0UGF0aDtcbiAgICB2YXIgcGFja2FnZVJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHNlbGYuY29uZmlnKCkucm9vdFBhdGgsIHNlbGYucGFja2FnZUluc3RhbmNlLnBhdGgpO1xuICAgIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG4gICAgICBwYWNrYWdlUmVsUGF0aCA9IHBhY2thZ2VSZWxQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICB9XG4gICAgbG9nLmRlYnVnKCdwYWNrYWdlIHJlbGF0aXZlIHBhdGg6ICcgKyBwYWNrYWdlUmVsUGF0aCk7XG4gICAgcGFja2FnZVJlbFBhdGggKz0gJy8nO1xuICAgIGxldCBvbGRSZW5kZXI6IGV4cHJlc3MuUmVzcG9uc2VbJ3JlbmRlciddO1xuICAgIGZ1bmN0aW9uIHNldHVwUm91dGVyKGFwcDogQXBwbGljYXRpb24pIHtcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnSW4gcGFja2FnZScsIGNhbGxlZVBhY2thZ2VOYW1lLCBzZWxmLnBhY2thZ2VOYW1lLCAnbWlkZGxld2FyZSBjdXN0b21pemVkIHJlcy5yZW5kZXInKTtcbiAgICAgICAgaWYgKCFvbGRSZW5kZXIpXG4gICAgICAgICAgb2xkUmVuZGVyID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHJlcykucmVuZGVyO1xuICAgICAgICByZXMucmVuZGVyID0gY3VzdG9taXplZFJlbmRlcjtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSk7XG4gICAgICAvLyBsb2cuZGVidWcoc2VsZi5wYWNrYWdlTmFtZSArICc6IGFwcC51c2UgY29udGV4dCBwYXRoID0gJyArIGNvbnRleHRQYXRoKTtcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIHJvdXRlcik7XG4gICAgICBhcHAudXNlKGNvbnRleHRQYXRoLCBmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuICAgICAgICBkZWxldGUgKHJlcyBhcyBhbnkpLnJlbmRlcjtcbiAgICAgICAgbG9nLmRlYnVnKCdPdXQgcGFja2FnZScsIGNhbGxlZVBhY2thZ2VOYW1lLCBzZWxmLnBhY2thZ2VOYW1lLCAnY2xlYW51cCBjdXN0b21pemVkIHJlcy5yZW5kZXInKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSk7XG4gICAgICAvLyBJZiBhbiBlcnJvciBlbmNvdW50ZXJlZCBpbiBwcmV2aW91cyBtaWRkbGV3YXJlcywgd2Ugc3RpbGwgbmVlZCB0byBjbGVhbnVwIHJlbmRlciBtZXRob2RcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIGZ1bmN0aW9uKGVyciwgcmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgbG9nLndhcm4oJ2NsZWFudXAgcmVuZGVyKCkgd2hlbiBlbmNvdW50ZXJpbmcgZXJyb3IgaW4gJywgY29udGV4dFBhdGgpO1xuICAgICAgICBkZWxldGUgKHJlcyBhcyBhbnkpLnJlbmRlcjtcbiAgICAgICAgbmV4dChlcnIpO1xuICAgICAgfSBhcyBleHByZXNzLkVycm9yUmVxdWVzdEhhbmRsZXIpO1xuICAgIH1cbiAgICBzZXR1cFJvdXRlci5wYWNrYWdlTmFtZSA9IHNlbGYucGFja2FnZU5hbWU7XG4gICAgLy8gdGhpcyBmdW5jdGlvbiB3aWxsIGJlXG4gICAgLy8gY2FjaGVkIGluIGFycmF5IGFuZCBleGVjdXRlZCBsYXRlci5cbiAgICAvLyBUaHVzIHNhdmUgY3VycmVudCBzdGFjayBmb3IgbGF0ZXIgZGVidWcuXG4gICAgc2V0dXBSb3V0ZXIuc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcbiAgICByb3V0ZXJTZXR1cEZ1bmNzLnB1c2goc2V0dXBSb3V0ZXIpO1xuXG4gICAgZnVuY3Rpb24gY3VzdG9taXplZFJlbmRlcigpIHtcbiAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgaWYgKGFyZ3VtZW50c1swXS5lbmRzV2l0aCgnX2RyY3AtZXhwcmVzcy1lcnJvci5odG1sJykpXG4gICAgICAgIHJldHVybiBvbGRSZW5kZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICBlbHNlIGlmIChfLnN0YXJ0c1dpdGgoYXJnc1swXSwgJy8nKSkge1xuICAgICAgICBhcmdzWzBdID0gYXJnc1swXS5zdWJzdHJpbmcoMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcmdzWzBdID0gcGFja2FnZVJlbFBhdGggKyBhcmd1bWVudHNbMF07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvbGRSZW5kZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJvdXRlcjtcbiAgfTtcblxuICAvKipcblx0ICogc2V0IGFuIGV4cHJlc3MgbWlkZGxld2FyZVxuXHQgKiBzYW1lIGFzIGNhbGxpbmcgYGFwcC51c2UoJy9vcHRpb25hbC1wYXRoJywgbWlkZGxld2FyZSlgXG5cdCAqIE1pZGRsZXdhcmUgaXMgYWx3YXlzIHJlZ2lzdGVyZWQgYmVmb3JlIHJvdXRlcnMgZ2V0dGluZyByZWdpc3RlcmVkLCBzbyBlYWNoXG5cdCAqIHJlcXVlc3Qgd2lsbCBwYXNzIHRocm91Z2ggbWlkZGxld2FyZSBwcmlvciB0byByb3V0ZXJzLlxuXHQgKi9cbiAgWyd1c2UnLFxuICAvKipcblx0ICogc2FtZSBhcyBjYWxsaW5nIGBhcHAucGFyYW0oJy9vcHRpb25hbC1wYXRoJywgbWlkZGxld2FyZSlgXG5cdCAqL1xuICAgICdwYXJhbSddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgYXBpUHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbihfeDogYW55KSB7XG4gICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmFwcGx5KGFyZ3VtZW50cyk7XG4gICAgICBmdW5jdGlvbiBzZXR1cE1pZGRsZXdhcmUoYXBwOiBBcHBsaWNhdGlvbikge1xuICAgICAgICBhcHBbbWV0aG9kXS5hcHBseShhcHAsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgc2V0dXBNaWRkbGV3YXJlLnBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24gd2lsbCBiZVxuICAgICAgLy8gY2FjaGVkIGluIGFycmF5IGFuZCBleGVjdXRlZCBsYXRlciwgdGhlIGN1cnJlbnQgc3RhY2sgaW5mb3JtYXRpb25cbiAgICAgIC8vIHdvbid0IGJlIHNob3duIGlmIHRoZXJlIGlzIGVycm9yIGluIGxhdGVyIGV4ZWN1dGlvbiBwcm9ncmVzcy5cbiAgICAgIC8vIFRodXMgc2F2ZSBjdXJyZW50IHN0YWNrIGZvciBsYXRlciBkZWJ1Zy5cbiAgICAgIHNldHVwTWlkZGxld2FyZS5zdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrO1xuICAgICAgcm91dGVyU2V0dXBGdW5jcy5wdXNoKHNldHVwTWlkZGxld2FyZSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLyoqXG5cdCAqIENhbGxiYWNrIGZ1bmN0aW9ucyB3aWxsIGJlIGNhbGxlZCBhZnRlciBleHByZXNzIGFwcCBiZWluZyBjcmVhdGVkXG5cdCAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFjayBmdW5jdGlvbihhcHAsIGV4cHJlc3MpXG5cdCAqIGUuZy5cblx0ICogXHRhcGkuZXhwcmVzc0FwcFNldCgoYXBwLCBleHByZXNzKSA9PiB7XG4gXHQgKiBcdFx0YXBwLnNldCgndHJ1c3QgcHJveHknLCB0cnVlKTtcbiBcdCAqIFx0XHRhcHAuc2V0KCd2aWV3cycsIFBhdGgucmVzb2x2ZShhcGkuY29uZmlnKCkucm9vdFBhdGgsICcuLi93ZWIvdmlld3MvJykpO1xuIFx0ICogXHR9KTtcblx0ICogQHJldHVybiB2b2lkXG5cdCAqL1xuICBhcGlQcm90b3R5cGUuZXhwcmVzc0FwcFNldCA9IChjYWxsYmFjaykgPT4gYXBwU2V0cy5wdXNoKGNhbGxiYWNrKTtcbiAgYXBpUHJvdG90eXBlLmV4cHJlc3NBcHBVc2UgPSAoY2FsbGJhY2spID0+IHJvdXRlclNldHVwRnVuY3MucHVzaChjYWxsYmFjayk7XG4gIC8qKlxuXHQgKiBlLmcuXG5cdCAqIFx0YXBpLnJvdXRlcigpLm9wdGlvbnMoJy9hcGknLCBhcGkuY29ycygpKTtcblx0ICogXHRhcGkucm91dGVyKCkuZ2V0KCcvYXBpJywgYXBpLmNvcnMoKSk7XG5cdCAqIE9yXG5cdCAqICBhcGkucm91dGVyKCkudXNlKCcvYXBpJywgYXBpLmNvcnMoKSk7XG5cdCAqIEByZXR1cm4gdm9pZFxuXHQgKi9cbiAgYXBpUHJvdG90eXBlLmNvcnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2V0dGluZyA9IGFwaS5jb25maWcoKTtcbiAgICB2YXIgY29yc09wdCA9IF8uZ2V0KHNldHRpbmcsIGFwaS5wYWNrYWdlU2hvcnROYW1lICsgJy1lbmFibGVDT1JTJykgfHwgXy5nZXQoc2V0dGluZywgJ2VuYWJsZUNPUlMnKTtcbiAgICB2YXIgY29ycyA9IHJlcXVpcmUoJ2NvcnMnKTtcbiAgICB2YXIgd2hpdGVPcmlnaW5TZXQgPSB7fTtcbiAgICBpZiAoXy5pc0FycmF5KGNvcnNPcHQpKSB7XG4gICAgICBjb3JzT3B0LmZvckVhY2goZG9tYWluID0+IHdoaXRlT3JpZ2luU2V0W2RvbWFpbl0gPSB0cnVlKTtcbiAgICB9XG4gICAgdmFyIGNvcnNPcHRpb25zID0ge1xuICAgICAgb3JpZ2luKG9yaWdpbjogc3RyaW5nLCBjYWxsYmFjazogKF9hcmc6IGFueSwgcGFzczogYm9vbGVhbikgPT4gdm9pZCkge1xuICAgICAgICB2YXIgcGFzcyA9IG9yaWdpbiA9PSBudWxsIHx8IGNvcnNPcHQgPT09IHRydWUgfHwgXy5oYXMod2hpdGVPcmlnaW5TZXQsIG9yaWdpbik7XG4gICAgICAgIGNhbGxiYWNrKHBhc3MgPyBudWxsIDoge3N0YXR1czogNDAwLCBtZXNzYWdlOiAnQmFkIFJlcXVlc3QgKENPUlMpIGZvciBvcmlnaW46ICcgKyBvcmlnaW59LCBwYXNzKTtcbiAgICAgICAgaWYgKCFwYXNzKVxuICAgICAgICAgIGxvZy5pbmZvKCdDT1JTIHJlcXVlc3QgYmxvY2tlZCBmb3Igb3JpZ2luOiAnICsgb3JpZ2luKTtcbiAgICAgIH0sXG4gICAgICBjcmVkZW50aWFsczogdHJ1ZVxuICAgIH07XG4gICAgcmV0dXJuIGNvcnMoY29yc09wdGlvbnMpO1xuICB9O1xufVxuXG4vLyBmdW5jdGlvbiByZXZlcnRSZW5kZXJGdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuLy8gXHRsb2cudHJhY2UoJ3JlbGVhc2UgaGlqYWNrZWQgcmVzLnJlbmRlcigpJyk7XG4vLyBcdGlmIChyZXMuX19vcmlnUmVuZGVyKSB7XG4vLyBcdFx0cmVzLnJlbmRlciA9IHJlcy5fX29yaWdSZW5kZXI7XG4vLyBcdFx0ZGVsZXRlIHJlcy5fX29yaWdSZW5kZXI7XG4vLyBcdH1cbi8vIFx0bmV4dCgpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiByZXZlcnRSZW5kZXJGdW5jdGlvbkZvckVycm9yKGVyciwgcmVxLCByZXMsIG5leHQpIHtcbi8vIFx0bG9nLnRyYWNlKCdlbmNvdW50ZXIgZXJyb3IsIHJlbGVhc2UgaGlqYWNrZWQgcmVzLnJlbmRlcigpJyk7XG4vLyBcdGlmIChyZXMuX19vcmlnUmVuZGVyKSB7XG4vLyBcdFx0cmVzLnJlbmRlciA9IHJlcy5fX29yaWdSZW5kZXI7XG4vLyBcdFx0ZGVsZXRlIHJlcy5fX29yaWdSZW5kZXI7XG4vLyBcdH1cbi8vIFx0bmV4dChlcnIpO1xuLy8gfVxuIl19