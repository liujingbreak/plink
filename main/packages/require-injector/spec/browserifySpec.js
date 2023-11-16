var shell = require('shelljs');
var spawn = require('child_process').spawn;
var Path = require('path');

describe('Browserify', function() {
	beforeEach(cleanup);
	it('command line should be able to use require-injector/transform as transform', function(done) {
		test('dir1/test.js', 'module.exports = \'dir1 \' + "hellow" + "world"', done);
	});

	it('command line should be able to use require-injector/transform as transform 2', function(done) {
		test('node_modules/@br/browser-module/browser.js', 'module.exports = "ABC" + "MODULE3";', done);
	});

});

function test(entryFile, containedStr, done) {
	// copyToNodeModules();
	const command = Path.resolve('node_modules/.bin/browserify' + (process.platform === 'win32' ? '.cmd' : ''));
	const args = [
		entryFile, '--global-transform', '[', 'require-injector/transform',
		'--inject', 'browserifyInjector.js', ']'
	];
	console.log(`${command} ${args.join(' ')}`);
	var proc = spawn(command, args, {
		cwd: Path.resolve(__dirname)
		//stdio: 'inherit'
	});
	var output = '';
	proc.on('exit', function(code, signal) {
		if (code !== 0 ) {
			return done.fail('failed to execute browserify command,\n' + output);
		}
		console.log(output);
		expect(output.indexOf(containedStr)).toBeGreaterThan(-1);
		done();
	})
	.on('error', err => {
		console.error(err);
		return done.fail('failed to execute browserify command,\n' + output);
	});

	proc.stdout.setEncoding('utf-8');
	proc.stdout.on('data', (chunk)=> {
		output += chunk;
	});
	proc.stderr.setEncoding('utf-8');
	proc.stderr.on('data', (chunk)=> {
		output += chunk;
	});
}

function cleanup() {
	shell.rm('-rf', 'bundle.js spec/node_modules/require-injector');
}

// function copyToNodeModules() {
// 	shell.mkdir('-p', 'spec/node_modules/require-injector');
// 	shell.cp('-r', 'lib', 'transform.js', 'index.js', 'css-loader.js',
// 		'spec/node_modules/require-injector/');
// 	shell.cp('package.json', 'spec/node_modules/require-injector/');
// }
