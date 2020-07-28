/*eslint no-loop-func: 0*/
const api = require('__api');

require('./dist/extend-builder-api');

exports.compile = () => {
	var angularCliParam = api.config()._angularCli;
	if (angularCliParam)
		return;
};


