#!/usr/bin/env node

// var nodePath = require('./nodePath');
const Path = require('path');
const fs = require('fs');
// nodePath();
try {
	let dir = process.cwd();
	while (!fs.existsSync(Path.resolve(dir, 'node_modules/dr-comp-package/package.json'))) {
		const parent = Path.dirname(dir);
		if (parent === dir) {
			console.error('Can not find dr-comp-package');
			process.exit(1);
			break;
		}
		dir = parent;
	}
	console.log('[drcp] Run command from ', dir);
	require(Path.resolve(dir, 'node_modules/dr-comp-package/wfh/dist/cmd-bootstrap'));
} catch (e) {
	console.log(e);
}
