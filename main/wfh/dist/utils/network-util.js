"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTunnelProxy = exports.getLanIPv4 = void 0;
const os_1 = __importDefault(require("os"));
const http_1 = __importDefault(require("http"));
const net_1 = __importDefault(require("net"));
function getLanIPv4() {
    const inters = os_1.default.networkInterfaces();
    if (inters.en0) {
        const found = inters.en0.find(ip => ip.family === 'IPv4' && !ip.internal);
        if (found) {
            return found.address;
        }
    }
    for (const interf of Object.values(inters)) {
        if (interf == null)
            continue;
        const found = interf.find(ip => ip.family === 'IPv4' && !ip.internal);
        if (found) {
            return found.address;
        }
    }
    return '127.0.0.1';
}
exports.getLanIPv4 = getLanIPv4;
function createTunnelProxy(serverPort = 1337) {
    return new Promise((resolve, reject) => {
        // Create an HTTP tunneling proxy
        const proxy = http_1.default.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('okay');
        });
        proxy.on('connect', (req, clientSocket, head) => {
            // Connect to an origin server
            const { port, hostname } = new URL(`http://${req.url}`);
            console.log('connect to ', req.url);
            const serverSocket = net_1.default.connect(Number(port) || 80, hostname, () => {
                clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                    'Proxy-agent: Plink-Node.js\r\n' +
                    '\r\n');
                serverSocket.write(head);
                serverSocket.pipe(clientSocket);
                clientSocket.pipe(serverSocket);
            });
        });
        // eslint-disable-next-line no-console
        proxy.on('error', err => {
            console.error(err);
            reject(err);
        });
        // Now that proxy is running
        proxy.listen(serverPort, '0.0.0.0', () => {
            console.log('Proxy server starts at port:', serverPort);
            resolve();
            // Make a request to a tunneling proxy
            // const options = {
            //   port: 1337,
            //   host: '127.0.0.1',
            //   method: 'CONNECT',
            //   path: 'www.google.com:80'
            // };
            // const req = http.request(options);
            // req.end();
            // req.on('connect', (res, socket, head) => {
            //   // eslint-disable-next-line no-console
            //   console.log('got connected!');
            //   // Make a request over an HTTP tunnel
            //   socket.write('GET / HTTP/1.1\r\n' +
            //               'Host: www.google.com:80\r\n' +
            //               'Connection: close\r\n' +
            //               '\r\n');
            //   socket.on('data', (chunk) => {
            //     console.log(chunk.toString());
            //   });
            //   socket.on('end', () => {
            //     proxy.close();
            //   });
            // });
        });
    });
}
exports.createTunnelProxy = createTunnelProxy;
//# sourceMappingURL=network-util.js.map