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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw4Q0FBOEM7QUFDOUMsMkNBQTZCO0FBQzdCLDZDQUErQjtBQUMvQix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLHlDQUEyQjtBQUMzQixrREFBd0I7QUFDeEIseUVBQWtFO0FBQ2xFLHNDQUE0QztBQUU1QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsSUFBSSxNQUE4QyxDQUFDO0FBRXRDLFFBQUEsY0FBYyxHQUFHLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBOEIsQ0FBQztBQUVqRixTQUFnQixRQUFRO0lBQ3RCLE1BQU0sUUFBUSxHQUFXLElBQUEsY0FBTSxHQUFFLENBQUMsUUFBUSxDQUFDO0lBRTNDLE1BQU0sa0JBQWtCLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUVoRSxJQUFJLGtCQUFrQixFQUFFO1FBQ3RCLEtBQUssTUFBTSxTQUFTLElBQUksa0JBQWtCLEVBQUU7WUFDMUMsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFO2dCQUNqQixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdkUsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3pFLGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMs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QyxLQUFLLENBQUMsSUFBSSxHQUFHLCtCQUErQixDQUFDLENBQUM7Z0JBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hCLE1BQU07WUFDUixLQUFLLFlBQVk7Z0JBQ2YsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztnQkFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEIsTUFBTTtZQUNSO2dCQUNFLE1BQU0sS0FBSyxDQUFDO1NBQ2I7SUFDSCxDQUFDO0FBQ0gsQ0FBQztBQXJMRCw0QkFxTEM7QUFFRCxTQUFnQixVQUFVO0lBQ3hCLGVBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2QyxJQUFJLE1BQU07UUFDUixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDakIsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ2xDLENBQUM7QUFMRCxnQ0FLQztBQUVELFNBQVMsY0FBYyxDQUFDLElBQVk7SUFDbEMsSUFBSTtRQUNGLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge2dldExhbklQdjR9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbmV0d29yay11dGlsJztcbmltcG9ydCB7bG9nNEZpbGUsIGNvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5cbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xubGV0IHNlcnZlcjogaHR0cHMuU2VydmVyIHwgaHR0cC5TZXJ2ZXIgfCB1bmRlZmluZWQ7XG5cbmV4cG9ydCBjb25zdCBzZXJ2ZXJDcmVhdGVkJCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PGh0dHAuU2VydmVyIHwgaHR0cHMuU2VydmVyPigpO1xuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIGNvbnN0IHJvb3RQYXRoOiBzdHJpbmcgPSBjb25maWcoKS5yb290UGF0aDtcblxuICBjb25zdCBtdWx0aVNlcnZlclNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9odHRwLXNlcnZlciddLnNlcnZlcnM7XG5cbiAgaWYgKG11bHRpU2VydmVyU2V0dGluZykge1xuICAgIGZvciAoY29uc3Qgc2VydmVyQ2ZnIG9mIG11bHRpU2VydmVyU2V0dGluZykge1xuICAgICAgaWYgKHNlcnZlckNmZy5zc2wpIHtcbiAgICAgICAgY29uc3Qga2V5ID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc2VydmVyQ2ZnLnNzbC5rZXkpKTtcbiAgICAgICAgY29uc3QgY2VydCA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNlcnZlckNmZy5zc2wuY2VydCkpO1xuICAgICAgICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCAoYXBwKSA9PiBzdGFydEh0dHBzU2VydmVyKGFwcCwgc2VydmVyQ2ZnLnBvcnQsIGtleSwgY2VydCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgKGFwcCkgPT4gc3RhcnRIdHRwU2VydmVyKGFwcCwgc2VydmVyQ2ZnLnBvcnQpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY29uc3Qgc3NsU2V0dGluZyA9IGNvbmZpZygpWydAd2ZoL2h0dHAtc2VydmVyJ10uc3NsO1xuXG4gICAgaWYgKHNzbFNldHRpbmcgJiYgc3NsU2V0dGluZy5lbmFibGVkKSB7XG4gICAgICBpZiAoIXNzbFNldHRpbmcua2V5KSB7XG4gICAgICAgIHNzbFNldHRpbmcua2V5ID0gJ2tleS5wZW0nO1xuICAgICAgfVxuICAgICAgaWYgKCFzc2xTZXR0aW5nLmNlcnQpIHtcbiAgICAgICAgc3NsU2V0dGluZy5jZXJ0ID0gJ2NlcnQucGVtJztcbiAgICAgIH1cbiAgICAgIGlmICghZmlsZUFjY2Vzc2FibGUoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmtleSkpKSB7XG4gICAgICAgIGxvZy5lcnJvcignVGhlcmUgaXMgbm8gZmlsZSBhdmFpbGFibGUgcmVmZXJlbmNlZCBieSBjb25maWcueWFtbCBwcm9wZXJ0eSBcInNzbFwiLlwia2V5XCIgJyArIFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5rZXkpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFmaWxlQWNjZXNzYWJsZShQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpKSB7XG4gICAgICAgIGxvZy5lcnJvcignVGhlcmUgaXMgbm8gZmlsZSBhdmFpbGFibGUgcmVmZXJlbmNlZCBieSBjb25maWcueWFtbCBwcm9wZXJ0eSBcInNzbFwiLlwiY2VydFwiICcgKyBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoJ1NTTCBlbmFibGVkJyk7XG4gICAgICBjb25zdCBrZXkgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmtleSkpO1xuICAgICAgY29uc3QgY2VydCA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpO1xuICAgICAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgKGFwcCkgPT4gc3RhcnRIdHRwc1NlcnZlcihcbiAgICAgICAgYXBwLCBOdW1iZXIoc3NsU2V0dGluZy5wb3J0ID8gc3NsU2V0dGluZy5wb3J0IDogNDMzKSxcbiAgICAgICAga2V5LCBjZXJ0XG4gICAgICApKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgKGFwcCkgPT4gc3RhcnRIdHRwU2VydmVyKGFwcCwgTnVtYmVyKGNvbmZpZygpLnBvcnQgPyBjb25maWcoKS5wb3J0IDogODApKSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnRIdHRwU2VydmVyKGFwcDogYW55LCBwb3J0OiBudW1iZXIpIHtcbiAgICBsb2cuaW5mbygnc3RhcnQgSFRUUCcpO1xuICAgIGNvbnN0IHNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKGFwcCk7XG4gICAgLy8gTm9kZSA4IGhhcyBhIGtlZXBBbGl2ZVRpbWVvdXQgYnVnIHdoaWNoIGRvZXNuJ3QgcmVzcGVjdCBhY3RpdmUgY29ubmVjdGlvbnMuXG4gICAgLy8gQ29ubmVjdGlvbnMgd2lsbCBlbmQgYWZ0ZXIgfjUgc2Vjb25kcyAoYXJiaXRyYXJ5KSwgb2Z0ZW4gbm90IGxldHRpbmcgdGhlIGZ1bGwgZG93bmxvYWRcbiAgICAvLyBvZiBsYXJnZSBwaWVjZXMgb2YgY29udGVudCwgc3VjaCBhcyBhIHZlbmRvciBqYXZhc2NyaXB0IGZpbGUuICBUaGlzIHJlc3VsdHMgaW4gYnJvd3NlcnNcbiAgICAvLyB0aHJvd2luZyBhIFwibmV0OjpFUlJfQ09OVEVOVF9MRU5HVEhfTUlTTUFUQ0hcIiBlcnJvci5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9pc3N1ZXMvNzE5N1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvMTMzOTFcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvY29tbWl0LzJjYjZmMmIyODFlYjk2YTdhYmUxNmQ1OGFmNmViYzljZTIzZDJlOTZcbiAgICBpZiAoL152OC5cXGQuXFxkKyQvLnRlc3QocHJvY2Vzcy52ZXJzaW9uKSkge1xuICAgICAgc2VydmVyLmtlZXBBbGl2ZVRpbWVvdXQgPSAzMDAwMDsgLy8gMzAgc2Vjb25kc1xuICAgIH1cbiAgICBzZXJ2ZXJDcmVhdGVkJC5uZXh0KHNlcnZlcik7XG4gICAgc2VydmVyLmxpc3Rlbihwb3J0KTtcbiAgICBzZXJ2ZXIub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcbiAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnIpO1xuICAgIH0pO1xuICAgIHNlcnZlci5vbignbGlzdGVuaW5nJywgKCkgPT4ge1xuICAgICAgb25MaXN0ZW5pbmcoc2VydmVyLCAnSFRUUCBzZXJ2ZXInLCBwb3J0KTtcbiAgICAgIGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdGFydGVkJywge30pO1xuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBob3N0bmFtZSBvZiBjb25maWcoKVsnQHdmaC9odHRwLXNlcnZlciddLmhvc3RuYW1lcykge1xuICAgICAgbG9nLmluZm8oJ2xpc3RlbiBvbiBhZGRpdGlvbmFsIGhvc3QgbmFtZTonLCBob3N0bmFtZSk7XG4gICAgICBjb25zdCBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcihhcHApO1xuICAgICAgc2VydmVyQ3JlYXRlZCQubmV4dChzZXJ2ZXIpO1xuICAgICAgc2VydmVyLmxpc3Rlbihwb3J0LCBob3N0bmFtZSk7XG4gICAgICBzZXJ2ZXIub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgb25FcnJvcihzZXJ2ZXIsIHBvcnQsIGVycik7XG4gICAgICB9KTtcbiAgICAgIHNlcnZlci5vbignbGlzdGVuaW5nJywgKCkgPT4ge1xuICAgICAgICBvbkxpc3RlbmluZyhzZXJ2ZXIsICdIVFRQIHNlcnZlcicsIHBvcnQpO1xuICAgICAgICBhcGkuZXZlbnRCdXMuZW1pdCgnc2VydmVyU3RhcnRlZCcsIHt9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHN0YXJ0SHR0cHNTZXJ2ZXIoYXBwOiBhbnksIHBvcnQ6IG51bWJlciwga2V5OiBCdWZmZXIsIGNlcnQ6IEJ1ZmZlcikge1xuICAgIGxvZy5pbmZvKCdzdGFydCBIVFRQUycpO1xuICAgIGNvbnN0IHN0YXJ0UHJvbWlzZXMgPSBbXTtcbiAgICAvLyBsZXQgcG9ydDogbnVtYmVyID0gTnVtYmVyKHNzbFNldHRpbmcucG9ydCA/IHNzbFNldHRpbmcucG9ydCA6IDQzMyk7XG4gICAgY29uc3QgaHR0cFBvcnQgPSBjb25maWcoKS5wb3J0ID8gY29uZmlnKCkucG9ydCA6IDgwO1xuXG4gICAgY29uc3Qgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKHtrZXksIGNlcnR9LCBhcHApO1xuICAgIHNlcnZlckNyZWF0ZWQkLm5leHQoc2VydmVyKTtcblxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgaWYgKC9edjguXFxkLlxcZCskLy50ZXN0KHByb2Nlc3MudmVyc2lvbikpIHtcbiAgICAgIChzZXJ2ZXIgYXMgYW55KS5rZWVwQWxpdmVUaW1lb3V0ID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcbiAgICB9XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnJvcik7XG4gICAgfSk7XG4gICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgc2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHNlcnZlcikpO1xuICAgIH0pKTtcblxuICAgIGZvciAoY29uc3QgaG9zdG5hbWUgb2YgY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXS5ob3N0bmFtZXMpIHtcbiAgICAgIGxvZy5pbmZvKCdsaXN0ZW4gb24gYWRkaXRpb25hbCBob3N0IG5hbWU6JywgaG9zdG5hbWUpO1xuICAgICAgY29uc3Qgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKHtrZXksIGNlcnR9LCBhcHApO1xuICAgICAgc2VydmVyQ3JlYXRlZCQubmV4dChzZXJ2ZXIpO1xuICAgICAgc2VydmVyLmxpc3Rlbihwb3J0LCBob3N0bmFtZSk7XG4gICAgICBzZXJ2ZXIub24oJ2Vycm9yJywgKGVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgICBvbkVycm9yKHNlcnZlciwgcG9ydCwgZXJyb3IpO1xuICAgICAgfSk7XG4gICAgICBzdGFydFByb21pc2VzLnB1c2gobmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIHNlcnZlci5vbignbGlzdGVuaW5nJywgKCkgPT4gcmVzb2x2ZShzZXJ2ZXIpKTtcbiAgICAgIH0pKTtcblxuICAgIH1cblxuICAgIC8vIGlmIChzc2xTZXR0aW5nLmh0dHBGb3J3YXJkICE9PSBmYWxzZSkge1xuICAgIC8vICAgY29uc3QgcmVkaXJlY3RIdHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoKHJlcTogYW55LCByZXM6IGFueSkgPT4ge1xuICAgIC8vICAgICBsb2cuZGVidWcoJ3JlcS5oZWFkZXJzLmhvc3Q6ICVqJywgcmVxLmhlYWRlcnMuaG9zdCk7XG4gICAgLy8gICAgIGNvbnN0IHVybCA9ICdodHRwczovLycgKyAvKFteOl0rKSg6WzAtOV0rKT8vLmV4ZWMocmVxLmhlYWRlcnMuaG9zdCkhWzFdICsgJzonICsgcG9ydDtcbiAgICAvLyAgICAgbG9nLmRlYnVnKCdyZWRpcmVjdCB0byAnICsgdXJsKTtcbiAgICAvLyAgICAgcmVzLndyaXRlSGVhZCgzMDcsIHtcbiAgICAvLyAgICAgICBMb2NhdGlvbjogdXJsLFxuICAgIC8vICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbidcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gICAgIHJlcy5lbmQoJycpO1xuICAgIC8vICAgfSk7XG5cbiAgICAvLyAgIHJlZGlyZWN0SHR0cFNlcnZlci5saXN0ZW4oaHR0cFBvcnQpO1xuICAgIC8vICAgcmVkaXJlY3RIdHRwU2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAvLyAgICAgb25FcnJvcihzZXJ2ZXIsIGh0dHBQb3J0LCBlcnJvcik7XG4gICAgLy8gICB9KTtcblxuICAgIC8vICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIC8vICAgICByZWRpcmVjdEh0dHBTZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHJlc29sdmUocmVkaXJlY3RIdHRwU2VydmVyKSk7XG4gICAgLy8gICB9KSk7XG4gICAgLy8gfVxuXG4gICAgdm9pZCBQcm9taXNlLmFsbChzdGFydFByb21pc2VzKVxuICAgICAgLnRoZW4oKHNlcnZlcnM6IGFueVtdKSA9PiB7XG4gICAgICAgIG9uTGlzdGVuaW5nKHNlcnZlcnNbMF0sICdIVFRQUyBzZXJ2ZXInLCBwb3J0KTtcbiAgICAgICAgaWYgKHNlcnZlcnMubGVuZ3RoID4gMSlcbiAgICAgICAgICBvbkxpc3RlbmluZyhzZXJ2ZXJzWzFdLCAnSFRUUCBGb3J3YXJkaW5nIHNlcnZlcicsIGh0dHBQb3J0KTtcbiAgICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0YXJ0ZWQnLCB7fSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBFdmVudCBsaXN0ZW5lciBmb3IgSFRUUCBzZXJ2ZXIgXCJsaXN0ZW5pbmdcIiBldmVudC5cblx0ICovXG4gIGZ1bmN0aW9uIG9uTGlzdGVuaW5nKHNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBodHRwcy5TZXJ2ZXIsIHRpdGxlOiBzdHJpbmcsIHBvcnQ6IG51bWJlciB8IHN0cmluZykge1xuICAgIGNvbnN0IGFkZHIgPSBnZXRMYW5JUHY0KCk7XG4gICAgbG9nLmluZm8oYCR7dGl0bGV9IGlzIGxpc3RlbmluZyBvbiAke2FkZHJ9OiR7cG9ydH1gKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBFdmVudCBsaXN0ZW5lciBmb3IgSFRUUCBzZXJ2ZXIgXCJlcnJvclwiIGV2ZW50LlxuXHQgKi9cbiAgZnVuY3Rpb24gb25FcnJvcihzZXJ2ZXI6IGh0dHAuU2VydmVyIHwgaHR0cHMuU2VydmVyLCBwb3J0OiBudW1iZXIgfCBzdHJpbmcsIGVycm9yOiBhbnkpIHtcbiAgICBsb2cuZXJyb3IoZXJyb3IpO1xuICAgIGlmIChlcnJvci5zeXNjYWxsICE9PSAnbGlzdGVuJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgY29uc3QgYmluZCA9IHR5cGVvZiBwb3J0ID09PSAnc3RyaW5nJyA/ICdQaXBlICcgKyBwb3J0IDogJ1BvcnQgJyArIHBvcnQ7XG5cbiAgICAvLyBoYW5kbGUgc3BlY2lmaWMgbGlzdGVuIGVycm9ycyB3aXRoIGZyaWVuZGx5IG1lc3NhZ2VzXG4gICAgc3dpdGNoIChlcnJvci5jb2RlKSB7XG4gICAgY2FzZSAnRUFDQ0VTJzpcbiAgICAgIGxvZy5lcnJvcihiaW5kICsgJyByZXF1aXJlcyBlbGV2YXRlZCBwcml2aWxlZ2VzJyk7XG4gICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdFQUREUklOVVNFJzpcbiAgICAgIGxvZy5lcnJvcihiaW5kICsgJyBpcyBhbHJlYWR5IGluIHVzZScpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgYXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0b3BwZWQnLCB7fSk7XG4gIGlmIChzZXJ2ZXIpXG4gICAgc2VydmVyLmNsb3NlKCk7XG4gIGxvZy5pbmZvKCdIVFRQIHNlcnZlciBpcyBzaHV0Jyk7XG59XG5cbmZ1bmN0aW9uIGZpbGVBY2Nlc3NhYmxlKGZpbGU6IHN0cmluZykge1xuICB0cnkge1xuICAgIGZzLmFjY2Vzc1N5bmMoZmlsZSwgZnMuY29uc3RhbnRzLlJfT0spO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=