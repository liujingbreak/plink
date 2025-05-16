var Rj = require('..').default;
let rj = new Rj();
var Path = require('path');
var fs = require('fs');

describe('Injected module name can contain slash', ()=> {
	afterEach(() => {
		delete require.cache[require.resolve('module1')];
		delete require.cache[require.resolve('module2')];
		delete require.cache[require.resolve('module3')];
		delete require.cache[require.resolve('./dir1/test.js')];
		delete require.cache[require.resolve('./dir2/test.js')];
		delete require.cache[require.resolve('./dir2/dir3')];
		delete require.cache[require.resolve('./dir2/dir3/dir4')];
		delete require.cache[require.resolve('lodash/set')];
	});

	it('.value(path, value) should work for Node', ()=> {
		rj = new Rj({
			basedir: __dirname
		});
		rj.fromDir('dir1').value('module1/index', 'hellow');
		var exports = require('./dir1/testRequirePath');
		expect(exports).toBe('hellow');
	});

	it('.value(path, value) should work for replacement', ()=> {
		rj = new Rj({
			basedir: __dirname,
			noNode: true
		});
		rj.fromDir('dir1').value('module1/index', 'hellow');
		var file = Path.resolve(__dirname, 'dir1/testRequirePath.js');
		var content = rj.injectToFile(file, fs.readFileSync(file, 'utf8'));
		expect(content.indexOf('hellow') >= 0).toBe(true);
	});
});
