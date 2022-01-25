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
let server;
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
        let httpPort = (0, plink_1.config)().port ? (0, plink_1.config)().port : 80;
        const server = https.createServer({ key, cert }, app);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0Isa0RBQXdCO0FBQ3hCLHlFQUFrRTtBQUNsRSxzQ0FBNEM7QUFFNUMsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksTUFBOEMsQ0FBQztBQUVuRCxTQUFnQixRQUFRO0lBQ3RCLE1BQU0sUUFBUSxHQUFXLElBQUEsY0FBTSxHQUFFLENBQUMsUUFBUSxDQUFDO0lBRTNDLE1BQU0sa0JBQWtCLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUVoRSxJQUFJLGtCQUFrQixFQUFFO1FBQ3RCLEtBQUssTUFBTSxTQUFTLElBQUksa0JBQWtCLEVBQUU7WUFDMUMsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFO2dCQUNqQixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdkUsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3pFLGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDMUY7aUJBQU07Z0JBQ0ws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SUFDSCxDQUFDO0FBQ0gsQ0FBQztBQWpMRCw0QkFpTEM7QUFFRCxTQUFnQixVQUFVO0lBQ3hCLGVBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2QyxJQUFJLE1BQU07UUFDUixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDakIsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ2xDLENBQUM7QUFMRCxnQ0FLQztBQUVELFNBQVMsY0FBYyxDQUFDLElBQVk7SUFDbEMsSUFBSTtRQUNGLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL25ldHdvcmstdXRpbCc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbmxldCBzZXJ2ZXI6IGh0dHBzLlNlcnZlciB8IGh0dHAuU2VydmVyIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIGNvbnN0IHJvb3RQYXRoOiBzdHJpbmcgPSBjb25maWcoKS5yb290UGF0aDtcblxuICBjb25zdCBtdWx0aVNlcnZlclNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9odHRwLXNlcnZlciddLnNlcnZlcnM7XG5cbiAgaWYgKG11bHRpU2VydmVyU2V0dGluZykge1xuICAgIGZvciAoY29uc3Qgc2VydmVyQ2ZnIG9mIG11bHRpU2VydmVyU2V0dGluZykge1xuICAgICAgaWYgKHNlcnZlckNmZy5zc2wpIHtcbiAgICAgICAgY29uc3Qga2V5ID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290UGF0aCwgc2VydmVyQ2ZnLnNzbC5rZXkpKTtcbiAgICAgICAgY29uc3QgY2VydCA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNlcnZlckNmZy5zc2wuY2VydCkpO1xuICAgICAgICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCAoYXBwKSA9PiBzdGFydEh0dHBzU2VydmVyKGFwcCwgc2VydmVyQ2ZnLnBvcnQsIGtleSwgY2VydCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgKGFwcCkgPT4gc3RhcnRIdHRwU2VydmVyKGFwcCwgc2VydmVyQ2ZnLnBvcnQpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY29uc3Qgc3NsU2V0dGluZyA9IGNvbmZpZygpWydAd2ZoL2h0dHAtc2VydmVyJ10uc3NsO1xuXG4gICAgaWYgKHNzbFNldHRpbmcgJiYgc3NsU2V0dGluZy5lbmFibGVkKSB7XG4gICAgICBpZiAoIXNzbFNldHRpbmcua2V5KSB7XG4gICAgICAgIHNzbFNldHRpbmcua2V5ID0gJ2tleS5wZW0nO1xuICAgICAgfVxuICAgICAgaWYgKCFzc2xTZXR0aW5nLmNlcnQpIHtcbiAgICAgICAgc3NsU2V0dGluZy5jZXJ0ID0gJ2NlcnQucGVtJztcbiAgICAgIH1cbiAgICAgIGlmICghZmlsZUFjY2Vzc2FibGUoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmtleSkpKSB7XG4gICAgICAgIGxvZy5lcnJvcignVGhlcmUgaXMgbm8gZmlsZSBhdmFpbGFibGUgcmVmZXJlbmNlZCBieSBjb25maWcueWFtbCBwcm9wZXJ0eSBcInNzbFwiLlwia2V5XCIgJyArIFBhdGgucmVzb2x2ZShyb290UGF0aCwgc3NsU2V0dGluZy5rZXkpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFmaWxlQWNjZXNzYWJsZShQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpKSB7XG4gICAgICAgIGxvZy5lcnJvcignVGhlcmUgaXMgbm8gZmlsZSBhdmFpbGFibGUgcmVmZXJlbmNlZCBieSBjb25maWcueWFtbCBwcm9wZXJ0eSBcInNzbFwiLlwiY2VydFwiICcgKyBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoJ1NTTCBlbmFibGVkJyk7XG4gICAgICBjb25zdCBrZXkgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBzc2xTZXR0aW5nLmtleSkpO1xuICAgICAgY29uc3QgY2VydCA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNzbFNldHRpbmcuY2VydCkpO1xuICAgICAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgKGFwcCkgPT4gc3RhcnRIdHRwc1NlcnZlcihcbiAgICAgICAgYXBwLCBOdW1iZXIoc3NsU2V0dGluZy5wb3J0ID8gc3NsU2V0dGluZy5wb3J0IDogNDMzKSxcbiAgICAgICAga2V5LCBjZXJ0XG4gICAgICAgICkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCAoYXBwKSA9PiBzdGFydEh0dHBTZXJ2ZXIoYXBwLCBOdW1iZXIoY29uZmlnKCkucG9ydCA/IGNvbmZpZygpLnBvcnQgOiA4MCkpKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydEh0dHBTZXJ2ZXIoYXBwOiBhbnksIHBvcnQ6IG51bWJlcikge1xuICAgIGxvZy5pbmZvKCdzdGFydCBIVFRQJyk7XG4gICAgY29uc3Qgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoYXBwKTtcbiAgICAvLyBOb2RlIDggaGFzIGEga2VlcEFsaXZlVGltZW91dCBidWcgd2hpY2ggZG9lc24ndCByZXNwZWN0IGFjdGl2ZSBjb25uZWN0aW9ucy5cbiAgICAvLyBDb25uZWN0aW9ucyB3aWxsIGVuZCBhZnRlciB+NSBzZWNvbmRzIChhcmJpdHJhcnkpLCBvZnRlbiBub3QgbGV0dGluZyB0aGUgZnVsbCBkb3dubG9hZFxuICAgIC8vIG9mIGxhcmdlIHBpZWNlcyBvZiBjb250ZW50LCBzdWNoIGFzIGEgdmVuZG9yIGphdmFzY3JpcHQgZmlsZS4gIFRoaXMgcmVzdWx0cyBpbiBicm93c2Vyc1xuICAgIC8vIHRocm93aW5nIGEgXCJuZXQ6OkVSUl9DT05URU5UX0xFTkdUSF9NSVNNQVRDSFwiIGVycm9yLlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL2lzc3Vlcy83MTk3XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2lzc3Vlcy8xMzM5MVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9jb21taXQvMmNiNmYyYjI4MWViOTZhN2FiZTE2ZDU4YWY2ZWJjOWNlMjNkMmU5NlxuICAgIGlmICgvXnY4LlxcZC5cXGQrJC8udGVzdChwcm9jZXNzLnZlcnNpb24pKSB7XG4gICAgICBzZXJ2ZXIua2VlcEFsaXZlVGltZW91dCA9IDMwMDAwOyAvLyAzMCBzZWNvbmRzXG4gICAgfVxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICBvbkVycm9yKHNlcnZlciwgcG9ydCwgZXJyKTtcbiAgICB9KTtcbiAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHtcbiAgICAgIG9uTGlzdGVuaW5nKHNlcnZlciwgJ0hUVFAgc2VydmVyJywgcG9ydCk7XG4gICAgICBhcGkuZXZlbnRCdXMuZW1pdCgnc2VydmVyU3RhcnRlZCcsIHt9KTtcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3QgaG9zdG5hbWUgb2YgY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXS5ob3N0bmFtZXMpIHtcbiAgICAgIGxvZy5pbmZvKCdsaXN0ZW4gb24gYWRkaXRpb25hbCBob3N0IG5hbWU6JywgaG9zdG5hbWUpO1xuICAgICAgY29uc3Qgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoYXBwKTtcbiAgICAgIHNlcnZlci5saXN0ZW4ocG9ydCwgaG9zdG5hbWUpO1xuICAgICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnIpO1xuICAgICAgfSk7XG4gICAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsICgpID0+IHtcbiAgICAgICAgb25MaXN0ZW5pbmcoc2VydmVyLCAnSFRUUCBzZXJ2ZXInLCBwb3J0KTtcbiAgICAgICAgYXBpLmV2ZW50QnVzLmVtaXQoJ3NlcnZlclN0YXJ0ZWQnLCB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydEh0dHBzU2VydmVyKGFwcDogYW55LCBwb3J0OiBudW1iZXIsIGtleTogQnVmZmVyLCBjZXJ0OiBCdWZmZXIpIHtcbiAgICBsb2cuaW5mbygnc3RhcnQgSFRUUFMnKTtcbiAgICBjb25zdCBzdGFydFByb21pc2VzID0gW107XG4gICAgLy8gbGV0IHBvcnQ6IG51bWJlciA9IE51bWJlcihzc2xTZXR0aW5nLnBvcnQgPyBzc2xTZXR0aW5nLnBvcnQgOiA0MzMpO1xuICAgIGxldCBodHRwUG9ydCA9IGNvbmZpZygpLnBvcnQgPyBjb25maWcoKS5wb3J0IDogODA7XG5cbiAgICBjb25zdCBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoeyBrZXksIGNlcnQgfSwgYXBwKTtcblxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgaWYgKC9edjguXFxkLlxcZCskLy50ZXN0KHByb2Nlc3MudmVyc2lvbikpIHtcbiAgICAgIChzZXJ2ZXIgYXMgYW55KS5rZWVwQWxpdmVUaW1lb3V0ID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcbiAgICB9XG4gICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnJvcik7XG4gICAgfSk7XG4gICAgc3RhcnRQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgc2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHNlcnZlcikpO1xuICAgIH0pKTtcblxuICAgIGZvciAoY29uc3QgaG9zdG5hbWUgb2YgY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXS5ob3N0bmFtZXMpIHtcbiAgICAgIGxvZy5pbmZvKCdsaXN0ZW4gb24gYWRkaXRpb25hbCBob3N0IG5hbWU6JywgaG9zdG5hbWUpO1xuICAgICAgY29uc3Qgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKHsga2V5LCBjZXJ0IH0sIGFwcCk7XG4gICAgICBzZXJ2ZXIubGlzdGVuKHBvcnQsIGhvc3RuYW1lKTtcbiAgICAgIHNlcnZlci5vbignZXJyb3InLCAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAgIG9uRXJyb3Ioc2VydmVyLCBwb3J0LCBlcnJvcik7XG4gICAgICB9KTtcbiAgICAgIHN0YXJ0UHJvbWlzZXMucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgc2VydmVyLm9uKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKHNlcnZlcikpO1xuICAgICAgfSkpO1xuXG4gICAgfVxuXG4gICAgLy8gaWYgKHNzbFNldHRpbmcuaHR0cEZvcndhcmQgIT09IGZhbHNlKSB7XG4gICAgLy8gICBjb25zdCByZWRpcmVjdEh0dHBTZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcigocmVxOiBhbnksIHJlczogYW55KSA9PiB7XG4gICAgLy8gICAgIGxvZy5kZWJ1ZygncmVxLmhlYWRlcnMuaG9zdDogJWonLCByZXEuaGVhZGVycy5ob3N0KTtcbiAgICAvLyAgICAgY29uc3QgdXJsID0gJ2h0dHBzOi8vJyArIC8oW146XSspKDpbMC05XSspPy8uZXhlYyhyZXEuaGVhZGVycy5ob3N0KSFbMV0gKyAnOicgKyBwb3J0O1xuICAgIC8vICAgICBsb2cuZGVidWcoJ3JlZGlyZWN0IHRvICcgKyB1cmwpO1xuICAgIC8vICAgICByZXMud3JpdGVIZWFkKDMwNywge1xuICAgIC8vICAgICAgIExvY2F0aW9uOiB1cmwsXG4gICAgLy8gICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJ1xuICAgIC8vICAgICB9KTtcbiAgICAvLyAgICAgcmVzLmVuZCgnJyk7XG4gICAgLy8gICB9KTtcblxuICAgIC8vICAgcmVkaXJlY3RIdHRwU2VydmVyLmxpc3RlbihodHRwUG9ydCk7XG4gICAgLy8gICByZWRpcmVjdEh0dHBTZXJ2ZXIub24oJ2Vycm9yJywgKGVycm9yOiBFcnJvcikgPT4ge1xuICAgIC8vICAgICBvbkVycm9yKHNlcnZlciwgaHR0cFBvcnQsIGVycm9yKTtcbiAgICAvLyAgIH0pO1xuXG4gICAgLy8gICBzdGFydFByb21pc2VzLnB1c2gobmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgLy8gICAgIHJlZGlyZWN0SHR0cFNlcnZlci5vbignbGlzdGVuaW5nJywgKCkgPT4gcmVzb2x2ZShyZWRpcmVjdEh0dHBTZXJ2ZXIpKTtcbiAgICAvLyAgIH0pKTtcbiAgICAvLyB9XG5cbiAgICB2b2lkIFByb21pc2UuYWxsKHN0YXJ0UHJvbWlzZXMpXG4gICAgLnRoZW4oKHNlcnZlcnM6IGFueVtdKSA9PiB7XG4gICAgICBvbkxpc3RlbmluZyhzZXJ2ZXJzWzBdLCAnSFRUUFMgc2VydmVyJywgcG9ydCk7XG4gICAgICBpZiAoc2VydmVycy5sZW5ndGggPiAxKVxuICAgICAgICBvbkxpc3RlbmluZyhzZXJ2ZXJzWzFdLCAnSFRUUCBGb3J3YXJkaW5nIHNlcnZlcicsIGh0dHBQb3J0KTtcbiAgICAgIGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdGFydGVkJywge30pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG5cdCAqIEV2ZW50IGxpc3RlbmVyIGZvciBIVFRQIHNlcnZlciBcImxpc3RlbmluZ1wiIGV2ZW50LlxuXHQgKi9cbiAgZnVuY3Rpb24gb25MaXN0ZW5pbmcoc2VydmVyOiBodHRwLlNlcnZlciB8IGh0dHBzLlNlcnZlciwgdGl0bGU6IHN0cmluZywgcG9ydDogbnVtYmVyIHwgc3RyaW5nKSB7XG4gICAgY29uc3QgYWRkciA9IGdldExhbklQdjQoKTtcbiAgICBsb2cuaW5mbyhgJHt0aXRsZX0gaXMgbGlzdGVuaW5nIG9uICR7YWRkcn06JHtwb3J0fWApO1xuICB9XG5cbiAgLyoqXG5cdCAqIEV2ZW50IGxpc3RlbmVyIGZvciBIVFRQIHNlcnZlciBcImVycm9yXCIgZXZlbnQuXG5cdCAqL1xuICBmdW5jdGlvbiBvbkVycm9yKHNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBodHRwcy5TZXJ2ZXIsIHBvcnQ6IG51bWJlciB8IHN0cmluZywgZXJyb3I6IGFueSkge1xuICAgIGxvZy5lcnJvcihlcnJvcik7XG4gICAgaWYgKGVycm9yLnN5c2NhbGwgIT09ICdsaXN0ZW4nKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBjb25zdCBiaW5kID0gdHlwZW9mIHBvcnQgPT09ICdzdHJpbmcnID8gJ1BpcGUgJyArIHBvcnQgOiAnUG9ydCAnICsgcG9ydDtcblxuICAgIC8vIGhhbmRsZSBzcGVjaWZpYyBsaXN0ZW4gZXJyb3JzIHdpdGggZnJpZW5kbHkgbWVzc2FnZXNcbiAgICBzd2l0Y2ggKGVycm9yLmNvZGUpIHtcbiAgICAgIGNhc2UgJ0VBQ0NFUyc6XG4gICAgICAgIGxvZy5lcnJvcihiaW5kICsgJyByZXF1aXJlcyBlbGV2YXRlZCBwcml2aWxlZ2VzJyk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdFQUREUklOVVNFJzpcbiAgICAgICAgbG9nLmVycm9yKGJpbmQgKyAnIGlzIGFscmVhZHkgaW4gdXNlJyk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIGFwaS5ldmVudEJ1cy5lbWl0KCdzZXJ2ZXJTdG9wcGVkJywge30pO1xuICBpZiAoc2VydmVyKVxuICAgIHNlcnZlci5jbG9zZSgpO1xuICBsb2cuaW5mbygnSFRUUCBzZXJ2ZXIgaXMgc2h1dCcpO1xufVxuXG5mdW5jdGlvbiBmaWxlQWNjZXNzYWJsZShmaWxlOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBmcy5hY2Nlc3NTeW5jKGZpbGUsIGZzLmNvbnN0YW50cy5SX09LKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19