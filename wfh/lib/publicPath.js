var _ = require('lodash');
var log = require('log4js').getLogger('wfh');

module.exports = publicPath;
module.exports.getLocalIP = getLocalIP;
module.exports.getHostnamePath = getHostnamePath;

var localIP;

function publicPath(config) {
	var prefix = config.staticAssetsURL ? config.staticAssetsURL : '';
	return prefix.endsWith('/') ? prefix : prefix + '/';
	// prefix = _.trimEnd(prefix, '/');
	// return prefix + '/';
	// if (/^https?:\/\//.test(prefix)) {
	// 	return prefix + '/';
	// } else {
	// 	return prefix + '/';
	// 	//return urlJoin(getHostnamePath(config), prefix) + '/';
	// }
}

// function urlJoin(...paths) {
// 	var joined = '';
// 	paths.forEach((p, i)=> {
// 		p = _.trim(p, '/');
// 		if (p.length > 0) {
// 			if (joined.length > 0)
// 				joined += '/';
// 			joined += p;
// 		}
// 	});
// 	return joined;
// }

function getHostnamePath(config) {
	var ssl = _.get(config, 'ssl.enabled');
	var port = ssl ? config.ssl.port : config.port;
	return (ssl ? 'https' : 'http') + '://' + getLocalIP() + (port ? ':' + port : '');
}

function getLocalIP() {
	if (localIP)
		return localIP;
	var os = require('os');
	var ifaces = os.networkInterfaces();
	var ips = [];
	Object.keys(ifaces).forEach(function(ifname) {
		var alias = 0;
		ifaces[ifname].forEach(function(iface) {
			if (iface.family !== 'IPv4' || iface.internal !== false) {
				// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
				return;
			}

			if (alias >= 1) {
				// this single interface has multiple ipv4 addresses
				log.info(ifname + ':' + alias, iface.address);
			} else {
				// this interface has only one ipv4 adress
				log.info(ifname, iface.address);
			}
			ips.push(iface.address);
			++alias;
		});
	});
	localIP = ips.length === 0 ? 'localhost' : ips[0];
	return localIP;
}
