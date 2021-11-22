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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0Isa0RBQXdCO0FBQ3hCLHlFQUFrRTtBQUNsRSxzQ0FBb0M7QUFFcEMsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksTUFBa0MsQ0FBQztBQUV2QyxJQUFJLGlCQUF1RSxDQUFDO0FBQzVFLElBQUk7SUFDRixpQkFBaUIsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0UsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztDQUNsRDtBQUFDLE9BQU8sQ0FBQyxFQUFFO0lBQ1YsSUFBSyxDQUFxQixDQUFDLElBQUksS0FBSyxrQkFBa0IsRUFBRTtRQUN0RCxHQUFHLENBQUMsSUFBSSxDQUFDLG9EQUFvRCxDQUFDLENBQUM7S0FDaEU7Q0FDRjtBQUVELElBQUksaUJBQWlCLEVBQUU7SUFDckIsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLEVBQUU7UUFDN0IsR0FBRyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3RDLGlCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ25DLENBQUMsQ0FBQztJQUNGLE1BQU0sZUFBZSxHQUFHLEdBQUcsRUFBRTtRQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDeEMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDakMsQ0FBQyxDQUFDO0lBQ0YsZUFBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsZUFB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QUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL25ldHdvcmstdXRpbCc7XG5pbXBvcnQge2xvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcblxuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG52YXIgc2VydmVyOiBodHRwcy5TZXJ2ZXIgfCBodHRwLlNlcnZlcjtcblxubGV0IGhlYWx0aENoZWNrU2VydmVyOiB7c3RhcnRTZXJ2ZXIoKTogdm9pZDsgZW5kU2VydmVyKCk6IHZvaWR9IHwgdW5kZWZpbmVkO1xudHJ5IHtcbiAgaGVhbHRoQ2hlY2tTZXJ2ZXIgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUgKyAnLm5vSGVhbHRoQ2hlY2snLCBmYWxzZSkgP1xuICAgIGZhbHNlIDogcmVxdWlyZSgnQGJrL2Jramstbm9kZS1oZWFsdGgtc2VydmVyJyk7XG59IGNhdGNoIChlKSB7XG4gIGlmICgoZSBhcyB7Y29kZT86IHN0cmluZ30pLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgIGxvZy5pbmZvKCdAYmsvYmtqay1ub2RlLWhlYWx0aC1zZXJ2ZXIgaXMgbm90IGZvdW5kLCBza2lwIGl0LicpO1xuICB9XG59XG5cbmlmIChoZWFsdGhDaGVja1NlcnZlcikge1xuICBjb25zdCBzdGFydEhlYWx0aFNlcnZlciA9ICgpID0+IHtcbiAgICBsb2cuaW5mbygnc3RhcnQgSGVhbHRoLWNoZWNrIFNlcnZlcicpO1xuICAgIGhlYWx0aENoZWNrU2VydmVyIS5zdGFydFNlcnZlcigpO1xuICB9O1xuICBjb25zdCBlbmRIZWFsdGhTZXJ2ZXIgPSAoKSA9PiB7XG4gICAgbG9nLmluZm8oJ0hlYWx0aC1jaGVjayBTZXJ2ZXIgaXMgc2h1dCcpO1xuICAgIGhlYWx0aENoZWNrU2VydmVyIS5lbmRTZXJ2ZXIoKTtcbiAgfTtcbiAgYXBpLmV2ZW50QnVzLm9uKCdzZXJ2ZXJTdGFydGVkJywgc3RhcnRIZWFsdGhTZXJ2ZXIpO1xuICBhcGkuZXZlbnRCdXMub24oJ3NlcnZlclN0b3BwZWQnLCBlbmRIZWFsdGhTZXJ2ZXIpO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbiAgY29uc3QgY29uZmlnID0gYXBpLmNvbmZpZztcbiAgY29uc3Qgcm9vdFBhdGg6IHN0cmluZyA9IGNvbmZpZygpLnJvb3RQYXRoO1xuXG4gIGNvbnN0IHNzbFNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9odHRwLXNlcnZlciddLnNzbDtcblxuICBpZiAoc3NsU2V0dGluZyAmJiBzc2xTZXR0aW5nLmVuYWJsZWQpIHtcbiAgICBpZiAoIXNzbFNldHRpbmcua2V5KSB7XG4gICAgICBzc2xTZXR0aW5nLmtleSA9ICdrZXkucGVtJztcbiAgICB9XG4gICAgaWYgKCFzc2xTZXR0aW5nLmNlcnQpIHtcbiAgICAgIHNzbFNldHRpbmcuY2VydCA9ICdjZXJ0LnBlbSc7XG4gICAgfVxuICAgIGlmICghZmlsZUFjY2Vzc2FibGUoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmtleSkpKSB7XG4gICAgICBsb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIGZpbGUgYXZhaWxhYmxlIHJlZmVyZW5jZWQgYnkgY29uZmlnLnlhbWwgcHJvcGVydHkgXCJzc2xcIi5cImtleVwiICcgKyBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcua2V5KSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghZmlsZUFjY2Vzc2FibGUoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmNlcnQpKSkge1xuICAgICAgbG9nLmVycm9yKCdUaGVyZSBpcyBubyBmaWxlIGF2YWlsYWJsZSByZWZlcmVuY2VkIGJ5IGNvbmZpZy55YW1sIHByb3BlcnR5IFwic3NsXCIuXCJjZXJ0XCIgJyArIFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5jZXJ0KSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZy5kZWJ1ZygnU1NMIGVuYWJsZWQnKTtcbiAgICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCBzdGFydEh0dHBzU2VydmVyKTtcbiAgfSBlbHNlIHtcbiAgICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCBzdGFydEh0dHBTZXJ2ZXIpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnRIdHRwU2VydmVyKGFwcDogYW55KSB7XG4gICAgbG9nLmluZm8oJ3N0YXJ0IEhUVFAnKTtcbiAgICBjb25zdCBwb3J0ID0gY29uZmlnKCkucG9ydCA/IGNvbmZpZygpLnBvcnQgOiA4MDtcbiAgICBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcihhcHApO1xuICAgIC8vIE5vZGUgOCBoYXMgYSBrZWVwQWxpdmVUaW1lb3V0IGJ1ZyB3aGljaCBkb2Vzbid0IHJlc3BlY3QgYWN0aXZlIGNvbm5lY3Rpb25zLlxuICAgIC8vIENvbm5lY3Rpb25zIHdpbGwgZW5kIGFmdGVyIH41IHNlY29uZHMgKGFyYml0cmFyeSksIG9mdGVuIG5vdCBsZXR0aW5nIHRoZSBmdWxsIGRvd25sb2FkXG4gICAgLy8gb2YgbGFyZ2UgcGllY2VzIG9mIGNvbnRlbnQsIHN1Y2ggYXMgYSB2ZW5kb3IgamF2YXNjcmlwdCBmaWxlLiAgVGhpcyByZXN1bHRzIGluIGJyb3dzZXJzXG4gICAgLy8gdGhyb3dpbmcgYSBcIm5ldDo6RVJSX0NPTlRFTlRfTEVOR1RIX01JU01BVENIXCIgZXJyb3IuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvaXNzdWVzLzcxOTdcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvaXNzdWVzLzEzMzkxXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2NvbW1pdC8yY2I2ZjJiMjgxZWI5NmE3YWJlMTZkNThhZjZlYmM5Y2UyM2QyZTk2XG4gICAgaWYgKC9edjguXFxkLlxcZCskLy50ZXN0KHByb2Nlc3MudmVyc2lvbikpIHtcbiAgICAgIHNlcnZlci5rZWVwQWxpdmVUaW1lb3V0ID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcbiAgICB9XG4gICAgc2VydmVyLmxpc3Rlbihwb3J0KTtcbiAgICBzZXJ2ZXIub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcbiAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnIpO1xuICAgIH0pO1xuICAgIHNlcnZlci5vbignbGlzdGVuaW5nJywgKCkgPT4ge1xuICAgICAgb25MaXN0ZW5pbmcoc2VydmVyLCAnSFRUUCBzZXJ2ZXInLCBwb3J0KTtcbiAgICAgIGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdGFydGVkJywge30pO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnRIdHRwc1NlcnZlcihhcHA6IGFueSkge1xuICAgIGxvZy5pbmZvKCdzdGFydCBIVFRQUycpO1xuICAgIGNvbnN0IHN0YXJ0UHJvbWlzZXMgPSBbXTtcbiAgICBsZXQgcG9ydDogbnVtYmVyIHwgc3RyaW5nID0gc3NsU2V0dGluZy5wb3J0ID8gc3NsU2V0dGluZy5wb3J0IDogNDMzO1xuICAgIGxldCBodHRwUG9ydCA9IGNvbmZpZygpLnBvcnQgPyBjb25maWcoKS5wb3J0IDogODA7XG5cbiAgICBwb3J0ID0gdHlwZW9mKHBvcnQpID09PSAnbnVtYmVyJyA/IHBvcnQgOiBub3JtYWxpemVQb3J0KHBvcnQgKTtcbiAgICBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoe1xuICAgICAga2V5OiBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmtleSkpLFxuICAgICAgY2VydDogZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5jZXJ0KSlcbiAgICB9LCBhcHApO1xuXG4gICAgc2VydmVyLmxpc3Rlbihwb3J0KTtcbiAgICBpZiAoL152OC5cXGQuXFxkKyQvLnRlc3QocHJvY2Vzcy52ZXJzaW9uKSkge1xuICAgICAgKHNlcnZlciBhcyBhbnkpLmtlZXBBbGl2ZVRpbWVvdXQgPSAzMDAwMDsgLy8gMzAgc2Vjb25kc1xuICAgIH1cbiAgICBzZXJ2ZXIub24oJ2Vycm9yJywgKGVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgb25FcnJvcihzZXJ2ZXIsIHBvcnQsIGVycm9yKTtcbiAgICB9KTtcbiAgICBzdGFydFByb21pc2VzLnB1c2gobmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHJlc29sdmUoc2VydmVyKSk7XG4gICAgfSkpO1xuXG4gICAgaWYgKHNzbFNldHRpbmcuaHR0cEZvcndhcmQgIT09IGZhbHNlKSB7XG4gICAgICBjb25zdCByZWRpcmVjdEh0dHBTZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcigocmVxOiBhbnksIHJlczogYW55KSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZygncmVxLmhlYWRlcnMuaG9zdDogJWonLCByZXEuaGVhZGVycy5ob3N0KTtcbiAgICAgICAgY29uc3QgdXJsID0gJ2h0dHBzOi8vJyArIC8oW146XSspKDpbMC05XSspPy8uZXhlYyhyZXEuaGVhZGVycy5ob3N0KSFbMV0gKyAnOicgKyBwb3J0O1xuICAgICAgICBsb2cuZGVidWcoJ3JlZGlyZWN0IHRvICcgKyB1cmwpO1xuICAgICAgICByZXMud3JpdGVIZWFkKDMwNywge1xuICAgICAgICAgIExvY2F0aW9uOiB1cmwsXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJ1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzLmVuZCgnJyk7XG4gICAgICB9KTtcblxuICAgICAgcmVkaXJlY3RIdHRwU2VydmVyLmxpc3RlbihodHRwUG9ydCk7XG4gICAgICByZWRpcmVjdEh0dHBTZXJ2ZXIub24oJ2Vycm9yJywgKGVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgICBvbkVycm9yKHNlcnZlciwgaHR0cFBvcnQsIGVycm9yKTtcbiAgICAgIH0pO1xuXG4gICAgICBzdGFydFByb21pc2VzLnB1c2gobmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIHJlZGlyZWN0SHR0cFNlcnZlci5vbignbGlzdGVuaW5nJywgKCkgPT4gcmVzb2x2ZShyZWRpcmVjdEh0dHBTZXJ2ZXIpKTtcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICB2b2lkIFByb21pc2UuYWxsKHN0YXJ0UHJvbWlzZXMpXG4gICAgLnRoZW4oKHNlcnZlcnM6IGFueVtdKSA9PiB7XG4gICAgICBvbkxpc3RlbmluZyhzZXJ2ZXJzWzBdLCAnSFRUUFMgc2VydmVyJywgcG9ydCk7XG4gICAgICBpZiAoc2VydmVycy5sZW5ndGggPiAxKVxuICAgICAgICBvbkxpc3RlbmluZyhzZXJ2ZXJzWzFdLCAnSFRUUCBGb3J3YXJkaW5nIHNlcnZlcicsIGh0dHBQb3J0KTtcbiAgICAgIGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdGFydGVkJywge30pO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplUG9ydCh2YWw6IHN0cmluZyk6IG51bWJlciB8IHN0cmluZyB7XG4gICAgY29uc3QgcG9ydCA9IHBhcnNlSW50KHZhbCAsIDEwKTtcbiAgICBpZiAoaXNOYU4ocG9ydCkpIHtcbiAgICAgIC8vIG5hbWVkIHBpcGVcbiAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuXG4gICAgaWYgKHBvcnQgPj0gMCkge1xuICAgICAgLy8gcG9ydCBudW1iZXJcbiAgICAgIHJldHVybiBwb3J0O1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NzbC5wb3J0IG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBFdmVudCBsaXN0ZW5lciBmb3IgSFRUUCBzZXJ2ZXIgXCJsaXN0ZW5pbmdcIiBldmVudC5cblx0ICovXG4gIGZ1bmN0aW9uIG9uTGlzdGVuaW5nKHNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBodHRwcy5TZXJ2ZXIsIHRpdGxlOiBzdHJpbmcsIHBvcnQ6IG51bWJlciB8IHN0cmluZykge1xuICAgIGNvbnN0IGFkZHIgPSBnZXRMYW5JUHY0KCk7XG4gICAgbG9nLmluZm8oYCR7dGl0bGV9IGlzIGxpc3RlbmluZyBvbiAke2FkZHJ9OiR7cG9ydH1gKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBFdmVudCBsaXN0ZW5lciBmb3IgSFRUUCBzZXJ2ZXIgXCJlcnJvclwiIGV2ZW50LlxuXHQgKi9cbiAgZnVuY3Rpb24gb25FcnJvcihzZXJ2ZXI6IGh0dHAuU2VydmVyIHwgaHR0cHMuU2VydmVyLCBwb3J0OiBudW1iZXIgfCBzdHJpbmcsIGVycm9yOiBhbnkpIHtcbiAgICBsb2cuZXJyb3IoZXJyb3IpO1xuICAgIGlmIChlcnJvci5zeXNjYWxsICE9PSAnbGlzdGVuJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgY29uc3QgYmluZCA9IHR5cGVvZiBwb3J0ID09PSAnc3RyaW5nJyA/ICdQaXBlICcgKyBwb3J0IDogJ1BvcnQgJyArIHBvcnQ7XG5cbiAgICAvLyBoYW5kbGUgc3BlY2lmaWMgbGlzdGVuIGVycm9ycyB3aXRoIGZyaWVuZGx5IG1lc3NhZ2VzXG4gICAgc3dpdGNoIChlcnJvci5jb2RlKSB7XG4gICAgICBjYXNlICdFQUNDRVMnOlxuICAgICAgICBsb2cuZXJyb3IoYmluZCArICcgcmVxdWlyZXMgZWxldmF0ZWQgcHJpdmlsZWdlcycpO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnRUFERFJJTlVTRSc6XG4gICAgICAgIGxvZy5lcnJvcihiaW5kICsgJyBpcyBhbHJlYWR5IGluIHVzZScpO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWFjdGl2YXRlKCkge1xuICBhcGkuZXZlbnRCdXMuZW1pdCgnc2VydmVyU3RvcHBlZCcsIHt9KTtcbiAgc2VydmVyLmNsb3NlKCk7XG4gIGxvZy5pbmZvKCdIVFRQIHNlcnZlciBpcyBzaHV0Jyk7XG59XG5cbmZ1bmN0aW9uIGZpbGVBY2Nlc3NhYmxlKGZpbGU6IHN0cmluZykge1xuICB0cnkge1xuICAgIGZzLmFjY2Vzc1N5bmMoZmlsZSwgZnMuY29uc3RhbnRzLlJfT0spO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=