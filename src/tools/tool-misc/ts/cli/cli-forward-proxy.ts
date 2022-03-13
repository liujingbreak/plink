/* eslint-disable no-console */
import net, {Socket} from 'net';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {log4File, config} from '@wfh/plink';
const log = log4File(__filename);

export function start(port: number, hostMap: Map<string, string> = new Map(),
  opts?: {
    /** if host is not in hostMap, forward to this proxy */
    fallbackProxyHost: string;
    fallbackproxyPort: number;
  }) {
  const server = net.createServer();

  const actions = {
    proxyToProxy(_remoteHost: string, _remotePort: number, _socket: Socket, _firstPacket: Buffer) {},
    proxyToRemote(_remoteHost: string, _remotePort: number,
      _socket: Socket, _firstPacket: Buffer, _isTsl: boolean, httpProtocal: string) {},
    remoteSocketCreated(_socket: Socket, msg: string) {}
  };

  type ActionType<K extends keyof typeof actions> = {
    type: K;
    payload: (typeof actions)[K] extends (arg: infer P) => any ? P :
      (typeof actions)[K] extends (...args: infer A) => any ? A : unknown;
  };

  const dispatch = {} as {
    [K in keyof typeof actions]:
    (...params: Parameters<typeof actions[K]>) => ActionType<K>
  };

  const action$ = new rx.Subject<ActionType<keyof typeof actions>>();
  const ofType = <T extends keyof typeof actions>(type: T) => {
    return (input: rx.Observable<ActionType<keyof typeof actions>>): rx.Observable<ActionType<T>> => {
      return input.pipe(
        op.filter(action => action.type === type)
      ) as rx.Observable<ActionType<T>>;
    };
  };

  for (const [key] of Object.entries(actions)) {
    dispatch[key] = (...params: any[]) => {
      const action = {
        type: key as keyof typeof actions,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: params.length === 0 ? params[0] : params
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      action$.next(action as any);
    };
  }

  rx.merge(
    rx.fromEvent<Socket>(server, 'connection').pipe(
      op.mergeMap((clientToProxySocket) => {
        log.debug('Client Connected To Proxy', clientToProxySocket.remoteAddress +
          ':' + clientToProxySocket.remotePort);
        return rx.fromEvent<Buffer>(clientToProxySocket, 'data').pipe(
          op.map(data => ({clientToProxySocket, data})),
          op.take(1)
        );
      }),
      op.map(({clientToProxySocket, data}) => {
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
        // log.info('proxy to:', serverAddress + ':' + serverPort);
        if (serverAddress && hostMap.has(serverAddress)) {
          let splitted = hostMap.get(serverAddress)!.split(':');
          serverAddress = splitted[0];
          if (splitted[1])
            serverPort = parseInt(splitted[1], 10);

          dispatch.proxyToRemote(serverAddress, serverPort, clientToProxySocket, data, isTLSConnection, protocal);
        } else if (opts?.fallbackProxyHost) {
          dispatch.proxyToProxy(opts.fallbackProxyHost, opts.fallbackproxyPort,
            clientToProxySocket, data);
        } else if (serverAddress) {
          dispatch.proxyToRemote(serverAddress, serverPort, clientToProxySocket, data, isTLSConnection, protocal);
        } else {
          throw new Error(`unknown server address for ${greeting}`);
        }
      })
    ),
    action$.pipe(
      ofType('proxyToProxy'),
      op.map(({payload: [host, port, clientToProxySocket, data]}) => {
        let proxyToServerSocket = net.connect({
          host, port
        }, () => {
          log.warn('PROXY TO FORBACK proxy connection created', host, ':', port);
          proxyToServerSocket = proxyToServerSocket.pipe(clientToProxySocket);
          proxyToServerSocket.write(data);
          // Piping the sockets
          clientToProxySocket.pipe(proxyToServerSocket);
        });
        dispatch.remoteSocketCreated(proxyToServerSocket, 'Remote proxy');
      })
    ),
    action$.pipe(
      ofType('proxyToRemote'),
      op.map(({payload: [host, port, clientToProxySocket, data, isTLSConnection, protocal]}) => {
        let proxyToServerSocket = net.connect({
          host,
          port
        }, () => {
          log.info('PROXY TO SERVER connection created', host, ':', port);

          if (isTLSConnection) {
            // Send Back OK to HTTPS CONNECT Request
            clientToProxySocket.write(protocal + ' 200 OK\r\n\n');
          } else {
            proxyToServerSocket.write(data);
          }
          // Piping the sockets
          clientToProxySocket.pipe(proxyToServerSocket);
          proxyToServerSocket = proxyToServerSocket.pipe(clientToProxySocket);
        });
        dispatch.remoteSocketCreated(proxyToServerSocket, 'remote server');
      })
    ),
    action$.pipe(
      ofType('remoteSocketCreated'),
      op.map(({payload: [proxyToServerSocket]}) => {
        log.info('Register error event handler to socket');
        proxyToServerSocket.on('error', (err) => {
        log.warn('PROXY TO SERVER ERROR', proxyToServerSocket.remoteAddress, ':', proxyToServerSocket.remotePort, err);
        });
        proxyToServerSocket.on('lookup', (err, addr, _fam, host) => {
          if (err)
            log.warn('lookup error', err);
          log.info('lookup', addr, host);
        });
        proxyToServerSocket.on('timeout', () => {
          log.info('PROXY TO SERVER timeout', proxyToServerSocket.remoteAddress, ':', proxyToServerSocket.remotePort);
        });
      })
    )
  ).pipe(
    op.catchError((err, src) => {
      log.error('Fatal error', err);
      return src;
    })
  ).subscribe();

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

  return () => {
    server.close();
  };
}

