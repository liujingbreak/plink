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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDbkMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztBQUN0QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsNkNBQStCO0FBQy9CLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QiwyQ0FBNkI7QUFDN0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ25GLDBDQUE0QjtBQUM1QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDeEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFL0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUd4Qzs7O0dBR0c7QUFDSCxTQUFnQixVQUFVLENBQUMsTUFBVyxFQUFFLE9BQW1CO0lBQ3pELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFTLElBQVMsRUFBRSxRQUFnQixFQUFFLFFBQWtDO1FBQ3pGLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxH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QUNkLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9CLE9BQU8sUUFBUSxFQUFFLENBQUM7U0FDbkI7UUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLDZEQUE2RDtRQUM3RCw2REFBNkQ7UUFDN0QsTUFBTTtRQUNOLFFBQVEsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQzNCLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0MsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLG9DQUFvQztRQUNwQyx5QkFBeUI7UUFDekIsTUFBTTtRQUNOLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBeEJELDRDQXdCQyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGd1dGlsID0gcmVxdWlyZSgnZ3VscC11dGlsJyk7XG5jb25zdCBQbHVnaW5FcnJvciA9IGd1dGlsLlBsdWdpbkVycm9yO1xuY29uc3QgdGhyb3VnaCA9IHJlcXVpcmUoJ3Rocm91Z2gyJyk7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5jb25zdCBwaWZ5ID0gcmVxdWlyZSgncGlmeScpO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IEZpbGUgPSByZXF1aXJlKCd2aW55bCcpO1xuY29uc3QganNvbkxpbnQgPSByZXF1aXJlKCdqc29uLWxpbnQnKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLicgKyBQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSk7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5jb25zdCBpc1dpbjMyID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcblxuY29uc3QgcmVhZEZpbGVBc3luYyA9IHBpZnkoZnMucmVhZEZpbGUpO1xuXG50eXBlIENhbGxiYWNrID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkO1xuLyoqXG4gKiBbcmVhZEFzSnNvbiBkZXNjcmlwdGlvbl1cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBvbkZpbGUgIFtkZXNjcmlwdGlvbl1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0pzb24odG9GaWxlOiBhbnksIG9uRmx1c2g6ICgpID0+IHZvaWQpIHtcbiAgcmV0dXJuIHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jb2Rpbmc6IHN0cmluZywgY2FsbGJhY2s6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgIGd1dGlsLmxvZygncmVhZGluZyAnICsgZmlsZS5wYXRoKTtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICByZWFkRmlsZUFzeW5jKGZpbGUucGF0aCwge2VuY29kaW5nOiAndXRmLTgnfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGNvbnRlbnQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgICAgcmV0dXJuIHRvRmlsZShqc29uLCBmaWxlKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24obmV3RmlsZTogc3RyaW5nKSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIG5ld0ZpbGUpO1xuICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyOiBFcnJvcikge1xuICAgICAgICBndXRpbC5sb2coZXJyKTtcbiAgICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIG5ldyBQbHVnaW5FcnJvcigncndQYWNrYWdlSnNvbi5yZWFkQXNKc29uJywgZXJyLnN0YWNrLCB7c2hvd1N0YWNrOiB0cnVlfSkpO1xuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSk7XG4gIH0sXG4gIGZ1bmN0aW9uIGZsdXNoKGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgb25GbHVzaCgpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN5bWJvbGljTGlua1BhY2thZ2VzKGRlc3REaXI6IHN0cmluZykge1xuICByZXR1cm4gdGhyb3VnaC5vYmooYXN5bmMgZnVuY3Rpb24oZmlsZTogYW55LCBlbmNvZGluZzogc3RyaW5nLCBjYWxsYmFjazogQ2FsbGJhY2spIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICB2YXIgbmV3UGF0aCwganNvbjtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlLnBhdGgsIHtlbmNvZGluZzogJ3V0Zi04J30pO1xuICAgICAgY29uc3QgbGludCA9IGpzb25MaW50KGNvbnRlbnQpO1xuICAgICAgaWYgKGxpbnQuZXJyb3IpIHtcbiAgICAgICAgbG9nLmVycm9yKGxpbnQpO1xuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IFBsdWdpbkVycm9yKCdyd1BhY2thZ2VKc29uJywgbGludCwge3Nob3dTdGFjazogdHJ1ZX0pKTtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgICBqc29uID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgIG5ld1BhdGggPSBQYXRoLmpvaW4oZnMucmVhbHBhdGhTeW5jKFBhdGguam9pbihkZXN0RGlyLCAnbm9kZV9tb2R1bGVzJykpLCBqc29uLm5hbWUpO1xuICAgICAgbGV0IHN0YXQ6IGZzLlN0YXRzLCBleGlzdHMgPSBmYWxzZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHN0YXQgPSBmcy5sc3RhdFN5bmMobmV3UGF0aCk7XG4gICAgICAgIGV4aXN0cyA9IHRydWU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChlLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgZXhpc3RzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoJ3N5bWJsaW5rIHRvICVzJywgbmV3UGF0aCk7XG4gICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgIGlmIChzdGF0IS5pc0ZpbGUoKSB8fFxuICAgICAgICAgIChzdGF0IS5pc1N5bWJvbGljTGluaygpICYmIGZzLnJlYWxwYXRoU3luYyhuZXdQYXRoKSAhPT0gUGF0aC5kaXJuYW1lKGZpbGUucGF0aCkpKSB7XG4gICAgICAgICAgZnMudW5saW5rU3luYyhuZXdQYXRoKTtcbiAgICAgICAgICBfc3ltYm9saWNMaW5rKFBhdGguZGlybmFtZShmaWxlLnBhdGgpLCBuZXdQYXRoKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0IS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ1JlbW92ZSBpbnN0YWxsZWQgcGFja2FnZSBcIiVzXCInLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIG5ld1BhdGgpKTtcbiAgICAgICAgICBmcy5yZW1vdmVTeW5jKG5ld1BhdGgpO1xuICAgICAgICAgIF9zeW1ib2xpY0xpbmsoUGF0aC5kaXJuYW1lKGZpbGUucGF0aCksIG5ld1BhdGgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfc3ltYm9saWNMaW5rKFBhdGguZGlybmFtZShmaWxlLnBhdGgpLCBuZXdQYXRoKTtcbiAgICAgIH1cbiAgICAgIHNlbGYucHVzaChuZXcgRmlsZSh7XG4gICAgICAgIGJhc2U6IGRlc3REaXIsXG4gICAgICAgIHBhdGg6IG5ld1BhdGgsXG4gICAgICAgIGNvbnRlbnRzOiBuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsICdcXHQnKSlcbiAgICAgIH0pKTtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIG5ldyBQbHVnaW5FcnJvcigncndQYWNrYWdlSnNvbicsIGVyci5zdGFjaywge3Nob3dTdGFjazogdHJ1ZX0pKTtcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfVxuICB9LCBmdW5jdGlvbihjYWxsYmFjazogYW55KSB7XG4gICAgY2FsbGJhY2soKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfc3ltYm9saWNMaW5rKGRpcjogc3RyaW5nLCBsaW5rOiBhbnkpIHtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUobGluaykpO1xuICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShsaW5rKSwgZGlyKSwgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gIGxvZy5pbmZvKCdDcmVhdGUgc3ltbGluayBcIiVzXCInLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGxpbmspKTtcbn1cblxuY29uc3QgcGFja2FnZUpzb25UZW1wID0ge1xuICBuYW1lOiAnQGRyLycsXG4gIHZlcnNpb246ICcwLjEuMCcsXG4gIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IGdyb3VwOiAnLFxuICBkZXBlbmRlbmNpZXM6IHt9XG59O1xuXG4vKipcbiAqIFdyaXRlIHJlY2lwZSBmaWxlXG4gKiBXcml0ZSBhbiBhcnJheSBvZiBsaW5rZWQgcGFja2FnZSBwYXRoLCBhbmQgYSByZWNpcGUgcGFja2FnZS5qc29uIGZpbGVcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWNpcGVBYnNEaXIgbnVsbCB3aGVuIHRoZXJlIGlzIG5vIHJlY2lwZSBkaXIgZm9yIHRob3NlIGxpbmtlZCBwYWNrYWdlIGZpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZERlcGVuZGVuY3kocmVjaXBlQWJzRGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgbGlua0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgZGVzdEpzb246IGFueTtcbiAgY29uc3QgZGVwZW5kZW5jaWVzOiB7W2s6IHN0cmluZ106IGFueX0gPSB7fTtcbiAgbGV0IHJlY2lwZVBrSnNvblN0cjogc3RyaW5nO1xuICBsZXQgcmVjaXBlRmlsZTogc3RyaW5nO1xuICBpZiAocmVjaXBlQWJzRGlyKSB7XG4gICAgcmVjaXBlRmlsZSA9IFBhdGgucmVzb2x2ZShyZWNpcGVBYnNEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhyZWNpcGVGaWxlKSkge1xuICAgICAgbG9nLmRlYnVnKCdFeGlzdGluZyByZWNpcGVGaWxlICVzJywgcmVjaXBlRmlsZSk7XG4gICAgICByZWNpcGVQa0pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMocmVjaXBlRmlsZSwgJ3V0ZjgnKTtcbiAgICAgIGRlc3RKc29uID0gSlNPTi5wYXJzZShyZWNpcGVQa0pzb25TdHIpO1xuICAgICAgLy8gdHJ5IHtcbiAgICAgIC8vIFx0ZGVwZW5kZW5jaWVzID0gSlNPTi5wYXJzZShyZWNpcGVQa0pzb25TdHIpLmRlcGVuZGVuY2llcztcbiAgICAgIC8vIH0gY2F0Y2ggKGVycikge31cbiAgICB9IGVsc2Uge1xuICAgICAgZGVzdEpzb24gPSBfLmNsb25lRGVlcChwYWNrYWdlSnNvblRlbXApO1xuICAgICAgY29uc3QgcmVjaXBlRGlyTmFtZSA9IFBhdGguYmFzZW5hbWUocmVjaXBlQWJzRGlyKTtcbiAgICAgIGRlc3RKc29uLm5hbWUgKz0gcmVjaXBlRGlyTmFtZS5yZXBsYWNlKC9bL1xcXFxdL2csICctJyk7XG4gICAgICBkZXN0SnNvbi5kZXNjcmlwdGlvbiArPSByZWNpcGVEaXJOYW1lO1xuICAgICAgcmVjaXBlUGtKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZGVzdEpzb24sIG51bGwsICcgICcpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuY29kaW5nOiBzdHJpbmcsIGNhbGxiYWNrOiBhbnkpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmaWxlLmNvbnRlbnRzLnRvU3RyaW5nKCd1dGY4JykpO1xuXG4gICAgbG9nLmRlYnVnKCdhZGQgdG8gcmVjaXBlOiAnICsgcmVjaXBlQWJzRGlyICsgJyA6ICcgKyBmaWxlLnBhdGgpO1xuICAgIGxpbmtGaWxlcy5wdXNoKFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIGZpbGUucGF0aCkpO1xuICAgIGlmICghcmVjaXBlUGtKc29uU3RyKVxuICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgaWYgKGpzb24ubmFtZSA9PT0gZGVzdEpzb24ubmFtZSkge1xuICAgICAgbG9nLmRlYnVnKCdza2lwICcsIGpzb24ubmFtZSk7XG4gICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICB9XG4gICAgZGVwZW5kZW5jaWVzW2pzb24ubmFtZV0gPSBqc29uLnZlcnNpb247XG4gICAgY2FsbGJhY2soKTtcbiAgfSwgZnVuY3Rpb24gZmx1c2goY2FsbGJhY2s6IGFueSkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHNlbGYucHVzaChsaW5rRmlsZXMpO1xuICAgIGlmIChyZWNpcGVQa0pzb25TdHIpIHtcbiAgICAgIGNvbnN0IGRlc3RGaWxlID0gbmV3IEZpbGUoe1xuICAgICAgICBiYXNlOiBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgpLFxuICAgICAgICBwYXRoOiBQYXRoLnJlc29sdmUocmVjaXBlRmlsZSksXG4gICAgICAgIGNvbnRlbnRzOiBuZXcgQnVmZmVyKHJlY2lwZVBrSnNvblN0ci5yZXBsYWNlKC8oXCJkZXBlbmRlbmNpZXNcIlxccyo6XFxzKilcXHtbXn1dKlxcfS8sICckMXtcXG4nICtcbiAgICAgICAgICBzb3J0UHJvcGVydGllcyhkZXBlbmRlbmNpZXMpICsgJ1xcblxcdH0nKSlcbiAgICAgIH0pO1xuICAgICAgc2VsZi5wdXNoKGRlc3RGaWxlKTtcbiAgICB9XG4gICAgY2FsbGJhY2soKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHNvcnRQcm9wZXJ0aWVzKG9iajoge1trOiBzdHJpbmddOiBzdHJpbmd9KTogc3RyaW5nIHtcbiAgbGV0IHRvU29ydDogQXJyYXk8W3N0cmluZywgc3RyaW5nXT4gPSBbXTtcbiAgXy5lYWNoKG9iaiwgKHZhbHVlLCBrZXkpID0+IHtcbiAgICB0b1NvcnQucHVzaChba2V5LCB2YWx1ZV0pO1xuICB9KTtcbiAgdG9Tb3J0ID0gdG9Tb3J0LnNvcnQoKGEsIGIpID0+IHtcbiAgICBpZiAoYSA8IGIpXG4gICAgICByZXR1cm4gLTE7XG4gICAgZWxzZSBpZiAoYSA+IGIpXG4gICAgICByZXR1cm4gMTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gMDtcbiAgfSk7XG4gIGxldCByZXMgPSAnJztcbiAgZm9yIChjb25zdCBpdGVtIG9mIHRvU29ydCkge1xuICAgIHJlcyArPSBgXFx0XFx0XCIke2l0ZW1bMF19XCI6IFwiJHtpdGVtWzFdfVwiLFxcbmA7XG4gIH1cbiAgcmV0dXJuIHJlcy5zbGljZSgwLCByZXMubGVuZ3RoIC0gMik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVEZXBlbmRlbmN5KCkge1xuICByZXR1cm4gdGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbmNvZGluZzogc3RyaW5nLCBjYWxsYmFjazogYW55KSB7XG4gICAgbG9nLmluZm8oJ3JlbW92aW5nIGRlcGVuZGVuY2llcyBmcm9tIHJlY2lwZSBmaWxlICcgKyBmaWxlLnBhdGgpO1xuICAgIHZhciBjb250ZW50ID0gZmlsZS5jb250ZW50cy50b1N0cmluZygndXRmOCcpO1xuICAgIC8vIHJlYWQgZGVzdEpzb25cbiAgICBjb25zdCBsaW50ID0ganNvbkxpbnQoY29udGVudCk7XG4gICAgaWYgKGxpbnQuZXJyb3IpIHtcbiAgICAgIGxvZy5lcnJvcihsaW50KTtcbiAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBsaW50LmVycm9yKTtcbiAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgIH1cbiAgICBjb25zdCBkZXN0SnNvbiA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgLy8gdmFyIHByb21pc2VzID0gXy5tYXAoZGVzdEpzb24uZGVwZW5kZW5jaWVzLCAoeCwgbmFtZSkgPT4ge1xuICAgIC8vIFx0cmV0dXJuIGJ1aWxkVXRpbHMucHJvbWlzaWZ5RXhlKCducG0nLCAndW5pbnN0YWxsJywgbmFtZSk7XG4gICAgLy8gfSk7XG4gICAgZGVzdEpzb24uZGVwZW5kZW5jaWVzID0ge307XG4gICAgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KGRlc3RKc29uLCBudWxsLCAnXFx0Jyk7XG4gICAgbG9nLmRlYnVnKGNvbnRlbnQpO1xuICAgIGZpbGUuY29udGVudHMgPSBuZXcgQnVmZmVyKGNvbnRlbnQpO1xuICAgIC8vIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKCgpPT4ge1xuICAgIC8vIFx0Y2FsbGJhY2sobnVsbCwgZmlsZSk7XG4gICAgLy8gfSk7XG4gICAgY2FsbGJhY2sobnVsbCwgZmlsZSk7XG4gIH0pO1xufVxuIl19