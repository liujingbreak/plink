"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDependency = exports.addDependency = exports._symbolicLink = exports.symbolicLinkPackages = exports.readAsJson = void 0;
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
const config_1 = __importDefault(require("./config"));
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
        linkFiles.push(Path.relative(config_1.default().rootPath, file.path));
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
                base: Path.resolve(config_1.default().rootPath),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNuQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDO0FBQ3RDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyw2Q0FBK0I7QUFDL0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLDJDQUE2QjtBQUM3QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkYsMENBQTRCO0FBQzVCLHNEQUE4QjtBQUM5QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUUvRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBR3hDOzs7R0FHRztBQUNILFNBQWdCLFVBQVUsQ0FBQyxNQUFXLEVBQUUsT0FBbUI7SUFDekQsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVMsSUFBUyxFQUFFLFFBQWdCLEVBQUUsUUFBa0M7UUFDekYsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLElB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S0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMvQixPQUFPLFFBQVEsRUFBRSxDQUFDO1NBQ25CO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyw2REFBNkQ7UUFDN0QsNkRBQTZEO1FBQzdELE1BQU07UUFDTixRQUFRLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUMzQixPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9DLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxvQ0FBb0M7UUFDcEMseUJBQXlCO1FBQ3pCLE1BQU07UUFDTixRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXhCRCw0Q0F3QkMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBndXRpbCA9IHJlcXVpcmUoJ2d1bHAtdXRpbCcpO1xuY29uc3QgUGx1Z2luRXJyb3IgPSBndXRpbC5QbHVnaW5FcnJvcjtcbmNvbnN0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuY29uc3QgcGlmeSA9IHJlcXVpcmUoJ3BpZnknKTtcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBGaWxlID0gcmVxdWlyZSgndmlueWwnKTtcbmNvbnN0IGpzb25MaW50ID0gcmVxdWlyZSgnanNvbi1saW50Jyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3dmaC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykpO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5jb25zdCBpc1dpbjMyID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcblxuY29uc3QgcmVhZEZpbGVBc3luYyA9IHBpZnkoZnMucmVhZEZpbGUpO1xuXG50eXBlIENhbGxiYWNrID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkO1xuLyoqXG4gKiBbcmVhZEFzSnNvbiBkZXNjcmlwdGlvbl1cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBvbkZpbGUgIFtkZXNjcmlwdGlvbl1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0pzb24odG9GaWxlOiBhbnksIG9uRmx1c2g6ICgpID0+IHZvaWQpIHtcbiAgcmV0dXJuIHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jb2Rpbmc6IHN0cmluZywgY2FsbGJhY2s6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgIGd1dGlsLmxvZygncmVhZGluZyAnICsgZmlsZS5wYXRoKTtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICByZWFkRmlsZUFzeW5jKGZpbGUucGF0aCwge2VuY29kaW5nOiAndXRmLTgnfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGNvbnRlbnQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgICAgcmV0dXJuIHRvRmlsZShqc29uLCBmaWxlKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24obmV3RmlsZTogc3RyaW5nKSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIG5ld0ZpbGUpO1xuICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyOiBFcnJvcikge1xuICAgICAgICBndXRpbC5sb2coZXJyKTtcbiAgICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIG5ldyBQbHVnaW5FcnJvcigncndQYWNrYWdlSnNvbi5yZWFkQXNKc29uJywgZXJyLnN0YWNrLCB7c2hvd1N0YWNrOiB0cnVlfSkpO1xuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSk7XG4gIH0sXG4gIGZ1bmN0aW9uIGZsdXNoKGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgb25GbHVzaCgpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN5bWJvbGljTGlua1BhY2thZ2VzKGRlc3REaXI6IHN0cmluZykge1xuICByZXR1cm4gdGhyb3VnaC5vYmooYXN5bmMgZnVuY3Rpb24oZmlsZTogYW55LCBlbmNvZGluZzogc3RyaW5nLCBjYWxsYmFjazogQ2FsbGJhY2spIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICB2YXIgbmV3UGF0aCwganNvbjtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlLnBhdGgsIHtlbmNvZGluZzogJ3V0Zi04J30pO1xuICAgICAgY29uc3QgbGludCA9IGpzb25MaW50KGNvbnRlbnQpO1xuICAgICAgaWYgKGxpbnQuZXJyb3IpIHtcbiAgICAgICAgbG9nLmVycm9yKGxpbnQpO1xuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IFBsdWdpbkVycm9yKCdyd1BhY2thZ2VKc29uJywgbGludCwge3Nob3dTdGFjazogdHJ1ZX0pKTtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgICBqc29uID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgIG5ld1BhdGggPSBQYXRoLmpvaW4oZnMucmVhbHBhdGhTeW5jKFBhdGguam9pbihkZXN0RGlyLCAnbm9kZV9tb2R1bGVzJykpLCBqc29uLm5hbWUpO1xuICAgICAgbGV0IHN0YXQ6IGZzLlN0YXRzLCBleGlzdHMgPSBmYWxzZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHN0YXQgPSBmcy5sc3RhdFN5bmMobmV3UGF0aCk7XG4gICAgICAgIGV4aXN0cyA9IHRydWU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChlLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgZXhpc3RzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoJ3N5bWJsaW5rIHRvICVzJywgbmV3UGF0aCk7XG4gICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgIGlmIChzdGF0IS5pc0ZpbGUoKSB8fFxuICAgICAgICAgIChzdGF0IS5pc1N5bWJvbGljTGluaygpICYmIGZzLnJlYWxwYXRoU3luYyhuZXdQYXRoKSAhPT0gUGF0aC5kaXJuYW1lKGZpbGUucGF0aCkpKSB7XG4gICAgICAgICAgZnMudW5saW5rU3luYyhuZXdQYXRoKTtcbiAgICAgICAgICBfc3ltYm9saWNMaW5rKFBhdGguZGlybmFtZShmaWxlLnBhdGgpLCBuZXdQYXRoKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0IS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ1JlbW92ZSBpbnN0YWxsZWQgcGFja2FnZSBcIiVzXCInLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIG5ld1BhdGgpKTtcbiAgICAgICAgICBmcy5yZW1vdmVTeW5jKG5ld1BhdGgpO1xuICAgICAgICAgIF9zeW1ib2xpY0xpbmsoUGF0aC5kaXJuYW1lKGZpbGUucGF0aCksIG5ld1BhdGgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfc3ltYm9saWNMaW5rKFBhdGguZGlybmFtZShmaWxlLnBhdGgpLCBuZXdQYXRoKTtcbiAgICAgIH1cbiAgICAgIHNlbGYucHVzaChuZXcgRmlsZSh7XG4gICAgICAgIGJhc2U6IGRlc3REaXIsXG4gICAgICAgIHBhdGg6IG5ld1BhdGgsXG4gICAgICAgIGNvbnRlbnRzOiBuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsICdcXHQnKSlcbiAgICAgIH0pKTtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIG5ldyBQbHVnaW5FcnJvcigncndQYWNrYWdlSnNvbicsIGVyci5zdGFjaywge3Nob3dTdGFjazogdHJ1ZX0pKTtcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfVxuICB9LCBmdW5jdGlvbihjYWxsYmFjazogYW55KSB7XG4gICAgY2FsbGJhY2soKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfc3ltYm9saWNMaW5rKGRpcjogc3RyaW5nLCBsaW5rOiBhbnkpIHtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUobGluaykpO1xuICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShsaW5rKSwgZGlyKSwgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gIGxvZy5pbmZvKCdDcmVhdGUgc3ltbGluayBcIiVzXCInLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGxpbmspKTtcbn1cblxuY29uc3QgcGFja2FnZUpzb25UZW1wID0ge1xuICBuYW1lOiAnQGRyLycsXG4gIHZlcnNpb246ICcwLjEuMCcsXG4gIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IGdyb3VwOiAnLFxuICBkZXBlbmRlbmNpZXM6IHt9XG59O1xuXG4vKipcbiAqIFdyaXRlIHJlY2lwZSBmaWxlXG4gKiBXcml0ZSBhbiBhcnJheSBvZiBsaW5rZWQgcGFja2FnZSBwYXRoLCBhbmQgYSByZWNpcGUgcGFja2FnZS5qc29uIGZpbGVcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWNpcGVBYnNEaXIgbnVsbCB3aGVuIHRoZXJlIGlzIG5vIHJlY2lwZSBkaXIgZm9yIHRob3NlIGxpbmtlZCBwYWNrYWdlIGZpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZERlcGVuZGVuY3kocmVjaXBlQWJzRGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgbGlua0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgZGVzdEpzb246IGFueTtcbiAgY29uc3QgZGVwZW5kZW5jaWVzOiB7W2s6IHN0cmluZ106IGFueX0gPSB7fTtcbiAgbGV0IHJlY2lwZVBrSnNvblN0cjogc3RyaW5nO1xuICBsZXQgcmVjaXBlRmlsZTogc3RyaW5nO1xuICBpZiAocmVjaXBlQWJzRGlyKSB7XG4gICAgcmVjaXBlRmlsZSA9IFBhdGgucmVzb2x2ZShyZWNpcGVBYnNEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhyZWNpcGVGaWxlKSkge1xuICAgICAgbG9nLmRlYnVnKCdFeGlzdGluZyByZWNpcGVGaWxlICVzJywgcmVjaXBlRmlsZSk7XG4gICAgICByZWNpcGVQa0pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMocmVjaXBlRmlsZSwgJ3V0ZjgnKTtcbiAgICAgIGRlc3RKc29uID0gSlNPTi5wYXJzZShyZWNpcGVQa0pzb25TdHIpO1xuICAgICAgLy8gdHJ5IHtcbiAgICAgIC8vIFx0ZGVwZW5kZW5jaWVzID0gSlNPTi5wYXJzZShyZWNpcGVQa0pzb25TdHIpLmRlcGVuZGVuY2llcztcbiAgICAgIC8vIH0gY2F0Y2ggKGVycikge31cbiAgICB9IGVsc2Uge1xuICAgICAgZGVzdEpzb24gPSBfLmNsb25lRGVlcChwYWNrYWdlSnNvblRlbXApO1xuICAgICAgY29uc3QgcmVjaXBlRGlyTmFtZSA9IFBhdGguYmFzZW5hbWUocmVjaXBlQWJzRGlyKTtcbiAgICAgIGRlc3RKc29uLm5hbWUgKz0gcmVjaXBlRGlyTmFtZS5yZXBsYWNlKC9bL1xcXFxdL2csICctJyk7XG4gICAgICBkZXN0SnNvbi5kZXNjcmlwdGlvbiArPSByZWNpcGVEaXJOYW1lO1xuICAgICAgcmVjaXBlUGtKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZGVzdEpzb24sIG51bGwsICcgICcpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuY29kaW5nOiBzdHJpbmcsIGNhbGxiYWNrOiBhbnkpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmaWxlLmNvbnRlbnRzLnRvU3RyaW5nKCd1dGY4JykpO1xuXG4gICAgbG9nLmRlYnVnKCdhZGQgdG8gcmVjaXBlOiAnICsgcmVjaXBlQWJzRGlyICsgJyA6ICcgKyBmaWxlLnBhdGgpO1xuICAgIGxpbmtGaWxlcy5wdXNoKFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIGZpbGUucGF0aCkpO1xuICAgIGlmICghcmVjaXBlUGtKc29uU3RyKVxuICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgaWYgKGpzb24ubmFtZSA9PT0gZGVzdEpzb24ubmFtZSkge1xuICAgICAgbG9nLmRlYnVnKCdza2lwICcsIGpzb24ubmFtZSk7XG4gICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICB9XG4gICAgZGVwZW5kZW5jaWVzW2pzb24ubmFtZV0gPSBqc29uLnZlcnNpb247XG4gICAgY2FsbGJhY2soKTtcbiAgfSwgZnVuY3Rpb24gZmx1c2goY2FsbGJhY2s6IGFueSkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHNlbGYucHVzaChsaW5rRmlsZXMpO1xuICAgIGlmIChyZWNpcGVQa0pzb25TdHIpIHtcbiAgICAgIGNvbnN0IGRlc3RGaWxlID0gbmV3IEZpbGUoe1xuICAgICAgICBiYXNlOiBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgpLFxuICAgICAgICBwYXRoOiBQYXRoLnJlc29sdmUocmVjaXBlRmlsZSksXG4gICAgICAgIGNvbnRlbnRzOiBuZXcgQnVmZmVyKHJlY2lwZVBrSnNvblN0ci5yZXBsYWNlKC8oXCJkZXBlbmRlbmNpZXNcIlxccyo6XFxzKilcXHtbXn1dKlxcfS8sICckMXtcXG4nICtcbiAgICAgICAgICBzb3J0UHJvcGVydGllcyhkZXBlbmRlbmNpZXMpICsgJ1xcblxcdH0nKSlcbiAgICAgIH0pO1xuICAgICAgc2VsZi5wdXNoKGRlc3RGaWxlKTtcbiAgICB9XG4gICAgY2FsbGJhY2soKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHNvcnRQcm9wZXJ0aWVzKG9iajoge1trOiBzdHJpbmddOiBzdHJpbmd9KTogc3RyaW5nIHtcbiAgbGV0IHRvU29ydDogQXJyYXk8W3N0cmluZywgc3RyaW5nXT4gPSBbXTtcbiAgXy5lYWNoKG9iaiwgKHZhbHVlLCBrZXkpID0+IHtcbiAgICB0b1NvcnQucHVzaChba2V5LCB2YWx1ZV0pO1xuICB9KTtcbiAgdG9Tb3J0ID0gdG9Tb3J0LnNvcnQoKGEsIGIpID0+IHtcbiAgICBpZiAoYSA8IGIpXG4gICAgICByZXR1cm4gLTE7XG4gICAgZWxzZSBpZiAoYSA+IGIpXG4gICAgICByZXR1cm4gMTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gMDtcbiAgfSk7XG4gIGxldCByZXMgPSAnJztcbiAgZm9yIChjb25zdCBpdGVtIG9mIHRvU29ydCkge1xuICAgIHJlcyArPSBgXFx0XFx0XCIke2l0ZW1bMF19XCI6IFwiJHtpdGVtWzFdfVwiLFxcbmA7XG4gIH1cbiAgcmV0dXJuIHJlcy5zbGljZSgwLCByZXMubGVuZ3RoIC0gMik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVEZXBlbmRlbmN5KCkge1xuICByZXR1cm4gdGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbmNvZGluZzogc3RyaW5nLCBjYWxsYmFjazogYW55KSB7XG4gICAgbG9nLmluZm8oJ3JlbW92aW5nIGRlcGVuZGVuY2llcyBmcm9tIHJlY2lwZSBmaWxlICcgKyBmaWxlLnBhdGgpO1xuICAgIHZhciBjb250ZW50ID0gZmlsZS5jb250ZW50cy50b1N0cmluZygndXRmOCcpO1xuICAgIC8vIHJlYWQgZGVzdEpzb25cbiAgICBjb25zdCBsaW50ID0ganNvbkxpbnQoY29udGVudCk7XG4gICAgaWYgKGxpbnQuZXJyb3IpIHtcbiAgICAgIGxvZy5lcnJvcihsaW50KTtcbiAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBsaW50LmVycm9yKTtcbiAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgIH1cbiAgICBjb25zdCBkZXN0SnNvbiA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgLy8gdmFyIHByb21pc2VzID0gXy5tYXAoZGVzdEpzb24uZGVwZW5kZW5jaWVzLCAoeCwgbmFtZSkgPT4ge1xuICAgIC8vIFx0cmV0dXJuIGJ1aWxkVXRpbHMucHJvbWlzaWZ5RXhlKCducG0nLCAndW5pbnN0YWxsJywgbmFtZSk7XG4gICAgLy8gfSk7XG4gICAgZGVzdEpzb24uZGVwZW5kZW5jaWVzID0ge307XG4gICAgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KGRlc3RKc29uLCBudWxsLCAnXFx0Jyk7XG4gICAgbG9nLmRlYnVnKGNvbnRlbnQpO1xuICAgIGZpbGUuY29udGVudHMgPSBuZXcgQnVmZmVyKGNvbnRlbnQpO1xuICAgIC8vIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKCgpPT4ge1xuICAgIC8vIFx0Y2FsbGJhY2sobnVsbCwgZmlsZSk7XG4gICAgLy8gfSk7XG4gICAgY2FsbGJhY2sobnVsbCwgZmlsZSk7XG4gIH0pO1xufVxuIl19