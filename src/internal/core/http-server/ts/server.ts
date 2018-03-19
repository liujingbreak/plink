import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as Path from 'path';
// var Promise = require('bluebird');
import * as log4js from 'log4js';
import api from '__api';
var config: any, log: any;

exports.activate = function() {
	log = log4js.getLogger(api.packageName);
	config = api.config;
	var rootPath: string = config().rootPath;

	var sslSetting: any = config.get(api.packageName + '.ssl') || config().ssl;

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
		api.eventBus.on('appCreated', startHttpsServer);
	} else {
		api.eventBus.on('appCreated', startHttpServer);
	}

	function startHttpServer(app: any) {
		log.info('start HTTP');
		var port = config().port ? config().port : 80;
		var server: http.Server = http.createServer(app);
		server.listen(port);
		server.on('error', (err: Error) => {
			onError(server, port, err);
		});
		server.on('listening', () => {
			onListening(server, 'HTTP Server');
			api.eventBus.emit('serverStarted', {});
		});
	}

	function startHttpsServer(app: any) {
		log.info('start HTTPS');
		var startPromises = [];
		var port: number | string = sslSetting.port ? sslSetting.port : 433;
		port = typeof(port) === 'number' ? port : normalizePort(port as string);
		var server: https.Server = https.createServer({
			key: fs.readFileSync(sslSetting.key),
			cert: fs.readFileSync(sslSetting.cert)
		}, app);
		server.listen(port);
		server.on('error', (error: Error) => {
			onError(server, port, error);
		});
		startPromises.push(new Promise(resolve => {
			server.on('listening', () => resolve(server));
		}));

		if (sslSetting.httpForward !== false) {
			var redirectHttpServer = http.createServer((req: any, res: any) => {
				log.debug('req.headers.host: %j', req.headers.host);
				var url = 'https://' + /([^:]+)(:[0-9]+)?/.exec(req.headers.host)[1] + ':' + port;
				log.debug('redirect to ' + url);
				res.writeHead(307, {
					Location: url,
					'Content-Type': 'text/plain'
				});
				res.end('');
			});
			redirectHttpServer.listen(config().port ? config().port : 80);
			redirectHttpServer.on('error', (error: Error) => {
				onError(server, port, error);
			});

			startPromises.push(new Promise(resolve => {
				redirectHttpServer.on('listening', () => resolve(redirectHttpServer));
			}));
		}
		Promise.all(startPromises)
		.then((servers: any[]) => {
			onListening(servers[0], 'HTTPS server');
			if (servers.length > 1)
				onListening(servers[1], 'HTTP Forwarding server');
			api.eventBus.emit('serverStarted', {});
		});
	}

	function normalizePort(val: string): number | string {
		var port = parseInt(val as string, 10);
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
	function onListening(server: http.Server, title: string) {
		var addr = server.address();
		var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + JSON.stringify(addr, null, '\t');
		log.info('%s is listening on %s', title ? title : '', bind);
	}

	/**
	 * Event listener for HTTP server "error" event.
	 */
	function onError(server: http.Server | https.Server, port: number | string, error: any) {
		log.error(error);
		if (error.syscall !== 'listen') {
			throw error;
		}

		var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

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
};

function fileAccessable(file: string) {
	try {
		fs.accessSync(file, fs.constants.R_OK);
		return true;
	} catch (e) {
		return false;
	}
}
