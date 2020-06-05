
const {getLanIPv4} = require('../dist/utils/network-util');

function getHostnamePath(config) {
	var _ = require('lodash');
	var ssl = _.get(config, 'ssl.enabled');
	var port = ssl ? config.ssl.port : config.port;
	return (ssl ? 'https' : 'http') + '://' + getLanIPv4() + (port ? ':' + port : '');
}

module.exports.getLocalIP = getLanIPv4;
module.exports.getHostnamePath = getHostnamePath;
