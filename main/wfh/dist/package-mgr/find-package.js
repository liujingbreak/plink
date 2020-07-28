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
                    break;
                }
                const dir = Path.join(parentDir, name);
                this.checkFolder(dir);
            }
            catch (er) {
                gutil.log(er);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNuQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDO0FBQ3RDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUIsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0I7O0dBRUc7QUFDSCxTQUF3QixlQUFlLENBQUMsU0FBNEIsRUFBRSxlQUF3QjtJQUM1RixJQUFJLFFBQWtCLENBQUM7SUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQzNCLFFBQVEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3pCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FDaEIsVUFBUyxRQUFhLEVBQUUsUUFBZ0IsRUFBRSxRQUFvQixJQUFHLFFBQVEsRUFBRSxDQUFDLENBQUEsQ0FBQyxFQUM3RSxTQUFTLEtBQUssQ0FBQyxRQUErQjtRQUM1QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDaEIsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUUvRSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQzthQUNqQixJQUFJLENBQUM7WUFDSixRQUFRLEVBQUUsQ0FBQztRQUNiLENBQUMsQ0FBQzthQUNELEtBQUss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SUFBWSxFQUFFLElBQVk7SUFDNUMsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsSUFBSTtRQUMxQyxPQUFPLElBQUksSUFBSSxDQUFDO1lBQ2QsSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1NBQ0wsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgZ3V0aWwgPSByZXF1aXJlKCdndWxwLXV0aWwnKTtcbmNvbnN0IFBsdWdpbkVycm9yID0gZ3V0aWwuUGx1Z2luRXJyb3I7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IEZpbGUgPSByZXF1aXJlKCd2aW55bCcpO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cHJvbWlzaWZ5fSBmcm9tICd1dGlsJztcblxuLyoqXG4gKiBSZWN1cnNpdmVseSBsb29rdXAgYGZyb21EaXJgIGZvbGRlciBmb3IgcHJpdmF0ZSBtb2R1bGUncyBwYWNrYWdlLmpzb24gZmlsZVxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmaW5kUGFja2FnZUpzb24oX2Zyb21EaXJzOiBzdHJpbmdbXSB8IHN0cmluZywgc3RhcnRGcm9tU3ViRGlyOiBib29sZWFuKSB7XG4gIGxldCBmcm9tRGlyczogc3RyaW5nW107XG4gIGlmICghQXJyYXkuaXNBcnJheShfZnJvbURpcnMpKVxuICAgIGZyb21EaXJzID0gW19mcm9tRGlyc107XG4gIHJldHVybiB0aHJvdWdoLm9iaihcbiAgICBmdW5jdGlvbih3aGF0ZXZlcjogYW55LCBlbmNvZGluZzogc3RyaW5nLCBjYWxsYmFjazogKCkgPT4gdm9pZCkge2NhbGxiYWNrKCk7fSxcbiAgICBmdW5jdGlvbiBmbHVzaChjYWxsYmFjazogKGVycj86IEVycm9yKSA9PiB2b2lkKSB7XG4gICAgICBjb25zdCBtZSA9IHRoaXM7XG4gICAgICBjb25zdCBwcm9tcyA9IGZyb21EaXJzLm1hcChkID0+IG5ldyBGb2xkZXJTY2FubmVyKGQsIG1lKS5ydW4oc3RhcnRGcm9tU3ViRGlyKSk7XG5cbiAgICAgIFByb21pc2UuYWxsKHByb21zKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICBndXRpbC5sb2coZXJyKTtcbiAgICAgICAgbWUuZW1pdCgnZXJyb3InLCBuZXcgUGx1Z2luRXJyb3IoJ2ZpbmRQYWNrYWdlSnNvbicsIGVyci5zdGFjaywge3Nob3dTdGFjazogdHJ1ZX0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5jbGFzcyBGb2xkZXJTY2FubmVyIHtcbiAgZnJvbURpcjogc3RyaW5nO1xuICBwcml2YXRlIHByb21zOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuICBwcml2YXRlIHRocm91Z2g6IHsgcHVzaChmaWxlOiBhbnkpOiB2b2lkIH07XG5cbiAgY29uc3RydWN0b3IoZnJvbURpcjogc3RyaW5nLCB0aHJvdWdoOiB7cHVzaChmaWxlOiBhbnkpOiB2b2lkfSkge1xuICAgIHRoaXMuZnJvbURpciA9IFBhdGgucmVzb2x2ZShmcm9tRGlyKTtcbiAgICB0aGlzLnRocm91Z2ggPSB0aHJvdWdoO1xuICB9XG5cbiAgcnVuKHN0YXJ0RnJvbVN1YkRpcjogYm9vbGVhbikge1xuICAgIHRoaXMucHJvbXMgPSBbXTtcbiAgICBpZiAoc3RhcnRGcm9tU3ViRGlyKVxuICAgICAgdGhpcy5jaGVja1N1YkZvbGRlcnModGhpcy5mcm9tRGlyKTtcbiAgICBlbHNlXG4gICAgICB0aGlzLmNoZWNrRm9sZGVyKHRoaXMuZnJvbURpcik7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRoaXMucHJvbXMpO1xuICB9XG5cbiAgY2hlY2tTdWJGb2xkZXJzKHBhcmVudERpcjogc3RyaW5nKSB7XG4gICAgY29uc3QgZm9sZGVycyA9IGZzLnJlYWRkaXJTeW5jKHBhcmVudERpcik7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGZvbGRlcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChuYW1lID09PSAnbm9kZV9tb2R1bGVzJykge1xuICAgICAgICAgIGNvbnN0IHRlc3REaXIgPSBQYXRoLnJlc29sdmUocGFyZW50RGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgICAgaWYgKGZzLmxzdGF0U3luYyh0ZXN0RGlyKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbZmluZC1wYWNrYWdlXSBmb3VuZCBhIHN5bWxpbmsgbm9kZV9tb2R1bGVzOicsIHRlc3REaXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4ocGFyZW50RGlyLCBuYW1lKTtcbiAgICAgICAgdGhpcy5jaGVja0ZvbGRlcihkaXIpO1xuICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgZ3V0aWwubG9nKGVyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjaGVja0ZvbGRlcihkaXI6IHN0cmluZykge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGlmIChmcy5zdGF0U3luYyhkaXIpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGNvbnN0IHBrSnNvblBhdGggPSBQYXRoLmpvaW4oZGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhwa0pzb25QYXRoKSkge1xuICAgICAgICBzZWxmLnByb21zLnB1c2goY3JlYXRlRmlsZShwa0pzb25QYXRoLCBzZWxmLmZyb21EaXIpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYudGhyb3VnaC5wdXNoKGZpbGUpO1xuICAgICAgICAgIH0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuY2hlY2tTdWJGb2xkZXJzKGRpcik7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IGZzU3RhdGVBc3luYyA9IHByb21pc2lmeShmcy5zdGF0KTtcblxuZnVuY3Rpb24gY3JlYXRlRmlsZShwYXRoOiBzdHJpbmcsIGJhc2U6IHN0cmluZykge1xuICByZXR1cm4gZnNTdGF0ZUFzeW5jKHBhdGgpLnRoZW4oZnVuY3Rpb24oc3RhdCkge1xuICAgIHJldHVybiBuZXcgRmlsZSh7XG4gICAgICBiYXNlLFxuICAgICAgcGF0aCxcbiAgICAgIHN0YXRcbiAgICB9KTtcbiAgfSk7XG59XG4iXX0=