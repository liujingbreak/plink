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
            onListening(server, 'HTTP Server');
            __api_1.default.eventBus.emit('serverStarted', {});
        });
    }
    function startHttpsServer(app) {
        log.info('start HTTPS');
        const startPromises = [];
        var port = sslSetting.port ? sslSetting.port : 433;
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
            redirectHttpServer.listen(config().port ? config().port : 80);
            redirectHttpServer.on('error', (error) => {
                onError(server, port, error);
            });
            startPromises.push(new Promise(resolve => {
                redirectHttpServer.on('listening', () => resolve(redirectHttpServer));
            }));
        }
        Promise.all(startPromises)
            .then((servers) => {
            onListening(servers[0], 'HTTPS server');
            if (servers.length > 1)
                onListening(servers[1], 'HTTP Forwarding server');
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
    function onListening(server, title) {
        const addr = server.address();
        const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + JSON.stringify(addr, null, '\t');
        log.info('%s is listening on %s', title ? title : '', bind);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvaHR0cC1zZXJ2ZXIvdHMvc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUE2QjtBQUM3QixxREFBK0I7QUFDL0IsK0NBQXlCO0FBQ3pCLG1EQUE2QjtBQUM3QixxQ0FBcUM7QUFDckMsdURBQWlDO0FBQ2pDLDBEQUF3QjtBQUV4QixJQUFJLE1BQVcsQ0FBQztBQUNoQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM5QyxJQUFJLE1BQWtDLENBQUM7QUFFdkMsSUFBSSxpQkFBc0IsQ0FBQztBQUMzQixJQUFJO0lBQ0gsaUJBQWlCLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzlFLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7Q0FDaEQ7QUFBQyxPQUFNLENBQUMsRUFBRTtJQUNWLElBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxrQkFBa0IsRUFBRTtRQUNqQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9EQUFvRCxDQUFDLENBQUM7S0FDL0Q7Q0FDRDtBQUVELElBQUcsaUJBQWlCLEVBQUU7SUFDckIsZ0JBQWdCLEVBQUUsQ0FBQztDQUNuQjtBQUVELFNBQVMsZ0JBQWdCO0lBQ3hCLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO1FBQzlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUN0QyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNqQyxDQUFDLENBQUM7SUFDRixNQUFNLGVBQWUsR0FBRyxHQUFHLEVBQUU7UUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ3hDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxDQUFD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Q0FJQztBQUVELFNBQVMsY0FBYyxDQUFDLElBQVk7SUFDbkMsSUFBSTtRQUNILEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsT0FBTyxJQUFJLENBQUM7S0FDWjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1gsT0FBTyxLQUFLLENBQUM7S0FDYjtBQUNGLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci9odHRwLXNlcnZlci9kaXN0L3NlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tICdodHRwcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gdmFyIFByb21pc2UgPSByZXF1aXJlKCdibHVlYmlyZCcpO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcblxudmFyIGNvbmZpZzogYW55O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xudmFyIHNlcnZlcjogaHR0cHMuU2VydmVyIHwgaHR0cC5TZXJ2ZXI7XG5cbmxldCBoZWFsdGhDaGVja1NlcnZlcjogYW55O1xudHJ5IHtcblx0aGVhbHRoQ2hlY2tTZXJ2ZXIgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUgKyAnLm5vSGVhbHRoQ2hlY2snLCBmYWxzZSkgP1xuXHRcdGZhbHNlIDogcmVxdWlyZSgnQGJrL2Jramstbm9kZS1oZWFsdGgtc2VydmVyJyk7XG59IGNhdGNoKGUpIHtcblx0aWYoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcblx0XHRsb2cuaW5mbygnQGJrL2Jramstbm9kZS1oZWFsdGgtc2VydmVyIGlzIG5vdCBmb3VuZCwgc2tpcCBpdC4nKTtcblx0fVxufVxuXG5pZihoZWFsdGhDaGVja1NlcnZlcikge1xuXHRpbml0SGVhbHRoU2VydmVyKCk7XG59XG5cbmZ1bmN0aW9uIGluaXRIZWFsdGhTZXJ2ZXIoKSB7XG5cdGNvbnN0IHN0YXJ0SGVhbHRoU2VydmVyID0gKCkgPT4ge1xuXHRcdGxvZy5pbmZvKCdzdGFydCBIZWFsdGgtY2hlY2sgU2VydmVyJyk7XG5cdFx0aGVhbHRoQ2hlY2tTZXJ2ZXIuc3RhcnRTZXJ2ZXIoKTtcblx0fTtcblx0Y29uc3QgZW5kSGVhbHRoU2VydmVyID0gKCkgPT4ge1xuXHRcdGxvZy5pbmZvKCdIZWFsdGgtY2hlY2sgU2VydmVyIGlzIHNodXQnKTtcblx0XHRoZWFsdGhDaGVja1NlcnZlci5lbmRTZXJ2ZXIoKTtcblx0fTtcblx0YXBpLmV2ZW50QnVzLm9uKCdzZXJ2ZXJTdGFydGVkJywgc3RhcnRIZWFsdGhTZXJ2ZXIpO1xuXHRhcGkuZXZlbnRCdXMub24oJ3NlcnZlclN0b3BwZWQnLCBlbmRIZWFsdGhTZXJ2ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG5cdGNvbmZpZyA9IGFwaS5jb25maWc7XG5cdGNvbnN0IHJvb3RQYXRoOiBzdHJpbmcgPSBjb25maWcoKS5yb290UGF0aDtcblxuXHRjb25zdCBzc2xTZXR0aW5nOiBhbnkgPSBjb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcuc3NsJykgfHwgY29uZmlnKCkuc3NsO1xuXG5cdGlmIChzc2xTZXR0aW5nICYmIHNzbFNldHRpbmcuZW5hYmxlZCkge1xuXHRcdGlmICghc3NsU2V0dGluZy5rZXkpIHtcblx0XHRcdHNzbFNldHRpbmcua2V5ID0gJ2tleS5wZW0nO1xuXHRcdH1cblx0XHRpZiAoIXNzbFNldHRpbmcuY2VydCkge1xuXHRcdFx0c3NsU2V0dGluZy5jZXJ0ID0gJ2NlcnQucGVtJztcblx0XHR9XG5cdFx0aWYgKCFmaWxlQWNjZXNzYWJsZShQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcua2V5KSkpIHtcblx0XHRcdGxvZy5lcnJvcignVGhlcmUgaXMgbm8gZmlsZSBhdmFpbGFibGUgcmVmZXJlbmNlZCBieSBjb25maWcueWFtbCBwcm9wZXJ0eSBcInNzbFwiLlwia2V5XCIgJyArIHNzbFNldHRpbmcua2V5KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKCFmaWxlQWNjZXNzYWJsZShQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpKSB7XG5cdFx0XHRsb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIGZpbGUgYXZhaWxhYmxlIHJlZmVyZW5jZWQgYnkgY29uZmlnLnlhbWwgcHJvcGVydHkgXCJzc2xcIi5cImNlcnRcIiAnICsgc3NsU2V0dGluZy5jZXJ0KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0bG9nLmRlYnVnKCdTU0wgZW5hYmxlZCcpO1xuXHRcdGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsIHN0YXJ0SHR0cHNTZXJ2ZXIpO1xuXHR9IGVsc2Uge1xuXHRcdGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsIHN0YXJ0SHR0cFNlcnZlcik7XG5cdH1cblxuXHRmdW5jdGlvbiBzdGFydEh0dHBTZXJ2ZXIoYXBwOiBhbnkpIHtcblx0XHRsb2cuaW5mbygnc3RhcnQgSFRUUCcpO1xuXHRcdGNvbnN0IHBvcnQgPSBjb25maWcoKS5wb3J0ID8gY29uZmlnKCkucG9ydCA6IDgwO1xuXHRcdHNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKGFwcCk7XG5cdFx0Ly8gTm9kZSA4IGhhcyBhIGtlZXBBbGl2ZVRpbWVvdXQgYnVnIHdoaWNoIGRvZXNuJ3QgcmVzcGVjdCBhY3RpdmUgY29ubmVjdGlvbnMuXG5cdFx0Ly8gQ29ubmVjdGlvbnMgd2lsbCBlbmQgYWZ0ZXIgfjUgc2Vjb25kcyAoYXJiaXRyYXJ5KSwgb2Z0ZW4gbm90IGxldHRpbmcgdGhlIGZ1bGwgZG93bmxvYWRcblx0XHQvLyBvZiBsYXJnZSBwaWVjZXMgb2YgY29udGVudCwgc3VjaCBhcyBhIHZlbmRvciBqYXZhc2NyaXB0IGZpbGUuICBUaGlzIHJlc3VsdHMgaW4gYnJvd3NlcnNcblx0XHQvLyB0aHJvd2luZyBhIFwibmV0OjpFUlJfQ09OVEVOVF9MRU5HVEhfTUlTTUFUQ0hcIiBlcnJvci5cblx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9pc3N1ZXMvNzE5N1xuXHRcdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvMTMzOTFcblx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvY29tbWl0LzJjYjZmMmIyODFlYjk2YTdhYmUxNmQ1OGFmNmViYzljZTIzZDJlOTZcblx0XHRpZiAoL152OC5cXGQuXFxkKyQvLnRlc3QocHJvY2Vzcy52ZXJzaW9uKSkge1xuXHRcdFx0c2VydmVyLmtlZXBBbGl2ZVRpbWVvdXQgPSAzMDAwMDsgLy8gMzAgc2Vjb25kc1xuXHRcdH1cblx0XHRzZXJ2ZXIubGlzdGVuKHBvcnQpO1xuXHRcdHNlcnZlci5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xuXHRcdFx0b25FcnJvcihzZXJ2ZXIsIHBvcnQsIGVycik7XG5cdFx0fSk7XG5cdFx0c2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiB7XG5cdFx0XHRvbkxpc3RlbmluZyhzZXJ2ZXIsICdIVFRQIFNlcnZlcicpO1xuXHRcdFx0YXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0YXJ0ZWQnLCB7fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzdGFydEh0dHBzU2VydmVyKGFwcDogYW55KSB7XG5cdFx0bG9nLmluZm8oJ3N0YXJ0IEhUVFBTJyk7XG5cdFx0Y29uc3Qgc3RhcnRQcm9taXNlcyA9IFtdO1xuXHRcdHZhciBwb3J0OiBudW1iZXIgfCBzdHJpbmcgPSBzc2xTZXR0aW5nLnBvcnQgPyBzc2xTZXR0aW5nLnBvcnQgOiA0MzM7XG5cdFx0cG9ydCA9IHR5cGVvZihwb3J0KSA9PT0gJ251bWJlcicgPyBwb3J0IDogbm9ybWFsaXplUG9ydChwb3J0IGFzIHN0cmluZyk7XG5cdFx0c2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKHtcblx0XHRcdGtleTogZnMucmVhZEZpbGVTeW5jKHNzbFNldHRpbmcua2V5KSxcblx0XHRcdGNlcnQ6IGZzLnJlYWRGaWxlU3luYyhzc2xTZXR0aW5nLmNlcnQpXG5cdFx0fSwgYXBwKTtcblxuXHRcdHNlcnZlci5saXN0ZW4ocG9ydCk7XG5cdFx0aWYgKC9edjguXFxkLlxcZCskLy50ZXN0KHByb2Nlc3MudmVyc2lvbikpIHtcblx0XHRcdChzZXJ2ZXIgYXMgYW55KS5rZWVwQWxpdmVUaW1lb3V0ID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcblx0XHR9XG5cdFx0c2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcblx0XHRcdG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnJvcik7XG5cdFx0fSk7XG5cdFx0c3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuXHRcdFx0c2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHNlcnZlcikpO1xuXHRcdH0pKTtcblxuXHRcdGlmIChzc2xTZXR0aW5nLmh0dHBGb3J3YXJkICE9PSBmYWxzZSkge1xuXHRcdFx0Y29uc3QgcmVkaXJlY3RIdHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoKHJlcTogYW55LCByZXM6IGFueSkgPT4ge1xuXHRcdFx0XHRsb2cuZGVidWcoJ3JlcS5oZWFkZXJzLmhvc3Q6ICVqJywgcmVxLmhlYWRlcnMuaG9zdCk7XG5cdFx0XHRcdGNvbnN0IHVybCA9ICdodHRwczovLycgKyAvKFteOl0rKSg6WzAtOV0rKT8vLmV4ZWMocmVxLmhlYWRlcnMuaG9zdClbMV0gKyAnOicgKyBwb3J0O1xuXHRcdFx0XHRsb2cuZGVidWcoJ3JlZGlyZWN0IHRvICcgKyB1cmwpO1xuXHRcdFx0XHRyZXMud3JpdGVIZWFkKDMwNywge1xuXHRcdFx0XHRcdExvY2F0aW9uOiB1cmwsXG5cdFx0XHRcdFx0J0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJ1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmVzLmVuZCgnJyk7XG5cdFx0XHR9KTtcblx0XHRcdHJlZGlyZWN0SHR0cFNlcnZlci5saXN0ZW4oY29uZmlnKCkucG9ydCA/IGNvbmZpZygpLnBvcnQgOiA4MCk7XG5cdFx0XHRyZWRpcmVjdEh0dHBTZXJ2ZXIub24oJ2Vycm9yJywgKGVycm9yOiBFcnJvcikgPT4ge1xuXHRcdFx0XHRvbkVycm9yKHNlcnZlciwgcG9ydCwgZXJyb3IpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHN0YXJ0UHJvbWlzZXMucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcblx0XHRcdFx0cmVkaXJlY3RIdHRwU2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHJlZGlyZWN0SHR0cFNlcnZlcikpO1xuXHRcdFx0fSkpO1xuXHRcdH1cblx0XHRQcm9taXNlLmFsbChzdGFydFByb21pc2VzKVxuXHRcdC50aGVuKChzZXJ2ZXJzOiBhbnlbXSkgPT4ge1xuXHRcdFx0b25MaXN0ZW5pbmcoc2VydmVyc1swXSwgJ0hUVFBTIHNlcnZlcicpO1xuXHRcdFx0aWYgKHNlcnZlcnMubGVuZ3RoID4gMSlcblx0XHRcdFx0b25MaXN0ZW5pbmcoc2VydmVyc1sxXSwgJ0hUVFAgRm9yd2FyZGluZyBzZXJ2ZXInKTtcblx0XHRcdGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdGFydGVkJywge30pO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gbm9ybWFsaXplUG9ydCh2YWw6IHN0cmluZyk6IG51bWJlciB8IHN0cmluZyB7XG5cdFx0Y29uc3QgcG9ydCA9IHBhcnNlSW50KHZhbCBhcyBzdHJpbmcsIDEwKTtcblx0XHRpZiAoaXNOYU4ocG9ydCkpIHtcblx0XHRcdC8vIG5hbWVkIHBpcGVcblx0XHRcdHJldHVybiB2YWw7XG5cdFx0fVxuXG5cdFx0aWYgKHBvcnQgPj0gMCkge1xuXHRcdFx0Ly8gcG9ydCBudW1iZXJcblx0XHRcdHJldHVybiBwb3J0O1xuXHRcdH1cblx0XHR0aHJvdyBuZXcgRXJyb3IoJ3NzbC5wb3J0IG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBFdmVudCBsaXN0ZW5lciBmb3IgSFRUUCBzZXJ2ZXIgXCJsaXN0ZW5pbmdcIiBldmVudC5cblx0ICovXG5cdGZ1bmN0aW9uIG9uTGlzdGVuaW5nKHNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBodHRwcy5TZXJ2ZXIsIHRpdGxlOiBzdHJpbmcpIHtcblx0XHRjb25zdCBhZGRyID0gc2VydmVyLmFkZHJlc3MoKTtcblx0XHRjb25zdCBiaW5kID0gdHlwZW9mIGFkZHIgPT09ICdzdHJpbmcnID8gJ3BpcGUgJyArIGFkZHIgOiAncG9ydCAnICsgSlNPTi5zdHJpbmdpZnkoYWRkciwgbnVsbCwgJ1xcdCcpO1xuXHRcdGxvZy5pbmZvKCclcyBpcyBsaXN0ZW5pbmcgb24gJXMnLCB0aXRsZSA/IHRpdGxlIDogJycsIGJpbmQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEV2ZW50IGxpc3RlbmVyIGZvciBIVFRQIHNlcnZlciBcImVycm9yXCIgZXZlbnQuXG5cdCAqL1xuXHRmdW5jdGlvbiBvbkVycm9yKHNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBodHRwcy5TZXJ2ZXIsIHBvcnQ6IG51bWJlciB8IHN0cmluZywgZXJyb3I6IGFueSkge1xuXHRcdGxvZy5lcnJvcihlcnJvcik7XG5cdFx0aWYgKGVycm9yLnN5c2NhbGwgIT09ICdsaXN0ZW4nKSB7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9XG5cblx0XHRjb25zdCBiaW5kID0gdHlwZW9mIHBvcnQgPT09ICdzdHJpbmcnID8gJ1BpcGUgJyArIHBvcnQgOiAnUG9ydCAnICsgcG9ydDtcblxuXHRcdC8vIGhhbmRsZSBzcGVjaWZpYyBsaXN0ZW4gZXJyb3JzIHdpdGggZnJpZW5kbHkgbWVzc2FnZXNcblx0XHRzd2l0Y2ggKGVycm9yLmNvZGUpIHtcblx0XHRcdGNhc2UgJ0VBQ0NFUyc6XG5cdFx0XHRcdGxvZy5lcnJvcihiaW5kICsgJyByZXF1aXJlcyBlbGV2YXRlZCBwcml2aWxlZ2VzJyk7XG5cdFx0XHRcdHByb2Nlc3MuZXhpdCgxKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdFQUREUklOVVNFJzpcblx0XHRcdFx0bG9nLmVycm9yKGJpbmQgKyAnIGlzIGFscmVhZHkgaW4gdXNlJyk7XG5cdFx0XHRcdHByb2Nlc3MuZXhpdCgxKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG5cdGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdG9wcGVkJywge30pO1xuXHRzZXJ2ZXIuY2xvc2UoKTtcblx0bG9nLmluZm8oJ0hUVFAgc2VydmVyIGlzIHNodXQnKTtcbn1cblxuZnVuY3Rpb24gZmlsZUFjY2Vzc2FibGUoZmlsZTogc3RyaW5nKSB7XG5cdHRyeSB7XG5cdFx0ZnMuYWNjZXNzU3luYyhmaWxlLCBmcy5jb25zdGFudHMuUl9PSyk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cbiJdfQ==
