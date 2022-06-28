"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.deactivate = exports.activate = exports.serverCreated$ = void 0;
/* eslint-disable @typescript-eslint/indent */
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const rx = __importStar(require("rxjs"));
const __api_1 = __importDefault(require("__api"));
const network_util_1 = require("@wfh/plink/wfh/dist/utils/network-util");
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
let server;
exports.serverCreated$ = new rx.ReplaySubject();
function activate() {
    const rootPath = (0, plink_1.config)().rootPath;
    const multiServerSetting = (0, plink_1.config)()['@wfh/http-server'].servers;
    if (multiServerSetting) {
        for (const serverCfg of multiServerSetting) {
            if (serverCfg.ssl) {
                const key = fs.readFileSync(Path.resolve(rootPath, serverCfg.ssl.key));
                const cert = fs.readFileSync(Path.resolve(rootPath, serverCfg.ssl.cert));
                __api_1.default.eventBus.on('appCreated', (app) => startHttpsServer(app, serverCfg.port, key, cert));
            }
            else {
                __api_1.default.eventBus.on('appCreated', (app) => startHttpServer(app, serverCfg.port));
            }
        }
    }
    else {
        const sslSetting = (0, plink_1.config)()['@wfh/http-server'].ssl;
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
            const key = fs.readFileSync(Path.resolve(rootPath, sslSetting.key));
            const cert = fs.readFileSync(Path.resolve(rootPath, sslSetting.cert));
            __api_1.default.eventBus.on('appCreated', (app) => startHttpsServer(app, Number(sslSetting.port ? sslSetting.port : 433), key, cert));
        }
        else {
            __api_1.default.eventBus.on('appCreated', (app) => startHttpServer(app, Number((0, plink_1.config)().port ? (0, plink_1.config)().port : 80)));
        }
    }
    function startHttpServer(app, port) {
        log.info('start HTTP');
        const server = http.createServer(app);
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
        exports.serverCreated$.next(server);
        server.listen(port);
        server.on('error', (err) => {
            onError(server, port, err);
        });
        server.on('listening', () => {
            onListening(server, 'HTTP server', port);
            __api_1.default.eventBus.emit('serverStarted', {});
        });
        for (const hostname of (0, plink_1.config)()['@wfh/http-server'].hostnames) {
            log.info('listen on additional host name:', hostname);
            const server = http.createServer(app);
            exports.serverCreated$.next(server);
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
    function startHttpsServer(app, port, key, cert) {
        log.info('start HTTPS');
        const startPromises = [];
        // let port: number = Number(sslSetting.port ? sslSetting.port : 433);
        const httpPort = (0, plink_1.config)().port ? (0, plink_1.config)().port : 80;
        const server = https.createServer({ key, cert }, app);
        exports.serverCreated$.next(server);
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
        for (const hostname of (0, plink_1.config)()['@wfh/http-server'].hostnames) {
            log.info('listen on additional host name:', hostname);
            const server = https.createServer({ key, cert }, app);
            exports.serverCreated$.next(server);
            server.listen(port, hostname);
            server.on('error', (error) => {
                onError(server, port, error);
            });
            startPromises.push(new Promise(resolve => {
                server.on('listening', () => resolve(server));
            }));
        }
        // if (sslSetting.httpForward !== false) {
        //   const redirectHttpServer = http.createServer((req: any, res: any) => {
        //     log.debug('req.headers.host: %j', req.headers.host);
        //     const url = 'https://' + /([^:]+)(:[0-9]+)?/.exec(req.headers.host)![1] + ':' + port;
        //     log.debug('redirect to ' + url);
        //     res.writeHead(307, {
        //       Location: url,
        //       'Content-Type': 'text/plain'
        //     });
        //     res.end('');
        //   });
        //   redirectHttpServer.listen(httpPort);
        //   redirectHttpServer.on('error', (error: Error) => {
        //     onError(server, httpPort, error);
        //   });
        //   startPromises.push(new Promise(resolve => {
        //     redirectHttpServer.on('listening', () => resolve(redirectHttpServer));
        //   }));
        // }
        void Promise.all(startPromises)
            .then((servers) => {
            onListening(servers[0], 'HTTPS server', port);
            if (servers.length > 1)
                onListening(servers[1], 'HTTP Forwarding server', httpPort);
            __api_1.default.eventBus.emit('serverStarted', {});
        });
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
    if (server)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsOENBQThDO0FBQzlDLDJDQUE2QjtBQUM3Qiw2Q0FBK0I7QUFDL0IsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3Qix5Q0FBMkI7QUFDM0Isa0RBQXdCO0FBQ3hCLHlFQUFrRTtBQUNsRSxzQ0FBNEM7QUFFNUMsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksTUFBOEMsQ0FBQztBQUV0QyxRQUFBLGNBQWMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQThCLENBQUM7QUFFakYsU0FBZ0IsUUFBUTtJQUN0QixNQUFNLFFBQVEsR0FBVyxJQUFBLGNBQU0sR0FBRSxDQUFDLFFBQVEsQ0FBQztJQUUzQyxNQUFNLGtCQUFrQixHQUFHLElBQUEsY0FBTSxHQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFFaEUsSUFBSSxrQkFBa0IsRUFBRTtRQUN0QixLQUFLLE1BQU0sU0FBUyxJQUFJLGtCQUFrQixFQUFFO1lBQzFDLElBQUksU0FBUyxDQUFDLEdBQUcsRUFBRTtnQkFDakIsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZFLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN6RSxlQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixD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LENBQUMsS0FBSyxDQUFDLElBQUksR0FBRywrQkFBK0IsQ0FBQyxDQUFDO2dCQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoQixNQUFNO1lBQ1IsS0FBSyxZQUFZO2dCQUNmLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hCLE1BQU07WUFDUjtnQkFDRSxNQUFNLEtBQUssQ0FBQztTQUNiO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFyTEQsNEJBcUxDO0FBRUQsU0FBZ0IsVUFBVTtJQUN4QixlQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDdkMsSUFBSSxNQUFNO1FBQ1IsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2pCLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNsQyxDQUFDO0FBTEQsZ0NBS0M7QUFFRCxTQUFTLGNBQWMsQ0FBQyxJQUFZO0lBQ2xDLElBQUk7UUFDRixFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L2luZGVudCAqL1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL25ldHdvcmstdXRpbCc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbmxldCBzZXJ2ZXI6IGh0dHBzLlNlcnZlciB8IGh0dHAuU2VydmVyIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgY29uc3Qgc2VydmVyQ3JlYXRlZCQgPSBuZXcgcnguUmVwbGF5U3ViamVjdDxodHRwLlNlcnZlciB8IGh0dHBzLlNlcnZlcj4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICBjb25zdCByb290UGF0aDogc3RyaW5nID0gY29uZmlnKCkucm9vdFBhdGg7XG5cbiAgY29uc3QgbXVsdGlTZXJ2ZXJTZXR0aW5nID0gY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXS5zZXJ2ZXJzO1xuXG4gIGlmIChtdWx0aVNlcnZlclNldHRpbmcpIHtcbiAgICBmb3IgKGNvbnN0IHNlcnZlckNmZyBvZiBtdWx0aVNlcnZlclNldHRpbmcpIHtcbiAgICAgIGlmIChzZXJ2ZXJDZmcuc3NsKSB7XG4gICAgICAgIGNvbnN0IGtleSA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNlcnZlckNmZy5zc2wua2V5KSk7XG4gICAgICAgIGNvbnN0IGNlcnQgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzZXJ2ZXJDZmcuc3NsLmNlcnQpKTtcbiAgICAgICAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgKGFwcCkgPT4gc3RhcnRIdHRwc1NlcnZlcihhcHAsIHNlcnZlckNmZy5wb3J0LCBrZXksIGNlcnQpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsIChhcHApID0+IHN0YXJ0SHR0cFNlcnZlcihhcHAsIHNlcnZlckNmZy5wb3J0KSk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IHNzbFNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9odHRwLXNlcnZlciddLnNzbDtcblxuICAgIGlmIChzc2xTZXR0aW5nICYmIHNzbFNldHRpbmcuZW5hYmxlZCkge1xuICAgICAgaWYgKCFzc2xTZXR0aW5nLmtleSkge1xuICAgICAgICBzc2xTZXR0aW5nLmtleSA9ICdrZXkucGVtJztcbiAgICAgIH1cbiAgICAgIGlmICghc3NsU2V0dGluZy5jZXJ0KSB7XG4gICAgICAgIHNzbFNldHRpbmcuY2VydCA9ICdjZXJ0LnBlbSc7XG4gICAgICB9XG4gICAgICBpZiAoIWZpbGVBY2Nlc3NhYmxlKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5rZXkpKSkge1xuICAgICAgICBsb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIGZpbGUgYXZhaWxhYmxlIHJlZmVyZW5jZWQgYnkgY29uZmlnLnlhbWwgcHJvcGVydHkgXCJzc2xcIi5cImtleVwiICcgKyBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcua2V5KSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghZmlsZUFjY2Vzc2FibGUoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmNlcnQpKSkge1xuICAgICAgICBsb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIGZpbGUgYXZhaWxhYmxlIHJlZmVyZW5jZWQgYnkgY29uZmlnLnlhbWwgcHJvcGVydHkgXCJzc2xcIi5cImNlcnRcIiAnICsgUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmNlcnQpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKCdTU0wgZW5hYmxlZCcpO1xuICAgICAgY29uc3Qga2V5ID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5rZXkpKTtcbiAgICAgIGNvbnN0IGNlcnQgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmNlcnQpKTtcbiAgICAgIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsIChhcHApID0+IHN0YXJ0SHR0cHNTZXJ2ZXIoXG4gICAgICAgIGFwcCwgTnVtYmVyKHNzbFNldHRpbmcucG9ydCA/IHNzbFNldHRpbmcucG9ydCA6IDQzMyksXG4gICAgICAgIGtleSwgY2VydFxuICAgICAgKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsIChhcHApID0+IHN0YXJ0SHR0cFNlcnZlcihhcHAsIE51bWJlcihjb25maWcoKS5wb3J0ID8gY29uZmlnKCkucG9ydCA6IDgwKSkpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHN0YXJ0SHR0cFNlcnZlcihhcHA6IGFueSwgcG9ydDogbnVtYmVyKSB7XG4gICAgbG9nLmluZm8oJ3N0YXJ0IEhUVFAnKTtcbiAgICBjb25zdCBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcihhcHApO1xuICAgIC8vIE5vZGUgOCBoYXMgYSBrZWVwQWxpdmVUaW1lb3V0IGJ1ZyB3aGljaCBkb2Vzbid0IHJlc3BlY3QgYWN0aXZlIGNvbm5lY3Rpb25zLlxuICAgIC8vIENvbm5lY3Rpb25zIHdpbGwgZW5kIGFmdGVyIH41IHNlY29uZHMgKGFyYml0cmFyeSksIG9mdGVuIG5vdCBsZXR0aW5nIHRoZSBmdWxsIGRvd25sb2FkXG4gICAgLy8gb2YgbGFyZ2UgcGllY2VzIG9mIGNvbnRlbnQsIHN1Y2ggYXMgYSB2ZW5kb3IgamF2YXNjcmlwdCBmaWxlLiAgVGhpcyByZXN1bHRzIGluIGJyb3dzZXJzXG4gICAgLy8gdGhyb3dpbmcgYSBcIm5ldDo6RVJSX0NPTlRFTlRfTEVOR1RIX01JU01BVENIXCIgZXJyb3IuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvaXNzdWVzLzcxOTdcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvaXNzdWVzLzEzMzkxXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2NvbW1pdC8yY2I2ZjJiMjgxZWI5NmE3YWJlMTZkNThhZjZlYmM5Y2UyM2QyZTk2XG4gICAgaWYgKC9edjguXFxkLlxcZCskLy50ZXN0KHByb2Nlc3MudmVyc2lvbikpIHtcbiAgICAgIHNlcnZlci5rZWVwQWxpdmVUaW1lb3V0ID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcbiAgICB9XG4gICAgc2VydmVyQ3JlYXRlZCQubmV4dChzZXJ2ZXIpO1xuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICBvbkVycm9yKHNlcnZlciwgcG9ydCwgZXJyKTtcbiAgICB9KTtcbiAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHtcbiAgICAgIG9uTGlzdGVuaW5nKHNlcnZlciwgJ0hUVFAgc2VydmVyJywgcG9ydCk7XG4gICAgICBhcGkuZXZlbnRCdXMuZW1pdCgnc2VydmVyU3RhcnRlZCcsIHt9KTtcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3QgaG9zdG5hbWUgb2YgY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXS5ob3N0bmFtZXMpIHtcbiAgICAgIGxvZy5pbmZvKCdsaXN0ZW4gb24gYWRkaXRpb25hbCBob3N0IG5hbWU6JywgaG9zdG5hbWUpO1xuICAgICAgY29uc3Qgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoYXBwKTtcbiAgICAgIHNlcnZlckNyZWF0ZWQkLm5leHQoc2VydmVyKTtcbiAgICAgIHNlcnZlci5saXN0ZW4ocG9ydCwgaG9zdG5hbWUpO1xuICAgICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnIpO1xuICAgICAgfSk7XG4gICAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHtcbiAgICAgICAgb25MaXN0ZW5pbmcoc2VydmVyLCAnSFRUUCBzZXJ2ZXInLCBwb3J0KTtcbiAgICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0YXJ0ZWQnLCB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydEh0dHBzU2VydmVyKGFwcDogYW55LCBwb3J0OiBudW1iZXIsIGtleTogQnVmZmVyLCBjZXJ0OiBCdWZmZXIpIHtcbiAgICBsb2cuaW5mbygnc3RhcnQgSFRUUFMnKTtcbiAgICBjb25zdCBzdGFydFByb21pc2VzID0gW107XG4gICAgLy8gbGV0IHBvcnQ6IG51bWJlciA9IE51bWJlcihzc2xTZXR0aW5nLnBvcnQgPyBzc2xTZXR0aW5nLnBvcnQgOiA0MzMpO1xuICAgIGNvbnN0IGh0dHBQb3J0ID0gY29uZmlnKCkucG9ydCA/IGNvbmZpZygpLnBvcnQgOiA4MDtcblxuICAgIGNvbnN0IHNlcnZlciA9IGh0dHBzLmNyZWF0ZVNlcnZlcih7a2V5LCBjZXJ0fSwgYXBwKTtcbiAgICBzZXJ2ZXJDcmVhdGVkJC5uZXh0KHNlcnZlcik7XG5cbiAgICBzZXJ2ZXIubGlzdGVuKHBvcnQpO1xuICAgIGlmICgvXnY4LlxcZC5cXGQrJC8udGVzdChwcm9jZXNzLnZlcnNpb24pKSB7XG4gICAgICAoc2VydmVyIGFzIGFueSkua2VlcEFsaXZlVGltZW91dCA9IDMwMDAwOyAvLyAzMCBzZWNvbmRzXG4gICAgfVxuICAgIHNlcnZlci5vbignZXJyb3InLCAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICBvbkVycm9yKHNlcnZlciwgcG9ydCwgZXJyb3IpO1xuICAgIH0pO1xuICAgIHN0YXJ0UHJvbWlzZXMucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIHNlcnZlci5vbignbGlzdGVuaW5nJywgKCkgPT4gcmVzb2x2ZShzZXJ2ZXIpKTtcbiAgICB9KSk7XG5cbiAgICBmb3IgKGNvbnN0IGhvc3RuYW1lIG9mIGNvbmZpZygpWydAd2ZoL2h0dHAtc2VydmVyJ10uaG9zdG5hbWVzKSB7XG4gICAgICBsb2cuaW5mbygnbGlzdGVuIG9uIGFkZGl0aW9uYWwgaG9zdCBuYW1lOicsIGhvc3RuYW1lKTtcbiAgICAgIGNvbnN0IHNlcnZlciA9IGh0dHBzLmNyZWF0ZVNlcnZlcih7a2V5LCBjZXJ0fSwgYXBwKTtcbiAgICAgIHNlcnZlckNyZWF0ZWQkLm5leHQoc2VydmVyKTtcbiAgICAgIHNlcnZlci5saXN0ZW4ocG9ydCwgaG9zdG5hbWUpO1xuICAgICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgICAgb25FcnJvcihzZXJ2ZXIsIHBvcnQsIGVycm9yKTtcbiAgICAgIH0pO1xuICAgICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHJlc29sdmUoc2VydmVyKSk7XG4gICAgICB9KSk7XG5cbiAgICB9XG5cbiAgICAvLyBpZiAoc3NsU2V0dGluZy5odHRwRm9yd2FyZCAhPT0gZmFsc2UpIHtcbiAgICAvLyAgIGNvbnN0IHJlZGlyZWN0SHR0cFNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKChyZXE6IGFueSwgcmVzOiBhbnkpID0+IHtcbiAgICAvLyAgICAgbG9nLmRlYnVnKCdyZXEuaGVhZGVycy5ob3N0OiAlaicsIHJlcS5oZWFkZXJzLmhvc3QpO1xuICAgIC8vICAgICBjb25zdCB1cmwgPSAnaHR0cHM6Ly8nICsgLyhbXjpdKykoOlswLTldKyk/Ly5leGVjKHJlcS5oZWFkZXJzLmhvc3QpIVsxXSArICc6JyArIHBvcnQ7XG4gICAgLy8gICAgIGxvZy5kZWJ1ZygncmVkaXJlY3QgdG8gJyArIHVybCk7XG4gICAgLy8gICAgIHJlcy53cml0ZUhlYWQoMzA3LCB7XG4gICAgLy8gICAgICAgTG9jYXRpb246IHVybCxcbiAgICAvLyAgICAgICAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nXG4gICAgLy8gICAgIH0pO1xuICAgIC8vICAgICByZXMuZW5kKCcnKTtcbiAgICAvLyAgIH0pO1xuXG4gICAgLy8gICByZWRpcmVjdEh0dHBTZXJ2ZXIubGlzdGVuKGh0dHBQb3J0KTtcbiAgICAvLyAgIHJlZGlyZWN0SHR0cFNlcnZlci5vbignZXJyb3InLCAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgLy8gICAgIG9uRXJyb3Ioc2VydmVyLCBodHRwUG9ydCwgZXJyb3IpO1xuICAgIC8vICAgfSk7XG5cbiAgICAvLyAgIHN0YXJ0UHJvbWlzZXMucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAvLyAgICAgcmVkaXJlY3RIdHRwU2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHJlZGlyZWN0SHR0cFNlcnZlcikpO1xuICAgIC8vICAgfSkpO1xuICAgIC8vIH1cblxuICAgIHZvaWQgUHJvbWlzZS5hbGwoc3RhcnRQcm9taXNlcylcbiAgICAgIC50aGVuKChzZXJ2ZXJzOiBhbnlbXSkgPT4ge1xuICAgICAgICBvbkxpc3RlbmluZyhzZXJ2ZXJzWzBdLCAnSFRUUFMgc2VydmVyJywgcG9ydCk7XG4gICAgICAgIGlmIChzZXJ2ZXJzLmxlbmd0aCA+IDEpXG4gICAgICAgICAgb25MaXN0ZW5pbmcoc2VydmVyc1sxXSwgJ0hUVFAgRm9yd2FyZGluZyBzZXJ2ZXInLCBodHRwUG9ydCk7XG4gICAgICAgIGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdGFydGVkJywge30pO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcblx0ICogRXZlbnQgbGlzdGVuZXIgZm9yIEhUVFAgc2VydmVyIFwibGlzdGVuaW5nXCIgZXZlbnQuXG5cdCAqL1xuICBmdW5jdGlvbiBvbkxpc3RlbmluZyhzZXJ2ZXI6IGh0dHAuU2VydmVyIHwgaHR0cHMuU2VydmVyLCB0aXRsZTogc3RyaW5nLCBwb3J0OiBudW1iZXIgfCBzdHJpbmcpIHtcbiAgICBjb25zdCBhZGRyID0gZ2V0TGFuSVB2NCgpO1xuICAgIGxvZy5pbmZvKGAke3RpdGxlfSBpcyBsaXN0ZW5pbmcgb24gJHthZGRyfToke3BvcnR9YCk7XG4gIH1cblxuICAvKipcblx0ICogRXZlbnQgbGlzdGVuZXIgZm9yIEhUVFAgc2VydmVyIFwiZXJyb3JcIiBldmVudC5cblx0ICovXG4gIGZ1bmN0aW9uIG9uRXJyb3Ioc2VydmVyOiBodHRwLlNlcnZlciB8IGh0dHBzLlNlcnZlciwgcG9ydDogbnVtYmVyIHwgc3RyaW5nLCBlcnJvcjogYW55KSB7XG4gICAgbG9nLmVycm9yKGVycm9yKTtcbiAgICBpZiAoZXJyb3Iuc3lzY2FsbCAhPT0gJ2xpc3RlbicpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGNvbnN0IGJpbmQgPSB0eXBlb2YgcG9ydCA9PT0gJ3N0cmluZycgPyAnUGlwZSAnICsgcG9ydCA6ICdQb3J0ICcgKyBwb3J0O1xuXG4gICAgLy8gaGFuZGxlIHNwZWNpZmljIGxpc3RlbiBlcnJvcnMgd2l0aCBmcmllbmRseSBtZXNzYWdlc1xuICAgIHN3aXRjaCAoZXJyb3IuY29kZSkge1xuICAgIGNhc2UgJ0VBQ0NFUyc6XG4gICAgICBsb2cuZXJyb3IoYmluZCArICcgcmVxdWlyZXMgZWxldmF0ZWQgcHJpdmlsZWdlcycpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnRUFERFJJTlVTRSc6XG4gICAgICBsb2cuZXJyb3IoYmluZCArICcgaXMgYWxyZWFkeSBpbiB1c2UnKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdG9wcGVkJywge30pO1xuICBpZiAoc2VydmVyKVxuICAgIHNlcnZlci5jbG9zZSgpO1xuICBsb2cuaW5mbygnSFRUUCBzZXJ2ZXIgaXMgc2h1dCcpO1xufVxuXG5mdW5jdGlvbiBmaWxlQWNjZXNzYWJsZShmaWxlOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBmcy5hY2Nlc3NTeW5jKGZpbGUsIGZzLmNvbnN0YW50cy5SX09LKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19