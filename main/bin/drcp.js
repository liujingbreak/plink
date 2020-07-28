#!/usr/bin/env node
/* eslint-disable no-console */
var nodePath = require('./nodePath');
const Path = require('path');
nodePath();
// try {
// 	require('source-map-support/register');
// 	console.log('here');
// } catch (e) {
// 	console.log('config-handler:', e.message);
// }
try {
	require('dr-comp-package/wfh/dist/cmd-bootstrap');
} catch (e) {
	console.log(e);
	console.log('There is no local dr-comp-package installed.\n' +
		'Execute\n\tnpm install dr-comp-package\n' +
		'Or execute command with proper arguments "--root <directory>"');
}
