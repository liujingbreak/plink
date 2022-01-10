"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const __api_1 = __importDefault(require("__api"));
const network_util_1 = require("@wfh/plink/wfh/dist/utils/network-util");
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
var server;
let healthCheckServer;
try {
    healthCheckServer = plink_1.config.get(__api_1.default.packageName + '.noHealthCheck', false) ?
        false : require('@bk/bkjk-node-health-server');
}
catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
        log.info('@bk/bkjk-node-health-server is not found, skip it.');
    }
}
if (healthCheckServer) {
    const startHealthServer = () => {
        log.info('start Health-check Server');
        healthCheckServer.startServer();
    };
    const endHealthServer = () => {
        log.info('Health-check Server is shut');
        healthCheckServer.endServer();
    };
    __api_1.default.eventBus.on('serverStarted', startHealthServer);
    __api_1.default.eventBus.on('serverStopped', endHealthServer);
}
function activate() {
    const config = __api_1.default.config;
    const rootPath = config().rootPath;
    const sslSetting = config()['@wfh/http-server'].ssl;
    if (sslSetting && sslSetting.enabled) {
        if (!sslSetting.key) {
            sslSetting.key = 'key.pem';
        }
        if (!sslSetting.cert) {
            sslSetting.cert = 'cert.pem';
        }
        if (!fileAccessable(Path.resolve(rootPath, sslSetting.key))) {
            log.error('There is no file available referenced by config.yaml property "ssl"."key" ' + Path.resolve(rootPath, sslSetting.key));
            return;
        }
        if (!fileAccessable(Path.resolve(rootPath, sslSetting.cert))) {
            log.error('There is no file available referenced by config.yaml property "ssl"."cert" ' + Path.resolve(rootPath, sslSetting.cert));
            return;
        }
        log.debug('SSL enabled');
        __api_1.default.eventBus.on('appCreated', startHttpsServer);
    }
    else {
        __api_1.default.eventBus.on('appCreated', startHttpServer);
    }
    function startHttpServer(app) {
        log.info('start HTTP');
        const port = Number(config().port ? config().port : 80);
        server = http.createServer(app);
        // Node 8 has a keepAliveTimeout bug which doesn't respect active connections.
        // Connections will end after ~5 seconds (arbitrary), often not letting the full download
        // of large pieces of content, such as a vendor javascript file.  This results in browsers
        // throwing a "net::ERR_CONTENT_LENGTH_MISMATCH" error.
        // https://github.com/angular/angular-cli/issues/7197
        // https://github.com/nodejs/node/issues/13391
        // https://github.com/nodejs/node/commit/2cb6f2b281eb96a7abe16d58af6ebc9ce23d2e96
        if (/^v8.\d.\d+$/.test(process.version)) {
            server.keepAliveTimeout = 30000; // 30 seconds
        }
        server.listen(port);
        server.on('error', (err) => {
            onError(server, port, err);
        });
        server.on('listening', () => {
            onListening(server, 'HTTP server', port);
            __api_1.default.eventBus.emit('serverStarted', {});
        });
        for (const hostname of config()['@wfh/http-server'].hostnames) {
            log.info('listen on additional host name:', hostname);
            server = http.createServer(app);
            server.listen(port, hostname);
            server.on('error', (err) => {
                onError(server, port, err);
            });
            server.on('listening', () => {
                onListening(server, 'HTTP server', port);
                __api_1.default.eventBus.emit('serverStarted', {});
            });
        }
    }
    function startHttpsServer(app) {
        log.info('start HTTPS');
        const startPromises = [];
        let port = Number(sslSetting.port ? sslSetting.port : 433);
        let httpPort = config().port ? config().port : 80;
        server = https.createServer({
            key: fs.readFileSync(Path.resolve(rootPath, sslSetting.key)),
            cert: fs.readFileSync(Path.resolve(rootPath, sslSetting.cert))
        }, app);
        server.listen(port);
        if (/^v8.\d.\d+$/.test(process.version)) {
            server.keepAliveTimeout = 30000; // 30 seconds
        }
        server.on('error', (error) => {
            onError(server, port, error);
        });
        startPromises.push(new Promise(resolve => {
            server.on('listening', () => resolve(server));
        }));
        for (const hostname of config()['@wfh/http-server'].hostnames) {
            log.info('listen on additional host name:', hostname);
            server = https.createServer({
                key: fs.readFileSync(Path.resolve(rootPath, sslSetting.key)),
                cert: fs.readFileSync(Path.resolve(rootPath, sslSetting.cert))
            }, app);
            server.listen(port, hostname);
            server.on('error', (error) => {
                onError(server, port, error);
            });
            startPromises.push(new Promise(resolve => {
                server.on('listening', () => resolve(server));
            }));
        }
        if (sslSetting.httpForward !== false) {
            const redirectHttpServer = http.createServer((req, res) => {
                log.debug('req.headers.host: %j', req.headers.host);
                const url = 'https://' + /([^:]+)(:[0-9]+)?/.exec(req.headers.host)[1] + ':' + port;
                log.debug('redirect to ' + url);
                res.writeHead(307, {
                    Location: url,
                    'Content-Type': 'text/plain'
                });
                res.end('');
            });
            redirectHttpServer.listen(httpPort);
            redirectHttpServer.on('error', (error) => {
                onError(server, httpPort, error);
            });
            startPromises.push(new Promise(resolve => {
                redirectHttpServer.on('listening', () => resolve(redirectHttpServer));
            }));
        }
        void Promise.all(startPromises)
            .then((servers) => {
            onListening(servers[0], 'HTTPS server', port);
            if (servers.length > 1)
                onListening(servers[1], 'HTTP Forwarding server', httpPort);
            __api_1.default.eventBus.emit('serverStarted', {});
        });
    }
    // function normalizePort(val: string): number | string {
    //   const port = parseInt(val , 10);
    //   if (isNaN(port)) {
    //     // named pipe
    //     return val;
    //   }
    //   if (port >= 0) {
    //     // port number
    //     return port;
    //   }
    //   throw new Error('ssl.port must be a positive number');
    // }
    /**
       * Event listener for HTTP server "listening" event.
       */
    function onListening(server, title, port) {
        const addr = (0, network_util_1.getLanIPv4)();
        log.info(`${title} is listening on ${addr}:${port}`);
    }
    /**
       * Event listener for HTTP server "error" event.
       */
    function onError(server, port, error) {
        log.error(error);
        if (error.syscall !== 'listen') {
            throw error;
        }
        const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                log.error(bind + ' requires elevated privileges');
                process.exit(1);
                break;
            case 'EADDRINUSE':
                log.error(bind + ' is already in use');
                process.exit(1);
                break;
            default:
                throw error;
        }
    }
}
exports.activate = activate;
function deactivate() {
    __api_1.default.eventBus.emit('serverStopped', {});
    server.close();
    log.info('HTTP server is shut');
}
exports.deactivate = deactivate;
function fileAccessable(file) {
    try {
        fs.accessSync(file, fs.constants.R_OK);
        return true;
    }
    catch (e) {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0Isa0RBQXdCO0FBQ3hCLHlFQUFrRTtBQUNsRSxzQ0FBNEM7QUFFNUMsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksTUFBa0MsQ0FBQztBQUV2QyxJQUFJLGlCQUF1RSxDQUFDO0FBQzVFLElBQUk7SUFDRixpQkFBaUIsR0FBRyxjQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6RSxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0NBQ2xEO0FBQUMsT0FBTyxDQUFDLEVBQUU7SUFDVixJQUFLLENBQXFCLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFO1FBQ3RELEdBQUcsQ0FBQyxJQUFJLENBQUMsb0RBQW9ELENBQUMsQ0FBQztLQUNoRTtDQUNGO0FBRUQsSUFBSSxpQkFBaUIsRUFBRTtJQUNyQixNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtRQUM3QixHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDdEMsaUJBQWtCLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDbkMsQ0FBQyxDQUFDO0lBQ0YsTUFBTSxlQUFlLEdBQUcsR0FBRyxFQUFFO1FBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUN4QyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNqQyxDQUFDLENBQUM7SUFDRixlQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsaUJB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QyxLQUFLLEVBQUUsQ0FBQztJQUNmLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNsQyxDQUFDO0FBSkQsZ0NBSUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxJQUFZO0lBQ2xDLElBQUk7UUFDRixFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7Z2V0TGFuSVB2NH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9uZXR3b3JrLXV0aWwnO1xuaW1wb3J0IHtsb2c0RmlsZSwgY29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcblxuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG52YXIgc2VydmVyOiBodHRwcy5TZXJ2ZXIgfCBodHRwLlNlcnZlcjtcblxubGV0IGhlYWx0aENoZWNrU2VydmVyOiB7c3RhcnRTZXJ2ZXIoKTogdm9pZDsgZW5kU2VydmVyKCk6IHZvaWR9IHwgdW5kZWZpbmVkO1xudHJ5IHtcbiAgaGVhbHRoQ2hlY2tTZXJ2ZXIgPSBjb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcubm9IZWFsdGhDaGVjaycsIGZhbHNlKSA/XG4gICAgZmFsc2UgOiByZXF1aXJlKCdAYmsvYmtqay1ub2RlLWhlYWx0aC1zZXJ2ZXInKTtcbn0gY2F0Y2ggKGUpIHtcbiAgaWYgKChlIGFzIHtjb2RlPzogc3RyaW5nfSkuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgbG9nLmluZm8oJ0Biay9ia2prLW5vZGUtaGVhbHRoLXNlcnZlciBpcyBub3QgZm91bmQsIHNraXAgaXQuJyk7XG4gIH1cbn1cblxuaWYgKGhlYWx0aENoZWNrU2VydmVyKSB7XG4gIGNvbnN0IHN0YXJ0SGVhbHRoU2VydmVyID0gKCkgPT4ge1xuICAgIGxvZy5pbmZvKCdzdGFydCBIZWFsdGgtY2hlY2sgU2VydmVyJyk7XG4gICAgaGVhbHRoQ2hlY2tTZXJ2ZXIhLnN0YXJ0U2VydmVyKCk7XG4gIH07XG4gIGNvbnN0IGVuZEhlYWx0aFNlcnZlciA9ICgpID0+IHtcbiAgICBsb2cuaW5mbygnSGVhbHRoLWNoZWNrIFNlcnZlciBpcyBzaHV0Jyk7XG4gICAgaGVhbHRoQ2hlY2tTZXJ2ZXIhLmVuZFNlcnZlcigpO1xuICB9O1xuICBhcGkuZXZlbnRCdXMub24oJ3NlcnZlclN0YXJ0ZWQnLCBzdGFydEhlYWx0aFNlcnZlcik7XG4gIGFwaS5ldmVudEJ1cy5vbignc2VydmVyU3RvcHBlZCcsIGVuZEhlYWx0aFNlcnZlcik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICBjb25zdCBjb25maWcgPSBhcGkuY29uZmlnO1xuICBjb25zdCByb290UGF0aDogc3RyaW5nID0gY29uZmlnKCkucm9vdFBhdGg7XG5cbiAgY29uc3Qgc3NsU2V0dGluZyA9IGNvbmZpZygpWydAd2ZoL2h0dHAtc2VydmVyJ10uc3NsO1xuXG4gIGlmIChzc2xTZXR0aW5nICYmIHNzbFNldHRpbmcuZW5hYmxlZCkge1xuICAgIGlmICghc3NsU2V0dGluZy5rZXkpIHtcbiAgICAgIHNzbFNldHRpbmcua2V5ID0gJ2tleS5wZW0nO1xuICAgIH1cbiAgICBpZiAoIXNzbFNldHRpbmcuY2VydCkge1xuICAgICAgc3NsU2V0dGluZy5jZXJ0ID0gJ2NlcnQucGVtJztcbiAgICB9XG4gICAgaWYgKCFmaWxlQWNjZXNzYWJsZShQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcua2V5KSkpIHtcbiAgICAgIGxvZy5lcnJvcignVGhlcmUgaXMgbm8gZmlsZSBhdmFpbGFibGUgcmVmZXJlbmNlZCBieSBjb25maWcueWFtbCBwcm9wZXJ0eSBcInNzbFwiLlwia2V5XCIgJyArIFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5rZXkpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFmaWxlQWNjZXNzYWJsZShQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpKSB7XG4gICAgICBsb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIGZpbGUgYXZhaWxhYmxlIHJlZmVyZW5jZWQgYnkgY29uZmlnLnlhbWwgcHJvcGVydHkgXCJzc2xcIi5cImNlcnRcIiAnICsgUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmNlcnQpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nLmRlYnVnKCdTU0wgZW5hYmxlZCcpO1xuICAgIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsIHN0YXJ0SHR0cHNTZXJ2ZXIpO1xuICB9IGVsc2Uge1xuICAgIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsIHN0YXJ0SHR0cFNlcnZlcik7XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydEh0dHBTZXJ2ZXIoYXBwOiBhbnkpIHtcbiAgICBsb2cuaW5mbygnc3RhcnQgSFRUUCcpO1xuICAgIGNvbnN0IHBvcnQgPSBOdW1iZXIoY29uZmlnKCkucG9ydCA/IGNvbmZpZygpLnBvcnQgOiA4MCk7XG4gICAgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoYXBwKTtcbiAgICAvLyBOb2RlIDggaGFzIGEga2VlcEFsaXZlVGltZW91dCBidWcgd2hpY2ggZG9lc24ndCByZXNwZWN0IGFjdGl2ZSBjb25uZWN0aW9ucy5cbiAgICAvLyBDb25uZWN0aW9ucyB3aWxsIGVuZCBhZnRlciB+NSBzZWNvbmRzIChhcmJpdHJhcnkpLCBvZnRlbiBub3QgbGV0dGluZyB0aGUgZnVsbCBkb3dubG9hZFxuICAgIC8vIG9mIGxhcmdlIHBpZWNlcyBvZiBjb250ZW50LCBzdWNoIGFzIGEgdmVuZG9yIGphdmFzY3JpcHQgZmlsZS4gIFRoaXMgcmVzdWx0cyBpbiBicm93c2Vyc1xuICAgIC8vIHRocm93aW5nIGEgXCJuZXQ6OkVSUl9DT05URU5UX0xFTkdUSF9NSVNNQVRDSFwiIGVycm9yLlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL2lzc3Vlcy83MTk3XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2lzc3Vlcy8xMzM5MVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9jb21taXQvMmNiNmYyYjI4MWViOTZhN2FiZTE2ZDU4YWY2ZWJjOWNlMjNkMmU5NlxuICAgIGlmICgvXnY4LlxcZC5cXGQrJC8udGVzdChwcm9jZXNzLnZlcnNpb24pKSB7XG4gICAgICBzZXJ2ZXIua2VlcEFsaXZlVGltZW91dCA9IDMwMDAwOyAvLyAzMCBzZWNvbmRzXG4gICAgfVxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICBvbkVycm9yKHNlcnZlciwgcG9ydCwgZXJyKTtcbiAgICB9KTtcbiAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHtcbiAgICAgIG9uTGlzdGVuaW5nKHNlcnZlciwgJ0hUVFAgc2VydmVyJywgcG9ydCk7XG4gICAgICBhcGkuZXZlbnRCdXMuZW1pdCgnc2VydmVyU3RhcnRlZCcsIHt9KTtcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3QgaG9zdG5hbWUgb2YgY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXS5ob3N0bmFtZXMpIHtcbiAgICAgIGxvZy5pbmZvKCdsaXN0ZW4gb24gYWRkaXRpb25hbCBob3N0IG5hbWU6JywgaG9zdG5hbWUpO1xuICAgICAgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoYXBwKTtcbiAgICAgIHNlcnZlci5saXN0ZW4ocG9ydCwgaG9zdG5hbWUpO1xuICAgICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnIpO1xuICAgICAgfSk7XG4gICAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHtcbiAgICAgICAgb25MaXN0ZW5pbmcoc2VydmVyLCAnSFRUUCBzZXJ2ZXInLCBwb3J0KTtcbiAgICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0YXJ0ZWQnLCB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydEh0dHBzU2VydmVyKGFwcDogYW55KSB7XG4gICAgbG9nLmluZm8oJ3N0YXJ0IEhUVFBTJyk7XG4gICAgY29uc3Qgc3RhcnRQcm9taXNlcyA9IFtdO1xuICAgIGxldCBwb3J0OiBudW1iZXIgPSBOdW1iZXIoc3NsU2V0dGluZy5wb3J0ID8gc3NsU2V0dGluZy5wb3J0IDogNDMzKTtcbiAgICBsZXQgaHR0cFBvcnQgPSBjb25maWcoKS5wb3J0ID8gY29uZmlnKCkucG9ydCA6IDgwO1xuXG4gICAgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKHtcbiAgICAgIGtleTogZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5rZXkpKSxcbiAgICAgIGNlcnQ6IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpXG4gICAgfSwgYXBwKTtcblxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgaWYgKC9edjguXFxkLlxcZCskLy50ZXN0KHByb2Nlc3MudmVyc2lvbikpIHtcbiAgICAgIChzZXJ2ZXIgYXMgYW55KS5rZWVwQWxpdmVUaW1lb3V0ID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcbiAgICB9XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnJvcik7XG4gICAgfSk7XG4gICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgc2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHNlcnZlcikpO1xuICAgIH0pKTtcblxuICAgIGZvciAoY29uc3QgaG9zdG5hbWUgb2YgY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXS5ob3N0bmFtZXMpIHtcbiAgICAgIGxvZy5pbmZvKCdsaXN0ZW4gb24gYWRkaXRpb25hbCBob3N0IG5hbWU6JywgaG9zdG5hbWUpO1xuICAgICAgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKHtcbiAgICAgICAga2V5OiBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmtleSkpLFxuICAgICAgICBjZXJ0OiBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmNlcnQpKVxuICAgICAgfSwgYXBwKTtcbiAgICAgIHNlcnZlci5saXN0ZW4ocG9ydCwgaG9zdG5hbWUpO1xuICAgICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgICAgb25FcnJvcihzZXJ2ZXIsIHBvcnQsIGVycm9yKTtcbiAgICAgIH0pO1xuICAgICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHJlc29sdmUoc2VydmVyKSk7XG4gICAgICB9KSk7XG5cbiAgICB9XG5cbiAgICBpZiAoc3NsU2V0dGluZy5odHRwRm9yd2FyZCAhPT0gZmFsc2UpIHtcbiAgICAgIGNvbnN0IHJlZGlyZWN0SHR0cFNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKChyZXE6IGFueSwgcmVzOiBhbnkpID0+IHtcbiAgICAgICAgbG9nLmRlYnVnKCdyZXEuaGVhZGVycy5ob3N0OiAlaicsIHJlcS5oZWFkZXJzLmhvc3QpO1xuICAgICAgICBjb25zdCB1cmwgPSAnaHR0cHM6Ly8nICsgLyhbXjpdKykoOlswLTldKyk/Ly5leGVjKHJlcS5oZWFkZXJzLmhvc3QpIVsxXSArICc6JyArIHBvcnQ7XG4gICAgICAgIGxvZy5kZWJ1ZygncmVkaXJlY3QgdG8gJyArIHVybCk7XG4gICAgICAgIHJlcy53cml0ZUhlYWQoMzA3LCB7XG4gICAgICAgICAgTG9jYXRpb246IHVybCxcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nXG4gICAgICAgIH0pO1xuICAgICAgICByZXMuZW5kKCcnKTtcbiAgICAgIH0pO1xuXG4gICAgICByZWRpcmVjdEh0dHBTZXJ2ZXIubGlzdGVuKGh0dHBQb3J0KTtcbiAgICAgIHJlZGlyZWN0SHR0cFNlcnZlci5vbignZXJyb3InLCAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAgIG9uRXJyb3Ioc2VydmVyLCBodHRwUG9ydCwgZXJyb3IpO1xuICAgICAgfSk7XG5cbiAgICAgIHN0YXJ0UHJvbWlzZXMucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgcmVkaXJlY3RIdHRwU2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHJlZGlyZWN0SHR0cFNlcnZlcikpO1xuICAgICAgfSkpO1xuICAgIH1cblxuICAgIHZvaWQgUHJvbWlzZS5hbGwoc3RhcnRQcm9taXNlcylcbiAgICAudGhlbigoc2VydmVyczogYW55W10pID0+IHtcbiAgICAgIG9uTGlzdGVuaW5nKHNlcnZlcnNbMF0sICdIVFRQUyBzZXJ2ZXInLCBwb3J0KTtcbiAgICAgIGlmIChzZXJ2ZXJzLmxlbmd0aCA+IDEpXG4gICAgICAgIG9uTGlzdGVuaW5nKHNlcnZlcnNbMV0sICdIVFRQIEZvcndhcmRpbmcgc2VydmVyJywgaHR0cFBvcnQpO1xuICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0YXJ0ZWQnLCB7fSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBmdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nKTogbnVtYmVyIHwgc3RyaW5nIHtcbiAgLy8gICBjb25zdCBwb3J0ID0gcGFyc2VJbnQodmFsICwgMTApO1xuICAvLyAgIGlmIChpc05hTihwb3J0KSkge1xuICAvLyAgICAgLy8gbmFtZWQgcGlwZVxuICAvLyAgICAgcmV0dXJuIHZhbDtcbiAgLy8gICB9XG5cbiAgLy8gICBpZiAocG9ydCA+PSAwKSB7XG4gIC8vICAgICAvLyBwb3J0IG51bWJlclxuICAvLyAgICAgcmV0dXJuIHBvcnQ7XG4gIC8vICAgfVxuICAvLyAgIHRocm93IG5ldyBFcnJvcignc3NsLnBvcnQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICAvLyB9XG5cbiAgLyoqXG5cdCAqIEV2ZW50IGxpc3RlbmVyIGZvciBIVFRQIHNlcnZlciBcImxpc3RlbmluZ1wiIGV2ZW50LlxuXHQgKi9cbiAgZnVuY3Rpb24gb25MaXN0ZW5pbmcoc2VydmVyOiBodHRwLlNlcnZlciB8IGh0dHBzLlNlcnZlciwgdGl0bGU6IHN0cmluZywgcG9ydDogbnVtYmVyIHwgc3RyaW5nKSB7XG4gICAgY29uc3QgYWRkciA9IGdldExhbklQdjQoKTtcbiAgICBsb2cuaW5mbyhgJHt0aXRsZX0gaXMgbGlzdGVuaW5nIG9uICR7YWRkcn06JHtwb3J0fWApO1xuICB9XG5cbiAgLyoqXG5cdCAqIEV2ZW50IGxpc3RlbmVyIGZvciBIVFRQIHNlcnZlciBcImVycm9yXCIgZXZlbnQuXG5cdCAqL1xuICBmdW5jdGlvbiBvbkVycm9yKHNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBodHRwcy5TZXJ2ZXIsIHBvcnQ6IG51bWJlciB8IHN0cmluZywgZXJyb3I6IGFueSkge1xuICAgIGxvZy5lcnJvcihlcnJvcik7XG4gICAgaWYgKGVycm9yLnN5c2NhbGwgIT09ICdsaXN0ZW4nKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBjb25zdCBiaW5kID0gdHlwZW9mIHBvcnQgPT09ICdzdHJpbmcnID8gJ1BpcGUgJyArIHBvcnQgOiAnUG9ydCAnICsgcG9ydDtcblxuICAgIC8vIGhhbmRsZSBzcGVjaWZpYyBsaXN0ZW4gZXJyb3JzIHdpdGggZnJpZW5kbHkgbWVzc2FnZXNcbiAgICBzd2l0Y2ggKGVycm9yLmNvZGUpIHtcbiAgICAgIGNhc2UgJ0VBQ0NFUyc6XG4gICAgICAgIGxvZy5lcnJvcihiaW5kICsgJyByZXF1aXJlcyBlbGV2YXRlZCBwcml2aWxlZ2VzJyk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdFQUREUklOVVNFJzpcbiAgICAgICAgbG9nLmVycm9yKGJpbmQgKyAnIGlzIGFscmVhZHkgaW4gdXNlJyk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdG9wcGVkJywge30pO1xuICBzZXJ2ZXIuY2xvc2UoKTtcbiAgbG9nLmluZm8oJ0hUVFAgc2VydmVyIGlzIHNodXQnKTtcbn1cblxuZnVuY3Rpb24gZmlsZUFjY2Vzc2FibGUoZmlsZTogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgZnMuYWNjZXNzU3luYyhmaWxlLCBmcy5jb25zdGFudHMuUl9PSyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==