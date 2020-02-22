"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const http = tslib_1.__importStar(require("http"));
const https = tslib_1.__importStar(require("https"));
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
// var Promise = require('bluebird');
const log4js = tslib_1.__importStar(require("log4js"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const network_util_1 = require("dr-comp-package/wfh/dist/utils/network-util");
var config;
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
    config = __api_1.default.config;
    const rootPath = config().rootPath;
    const sslSetting = config.get(__api_1.default.packageName + '.ssl') || config().ssl;
    if (sslSetting && sslSetting.enabled) {
        if (!sslSetting.key) {
            sslSetting.key = 'key.pem';
        }
        if (!sslSetting.cert) {
            sslSetting.cert = 'cert.pem';
        }
        if (!fileAccessable(Path.resolve(rootPath, sslSetting.key))) {
            log.error('There is no file available referenced by config.yaml property "ssl"."key" ' + sslSetting.key);
            return;
        }
        if (!fileAccessable(Path.resolve(rootPath, sslSetting.cert))) {
            log.error('There is no file available referenced by config.yaml property "ssl"."cert" ' + sslSetting.cert);
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
        port = typeof (port) === 'number' ? port : normalizePort(port);
        server = https.createServer({
            key: fs.readFileSync(sslSetting.key),
            cert: fs.readFileSync(sslSetting.cert)
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
            port = config().port ? config().port : 80;
            redirectHttpServer.listen(port);
            redirectHttpServer.on('error', (error) => {
                onError(server, port, error);
            });
            startPromises.push(new Promise(resolve => {
                redirectHttpServer.on('listening', () => resolve(redirectHttpServer));
            }));
        }
        Promise.all(startPromises)
            .then((servers) => {
            onListening(servers[0], 'HTTPS server', port);
            if (servers.length > 1)
                onListening(servers[1], 'HTTP Forwarding server', port);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvaHR0cC1zZXJ2ZXIvdHMvc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUE2QjtBQUM3QixxREFBK0I7QUFDL0IsK0NBQXlCO0FBQ3pCLG1EQUE2QjtBQUM3QixxQ0FBcUM7QUFDckMsdURBQWlDO0FBQ2pDLDBEQUF3QjtBQUN4Qiw4RUFBdUU7QUFFdkUsSUFBSSxNQUFXLENBQUM7QUFDaEIsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDOUMsSUFBSSxNQUFrQyxDQUFDO0FBRXZDLElBQUksaUJBQXNCLENBQUM7QUFDM0IsSUFBSTtJQUNGLGlCQUFpQixHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3RSxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0NBQ2xEO0FBQUMsT0FBTSxDQUFDLEVBQUU7SUFDVCxJQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssa0JBQWtCLEVBQUU7UUFDaEMsR0FBRyxDQUFDLElBQUksQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO0tBQ2hFO0NBQ0Y7QUFFRCxJQUFHLGlCQUFpQixFQUFFO0lBQ3BCLGdCQUFnQixFQUFFLENBQUM7Q0FDcEI7QUFFRCxTQUFTLGdCQUFnQjtJQUN2QixNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtRQUM3QixHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDdEMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDbEMsQ0FBQyxDQUFDO0lBQ0YsTUFBTSxlQUFlLEdBQUcsR0FBRyxFQUFFO1FBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUN4QyxpQkFBaUIsQ0FBQyxT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QUN2QyxPQUFPLElBQUksQ0FBQztLQUNiO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyL2h0dHAtc2VydmVyL2Rpc3Qvc2VydmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vLyB2YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2JsdWViaXJkJyk7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMvbmV0d29yay11dGlsJztcblxudmFyIGNvbmZpZzogYW55O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xudmFyIHNlcnZlcjogaHR0cHMuU2VydmVyIHwgaHR0cC5TZXJ2ZXI7XG5cbmxldCBoZWFsdGhDaGVja1NlcnZlcjogYW55O1xudHJ5IHtcbiAgaGVhbHRoQ2hlY2tTZXJ2ZXIgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUgKyAnLm5vSGVhbHRoQ2hlY2snLCBmYWxzZSkgP1xuICAgIGZhbHNlIDogcmVxdWlyZSgnQGJrL2Jramstbm9kZS1oZWFsdGgtc2VydmVyJyk7XG59IGNhdGNoKGUpIHtcbiAgaWYoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICBsb2cuaW5mbygnQGJrL2Jramstbm9kZS1oZWFsdGgtc2VydmVyIGlzIG5vdCBmb3VuZCwgc2tpcCBpdC4nKTtcbiAgfVxufVxuXG5pZihoZWFsdGhDaGVja1NlcnZlcikge1xuICBpbml0SGVhbHRoU2VydmVyKCk7XG59XG5cbmZ1bmN0aW9uIGluaXRIZWFsdGhTZXJ2ZXIoKSB7XG4gIGNvbnN0IHN0YXJ0SGVhbHRoU2VydmVyID0gKCkgPT4ge1xuICAgIGxvZy5pbmZvKCdzdGFydCBIZWFsdGgtY2hlY2sgU2VydmVyJyk7XG4gICAgaGVhbHRoQ2hlY2tTZXJ2ZXIuc3RhcnRTZXJ2ZXIoKTtcbiAgfTtcbiAgY29uc3QgZW5kSGVhbHRoU2VydmVyID0gKCkgPT4ge1xuICAgIGxvZy5pbmZvKCdIZWFsdGgtY2hlY2sgU2VydmVyIGlzIHNodXQnKTtcbiAgICBoZWFsdGhDaGVja1NlcnZlci5lbmRTZXJ2ZXIoKTtcbiAgfTtcbiAgYXBpLmV2ZW50QnVzLm9uKCdzZXJ2ZXJTdGFydGVkJywgc3RhcnRIZWFsdGhTZXJ2ZXIpO1xuICBhcGkuZXZlbnRCdXMub24oJ3NlcnZlclN0b3BwZWQnLCBlbmRIZWFsdGhTZXJ2ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIGNvbmZpZyA9IGFwaS5jb25maWc7XG4gIGNvbnN0IHJvb3RQYXRoOiBzdHJpbmcgPSBjb25maWcoKS5yb290UGF0aDtcblxuICBjb25zdCBzc2xTZXR0aW5nOiBhbnkgPSBjb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcuc3NsJykgfHwgY29uZmlnKCkuc3NsO1xuXG4gIGlmIChzc2xTZXR0aW5nICYmIHNzbFNldHRpbmcuZW5hYmxlZCkge1xuICAgIGlmICghc3NsU2V0dGluZy5rZXkpIHtcbiAgICAgIHNzbFNldHRpbmcua2V5ID0gJ2tleS5wZW0nO1xuICAgIH1cbiAgICBpZiAoIXNzbFNldHRpbmcuY2VydCkge1xuICAgICAgc3NsU2V0dGluZy5jZXJ0ID0gJ2NlcnQucGVtJztcbiAgICB9XG4gICAgaWYgKCFmaWxlQWNjZXNzYWJsZShQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcua2V5KSkpIHtcbiAgICAgIGxvZy5lcnJvcignVGhlcmUgaXMgbm8gZmlsZSBhdmFpbGFibGUgcmVmZXJlbmNlZCBieSBjb25maWcueWFtbCBwcm9wZXJ0eSBcInNzbFwiLlwia2V5XCIgJyArIHNzbFNldHRpbmcua2V5KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFmaWxlQWNjZXNzYWJsZShQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpKSB7XG4gICAgICBsb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIGZpbGUgYXZhaWxhYmxlIHJlZmVyZW5jZWQgYnkgY29uZmlnLnlhbWwgcHJvcGVydHkgXCJzc2xcIi5cImNlcnRcIiAnICsgc3NsU2V0dGluZy5jZXJ0KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nLmRlYnVnKCdTU0wgZW5hYmxlZCcpO1xuICAgIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsIHN0YXJ0SHR0cHNTZXJ2ZXIpO1xuICB9IGVsc2Uge1xuICAgIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsIHN0YXJ0SHR0cFNlcnZlcik7XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydEh0dHBTZXJ2ZXIoYXBwOiBhbnkpIHtcbiAgICBsb2cuaW5mbygnc3RhcnQgSFRUUCcpO1xuICAgIGNvbnN0IHBvcnQgPSBjb25maWcoKS5wb3J0ID8gY29uZmlnKCkucG9ydCA6IDgwO1xuICAgIHNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKGFwcCk7XG4gICAgLy8gTm9kZSA4IGhhcyBhIGtlZXBBbGl2ZVRpbWVvdXQgYnVnIHdoaWNoIGRvZXNuJ3QgcmVzcGVjdCBhY3RpdmUgY29ubmVjdGlvbnMuXG4gICAgLy8gQ29ubmVjdGlvbnMgd2lsbCBlbmQgYWZ0ZXIgfjUgc2Vjb25kcyAoYXJiaXRyYXJ5KSwgb2Z0ZW4gbm90IGxldHRpbmcgdGhlIGZ1bGwgZG93bmxvYWRcbiAgICAvLyBvZiBsYXJnZSBwaWVjZXMgb2YgY29udGVudCwgc3VjaCBhcyBhIHZlbmRvciBqYXZhc2NyaXB0IGZpbGUuICBUaGlzIHJlc3VsdHMgaW4gYnJvd3NlcnNcbiAgICAvLyB0aHJvd2luZyBhIFwibmV0OjpFUlJfQ09OVEVOVF9MRU5HVEhfTUlTTUFUQ0hcIiBlcnJvci5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9pc3N1ZXMvNzE5N1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvMTMzOTFcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvY29tbWl0LzJjYjZmMmIyODFlYjk2YTdhYmUxNmQ1OGFmNmViYzljZTIzZDJlOTZcbiAgICBpZiAoL152OC5cXGQuXFxkKyQvLnRlc3QocHJvY2Vzcy52ZXJzaW9uKSkge1xuICAgICAgc2VydmVyLmtlZXBBbGl2ZVRpbWVvdXQgPSAzMDAwMDsgLy8gMzAgc2Vjb25kc1xuICAgIH1cbiAgICBzZXJ2ZXIubGlzdGVuKHBvcnQpO1xuICAgIHNlcnZlci5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgb25FcnJvcihzZXJ2ZXIsIHBvcnQsIGVycik7XG4gICAgfSk7XG4gICAgc2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiB7XG4gICAgICBvbkxpc3RlbmluZyhzZXJ2ZXIsICdIVFRQIHNlcnZlcicsIHBvcnQpO1xuICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0YXJ0ZWQnLCB7fSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydEh0dHBzU2VydmVyKGFwcDogYW55KSB7XG4gICAgbG9nLmluZm8oJ3N0YXJ0IEhUVFBTJyk7XG4gICAgY29uc3Qgc3RhcnRQcm9taXNlcyA9IFtdO1xuICAgIGxldCBwb3J0OiBudW1iZXIgfCBzdHJpbmcgPSBzc2xTZXR0aW5nLnBvcnQgPyBzc2xTZXR0aW5nLnBvcnQgOiA0MzM7XG4gICAgcG9ydCA9IHR5cGVvZihwb3J0KSA9PT0gJ251bWJlcicgPyBwb3J0IDogbm9ybWFsaXplUG9ydChwb3J0IGFzIHN0cmluZyk7XG4gICAgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKHtcbiAgICAgIGtleTogZnMucmVhZEZpbGVTeW5jKHNzbFNldHRpbmcua2V5KSxcbiAgICAgIGNlcnQ6IGZzLnJlYWRGaWxlU3luYyhzc2xTZXR0aW5nLmNlcnQpXG4gICAgfSwgYXBwKTtcblxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgaWYgKC9edjguXFxkLlxcZCskLy50ZXN0KHByb2Nlc3MudmVyc2lvbikpIHtcbiAgICAgIChzZXJ2ZXIgYXMgYW55KS5rZWVwQWxpdmVUaW1lb3V0ID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcbiAgICB9XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnJvcik7XG4gICAgfSk7XG4gICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgc2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHNlcnZlcikpO1xuICAgIH0pKTtcblxuICAgIGlmIChzc2xTZXR0aW5nLmh0dHBGb3J3YXJkICE9PSBmYWxzZSkge1xuICAgICAgY29uc3QgcmVkaXJlY3RIdHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoKHJlcTogYW55LCByZXM6IGFueSkgPT4ge1xuICAgICAgICBsb2cuZGVidWcoJ3JlcS5oZWFkZXJzLmhvc3Q6ICVqJywgcmVxLmhlYWRlcnMuaG9zdCk7XG4gICAgICAgIGNvbnN0IHVybCA9ICdodHRwczovLycgKyAvKFteOl0rKSg6WzAtOV0rKT8vLmV4ZWMocmVxLmhlYWRlcnMuaG9zdCkhWzFdICsgJzonICsgcG9ydDtcbiAgICAgICAgbG9nLmRlYnVnKCdyZWRpcmVjdCB0byAnICsgdXJsKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCgzMDcsIHtcbiAgICAgICAgICBMb2NhdGlvbjogdXJsLFxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbidcbiAgICAgICAgfSk7XG4gICAgICAgIHJlcy5lbmQoJycpO1xuICAgICAgfSk7XG4gICAgICBwb3J0ID0gY29uZmlnKCkucG9ydCA/IGNvbmZpZygpLnBvcnQgOiA4MDtcbiAgICAgIHJlZGlyZWN0SHR0cFNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgICByZWRpcmVjdEh0dHBTZXJ2ZXIub24oJ2Vycm9yJywgKGVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgICBvbkVycm9yKHNlcnZlciwgcG9ydCwgZXJyb3IpO1xuICAgICAgfSk7XG5cbiAgICAgIHN0YXJ0UHJvbWlzZXMucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgcmVkaXJlY3RIdHRwU2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHJlZGlyZWN0SHR0cFNlcnZlcikpO1xuICAgICAgfSkpO1xuICAgIH1cblxuICAgIFByb21pc2UuYWxsKHN0YXJ0UHJvbWlzZXMpXG4gICAgLnRoZW4oKHNlcnZlcnM6IGFueVtdKSA9PiB7XG4gICAgICBvbkxpc3RlbmluZyhzZXJ2ZXJzWzBdLCAnSFRUUFMgc2VydmVyJywgcG9ydCk7XG4gICAgICBpZiAoc2VydmVycy5sZW5ndGggPiAxKVxuICAgICAgICBvbkxpc3RlbmluZyhzZXJ2ZXJzWzFdLCAnSFRUUCBGb3J3YXJkaW5nIHNlcnZlcicsIHBvcnQpO1xuICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0YXJ0ZWQnLCB7fSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nKTogbnVtYmVyIHwgc3RyaW5nIHtcbiAgICBjb25zdCBwb3J0ID0gcGFyc2VJbnQodmFsIGFzIHN0cmluZywgMTApO1xuICAgIGlmIChpc05hTihwb3J0KSkge1xuICAgICAgLy8gbmFtZWQgcGlwZVxuICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG5cbiAgICBpZiAocG9ydCA+PSAwKSB7XG4gICAgICAvLyBwb3J0IG51bWJlclxuICAgICAgcmV0dXJuIHBvcnQ7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignc3NsLnBvcnQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB9XG5cbiAgLyoqXG5cdCAqIEV2ZW50IGxpc3RlbmVyIGZvciBIVFRQIHNlcnZlciBcImxpc3RlbmluZ1wiIGV2ZW50LlxuXHQgKi9cbiAgZnVuY3Rpb24gb25MaXN0ZW5pbmcoc2VydmVyOiBodHRwLlNlcnZlciB8IGh0dHBzLlNlcnZlciwgdGl0bGU6IHN0cmluZywgcG9ydDogbnVtYmVyIHwgc3RyaW5nKSB7XG4gICAgY29uc3QgYWRkciA9IGdldExhbklQdjQoKTtcbiAgICBsb2cuaW5mbyhgJHt0aXRsZX0gaXMgbGlzdGVuaW5nIG9uICR7YWRkcn06JHtwb3J0fWApO1xuICB9XG5cbiAgLyoqXG5cdCAqIEV2ZW50IGxpc3RlbmVyIGZvciBIVFRQIHNlcnZlciBcImVycm9yXCIgZXZlbnQuXG5cdCAqL1xuICBmdW5jdGlvbiBvbkVycm9yKHNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBodHRwcy5TZXJ2ZXIsIHBvcnQ6IG51bWJlciB8IHN0cmluZywgZXJyb3I6IGFueSkge1xuICAgIGxvZy5lcnJvcihlcnJvcik7XG4gICAgaWYgKGVycm9yLnN5c2NhbGwgIT09ICdsaXN0ZW4nKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBjb25zdCBiaW5kID0gdHlwZW9mIHBvcnQgPT09ICdzdHJpbmcnID8gJ1BpcGUgJyArIHBvcnQgOiAnUG9ydCAnICsgcG9ydDtcblxuICAgIC8vIGhhbmRsZSBzcGVjaWZpYyBsaXN0ZW4gZXJyb3JzIHdpdGggZnJpZW5kbHkgbWVzc2FnZXNcbiAgICBzd2l0Y2ggKGVycm9yLmNvZGUpIHtcbiAgICAgIGNhc2UgJ0VBQ0NFUyc6XG4gICAgICAgIGxvZy5lcnJvcihiaW5kICsgJyByZXF1aXJlcyBlbGV2YXRlZCBwcml2aWxlZ2VzJyk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdFQUREUklOVVNFJzpcbiAgICAgICAgbG9nLmVycm9yKGJpbmQgKyAnIGlzIGFscmVhZHkgaW4gdXNlJyk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdG9wcGVkJywge30pO1xuICBzZXJ2ZXIuY2xvc2UoKTtcbiAgbG9nLmluZm8oJ0hUVFAgc2VydmVyIGlzIHNodXQnKTtcbn1cblxuZnVuY3Rpb24gZmlsZUFjY2Vzc2FibGUoZmlsZTogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgZnMuYWNjZXNzU3luYyhmaWxlLCBmcy5jb25zdGFudHMuUl9PSyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==
