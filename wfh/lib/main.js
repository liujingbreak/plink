//var nodePathSetup = require('../../bin/nodePath');
//nodePathSetup();

// var Path = require('path');
require('./cmd-args').nodeAppCommand(function(argv) {
	var config = require('./config');

	// require('./gulp/cli').getProjects(config().rootPath)
	// 	.forEach(prj => nodePathSetup.removeNodePath(Path.resolve(prj, 'node_modules')));
	require('./logConfig')(config());
	var log = require('log4js').getLogger('lib.main');
	var pkMgr = require('./packageMgr');

	try {
		process.on('uncaughtException', function(err) {
			log.error('Uncaught exception: ', err, err.stack);
			throw err; // let PM2 handle exception
		});
		process.on('SIGINT', function() {
			log.info('Recieve SIGINT, bye.');
			process.exit(0);
		});
		process.on('message', function(msg) {
			if (msg === 'shutdown') {
				log.info('Recieve shutdown message from PM2, bye.');
				process.exit(0);
			}
		});
		process._config = config;
		pkMgr.runServer(argv)
		.catch(err => {
			log.error('Failed to start server:', err);
			process.exit(1); // Log4js "log4jsReloadSeconds" will hang process event loop, so we have to explicitly quit.
		});
	} catch (err) {
		log.error('Failed to start server:', err);
		throw err;
	}
});

