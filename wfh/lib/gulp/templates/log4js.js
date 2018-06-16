const cluster = require('cluster');
const os = require('os');

var isPm2 = cluster.isWorker && process.env.NODE_APP_INSTANCE != null;
var pm2Intercom = true;

const patterns = {
	fileDate: '%d [%p] %c - %m',
	colorfulOutput: '%[[%p]%c%] - %m',
	clusterFileDate: '%d (PID:%z)[%p] %c - %m'
};

if (isPm2) {
	// log4js requires special treatment for cluster or PM2 environment
	console.log('[log4js.js] worker id', cluster.worker.id);
	console.log('[log4js.js] process.env.NODE_APP_INSTANCE', process.env.NODE_APP_INSTANCE);
	try {
		require('pm2-intercom');
	} catch (e) {
		if (e.code === 'MODULE_NOT_FOUND') {
			pm2Intercom = false;
			console.log('[log4js.js] Since "pm2-intercom" is not installed, pm2 mode wiil be disable and switched to "disableClustering" mode.');
		} else
			console.log(e);
	}
}

var config = {
	pm2: isPm2 && pm2Intercom,
	disableClustering: isPm2 && !pm2Intercom,
	appenders: {
		out: {
			type: 'stdout',
			layout: {type: 'pattern', pattern: cluster.isWorker ? patterns.clusterFileDate : patterns.colorfulOutput}
		},
		infoOut: {type: 'logLevelFilter', appender: 'out', level: 'info'},
		errorOut: {type: 'logLevelFilter', appender: 'out', level: 'error'},
		file: {
			type: 'file',
			filename: 'logs/credit-nodejs-server.log',
			keepFileExt: true,
			layout: {type: 'pattern', pattern: cluster.isWorker ? patterns.clusterFileDate : patterns.fileDate},
			maxLogSize: 500 * 1024,
			backups: 2
		},
		// You need to install "@log4js-node/slack": "^1.0.0"
		slack: {
			type: '@log4js-node/slack',
			token: 'xoxp-312833633648-360821048965-382755661938-eea29fbbad616de83d52a6d51c787641',
			channel_id: 'credit_service_log',
			username: os.hostname() + ' ' + os.userInfo().username
		},
		errorSlack: {type: 'logLevelFilter', appender: 'slack', level: 'error'}
	},
	categories: {
		'default': {appenders: ['out', 'file'], level: 'info'},
		'dr-comp-package': {appenders: ['file'], level: 'debug'},
		'@dr-core/assets-processer': {appenders: ['infoOut', 'file'], level: 'debug'},
		'wfh.module-dep-helper': {appenders: ['infoOut', 'file'], level: 'info'},
		'wfh.ManualChunkPlugin': {appenders: ['infoOut', 'file'], level: 'debug'},
		'wfh.ManualChunkPlugin-m': {appenders: ['out', 'file'], level: 'error'},
		'wfh.moreWebpackOptions.js': {appenders: ['infoOut', 'file'], level: 'debug'}
	}
};

var has = Object.prototype.hasOwnProperty;
if (isPm2 && !pm2Intercom) {
	console.log('[log4js.js] Remove file appender since "pm2-intercom" is not installed.');
	var cats = config.categories;
	for (var f in cats) {
		if (has.call(cats, f) && cats[f].appenders) {
			let aps = cats[f].appenders = cats[f].appenders.filter(ap => ap !== 'file');
			if (aps.length === 0)
				delete cats[f];
		}
	}
}

module.exports = config;

module.exports.setup = function(options) {
	var {logger} = options;
	if (logger == null)
		return config;
	if (logger.noFileLimit) {
		console.log('[log4js.js] No file max log size limitation');
		delete config.appenders.file.maxLogSize;
		delete config.appenders.file.backups;
	}
	if (logger.onlyFileOut) {
		for (let cat of Object.values(config.categories)) {
			cat.appenders = ['file'];
		}
		console.log('[log4js.js] only file out');
	}
	return config;
};
