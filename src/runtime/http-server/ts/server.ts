/* eslint-disable @typescript-eslint/indent */
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as Path from 'path';
import * as rx from 'rxjs';
import api from '__api';
import {getLanIPv4} from '@wfh/plink/wfh/dist/utils/network-util';
import {log4File, config} from '@wfh/plink';

const log = log4File(__filename);
let server: https.Server | http.Server | undefined;

export const serverCreated$ = new rx.ReplaySubject<http.Server | https.Server>();

export function activate() {
  const rootPath: string = config().rootPath;

  const multiServerSetting = config()['@wfh/http-server'].servers;

  if (multiServerSetting) {
    for (const serverCfg of multiServerSetting) {
      if (serverCfg.ssl) {
        const key = fs.readFileSync(Path.resolve(rootPath, serverCfg.ssl.key));
        const cert = fs.readFileSync(Path.resolve(rootPath, serverCfg.ssl.cert));
        api.eventBus.on('appCreated', (app) => startHttpsServer(app, serverCfg.port, key, cert));
      } else {
        api.eventBus.on('appCreated', (app) => startHttpServer(app, serverCfg.port));
      }
    }
  } else {
    const sslSetting = config()['@wfh/http-server'].ssl;

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
      api.eventBus.on('appCreated', (app) => startHttpsServer(
        app, Number(sslSetting.port ? sslSetting.port : 433),
        key, cert
      ));
    } else {
      api.eventBus.on('appCreated', (app) => startHttpServer(app, Number(config().port ? config().port : 80)));
    }
  }

  function startHttpServer(app: any, port: number) {
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
    serverCreated$.next(server);
    server.listen(port);
    server.on('error', (err: Error) => {
      onError(server, port, err);
    });
    server.on('listening', () => {
      onListening(server, 'HTTP server', port);
      api.eventBus.emit('serverStarted', {});
    });

    for (const hostname of config()['@wfh/http-server'].hostnames) {
      log.info('listen on additional host name:', hostname);
      const server = http.createServer(app);
      serverCreated$.next(server);
      server.listen(port, hostname);
      server.on('error', (err: Error) => {
        onError(server, port, err);
      });
      server.on('listening', () => {
        onListening(server, 'HTTP server', port);
        api.eventBus.emit('serverStarted', {});
      });
    }
  }

  function startHttpsServer(app: any, port: number, key: Buffer, cert: Buffer) {
    log.info('start HTTPS');
    const startPromises = [];
    // let port: number = Number(sslSetting.port ? sslSetting.port : 433);
    const httpPort = config().port ? config().port : 80;

    const server = https.createServer({key, cert}, app);
    serverCreated$.next(server);

    server.listen(port);
    if (/^v8.\d.\d+$/.test(process.version)) {
      (server as any).keepAliveTimeout = 30000; // 30 seconds
    }
    server.on('error', (error: Error) => {
      onError(server, port, error);
    });
    startPromises.push(new Promise(resolve => {
      server.on('listening', () => resolve(server));
    }));

    for (const hostname of config()['@wfh/http-server'].hostnames) {
      log.info('listen on additional host name:', hostname);
      const server = https.createServer({key, cert}, app);
      serverCreated$.next(server);
      server.listen(port, hostname);
      server.on('error', (error: Error) => {
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
      .then((servers: any[]) => {
        onListening(servers[0], 'HTTPS server', port);
        if (servers.length > 1)
          onListening(servers[1], 'HTTP Forwarding server', httpPort);
        api.eventBus.emit('serverStarted', {});
      });
  }

  /**
	 * Event listener for HTTP server "listening" event.
	 */
  function onListening(server: http.Server | https.Server, title: string, port: number | string) {
    const addr = getLanIPv4();
    log.info(`${title} is listening on ${addr}:${port}`);
  }

  /**
	 * Event listener for HTTP server "error" event.
	 */
  function onError(server: http.Server | https.Server, port: number | string, error: any) {
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

export function deactivate() {
  api.eventBus.emit('serverStopped', {});
  if (server)
    server.close();
  log.info('HTTP server is shut');
}

function fileAccessable(file: string) {
  try {
    fs.accessSync(file, fs.constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
}
