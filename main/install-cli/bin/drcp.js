#!/usr/bin/env node

// var nodePath = require('./nodePath');
// const Path = require('path');
// nodePath();

try {
	require('dr-comp-package/wfh/dist/cmd-bootstrap');
} catch (e) {
	console.log(e);
}
