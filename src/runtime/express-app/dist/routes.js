"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupApi = exports.applyPackageDefinedAppSetting = exports.createPackageDefinedRouters = void 0;
const express_1 = __importDefault(require("express"));
const plink_1 = require("@wfh/plink");
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicm91dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLHNEQUE2QztBQUM3QyxzQ0FBc0Q7QUFDdEQsb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUd4QixJQUFJLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFTL0IsSUFBSSxnQkFBZ0IsR0FBd0IsRUFBRSxDQUFDO0FBQy9DLHdCQUF3QjtBQUN4QixJQUFJLE9BQU8sR0FBd0IsRUFBRSxDQUFDO0FBR3RDLFNBQWdCLDJCQUEyQixDQUFDLEdBQWdCO0lBQzFELEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUN6QyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBUyxTQUFTO1FBQ3pDLElBQUk7WUFDRixJQUFJLFNBQVMsQ0FBQyxXQUFXO2dCQUN2QixHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsMkJBQTJCLENBQUMsQ0FBQzs7Z0JBRTlELEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdCLFNBQVMsQ0FBQyxHQUFHLEVBQUUsaUJBQU8sQ0FBQyxDQUFDO1NBQ3pCO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsV0FBVyxHQUFHLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5RCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBZEQsa0VBY0M7QUFFRCxTQUFnQiw2QkFBNkIsQ0FBQyxHQUFnQjtJQUM1RCxHQUFHLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7SUFDM0MsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUN6QixHQUFHLENBQUMsS0FBSyxDQUFD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QUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztTQUN2RDtRQUNELElBQUksV0FBOEIsQ0FBQztRQUNuQyxJQUFJLGNBQWMsRUFBRTtZQUNsQixXQUFXLEdBQUc7Z0JBQ1osTUFBTSxFQUFFLGNBQWM7Z0JBQ3RCLFdBQVcsRUFBRSxJQUFJO2FBQ2xCLENBQUM7U0FDSDthQUFNO1lBQ0wsV0FBVyxHQUFHO2dCQUNaLHNDQUFzQztnQkFDdEMsTUFBTSxDQUFDLE1BQWMsRUFBRSxRQUE0QztvQkFDakUsSUFBSSxJQUFJLEdBQUcsTUFBTSxJQUFJLElBQUksSUFBSSxPQUFPLEtBQUssSUFBSSxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzVFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxpQ0FBaUMsR0FBRyxNQUFNLEVBQUMsRUFDdkYsSUFBSSxDQUFDLENBQUM7b0JBQ1IsSUFBSSxDQUFDLElBQUk7d0JBQ1AsR0FBRyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsR0FBRyxNQUFNLENBQUMsQ0FBQztnQkFDM0QsQ0FBQztnQkFDRCxXQUFXLEVBQUUsSUFBSTthQUNsQixDQUFDO1NBQ0g7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUM7QUFDSixDQUFDO0FBMUpELDRCQTBKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBleHByZXNzLCB7QXBwbGljYXRpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHtFeHRlbnNpb25Db250ZXh0LCBsb2c0RmlsZX0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgX2NvcnMgZnJvbSAnY29ycyc7XG5cbmxldCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbi8vIGxldCBzd2lnID0gcmVxdWlyZSgnc3dpZy10ZW1wbGF0ZXMnKTtcblxuaW50ZXJmYWNlIFJvdXRlckRlZkNhbGxiYWNrIHtcbiAgKGFwcDogQXBwbGljYXRpb24sIGV4cDogdHlwZW9mIGV4cHJlc3MpOiB2b2lkO1xuICBwYWNrYWdlTmFtZT86IHN0cmluZztcbiAgc3RhY2s/OiBzdHJpbmc7XG59XG5cbmxldCByb3V0ZXJTZXR1cEZ1bmNzOiBSb3V0ZXJEZWZDYWxsYmFja1tdID0gW107XG4vLyBsZXQgbWlkZGxld2FyZXMgPSBbXTtcbmxldCBhcHBTZXRzOiBSb3V0ZXJEZWZDYWxsYmFja1tdID0gW107XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VEZWZpbmVkUm91dGVycyhhcHA6IEFwcGxpY2F0aW9uKSB7XG4gIGxvZy5kZWJ1ZygnY3JlYXRlUGFja2FnZURlZmluZWRSb3V0ZXJzJyk7XG4gIHJvdXRlclNldHVwRnVuY3MuZm9yRWFjaChmdW5jdGlvbihyb3V0ZXJEZWYpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKHJvdXRlckRlZi5wYWNrYWdlTmFtZSlcbiAgICAgICAgbG9nLmRlYnVnKHJvdXRlckRlZi5wYWNrYWdlTmFtZSwgJ2RlZmluZXMgcm91dGVyL21pZGRsZXdhcmUnKTtcbiAgICAgIGVsc2VcbiAgICAgICAgbG9nLmRlYnVnKHJvdXRlckRlZi5zdGFjayk7XG4gICAgICByb3V0ZXJEZWYoYXBwLCBleHByZXNzKTtcbiAgICB9IGNhdGNoIChlcikge1xuICAgICAgbG9nLmVycm9yKCdwYWNrYWdlICcgKyByb3V0ZXJEZWYucGFja2FnZU5hbWUgKyAnIHJvdXRlcicsIGVyKTtcbiAgICAgIHRocm93IGVyO1xuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhY2thZ2VEZWZpbmVkQXBwU2V0dGluZyhhcHA6IEFwcGxpY2F0aW9uKSB7XG4gIGxvZy5kZWJ1ZygnYXBwbHlQYWNrYWdlRGVmaW5lZEFwcFNldHRpbmcnKTtcbiAgYXBwU2V0cy5mb3JFYWNoKGNhbGxiYWNrID0+IHtcbiAgICBsb2cuZGVidWcoY2FsbGJhY2suc3RhY2spO1xuICAgIGNhbGxiYWNrKGFwcCwgZXhwcmVzcyk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBBcGkoYXBpOiBFeHRlbnNpb25Db250ZXh0LCBhcHA6IEFwcGxpY2F0aW9uKSB7XG4gIGxldCBhcGlQcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSBhcyBFeHRlbnNpb25Db250ZXh0O1xuICBhcGlQcm90b3R5cGUuZXhwcmVzcyA9IGV4cHJlc3M7XG4gIGFwaVByb3RvdHlwZS5leHByZXNzQXBwID0gYXBwO1xuICAvLyBhcGlQcm90b3R5cGUuc3dpZyA9IHN3aWc7XG5cbiAgLyoqXG5cdCAqIHNldHVwIGEgcm91dGVyIHVuZGVyIHBhY2thZ2UgY29udGV4dCBwYXRoXG5cdCAqIHNhbWUgYXMgYXBwLnVzZSgnLzxwYWNrYWdlLXBhdGg+Jywgcm91dGVyKTtcblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuICBhcGlQcm90b3R5cGUucm91dGVyID0gZnVuY3Rpb24odGhpczogdHlwZW9mIGFwaSkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGxldCBjYWxsZWVQYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gICAgaWYgKHNlbGYuX3JvdXRlcikge1xuICAgICAgcmV0dXJuIHNlbGYuX3JvdXRlcjtcbiAgICB9XG4gICAgbGV0IHJvdXRlciA9IHNlbGYuX3JvdXRlciA9IGV4cHJlc3MuUm91dGVyKCk7XG4gICAgbGV0IGNvbnRleHRQYXRoID0gc2VsZi5jb250ZXh0UGF0aDtcblxuICAgIGxldCBwYWNrYWdlUmVsUGF0aCA9IHNlbGYucGFja2FnZUluc3RhbmNlLnJlYWxQYXRoO1xuICAgIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG4gICAgICBwYWNrYWdlUmVsUGF0aCA9IHBhY2thZ2VSZWxQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICB9XG4gICAgbG9nLmRlYnVnKCdwYWNrYWdlIHJlbGF0aXZlIHBhdGg6ICcgKyBwYWNrYWdlUmVsUGF0aCk7XG4gICAgcGFja2FnZVJlbFBhdGggKz0gJy8nO1xuICAgIGxldCBvbGRSZW5kZXI6IGV4cHJlc3MuUmVzcG9uc2VbJ3JlbmRlciddO1xuICAgIGZ1bmN0aW9uIHNldHVwUm91dGVyKGFwcDogQXBwbGljYXRpb24pIHtcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnSW4gcGFja2FnZScsIGNhbGxlZVBhY2thZ2VOYW1lLCBzZWxmLnBhY2thZ2VOYW1lLCAnbWlkZGxld2FyZSBjdXN0b21pemVkIHJlcy5yZW5kZXInKTtcbiAgICAgICAgaWYgKCFvbGRSZW5kZXIpXG4gICAgICAgICAgb2xkUmVuZGVyID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHJlcykucmVuZGVyO1xuICAgICAgICByZXMucmVuZGVyID0gY3VzdG9taXplZFJlbmRlcjtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSk7XG4gICAgICAvLyBsb2cuZGVidWcoc2VsZi5wYWNrYWdlTmFtZSArICc6IGFwcC51c2UgY29udGV4dCBwYXRoID0gJyArIGNvbnRleHRQYXRoKTtcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIHJvdXRlcik7XG4gICAgICBhcHAudXNlKGNvbnRleHRQYXRoLCBmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuICAgICAgICBkZWxldGUgKHJlcyBhcyBhbnkpLnJlbmRlcjtcbiAgICAgICAgbG9nLmRlYnVnKCdPdXQgcGFja2FnZScsIGNhbGxlZVBhY2thZ2VOYW1lLCBzZWxmLnBhY2thZ2VOYW1lLCAnY2xlYW51cCBjdXN0b21pemVkIHJlcy5yZW5kZXInKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSk7XG4gICAgICAvLyBJZiBhbiBlcnJvciBlbmNvdW50ZXJlZCBpbiBwcmV2aW91cyBtaWRkbGV3YXJlcywgd2Ugc3RpbGwgbmVlZCB0byBjbGVhbnVwIHJlbmRlciBtZXRob2RcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIGZ1bmN0aW9uKGVyciwgcmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgbG9nLndhcm4oJ2NsZWFudXAgcmVuZGVyKCkgd2hlbiBlbmNvdW50ZXJpbmcgZXJyb3IgaW4gJywgY29udGV4dFBhdGgpO1xuICAgICAgICBkZWxldGUgKHJlcyBhcyBhbnkpLnJlbmRlcjtcbiAgICAgICAgbmV4dChlcnIpO1xuICAgICAgfSBhcyBleHByZXNzLkVycm9yUmVxdWVzdEhhbmRsZXIpO1xuICAgIH1cbiAgICBzZXR1cFJvdXRlci5wYWNrYWdlTmFtZSA9IHNlbGYucGFja2FnZU5hbWU7XG4gICAgLy8gdGhpcyBmdW5jdGlvbiB3aWxsIGJlXG4gICAgLy8gY2FjaGVkIGluIGFycmF5IGFuZCBleGVjdXRlZCBsYXRlci5cbiAgICAvLyBUaHVzIHNhdmUgY3VycmVudCBzdGFjayBmb3IgbGF0ZXIgZGVidWcuXG4gICAgc2V0dXBSb3V0ZXIuc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcbiAgICByb3V0ZXJTZXR1cEZ1bmNzLnB1c2goc2V0dXBSb3V0ZXIpO1xuXG4gICAgZnVuY3Rpb24gY3VzdG9taXplZFJlbmRlcih0aGlzOiBleHByZXNzLlJlc3BvbnNlLCAuLi5hcmdzOiBbc3RyaW5nLCAuLi5hbnlbXV0pIHtcbiAgICAgIC8vIGxldCBhcmdzID0gKFtdIGFzIGFueSkuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgaWYgKGFyZ3NbMF0uZW5kc1dpdGgoJ19kcmNwLWV4cHJlc3MtZXJyb3IuaHRtbCcpKVxuICAgICAgICByZXR1cm4gb2xkUmVuZGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgZWxzZSBpZiAoXy5zdGFydHNXaXRoKGFyZ3NbMF0sICcvJykpIHtcbiAgICAgICAgYXJnc1swXSA9IGFyZ3NbMF0uc3Vic3RyaW5nKDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXJnc1swXSA9IHBhY2thZ2VSZWxQYXRoICsgYXJndW1lbnRzWzBdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2xkUmVuZGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cblxuICAgIHJldHVybiByb3V0ZXI7XG4gIH07XG5cbiAgLyoqXG5cdCAqIHNldCBhbiBleHByZXNzIG1pZGRsZXdhcmVcblx0ICogc2FtZSBhcyBjYWxsaW5nIGBhcHAudXNlKCcvb3B0aW9uYWwtcGF0aCcsIG1pZGRsZXdhcmUpYFxuXHQgKiBNaWRkbGV3YXJlIGlzIGFsd2F5cyByZWdpc3RlcmVkIGJlZm9yZSByb3V0ZXJzIGdldHRpbmcgcmVnaXN0ZXJlZCwgc28gZWFjaFxuXHQgKiByZXF1ZXN0IHdpbGwgcGFzcyB0aHJvdWdoIG1pZGRsZXdhcmUgcHJpb3IgdG8gcm91dGVycy5cblx0ICovXG4gIFsndXNlJyxcbiAgLyoqXG5cdCAqIHNhbWUgYXMgY2FsbGluZyBgYXBwLnBhcmFtKCcvb3B0aW9uYWwtcGF0aCcsIG1pZGRsZXdhcmUpYFxuXHQgKi9cbiAgICAncGFyYW0nXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIGFwaVByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24oX3g6IGFueSkge1xuICAgICAgbGV0IGFyZ3MgPSBbXS5zbGljZS5hcHBseShhcmd1bWVudHMpO1xuICAgICAgZnVuY3Rpb24gc2V0dXBNaWRkbGV3YXJlKGFwcDogQXBwbGljYXRpb24pIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxuICAgICAgICBhcHBbbWV0aG9kXSguLi5hcmdzKTtcbiAgICAgIH1cbiAgICAgIHNldHVwTWlkZGxld2FyZS5wYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gICAgICAvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgYmVcbiAgICAgIC8vIGNhY2hlZCBpbiBhcnJheSBhbmQgZXhlY3V0ZWQgbGF0ZXIsIHRoZSBjdXJyZW50IHN0YWNrIGluZm9ybWF0aW9uXG4gICAgICAvLyB3b24ndCBiZSBzaG93biBpZiB0aGVyZSBpcyBlcnJvciBpbiBsYXRlciBleGVjdXRpb24gcHJvZ3Jlc3MuXG4gICAgICAvLyBUaHVzIHNhdmUgY3VycmVudCBzdGFjayBmb3IgbGF0ZXIgZGVidWcuXG4gICAgICBzZXR1cE1pZGRsZXdhcmUuc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcbiAgICAgIHJvdXRlclNldHVwRnVuY3MucHVzaChzZXR1cE1pZGRsZXdhcmUpO1xuICAgIH07XG4gIH0pO1xuXG4gIC8qKlxuXHQgKiBDYWxsYmFjayBmdW5jdGlvbnMgd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgZXhwcmVzcyBhcHAgYmVpbmcgY3JlYXRlZFxuXHQgKiBAcGFyYW0gIGNhbGxiYWNrIGZ1bmN0aW9uKGFwcCwgZXhwcmVzcylcblx0ICogZS5nLlxuXHQgKiBcdGFwaS5leHByZXNzQXBwU2V0KChhcHAsIGV4cHJlc3MpID0+IHtcbiBcdCAqIFx0XHRhcHAuc2V0KCd0cnVzdCBwcm94eScsIHRydWUpO1xuIFx0ICogXHRcdGFwcC5zZXQoJ3ZpZXdzJywgUGF0aC5yZXNvbHZlKGFwaS5jb25maWcoKS5yb290UGF0aCwgJy4uL3dlYi92aWV3cy8nKSk7XG4gXHQgKiBcdH0pO1xuXHQgKiBAcmV0dXJuIHZvaWRcblx0ICovXG4gIGFwaVByb3RvdHlwZS5leHByZXNzQXBwU2V0ID0gKGNhbGxiYWNrKSA9PiB7XG4gICAgYXBwU2V0cy5wdXNoKGNhbGxiYWNrKTtcbiAgICAoY2FsbGJhY2sgYXMgUm91dGVyRGVmQ2FsbGJhY2spLnN0YWNrID0gbmV3IEVycm9yKCdpbmZvJykuc3RhY2s7XG4gIH07XG4gIGFwaVByb3RvdHlwZS5leHByZXNzQXBwVXNlID0gKGNhbGxiYWNrKSA9PiB7XG4gICAgcm91dGVyU2V0dXBGdW5jcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAoY2FsbGJhY2sgYXMgUm91dGVyRGVmQ2FsbGJhY2spLnN0YWNrID0gbmV3IEVycm9yKCdpbmZvJykuc3RhY2s7XG4gIH07XG4gIC8qKlxuXHQgKiBlLmcuXG5cdCAqIFx0YXBpLnJvdXRlcigpLm9wdGlvbnMoJy9hcGknLCBhcGkuY29ycygpKTtcblx0ICogXHRhcGkucm91dGVyKCkuZ2V0KCcvYXBpJywgYXBpLmNvcnMoKSk7XG5cdCAqIE9yXG5cdCAqICBhcGkucm91dGVyKCkudXNlKCcvYXBpJywgYXBpLmNvcnMoKSk7XG5cdCAqIEByZXR1cm4gdm9pZFxuXHQgKi9cbiAgYXBpUHJvdG90eXBlLmNvcnMgPSBmdW5jdGlvbihhbGxvd2VkT3JpZ2lucz86IHN0cmluZ1tdKSB7XG4gICAgY29uc3Qgc2V0dGluZyA9IGFwaS5jb25maWcoKVsnQHdmaC9leHByZXNzLWFwcCddO1xuICAgIGxldCBjb3JzT3B0ID0gc2V0dGluZz8uZW5hYmxlQ09SUztcbiAgICBjb25zdCBjb3JzID0gcmVxdWlyZSgnY29ycycpIGFzIHR5cGVvZiBfY29ycztcbiAgICBjb25zdCB3aGl0ZU9yaWdpblNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGlmIChfLmlzQXJyYXkoY29yc09wdCkpIHtcbiAgICAgIGNvcnNPcHQuZm9yRWFjaChkb21haW4gPT4gd2hpdGVPcmlnaW5TZXQuYWRkKGRvbWFpbikpO1xuICAgIH1cbiAgICBsZXQgY29yc09wdGlvbnM6IF9jb3JzLkNvcnNPcHRpb25zO1xuICAgIGlmIChhbGxvd2VkT3JpZ2lucykge1xuICAgICAgY29yc09wdGlvbnMgPSB7XG4gICAgICAgIG9yaWdpbjogYWxsb3dlZE9yaWdpbnMsXG4gICAgICAgIGNyZWRlbnRpYWxzOiB0cnVlXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb3JzT3B0aW9ucyA9IHtcbiAgICAgICAgLy8gb3JpZ2luOiBbJ2h0dHA6Ly9sb2NhbGhvc3Q6MTQzMzMnXSxcbiAgICAgICAgb3JpZ2luKG9yaWdpbjogc3RyaW5nLCBjYWxsYmFjazogKF9hcmc6IGFueSwgcGFzczogYm9vbGVhbikgPT4gdm9pZCkge1xuICAgICAgICAgIGxldCBwYXNzID0gb3JpZ2luID09IG51bGwgfHwgY29yc09wdCA9PT0gdHJ1ZSB8fCB3aGl0ZU9yaWdpblNldC5oYXMob3JpZ2luKTtcbiAgICAgICAgICBjYWxsYmFjayhwYXNzID8gbnVsbCA6IHtzdGF0dXM6IDQwMCwgbWVzc2FnZTogJ0JhZCBSZXF1ZXN0IChDT1JTKSBmb3Igb3JpZ2luOiAnICsgb3JpZ2lufSxcbiAgICAgICAgICAgIHBhc3MpO1xuICAgICAgICAgIGlmICghcGFzcylcbiAgICAgICAgICAgIGxvZy5pbmZvKCdDT1JTIHJlcXVlc3QgYmxvY2tlZCBmb3Igb3JpZ2luOiAnICsgb3JpZ2luKTtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlZGVudGlhbHM6IHRydWVcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBjb3JzKGNvcnNPcHRpb25zKTtcbiAgfTtcbn1cbiJdfQ==