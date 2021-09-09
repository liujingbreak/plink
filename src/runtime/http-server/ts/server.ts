import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as Path from 'path';
import api from '__api';
import {getLanIPv4} from '@wfh/plink/wfh/dist/utils/network-util';
import {log4File} from '@wfh/plink';

const log = log4File(__filename);
var server: https.Server | http.Server;

let healthCheckServer: {startServer(): void; endServer(): void} | undefined;
try {
  healthCheckServer = api.config.get(api.packageName + '.noHealthCheck', false) ?
    false : require('@bk/bkjk-node-health-server');
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    log.info('@bk/bkjk-node-health-server is not found, skip it.');
  }
}

if (healthCheckServer) {
  const startHealthServer = () => {
    log.info('start Health-check Server');
    healthCheckServer!.startServer();
  };
  const endHealthServer = () => {
    log.info('Health-check Server is shut');
    healthCheckServer!.endServer();
  };
  api.eventBus.on('serverStarted', startHealthServer);
  api.eventBus.on('serverStopped', endHealthServer);
}


export function activate() {
  const config = api.config;
  const rootPath: string = config().rootPath;

  const sslSetting: any = config()['@wfh/http-server'].ssl;

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
    api.eventBus.on('appCreated', startHttpsServer);
  } else {
    api.eventBus.on('appCreated', startHttpServer);
  }

  function startHttpServer(app: any) {
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
    server.on('error', (err: Error) => {
      onError(server, port, err);
    });
    server.on('listening', () => {
      onListening(server, 'HTTP server', port);
      api.eventBus.emit('serverStarted', {});
    });
  }

  function startHttpsServer(app: any) {
    log.info('start HTTPS');
    const startPromises = [];
    let port: number | string = sslSetting.port ? sslSetting.port : 433;
    let httpPort = config().port ? config().port : 80;

    port = typeof(port) === 'number' ? port : normalizePort(port );
    server = https.createServer({
      key: fs.readFileSync(Path.resolve(rootPath, sslSetting.key)),
      cert: fs.readFileSync(Path.resolve(rootPath, sslSetting.cert))
    }, app);

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

    if (sslSetting.httpForward !== false) {
      const redirectHttpServer = http.createServer((req: any, res: any) => {
        log.debug('req.headers.host: %j', req.headers.host);
        const url = 'https://' + /([^:]+)(:[0-9]+)?/.exec(req.headers.host)![1] + ':' + port;
        log.debug('redirect to ' + url);
        res.writeHead(307, {
          Location: url,
          'Content-Type': 'text/plain'
        });
        res.end('');
      });

      redirectHttpServer.listen(httpPort);
      redirectHttpServer.on('error', (error: Error) => {
        onError(server, httpPort, error);
      });

      startPromises.push(new Promise(resolve => {
        redirectHttpServer.on('listening', () => resolve(redirectHttpServer));
      }));
    }

    void Promise.all(startPromises)
    .then((servers: any[]) => {
      onListening(servers[0], 'HTTPS server', port);
      if (servers.length > 1)
        onListening(servers[1], 'HTTP Forwarding server', httpPort);
      api.eventBus.emit('serverStarted', {});
    });
  }

  function normalizePort(val: string): number | string {
    const port = parseInt(val , 10);
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
