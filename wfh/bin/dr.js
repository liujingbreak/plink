#!/usr/bin/env node
/* eslint no-console: 0 */
var Path = require('path');
console.log(`Breaking change since dr-comp-package@0.3.20, DRCP source code directory structure is changed.
Your current symblink "node_modules/dr-comp-package" is obsolete, you need to create a new one!

各位英雄, DRCP源码目录结构了, 需要重建软连接
`);

console.log('For Mac OSX or Linux environment, you need to re-create a symoblic link by executing commands:');
console.log(`	cd node-modules
	rm dr-comp-package
	ln -s ${Path.resolve(__dirname, '..', '..')} dr-comp-package
`);

console.log('If your symblink "node_modules/dr-comp-package" is previously created by "yarn link", run commands:');
console.log(`	cd ${Path.resolve(__dirname, '..')}
	yarn unlink
	cd ${Path.resolve(__dirname, '..', '..')}
	yarn link
	cd ${process.cwd()}
	yarn unlink dr-comp-package
	yarn link dr-comp-package
`);
