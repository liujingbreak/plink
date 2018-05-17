#!/usr/bin/env node

var nodePath = require('./nodePath');
nodePath();

try {
	require('dr-comp-package/bin/dr');
} catch (e) {
	console.log(e);
	console.log('There is no local dr-comp-package installed.\n' +
		'Execute\n\tnpm install dr-comp-package\n' +
		'Or execute command with proper arguments "--root <directory>"');
}
