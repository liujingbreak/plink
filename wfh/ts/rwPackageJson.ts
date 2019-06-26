const gutil = require('gulp-util');
const PluginError = gutil.PluginError;
const through = require('through2');
import * as fs from 'fs-extra';
const pify = require('pify');
import * as Path from 'path';
const File = require('vinyl');
const jsonLint = require('json-lint');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
import * as _ from 'lodash';
const config = require('../lib/config');
const isWin32 = require('os').platform().indexOf('win32') >= 0;

const readFileAsync = pify(fs.readFile);

type Callback = (...args: any[]) => void;
/**
 * [readAsJson description]
 * @param  {function} onFile  [description]
 */
export function readAsJson(toFile: any, onFlush: () => void) {
	return through.obj(function(file: any, encoding: string, callback: (...args: any[]) => void) {
		gutil.log('reading ' + file.path);
		const self = this;
		readFileAsync(file.path, {encoding: 'utf-8'})
			.then(function(content: string) {
				const json = JSON.parse(content);
				return toFile(json, file);
			}).then(function(newFile: string) {
				callback(null, newFile);
			}).catch(function(err: Error) {
				gutil.log(err);
				self.emit('error', new PluginError('rwPackageJson.readAsJson', err.stack, {showStack: true}));
				callback(err);
			});
	},
	function flush(callback: () => void) {
		onFlush();
		callback();
	}
	);
}

export function symbolicLinkPackages(destDir: string) {
	return through.obj(async function(file: any, encoding: string, callback: Callback) {
		const self = this;
		var newPath, json;
		try {
			const content = fs.readFileSync(file.path, {encoding: 'utf-8'});
			const lint = jsonLint(content);
			if (lint.error) {
				log.error(lint);
				this.emit('error', new PluginError('rwPackageJson', lint, {showStack: true}));
				return callback();
			}
			json = JSON.parse(content);
			newPath = Path.join(fs.realpathSync(Path.join(destDir, 'node_modules')), json.name);
			let stat: fs.Stats, exists = false;
			try {
				stat = fs.lstatSync(newPath);
				exists = true;
			} catch (e) {
				if (e.code === 'ENOENT') {
					exists = false;
				} else
					throw e;
			}
			log.debug('symblink to %s', newPath);
			if (exists) {
				if (stat!.isFile() ||
					(stat!.isSymbolicLink() && fs.realpathSync(newPath) !== Path.dirname(file.path))) {
					fs.unlinkSync(newPath);
					_symbolicLink(Path.dirname(file.path), newPath);
				} else if (stat!.isDirectory()) {
					log.info('Remove installed package "%s"', Path.relative(process.cwd(), newPath));
					fs.removeSync(newPath);
					_symbolicLink(Path.dirname(file.path), newPath);
				}
			} else {
				_symbolicLink(Path.dirname(file.path), newPath);
			}
			self.push(new File({
				base: destDir,
				path: newPath,
				contents: new Buffer(JSON.stringify(json, null, '\t'))
			}));
			callback();
		} catch(err) {
			log.error(err);
			self.emit('error', new PluginError('rwPackageJson', err.stack, {showStack: true}));
			callback(err);
		}
	}, function(callback: any) {
		callback();
	});
}

export function _symbolicLink(dir: string, link: any) {
	fs.mkdirpSync(Path.dirname(link));
	fs.symlinkSync(Path.relative(Path.dirname(link), dir), link, isWin32 ? 'junction' : 'dir');
	log.info('Create symlink "%s"', Path.relative(process.cwd(), link));
}

const packageJsonTemp = {
	name: '@dr/',
	version: '0.1.0',
	description: 'Component group: ',
	dependencies: {}
};

/**
 * Write recipe file
 * Write an array of linked package path, and a recipe package.json file
 * @param {string} recipeAbsDir null when there is no recipe dir for those linked package file
 */
export function addDependency(recipeAbsDir: string) {
	const linkFiles: string[] = [];
	let destJson: any;
	const dependencies: {[k: string]: any} = {};
	let recipePkJsonStr: string;
	let recipeFile: string;
	if (recipeAbsDir) {
		recipeFile = Path.resolve(recipeAbsDir, 'package.json');
		if (fs.existsSync(recipeFile)) {
			log.debug('Existing recipeFile %s', recipeFile);
			recipePkJsonStr = fs.readFileSync(recipeFile, 'utf8');
			destJson = JSON.parse(recipePkJsonStr);
			// try {
			// 	dependencies = JSON.parse(recipePkJsonStr).dependencies;
			// } catch (err) {}
		} else {
			destJson = _.cloneDeep(packageJsonTemp);
			const recipeDirName = Path.basename(recipeAbsDir);
			destJson.name += recipeDirName.replace(/[/\\]/g, '-');
			destJson.description += recipeDirName;
			recipePkJsonStr = JSON.stringify(destJson, null, '  ');
		}
	}

	return through.obj(function(file: any, encoding: string, callback: any) {
		const json = JSON.parse(file.contents.toString('utf8'));

		log.debug('add to recipe: ' + recipeAbsDir + ' : ' + file.path);
		linkFiles.push(Path.relative(config().rootPath, file.path));
		if (!recipePkJsonStr)
			return callback();
		if (json.name === destJson.name) {
			log.debug('skip ', json.name);
			return callback();
		}
		dependencies[json.name] = json.version;
		callback();
	}, function flush(callback: any) {
		const self = this;
		self.push(linkFiles);
		if (recipePkJsonStr) {
			const destFile = new File({
				base: Path.resolve(config().rootPath),
				path: Path.resolve(recipeFile),
				contents: new Buffer(recipePkJsonStr.replace(/("dependencies"\s*:\s*)\{[^}]*\}/, '$1{\n' +
					sortProperties(dependencies) + '\n\t}'))
			});
			self.push(destFile);
		}
		callback();
	});
}

function sortProperties(obj: {[k: string]: string}): string {
	let toSort: Array<[string, string]> = [];
	_.each(obj, (value, key) => {
		toSort.push([key, value]);
	});
	toSort = toSort.sort((a, b) => {
		if (a < b)
			return -1;
		else if (a > b)
			return 1;
		else
			return 0;
	});
	let res = '';
	for (const item of toSort) {
		res += `\t\t"${item[0]}": "${item[1]}",\n`;
	}
	return res.slice(0, res.length - 2);
}

export function removeDependency() {
	return through.obj(function(file: any, encoding: string, callback: any) {
		log.info('removing dependencies from recipe file ' + file.path);
		var content = file.contents.toString('utf8');
		// read destJson
		const lint = jsonLint(content);
		if (lint.error) {
			log.error(lint);
			this.emit('error', lint.error);
			return callback();
		}
		const destJson = JSON.parse(content);
		// var promises = _.map(destJson.dependencies, (x, name) => {
		// 	return buildUtils.promisifyExe('npm', 'uninstall', name);
		// });
		destJson.dependencies = {};
		content = JSON.stringify(destJson, null, '\t');
		log.debug(content);
		file.contents = new Buffer(content);
		// Promise.all(promises).then(()=> {
		// 	callback(null, file);
		// });
		callback(null, file);
	});
}
