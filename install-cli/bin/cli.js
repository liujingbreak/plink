#!/usr/bin/env node

var nodePath = require('./nodePath');
nodePath();

try {
	require('web-fun-house/bin/dr');
} catch (e) {
	console.log(e);
	console.log('There is no local web-fun-house installed.\n' +
		'Execute\n\tnpm install web-fun-house\n' +
		'Or execute command with proper arguments "--root <directory>"');
}
