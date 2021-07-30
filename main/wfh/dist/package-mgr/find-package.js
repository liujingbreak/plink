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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const rxjs_1 = require("rxjs");
const log4js_1 = require("log4js");
const log = log4js_1.getLogger('plink.package-mgr.find-package');
/**
 * Recursively lookup `fromDir` folder for private module's package.json file
 */
function findPackageJson(_fromDirs, startFromSubDir) {
    let fromDirs;
    if (!Array.isArray(_fromDirs))
        fromDirs = [_fromDirs];
    else
        fromDirs = _fromDirs;
    return rxjs_1.merge(...fromDirs.map(d => new FolderScanner(d).getPackageJsonFiles(startFromSubDir)));
}
exports.default = findPackageJson;
class FolderScanner {
    constructor(fromDir) {
        this.fromDir = Path.resolve(fromDir);
    }
    getPackageJsonFiles(startFromSubDir) {
        return new rxjs_1.Observable(sub => {
            this.out = sub;
            if (startFromSubDir)
                this.checkSubFolders(this.fromDir);
            else
                this.checkFolder(this.fromDir);
            sub.complete();
        });
    }
    checkSubFolders(parentDir) {
        const folders = fs.readdirSync(parentDir);
        for (const name of folders) {
            try {
                if (name === 'node_modules') {
                    const testDir = Path.resolve(parentDir, 'node_modules');
                    if (fs.lstatSync(testDir).isSymbolicLink()) {
                        // eslint-disable-next-line no-console
                        log.info('Found a symlink node_modules:', testDir);
                    }
                    continue;
                }
                const dir = Path.join(parentDir, name);
                this.checkFolder(dir);
            }
            catch (er) {
                console.error('', er);
            }
        }
    }
    checkFolder(dir) {
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            const pkJsonPath = Path.join(dir, 'package.json');
            if (fs.existsSync(pkJsonPath)) {
                this.out.next(pkJsonPath);
            }
            else {
                this.checkSubFolders(dir);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsK0JBQW1EO0FBQ25ELG1DQUFpQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDeEQ7O0dBRUc7QUFDSCxTQUF3QixlQUFlLENBQUMsU0FBNEIsRUFBRSxlQUF3QjtJQUM1RixJQUFJLFFBQWtCLENBQUM7SUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQzNCLFFBQVEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztRQUV2QixRQUFRLEdBQUcsU0FBUyxDQUFDO0lBQ3ZCLE9BQU8sWUFBSyxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRyxDQUFDO0FBUEQsa0NBT0M7QUFFRCxNQUFNLGFBQWE7SUFJakIsWUFBWSxPQUFlO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsZUFBd0I7UUFDMUMsT0FBTyxJQUFJLGlCQUFVLENBQVMsR0FBRyxDQUFDLEVBQUU7WUFDbEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDZixJQUFJLGVBQWU7Z0JBQ2pCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztnQkFFbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDakMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGVBQWUsQ0FBQyxTQUFpQjtRQUN2QyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFO1lBQzFCLElBQUk7Z0JBQ0YsSUFBSSxJQUFJLEtBQUssY0FBYyxFQUFFO29CQUMzQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztvQkFDeEQsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO3dCQUMxQyxzQ0FBc0M7d0JBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsT0FBTyxDQUFDLENBQUM7cUJBQ3BEO29CQUNELFNBQVM7aUJBQ1Y7Z0JBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDdkI7WUFBQyxPQUFPLEVBQUUsRUFBRTtnQkFDWCxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN2QjtTQUNGO0lBQ0gsQ0FBQztJQUVPLFdBQVcsQ0FBQyxHQUFXO1FBQzdCLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ3hELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2xELElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLEdBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDNUI7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUMzQjtTQUNGO0lBQ0gsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7U3Vic2NyaWJlciwgT2JzZXJ2YWJsZSwgbWVyZ2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtbWdyLmZpbmQtcGFja2FnZScpO1xuLyoqXG4gKiBSZWN1cnNpdmVseSBsb29rdXAgYGZyb21EaXJgIGZvbGRlciBmb3IgcHJpdmF0ZSBtb2R1bGUncyBwYWNrYWdlLmpzb24gZmlsZVxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmaW5kUGFja2FnZUpzb24oX2Zyb21EaXJzOiBzdHJpbmdbXSB8IHN0cmluZywgc3RhcnRGcm9tU3ViRGlyOiBib29sZWFuKSB7XG4gIGxldCBmcm9tRGlyczogc3RyaW5nW107XG4gIGlmICghQXJyYXkuaXNBcnJheShfZnJvbURpcnMpKVxuICAgIGZyb21EaXJzID0gW19mcm9tRGlyc107XG4gIGVsc2VcbiAgICBmcm9tRGlycyA9IF9mcm9tRGlycztcbiAgcmV0dXJuIG1lcmdlKC4uLmZyb21EaXJzLm1hcChkID0+IG5ldyBGb2xkZXJTY2FubmVyKGQpLmdldFBhY2thZ2VKc29uRmlsZXMoc3RhcnRGcm9tU3ViRGlyKSkpO1xufVxuXG5jbGFzcyBGb2xkZXJTY2FubmVyIHtcbiAgZnJvbURpcjogc3RyaW5nO1xuICBwcml2YXRlIG91dDogU3Vic2NyaWJlcjxzdHJpbmc+IHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKGZyb21EaXI6IHN0cmluZykge1xuICAgIHRoaXMuZnJvbURpciA9IFBhdGgucmVzb2x2ZShmcm9tRGlyKTtcbiAgfVxuXG4gIGdldFBhY2thZ2VKc29uRmlsZXMoc3RhcnRGcm9tU3ViRGlyOiBib29sZWFuKTogT2JzZXJ2YWJsZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihzdWIgPT4ge1xuICAgICAgdGhpcy5vdXQgPSBzdWI7XG4gICAgICBpZiAoc3RhcnRGcm9tU3ViRGlyKVxuICAgICAgICB0aGlzLmNoZWNrU3ViRm9sZGVycyh0aGlzLmZyb21EaXIpO1xuICAgICAgZWxzZVxuICAgICAgICB0aGlzLmNoZWNrRm9sZGVyKHRoaXMuZnJvbURpcik7XG4gICAgICBzdWIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tTdWJGb2xkZXJzKHBhcmVudERpcjogc3RyaW5nKSB7XG4gICAgY29uc3QgZm9sZGVycyA9IGZzLnJlYWRkaXJTeW5jKHBhcmVudERpcik7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGZvbGRlcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChuYW1lID09PSAnbm9kZV9tb2R1bGVzJykge1xuICAgICAgICAgIGNvbnN0IHRlc3REaXIgPSBQYXRoLnJlc29sdmUocGFyZW50RGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgICAgaWYgKGZzLmxzdGF0U3luYyh0ZXN0RGlyKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgbG9nLmluZm8oJ0ZvdW5kIGEgc3ltbGluayBub2RlX21vZHVsZXM6JywgdGVzdERpcik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihwYXJlbnREaXIsIG5hbWUpO1xuICAgICAgICB0aGlzLmNoZWNrRm9sZGVyKGRpcik7XG4gICAgICB9IGNhdGNoIChlcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCcnLCBlcik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0ZvbGRlcihkaXI6IHN0cmluZykge1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpcikgJiYgZnMuc3RhdFN5bmMoZGlyKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb25zdCBwa0pzb25QYXRoID0gUGF0aC5qb2luKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGtKc29uUGF0aCkpIHtcbiAgICAgICAgdGhpcy5vdXQhLm5leHQocGtKc29uUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNoZWNrU3ViRm9sZGVycyhkaXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4iXX0=