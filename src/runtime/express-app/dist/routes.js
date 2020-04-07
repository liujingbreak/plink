"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9leHByZXNzLWFwcC90cy9yb3V0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsOERBQTZDO0FBRTdDLDBEQUF3QjtBQUV4Qiw0REFBdUI7QUFDdkIsd0RBQXdCO0FBRXhCLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsQ0FBQztBQUNuRSxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQU9yQyxJQUFJLGdCQUFnQixHQUF3QixFQUFFLENBQUM7QUFDL0Msd0JBQXdCO0FBQ3hCLElBQUksT0FBTyxHQUF3QixFQUFFLENBQUM7QUFHdEMsU0FBZ0IsMkJBQTJCLENBQUMsR0FBZ0I7SUFDMUQsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVMsU0FBUztRQUN6QyxJQUFJO1lBQ0YsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLDJCQUEyQixDQUFDLENBQUM7WUFDOUQsU0FBUyxDQUFDLEdBQUcsRUFBRSxpQkFBTyxDQUFDLENBQUM7U0FDekI7UUFBQyxPQUFPLEVBQUUsRUFBRTtZQUNYLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxXQUFXLEdBQUcsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzlELE1BQU0sRUFBRSxDQUFDO1NBQ1Y7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILGlDQUFpQztJQUNqQyxvREFBb0Q7QUFDdEQsQ0FBQztBQVpELGtFQVlDO0FBRUQsU0FBZ0IsNkJBQTZCLENBQUMsR0FBZ0I7SUFDNUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUN6QixRQUFRLENBQUMsR0FBRyxFQUFFLGlCQUFPLENBQUMsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFKRCxz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QUFjLEVBQUUsUUFBNEM7Z0JBQ2pFLElBQUksSUFBSSxHQUFHLE1BQU0sSUFBSSxJQUFJLElBQUksT0FBTyxLQUFLLElBQUksSUFBSSxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQy9FLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxpQ0FBaUMsR0FBRyxNQUFNLEVBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDakcsSUFBSSxDQUFDLElBQUk7b0JBQ1AsR0FBRyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUMzRCxDQUFDO1lBQ0QsV0FBVyxFQUFFLElBQUk7U0FDbEIsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzNCLENBQUMsQ0FBQztBQUNKLENBQUM7QUF4SUQsNEJBd0lDO0FBRUQsa0RBQWtEO0FBQ2xELCtDQUErQztBQUMvQywyQkFBMkI7QUFDM0IsbUNBQW1DO0FBQ25DLDZCQUE2QjtBQUM3QixLQUFLO0FBQ0wsV0FBVztBQUNYLElBQUk7QUFFSiwrREFBK0Q7QUFDL0QsZ0VBQWdFO0FBQ2hFLDJCQUEyQjtBQUMzQixtQ0FBbUM7QUFDbkMsNkJBQTZCO0FBQzdCLEtBQUs7QUFDTCxjQUFjO0FBQ2QsSUFBSSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvZXhwcmVzcy1hcHAvZGlzdC9yb3V0ZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcywge0FwcGxpY2F0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBFeHByZXNzQXBwQXBpIGZyb20gJy4vYXBpLXR5cGVzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtEcmNwQXBpfSBmcm9tICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9nbG9iYWxzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmV4cG9ydCB7RXhwcmVzc0FwcEFwaX07XG52YXIgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuc2V0QXBpJyk7XG52YXIgc3dpZyA9IHJlcXVpcmUoJ3N3aWctdGVtcGxhdGVzJyk7XG5cbmludGVyZmFjZSBSb3V0ZXJEZWZDYWxsYmFjayB7XG4gIChhcHA6IEFwcGxpY2F0aW9uLCBleHA6IHR5cGVvZiBleHByZXNzKTogdm9pZDtcbiAgcGFja2FnZU5hbWU/OiBzdHJpbmc7XG59XG5cbnZhciByb3V0ZXJTZXR1cEZ1bmNzOiBSb3V0ZXJEZWZDYWxsYmFja1tdID0gW107XG4vLyB2YXIgbWlkZGxld2FyZXMgPSBbXTtcbnZhciBhcHBTZXRzOiBSb3V0ZXJEZWZDYWxsYmFja1tdID0gW107XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VEZWZpbmVkUm91dGVycyhhcHA6IEFwcGxpY2F0aW9uKSB7XG4gIHJvdXRlclNldHVwRnVuY3MuZm9yRWFjaChmdW5jdGlvbihyb3V0ZXJEZWYpIHtcbiAgICB0cnkge1xuICAgICAgbG9nLmRlYnVnKHJvdXRlckRlZi5wYWNrYWdlTmFtZSwgJ2RlZmluZXMgcm91dGVyL21pZGRsZXdhcmUnKTtcbiAgICAgIHJvdXRlckRlZihhcHAsIGV4cHJlc3MpO1xuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBsb2cuZXJyb3IoJ3BhY2thZ2UgJyArIHJvdXRlckRlZi5wYWNrYWdlTmFtZSArICcgcm91dGVyJywgZXIpO1xuICAgICAgdGhyb3cgZXI7XG4gICAgfVxuICB9KTtcbiAgLy8gYXBwLnVzZShyZXZlcnRSZW5kZXJGdW5jdGlvbik7XG4gIC8vIGFwcC51c2UocmV2ZXJ0UmVuZGVyRnVuY3Rpb25Gb3JFcnJvcik7Ly9pbXBvcnRhbnRcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nKGFwcDogQXBwbGljYXRpb24pIHtcbiAgYXBwU2V0cy5mb3JFYWNoKGNhbGxiYWNrID0+IHtcbiAgICBjYWxsYmFjayhhcHAsIGV4cHJlc3MpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwQXBpKGFwaTogRXhwcmVzc0FwcEFwaSAmIERyY3BBcGksIGFwcDogQXBwbGljYXRpb24pIHtcbiAgdmFyIGFwaVByb3RvdHlwZTogRXhwcmVzc0FwcEFwaSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpO1xuICBhcGlQcm90b3R5cGUuZXhwcmVzcyA9IGV4cHJlc3M7XG4gIGFwaVByb3RvdHlwZS5leHByZXNzQXBwID0gYXBwO1xuICBhcGlQcm90b3R5cGUuc3dpZyA9IHN3aWc7XG5cbiAgLyoqXG5cdCAqIHNldHVwIGEgcm91dGVyIHVuZGVyIHBhY2thZ2UgY29udGV4dCBwYXRoXG5cdCAqIHNhbWUgYXMgYXBwLnVzZSgnLzxwYWNrYWdlLXBhdGg+Jywgcm91dGVyKTtcblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuICBhcGlQcm90b3R5cGUucm91dGVyID0gZnVuY3Rpb24odGhpczogdHlwZW9mIGFwaSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgY2FsbGVlUGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICAgIGlmIChzZWxmLl9yb3V0ZXIpIHtcbiAgICAgIHJldHVybiBzZWxmLl9yb3V0ZXI7XG4gICAgfVxuICAgIHZhciByb3V0ZXIgPSBzZWxmLl9yb3V0ZXIgPSBleHByZXNzLlJvdXRlcigpO1xuICAgIHZhciBjb250ZXh0UGF0aCA9IHNlbGYuY29udGV4dFBhdGg7XG4gICAgdmFyIHBhY2thZ2VSZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShzZWxmLmNvbmZpZygpLnJvb3RQYXRoLCBzZWxmLnBhY2thZ2VJbnN0YW5jZS5wYXRoKTtcbiAgICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgcGFja2FnZVJlbFBhdGggPSBwYWNrYWdlUmVsUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgfVxuICAgIGxvZy5kZWJ1ZygncGFja2FnZSByZWxhdGl2ZSBwYXRoOiAnICsgcGFja2FnZVJlbFBhdGgpO1xuICAgIHBhY2thZ2VSZWxQYXRoICs9ICcvJztcbiAgICBsZXQgb2xkUmVuZGVyOiBleHByZXNzLlJlc3BvbnNlWydyZW5kZXInXTtcbiAgICBmdW5jdGlvbiBzZXR1cFJvdXRlcihhcHA6IEFwcGxpY2F0aW9uKSB7XG4gICAgICBhcHAudXNlKGNvbnRleHRQYXRoLCBmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuICAgICAgICBsb2cuZGVidWcoJ0luIHBhY2thZ2UnLCBjYWxsZWVQYWNrYWdlTmFtZSwgc2VsZi5wYWNrYWdlTmFtZSwgJ21pZGRsZXdhcmUgY3VzdG9taXplZCByZXMucmVuZGVyJyk7XG4gICAgICAgIGlmICghb2xkUmVuZGVyKVxuICAgICAgICAgIG9sZFJlbmRlciA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihyZXMpLnJlbmRlcjtcbiAgICAgICAgcmVzLnJlbmRlciA9IGN1c3RvbWl6ZWRSZW5kZXI7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgICAgLy8gbG9nLmRlYnVnKHNlbGYucGFja2FnZU5hbWUgKyAnOiBhcHAudXNlIGNvbnRleHQgcGF0aCA9ICcgKyBjb250ZXh0UGF0aCk7XG4gICAgICBhcHAudXNlKGNvbnRleHRQYXRoLCByb3V0ZXIpO1xuICAgICAgYXBwLnVzZShjb250ZXh0UGF0aCwgZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgZGVsZXRlIHJlcy5yZW5kZXI7XG4gICAgICAgIGxvZy5kZWJ1ZygnT3V0IHBhY2thZ2UnLCBjYWxsZWVQYWNrYWdlTmFtZSwgc2VsZi5wYWNrYWdlTmFtZSwgJ2NsZWFudXAgY3VzdG9taXplZCByZXMucmVuZGVyJyk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgICAgLy8gSWYgYW4gZXJyb3IgZW5jb3VudGVyZWQgaW4gcHJldmlvdXMgbWlkZGxld2FyZXMsIHdlIHN0aWxsIG5lZWQgdG8gY2xlYW51cCByZW5kZXIgbWV0aG9kXG4gICAgICBhcHAudXNlKGNvbnRleHRQYXRoLCBmdW5jdGlvbihlcnIsIHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIGxvZy53YXJuKCdjbGVhbnVwIHJlbmRlcigpIHdoZW4gZW5jb3VudGVyaW5nIGVycm9yIGluICcsIGNvbnRleHRQYXRoKTtcbiAgICAgICAgZGVsZXRlIHJlcy5yZW5kZXI7XG4gICAgICAgIG5leHQoZXJyKTtcbiAgICAgIH0gYXMgZXhwcmVzcy5FcnJvclJlcXVlc3RIYW5kbGVyKTtcbiAgICB9XG4gICAgc2V0dXBSb3V0ZXIucGFja2FnZU5hbWUgPSBzZWxmLnBhY2thZ2VOYW1lO1xuICAgIC8vIHRoaXMgZnVuY3Rpb24gd2lsbCBiZVxuICAgIC8vIGNhY2hlZCBpbiBhcnJheSBhbmQgZXhlY3V0ZWQgbGF0ZXIuXG4gICAgLy8gVGh1cyBzYXZlIGN1cnJlbnQgc3RhY2sgZm9yIGxhdGVyIGRlYnVnLlxuICAgIHNldHVwUm91dGVyLnN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s7XG4gICAgcm91dGVyU2V0dXBGdW5jcy5wdXNoKHNldHVwUm91dGVyKTtcblxuICAgIGZ1bmN0aW9uIGN1c3RvbWl6ZWRSZW5kZXIoKSB7XG4gICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIGlmIChhcmd1bWVudHNbMF0uZW5kc1dpdGgoJ19kcmNwLWV4cHJlc3MtZXJyb3IuaHRtbCcpKVxuICAgICAgICByZXR1cm4gb2xkUmVuZGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgZWxzZSBpZiAoXy5zdGFydHNXaXRoKGFyZ3NbMF0sICcvJykpIHtcbiAgICAgICAgYXJnc1swXSA9IGFyZ3NbMF0uc3Vic3RyaW5nKDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXJnc1swXSA9IHBhY2thZ2VSZWxQYXRoICsgYXJndW1lbnRzWzBdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2xkUmVuZGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cblxuICAgIHJldHVybiByb3V0ZXI7XG4gIH07XG5cbiAgLyoqXG5cdCAqIHNldCBhbiBleHByZXNzIG1pZGRsZXdhcmVcblx0ICogc2FtZSBhcyBjYWxsaW5nIGBhcHAudXNlKCcvb3B0aW9uYWwtcGF0aCcsIG1pZGRsZXdhcmUpYFxuXHQgKiBNaWRkbGV3YXJlIGlzIGFsd2F5cyByZWdpc3RlcmVkIGJlZm9yZSByb3V0ZXJzIGdldHRpbmcgcmVnaXN0ZXJlZCwgc28gZWFjaFxuXHQgKiByZXF1ZXN0IHdpbGwgcGFzcyB0aHJvdWdoIG1pZGRsZXdhcmUgcHJpb3IgdG8gcm91dGVycy5cblx0ICovXG4gIFsndXNlJyxcbiAgLyoqXG5cdCAqIHNhbWUgYXMgY2FsbGluZyBgYXBwLnBhcmFtKCcvb3B0aW9uYWwtcGF0aCcsIG1pZGRsZXdhcmUpYFxuXHQgKi9cbiAgICAncGFyYW0nXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIGFwaVByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24oX3g6IGFueSkge1xuICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5hcHBseShhcmd1bWVudHMpO1xuICAgICAgZnVuY3Rpb24gc2V0dXBNaWRkbGV3YXJlKGFwcDogQXBwbGljYXRpb24pIHtcbiAgICAgICAgYXBwW21ldGhvZF0uYXBwbHkoYXBwLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHNldHVwTWlkZGxld2FyZS5wYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gICAgICAvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgYmVcbiAgICAgIC8vIGNhY2hlZCBpbiBhcnJheSBhbmQgZXhlY3V0ZWQgbGF0ZXIsIHRoZSBjdXJyZW50IHN0YWNrIGluZm9ybWF0aW9uXG4gICAgICAvLyB3b24ndCBiZSBzaG93biBpZiB0aGVyZSBpcyBlcnJvciBpbiBsYXRlciBleGVjdXRpb24gcHJvZ3Jlc3MuXG4gICAgICAvLyBUaHVzIHNhdmUgY3VycmVudCBzdGFjayBmb3IgbGF0ZXIgZGVidWcuXG4gICAgICBzZXR1cE1pZGRsZXdhcmUuc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcbiAgICAgIHJvdXRlclNldHVwRnVuY3MucHVzaChzZXR1cE1pZGRsZXdhcmUpO1xuICAgIH07XG4gIH0pO1xuXG4gIC8qKlxuXHQgKiBDYWxsYmFjayBmdW5jdGlvbnMgd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgZXhwcmVzcyBhcHAgYmVpbmcgY3JlYXRlZFxuXHQgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgZnVuY3Rpb24oYXBwLCBleHByZXNzKVxuXHQgKiBlLmcuXG5cdCAqIFx0YXBpLmV4cHJlc3NBcHBTZXQoKGFwcCwgZXhwcmVzcykgPT4ge1xuIFx0ICogXHRcdGFwcC5zZXQoJ3RydXN0IHByb3h5JywgdHJ1ZSk7XG4gXHQgKiBcdFx0YXBwLnNldCgndmlld3MnLCBQYXRoLnJlc29sdmUoYXBpLmNvbmZpZygpLnJvb3RQYXRoLCAnLi4vd2ViL3ZpZXdzLycpKTtcbiBcdCAqIFx0fSk7XG5cdCAqIEByZXR1cm4gdm9pZFxuXHQgKi9cbiAgYXBpUHJvdG90eXBlLmV4cHJlc3NBcHBTZXQgPSAoY2FsbGJhY2spID0+IGFwcFNldHMucHVzaChjYWxsYmFjayk7XG4gIGFwaVByb3RvdHlwZS5leHByZXNzQXBwVXNlID0gKGNhbGxiYWNrKSA9PiByb3V0ZXJTZXR1cEZ1bmNzLnB1c2goY2FsbGJhY2spO1xuICAvKipcblx0ICogZS5nLlxuXHQgKiBcdGFwaS5yb3V0ZXIoKS5vcHRpb25zKCcvYXBpJywgYXBpLmNvcnMoKSk7XG5cdCAqIFx0YXBpLnJvdXRlcigpLmdldCgnL2FwaScsIGFwaS5jb3JzKCkpO1xuXHQgKiBPclxuXHQgKiAgYXBpLnJvdXRlcigpLnVzZSgnL2FwaScsIGFwaS5jb3JzKCkpO1xuXHQgKiBAcmV0dXJuIHZvaWRcblx0ICovXG4gIGFwaVByb3RvdHlwZS5jb3JzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNldHRpbmcgPSBhcGkuY29uZmlnKCk7XG4gICAgdmFyIGNvcnNPcHQgPSBfLmdldChzZXR0aW5nLCBhcGkucGFja2FnZVNob3J0TmFtZSArICctZW5hYmxlQ09SUycpIHx8IF8uZ2V0KHNldHRpbmcsICdlbmFibGVDT1JTJyk7XG4gICAgdmFyIGNvcnMgPSByZXF1aXJlKCdjb3JzJyk7XG4gICAgdmFyIHdoaXRlT3JpZ2luU2V0ID0ge307XG4gICAgaWYgKF8uaXNBcnJheShjb3JzT3B0KSkge1xuICAgICAgY29yc09wdC5mb3JFYWNoKGRvbWFpbiA9PiB3aGl0ZU9yaWdpblNldFtkb21haW5dID0gdHJ1ZSk7XG4gICAgfVxuICAgIHZhciBjb3JzT3B0aW9ucyA9IHtcbiAgICAgIG9yaWdpbihvcmlnaW46IHN0cmluZywgY2FsbGJhY2s6IChfYXJnOiBhbnksIHBhc3M6IGJvb2xlYW4pID0+IHZvaWQpIHtcbiAgICAgICAgdmFyIHBhc3MgPSBvcmlnaW4gPT0gbnVsbCB8fCBjb3JzT3B0ID09PSB0cnVlIHx8IF8uaGFzKHdoaXRlT3JpZ2luU2V0LCBvcmlnaW4pO1xuICAgICAgICBjYWxsYmFjayhwYXNzID8gbnVsbCA6IHtzdGF0dXM6IDQwMCwgbWVzc2FnZTogJ0JhZCBSZXF1ZXN0IChDT1JTKSBmb3Igb3JpZ2luOiAnICsgb3JpZ2lufSwgcGFzcyk7XG4gICAgICAgIGlmICghcGFzcylcbiAgICAgICAgICBsb2cuaW5mbygnQ09SUyByZXF1ZXN0IGJsb2NrZWQgZm9yIG9yaWdpbjogJyArIG9yaWdpbik7XG4gICAgICB9LFxuICAgICAgY3JlZGVudGlhbHM6IHRydWVcbiAgICB9O1xuICAgIHJldHVybiBjb3JzKGNvcnNPcHRpb25zKTtcbiAgfTtcbn1cblxuLy8gZnVuY3Rpb24gcmV2ZXJ0UmVuZGVyRnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbi8vIFx0bG9nLnRyYWNlKCdyZWxlYXNlIGhpamFja2VkIHJlcy5yZW5kZXIoKScpO1xuLy8gXHRpZiAocmVzLl9fb3JpZ1JlbmRlcikge1xuLy8gXHRcdHJlcy5yZW5kZXIgPSByZXMuX19vcmlnUmVuZGVyO1xuLy8gXHRcdGRlbGV0ZSByZXMuX19vcmlnUmVuZGVyO1xuLy8gXHR9XG4vLyBcdG5leHQoKTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gcmV2ZXJ0UmVuZGVyRnVuY3Rpb25Gb3JFcnJvcihlcnIsIHJlcSwgcmVzLCBuZXh0KSB7XG4vLyBcdGxvZy50cmFjZSgnZW5jb3VudGVyIGVycm9yLCByZWxlYXNlIGhpamFja2VkIHJlcy5yZW5kZXIoKScpO1xuLy8gXHRpZiAocmVzLl9fb3JpZ1JlbmRlcikge1xuLy8gXHRcdHJlcy5yZW5kZXIgPSByZXMuX19vcmlnUmVuZGVyO1xuLy8gXHRcdGRlbGV0ZSByZXMuX19vcmlnUmVuZGVyO1xuLy8gXHR9XG4vLyBcdG5leHQoZXJyKTtcbi8vIH1cbiJdfQ==
