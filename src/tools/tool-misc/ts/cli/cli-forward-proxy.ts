/* eslint-disable no-console */
import net from 'net';
import {log4File, config} from '@wfh/plink';
const log = log4File(__filename);

export function start(port: number, hostMap: Map<string, string> = new Map()) {
  const server = net.createServer();

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
        const match = /CONNECT +([^\s:]+)(?::(\S+))?(?: +(\S+))?/.exec(greeting)!;
        // Port changed to 443, parsing the host from CONNECT 
        serverPort = match[2] ? parseInt(match[2], 10) : 443;
        serverAddress = match[1];
        if (match[3])
          protocal = match[3];
      } else {
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

      let proxyToServerSocket = net.connect({
          host: serverAddress,
          port: serverPort
        }, () => {
          log.debug('PROXY TO SERVER connection created', serverAddress, ':', serverPort);

          if (isTLSConnection) {
            // Send Back OK to HTTPS CONNECT Request
            clientToProxySocket.write(protocal + ' 200 OK\r\n\n');
          } else {
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
    log.info(`Server runnig at http://${config().localIP}:` + port);
  });
}

