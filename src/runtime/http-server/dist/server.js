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
    healthCheckServer = __api_1.default.config.get(__api_1.default.packageName + '.noHealthCheck', false) ?
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
        void Promise.all(startPromises)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0Isa0RBQXdCO0FBQ3hCLHlFQUFrRTtBQUNsRSxzQ0FBb0M7QUFFcEMsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksTUFBa0MsQ0FBQztBQUV2QyxJQUFJLGlCQUF1RSxDQUFDO0FBQzVFLElBQUk7SUFDRixpQkFBaUIsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0UsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztDQUNsRDtBQUFDLE9BQU8sQ0FBQyxFQUFFO0lBQ1YsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFO1FBQ2pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0RBQW9ELENBQUMsQ0FBQztLQUNoRTtDQUNGO0FBRUQsSUFBSSxpQkFBaUIsRUFBRTtJQUNyQixNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtRQUM3QixHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDdEMsaUJBQWtCLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDbkMsQ0FBQyxDQUFDO0lBQ0YsTUFBTSxlQUFlLEdBQUcsR0FBRyxFQUFFO1FBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUN4QyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNqQyxDQUFDLENBQUM7SUFDRixlQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxlQUFl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QyxJQUFJLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxPQUFPLElBQUksQ0FBQztLQUNiO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tICdodHRwcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge2dldExhbklQdjR9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbmV0d29yay11dGlsJztcbmltcG9ydCB7bG9nNEZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbnZhciBzZXJ2ZXI6IGh0dHBzLlNlcnZlciB8IGh0dHAuU2VydmVyO1xuXG5sZXQgaGVhbHRoQ2hlY2tTZXJ2ZXI6IHtzdGFydFNlcnZlcigpOiB2b2lkOyBlbmRTZXJ2ZXIoKTogdm9pZH0gfCB1bmRlZmluZWQ7XG50cnkge1xuICBoZWFsdGhDaGVja1NlcnZlciA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcubm9IZWFsdGhDaGVjaycsIGZhbHNlKSA/XG4gICAgZmFsc2UgOiByZXF1aXJlKCdAYmsvYmtqay1ub2RlLWhlYWx0aC1zZXJ2ZXInKTtcbn0gY2F0Y2ggKGUpIHtcbiAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgbG9nLmluZm8oJ0Biay9ia2prLW5vZGUtaGVhbHRoLXNlcnZlciBpcyBub3QgZm91bmQsIHNraXAgaXQuJyk7XG4gIH1cbn1cblxuaWYgKGhlYWx0aENoZWNrU2VydmVyKSB7XG4gIGNvbnN0IHN0YXJ0SGVhbHRoU2VydmVyID0gKCkgPT4ge1xuICAgIGxvZy5pbmZvKCdzdGFydCBIZWFsdGgtY2hlY2sgU2VydmVyJyk7XG4gICAgaGVhbHRoQ2hlY2tTZXJ2ZXIhLnN0YXJ0U2VydmVyKCk7XG4gIH07XG4gIGNvbnN0IGVuZEhlYWx0aFNlcnZlciA9ICgpID0+IHtcbiAgICBsb2cuaW5mbygnSGVhbHRoLWNoZWNrIFNlcnZlciBpcyBzaHV0Jyk7XG4gICAgaGVhbHRoQ2hlY2tTZXJ2ZXIhLmVuZFNlcnZlcigpO1xuICB9O1xuICBhcGkuZXZlbnRCdXMub24oJ3NlcnZlclN0YXJ0ZWQnLCBzdGFydEhlYWx0aFNlcnZlcik7XG4gIGFwaS5ldmVudEJ1cy5vbignc2VydmVyU3RvcHBlZCcsIGVuZEhlYWx0aFNlcnZlcik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICBjb25zdCBjb25maWcgPSBhcGkuY29uZmlnO1xuICBjb25zdCByb290UGF0aDogc3RyaW5nID0gY29uZmlnKCkucm9vdFBhdGg7XG5cbiAgY29uc3Qgc3NsU2V0dGluZzogYW55ID0gY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXS5zc2w7XG5cbiAgaWYgKHNzbFNldHRpbmcgJiYgc3NsU2V0dGluZy5lbmFibGVkKSB7XG4gICAgaWYgKCFzc2xTZXR0aW5nLmtleSkge1xuICAgICAgc3NsU2V0dGluZy5rZXkgPSAna2V5LnBlbSc7XG4gICAgfVxuICAgIGlmICghc3NsU2V0dGluZy5jZXJ0KSB7XG4gICAgICBzc2xTZXR0aW5nLmNlcnQgPSAnY2VydC5wZW0nO1xuICAgIH1cbiAgICBpZiAoIWZpbGVBY2Nlc3NhYmxlKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5rZXkpKSkge1xuICAgICAgbG9nLmVycm9yKCdUaGVyZSBpcyBubyBmaWxlIGF2YWlsYWJsZSByZWZlcmVuY2VkIGJ5IGNvbmZpZy55YW1sIHByb3BlcnR5IFwic3NsXCIuXCJrZXlcIiAnICsgUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmtleSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIWZpbGVBY2Nlc3NhYmxlKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5jZXJ0KSkpIHtcbiAgICAgIGxvZy5lcnJvcignVGhlcmUgaXMgbm8gZmlsZSBhdmFpbGFibGUgcmVmZXJlbmNlZCBieSBjb25maWcueWFtbCBwcm9wZXJ0eSBcInNzbFwiLlwiY2VydFwiICcgKyBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2cuZGVidWcoJ1NTTCBlbmFibGVkJyk7XG4gICAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgc3RhcnRIdHRwc1NlcnZlcik7XG4gIH0gZWxzZSB7XG4gICAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgc3RhcnRIdHRwU2VydmVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0YXJ0SHR0cFNlcnZlcihhcHA6IGFueSkge1xuICAgIGxvZy5pbmZvKCdzdGFydCBIVFRQJyk7XG4gICAgY29uc3QgcG9ydCA9IGNvbmZpZygpLnBvcnQgPyBjb25maWcoKS5wb3J0IDogODA7XG4gICAgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoYXBwKTtcbiAgICAvLyBOb2RlIDggaGFzIGEga2VlcEFsaXZlVGltZW91dCBidWcgd2hpY2ggZG9lc24ndCByZXNwZWN0IGFjdGl2ZSBjb25uZWN0aW9ucy5cbiAgICAvLyBDb25uZWN0aW9ucyB3aWxsIGVuZCBhZnRlciB+NSBzZWNvbmRzIChhcmJpdHJhcnkpLCBvZnRlbiBub3QgbGV0dGluZyB0aGUgZnVsbCBkb3dubG9hZFxuICAgIC8vIG9mIGxhcmdlIHBpZWNlcyBvZiBjb250ZW50LCBzdWNoIGFzIGEgdmVuZG9yIGphdmFzY3JpcHQgZmlsZS4gIFRoaXMgcmVzdWx0cyBpbiBicm93c2Vyc1xuICAgIC8vIHRocm93aW5nIGEgXCJuZXQ6OkVSUl9DT05URU5UX0xFTkdUSF9NSVNNQVRDSFwiIGVycm9yLlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL2lzc3Vlcy83MTk3XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2lzc3Vlcy8xMzM5MVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9jb21taXQvMmNiNmYyYjI4MWViOTZhN2FiZTE2ZDU4YWY2ZWJjOWNlMjNkMmU5NlxuICAgIGlmICgvXnY4LlxcZC5cXGQrJC8udGVzdChwcm9jZXNzLnZlcnNpb24pKSB7XG4gICAgICBzZXJ2ZXIua2VlcEFsaXZlVGltZW91dCA9IDMwMDAwOyAvLyAzMCBzZWNvbmRzXG4gICAgfVxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICBvbkVycm9yKHNlcnZlciwgcG9ydCwgZXJyKTtcbiAgICB9KTtcbiAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHtcbiAgICAgIG9uTGlzdGVuaW5nKHNlcnZlciwgJ0hUVFAgc2VydmVyJywgcG9ydCk7XG4gICAgICBhcGkuZXZlbnRCdXMuZW1pdCgnc2VydmVyU3RhcnRlZCcsIHt9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0YXJ0SHR0cHNTZXJ2ZXIoYXBwOiBhbnkpIHtcbiAgICBsb2cuaW5mbygnc3RhcnQgSFRUUFMnKTtcbiAgICBjb25zdCBzdGFydFByb21pc2VzID0gW107XG4gICAgbGV0IHBvcnQ6IG51bWJlciB8IHN0cmluZyA9IHNzbFNldHRpbmcucG9ydCA/IHNzbFNldHRpbmcucG9ydCA6IDQzMztcbiAgICBsZXQgaHR0cFBvcnQgPSBjb25maWcoKS5wb3J0ID8gY29uZmlnKCkucG9ydCA6IDgwO1xuXG4gICAgcG9ydCA9IHR5cGVvZihwb3J0KSA9PT0gJ251bWJlcicgPyBwb3J0IDogbm9ybWFsaXplUG9ydChwb3J0ICk7XG4gICAgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKHtcbiAgICAgIGtleTogZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5rZXkpKSxcbiAgICAgIGNlcnQ6IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpXG4gICAgfSwgYXBwKTtcblxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgaWYgKC9edjguXFxkLlxcZCskLy50ZXN0KHByb2Nlc3MudmVyc2lvbikpIHtcbiAgICAgIChzZXJ2ZXIgYXMgYW55KS5rZWVwQWxpdmVUaW1lb3V0ID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcbiAgICB9XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnJvcik7XG4gICAgfSk7XG4gICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgc2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHNlcnZlcikpO1xuICAgIH0pKTtcblxuICAgIGlmIChzc2xTZXR0aW5nLmh0dHBGb3J3YXJkICE9PSBmYWxzZSkge1xuICAgICAgY29uc3QgcmVkaXJlY3RIdHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoKHJlcTogYW55LCByZXM6IGFueSkgPT4ge1xuICAgICAgICBsb2cuZGVidWcoJ3JlcS5oZWFkZXJzLmhvc3Q6ICVqJywgcmVxLmhlYWRlcnMuaG9zdCk7XG4gICAgICAgIGNvbnN0IHVybCA9ICdodHRwczovLycgKyAvKFteOl0rKSg6WzAtOV0rKT8vLmV4ZWMocmVxLmhlYWRlcnMuaG9zdCkhWzFdICsgJzonICsgcG9ydDtcbiAgICAgICAgbG9nLmRlYnVnKCdyZWRpcmVjdCB0byAnICsgdXJsKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCgzMDcsIHtcbiAgICAgICAgICBMb2NhdGlvbjogdXJsLFxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbidcbiAgICAgICAgfSk7XG4gICAgICAgIHJlcy5lbmQoJycpO1xuICAgICAgfSk7XG5cbiAgICAgIHJlZGlyZWN0SHR0cFNlcnZlci5saXN0ZW4oaHR0cFBvcnQpO1xuICAgICAgcmVkaXJlY3RIdHRwU2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgICAgb25FcnJvcihzZXJ2ZXIsIGh0dHBQb3J0LCBlcnJvcik7XG4gICAgICB9KTtcblxuICAgICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICByZWRpcmVjdEh0dHBTZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHJlc29sdmUocmVkaXJlY3RIdHRwU2VydmVyKSk7XG4gICAgICB9KSk7XG4gICAgfVxuXG4gICAgdm9pZCBQcm9taXNlLmFsbChzdGFydFByb21pc2VzKVxuICAgIC50aGVuKChzZXJ2ZXJzOiBhbnlbXSkgPT4ge1xuICAgICAgb25MaXN0ZW5pbmcoc2VydmVyc1swXSwgJ0hUVFBTIHNlcnZlcicsIHBvcnQpO1xuICAgICAgaWYgKHNlcnZlcnMubGVuZ3RoID4gMSlcbiAgICAgICAgb25MaXN0ZW5pbmcoc2VydmVyc1sxXSwgJ0hUVFAgRm9yd2FyZGluZyBzZXJ2ZXInLCBodHRwUG9ydCk7XG4gICAgICBhcGkuZXZlbnRCdXMuZW1pdCgnc2VydmVyU3RhcnRlZCcsIHt9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVBvcnQodmFsOiBzdHJpbmcpOiBudW1iZXIgfCBzdHJpbmcge1xuICAgIGNvbnN0IHBvcnQgPSBwYXJzZUludCh2YWwgLCAxMCk7XG4gICAgaWYgKGlzTmFOKHBvcnQpKSB7XG4gICAgICAvLyBuYW1lZCBwaXBlXG4gICAgICByZXR1cm4gdmFsO1xuICAgIH1cblxuICAgIGlmIChwb3J0ID49IDApIHtcbiAgICAgIC8vIHBvcnQgbnVtYmVyXG4gICAgICByZXR1cm4gcG9ydDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzc2wucG9ydCBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIH1cblxuICAvKipcblx0ICogRXZlbnQgbGlzdGVuZXIgZm9yIEhUVFAgc2VydmVyIFwibGlzdGVuaW5nXCIgZXZlbnQuXG5cdCAqL1xuICBmdW5jdGlvbiBvbkxpc3RlbmluZyhzZXJ2ZXI6IGh0dHAuU2VydmVyIHwgaHR0cHMuU2VydmVyLCB0aXRsZTogc3RyaW5nLCBwb3J0OiBudW1iZXIgfCBzdHJpbmcpIHtcbiAgICBjb25zdCBhZGRyID0gZ2V0TGFuSVB2NCgpO1xuICAgIGxvZy5pbmZvKGAke3RpdGxlfSBpcyBsaXN0ZW5pbmcgb24gJHthZGRyfToke3BvcnR9YCk7XG4gIH1cblxuICAvKipcblx0ICogRXZlbnQgbGlzdGVuZXIgZm9yIEhUVFAgc2VydmVyIFwiZXJyb3JcIiBldmVudC5cblx0ICovXG4gIGZ1bmN0aW9uIG9uRXJyb3Ioc2VydmVyOiBodHRwLlNlcnZlciB8IGh0dHBzLlNlcnZlciwgcG9ydDogbnVtYmVyIHwgc3RyaW5nLCBlcnJvcjogYW55KSB7XG4gICAgbG9nLmVycm9yKGVycm9yKTtcbiAgICBpZiAoZXJyb3Iuc3lzY2FsbCAhPT0gJ2xpc3RlbicpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGNvbnN0IGJpbmQgPSB0eXBlb2YgcG9ydCA9PT0gJ3N0cmluZycgPyAnUGlwZSAnICsgcG9ydCA6ICdQb3J0ICcgKyBwb3J0O1xuXG4gICAgLy8gaGFuZGxlIHNwZWNpZmljIGxpc3RlbiBlcnJvcnMgd2l0aCBmcmllbmRseSBtZXNzYWdlc1xuICAgIHN3aXRjaCAoZXJyb3IuY29kZSkge1xuICAgICAgY2FzZSAnRUFDQ0VTJzpcbiAgICAgICAgbG9nLmVycm9yKGJpbmQgKyAnIHJlcXVpcmVzIGVsZXZhdGVkIHByaXZpbGVnZXMnKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ0VBRERSSU5VU0UnOlxuICAgICAgICBsb2cuZXJyb3IoYmluZCArICcgaXMgYWxyZWFkeSBpbiB1c2UnKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgYXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0b3BwZWQnLCB7fSk7XG4gIHNlcnZlci5jbG9zZSgpO1xuICBsb2cuaW5mbygnSFRUUCBzZXJ2ZXIgaXMgc2h1dCcpO1xufVxuXG5mdW5jdGlvbiBmaWxlQWNjZXNzYWJsZShmaWxlOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBmcy5hY2Nlc3NTeW5jKGZpbGUsIGZzLmNvbnN0YW50cy5SX09LKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19