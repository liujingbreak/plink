"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const gutil = require('gulp-util');
const PluginError = gutil.PluginError;
const through = require('through2');
const fs = tslib_1.__importStar(require("fs-extra"));
const mkdirp = require('mkdirp');
const pify = require('pify');
const Path = tslib_1.__importStar(require("path"));
const File = require('vinyl');
const jsonLint = require('json-lint');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
const _ = tslib_1.__importStar(require("lodash"));
const config = require('../lib/config');
const isWin32 = require('os').platform().indexOf('win32') >= 0;
module.exports = {
    symbolicLinkPackages,
    addDependency,
    removeDependency,
    readAsJson
};
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                var stat, exists;
                try {
                    stat = fs.lstatSync(newPath);
                    exists = true;
                }
                catch (e) {
                    if (e.code === 'ENOENT') {
                        _symbolicLink(Path.dirname(file.path), newPath); // file doesn't exist, create a new link
                        exists = false;
                    }
                    else
                        throw e;
                }
                log.debug('symblink to %s', newPath);
                if (exists) {
                    if (stat.isFile() ||
                        (stat.isSymbolicLink() &&
                            (stat.mtime.getTime() < file.stat.mtime.getTime() || !fs.existsSync(newPath)))) {
                        fs.unlinkSync(newPath);
                        _symbolicLink(Path.dirname(file.path), newPath);
                    }
                    else if (stat.isDirectory()) {
                        log.info('Remove installed package "%s"', Path.relative(process.cwd(), newPath));
                        fs.removeSync(newPath);
                        _symbolicLink(Path.dirname(file.path), newPath);
                    }
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
    mkdirp.sync(Path.dirname(link));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ25DLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7QUFDdEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BDLHFEQUErQjtBQUMvQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLG1EQUE2QjtBQUM3QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkYsa0RBQTRCO0FBQzVCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUUvRCxNQUFNLENBQUMsT0FBTyxHQUFHO0lBQ2hCLG9CQUFvQjtJQUNwQixhQUFhO0lBQ2IsZ0JBQWdCO0lBQ2hCLFVBQVU7Q0FDVixDQUFDO0FBRUYsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUd4Qzs7O0dBR0c7QUFDSCxTQUFnQixVQUFVLENB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