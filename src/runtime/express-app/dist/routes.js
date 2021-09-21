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
    // apiPrototype.swig = swig;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicm91dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLHNEQUE2QztBQUM3QyxzQ0FBc0Q7QUFDdEQsb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUd4QixJQUFJLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFRL0IsSUFBSSxnQkFBZ0IsR0FBd0IsRUFBRSxDQUFDO0FBQy9DLHdCQUF3QjtBQUN4QixJQUFJLE9BQU8sR0FBd0IsRUFBRSxDQUFDO0FBR3RDLFNBQWdCLDJCQUEyQixDQUFDLEdBQWdCO0lBQzFELGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFTLFNBQVM7UUFDekMsSUFBSTtZQUNGLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBQzlELFNBQVMsQ0FBQyxHQUFHLEVBQUUsaUJBQU8sQ0FBQyxDQUFDO1NBQ3pCO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsV0FBVyxHQUFHLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5RCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBVkQsa0VBVUM7QUFFRCxTQUFnQiw2QkFBNkIsQ0FBQyxHQUFnQjtJQUM1RCxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ3pCLFFBQVEsQ0FBQyxHQUFHLEVBQUUsaUJBQU8sQ0FBQyxDQUFDO0lBQ3pCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUpELHNFQUlDO0FBRUQsU0FBZ0IsUUFBUSxDQUFDLEdBQXFCLEVBQUUsR0FBZ0I7SUFDOUQsSUFBSSxZQUFZLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQXFCLENBQUM7SUFDbEUsWUFBWSxD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QU0sQ0FBQyxDQUFDO29CQUM1RSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsaUNBQWlDLEdBQUcsTUFBTSxFQUFDLEVBQ3ZGLElBQUksQ0FBQyxDQUFDO29CQUNSLElBQUksQ0FBQyxJQUFJO3dCQUNQLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUNBQW1DLEdBQUcsTUFBTSxDQUFDLENBQUM7Z0JBQzNELENBQUM7Z0JBQ0QsV0FBVyxFQUFFLElBQUk7YUFDbEIsQ0FBQztTQUNIO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXBKRCw0QkFvSkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcywge0FwcGxpY2F0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCB7RXh0ZW5zaW9uQ29udGV4dCwgbG9nNEZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF9jb3JzIGZyb20gJ2NvcnMnO1xuXG5sZXQgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG4vLyBsZXQgc3dpZyA9IHJlcXVpcmUoJ3N3aWctdGVtcGxhdGVzJyk7XG5cbmludGVyZmFjZSBSb3V0ZXJEZWZDYWxsYmFjayB7XG4gIChhcHA6IEFwcGxpY2F0aW9uLCBleHA6IHR5cGVvZiBleHByZXNzKTogdm9pZDtcbiAgcGFja2FnZU5hbWU/OiBzdHJpbmc7XG59XG5cbmxldCByb3V0ZXJTZXR1cEZ1bmNzOiBSb3V0ZXJEZWZDYWxsYmFja1tdID0gW107XG4vLyBsZXQgbWlkZGxld2FyZXMgPSBbXTtcbmxldCBhcHBTZXRzOiBSb3V0ZXJEZWZDYWxsYmFja1tdID0gW107XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VEZWZpbmVkUm91dGVycyhhcHA6IEFwcGxpY2F0aW9uKSB7XG4gIHJvdXRlclNldHVwRnVuY3MuZm9yRWFjaChmdW5jdGlvbihyb3V0ZXJEZWYpIHtcbiAgICB0cnkge1xuICAgICAgbG9nLmRlYnVnKHJvdXRlckRlZi5wYWNrYWdlTmFtZSwgJ2RlZmluZXMgcm91dGVyL21pZGRsZXdhcmUnKTtcbiAgICAgIHJvdXRlckRlZihhcHAsIGV4cHJlc3MpO1xuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBsb2cuZXJyb3IoJ3BhY2thZ2UgJyArIHJvdXRlckRlZi5wYWNrYWdlTmFtZSArICcgcm91dGVyJywgZXIpO1xuICAgICAgdGhyb3cgZXI7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGFja2FnZURlZmluZWRBcHBTZXR0aW5nKGFwcDogQXBwbGljYXRpb24pIHtcbiAgYXBwU2V0cy5mb3JFYWNoKGNhbGxiYWNrID0+IHtcbiAgICBjYWxsYmFjayhhcHAsIGV4cHJlc3MpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwQXBpKGFwaTogRXh0ZW5zaW9uQ29udGV4dCwgYXBwOiBBcHBsaWNhdGlvbikge1xuICBsZXQgYXBpUHJvdG90eXBlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSkgYXMgRXh0ZW5zaW9uQ29udGV4dDtcbiAgYXBpUHJvdG90eXBlLmV4cHJlc3MgPSBleHByZXNzO1xuICBhcGlQcm90b3R5cGUuZXhwcmVzc0FwcCA9IGFwcDtcbiAgLy8gYXBpUHJvdG90eXBlLnN3aWcgPSBzd2lnO1xuXG4gIC8qKlxuXHQgKiBzZXR1cCBhIHJvdXRlciB1bmRlciBwYWNrYWdlIGNvbnRleHQgcGF0aFxuXHQgKiBzYW1lIGFzIGFwcC51c2UoJy88cGFja2FnZS1wYXRoPicsIHJvdXRlcik7XG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cbiAgYXBpUHJvdG90eXBlLnJvdXRlciA9IGZ1bmN0aW9uKHRoaXM6IHR5cGVvZiBhcGkpIHtcbiAgICBsZXQgc2VsZiA9IHRoaXM7XG4gICAgbGV0IGNhbGxlZVBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgICBpZiAoc2VsZi5fcm91dGVyKSB7XG4gICAgICByZXR1cm4gc2VsZi5fcm91dGVyO1xuICAgIH1cbiAgICBsZXQgcm91dGVyID0gc2VsZi5fcm91dGVyID0gZXhwcmVzcy5Sb3V0ZXIoKTtcbiAgICBsZXQgY29udGV4dFBhdGggPSBzZWxmLmNvbnRleHRQYXRoO1xuXG4gICAgbGV0IHBhY2thZ2VSZWxQYXRoID0gc2VsZi5wYWNrYWdlSW5zdGFuY2UucmVhbFBhdGg7XG4gICAgaWYgKFBhdGguc2VwID09PSAnXFxcXCcpIHtcbiAgICAgIHBhY2thZ2VSZWxQYXRoID0gcGFja2FnZVJlbFBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIH1cbiAgICBsb2cuZGVidWcoJ3BhY2thZ2UgcmVsYXRpdmUgcGF0aDogJyArIHBhY2thZ2VSZWxQYXRoKTtcbiAgICBwYWNrYWdlUmVsUGF0aCArPSAnLyc7XG4gICAgbGV0IG9sZFJlbmRlcjogZXhwcmVzcy5SZXNwb25zZVsncmVuZGVyJ107XG4gICAgZnVuY3Rpb24gc2V0dXBSb3V0ZXIoYXBwOiBBcHBsaWNhdGlvbikge1xuICAgICAgYXBwLnVzZShjb250ZXh0UGF0aCwgZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdJbiBwYWNrYWdlJywgY2FsbGVlUGFja2FnZU5hbWUsIHNlbGYucGFja2FnZU5hbWUsICdtaWRkbGV3YXJlIGN1c3RvbWl6ZWQgcmVzLnJlbmRlcicpO1xuICAgICAgICBpZiAoIW9sZFJlbmRlcilcbiAgICAgICAgICBvbGRSZW5kZXIgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocmVzKS5yZW5kZXI7XG4gICAgICAgIHJlcy5yZW5kZXIgPSBjdXN0b21pemVkUmVuZGVyO1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9KTtcbiAgICAgIC8vIGxvZy5kZWJ1ZyhzZWxmLnBhY2thZ2VOYW1lICsgJzogYXBwLnVzZSBjb250ZXh0IHBhdGggPSAnICsgY29udGV4dFBhdGgpO1xuICAgICAgYXBwLnVzZShjb250ZXh0UGF0aCwgcm91dGVyKTtcbiAgICAgIGFwcC51c2UoY29udGV4dFBhdGgsIGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIGRlbGV0ZSAocmVzIGFzIGFueSkucmVuZGVyO1xuICAgICAgICBsb2cuZGVidWcoJ091dCBwYWNrYWdlJywgY2FsbGVlUGFja2FnZU5hbWUsIHNlbGYucGFja2FnZU5hbWUsICdjbGVhbnVwIGN1c3RvbWl6ZWQgcmVzLnJlbmRlcicpO1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9KTtcbiAgICAgIC8vIElmIGFuIGVycm9yIGVuY291bnRlcmVkIGluIHByZXZpb3VzIG1pZGRsZXdhcmVzLCB3ZSBzdGlsbCBuZWVkIHRvIGNsZWFudXAgcmVuZGVyIG1ldGhvZFxuICAgICAgYXBwLnVzZShjb250ZXh0UGF0aCwgZnVuY3Rpb24oZXJyLCByZXEsIHJlcywgbmV4dCkge1xuICAgICAgICBsb2cud2FybignY2xlYW51cCByZW5kZXIoKSB3aGVuIGVuY291bnRlcmluZyBlcnJvciBpbiAnLCBjb250ZXh0UGF0aCk7XG4gICAgICAgIGRlbGV0ZSAocmVzIGFzIGFueSkucmVuZGVyO1xuICAgICAgICBuZXh0KGVycik7XG4gICAgICB9IGFzIGV4cHJlc3MuRXJyb3JSZXF1ZXN0SGFuZGxlcik7XG4gICAgfVxuICAgIHNldHVwUm91dGVyLnBhY2thZ2VOYW1lID0gc2VsZi5wYWNrYWdlTmFtZTtcbiAgICAvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgYmVcbiAgICAvLyBjYWNoZWQgaW4gYXJyYXkgYW5kIGV4ZWN1dGVkIGxhdGVyLlxuICAgIC8vIFRodXMgc2F2ZSBjdXJyZW50IHN0YWNrIGZvciBsYXRlciBkZWJ1Zy5cbiAgICBzZXR1cFJvdXRlci5zdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrO1xuICAgIHJvdXRlclNldHVwRnVuY3MucHVzaChzZXR1cFJvdXRlcik7XG5cbiAgICBmdW5jdGlvbiBjdXN0b21pemVkUmVuZGVyKCkge1xuICAgICAgbGV0IGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICBpZiAoYXJndW1lbnRzWzBdLmVuZHNXaXRoKCdfZHJjcC1leHByZXNzLWVycm9yLmh0bWwnKSlcbiAgICAgICAgcmV0dXJuIG9sZFJlbmRlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIGVsc2UgaWYgKF8uc3RhcnRzV2l0aChhcmdzWzBdLCAnLycpKSB7XG4gICAgICAgIGFyZ3NbMF0gPSBhcmdzWzBdLnN1YnN0cmluZygxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFyZ3NbMF0gPSBwYWNrYWdlUmVsUGF0aCArIGFyZ3VtZW50c1swXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9sZFJlbmRlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcm91dGVyO1xuICB9O1xuXG4gIC8qKlxuXHQgKiBzZXQgYW4gZXhwcmVzcyBtaWRkbGV3YXJlXG5cdCAqIHNhbWUgYXMgY2FsbGluZyBgYXBwLnVzZSgnL29wdGlvbmFsLXBhdGgnLCBtaWRkbGV3YXJlKWBcblx0ICogTWlkZGxld2FyZSBpcyBhbHdheXMgcmVnaXN0ZXJlZCBiZWZvcmUgcm91dGVycyBnZXR0aW5nIHJlZ2lzdGVyZWQsIHNvIGVhY2hcblx0ICogcmVxdWVzdCB3aWxsIHBhc3MgdGhyb3VnaCBtaWRkbGV3YXJlIHByaW9yIHRvIHJvdXRlcnMuXG5cdCAqL1xuICBbJ3VzZScsXG4gIC8qKlxuXHQgKiBzYW1lIGFzIGNhbGxpbmcgYGFwcC5wYXJhbSgnL29wdGlvbmFsLXBhdGgnLCBtaWRkbGV3YXJlKWBcblx0ICovXG4gICAgJ3BhcmFtJ10uZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICBhcGlQcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKF94OiBhbnkpIHtcbiAgICAgIGxldCBhcmdzID0gW10uc2xpY2UuYXBwbHkoYXJndW1lbnRzKTtcbiAgICAgIGZ1bmN0aW9uIHNldHVwTWlkZGxld2FyZShhcHA6IEFwcGxpY2F0aW9uKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGxcbiAgICAgICAgYXBwW21ldGhvZF0oLi4uYXJncyk7XG4gICAgICB9XG4gICAgICBzZXR1cE1pZGRsZXdhcmUucGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICAgICAgLy8gdGhpcyBmdW5jdGlvbiB3aWxsIGJlXG4gICAgICAvLyBjYWNoZWQgaW4gYXJyYXkgYW5kIGV4ZWN1dGVkIGxhdGVyLCB0aGUgY3VycmVudCBzdGFjayBpbmZvcm1hdGlvblxuICAgICAgLy8gd29uJ3QgYmUgc2hvd24gaWYgdGhlcmUgaXMgZXJyb3IgaW4gbGF0ZXIgZXhlY3V0aW9uIHByb2dyZXNzLlxuICAgICAgLy8gVGh1cyBzYXZlIGN1cnJlbnQgc3RhY2sgZm9yIGxhdGVyIGRlYnVnLlxuICAgICAgc2V0dXBNaWRkbGV3YXJlLnN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s7XG4gICAgICByb3V0ZXJTZXR1cEZ1bmNzLnB1c2goc2V0dXBNaWRkbGV3YXJlKTtcbiAgICB9O1xuICB9KTtcblxuICAvKipcblx0ICogQ2FsbGJhY2sgZnVuY3Rpb25zIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGV4cHJlc3MgYXBwIGJlaW5nIGNyZWF0ZWRcblx0ICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uKGFwcCwgZXhwcmVzcylcblx0ICogZS5nLlxuXHQgKiBcdGFwaS5leHByZXNzQXBwU2V0KChhcHAsIGV4cHJlc3MpID0+IHtcbiBcdCAqIFx0XHRhcHAuc2V0KCd0cnVzdCBwcm94eScsIHRydWUpO1xuIFx0ICogXHRcdGFwcC5zZXQoJ3ZpZXdzJywgUGF0aC5yZXNvbHZlKGFwaS5jb25maWcoKS5yb290UGF0aCwgJy4uL3dlYi92aWV3cy8nKSk7XG4gXHQgKiBcdH0pO1xuXHQgKiBAcmV0dXJuIHZvaWRcblx0ICovXG4gIGFwaVByb3RvdHlwZS5leHByZXNzQXBwU2V0ID0gKGNhbGxiYWNrKSA9PiBhcHBTZXRzLnB1c2goY2FsbGJhY2spO1xuICBhcGlQcm90b3R5cGUuZXhwcmVzc0FwcFVzZSA9IChjYWxsYmFjaykgPT4gcm91dGVyU2V0dXBGdW5jcy5wdXNoKGNhbGxiYWNrKTtcbiAgLyoqXG5cdCAqIGUuZy5cblx0ICogXHRhcGkucm91dGVyKCkub3B0aW9ucygnL2FwaScsIGFwaS5jb3JzKCkpO1xuXHQgKiBcdGFwaS5yb3V0ZXIoKS5nZXQoJy9hcGknLCBhcGkuY29ycygpKTtcblx0ICogT3Jcblx0ICogIGFwaS5yb3V0ZXIoKS51c2UoJy9hcGknLCBhcGkuY29ycygpKTtcblx0ICogQHJldHVybiB2b2lkXG5cdCAqL1xuICBhcGlQcm90b3R5cGUuY29ycyA9IGZ1bmN0aW9uKGFsbG93ZWRPcmlnaW5zPzogc3RyaW5nW10pIHtcbiAgICBjb25zdCBzZXR0aW5nID0gYXBpLmNvbmZpZygpWydAd2ZoL2V4cHJlc3MtYXBwJ107XG4gICAgbGV0IGNvcnNPcHQgPSBzZXR0aW5nPy5lbmFibGVDT1JTO1xuICAgIGNvbnN0IGNvcnMgPSByZXF1aXJlKCdjb3JzJykgYXMgdHlwZW9mIF9jb3JzO1xuICAgIGNvbnN0IHdoaXRlT3JpZ2luU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgaWYgKF8uaXNBcnJheShjb3JzT3B0KSkge1xuICAgICAgY29yc09wdC5mb3JFYWNoKGRvbWFpbiA9PiB3aGl0ZU9yaWdpblNldC5hZGQoZG9tYWluKSk7XG4gICAgfVxuICAgIGxldCBjb3JzT3B0aW9uczogX2NvcnMuQ29yc09wdGlvbnM7XG4gICAgaWYgKGFsbG93ZWRPcmlnaW5zKSB7XG4gICAgICBjb3JzT3B0aW9ucyA9IHtcbiAgICAgICAgb3JpZ2luOiBhbGxvd2VkT3JpZ2lucyxcbiAgICAgICAgY3JlZGVudGlhbHM6IHRydWVcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvcnNPcHRpb25zID0ge1xuICAgICAgICAvLyBvcmlnaW46IFsnaHR0cDovL2xvY2FsaG9zdDoxNDMzMyddLFxuICAgICAgICBvcmlnaW4ob3JpZ2luOiBzdHJpbmcsIGNhbGxiYWNrOiAoX2FyZzogYW55LCBwYXNzOiBib29sZWFuKSA9PiB2b2lkKSB7XG4gICAgICAgICAgbGV0IHBhc3MgPSBvcmlnaW4gPT0gbnVsbCB8fCBjb3JzT3B0ID09PSB0cnVlIHx8IHdoaXRlT3JpZ2luU2V0LmhhcyhvcmlnaW4pO1xuICAgICAgICAgIGNhbGxiYWNrKHBhc3MgPyBudWxsIDoge3N0YXR1czogNDAwLCBtZXNzYWdlOiAnQmFkIFJlcXVlc3QgKENPUlMpIGZvciBvcmlnaW46ICcgKyBvcmlnaW59LFxuICAgICAgICAgICAgcGFzcyk7XG4gICAgICAgICAgaWYgKCFwYXNzKVxuICAgICAgICAgICAgbG9nLmluZm8oJ0NPUlMgcmVxdWVzdCBibG9ja2VkIGZvciBvcmlnaW46ICcgKyBvcmlnaW4pO1xuICAgICAgICB9LFxuICAgICAgICBjcmVkZW50aWFsczogdHJ1ZVxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGNvcnMoY29yc09wdGlvbnMpO1xuICB9O1xufVxuIl19