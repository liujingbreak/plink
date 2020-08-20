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
Object.defineProperty(exports, "__esModule", { value: true });
const gutil = require('gulp-util');
const PluginError = gutil.PluginError;
const through = require('through2');
const File = require('vinyl');
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const util_1 = require("util");
/**
 * Recursively lookup `fromDir` folder for private module's package.json file
 */
function findPackageJson(_fromDirs, startFromSubDir) {
    let fromDirs;
    if (!Array.isArray(_fromDirs))
        fromDirs = [_fromDirs];
    return through.obj(function (whatever, encoding, callback) { callback(); }, function flush(callback) {
        const me = this;
        const proms = fromDirs.map(d => new FolderScanner(d, me).run(startFromSubDir));
        Promise.all(proms)
            .then(function () {
            callback();
        })
            .catch(function (err) {
            gutil.log(err);
            me.emit('error', new PluginError('findPackageJson', err.stack, { showStack: true }));
        });
    });
}
exports.default = findPackageJson;
class FolderScanner {
    constructor(fromDir, through) {
        this.proms = [];
        this.fromDir = Path.resolve(fromDir);
        this.through = through;
    }
    run(startFromSubDir) {
        this.proms = [];
        if (startFromSubDir)
            this.checkSubFolders(this.fromDir);
        else
            this.checkFolder(this.fromDir);
        return Promise.all(this.proms);
    }
    checkSubFolders(parentDir) {
        const folders = fs.readdirSync(parentDir);
        for (const name of folders) {
            try {
                if (name === 'node_modules') {
                    const testDir = Path.resolve(parentDir, 'node_modules');
                    if (fs.lstatSync(testDir).isSymbolicLink()) {
                        // tslint:disable-next-line: no-console
                        console.log('[find-package] found a symlink node_modules:', testDir);
                    }
                    continue;
                }
                const dir = Path.join(parentDir, name);
                this.checkFolder(dir);
            }
            catch (er) {
                console.error('[find-package]', er);
            }
        }
    }
    checkFolder(dir) {
        const self = this;
        if (fs.statSync(dir).isDirectory()) {
            const pkJsonPath = Path.join(dir, 'package.json');
            if (fs.existsSync(pkJsonPath)) {
                self.proms.push(createFile(pkJsonPath, self.fromDir)
                    .then(function (file) {
                    return self.through.push(file);
                }));
            }
            else {
                self.checkSubFolders(dir);
            }
        }
    }
}
const fsStateAsync = util_1.promisify(fs.stat);
function createFile(path, base) {
    return fsStateAsync(path).then(function (stat) {
        return new File({
            base,
            path,
            stat
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNuQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDO0FBQ3RDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUIsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0I7O0dBRUc7QUFDSCxTQUF3QixlQUFlLENBQUMsU0FBNEIsRUFBRSxlQUF3QjtJQUM1RixJQUFJLFFBQWtCLENBQUM7SUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQzNCLFFBQVEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3pCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FDaEIsVUFBUyxRQUFhLEVBQUUsUUFBZ0IsRUFBRSxRQUFvQixJQUFHLFFBQVEsRUFBRSxDQUFDLENBQUEsQ0FBQyxFQUM3RSxTQUFTLEtBQUssQ0FBQyxRQUErQjtRQUM1QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDaEIsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUUvRSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQzthQUNqQixJQUFJLENBQUM7WUFDSixRQUFRLEVBQUUsQ0FBQztRQUNiLENBQUMsQ0FBQzthQUNELEtBQUss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QVMsVUFBVSxDQUFDLElBQVksRUFBRSxJQUFZO0lBQzVDLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLElBQUk7UUFDMUMsT0FBTyxJQUFJLElBQUksQ0FBQztZQUNkLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtTQUNMLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGd1dGlsID0gcmVxdWlyZSgnZ3VscC11dGlsJyk7XG5jb25zdCBQbHVnaW5FcnJvciA9IGd1dGlsLlBsdWdpbkVycm9yO1xuY29uc3QgdGhyb3VnaCA9IHJlcXVpcmUoJ3Rocm91Z2gyJyk7XG5jb25zdCBGaWxlID0gcmVxdWlyZSgndmlueWwnKTtcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge3Byb21pc2lmeX0gZnJvbSAndXRpbCc7XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgbG9va3VwIGBmcm9tRGlyYCBmb2xkZXIgZm9yIHByaXZhdGUgbW9kdWxlJ3MgcGFja2FnZS5qc29uIGZpbGVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZmluZFBhY2thZ2VKc29uKF9mcm9tRGlyczogc3RyaW5nW10gfCBzdHJpbmcsIHN0YXJ0RnJvbVN1YkRpcjogYm9vbGVhbikge1xuICBsZXQgZnJvbURpcnM6IHN0cmluZ1tdO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoX2Zyb21EaXJzKSlcbiAgICBmcm9tRGlycyA9IFtfZnJvbURpcnNdO1xuICByZXR1cm4gdGhyb3VnaC5vYmooXG4gICAgZnVuY3Rpb24od2hhdGV2ZXI6IGFueSwgZW5jb2Rpbmc6IHN0cmluZywgY2FsbGJhY2s6ICgpID0+IHZvaWQpIHtjYWxsYmFjaygpO30sXG4gICAgZnVuY3Rpb24gZmx1c2goY2FsbGJhY2s6IChlcnI/OiBFcnJvcikgPT4gdm9pZCkge1xuICAgICAgY29uc3QgbWUgPSB0aGlzO1xuICAgICAgY29uc3QgcHJvbXMgPSBmcm9tRGlycy5tYXAoZCA9PiBuZXcgRm9sZGVyU2Nhbm5lcihkLCBtZSkucnVuKHN0YXJ0RnJvbVN1YkRpcikpO1xuXG4gICAgICBQcm9taXNlLmFsbChwcm9tcylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgZ3V0aWwubG9nKGVycik7XG4gICAgICAgIG1lLmVtaXQoJ2Vycm9yJywgbmV3IFBsdWdpbkVycm9yKCdmaW5kUGFja2FnZUpzb24nLCBlcnIuc3RhY2ssIHtzaG93U3RhY2s6IHRydWV9KSk7XG4gICAgICB9KTtcbiAgICB9KTtcbn1cblxuY2xhc3MgRm9sZGVyU2Nhbm5lciB7XG4gIGZyb21EaXI6IHN0cmluZztcbiAgcHJpdmF0ZSBwcm9tczogUHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgcHJpdmF0ZSB0aHJvdWdoOiB7IHB1c2goZmlsZTogYW55KTogdm9pZCB9O1xuXG4gIGNvbnN0cnVjdG9yKGZyb21EaXI6IHN0cmluZywgdGhyb3VnaDoge3B1c2goZmlsZTogYW55KTogdm9pZH0pIHtcbiAgICB0aGlzLmZyb21EaXIgPSBQYXRoLnJlc29sdmUoZnJvbURpcik7XG4gICAgdGhpcy50aHJvdWdoID0gdGhyb3VnaDtcbiAgfVxuXG4gIHJ1bihzdGFydEZyb21TdWJEaXI6IGJvb2xlYW4pIHtcbiAgICB0aGlzLnByb21zID0gW107XG4gICAgaWYgKHN0YXJ0RnJvbVN1YkRpcilcbiAgICAgIHRoaXMuY2hlY2tTdWJGb2xkZXJzKHRoaXMuZnJvbURpcik7XG4gICAgZWxzZVxuICAgICAgdGhpcy5jaGVja0ZvbGRlcih0aGlzLmZyb21EaXIpO1xuICAgIHJldHVybiBQcm9taXNlLmFsbCh0aGlzLnByb21zKTtcbiAgfVxuXG4gIGNoZWNrU3ViRm9sZGVycyhwYXJlbnREaXI6IHN0cmluZykge1xuICAgIGNvbnN0IGZvbGRlcnMgPSBmcy5yZWFkZGlyU3luYyhwYXJlbnREaXIpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBmb2xkZXJzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAobmFtZSA9PT0gJ25vZGVfbW9kdWxlcycpIHtcbiAgICAgICAgICBjb25zdCB0ZXN0RGlyID0gUGF0aC5yZXNvbHZlKHBhcmVudERpciwgJ25vZGVfbW9kdWxlcycpO1xuICAgICAgICAgIGlmIChmcy5sc3RhdFN5bmModGVzdERpcikuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW2ZpbmQtcGFja2FnZV0gZm91bmQgYSBzeW1saW5rIG5vZGVfbW9kdWxlczonLCB0ZXN0RGlyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlyID0gUGF0aC5qb2luKHBhcmVudERpciwgbmFtZSk7XG4gICAgICAgIHRoaXMuY2hlY2tGb2xkZXIoZGlyKTtcbiAgICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tmaW5kLXBhY2thZ2VdJywgZXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNoZWNrRm9sZGVyKGRpcjogc3RyaW5nKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgaWYgKGZzLnN0YXRTeW5jKGRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3QgcGtKc29uUGF0aCA9IFBhdGguam9pbihkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBrSnNvblBhdGgpKSB7XG4gICAgICAgIHNlbGYucHJvbXMucHVzaChjcmVhdGVGaWxlKHBrSnNvblBhdGgsIHNlbGYuZnJvbURpcilcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi50aHJvdWdoLnB1c2goZmlsZSk7XG4gICAgICAgICAgfSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5jaGVja1N1YkZvbGRlcnMoZGlyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY29uc3QgZnNTdGF0ZUFzeW5jID0gcHJvbWlzaWZ5KGZzLnN0YXQpO1xuXG5mdW5jdGlvbiBjcmVhdGVGaWxlKHBhdGg6IHN0cmluZywgYmFzZTogc3RyaW5nKSB7XG4gIHJldHVybiBmc1N0YXRlQXN5bmMocGF0aCkudGhlbihmdW5jdGlvbihzdGF0KSB7XG4gICAgcmV0dXJuIG5ldyBGaWxlKHtcbiAgICAgIGJhc2UsXG4gICAgICBwYXRoLFxuICAgICAgc3RhdFxuICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==