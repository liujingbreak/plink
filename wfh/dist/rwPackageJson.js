"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const gutil = require('gulp-util');
const PluginError = gutil.PluginError;
const through = require('through2');
const fs = __importStar(require("fs-extra"));
const pify = require('pify');
const Path = __importStar(require("path"));
const File = require('vinyl');
const jsonLint = require('json-lint');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
const _ = __importStar(require("lodash"));
const config = require('../lib/config');
const isWin32 = require('os').platform().indexOf('win32') >= 0;
const readFileAsync = pify(fs.readFile);
/**
 * [readAsJson description]
 * @param  {function} onFile  [description]
 */
function readAsJson(toFile, onFlush) {
    return through.obj(function (file, encoding, callback) {
        gutil.log('reading ' + file.path);
        const self = this;
        readFileAsync(file.path, { encoding: 'utf-8' })
            .then(function (content) {
            const json = JSON.parse(content);
            return toFile(json, file);
        }).then(function (newFile) {
            callback(null, newFile);
        }).catch(function (err) {
            gutil.log(err);
            self.emit('error', new PluginError('rwPackageJson.readAsJson', err.stack, { showStack: true }));
            callback(err);
        });
    }, function flush(callback) {
        onFlush();
        callback();
    });
}
exports.readAsJson = readAsJson;
function symbolicLinkPackages(destDir) {
    return through.obj(function (file, encoding, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const self = this;
            var newPath, json;
            try {
                const content = fs.readFileSync(file.path, { encoding: 'utf-8' });
                const lint = jsonLint(content);
                if (lint.error) {
                    log.error(lint);
                    this.emit('error', new PluginError('rwPackageJson', lint, { showStack: true }));
                    return callback();
                }
                json = JSON.parse(content);
                newPath = Path.join(fs.realpathSync(Path.join(destDir, 'node_modules')), json.name);
                let stat, exists = false;
                try {
                    stat = fs.lstatSync(newPath);
                    exists = true;
                }
                catch (e) {
                    if (e.code === 'ENOENT') {
                        exists = false;
                    }
                    else
                        throw e;
                }
                log.debug('symblink to %s', newPath);
                if (exists) {
                    if (stat.isFile() ||
                        (stat.isSymbolicLink() && fs.realpathSync(newPath) !== Path.dirname(file.path))) {
                        fs.unlinkSync(newPath);
                        _symbolicLink(Path.dirname(file.path), newPath);
                    }
                    else if (stat.isDirectory()) {
                        log.info('Remove installed package "%s"', Path.relative(process.cwd(), newPath));
                        fs.removeSync(newPath);
                        _symbolicLink(Path.dirname(file.path), newPath);
                    }
                }
                else {
                    _symbolicLink(Path.dirname(file.path), newPath);
                }
                self.push(new File({
                    base: destDir,
                    path: newPath,
                    contents: new Buffer(JSON.stringify(json, null, '\t'))
                }));
                callback();
            }
            catch (err) {
                log.error(err);
                self.emit('error', new PluginError('rwPackageJson', err.stack, { showStack: true }));
                callback(err);
            }
        });
    }, function (callback) {
        callback();
    });
}
exports.symbolicLinkPackages = symbolicLinkPackages;
function _symbolicLink(dir, link) {
    fs.mkdirpSync(Path.dirname(link));
    fs.symlinkSync(Path.relative(Path.dirname(link), dir), link, isWin32 ? 'junction' : 'dir');
    log.info('Create symlink "%s"', Path.relative(process.cwd(), link));
}
exports._symbolicLink = _symbolicLink;
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
function addDependency(recipeAbsDir) {
    const linkFiles = [];
    let destJson;
    const dependencies = {};
    let recipePkJsonStr;
    let recipeFile;
    if (recipeAbsDir) {
        recipeFile = Path.resolve(recipeAbsDir, 'package.json');
        if (fs.existsSync(recipeFile)) {
            log.debug('Existing recipeFile %s', recipeFile);
            recipePkJsonStr = fs.readFileSync(recipeFile, 'utf8');
            destJson = JSON.parse(recipePkJsonStr);
            // try {
            // 	dependencies = JSON.parse(recipePkJsonStr).dependencies;
            // } catch (err) {}
        }
        else {
            destJson = _.cloneDeep(packageJsonTemp);
            const recipeDirName = Path.basename(recipeAbsDir);
            destJson.name += recipeDirName.replace(/[/\\]/g, '-');
            destJson.description += recipeDirName;
            recipePkJsonStr = JSON.stringify(destJson, null, '  ');
        }
    }
    return through.obj(function (file, encoding, callback) {
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
    }, function flush(callback) {
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
exports.addDependency = addDependency;
function sortProperties(obj) {
    let toSort = [];
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
function removeDependency() {
    return through.obj(function (file, encoding, callback) {
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
exports.removeDependency = removeDependency;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDbkMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztBQUN0QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsNkNBQStCO0FBQy9CLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QiwyQ0FBNkI7QUFDN0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ25GLDBDQUE0QjtBQUM1QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDeEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFL0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUd4Qzs7O0dBR0c7QUFDSCxTQUFnQixVQUFVLENBQUMsTUFBVyxFQUFFLE9BQW1CO0lBQzFELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFTLElBQVMsRUFBRSxRQUFnQixFQUFFLFFBQWtDO1FBQzFGLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxH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