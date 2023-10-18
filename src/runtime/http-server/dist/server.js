"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.serverCreated$ = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/indent */
const http = tslib_1.__importStar(require("http"));
const https = tslib_1.__importStar(require("https"));
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const rx = tslib_1.__importStar(require("rxjs"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const network_util_1 = require("@wfh/plink/wfh/dist/utils/network-util");
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
let server;
exports.serverCreated$ = new rx.ReplaySubject();
function activate() {
    var _a, _b, _c, _d;
    const rootPath = (0, plink_1.config)().rootPath;
    const multiServerSetting = (0, plink_1.config)()['@wfh/http-server'].servers;
    if (multiServerSetting) {
        for (const serverCfg of multiServerSetting) {
            if (serverCfg.ssl) {
                const key = fs.readFileSync(Path.resolve(rootPath, serverCfg.ssl.key));
                const cert = fs.readFileSync(Path.resolve(rootPath, serverCfg.ssl.cert));
                (_a = __api_1.default.eventBus) === null || _a === void 0 ? void 0 : _a.once('appCreated', (app) => startHttpsServer(app, serverCfg.port, key, cert));
            }
            else {
                (_b = __api_1.default.eventBus) === null || _b === void 0 ? void 0 : _b.once('appCreated', (app) => startHttpServer(app, serverCfg.port));
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
            (_c = __api_1.default.eventBus) === null || _c === void 0 ? void 0 : _c.once('appCreated', (app) => startHttpsServer(app, Number(sslSetting.port ? sslSetting.port : 433), key, cert));
        }
        else {
            (_d = __api_1.default.eventBus) === null || _d === void 0 ? void 0 : _d.once('appCreated', (app) => startHttpServer(app, Number((0, plink_1.config)().port ? (0, plink_1.config)().port : 80)));
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
        // Not sure if this helps to "uncaughtException"
        server.on('clientError', (err, socket) => {
            const nErr = err;
            if (nErr.code === 'ECONNRESET' || !socket.writable) {
                log.info('Client ECONNRESET error', nErr);
                return;
            }
            log.info('Client error', nErr);
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        server.on('listening', () => {
            var _a;
            onListening(server, 'HTTP server', port);
            (_a = __api_1.default.eventBus) === null || _a === void 0 ? void 0 : _a.emit('serverStarted', {});
        });
        // Not sure if this helps to "uncaughtException"
        server.on('connection', conn => {
            conn.on('error', err => {
                log.warn('Connection error', err);
            });
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
                var _a;
                onListening(server, 'HTTP server', port);
                (_a = __api_1.default.eventBus) === null || _a === void 0 ? void 0 : _a.emit('serverStarted', {});
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
        // Not sure if this helps to "uncaughtException"
        server.on('clientError', (err, socket) => {
            const nErr = err;
            if (nErr.code === 'ECONNRESET' || !socket.writable) {
                log.info('Client ECONNRESET error', nErr);
                return;
            }
            log.info('Client error', nErr);
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        // Not sure if this helps to "uncaughtException"
        server.on('connection', conn => {
            conn.on('error', err => {
                log.warn('Connection error', err);
            });
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
            var _a;
            onListening(servers[0], 'HTTPS server', port);
            if (servers.length > 1)
                onListening(servers[1], 'HTTP Forwarding server', httpPort);
            (_a = __api_1.default.eventBus) === null || _a === void 0 ? void 0 : _a.emit('serverStarted', {});
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
    var _a;
    (_a = __api_1.default.eventBus) === null || _a === void 0 ? void 0 : _a.emit('serverStopped', {});
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
//# sourceMappingURL=server.js.map