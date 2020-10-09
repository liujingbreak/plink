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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3J1bnRpbWUvaHR0cC1zZXJ2ZXIvdHMvc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IscUNBQXFDO0FBQ3JDLCtDQUFpQztBQUNqQyxrREFBd0I7QUFDeEIseUVBQWtFO0FBRWxFLElBQUksTUFBVyxDQUFDO0FBQ2hCLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzlDLElBQUksTUFBa0MsQ0FBQztBQUV2QyxJQUFJLGlCQUFzQixDQUFDO0FBQzNCLElBQUk7SUFDRixpQkFBaUIsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0UsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztDQUNsRDtBQUFDLE9BQU0sQ0FBQyxFQUFFO0lBQ1QsSUFBRyxDQUFDLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFO1FBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0RBQW9ELENBQUMsQ0FBQztLQUNoRTtDQUNGO0FBRUQsSUFBRyxpQkFBaUIsRUFBRTtJQUNwQixnQkFBZ0IsRUFBRSxDQUFDO0NBQ3BCO0FBRUQsU0FBUyxnQkFBZ0I7SUFDdkIsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLEVBQUU7UUFDN0IsR0FBRyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3RDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2xDLENBQUMsQ0FBQztJQUNGLE1BQU0sZUFBZSxHQUFHLEdBQUcsRUFBRTtRQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDeEMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDaEMsQ0FBQyxDQUFDO0lBQ0YsZUFBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDcEQsZUFBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0FBQ3BELENBQUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE1BQU0sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3BCLE1BQU0sUUFBUSxHQUFXLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztJQUUzQyxNQUFNLFVBQVUsR0FBUSxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDO0lBRTdFLElBQUksVUFBVSxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUU7UUFDcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDbkIsVUFBVSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUM7U0FDNUI7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRTtZQUNwQixVQUFVLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztTQUM5QjtRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDM0QsR0FBRyxDQUFDLEtBQUssQ0FBQyw0RUFBNEUsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekcsT0FBTztTQUNSO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtZQUM1RCxHQUFHLENBQUMsS0FBSyxDQUFDLDZFQUE2RSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzRyxPQUFPO1NBQ1I7UUFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pCLGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0tBQ2pEO1NBQU07UUFDTCxlQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUM7S0FDaEQ7SUFFRCxTQUFTLGVBQWUsQ0FBQyxHQUFRO1FBQy9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNoRCxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQyw4RUFBOEU7UUFDOUUseUZBQXlGO1FBQ3pGLDBGQUEwRjtRQUMxRix1REFBdUQ7UUFDdkQscURBQXFEO1FBQ3JELDhDQUE4QztRQUM5QyxpRkFBaUY7UUFDakYsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUN2QyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLENBQUMsYUFBYTtTQUMvQztRQUNELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFVLEVBQUUsRUFBRTtZQUNoQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtZQUMxQixXQUFXLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxlQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFRO1FBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDeEIsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLElBQUksSUFBSSxHQUFvQixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDcEUsSUFBSSxHQUFHLE9BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQWMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDO1lBQzFCLEdBQUcsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztTQUN2QyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRVIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQixJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3RDLE1BQWMsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsQ0FBQyxhQUFhO1NBQ3hEO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFZLEVBQUUsRUFBRTtZQUNsQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQztRQUNILGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDdkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksVUFBVSxDQUFDLFdBQVcsS0FBSyxLQUFLLEVBQUU7WUFDcEMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBUSxFQUFFLEdBQVEsRUFBRSxFQUFFO2dCQUNsRSxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sR0FBRyxHQUFHLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO2dCQUNyRixHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDaEMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7b0JBQ2pCLFFBQVEsRUFBRSxHQUFHO29CQUNiLGNBQWMsRUFBRSxZQUFZO2lCQUM3QixDQUFDLENBQUM7Z0JBQ0gsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDMUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFZLEVBQUUsRUFBRTtnQkFDOUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0IsQ0FBQyxDQUFDLENBQUM7WUFFSCxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUN2QyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7WUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNMO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUM7YUFDekIsSUFBSSxDQUFDLENBQUMsT0FBYyxFQUFFLEVBQUU7WUFDdkIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUMsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQ3BCLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUQsZUFBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFDLEdBQVc7UUFDaEMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLEdBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNmLGFBQWE7WUFDYixPQUFPLEdBQUcsQ0FBQztTQUNaO1FBRUQsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO1lBQ2IsY0FBYztZQUNkLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVEOztTQUVFO0lBQ0YsU0FBUyxXQUFXLENBQUMsTUFBa0MsRUFBRSxLQUFhLEVBQUUsSUFBcUI7UUFDM0YsTUFBTSxJQUFJLEdBQUcseUJBQVUsRUFBRSxDQUFDO1FBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLG9CQUFvQixJQUFJLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQ7O1NBRUU7SUFDRixTQUFTLE9BQU8sQ0FBQyxNQUFrQyxFQUFFLElBQXFCLEVBQUUsS0FBVTtRQUNwRixHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pCLElBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxRQUFRLEVBQUU7WUFDOUIsTUFBTSxLQUFLLENBQUM7U0FDYjtRQUVELE1BQU0sSUFBSSxHQUFHLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUV4RSx1REFBdUQ7UUFDdkQsUUFBUSxLQUFLLENBQUMsSUFBSSxFQUFFO1lBQ2xCLEtBQUssUUFBUTtnQkFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRywrQkFBK0IsQ0FBQyxDQUFDO2dCQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoQixNQUFNO1lBQ1IsS0FBSyxZQUFZO2dCQUNmLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hCLE1BQU07WUFDUjtnQkFDRSxNQUFNLEtBQUssQ0FBQztTQUNmO0lBQ0gsQ0FBQztBQUNILENBQUM7QUF0SkQsNEJBc0pDO0FBRUQsU0FBZ0IsVUFBVTtJQUN4QixlQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDdkMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ2xDLENBQUM7QUFKRCxnQ0FJQztBQUVELFNBQVMsY0FBYyxDQUFDLElBQVk7SUFDbEMsSUFBSTtRQUNGLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUMiLCJmaWxlIjoicnVudGltZS9odHRwLXNlcnZlci9kaXN0L3NlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
