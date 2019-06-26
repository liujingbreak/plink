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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDbkMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztBQUN0QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsNkNBQStCO0FBQy9CLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QiwyQ0FBNkI7QUFDN0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ25GLDBDQUE0QjtBQUM1QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDeEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFL0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUd4Qzs7O0dBR0c7QUFDSCxTQUFnQixVQUFVLENBQUMsTUFBVyxFQUFFLE9BQW1CO0lBQzFELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFTLElBQVMsRUFBRSxRQUFnQixFQUFFLFFBQWtDO1FBQzFGLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxH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ZixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMvQixPQUFPLFFBQVEsRUFBRSxDQUFDO1NBQ2xCO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyw2REFBNkQ7UUFDN0QsNkRBQTZEO1FBQzdELE1BQU07UUFDTixRQUFRLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUMzQixPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9DLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxvQ0FBb0M7UUFDcEMseUJBQXlCO1FBQ3pCLE1BQU07UUFDTixRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXhCRCw0Q0F3QkMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBndXRpbCA9IHJlcXVpcmUoJ2d1bHAtdXRpbCcpO1xuY29uc3QgUGx1Z2luRXJyb3IgPSBndXRpbC5QbHVnaW5FcnJvcjtcbmNvbnN0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuY29uc3QgcGlmeSA9IHJlcXVpcmUoJ3BpZnknKTtcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBGaWxlID0gcmVxdWlyZSgndmlueWwnKTtcbmNvbnN0IGpzb25MaW50ID0gcmVxdWlyZSgnanNvbi1saW50Jyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3dmaC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykpO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgY29uZmlnID0gcmVxdWlyZSgnLi4vbGliL2NvbmZpZycpO1xuY29uc3QgaXNXaW4zMiA9IHJlcXVpcmUoJ29zJykucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5cbmNvbnN0IHJlYWRGaWxlQXN5bmMgPSBwaWZ5KGZzLnJlYWRGaWxlKTtcblxudHlwZSBDYWxsYmFjayA9ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZDtcbi8qKlxuICogW3JlYWRBc0pzb24gZGVzY3JpcHRpb25dXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gb25GaWxlICBbZGVzY3JpcHRpb25dXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNKc29uKHRvRmlsZTogYW55LCBvbkZsdXNoOiAoKSA9PiB2b2lkKSB7XG5cdHJldHVybiB0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuY29kaW5nOiBzdHJpbmcsIGNhbGxiYWNrOiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcblx0XHRndXRpbC5sb2coJ3JlYWRpbmcgJyArIGZpbGUucGF0aCk7XG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0cmVhZEZpbGVBc3luYyhmaWxlLnBhdGgsIHtlbmNvZGluZzogJ3V0Zi04J30pXG5cdFx0XHQudGhlbihmdW5jdGlvbihjb250ZW50OiBzdHJpbmcpIHtcblx0XHRcdFx0Y29uc3QganNvbiA9IEpTT04ucGFyc2UoY29udGVudCk7XG5cdFx0XHRcdHJldHVybiB0b0ZpbGUoanNvbiwgZmlsZSk7XG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKG5ld0ZpbGU6IHN0cmluZykge1xuXHRcdFx0XHRjYWxsYmFjayhudWxsLCBuZXdGaWxlKTtcblx0XHRcdH0pLmNhdGNoKGZ1bmN0aW9uKGVycjogRXJyb3IpIHtcblx0XHRcdFx0Z3V0aWwubG9nKGVycik7XG5cdFx0XHRcdHNlbGYuZW1pdCgnZXJyb3InLCBuZXcgUGx1Z2luRXJyb3IoJ3J3UGFja2FnZUpzb24ucmVhZEFzSnNvbicsIGVyci5zdGFjaywge3Nob3dTdGFjazogdHJ1ZX0pKTtcblx0XHRcdFx0Y2FsbGJhY2soZXJyKTtcblx0XHRcdH0pO1xuXHR9LFxuXHRmdW5jdGlvbiBmbHVzaChjYWxsYmFjazogKCkgPT4gdm9pZCkge1xuXHRcdG9uRmx1c2goKTtcblx0XHRjYWxsYmFjaygpO1xuXHR9XG5cdCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzeW1ib2xpY0xpbmtQYWNrYWdlcyhkZXN0RGlyOiBzdHJpbmcpIHtcblx0cmV0dXJuIHRocm91Z2gub2JqKGFzeW5jIGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jb2Rpbmc6IHN0cmluZywgY2FsbGJhY2s6IENhbGxiYWNrKSB7XG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIG5ld1BhdGgsIGpzb247XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZS5wYXRoLCB7ZW5jb2Rpbmc6ICd1dGYtOCd9KTtcblx0XHRcdGNvbnN0IGxpbnQgPSBqc29uTGludChjb250ZW50KTtcblx0XHRcdGlmIChsaW50LmVycm9yKSB7XG5cdFx0XHRcdGxvZy5lcnJvcihsaW50KTtcblx0XHRcdFx0dGhpcy5lbWl0KCdlcnJvcicsIG5ldyBQbHVnaW5FcnJvcigncndQYWNrYWdlSnNvbicsIGxpbnQsIHtzaG93U3RhY2s6IHRydWV9KSk7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjaygpO1xuXHRcdFx0fVxuXHRcdFx0anNvbiA9IEpTT04ucGFyc2UoY29udGVudCk7XG5cdFx0XHRuZXdQYXRoID0gUGF0aC5qb2luKGZzLnJlYWxwYXRoU3luYyhQYXRoLmpvaW4oZGVzdERpciwgJ25vZGVfbW9kdWxlcycpKSwganNvbi5uYW1lKTtcblx0XHRcdGxldCBzdGF0OiBmcy5TdGF0cywgZXhpc3RzID0gZmFsc2U7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRzdGF0ID0gZnMubHN0YXRTeW5jKG5ld1BhdGgpO1xuXHRcdFx0XHRleGlzdHMgPSB0cnVlO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRpZiAoZS5jb2RlID09PSAnRU5PRU5UJykge1xuXHRcdFx0XHRcdGV4aXN0cyA9IGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Vcblx0XHRcdFx0XHR0aHJvdyBlO1xuXHRcdFx0fVxuXHRcdFx0bG9nLmRlYnVnKCdzeW1ibGluayB0byAlcycsIG5ld1BhdGgpO1xuXHRcdFx0aWYgKGV4aXN0cykge1xuXHRcdFx0XHRpZiAoc3RhdCEuaXNGaWxlKCkgfHxcblx0XHRcdFx0XHQoc3RhdCEuaXNTeW1ib2xpY0xpbmsoKSAmJiBmcy5yZWFscGF0aFN5bmMobmV3UGF0aCkgIT09IFBhdGguZGlybmFtZShmaWxlLnBhdGgpKSkge1xuXHRcdFx0XHRcdGZzLnVubGlua1N5bmMobmV3UGF0aCk7XG5cdFx0XHRcdFx0X3N5bWJvbGljTGluayhQYXRoLmRpcm5hbWUoZmlsZS5wYXRoKSwgbmV3UGF0aCk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoc3RhdCEuaXNEaXJlY3RvcnkoKSkge1xuXHRcdFx0XHRcdGxvZy5pbmZvKCdSZW1vdmUgaW5zdGFsbGVkIHBhY2thZ2UgXCIlc1wiJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBuZXdQYXRoKSk7XG5cdFx0XHRcdFx0ZnMucmVtb3ZlU3luYyhuZXdQYXRoKTtcblx0XHRcdFx0XHRfc3ltYm9saWNMaW5rKFBhdGguZGlybmFtZShmaWxlLnBhdGgpLCBuZXdQYXRoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0X3N5bWJvbGljTGluayhQYXRoLmRpcm5hbWUoZmlsZS5wYXRoKSwgbmV3UGF0aCk7XG5cdFx0XHR9XG5cdFx0XHRzZWxmLnB1c2gobmV3IEZpbGUoe1xuXHRcdFx0XHRiYXNlOiBkZXN0RGlyLFxuXHRcdFx0XHRwYXRoOiBuZXdQYXRoLFxuXHRcdFx0XHRjb250ZW50czogbmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAnXFx0JykpXG5cdFx0XHR9KSk7XG5cdFx0XHRjYWxsYmFjaygpO1xuXHRcdH0gY2F0Y2goZXJyKSB7XG5cdFx0XHRsb2cuZXJyb3IoZXJyKTtcblx0XHRcdHNlbGYuZW1pdCgnZXJyb3InLCBuZXcgUGx1Z2luRXJyb3IoJ3J3UGFja2FnZUpzb24nLCBlcnIuc3RhY2ssIHtzaG93U3RhY2s6IHRydWV9KSk7XG5cdFx0XHRjYWxsYmFjayhlcnIpO1xuXHRcdH1cblx0fSwgZnVuY3Rpb24oY2FsbGJhY2s6IGFueSkge1xuXHRcdGNhbGxiYWNrKCk7XG5cdH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX3N5bWJvbGljTGluayhkaXI6IHN0cmluZywgbGluazogYW55KSB7XG5cdGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGxpbmspKTtcblx0ZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUobGluayksIGRpciksIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuXHRsb2cuaW5mbygnQ3JlYXRlIHN5bWxpbmsgXCIlc1wiJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBsaW5rKSk7XG59XG5cbmNvbnN0IHBhY2thZ2VKc29uVGVtcCA9IHtcblx0bmFtZTogJ0Bkci8nLFxuXHR2ZXJzaW9uOiAnMC4xLjAnLFxuXHRkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCBncm91cDogJyxcblx0ZGVwZW5kZW5jaWVzOiB7fVxufTtcblxuLyoqXG4gKiBXcml0ZSByZWNpcGUgZmlsZVxuICogV3JpdGUgYW4gYXJyYXkgb2YgbGlua2VkIHBhY2thZ2UgcGF0aCwgYW5kIGEgcmVjaXBlIHBhY2thZ2UuanNvbiBmaWxlXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVjaXBlQWJzRGlyIG51bGwgd2hlbiB0aGVyZSBpcyBubyByZWNpcGUgZGlyIGZvciB0aG9zZSBsaW5rZWQgcGFja2FnZSBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGREZXBlbmRlbmN5KHJlY2lwZUFic0Rpcjogc3RyaW5nKSB7XG5cdGNvbnN0IGxpbmtGaWxlczogc3RyaW5nW10gPSBbXTtcblx0bGV0IGRlc3RKc29uOiBhbnk7XG5cdGNvbnN0IGRlcGVuZGVuY2llczoge1trOiBzdHJpbmddOiBhbnl9ID0ge307XG5cdGxldCByZWNpcGVQa0pzb25TdHI6IHN0cmluZztcblx0bGV0IHJlY2lwZUZpbGU6IHN0cmluZztcblx0aWYgKHJlY2lwZUFic0Rpcikge1xuXHRcdHJlY2lwZUZpbGUgPSBQYXRoLnJlc29sdmUocmVjaXBlQWJzRGlyLCAncGFja2FnZS5qc29uJyk7XG5cdFx0aWYgKGZzLmV4aXN0c1N5bmMocmVjaXBlRmlsZSkpIHtcblx0XHRcdGxvZy5kZWJ1ZygnRXhpc3RpbmcgcmVjaXBlRmlsZSAlcycsIHJlY2lwZUZpbGUpO1xuXHRcdFx0cmVjaXBlUGtKc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKHJlY2lwZUZpbGUsICd1dGY4Jyk7XG5cdFx0XHRkZXN0SnNvbiA9IEpTT04ucGFyc2UocmVjaXBlUGtKc29uU3RyKTtcblx0XHRcdC8vIHRyeSB7XG5cdFx0XHQvLyBcdGRlcGVuZGVuY2llcyA9IEpTT04ucGFyc2UocmVjaXBlUGtKc29uU3RyKS5kZXBlbmRlbmNpZXM7XG5cdFx0XHQvLyB9IGNhdGNoIChlcnIpIHt9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGRlc3RKc29uID0gXy5jbG9uZURlZXAocGFja2FnZUpzb25UZW1wKTtcblx0XHRcdGNvbnN0IHJlY2lwZURpck5hbWUgPSBQYXRoLmJhc2VuYW1lKHJlY2lwZUFic0Rpcik7XG5cdFx0XHRkZXN0SnNvbi5uYW1lICs9IHJlY2lwZURpck5hbWUucmVwbGFjZSgvWy9cXFxcXS9nLCAnLScpO1xuXHRcdFx0ZGVzdEpzb24uZGVzY3JpcHRpb24gKz0gcmVjaXBlRGlyTmFtZTtcblx0XHRcdHJlY2lwZVBrSnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGRlc3RKc29uLCBudWxsLCAnICAnKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbmNvZGluZzogc3RyaW5nLCBjYWxsYmFjazogYW55KSB7XG5cdFx0Y29uc3QganNvbiA9IEpTT04ucGFyc2UoZmlsZS5jb250ZW50cy50b1N0cmluZygndXRmOCcpKTtcblxuXHRcdGxvZy5kZWJ1ZygnYWRkIHRvIHJlY2lwZTogJyArIHJlY2lwZUFic0RpciArICcgOiAnICsgZmlsZS5wYXRoKTtcblx0XHRsaW5rRmlsZXMucHVzaChQYXRoLnJlbGF0aXZlKGNvbmZpZygpLnJvb3RQYXRoLCBmaWxlLnBhdGgpKTtcblx0XHRpZiAoIXJlY2lwZVBrSnNvblN0cilcblx0XHRcdHJldHVybiBjYWxsYmFjaygpO1xuXHRcdGlmIChqc29uLm5hbWUgPT09IGRlc3RKc29uLm5hbWUpIHtcblx0XHRcdGxvZy5kZWJ1Zygnc2tpcCAnLCBqc29uLm5hbWUpO1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKCk7XG5cdFx0fVxuXHRcdGRlcGVuZGVuY2llc1tqc29uLm5hbWVdID0ganNvbi52ZXJzaW9uO1xuXHRcdGNhbGxiYWNrKCk7XG5cdH0sIGZ1bmN0aW9uIGZsdXNoKGNhbGxiYWNrOiBhbnkpIHtcblx0XHRjb25zdCBzZWxmID0gdGhpcztcblx0XHRzZWxmLnB1c2gobGlua0ZpbGVzKTtcblx0XHRpZiAocmVjaXBlUGtKc29uU3RyKSB7XG5cdFx0XHRjb25zdCBkZXN0RmlsZSA9IG5ldyBGaWxlKHtcblx0XHRcdFx0YmFzZTogUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoKSxcblx0XHRcdFx0cGF0aDogUGF0aC5yZXNvbHZlKHJlY2lwZUZpbGUpLFxuXHRcdFx0XHRjb250ZW50czogbmV3IEJ1ZmZlcihyZWNpcGVQa0pzb25TdHIucmVwbGFjZSgvKFwiZGVwZW5kZW5jaWVzXCJcXHMqOlxccyopXFx7W159XSpcXH0vLCAnJDF7XFxuJyArXG5cdFx0XHRcdFx0c29ydFByb3BlcnRpZXMoZGVwZW5kZW5jaWVzKSArICdcXG5cXHR9JykpXG5cdFx0XHR9KTtcblx0XHRcdHNlbGYucHVzaChkZXN0RmlsZSk7XG5cdFx0fVxuXHRcdGNhbGxiYWNrKCk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzb3J0UHJvcGVydGllcyhvYmo6IHtbazogc3RyaW5nXTogc3RyaW5nfSk6IHN0cmluZyB7XG5cdGxldCB0b1NvcnQ6IEFycmF5PFtzdHJpbmcsIHN0cmluZ10+ID0gW107XG5cdF8uZWFjaChvYmosICh2YWx1ZSwga2V5KSA9PiB7XG5cdFx0dG9Tb3J0LnB1c2goW2tleSwgdmFsdWVdKTtcblx0fSk7XG5cdHRvU29ydCA9IHRvU29ydC5zb3J0KChhLCBiKSA9PiB7XG5cdFx0aWYgKGEgPCBiKVxuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdGVsc2UgaWYgKGEgPiBiKVxuXHRcdFx0cmV0dXJuIDE7XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIDA7XG5cdH0pO1xuXHRsZXQgcmVzID0gJyc7XG5cdGZvciAoY29uc3QgaXRlbSBvZiB0b1NvcnQpIHtcblx0XHRyZXMgKz0gYFxcdFxcdFwiJHtpdGVtWzBdfVwiOiBcIiR7aXRlbVsxXX1cIixcXG5gO1xuXHR9XG5cdHJldHVybiByZXMuc2xpY2UoMCwgcmVzLmxlbmd0aCAtIDIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlRGVwZW5kZW5jeSgpIHtcblx0cmV0dXJuIHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jb2Rpbmc6IHN0cmluZywgY2FsbGJhY2s6IGFueSkge1xuXHRcdGxvZy5pbmZvKCdyZW1vdmluZyBkZXBlbmRlbmNpZXMgZnJvbSByZWNpcGUgZmlsZSAnICsgZmlsZS5wYXRoKTtcblx0XHR2YXIgY29udGVudCA9IGZpbGUuY29udGVudHMudG9TdHJpbmcoJ3V0ZjgnKTtcblx0XHQvLyByZWFkIGRlc3RKc29uXG5cdFx0Y29uc3QgbGludCA9IGpzb25MaW50KGNvbnRlbnQpO1xuXHRcdGlmIChsaW50LmVycm9yKSB7XG5cdFx0XHRsb2cuZXJyb3IobGludCk7XG5cdFx0XHR0aGlzLmVtaXQoJ2Vycm9yJywgbGludC5lcnJvcik7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soKTtcblx0XHR9XG5cdFx0Y29uc3QgZGVzdEpzb24gPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuXHRcdC8vIHZhciBwcm9taXNlcyA9IF8ubWFwKGRlc3RKc29uLmRlcGVuZGVuY2llcywgKHgsIG5hbWUpID0+IHtcblx0XHQvLyBcdHJldHVybiBidWlsZFV0aWxzLnByb21pc2lmeUV4ZSgnbnBtJywgJ3VuaW5zdGFsbCcsIG5hbWUpO1xuXHRcdC8vIH0pO1xuXHRcdGRlc3RKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuXHRcdGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShkZXN0SnNvbiwgbnVsbCwgJ1xcdCcpO1xuXHRcdGxvZy5kZWJ1Zyhjb250ZW50KTtcblx0XHRmaWxlLmNvbnRlbnRzID0gbmV3IEJ1ZmZlcihjb250ZW50KTtcblx0XHQvLyBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoKT0+IHtcblx0XHQvLyBcdGNhbGxiYWNrKG51bGwsIGZpbGUpO1xuXHRcdC8vIH0pO1xuXHRcdGNhbGxiYWNrKG51bGwsIGZpbGUpO1xuXHR9KTtcbn1cbiJdfQ==