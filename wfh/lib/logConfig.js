/* eslint no-console: 0 */
var Path = require('path');
var fs = require('fs-extra');

module.exports = function(configObj) {
	var {rootPath, log4jsReloadSeconds: reloadSec} = configObj;
	var log4js = require(Path.resolve('node_modules/log4js'));
	// var log4jsConfig = Path.resolve(__dirname, 'gulp/templates/log4js.json');
	var log4jsConfig = Path.join(rootPath, 'log4js.js');
	if (!fs.existsSync(log4jsConfig)) {
		console.log('Logging configuration is not found %s', log4jsConfig);
		return;
	}
	fs.mkdirpSync(Path.resolve(rootPath, 'logs'));

	var opt = {
		cwd: rootPath
	};

	if (reloadSec !== undefined)
		opt.reloadSecs = reloadSec;
	try {
		var localSetting = require(log4jsConfig);
		if (localSetting.setup instanceof Function) {
			localSetting = localSetting.setup(configObj);
		}
		log4js.configure(localSetting, opt);
		// var consoleLogger = log4js.getLogger('>');
		// console.log = consoleLogger.info.bind(consoleLogger);
		log4js.getLogger('logConfig').info(`\n\n-------------- ${new Date().toLocaleString()} ----------------\n`);
	} catch (e) {
		console.log(e);
		// console.log('\nIt seems current log4js configure file is outdated, please delete\n\t' + log4jsConfig +
		// 	'\n  and run "drcp init" to get a new one.\n');
		// // log4js.configure({
		// // 	appenders: {out: {type: 'stdout'}},
		// // 	categories: {default: {appenders: ['out'], level: 'info'}}
		// // });
	}
};
