var _ = require('lodash');

function Logger(name) {
	this.name = name;
}

module.exports = Logger;

Logger.getLogger = function(name) {
	var log = new Logger(name);
	return log;
};

if (console) {
	_.create(Logger.prototype, console.prototype);
}

_.each(['error', 'warn', 'info', 'debug', 'trace'], function(level) {
	if (!window.console) {
		Logger.prototype[level] = function() {};
		return;
	}

	Logger.prototype[level] = function(msg, error) {
		var arg = [].slice.call(arguments);
		if (_.isString(arg[0])) {
			var file = new Error().stack.split(/\n\s*/)[2];
			arg[0] = this.name + file + ' - ' + arg[0];
		}
		console[level].apply(console, arg);
	};
});

if (window.console) {
	console.log('@dr/logger is started');
}
