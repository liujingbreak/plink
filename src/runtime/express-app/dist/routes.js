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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9leHByZXNzLWFwcC90cy9yb3V0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsOERBQTZDO0FBRTdDLDBEQUF3QjtBQUV4Qiw0REFBdUI7QUFDdkIsd0RBQXdCO0FBRXhCLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsQ0FBQztBQUNuRSxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQU9yQyxJQUFJLGdCQUFnQixHQUF3QixFQUFFLENBQUM7QUFDL0Msd0JBQXdCO0FBQ3hCLElBQUksT0FBTyxHQUF3QixFQUFFLENBQUM7QUFHdEMsU0FBZ0IsMkJBQTJCLENBQUMsR0FBZ0I7SUFDMUQsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVMsU0FBUztRQUN6QyxJQUFJO1lBQ0YsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLDJCQUEyQixDQUFDLENBQUM7WUFDOUQsU0FBUyxDQUFDLEdBQUcsRUFBRSxpQkFBTyxDQUFDLENBQUM7U0FDekI7UUFBQyxPQUFPLEVBQUUsRUFBRTtZQUNYLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxXQUFXLEdBQUcsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzlELE1BQU0sRUFBRSxDQUFDO1NBQ1Y7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILGlDQUFpQztJQUNqQyxvREFBb0Q7QUFDdEQsQ0FBQztBQVpELGtFQVlDO0FBRUQsU0FBZ0IsNkJBQTZCLENBQUMsR0FBZ0I7SUFDNUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUN6QixRQUFRLENBQUMsR0FBRyxFQUFFLGlCQUFPLENBQUMsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFKRCxz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QUFjLEVBQUUsUUFBNEM7Z0JBQ2pFLElBQUksSUFBSSxHQUFHLE1BQU0sSUFBSSxJQUFJLElBQUksT0FBTyxLQUFLLElBQUksSUFBSSxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQy9FLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxpQ0FBaUMsR0FBRyxNQUFNLEVBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDakcsSUFBSSxDQUFDLElBQUk7b0JBQ1AsR0FBRyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUMzRCxDQUFDO1lBQ0QsV0FBVyxFQUFFLElBQUk7U0FDbEIsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzNCLENBQUMsQ0FBQztBQUNKLENBQUM7QUF4SUQsNEJBd0lDO0FBRUQsa0RBQWtEO0FBQ2xELCtDQUErQztBQUMvQywyQkFBMkI7QUFDM0IsbUNBQW1DO0FBQ25DLDZCQUE2QjtBQUM3QixLQUFLO0FBQ0wsV0FBVztBQUNYLElBQUk7QUFFSiwrREFBK0Q7QUFDL0QsZ0VBQWdFO0FBQ2hFLDJCQUEyQjtBQUMzQixtQ0FBbUM7QUFDbkMsNkJBQTZCO0FBQzdCLEtBQUs7QUFDTCxjQUFjO0FBQ2QsSUFBSSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvZXhwcmVzcy1hcHAvZGlzdC9yb3V0ZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcywge0FwcGxpY2F0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBFeHByZXNzQXBwQXBpIGZyb20gJy4vYXBpLXR5cGVzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtEcmNwQXBpfSBmcm9tICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9nbG9iYWxzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmV4cG9ydCB7RXhwcmVzc0FwcEFwaX07XG52YXIgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuc2V0QXBpJyk7XG52YXIgc3dpZyA9IHJlcXVpcmUoJ3N3aWctdGVtcGxhdGVzJyk7XG5cbmludGVyZmFjZSBSb3V0ZXJEZWZDYWxsYmFjayB7XG4gIChhcHA6IEFwcGxpY2F0aW9uLCBleHA6IHR5cGVvZiBleHByZXNzKTogdm9pZDtcbiAgcGFja2FnZU5hbWU/OiBzdHJpbmc7XG59XG5cbnZhciByb3V0ZXJTZXR1cEZ1bmNzOiBSb3V0ZXJEZWZDYWxsYmFja1tdID0gW107XG4vLyB2YXIgbWlkZGxld2FyZXMgPSBbXTtcbnZhciBhcHBTZXRzOiBSb3V0ZXJEZWZDYWxsYmFja1tdID0gW107XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VEZWZpbmVkUm91dGVycyhhcHA6IEFwcGxpY2F0aW9uKSB7XG4gIHJvdXRlclNldHVwRnVuY3MuZm9yRWFjaChmdW5jdGlvbihyb3V0ZXJEZWYpIHtcbiAgICB0cnkge1xuICAgICAgbG9nLmRlYnVnKHJvdXRlckRlZi5wYWNrYWdlTmFtZSwgJ2RlZmluZXMgcm91dGVyL21pZGRsZXdhcmUnKTtcbiAgICAgIHJvdXRlckRlZihhcHAsIGV4cHJlc3MpO1xuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBsb2cuZXJyb3IoJ3BhY2thZ2UgJyArIHJvdXRlckRlZi5wYWNrYWdlTmFtZSArICcgcm91dGVyJywgZXIpO1xuICAgICAgdGhyb3cgZXI7XG4gICAgfVxuICB9KTtcbiAgLy8gYXBwLnVzZShyZXZlcnRSZW5kZXJGdW5jdGlvbik7XG4gIC8vIGFwcC51c2UocmV2ZXJ0UmVuZGVyRnVuY3Rpb25Gb3JFcnJvcik7Ly9pbXBvcnRhbnRcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nKGFwcDogQXBwbGljYXRpb24pIHtcbiAgYXBwU2V0cy5mb3JFYWNoKGNhbGxiYWNrID0+IHtcbiAgICBjYWxsYmFjayhhcHAsIGV4cHJlc3MpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwQXBpKGFwaTogRXhwcmVzc0FwcEFwaSAmIERyY3BBcGksIGFwcDogQXBwbGljYXRpb24pIHtcbiAgdmFyIGFwaVByb3RvdHlwZTogRXhwcmVzc0FwcEFwaSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpO1xuICBhcGlQcm90b3R5cGUuZXhwcmVzcyA9IGV4cHJlc3M7XG4gIGFwaVByb3RvdHlwZS5leHByZXNzQXBwID0gYXBwO1xuICBhcGlQcm90b3R5cGUuc3dpZyA9IHN3aWc7XG5cbiAgLyoqXG5cdCAqIHNldHVwIGEgcm91dGVyIHVuZGVyIHBhY2thZ2UgY29udGV4dCBwYXRoXG5cdCAqIHNhbWUgYXMgYXBwLnVzZSgnLzxwYWNrYWdlLXBhdGg+Jywgcm91dGVyKTtcblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuICBhcGlQcm90b3R5cGUucm91dGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBjYWxsZWVQYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gICAgaWYgKHNlbGYuX3JvdXRlcikge1xuICAgICAgcmV0dXJuIHNlbGYuX3JvdXRlcjtcbiAgICB9XG4gICAgdmFyIHJvdXRlciA9IHNlbGYuX3JvdXRlciA9IGV4cHJlc3MuUm91dGVyKCk7XG4gICAgdmFyIGNvbnRleHRQYXRoID0gc2VsZi5jb250ZXh0UGF0aDtcbiAgICB2YXIgcGFja2FnZVJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHNlbGYuY29uZmlnKCkucm9vdFBhdGgsIHNlbGYucGFja2FnZUluc3RhbmNlLnBhdGgpO1xuICAgIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG4gICAgICBwYWNrYWdlUmVsUGF0aCA9IHBhY2thZ2VSZWxQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICB9XG4gICAgbG9nLmRlYnVnKCdwYWNrYWdlIHJlbGF0aXZlIHBhdGg6ICcgKyBwYWNrYWdlUmVsUGF0aCk7XG4gICAgcGFja2FnZVJlbFBhdGggKz0gJy8nO1xuICAgIGxldCBvbGRSZW5kZXI6IGV4cHJlc3MuUmVzcG9uc2VbJ3JlbmRlciddO1xuICAgIGZ1bmN0aW9uIHNldHVwUm91dGVyKGFwcDogQXBwbGljYXRpb24pIHtcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnSW4gcGFja2FnZScsIGNhbGxlZVBhY2thZ2VOYW1lLCBzZWxmLnBhY2thZ2VOYW1lLCAnbWlkZGxld2FyZSBjdXN0b21pemVkIHJlcy5yZW5kZXInKTtcbiAgICAgICAgaWYgKCFvbGRSZW5kZXIpXG4gICAgICAgICAgb2xkUmVuZGVyID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHJlcykucmVuZGVyO1xuICAgICAgICByZXMucmVuZGVyID0gY3VzdG9taXplZFJlbmRlcjtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSk7XG4gICAgICAvLyBsb2cuZGVidWcoc2VsZi5wYWNrYWdlTmFtZSArICc6IGFwcC51c2UgY29udGV4dCBwYXRoID0gJyArIGNvbnRleHRQYXRoKTtcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIHJvdXRlcik7XG4gICAgICBhcHAudXNlKGNvbnRleHRQYXRoLCBmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuICAgICAgICBkZWxldGUgcmVzLnJlbmRlcjtcbiAgICAgICAgbG9nLmRlYnVnKCdPdXQgcGFja2FnZScsIGNhbGxlZVBhY2thZ2VOYW1lLCBzZWxmLnBhY2thZ2VOYW1lLCAnY2xlYW51cCBjdXN0b21pemVkIHJlcy5yZW5kZXInKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSk7XG4gICAgICAvLyBJZiBhbiBlcnJvciBlbmNvdW50ZXJlZCBpbiBwcmV2aW91cyBtaWRkbGV3YXJlcywgd2Ugc3RpbGwgbmVlZCB0byBjbGVhbnVwIHJlbmRlciBtZXRob2RcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIGZ1bmN0aW9uKGVyciwgcmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgbG9nLndhcm4oJ2NsZWFudXAgcmVuZGVyKCkgd2hlbiBlbmNvdW50ZXJpbmcgZXJyb3IgaW4gJywgY29udGV4dFBhdGgpO1xuICAgICAgICBkZWxldGUgcmVzLnJlbmRlcjtcbiAgICAgICAgbmV4dChlcnIpO1xuICAgICAgfSBhcyBleHByZXNzLkVycm9yUmVxdWVzdEhhbmRsZXIpO1xuICAgIH1cbiAgICBzZXR1cFJvdXRlci5wYWNrYWdlTmFtZSA9IHNlbGYucGFja2FnZU5hbWU7XG4gICAgLy8gdGhpcyBmdW5jdGlvbiB3aWxsIGJlXG4gICAgLy8gY2FjaGVkIGluIGFycmF5IGFuZCBleGVjdXRlZCBsYXRlci5cbiAgICAvLyBUaHVzIHNhdmUgY3VycmVudCBzdGFjayBmb3IgbGF0ZXIgZGVidWcuXG4gICAgc2V0dXBSb3V0ZXIuc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcbiAgICByb3V0ZXJTZXR1cEZ1bmNzLnB1c2goc2V0dXBSb3V0ZXIpO1xuXG4gICAgZnVuY3Rpb24gY3VzdG9taXplZFJlbmRlcigpIHtcbiAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgaWYgKGFyZ3VtZW50c1swXS5lbmRzV2l0aCgnX2RyY3AtZXhwcmVzcy1lcnJvci5odG1sJykpXG4gICAgICAgIHJldHVybiBvbGRSZW5kZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICBlbHNlIGlmIChfLnN0YXJ0c1dpdGgoYXJnc1swXSwgJy8nKSkge1xuICAgICAgICBhcmdzWzBdID0gYXJnc1swXS5zdWJzdHJpbmcoMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcmdzWzBdID0gcGFja2FnZVJlbFBhdGggKyBhcmd1bWVudHNbMF07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvbGRSZW5kZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJvdXRlcjtcbiAgfTtcblxuICAvKipcblx0ICogc2V0IGFuIGV4cHJlc3MgbWlkZGxld2FyZVxuXHQgKiBzYW1lIGFzIGNhbGxpbmcgYGFwcC51c2UoJy9vcHRpb25hbC1wYXRoJywgbWlkZGxld2FyZSlgXG5cdCAqIE1pZGRsZXdhcmUgaXMgYWx3YXlzIHJlZ2lzdGVyZWQgYmVmb3JlIHJvdXRlcnMgZ2V0dGluZyByZWdpc3RlcmVkLCBzbyBlYWNoXG5cdCAqIHJlcXVlc3Qgd2lsbCBwYXNzIHRocm91Z2ggbWlkZGxld2FyZSBwcmlvciB0byByb3V0ZXJzLlxuXHQgKi9cbiAgWyd1c2UnLFxuICAvKipcblx0ICogc2FtZSBhcyBjYWxsaW5nIGBhcHAucGFyYW0oJy9vcHRpb25hbC1wYXRoJywgbWlkZGxld2FyZSlgXG5cdCAqL1xuICAgICdwYXJhbSddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgYXBpUHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbihfeDogYW55KSB7XG4gICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmFwcGx5KGFyZ3VtZW50cyk7XG4gICAgICBmdW5jdGlvbiBzZXR1cE1pZGRsZXdhcmUoYXBwOiBBcHBsaWNhdGlvbikge1xuICAgICAgICBhcHBbbWV0aG9kXS5hcHBseShhcHAsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgc2V0dXBNaWRkbGV3YXJlLnBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24gd2lsbCBiZVxuICAgICAgLy8gY2FjaGVkIGluIGFycmF5IGFuZCBleGVjdXRlZCBsYXRlciwgdGhlIGN1cnJlbnQgc3RhY2sgaW5mb3JtYXRpb25cbiAgICAgIC8vIHdvbid0IGJlIHNob3duIGlmIHRoZXJlIGlzIGVycm9yIGluIGxhdGVyIGV4ZWN1dGlvbiBwcm9ncmVzcy5cbiAgICAgIC8vIFRodXMgc2F2ZSBjdXJyZW50IHN0YWNrIGZvciBsYXRlciBkZWJ1Zy5cbiAgICAgIHNldHVwTWlkZGxld2FyZS5zdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrO1xuICAgICAgcm91dGVyU2V0dXBGdW5jcy5wdXNoKHNldHVwTWlkZGxld2FyZSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLyoqXG5cdCAqIENhbGxiYWNrIGZ1bmN0aW9ucyB3aWxsIGJlIGNhbGxlZCBhZnRlciBleHByZXNzIGFwcCBiZWluZyBjcmVhdGVkXG5cdCAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFjayBmdW5jdGlvbihhcHAsIGV4cHJlc3MpXG5cdCAqIGUuZy5cblx0ICogXHRhcGkuZXhwcmVzc0FwcFNldCgoYXBwLCBleHByZXNzKSA9PiB7XG4gXHQgKiBcdFx0YXBwLnNldCgndHJ1c3QgcHJveHknLCB0cnVlKTtcbiBcdCAqIFx0XHRhcHAuc2V0KCd2aWV3cycsIFBhdGgucmVzb2x2ZShhcGkuY29uZmlnKCkucm9vdFBhdGgsICcuLi93ZWIvdmlld3MvJykpO1xuIFx0ICogXHR9KTtcblx0ICogQHJldHVybiB2b2lkXG5cdCAqL1xuICBhcGlQcm90b3R5cGUuZXhwcmVzc0FwcFNldCA9IChjYWxsYmFjaykgPT4gYXBwU2V0cy5wdXNoKGNhbGxiYWNrKTtcbiAgYXBpUHJvdG90eXBlLmV4cHJlc3NBcHBVc2UgPSAoY2FsbGJhY2spID0+IHJvdXRlclNldHVwRnVuY3MucHVzaChjYWxsYmFjayk7XG4gIC8qKlxuXHQgKiBlLmcuXG5cdCAqIFx0YXBpLnJvdXRlcigpLm9wdGlvbnMoJy9hcGknLCBhcGkuY29ycygpKTtcblx0ICogXHRhcGkucm91dGVyKCkuZ2V0KCcvYXBpJywgYXBpLmNvcnMoKSk7XG5cdCAqIE9yXG5cdCAqICBhcGkucm91dGVyKCkudXNlKCcvYXBpJywgYXBpLmNvcnMoKSk7XG5cdCAqIEByZXR1cm4gdm9pZFxuXHQgKi9cbiAgYXBpUHJvdG90eXBlLmNvcnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2V0dGluZyA9IGFwaS5jb25maWcoKTtcbiAgICB2YXIgY29yc09wdCA9IF8uZ2V0KHNldHRpbmcsIGFwaS5wYWNrYWdlU2hvcnROYW1lICsgJy1lbmFibGVDT1JTJykgfHwgXy5nZXQoc2V0dGluZywgJ2VuYWJsZUNPUlMnKTtcbiAgICB2YXIgY29ycyA9IHJlcXVpcmUoJ2NvcnMnKTtcbiAgICB2YXIgd2hpdGVPcmlnaW5TZXQgPSB7fTtcbiAgICBpZiAoXy5pc0FycmF5KGNvcnNPcHQpKSB7XG4gICAgICBjb3JzT3B0LmZvckVhY2goZG9tYWluID0+IHdoaXRlT3JpZ2luU2V0W2RvbWFpbl0gPSB0cnVlKTtcbiAgICB9XG4gICAgdmFyIGNvcnNPcHRpb25zID0ge1xuICAgICAgb3JpZ2luKG9yaWdpbjogc3RyaW5nLCBjYWxsYmFjazogKF9hcmc6IGFueSwgcGFzczogYm9vbGVhbikgPT4gdm9pZCkge1xuICAgICAgICB2YXIgcGFzcyA9IG9yaWdpbiA9PSBudWxsIHx8IGNvcnNPcHQgPT09IHRydWUgfHwgXy5oYXMod2hpdGVPcmlnaW5TZXQsIG9yaWdpbik7XG4gICAgICAgIGNhbGxiYWNrKHBhc3MgPyBudWxsIDoge3N0YXR1czogNDAwLCBtZXNzYWdlOiAnQmFkIFJlcXVlc3QgKENPUlMpIGZvciBvcmlnaW46ICcgKyBvcmlnaW59LCBwYXNzKTtcbiAgICAgICAgaWYgKCFwYXNzKVxuICAgICAgICAgIGxvZy5pbmZvKCdDT1JTIHJlcXVlc3QgYmxvY2tlZCBmb3Igb3JpZ2luOiAnICsgb3JpZ2luKTtcbiAgICAgIH0sXG4gICAgICBjcmVkZW50aWFsczogdHJ1ZVxuICAgIH07XG4gICAgcmV0dXJuIGNvcnMoY29yc09wdGlvbnMpO1xuICB9O1xufVxuXG4vLyBmdW5jdGlvbiByZXZlcnRSZW5kZXJGdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuLy8gXHRsb2cudHJhY2UoJ3JlbGVhc2UgaGlqYWNrZWQgcmVzLnJlbmRlcigpJyk7XG4vLyBcdGlmIChyZXMuX19vcmlnUmVuZGVyKSB7XG4vLyBcdFx0cmVzLnJlbmRlciA9IHJlcy5fX29yaWdSZW5kZXI7XG4vLyBcdFx0ZGVsZXRlIHJlcy5fX29yaWdSZW5kZXI7XG4vLyBcdH1cbi8vIFx0bmV4dCgpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiByZXZlcnRSZW5kZXJGdW5jdGlvbkZvckVycm9yKGVyciwgcmVxLCByZXMsIG5leHQpIHtcbi8vIFx0bG9nLnRyYWNlKCdlbmNvdW50ZXIgZXJyb3IsIHJlbGVhc2UgaGlqYWNrZWQgcmVzLnJlbmRlcigpJyk7XG4vLyBcdGlmIChyZXMuX19vcmlnUmVuZGVyKSB7XG4vLyBcdFx0cmVzLnJlbmRlciA9IHJlcy5fX29yaWdSZW5kZXI7XG4vLyBcdFx0ZGVsZXRlIHJlcy5fX29yaWdSZW5kZXI7XG4vLyBcdH1cbi8vIFx0bmV4dChlcnIpO1xuLy8gfVxuIl19
