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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbmV0d29yay11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsOENBQXNCO0FBRXRCLFNBQWdCLFVBQVU7SUFDeEIsTUFBTSxNQUFNLEdBQUcsWUFBRSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDdEMsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO1FBQ2QsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxRSxJQUFJLEtBQUssRUFBRTtZQUNULE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQztTQUN0QjtLQUNGO0lBQ0QsS0FBSyxNQUFNLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFDLElBQUksTUFBTSxJQUFJLElBQUk7WUFDaEIsU0FBUztRQUNYLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RSxJQUFJLEtBQUssRUFBRTtZQUNULE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQztTQUN0QjtLQUNGO0lBQ0QsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQWpCRCxnQ0FpQkM7QUFHRCxTQUFnQixpQkFBaUIsQ0FBQyxVQUFVLEdBQUcsSUFBSTtJQUNqRCxPQUFPLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQzNDLGlDQUFpQztRQUNqQyxNQUFNLEtBQUssR0FBRyxjQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzNDLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDckQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FBQztRQUNILEtBQUssQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUM5Qyw4QkFBOEI7WUFDOUIsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxHQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxNQUFNLFlBQVksR0FBRyxhQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRTtnQkFDbEUsWUFBWSxDQUFDLEtBQUssQ0FBQyx5Q0FBeUM7b0JBQzVDLGdDQUFnQztvQkFDaEMsTUFBTSxDQUFDLENBQUM7Z0JBQ3hCLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pCLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ2hDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUNILHNDQUFzQztRQUN0QyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRTtZQUN0QixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBRUgsNEJBQTRCO1FBQzVCLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUU7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN4RCxPQUFPLEVBQUUsQ0FBQztZQUNSLHNDQUFzQztZQUN0QyxvQkFBb0I7WUFDcEIsZ0JBQWdCO1lBQ2hCLHVCQUF1QjtZQUN2Qix1QkFBdUI7WUFDdkIsOEJBQThCO1lBQzlCLEtBQUs7WUFFTCxxQ0FBcUM7WUFDckMsYUFBYTtZQUViLDZDQUE2QztZQUM3QywyQ0FBMkM7WUFDM0MsbUNBQW1DO1lBQ25DLDBDQUEwQztZQUMxQyx3Q0FBd0M7WUFDeEMsZ0RBQWdEO1lBQ2hELDBDQUEwQztZQUMxQyx5QkFBeUI7WUFDekIsbUNBQW1DO1lBQ25DLHFDQUFxQztZQUNyQyxRQUFRO1lBQ1IsNkJBQTZCO1lBQzdCLHFCQUFxQjtZQUNyQixRQUFRO1lBQ1IsTUFBTTtRQUNWLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBMURELDhDQTBEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCBuZXQgZnJvbSAnbmV0JztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldExhbklQdjQoKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJzID0gb3MubmV0d29ya0ludGVyZmFjZXMoKTtcbiAgaWYgKGludGVycy5lbjApIHtcbiAgICBjb25zdCBmb3VuZCA9IGludGVycy5lbjAuZmluZChpcCA9PiBpcC5mYW1pbHkgPT09ICdJUHY0JyAmJiAhaXAuaW50ZXJuYWwpO1xuICAgIGlmIChmb3VuZCkge1xuICAgICAgcmV0dXJuIGZvdW5kLmFkZHJlc3M7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgaW50ZXJmIG9mIE9iamVjdC52YWx1ZXMoaW50ZXJzKSkge1xuICAgIGlmIChpbnRlcmYgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IGZvdW5kID0gaW50ZXJmLmZpbmQoaXAgPT4gaXAuZmFtaWx5ID09PSAnSVB2NCcgJiYgIWlwLmludGVybmFsKTtcbiAgICBpZiAoZm91bmQpIHtcbiAgICAgIHJldHVybiBmb3VuZC5hZGRyZXNzO1xuICAgIH1cbiAgfVxuICByZXR1cm4gJzEyNy4wLjAuMSc7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVR1bm5lbFByb3h5KHNlcnZlclBvcnQgPSAxMzM3KSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgLy8gQ3JlYXRlIGFuIEhUVFAgdHVubmVsaW5nIHByb3h5XG4gICAgY29uc3QgcHJveHkgPSBodHRwLmNyZWF0ZVNlcnZlcigocmVxLCByZXMpID0+IHtcbiAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicgfSk7XG4gICAgICByZXMuZW5kKCdva2F5Jyk7XG4gICAgfSk7XG4gICAgcHJveHkub24oJ2Nvbm5lY3QnLCAocmVxLCBjbGllbnRTb2NrZXQsIGhlYWQpID0+IHtcbiAgICAgIC8vIENvbm5lY3QgdG8gYW4gb3JpZ2luIHNlcnZlclxuICAgICAgY29uc3QgeyBwb3J0LCBob3N0bmFtZSB9ID0gbmV3IFVSTChgaHR0cDovLyR7cmVxLnVybCF9YCk7XG4gICAgICBjb25zb2xlLmxvZygnY29ubmVjdCB0byAnLCByZXEudXJsKTtcbiAgICAgIGNvbnN0IHNlcnZlclNvY2tldCA9IG5ldC5jb25uZWN0KE51bWJlcihwb3J0KSB8fCA4MCwgaG9zdG5hbWUsICgpID0+IHtcbiAgICAgICAgY2xpZW50U29ja2V0LndyaXRlKCdIVFRQLzEuMSAyMDAgQ29ubmVjdGlvbiBFc3RhYmxpc2hlZFxcclxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1Byb3h5LWFnZW50OiBQbGluay1Ob2RlLmpzXFxyXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXFxyXFxuJyk7XG4gICAgICAgIHNlcnZlclNvY2tldC53cml0ZShoZWFkKTtcbiAgICAgICAgc2VydmVyU29ja2V0LnBpcGUoY2xpZW50U29ja2V0KTtcbiAgICAgICAgY2xpZW50U29ja2V0LnBpcGUoc2VydmVyU29ja2V0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgcHJveHkub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIHJlamVjdChlcnIpO1xuICAgIH0pO1xuXG4gICAgLy8gTm93IHRoYXQgcHJveHkgaXMgcnVubmluZ1xuICAgIHByb3h5Lmxpc3RlbihzZXJ2ZXJQb3J0LCAnMC4wLjAuMCcsICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdQcm94eSBzZXJ2ZXIgc3RhcnRzIGF0IHBvcnQ6Jywgc2VydmVyUG9ydCk7XG4gICAgICByZXNvbHZlKCk7XG4gICAgICAgIC8vIE1ha2UgYSByZXF1ZXN0IHRvIGEgdHVubmVsaW5nIHByb3h5XG4gICAgICAgIC8vIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIC8vICAgcG9ydDogMTMzNyxcbiAgICAgICAgLy8gICBob3N0OiAnMTI3LjAuMC4xJyxcbiAgICAgICAgLy8gICBtZXRob2Q6ICdDT05ORUNUJyxcbiAgICAgICAgLy8gICBwYXRoOiAnd3d3Lmdvb2dsZS5jb206ODAnXG4gICAgICAgIC8vIH07XG5cbiAgICAgICAgLy8gY29uc3QgcmVxID0gaHR0cC5yZXF1ZXN0KG9wdGlvbnMpO1xuICAgICAgICAvLyByZXEuZW5kKCk7XG5cbiAgICAgICAgLy8gcmVxLm9uKCdjb25uZWN0JywgKHJlcywgc29ja2V0LCBoZWFkKSA9PiB7XG4gICAgICAgIC8vICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZygnZ290IGNvbm5lY3RlZCEnKTtcbiAgICAgICAgLy8gICAvLyBNYWtlIGEgcmVxdWVzdCBvdmVyIGFuIEhUVFAgdHVubmVsXG4gICAgICAgIC8vICAgc29ja2V0LndyaXRlKCdHRVQgLyBIVFRQLzEuMVxcclxcbicgK1xuICAgICAgICAvLyAgICAgICAgICAgICAgICdIb3N0OiB3d3cuZ29vZ2xlLmNvbTo4MFxcclxcbicgK1xuICAgICAgICAvLyAgICAgICAgICAgICAgICdDb25uZWN0aW9uOiBjbG9zZVxcclxcbicgK1xuICAgICAgICAvLyAgICAgICAgICAgICAgICdcXHJcXG4nKTtcbiAgICAgICAgLy8gICBzb2NrZXQub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKGNodW5rLnRvU3RyaW5nKCkpO1xuICAgICAgICAvLyAgIH0pO1xuICAgICAgICAvLyAgIHNvY2tldC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAvLyAgICAgcHJveHkuY2xvc2UoKTtcbiAgICAgICAgLy8gICB9KTtcbiAgICAgICAgLy8gfSk7XG4gICAgfSk7XG4gIH0pO1xufVxuIl19