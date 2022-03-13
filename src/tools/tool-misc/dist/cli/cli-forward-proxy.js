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
exports.start = void 0;
/* eslint-disable no-console */
const net_1 = __importDefault(require("net"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
function start(port, hostMap = new Map(), opts) {
    const server = net_1.default.createServer();
    const actions = {
        proxyToProxy(_remoteHost, _remotePort, _socket, _firstPacket) { },
        proxyToRemote(_remoteHost, _remotePort, _socket, _firstPacket, _isTsl, httpProtocal) { }
    };
    const dispatch = {};
    const action$ = new rx.Subject();
    const ofType = (type) => {
        return (input) => {
            return input.pipe(op.filter(action => action.type === type));
        };
    };
    for (const [key] of Object.entries(actions)) {
        dispatch[key] = (...params) => {
            const action = {
                type: key,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                payload: params.length === 0 ? params[0] : params
            };
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            action$.next(action);
        };
    }
    rx.merge(rx.fromEvent(server, 'connection').pipe(op.mergeMap((clientToProxySocket) => {
        log.debug('Client Connected To Proxy', clientToProxySocket.remoteAddress +
            ':' + clientToProxySocket.remotePort);
        return rx.fromEvent(clientToProxySocket, 'data').pipe(op.map(data => ({ clientToProxySocket, data })), op.take(1));
    }), op.map(({ clientToProxySocket, data }) => {
        const greeting = data.toString();
        log.info(greeting);
        let isTLSConnection = greeting.indexOf('CONNECT') !== -1;
        // Considering Port as 80 by default 
        let serverPort = 80;
        let serverAddress = '';
        let protocal = 'HTTP/1.1';
        if (isTLSConnection) {
            const match = /CONNECT +([^\s:]+)(?::(\S+))?(?: +(\S+))?/.exec(greeting);
            // Port changed to 443, parsing the host from CONNECT 
            serverPort = match[2] ? parseInt(match[2], 10) : 443;
            serverAddress = match[1];
            if (match[3])
                protocal = match[3];
        }
        else {
            // Parsing HOST from HTTP
            const match = /Host: +([^\s:]+)(?::(\S+))?/.exec(greeting);
            if (match != null) {
                serverAddress = match[1];
                serverPort = match[2] ? parseInt(match[2], 10) : 80;
            }
        }
        // log.info('proxy to:', serverAddress + ':' + serverPort);
        if (serverAddress && hostMap.has(serverAddress)) {
            let splitted = hostMap.get(serverAddress).split(':');
            serverAddress = splitted[0];
            if (splitted[1])
                serverPort = parseInt(splitted[1], 10);
            dispatch.proxyToRemote(serverAddress, serverPort, clientToProxySocket, data, isTLSConnection, protocal);
        }
        else if (opts === null || opts === void 0 ? void 0 : opts.fallbackProxyHost) {
            dispatch.proxyToProxy(opts.fallbackProxyHost, opts.fallbackproxyPort, clientToProxySocket, data);
        }
        else if (serverAddress) {
            dispatch.proxyToRemote(serverAddress, serverPort, clientToProxySocket, data, isTLSConnection, protocal);
        }
        else {
            throw new Error(`unknown server address for ${greeting}`);
        }
    })), action$.pipe(ofType('proxyToProxy'), op.map(({ payload: [host, port, clientToProxySocket, data] }) => {
        const proxyToServerSocket = net_1.default.connect({
            host, port
        }, () => {
            log.warn('PROXY TO FORBACK proxy connection created', host, ':', port);
            proxyToServerSocket.pipe(clientToProxySocket);
            proxyToServerSocket.write(data);
            // Piping the sockets
            clientToProxySocket.pipe(proxyToServerSocket);
        });
    })), action$.pipe(ofType('proxyToRemote'), op.map(({ payload: [host, port, clientToProxySocket, data, isTLSConnection, protocal] }) => {
        const proxyToServerSocket = net_1.default.connect({
            host,
            port
        }, () => {
            log.info('PROXY TO SERVER connection created', host, ':', port);
            if (isTLSConnection) {
                // Send Back OK to HTTPS CONNECT Request
                clientToProxySocket.write(protocal + ' 200 OK\r\n\n');
            }
            else {
                proxyToServerSocket.write(data);
            }
            // Piping the sockets
            clientToProxySocket.pipe(proxyToServerSocket);
            proxyToServerSocket.pipe(clientToProxySocket);
        });
        proxyToServerSocket.on('error', (err) => {
            log.warn('PROXY TO SERVER ERROR', host, ':', port, err);
        });
        proxyToServerSocket.on('lookup', (err, addr, _fam, host) => {
            if (err)
                log.warn('lookup error', err);
            log.info('lookup', addr, host);
        });
        proxyToServerSocket.on('timeout', () => {
            log.info('PROXY TO SERVER timeout', host, ':', port);
        });
    }))).pipe(op.catchError((err, src) => {
        log.error(err);
        return src;
    })).subscribe();
    // server.on('connection', (clientToProxySocket) => {
    //   log.debug('Client Connected To Proxy', clientToProxySocket.remoteAddress +
    //            ':' + clientToProxySocket.remotePort);
    //   // We need only the data once, the starting packet
    //   clientToProxySocket.once('data', (data) => {
    //     const greeting = data.toString();
    //     log.info(greeting);
    //     let isTLSConnection = greeting.indexOf('CONNECT') !== -1;
    //     // Considering Port as 80 by default 
    //     let serverPort = 80;
    //     let serverAddress = '';
    //     let protocal = 'HTTP/1.1';
    //     if (isTLSConnection) {
    //       const match = /CONNECT +([^\s:]+)(?::(\S+))?(?: +(\S+))?/.exec(greeting)!;
    //       // Port changed to 443, parsing the host from CONNECT 
    //       serverPort = match[2] ? parseInt(match[2], 10) : 443;
    //       serverAddress = match[1];
    //       if (match[3])
    //         protocal = match[3];
    //     } else {
    //       // Parsing HOST from HTTP
    //       const match = /Host: +([^\s:]+)(?::(\S+))?/.exec(greeting);
    //       if (match != null) {
    //         serverAddress = match[1];
    //         serverPort = match[2] ? parseInt(match[2], 10) : 80;
    //       }
    //     }
    //     log.info('proxy to:', serverAddress + ':' + serverPort);
    //     const mapped = serverAddress ? hostMap.get(serverAddress) : null;
    //     let proxyToServerSocket: net.Socket;
    //     if (mapped) {
    //       let splitted = mapped.split(':');
    //       serverAddress = splitted[0];
    //       if (splitted[1])
    //         serverPort = parseInt(splitted[1], 10);
    //       log.info('mapped to', serverAddress, ':', serverPort);
    //     } else if (opts?.fallbackProxyHost){
    //       proxyToServerSocket = net.connect({
    //         host: opts.fallbackProxyHost,
    //         port: opts.fallbackproxyPort
    //       }, () => {
    //         log.debug('PROXY TO FORBACK proxy connection created', opts.fallbackProxyHost, ':', opts.fallbackproxyPort);
    //         proxyToServerSocket.pipe(clientToProxySocket);
    //         proxyToServerSocket.write(data);
    //         // Piping the sockets
    //         clientToProxySocket.pipe(proxyToServerSocket);
    //       });
    //     }
    //     proxyToServerSocket = net.connect({
    //         host: serverAddress,
    //         port: serverPort
    //       }, () => {
    //         log.debug('PROXY TO SERVER connection created', serverAddress, ':', serverPort);
    //         if (isTLSConnection) {
    //           // Send Back OK to HTTPS CONNECT Request
    //           clientToProxySocket.write(protocal + ' 200 OK\r\n\n');
    //         } else {
    //           proxyToServerSocket.write(data);
    //         }
    //         // Piping the sockets
    //         clientToProxySocket.pipe(proxyToServerSocket);
    //         proxyToServerSocket.pipe(clientToProxySocket);
    //       });
    //     proxyToServerSocket!.on('error', (err) => {
    //       log.warn('PROXY TO SERVER ERROR', serverAddress, ':', serverPort, err);
    //     });
    //     proxyToServerSocket!.on('lookup', (err, addr, _fam, host) => {
    //       if (err)
    //         log.warn('lookup error', err);
    //       log.info('lookup', addr, host);
    //     });
    //     proxyToServerSocket!.on('timeout', () => {
    //       log.info('PROXY TO SERVER timeout', serverAddress, ':', serverPort);
    //     });
    //   });
    //   clientToProxySocket.on('error', err => {
    //     log.warn('CLIENT TO PROXY ERROR', err);
    //   });
    // });
    server.on('error', (err) => {
        log.info('SERVER ERROR');
        log.info(err);
    });
    server.on('close', () => {
        log.info('Client Disconnected');
    });
    server.listen(port, () => {
        log.info(`Server runnig at http://${(0, plink_1.config)().localIP}:` + port);
    });
    return () => {
        server.close();
    };
}
exports.start = start;
// type ServerEvents = {
//   connection: {type: 'connection'; param: Socket};
//   error: {type: 'error'; param: Error};
//   close: {type: 'close'};
//   listening: {type: 'listening', param: number};
// };
// 
// type ServerEventParam<E extends keyof ServerEvents> = ServerEvents[E] extends {type: any; param: infer P} ? P : undefined;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWZvcndhcmQtcHJveHkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZm9yd2FyZC1wcm94eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDhDQUFnQztBQUNoQyx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLHNDQUE0QztBQUM1QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsU0FBZ0IsS0FBSyxDQUFDLElBQVksRUFBRSxVQUErQixJQUFJLEdBQUcsRUFBRSxFQUMxRSxJQUlDO0lBQ0QsTUFBTSxNQUFNLEdBQUcsYUFBRyxDQUFDLFlBQVksRUFBRSxDQUFDO0lBRWxDLE1BQU0sT0FBTyxHQUFHO1FBQ2QsWUFBWSxDQUFDLFdBQW1CLEVBQUUsV0FBbUIsRUFBRSxPQUFlLEVBQUUsWUFBb0IsSUFBRyxDQUFDO1FBQ2hHLGFBQWEsQ0FBQyxXQUFtQixFQUFFLFdBQW1CLEVBQ3BELE9BQWUsRUFBRSxZQUFvQixFQUFFLE1BQWUsRUFBRSxZQUFvQixJQUFHLENBQUM7S0FDbkYsQ0FBQztJQVFGLE1BQU0sUUFBUSxHQUFHLEVBR2hCLENBQUM7SUFFRixNQUFNLE9BQU8sR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQW9DLENBQUM7SUFDbkUsTUFBTSxNQUFNLEdBQUcsQ0FBaUMsSUFBTyxFQUFFLEVBQUU7UUFDekQsT0FBTyxDQUFDLEtBQXNELEVBQWdDLEVBQUU7WUFDOUYsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUNmLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUNWLENBQUM7UUFDcEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsS0FBSyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FB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QyxDQUFDO0lBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ3RCLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUNsQyxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtRQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixJQUFBLGNBQU0sR0FBRSxDQUFDLE9BQU8sR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxHQUFHLEVBQUU7UUFDVixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTlQRCxzQkE4UEM7QUFFRCx3QkFBd0I7QUFDeEIscURBQXFEO0FBQ3JELDBDQUEwQztBQUMxQyw0QkFBNEI7QUFDNUIsbURBQW1EO0FBQ25ELEtBQUs7QUFDTCxHQUFHO0FBQ0gsNkhBQTZIIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IG5ldCwge1NvY2tldH0gZnJvbSAnbmV0JztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtsb2c0RmlsZSwgY29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQocG9ydDogbnVtYmVyLCBob3N0TWFwOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcCgpLFxuICBvcHRzPzoge1xuICAgIC8qKiBpZiBob3N0IGlzIG5vdCBpbiBob3N0TWFwLCBmb3J3YXJkIHRvIHRoaXMgcHJveHkgKi9cbiAgICBmYWxsYmFja1Byb3h5SG9zdDogc3RyaW5nO1xuICAgIGZhbGxiYWNrcHJveHlQb3J0OiBudW1iZXI7XG4gIH0pIHtcbiAgY29uc3Qgc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigpO1xuXG4gIGNvbnN0IGFjdGlvbnMgPSB7XG4gICAgcHJveHlUb1Byb3h5KF9yZW1vdGVIb3N0OiBzdHJpbmcsIF9yZW1vdGVQb3J0OiBudW1iZXIsIF9zb2NrZXQ6IFNvY2tldCwgX2ZpcnN0UGFja2V0OiBCdWZmZXIpIHt9LFxuICAgIHByb3h5VG9SZW1vdGUoX3JlbW90ZUhvc3Q6IHN0cmluZywgX3JlbW90ZVBvcnQ6IG51bWJlcixcbiAgICAgIF9zb2NrZXQ6IFNvY2tldCwgX2ZpcnN0UGFja2V0OiBCdWZmZXIsIF9pc1RzbDogYm9vbGVhbiwgaHR0cFByb3RvY2FsOiBzdHJpbmcpIHt9XG4gIH07XG5cbiAgdHlwZSBBY3Rpb25UeXBlPEsgZXh0ZW5kcyBrZXlvZiB0eXBlb2YgYWN0aW9ucz4gPSB7XG4gICAgdHlwZTogSztcbiAgICBwYXlsb2FkOiAodHlwZW9mIGFjdGlvbnMpW0tdIGV4dGVuZHMgKGFyZzogaW5mZXIgUCkgPT4gYW55ID8gUCA6XG4gICAgICAodHlwZW9mIGFjdGlvbnMpW0tdIGV4dGVuZHMgKC4uLmFyZ3M6IGluZmVyIEEpID0+IGFueSA/IEEgOiB1bmtub3duO1xuICB9O1xuXG4gIGNvbnN0IGRpc3BhdGNoID0ge30gYXMge1xuICAgIFtLIGluIGtleW9mIHR5cGVvZiBhY3Rpb25zXTpcbiAgICAoLi4ucGFyYW1zOiBQYXJhbWV0ZXJzPHR5cGVvZiBhY3Rpb25zW0tdPikgPT4gQWN0aW9uVHlwZTxLPlxuICB9O1xuXG4gIGNvbnN0IGFjdGlvbiQgPSBuZXcgcnguU3ViamVjdDxBY3Rpb25UeXBlPGtleW9mIHR5cGVvZiBhY3Rpb25zPj4oKTtcbiAgY29uc3Qgb2ZUeXBlID0gPFQgZXh0ZW5kcyBrZXlvZiB0eXBlb2YgYWN0aW9ucz4odHlwZTogVCkgPT4ge1xuICAgIHJldHVybiAoaW5wdXQ6IHJ4Lk9ic2VydmFibGU8QWN0aW9uVHlwZTxrZXlvZiB0eXBlb2YgYWN0aW9ucz4+KTogcnguT2JzZXJ2YWJsZTxBY3Rpb25UeXBlPFQ+PiA9PiB7XG4gICAgICByZXR1cm4gaW5wdXQucGlwZShcbiAgICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gdHlwZSlcbiAgICAgICkgYXMgcnguT2JzZXJ2YWJsZTxBY3Rpb25UeXBlPFQ+PjtcbiAgICB9O1xuICB9O1xuXG4gIGZvciAoY29uc3QgW2tleV0gb2YgT2JqZWN0LmVudHJpZXMoYWN0aW9ucykpIHtcbiAgICBkaXNwYXRjaFtrZXldID0gKC4uLnBhcmFtczogYW55W10pID0+IHtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IHtcbiAgICAgICAgdHlwZToga2V5IGFzIGtleW9mIHR5cGVvZiBhY3Rpb25zLFxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgICAgIHBheWxvYWQ6IHBhcmFtcy5sZW5ndGggPT09IDAgPyBwYXJhbXNbMF0gOiBwYXJhbXNcbiAgICAgIH07XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hcmd1bWVudFxuICAgICAgYWN0aW9uJC5uZXh0KGFjdGlvbiBhcyBhbnkpO1xuICAgIH07XG4gIH1cblxuICByeC5tZXJnZShcbiAgICByeC5mcm9tRXZlbnQ8U29ja2V0PihzZXJ2ZXIsICdjb25uZWN0aW9uJykucGlwZShcbiAgICAgIG9wLm1lcmdlTWFwKChjbGllbnRUb1Byb3h5U29ja2V0KSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZygnQ2xpZW50IENvbm5lY3RlZCBUbyBQcm94eScsIGNsaWVudFRvUHJveHlTb2NrZXQucmVtb3RlQWRkcmVzcyArXG4gICAgICAgICAgJzonICsgY2xpZW50VG9Qcm94eVNvY2tldC5yZW1vdGVQb3J0KTtcbiAgICAgICAgcmV0dXJuIHJ4LmZyb21FdmVudDxCdWZmZXI+KGNsaWVudFRvUHJveHlTb2NrZXQsICdkYXRhJykucGlwZShcbiAgICAgICAgICBvcC5tYXAoZGF0YSA9PiAoe2NsaWVudFRvUHJveHlTb2NrZXQsIGRhdGF9KSksXG4gICAgICAgICAgb3AudGFrZSgxKVxuICAgICAgICApO1xuICAgICAgfSksXG4gICAgICBvcC5tYXAoKHtjbGllbnRUb1Byb3h5U29ja2V0LCBkYXRhfSkgPT4ge1xuICAgICAgICBjb25zdCBncmVldGluZyA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgICAgbG9nLmluZm8oZ3JlZXRpbmcpO1xuICAgICAgICBsZXQgaXNUTFNDb25uZWN0aW9uID0gZ3JlZXRpbmcuaW5kZXhPZignQ09OTkVDVCcpICE9PSAtMTtcblxuICAgICAgICAvLyBDb25zaWRlcmluZyBQb3J0IGFzIDgwIGJ5IGRlZmF1bHQgXG4gICAgICAgIGxldCBzZXJ2ZXJQb3J0ID0gODA7XG4gICAgICAgIGxldCBzZXJ2ZXJBZGRyZXNzID0gJyc7XG4gICAgICAgIGxldCBwcm90b2NhbCA9ICdIVFRQLzEuMSc7XG4gICAgICAgIGlmIChpc1RMU0Nvbm5lY3Rpb24pIHtcbiAgICAgICAgICBjb25zdCBtYXRjaCA9IC9DT05ORUNUICsoW15cXHM6XSspKD86OihcXFMrKSk/KD86ICsoXFxTKykpPy8uZXhlYyhncmVldGluZykhO1xuICAgICAgICAgIC8vIFBvcnQgY2hhbmdlZCB0byA0NDMsIHBhcnNpbmcgdGhlIGhvc3QgZnJvbSBDT05ORUNUIFxuICAgICAgICAgIHNlcnZlclBvcnQgPSBtYXRjaFsyXSA/IHBhcnNlSW50KG1hdGNoWzJdLCAxMCkgOiA0NDM7XG4gICAgICAgICAgc2VydmVyQWRkcmVzcyA9IG1hdGNoWzFdO1xuICAgICAgICAgIGlmIChtYXRjaFszXSlcbiAgICAgICAgICAgIHByb3RvY2FsID0gbWF0Y2hbM107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gUGFyc2luZyBIT1NUIGZyb20gSFRUUFxuICAgICAgICAgIGNvbnN0IG1hdGNoID0gL0hvc3Q6ICsoW15cXHM6XSspKD86OihcXFMrKSk/Ly5leGVjKGdyZWV0aW5nKTtcbiAgICAgICAgICBpZiAobWF0Y2ggIT0gbnVsbCkge1xuICAgICAgICAgICAgc2VydmVyQWRkcmVzcyA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgc2VydmVyUG9ydCA9IG1hdGNoWzJdID8gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKSA6IDgwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBsb2cuaW5mbygncHJveHkgdG86Jywgc2VydmVyQWRkcmVzcyArICc6JyArIHNlcnZlclBvcnQpO1xuICAgICAgICBpZiAoc2VydmVyQWRkcmVzcyAmJiBob3N0TWFwLmhhcyhzZXJ2ZXJBZGRyZXNzKSkge1xuICAgICAgICAgIGxldCBzcGxpdHRlZCA9IGhvc3RNYXAuZ2V0KHNlcnZlckFkZHJlc3MpIS5zcGxpdCgnOicpO1xuICAgICAgICAgIHNlcnZlckFkZHJlc3MgPSBzcGxpdHRlZFswXTtcbiAgICAgICAgICBpZiAoc3BsaXR0ZWRbMV0pXG4gICAgICAgICAgICBzZXJ2ZXJQb3J0ID0gcGFyc2VJbnQoc3BsaXR0ZWRbMV0sIDEwKTtcblxuICAgICAgICAgIGRpc3BhdGNoLnByb3h5VG9SZW1vdGUoc2VydmVyQWRkcmVzcywgc2VydmVyUG9ydCwgY2xpZW50VG9Qcm94eVNvY2tldCwgZGF0YSwgaXNUTFNDb25uZWN0aW9uLCBwcm90b2NhbCk7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0cz8uZmFsbGJhY2tQcm94eUhvc3QpIHtcbiAgICAgICAgICBkaXNwYXRjaC5wcm94eVRvUHJveHkob3B0cy5mYWxsYmFja1Byb3h5SG9zdCwgb3B0cy5mYWxsYmFja3Byb3h5UG9ydCxcbiAgICAgICAgICAgIGNsaWVudFRvUHJveHlTb2NrZXQsIGRhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKHNlcnZlckFkZHJlc3MpIHtcbiAgICAgICAgICBkaXNwYXRjaC5wcm94eVRvUmVtb3RlKHNlcnZlckFkZHJlc3MsIHNlcnZlclBvcnQsIGNsaWVudFRvUHJveHlTb2NrZXQsIGRhdGEsIGlzVExTQ29ubmVjdGlvbiwgcHJvdG9jYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBzZXJ2ZXIgYWRkcmVzcyBmb3IgJHtncmVldGluZ31gKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShcbiAgICAgIG9mVHlwZSgncHJveHlUb1Byb3h5JyksXG4gICAgICBvcC5tYXAoKHtwYXlsb2FkOiBbaG9zdCwgcG9ydCwgY2xpZW50VG9Qcm94eVNvY2tldCwgZGF0YV19KSA9PiB7XG4gICAgICAgIGNvbnN0IHByb3h5VG9TZXJ2ZXJTb2NrZXQgPSBuZXQuY29ubmVjdCh7XG4gICAgICAgICAgaG9zdCwgcG9ydFxuICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oJ1BST1hZIFRPIEZPUkJBQ0sgcHJveHkgY29ubmVjdGlvbiBjcmVhdGVkJywgaG9zdCwgJzonLCBwb3J0KTtcbiAgICAgICAgICBwcm94eVRvU2VydmVyU29ja2V0LnBpcGUoY2xpZW50VG9Qcm94eVNvY2tldCk7XG4gICAgICAgICAgcHJveHlUb1NlcnZlclNvY2tldC53cml0ZShkYXRhKTtcbiAgICAgICAgICAvLyBQaXBpbmcgdGhlIHNvY2tldHNcbiAgICAgICAgICBjbGllbnRUb1Byb3h5U29ja2V0LnBpcGUocHJveHlUb1NlcnZlclNvY2tldCk7XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShcbiAgICAgIG9mVHlwZSgncHJveHlUb1JlbW90ZScpLFxuICAgICAgb3AubWFwKCh7cGF5bG9hZDogW2hvc3QsIHBvcnQsIGNsaWVudFRvUHJveHlTb2NrZXQsIGRhdGEsIGlzVExTQ29ubmVjdGlvbiwgcHJvdG9jYWxdfSkgPT4ge1xuICAgICAgICBjb25zdCBwcm94eVRvU2VydmVyU29ja2V0ID0gbmV0LmNvbm5lY3Qoe1xuICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgcG9ydFxuICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgbG9nLmluZm8oJ1BST1hZIFRPIFNFUlZFUiBjb25uZWN0aW9uIGNyZWF0ZWQnLCBob3N0LCAnOicsIHBvcnQpO1xuXG4gICAgICAgICAgaWYgKGlzVExTQ29ubmVjdGlvbikge1xuICAgICAgICAgICAgLy8gU2VuZCBCYWNrIE9LIHRvIEhUVFBTIENPTk5FQ1QgUmVxdWVzdFxuICAgICAgICAgICAgY2xpZW50VG9Qcm94eVNvY2tldC53cml0ZShwcm90b2NhbCArICcgMjAwIE9LXFxyXFxuXFxuJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHByb3h5VG9TZXJ2ZXJTb2NrZXQud3JpdGUoZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFBpcGluZyB0aGUgc29ja2V0c1xuICAgICAgICAgIGNsaWVudFRvUHJveHlTb2NrZXQucGlwZShwcm94eVRvU2VydmVyU29ja2V0KTtcbiAgICAgICAgICBwcm94eVRvU2VydmVyU29ja2V0LnBpcGUoY2xpZW50VG9Qcm94eVNvY2tldCk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm94eVRvU2VydmVyU29ja2V0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgbG9nLndhcm4oJ1BST1hZIFRPIFNFUlZFUiBFUlJPUicsIGhvc3QsICc6JywgcG9ydCwgZXJyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb3h5VG9TZXJ2ZXJTb2NrZXQub24oJ2xvb2t1cCcsIChlcnIsIGFkZHIsIF9mYW0sIGhvc3QpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgbG9nLndhcm4oJ2xvb2t1cCBlcnJvcicsIGVycik7XG4gICAgICAgICAgbG9nLmluZm8oJ2xvb2t1cCcsIGFkZHIsIGhvc3QpO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJveHlUb1NlcnZlclNvY2tldC5vbigndGltZW91dCcsICgpID0+IHtcbiAgICAgICAgICBsb2cuaW5mbygnUFJPWFkgVE8gU0VSVkVSIHRpbWVvdXQnLCBob3N0LCAnOicsIHBvcnQpO1xuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIHNyYztcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIC8vIHNlcnZlci5vbignY29ubmVjdGlvbicsIChjbGllbnRUb1Byb3h5U29ja2V0KSA9PiB7XG4gIC8vICAgbG9nLmRlYnVnKCdDbGllbnQgQ29ubmVjdGVkIFRvIFByb3h5JywgY2xpZW50VG9Qcm94eVNvY2tldC5yZW1vdGVBZGRyZXNzICtcbiAgLy8gICAgICAgICAgICAnOicgKyBjbGllbnRUb1Byb3h5U29ja2V0LnJlbW90ZVBvcnQpO1xuICAvLyAgIC8vIFdlIG5lZWQgb25seSB0aGUgZGF0YSBvbmNlLCB0aGUgc3RhcnRpbmcgcGFja2V0XG4gIC8vICAgY2xpZW50VG9Qcm94eVNvY2tldC5vbmNlKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgLy8gICAgIGNvbnN0IGdyZWV0aW5nID0gZGF0YS50b1N0cmluZygpO1xuICAvLyAgICAgbG9nLmluZm8oZ3JlZXRpbmcpO1xuICAvLyAgICAgbGV0IGlzVExTQ29ubmVjdGlvbiA9IGdyZWV0aW5nLmluZGV4T2YoJ0NPTk5FQ1QnKSAhPT0gLTE7XG5cbiAgLy8gICAgIC8vIENvbnNpZGVyaW5nIFBvcnQgYXMgODAgYnkgZGVmYXVsdCBcbiAgLy8gICAgIGxldCBzZXJ2ZXJQb3J0ID0gODA7XG4gIC8vICAgICBsZXQgc2VydmVyQWRkcmVzcyA9ICcnO1xuICAvLyAgICAgbGV0IHByb3RvY2FsID0gJ0hUVFAvMS4xJztcbiAgLy8gICAgIGlmIChpc1RMU0Nvbm5lY3Rpb24pIHtcbiAgLy8gICAgICAgY29uc3QgbWF0Y2ggPSAvQ09OTkVDVCArKFteXFxzOl0rKSg/OjooXFxTKykpPyg/OiArKFxcUyspKT8vLmV4ZWMoZ3JlZXRpbmcpITtcbiAgLy8gICAgICAgLy8gUG9ydCBjaGFuZ2VkIHRvIDQ0MywgcGFyc2luZyB0aGUgaG9zdCBmcm9tIENPTk5FQ1QgXG4gIC8vICAgICAgIHNlcnZlclBvcnQgPSBtYXRjaFsyXSA/IHBhcnNlSW50KG1hdGNoWzJdLCAxMCkgOiA0NDM7XG4gIC8vICAgICAgIHNlcnZlckFkZHJlc3MgPSBtYXRjaFsxXTtcbiAgLy8gICAgICAgaWYgKG1hdGNoWzNdKVxuICAvLyAgICAgICAgIHByb3RvY2FsID0gbWF0Y2hbM107XG4gIC8vICAgICB9IGVsc2Uge1xuICAvLyAgICAgICAvLyBQYXJzaW5nIEhPU1QgZnJvbSBIVFRQXG4gIC8vICAgICAgIGNvbnN0IG1hdGNoID0gL0hvc3Q6ICsoW15cXHM6XSspKD86OihcXFMrKSk/Ly5leGVjKGdyZWV0aW5nKTtcbiAgLy8gICAgICAgaWYgKG1hdGNoICE9IG51bGwpIHtcbiAgLy8gICAgICAgICBzZXJ2ZXJBZGRyZXNzID0gbWF0Y2hbMV07XG4gIC8vICAgICAgICAgc2VydmVyUG9ydCA9IG1hdGNoWzJdID8gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKSA6IDgwO1xuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgICBsb2cuaW5mbygncHJveHkgdG86Jywgc2VydmVyQWRkcmVzcyArICc6JyArIHNlcnZlclBvcnQpO1xuICAvLyAgICAgY29uc3QgbWFwcGVkID0gc2VydmVyQWRkcmVzcyA/IGhvc3RNYXAuZ2V0KHNlcnZlckFkZHJlc3MpIDogbnVsbDtcblxuICAvLyAgICAgbGV0IHByb3h5VG9TZXJ2ZXJTb2NrZXQ6IG5ldC5Tb2NrZXQ7XG5cbiAgLy8gICAgIGlmIChtYXBwZWQpIHtcbiAgLy8gICAgICAgbGV0IHNwbGl0dGVkID0gbWFwcGVkLnNwbGl0KCc6Jyk7XG4gIC8vICAgICAgIHNlcnZlckFkZHJlc3MgPSBzcGxpdHRlZFswXTtcbiAgLy8gICAgICAgaWYgKHNwbGl0dGVkWzFdKVxuICAvLyAgICAgICAgIHNlcnZlclBvcnQgPSBwYXJzZUludChzcGxpdHRlZFsxXSwgMTApO1xuICAvLyAgICAgICBsb2cuaW5mbygnbWFwcGVkIHRvJywgc2VydmVyQWRkcmVzcywgJzonLCBzZXJ2ZXJQb3J0KTtcbiAgLy8gICAgIH0gZWxzZSBpZiAob3B0cz8uZmFsbGJhY2tQcm94eUhvc3Qpe1xuICAvLyAgICAgICBwcm94eVRvU2VydmVyU29ja2V0ID0gbmV0LmNvbm5lY3Qoe1xuICAvLyAgICAgICAgIGhvc3Q6IG9wdHMuZmFsbGJhY2tQcm94eUhvc3QsXG4gIC8vICAgICAgICAgcG9ydDogb3B0cy5mYWxsYmFja3Byb3h5UG9ydFxuICAvLyAgICAgICB9LCAoKSA9PiB7XG4gIC8vICAgICAgICAgbG9nLmRlYnVnKCdQUk9YWSBUTyBGT1JCQUNLIHByb3h5IGNvbm5lY3Rpb24gY3JlYXRlZCcsIG9wdHMuZmFsbGJhY2tQcm94eUhvc3QsICc6Jywgb3B0cy5mYWxsYmFja3Byb3h5UG9ydCk7XG4gIC8vICAgICAgICAgcHJveHlUb1NlcnZlclNvY2tldC5waXBlKGNsaWVudFRvUHJveHlTb2NrZXQpO1xuICAvLyAgICAgICAgIHByb3h5VG9TZXJ2ZXJTb2NrZXQud3JpdGUoZGF0YSk7XG4gIC8vICAgICAgICAgLy8gUGlwaW5nIHRoZSBzb2NrZXRzXG4gIC8vICAgICAgICAgY2xpZW50VG9Qcm94eVNvY2tldC5waXBlKHByb3h5VG9TZXJ2ZXJTb2NrZXQpO1xuICAvLyAgICAgICB9KTtcbiAgLy8gICAgIH1cblxuICAvLyAgICAgcHJveHlUb1NlcnZlclNvY2tldCA9IG5ldC5jb25uZWN0KHtcbiAgLy8gICAgICAgICBob3N0OiBzZXJ2ZXJBZGRyZXNzLFxuICAvLyAgICAgICAgIHBvcnQ6IHNlcnZlclBvcnRcbiAgLy8gICAgICAgfSwgKCkgPT4ge1xuICAvLyAgICAgICAgIGxvZy5kZWJ1ZygnUFJPWFkgVE8gU0VSVkVSIGNvbm5lY3Rpb24gY3JlYXRlZCcsIHNlcnZlckFkZHJlc3MsICc6Jywgc2VydmVyUG9ydCk7XG5cbiAgLy8gICAgICAgICBpZiAoaXNUTFNDb25uZWN0aW9uKSB7XG4gIC8vICAgICAgICAgICAvLyBTZW5kIEJhY2sgT0sgdG8gSFRUUFMgQ09OTkVDVCBSZXF1ZXN0XG4gIC8vICAgICAgICAgICBjbGllbnRUb1Byb3h5U29ja2V0LndyaXRlKHByb3RvY2FsICsgJyAyMDAgT0tcXHJcXG5cXG4nKTtcbiAgLy8gICAgICAgICB9IGVsc2Uge1xuICAvLyAgICAgICAgICAgcHJveHlUb1NlcnZlclNvY2tldC53cml0ZShkYXRhKTtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgICAgLy8gUGlwaW5nIHRoZSBzb2NrZXRzXG4gIC8vICAgICAgICAgY2xpZW50VG9Qcm94eVNvY2tldC5waXBlKHByb3h5VG9TZXJ2ZXJTb2NrZXQpO1xuICAvLyAgICAgICAgIHByb3h5VG9TZXJ2ZXJTb2NrZXQucGlwZShjbGllbnRUb1Byb3h5U29ja2V0KTtcbiAgLy8gICAgICAgfSk7XG5cbiAgLy8gICAgIHByb3h5VG9TZXJ2ZXJTb2NrZXQhLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgLy8gICAgICAgbG9nLndhcm4oJ1BST1hZIFRPIFNFUlZFUiBFUlJPUicsIHNlcnZlckFkZHJlc3MsICc6Jywgc2VydmVyUG9ydCwgZXJyKTtcbiAgLy8gICAgIH0pO1xuICAvLyAgICAgcHJveHlUb1NlcnZlclNvY2tldCEub24oJ2xvb2t1cCcsIChlcnIsIGFkZHIsIF9mYW0sIGhvc3QpID0+IHtcbiAgLy8gICAgICAgaWYgKGVycilcbiAgLy8gICAgICAgICBsb2cud2FybignbG9va3VwIGVycm9yJywgZXJyKTtcbiAgLy8gICAgICAgbG9nLmluZm8oJ2xvb2t1cCcsIGFkZHIsIGhvc3QpO1xuICAvLyAgICAgfSk7XG4gIC8vICAgICBwcm94eVRvU2VydmVyU29ja2V0IS5vbigndGltZW91dCcsICgpID0+IHtcbiAgLy8gICAgICAgbG9nLmluZm8oJ1BST1hZIFRPIFNFUlZFUiB0aW1lb3V0Jywgc2VydmVyQWRkcmVzcywgJzonLCBzZXJ2ZXJQb3J0KTtcbiAgLy8gICAgIH0pO1xuICAvLyAgIH0pO1xuXG4gIC8vICAgY2xpZW50VG9Qcm94eVNvY2tldC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAvLyAgICAgbG9nLndhcm4oJ0NMSUVOVCBUTyBQUk9YWSBFUlJPUicsIGVycik7XG4gIC8vICAgfSk7XG4gIC8vIH0pO1xuXG4gIHNlcnZlci5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgbG9nLmluZm8oJ1NFUlZFUiBFUlJPUicpO1xuICAgIGxvZy5pbmZvKGVycik7XG4gIH0pO1xuXG4gIHNlcnZlci5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgbG9nLmluZm8oJ0NsaWVudCBEaXNjb25uZWN0ZWQnKTtcbiAgfSk7XG5cbiAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiB7XG4gICAgbG9nLmluZm8oYFNlcnZlciBydW5uaWcgYXQgaHR0cDovLyR7Y29uZmlnKCkubG9jYWxJUH06YCArIHBvcnQpO1xuICB9KTtcblxuICByZXR1cm4gKCkgPT4ge1xuICAgIHNlcnZlci5jbG9zZSgpO1xuICB9O1xufVxuXG4vLyB0eXBlIFNlcnZlckV2ZW50cyA9IHtcbi8vICAgY29ubmVjdGlvbjoge3R5cGU6ICdjb25uZWN0aW9uJzsgcGFyYW06IFNvY2tldH07XG4vLyAgIGVycm9yOiB7dHlwZTogJ2Vycm9yJzsgcGFyYW06IEVycm9yfTtcbi8vICAgY2xvc2U6IHt0eXBlOiAnY2xvc2UnfTtcbi8vICAgbGlzdGVuaW5nOiB7dHlwZTogJ2xpc3RlbmluZycsIHBhcmFtOiBudW1iZXJ9O1xuLy8gfTtcbi8vIFxuLy8gdHlwZSBTZXJ2ZXJFdmVudFBhcmFtPEUgZXh0ZW5kcyBrZXlvZiBTZXJ2ZXJFdmVudHM+ID0gU2VydmVyRXZlbnRzW0VdIGV4dGVuZHMge3R5cGU6IGFueTsgcGFyYW06IGluZmVyIFB9ID8gUCA6IHVuZGVmaW5lZDtcblxuXG4iXX0=