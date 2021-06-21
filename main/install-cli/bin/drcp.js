#!/usr/bin/env node

const Path = require('path');
const fs = require('fs');
// nodePath();
try {
	let dir = process.cwd();
	const {root} = Path.parse(dir);
	while (!fs.existsSync(Path.resolve(dir, 'node_modules/@wfh/plink/package.json'))) {
		const parent = Path.dirname(dir);
		if (parent === root) {
			console.error('Can not find @wfh/plink');
			process.exit(1);
			break;
		}
		dir = parent;
	}
	require(Path.resolve(dir, 'node_modules/@wfh/plink/wfh/dist/cmd-bootstrap'));
} catch (e) {
	console.log(e);
}
