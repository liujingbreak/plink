"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
/* eslint-disable no-console */
const net_1 = __importDefault(require("net"));
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
function start(port, hostMap = new Map()) {
    const server = net_1.default.createServer();
    server.on('connection', (clientToProxySocket) => {
        log.debug('Client Connected To Proxy', clientToProxySocket.remoteAddress +
            ':' + clientToProxySocket.remotePort);
        // We need only the data once, the starting packet
        clientToProxySocket.once('data', (data) => {
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
            log.info('proxy to:', serverAddress + ':' + serverPort);
            const mapped = serverAddress ? hostMap.get(serverAddress) : null;
            if (mapped) {
                let splitted = mapped.split(':');
                serverAddress = splitted[0];
                if (splitted[1])
                    serverPort = parseInt(splitted[1], 10);
                log.info('mapped to', serverAddress, ':', serverPort);
            }
            let proxyToServerSocket = net_1.default.connect({
                host: serverAddress,
                port: serverPort
            }, () => {
                log.debug('PROXY TO SERVER connection created', serverAddress, ':', serverPort);
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
                log.info('PROXY TO SERVER ERROR', serverAddress, ':', serverPort, err);
            });
            proxyToServerSocket.on('lookup', (err, addr, fam, host) => {
                if (err)
                    log.warn('lookup error', err);
                log.info(addr, host);
            });
            proxyToServerSocket.on('timeout', () => {
                log.info('PROXY TO SERVER timeout', serverAddress, ':', serverPort);
            });
        });
        clientToProxySocket.on('error', err => {
            log.warn('CLIENT TO PROXY ERROR', err);
        });
    });
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
}
exports.start = start;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWZvcndhcmQtcHJveHkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZm9yd2FyZC1wcm94eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsOENBQXNCO0FBQ3RCLHNDQUE0QztBQUM1QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsU0FBZ0IsS0FBSyxDQUFDLElBQVksRUFBRSxVQUErQixJQUFJLEdBQUcsRUFBRTtJQUMxRSxNQUFNLE1BQU0sR0FBRyxhQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7SUFFbEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFO1FBQzlDLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsbUJBQW1CLENBQUMsYUFBYTtZQUMvRCxHQUFHLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0Msa0RBQWtEO1FBQ2xELG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN4QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDakMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNuQixJQUFJLGVBQWUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBRXpELHFDQUFxQztZQUNyQyxJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7WUFDcEIsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQztZQUMxQixJQUFJLGVBQWUsRUFBRTtnQkFDbkIsTUFBTSxLQUFLLEdBQUcsMkNBQTJDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBRSxDQUFDO2dCQUMxRSxzREFBc0Q7Z0JB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SUFBSSxDQUFDLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUM7WUFDSCxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtnQkFDckMsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxhQUFhLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3RFLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDekIsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN6QixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ3RCLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUNsQyxDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtRQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixJQUFBLGNBQU0sR0FBRSxDQUFDLE9BQU8sR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXZGRCxzQkF1RkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgbmV0IGZyb20gJ25ldCc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydChwb3J0OiBudW1iZXIsIGhvc3RNYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4gPSBuZXcgTWFwKCkpIHtcbiAgY29uc3Qgc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigpO1xuXG4gIHNlcnZlci5vbignY29ubmVjdGlvbicsIChjbGllbnRUb1Byb3h5U29ja2V0KSA9PiB7XG4gICAgbG9nLmRlYnVnKCdDbGllbnQgQ29ubmVjdGVkIFRvIFByb3h5JywgY2xpZW50VG9Qcm94eVNvY2tldC5yZW1vdGVBZGRyZXNzICtcbiAgICAgICAgICAgICAnOicgKyBjbGllbnRUb1Byb3h5U29ja2V0LnJlbW90ZVBvcnQpO1xuICAgIC8vIFdlIG5lZWQgb25seSB0aGUgZGF0YSBvbmNlLCB0aGUgc3RhcnRpbmcgcGFja2V0XG4gICAgY2xpZW50VG9Qcm94eVNvY2tldC5vbmNlKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IGdyZWV0aW5nID0gZGF0YS50b1N0cmluZygpO1xuICAgICAgbG9nLmluZm8oZ3JlZXRpbmcpO1xuICAgICAgbGV0IGlzVExTQ29ubmVjdGlvbiA9IGdyZWV0aW5nLmluZGV4T2YoJ0NPTk5FQ1QnKSAhPT0gLTE7XG5cbiAgICAgIC8vIENvbnNpZGVyaW5nIFBvcnQgYXMgODAgYnkgZGVmYXVsdCBcbiAgICAgIGxldCBzZXJ2ZXJQb3J0ID0gODA7XG4gICAgICBsZXQgc2VydmVyQWRkcmVzcyA9ICcnO1xuICAgICAgbGV0IHByb3RvY2FsID0gJ0hUVFAvMS4xJztcbiAgICAgIGlmIChpc1RMU0Nvbm5lY3Rpb24pIHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvQ09OTkVDVCArKFteXFxzOl0rKSg/OjooXFxTKykpPyg/OiArKFxcUyspKT8vLmV4ZWMoZ3JlZXRpbmcpITtcbiAgICAgICAgLy8gUG9ydCBjaGFuZ2VkIHRvIDQ0MywgcGFyc2luZyB0aGUgaG9zdCBmcm9tIENPTk5FQ1QgXG4gICAgICAgIHNlcnZlclBvcnQgPSBtYXRjaFsyXSA/IHBhcnNlSW50KG1hdGNoWzJdLCAxMCkgOiA0NDM7XG4gICAgICAgIHNlcnZlckFkZHJlc3MgPSBtYXRjaFsxXTtcbiAgICAgICAgaWYgKG1hdGNoWzNdKVxuICAgICAgICAgIHByb3RvY2FsID0gbWF0Y2hbM107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBQYXJzaW5nIEhPU1QgZnJvbSBIVFRQXG4gICAgICAgIGNvbnN0IG1hdGNoID0gL0hvc3Q6ICsoW15cXHM6XSspKD86OihcXFMrKSk/Ly5leGVjKGdyZWV0aW5nKTtcbiAgICAgICAgaWYgKG1hdGNoICE9IG51bGwpIHtcbiAgICAgICAgICBzZXJ2ZXJBZGRyZXNzID0gbWF0Y2hbMV07XG4gICAgICAgICAgc2VydmVyUG9ydCA9IG1hdGNoWzJdID8gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKSA6IDgwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBsb2cuaW5mbygncHJveHkgdG86Jywgc2VydmVyQWRkcmVzcyArICc6JyArIHNlcnZlclBvcnQpO1xuICAgICAgY29uc3QgbWFwcGVkID0gc2VydmVyQWRkcmVzcyA/IGhvc3RNYXAuZ2V0KHNlcnZlckFkZHJlc3MpIDogbnVsbDtcblxuICAgICAgaWYgKG1hcHBlZCkge1xuICAgICAgICBsZXQgc3BsaXR0ZWQgPSBtYXBwZWQuc3BsaXQoJzonKTtcbiAgICAgICAgc2VydmVyQWRkcmVzcyA9IHNwbGl0dGVkWzBdO1xuICAgICAgICBpZiAoc3BsaXR0ZWRbMV0pXG4gICAgICAgICAgc2VydmVyUG9ydCA9IHBhcnNlSW50KHNwbGl0dGVkWzFdLCAxMCk7XG4gICAgICAgIGxvZy5pbmZvKCdtYXBwZWQgdG8nLCBzZXJ2ZXJBZGRyZXNzLCAnOicsIHNlcnZlclBvcnQpO1xuICAgICAgfVxuXG4gICAgICBsZXQgcHJveHlUb1NlcnZlclNvY2tldCA9IG5ldC5jb25uZWN0KHtcbiAgICAgICAgICBob3N0OiBzZXJ2ZXJBZGRyZXNzLFxuICAgICAgICAgIHBvcnQ6IHNlcnZlclBvcnRcbiAgICAgICAgfSwgKCkgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZygnUFJPWFkgVE8gU0VSVkVSIGNvbm5lY3Rpb24gY3JlYXRlZCcsIHNlcnZlckFkZHJlc3MsICc6Jywgc2VydmVyUG9ydCk7XG5cbiAgICAgICAgICBpZiAoaXNUTFNDb25uZWN0aW9uKSB7XG4gICAgICAgICAgICAvLyBTZW5kIEJhY2sgT0sgdG8gSFRUUFMgQ09OTkVDVCBSZXF1ZXN0XG4gICAgICAgICAgICBjbGllbnRUb1Byb3h5U29ja2V0LndyaXRlKHByb3RvY2FsICsgJyAyMDAgT0tcXHJcXG5cXG4nKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcHJveHlUb1NlcnZlclNvY2tldC53cml0ZShkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUGlwaW5nIHRoZSBzb2NrZXRzXG4gICAgICAgICAgY2xpZW50VG9Qcm94eVNvY2tldC5waXBlKHByb3h5VG9TZXJ2ZXJTb2NrZXQpO1xuICAgICAgICAgIHByb3h5VG9TZXJ2ZXJTb2NrZXQucGlwZShjbGllbnRUb1Byb3h5U29ja2V0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHByb3h5VG9TZXJ2ZXJTb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBsb2cuaW5mbygnUFJPWFkgVE8gU0VSVkVSIEVSUk9SJywgc2VydmVyQWRkcmVzcywgJzonLCBzZXJ2ZXJQb3J0LCBlcnIpO1xuICAgICAgfSk7XG4gICAgICBwcm94eVRvU2VydmVyU29ja2V0Lm9uKCdsb29rdXAnLCAoZXJyLCBhZGRyLCBmYW0sIGhvc3QpID0+IHtcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgICBsb2cud2FybignbG9va3VwIGVycm9yJywgZXJyKTtcbiAgICAgICAgbG9nLmluZm8oYWRkciwgaG9zdCk7XG4gICAgICB9KTtcbiAgICAgIHByb3h5VG9TZXJ2ZXJTb2NrZXQub24oJ3RpbWVvdXQnLCAoKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKCdQUk9YWSBUTyBTRVJWRVIgdGltZW91dCcsIHNlcnZlckFkZHJlc3MsICc6Jywgc2VydmVyUG9ydCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGNsaWVudFRvUHJveHlTb2NrZXQub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgIGxvZy53YXJuKCdDTElFTlQgVE8gUFJPWFkgRVJST1InLCBlcnIpO1xuICAgIH0pO1xuICB9KTtcblxuICBzZXJ2ZXIub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgIGxvZy5pbmZvKCdTRVJWRVIgRVJST1InKTtcbiAgICBsb2cuaW5mbyhlcnIpO1xuICB9KTtcbiAgc2VydmVyLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICBsb2cuaW5mbygnQ2xpZW50IERpc2Nvbm5lY3RlZCcpO1xuICB9KTtcbiAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiB7XG4gICAgbG9nLmluZm8oYFNlcnZlciBydW5uaWcgYXQgaHR0cDovLyR7Y29uZmlnKCkubG9jYWxJUH06YCArIHBvcnQpO1xuICB9KTtcbn1cblxuIl19