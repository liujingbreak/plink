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
// var Promise = require('bluebird');
const log4js = __importStar(require("log4js"));
const __api_1 = __importDefault(require("__api"));
const network_util_1 = require("@wfh/plink/wfh/dist/utils/network-util");
const log = log4js.getLogger(__api_1.default.packageName);
var server;
let healthCheckServer;
try {
    healthCheckServer = __api_1.default.config.get(__api_1.default.packageName + '.noHealthCheck', false) ?
        false : require('@bk/bkjk-node-health-server');
}
catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
        log.info('@bk/bkjk-node-health-server is not found, skip it.');
    }
}
if (healthCheckServer) {
    initHealthServer();
}
function initHealthServer() {
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
        const port = config().port ? config().port : 80;
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
    }
    function startHttpsServer(app) {
        log.info('start HTTPS');
        const startPromises = [];
        let port = sslSetting.port ? sslSetting.port : 433;
        let httpPort = config().port ? config().port : 80;
        port = typeof (port) === 'number' ? port : normalizePort(port);
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
        Promise.all(startPromises)
            .then((servers) => {
            onListening(servers[0], 'HTTPS server', port);
            if (servers.length > 1)
                onListening(servers[1], 'HTTP Forwarding server', httpPort);
            __api_1.default.eventBus.emit('serverStarted', {});
        });
    }
    function normalizePort(val) {
        const port = parseInt(val, 10);
        if (isNaN(port)) {
            // named pipe
            return val;
        }
        if (port >= 0) {
            // port number
            return port;
        }
        throw new Error('ssl.port must be a positive number');
    }
    /**
       * Event listener for HTTP server "listening" event.
       */
    function onListening(server, title, port) {
        const addr = network_util_1.getLanIPv4();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IscUNBQXFDO0FBQ3JDLCtDQUFpQztBQUNqQyxrREFBd0I7QUFDeEIseUVBQWtFO0FBRWxFLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzlDLElBQUksTUFBa0MsQ0FBQztBQUV2QyxJQUFJLGlCQUFzQixDQUFDO0FBQzNCLElBQUk7SUFDRixpQkFBaUIsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0UsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztDQUNsRDtBQUFDLE9BQU0sQ0FBQyxFQUFFO0lBQ1QsSUFBRyxDQUFDLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFO1FBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0RBQW9ELENBQUMsQ0FBQztLQUNoRTtDQUNGO0FBRUQsSUFBRyxpQkFBaUIsRUFBRTtJQUNwQixnQkFBZ0IsRUFBRSxDQUFDO0NBQ3BCO0FBRUQsU0FBUyxnQkFBZ0I7SUFDdkIsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLEVBQUU7UUFDN0IsR0FBRyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3RDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2xDLENBQUMsQ0FBQztJQUNGLE1BQU0sZUFBZSxHQUFHLEdBQUcsRUFBRTtRQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDeEMsaUJBQWlCLENB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SkQsZ0NBSUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxJQUFZO0lBQ2xDLElBQUk7UUFDRixFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vLyB2YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2JsdWViaXJkJyk7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL25ldHdvcmstdXRpbCc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcbnZhciBzZXJ2ZXI6IGh0dHBzLlNlcnZlciB8IGh0dHAuU2VydmVyO1xuXG5sZXQgaGVhbHRoQ2hlY2tTZXJ2ZXI6IGFueTtcbnRyeSB7XG4gIGhlYWx0aENoZWNrU2VydmVyID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lICsgJy5ub0hlYWx0aENoZWNrJywgZmFsc2UpID9cbiAgICBmYWxzZSA6IHJlcXVpcmUoJ0Biay9ia2prLW5vZGUtaGVhbHRoLXNlcnZlcicpO1xufSBjYXRjaChlKSB7XG4gIGlmKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgbG9nLmluZm8oJ0Biay9ia2prLW5vZGUtaGVhbHRoLXNlcnZlciBpcyBub3QgZm91bmQsIHNraXAgaXQuJyk7XG4gIH1cbn1cblxuaWYoaGVhbHRoQ2hlY2tTZXJ2ZXIpIHtcbiAgaW5pdEhlYWx0aFNlcnZlcigpO1xufVxuXG5mdW5jdGlvbiBpbml0SGVhbHRoU2VydmVyKCkge1xuICBjb25zdCBzdGFydEhlYWx0aFNlcnZlciA9ICgpID0+IHtcbiAgICBsb2cuaW5mbygnc3RhcnQgSGVhbHRoLWNoZWNrIFNlcnZlcicpO1xuICAgIGhlYWx0aENoZWNrU2VydmVyLnN0YXJ0U2VydmVyKCk7XG4gIH07XG4gIGNvbnN0IGVuZEhlYWx0aFNlcnZlciA9ICgpID0+IHtcbiAgICBsb2cuaW5mbygnSGVhbHRoLWNoZWNrIFNlcnZlciBpcyBzaHV0Jyk7XG4gICAgaGVhbHRoQ2hlY2tTZXJ2ZXIuZW5kU2VydmVyKCk7XG4gIH07XG4gIGFwaS5ldmVudEJ1cy5vbignc2VydmVyU3RhcnRlZCcsIHN0YXJ0SGVhbHRoU2VydmVyKTtcbiAgYXBpLmV2ZW50QnVzLm9uKCdzZXJ2ZXJTdG9wcGVkJywgZW5kSGVhbHRoU2VydmVyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICBjb25zdCBjb25maWcgPSBhcGkuY29uZmlnO1xuICBjb25zdCByb290UGF0aDogc3RyaW5nID0gY29uZmlnKCkucm9vdFBhdGg7XG5cbiAgY29uc3Qgc3NsU2V0dGluZzogYW55ID0gY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXS5zc2w7XG5cbiAgaWYgKHNzbFNldHRpbmcgJiYgc3NsU2V0dGluZy5lbmFibGVkKSB7XG4gICAgaWYgKCFzc2xTZXR0aW5nLmtleSkge1xuICAgICAgc3NsU2V0dGluZy5rZXkgPSAna2V5LnBlbSc7XG4gICAgfVxuICAgIGlmICghc3NsU2V0dGluZy5jZXJ0KSB7XG4gICAgICBzc2xTZXR0aW5nLmNlcnQgPSAnY2VydC5wZW0nO1xuICAgIH1cbiAgICBpZiAoIWZpbGVBY2Nlc3NhYmxlKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5rZXkpKSkge1xuICAgICAgbG9nLmVycm9yKCdUaGVyZSBpcyBubyBmaWxlIGF2YWlsYWJsZSByZWZlcmVuY2VkIGJ5IGNvbmZpZy55YW1sIHByb3BlcnR5IFwic3NsXCIuXCJrZXlcIiAnICsgUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmtleSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIWZpbGVBY2Nlc3NhYmxlKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5jZXJ0KSkpIHtcbiAgICAgIGxvZy5lcnJvcignVGhlcmUgaXMgbm8gZmlsZSBhdmFpbGFibGUgcmVmZXJlbmNlZCBieSBjb25maWcueWFtbCBwcm9wZXJ0eSBcInNzbFwiLlwiY2VydFwiICcgKyBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2cuZGVidWcoJ1NTTCBlbmFibGVkJyk7XG4gICAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgc3RhcnRIdHRwc1NlcnZlcik7XG4gIH0gZWxzZSB7XG4gICAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgc3RhcnRIdHRwU2VydmVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0YXJ0SHR0cFNlcnZlcihhcHA6IGFueSkge1xuICAgIGxvZy5pbmZvKCdzdGFydCBIVFRQJyk7XG4gICAgY29uc3QgcG9ydCA9IGNvbmZpZygpLnBvcnQgPyBjb25maWcoKS5wb3J0IDogODA7XG4gICAgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoYXBwKTtcbiAgICAvLyBOb2RlIDggaGFzIGEga2VlcEFsaXZlVGltZW91dCBidWcgd2hpY2ggZG9lc24ndCByZXNwZWN0IGFjdGl2ZSBjb25uZWN0aW9ucy5cbiAgICAvLyBDb25uZWN0aW9ucyB3aWxsIGVuZCBhZnRlciB+NSBzZWNvbmRzIChhcmJpdHJhcnkpLCBvZnRlbiBub3QgbGV0dGluZyB0aGUgZnVsbCBkb3dubG9hZFxuICAgIC8vIG9mIGxhcmdlIHBpZWNlcyBvZiBjb250ZW50LCBzdWNoIGFzIGEgdmVuZG9yIGphdmFzY3JpcHQgZmlsZS4gIFRoaXMgcmVzdWx0cyBpbiBicm93c2Vyc1xuICAgIC8vIHRocm93aW5nIGEgXCJuZXQ6OkVSUl9DT05URU5UX0xFTkdUSF9NSVNNQVRDSFwiIGVycm9yLlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL2lzc3Vlcy83MTk3XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2lzc3Vlcy8xMzM5MVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9jb21taXQvMmNiNmYyYjI4MWViOTZhN2FiZTE2ZDU4YWY2ZWJjOWNlMjNkMmU5NlxuICAgIGlmICgvXnY4LlxcZC5cXGQrJC8udGVzdChwcm9jZXNzLnZlcnNpb24pKSB7XG4gICAgICBzZXJ2ZXIua2VlcEFsaXZlVGltZW91dCA9IDMwMDAwOyAvLyAzMCBzZWNvbmRzXG4gICAgfVxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICBvbkVycm9yKHNlcnZlciwgcG9ydCwgZXJyKTtcbiAgICB9KTtcbiAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHtcbiAgICAgIG9uTGlzdGVuaW5nKHNlcnZlciwgJ0hUVFAgc2VydmVyJywgcG9ydCk7XG4gICAgICBhcGkuZXZlbnRCdXMuZW1pdCgnc2VydmVyU3RhcnRlZCcsIHt9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0YXJ0SHR0cHNTZXJ2ZXIoYXBwOiBhbnkpIHtcbiAgICBsb2cuaW5mbygnc3RhcnQgSFRUUFMnKTtcbiAgICBjb25zdCBzdGFydFByb21pc2VzID0gW107XG4gICAgbGV0IHBvcnQ6IG51bWJlciB8IHN0cmluZyA9IHNzbFNldHRpbmcucG9ydCA/IHNzbFNldHRpbmcucG9ydCA6IDQzMztcbiAgICBsZXQgaHR0cFBvcnQgPSBjb25maWcoKS5wb3J0ID8gY29uZmlnKCkucG9ydCA6IDgwO1xuXG4gICAgcG9ydCA9IHR5cGVvZihwb3J0KSA9PT0gJ251bWJlcicgPyBwb3J0IDogbm9ybWFsaXplUG9ydChwb3J0IGFzIHN0cmluZyk7XG4gICAgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKHtcbiAgICAgIGtleTogZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5rZXkpKSxcbiAgICAgIGNlcnQ6IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpXG4gICAgfSwgYXBwKTtcblxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgaWYgKC9edjguXFxkLlxcZCskLy50ZXN0KHByb2Nlc3MudmVyc2lvbikpIHtcbiAgICAgIChzZXJ2ZXIgYXMgYW55KS5rZWVwQWxpdmVUaW1lb3V0ID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcbiAgICB9XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnJvcik7XG4gICAgfSk7XG4gICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgc2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHNlcnZlcikpO1xuICAgIH0pKTtcblxuICAgIGlmIChzc2xTZXR0aW5nLmh0dHBGb3J3YXJkICE9PSBmYWxzZSkge1xuICAgICAgY29uc3QgcmVkaXJlY3RIdHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoKHJlcTogYW55LCByZXM6IGFueSkgPT4ge1xuICAgICAgICBsb2cuZGVidWcoJ3JlcS5oZWFkZXJzLmhvc3Q6ICVqJywgcmVxLmhlYWRlcnMuaG9zdCk7XG4gICAgICAgIGNvbnN0IHVybCA9ICdodHRwczovLycgKyAvKFteOl0rKSg6WzAtOV0rKT8vLmV4ZWMocmVxLmhlYWRlcnMuaG9zdCkhWzFdICsgJzonICsgcG9ydDtcbiAgICAgICAgbG9nLmRlYnVnKCdyZWRpcmVjdCB0byAnICsgdXJsKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCgzMDcsIHtcbiAgICAgICAgICBMb2NhdGlvbjogdXJsLFxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbidcbiAgICAgICAgfSk7XG4gICAgICAgIHJlcy5lbmQoJycpO1xuICAgICAgfSk7XG5cbiAgICAgIHJlZGlyZWN0SHR0cFNlcnZlci5saXN0ZW4oaHR0cFBvcnQpO1xuICAgICAgcmVkaXJlY3RIdHRwU2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgICAgb25FcnJvcihzZXJ2ZXIsIGh0dHBQb3J0LCBlcnJvcik7XG4gICAgICB9KTtcblxuICAgICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICByZWRpcmVjdEh0dHBTZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHJlc29sdmUocmVkaXJlY3RIdHRwU2VydmVyKSk7XG4gICAgICB9KSk7XG4gICAgfVxuXG4gICAgUHJvbWlzZS5hbGwoc3RhcnRQcm9taXNlcylcbiAgICAudGhlbigoc2VydmVyczogYW55W10pID0+IHtcbiAgICAgIG9uTGlzdGVuaW5nKHNlcnZlcnNbMF0sICdIVFRQUyBzZXJ2ZXInLCBwb3J0KTtcbiAgICAgIGlmIChzZXJ2ZXJzLmxlbmd0aCA+IDEpXG4gICAgICAgIG9uTGlzdGVuaW5nKHNlcnZlcnNbMV0sICdIVFRQIEZvcndhcmRpbmcgc2VydmVyJywgaHR0cFBvcnQpO1xuICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0YXJ0ZWQnLCB7fSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nKTogbnVtYmVyIHwgc3RyaW5nIHtcbiAgICBjb25zdCBwb3J0ID0gcGFyc2VJbnQodmFsIGFzIHN0cmluZywgMTApO1xuICAgIGlmIChpc05hTihwb3J0KSkge1xuICAgICAgLy8gbmFtZWQgcGlwZVxuICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG5cbiAgICBpZiAocG9ydCA+PSAwKSB7XG4gICAgICAvLyBwb3J0IG51bWJlclxuICAgICAgcmV0dXJuIHBvcnQ7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignc3NsLnBvcnQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB9XG5cbiAgLyoqXG5cdCAqIEV2ZW50IGxpc3RlbmVyIGZvciBIVFRQIHNlcnZlciBcImxpc3RlbmluZ1wiIGV2ZW50LlxuXHQgKi9cbiAgZnVuY3Rpb24gb25MaXN0ZW5pbmcoc2VydmVyOiBodHRwLlNlcnZlciB8IGh0dHBzLlNlcnZlciwgdGl0bGU6IHN0cmluZywgcG9ydDogbnVtYmVyIHwgc3RyaW5nKSB7XG4gICAgY29uc3QgYWRkciA9IGdldExhbklQdjQoKTtcbiAgICBsb2cuaW5mbyhgJHt0aXRsZX0gaXMgbGlzdGVuaW5nIG9uICR7YWRkcn06JHtwb3J0fWApO1xuICB9XG5cbiAgLyoqXG5cdCAqIEV2ZW50IGxpc3RlbmVyIGZvciBIVFRQIHNlcnZlciBcImVycm9yXCIgZXZlbnQuXG5cdCAqL1xuICBmdW5jdGlvbiBvbkVycm9yKHNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBodHRwcy5TZXJ2ZXIsIHBvcnQ6IG51bWJlciB8IHN0cmluZywgZXJyb3I6IGFueSkge1xuICAgIGxvZy5lcnJvcihlcnJvcik7XG4gICAgaWYgKGVycm9yLnN5c2NhbGwgIT09ICdsaXN0ZW4nKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBjb25zdCBiaW5kID0gdHlwZW9mIHBvcnQgPT09ICdzdHJpbmcnID8gJ1BpcGUgJyArIHBvcnQgOiAnUG9ydCAnICsgcG9ydDtcblxuICAgIC8vIGhhbmRsZSBzcGVjaWZpYyBsaXN0ZW4gZXJyb3JzIHdpdGggZnJpZW5kbHkgbWVzc2FnZXNcbiAgICBzd2l0Y2ggKGVycm9yLmNvZGUpIHtcbiAgICAgIGNhc2UgJ0VBQ0NFUyc6XG4gICAgICAgIGxvZy5lcnJvcihiaW5kICsgJyByZXF1aXJlcyBlbGV2YXRlZCBwcml2aWxlZ2VzJyk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdFQUREUklOVVNFJzpcbiAgICAgICAgbG9nLmVycm9yKGJpbmQgKyAnIGlzIGFscmVhZHkgaW4gdXNlJyk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdG9wcGVkJywge30pO1xuICBzZXJ2ZXIuY2xvc2UoKTtcbiAgbG9nLmluZm8oJ0hUVFAgc2VydmVyIGlzIHNodXQnKTtcbn1cblxuZnVuY3Rpb24gZmlsZUFjY2Vzc2FibGUoZmlsZTogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgZnMuYWNjZXNzU3luYyhmaWxlLCBmcy5jb25zdGFudHMuUl9PSyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==