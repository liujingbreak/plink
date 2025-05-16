var rj = require('require-injector').getInstance({basedir: __dirname, noNode: true});
rj.fromDir('dir1')
	.value('aaa', 'hellow')
	.value('bbb', 'world');

rj.fromPackage('@br/browser-module')
.value('module3', 'MODULE3')
.value('abc', 'ABC');
