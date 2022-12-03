"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
const net_1 = tslib_1.__importDefault(require("net"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const plink_1 = require("@wfh/plink");
// import inspector from 'inspector';
// inspector.open(9222, 'localhost', true);
const log = (0, plink_1.log4File)(__filename);
function start(port, hostMap = new Map(), opts) {
    const server = net_1.default.createServer();
    const actions = {
        proxyToProxy(_remoteHost, _remotePort, _socket, _firstPacket) { },
        proxyToRemote(_remoteHost, _remotePort, _socket, _firstPacket, _isTsl, _httpProtocal) { },
        socketCreated(_socket, _msg) { }
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
        clientToProxySocket.on('error', err => log.warn('connection error', err));
        log.debug('Client Connected To Proxy', clientToProxySocket.remoteAddress +
            ':' + clientToProxySocket.remotePort);
        return rx.fromEvent(clientToProxySocket, 'data').pipe(op.map(data => ({ clientToProxySocket, data })), op.take(1));
    }), op.map(({ clientToProxySocket, data }) => {
        const greeting = data.toString();
        log.info(greeting);
        const isTLSConnection = greeting.indexOf('CONNECT') !== -1;
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
            const splitted = hostMap.get(serverAddress).split(':');
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
            log.info('PROXY TO FORBACK proxy connection created', host, ':', port);
            const connected = proxyToServerSocket.pipe(clientToProxySocket);
            dispatch.socketCreated(connected, 'Remote proxy reading');
            proxyToServerSocket.write(data);
            // Piping the sockets
            clientToProxySocket.pipe(proxyToServerSocket);
        });
        dispatch.socketCreated(proxyToServerSocket, 'remote proxy server connection');
    })), action$.pipe(ofType('proxyToRemote'), op.map(({ payload: [host, port, clientToProxySocket, data, isTLSConnection, protocal] }) => {
        const proxyToServerSocket = net_1.default.connect({ host, port }, () => {
            log.info('PROXY TO SERVER connection created', host, ':', port);
            const socket = proxyToServerSocket.pipe(clientToProxySocket);
            dispatch.socketCreated(socket, 'remote server reading');
            if (isTLSConnection) {
                // Send Back OK to HTTPS CONNECT Request
                clientToProxySocket.write(protocal + ' 200 OK\r\n\n');
            }
            else {
                proxyToServerSocket.write(data);
            }
            // Piping the sockets
            clientToProxySocket.pipe(proxyToServerSocket);
        });
        dispatch.socketCreated(proxyToServerSocket, 'remote server connection');
    })), action$.pipe(ofType('socketCreated'), op.map(({ payload: [proxyToServerSocket, msg] }) => {
        proxyToServerSocket.on('error', (err) => {
            if (err.code === 'ECONNRESET')
                log.warn('PROXY TO SERVER ECONNRESET', msg, proxyToServerSocket.remoteAddress, ':', proxyToServerSocket.remotePort, err);
            else
                log.error('PROXY TO SERVER ERROR', msg, proxyToServerSocket.remoteAddress, ':', proxyToServerSocket.remotePort, err);
        });
        proxyToServerSocket.on('lookup', (err, _addr, _fam, _host) => {
            if (err)
                log.warn('lookup error', err);
        });
        proxyToServerSocket.on('timeout', () => {
            log.warn('PROXY TO SERVER timeout', proxyToServerSocket.remoteAddress, ':', proxyToServerSocket.remotePort);
        });
    }))).pipe(op.catchError((err, src) => {
        log.error('Fatal error', err);
        return src;
    })).subscribe();
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
//# sourceMappingURL=cli-forward-proxy.js.map