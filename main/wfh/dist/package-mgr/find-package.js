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
        const self = this;
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            const pkJsonPath = Path.join(dir, 'package.json');
            if (fs.existsSync(pkJsonPath)) {
                this.out.next(pkJsonPath);
            }
            else {
                self.checkSubFolders(dir);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsK0JBQW1EO0FBQ25ELG1DQUFpQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDeEQ7O0dBRUc7QUFDSCxTQUF3QixlQUFlLENBQUMsU0FBNEIsRUFBRSxlQUF3QjtJQUM1RixJQUFJLFFBQWtCLENBQUM7SUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQzNCLFFBQVEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztRQUV2QixRQUFRLEdBQUcsU0FBUyxDQUFDO0lBQ3ZCLE9BQU8sWUFBSyxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRyxDQUFDO0FBUEQsa0NBT0M7QUFFRCxNQUFNLGFBQWE7SUFJakIsWUFBWSxPQUFlO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsZUFBd0I7UUFDMUMsT0FBTyxJQUFJLGlCQUFVLENBQVMsR0FBRyxDQUFDLEVBQUU7WUFDbEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDZixJQUFJLGVBQWU7Z0JBQ2pCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztnQkFFbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDakMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGVBQWUsQ0FBQyxTQUFpQjtRQUN2QyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFO1lBQzFCLElBQUk7Z0JBQ0YsSUFBSSxJQUFJLEtBQUssY0FBYyxFQUFFO29CQUMzQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztvQkFDeEQsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO3dCQUMxQyxzQ0FBc0M7d0JBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsT0FBTyxDQUFDLENBQUM7cUJBQ3BEO29CQUNELFNBQVM7aUJBQ1Y7Z0JBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDdkI7WUFBQyxPQUFPLEVBQUUsRUFBRTtnQkFDWCxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN2QjtTQUNGO0lBQ0gsQ0FBQztJQUVPLFdBQVcsQ0FBQyxHQUFXO1FBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUN4RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNsRCxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQzNCO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDM0I7U0FDRjtJQUNILENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1N1YnNjcmliZXIsIE9ic2VydmFibGUsIG1lcmdlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLW1nci5maW5kLXBhY2thZ2UnKTtcbi8qKlxuICogUmVjdXJzaXZlbHkgbG9va3VwIGBmcm9tRGlyYCBmb2xkZXIgZm9yIHByaXZhdGUgbW9kdWxlJ3MgcGFja2FnZS5qc29uIGZpbGVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZmluZFBhY2thZ2VKc29uKF9mcm9tRGlyczogc3RyaW5nW10gfCBzdHJpbmcsIHN0YXJ0RnJvbVN1YkRpcjogYm9vbGVhbikge1xuICBsZXQgZnJvbURpcnM6IHN0cmluZ1tdO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoX2Zyb21EaXJzKSlcbiAgICBmcm9tRGlycyA9IFtfZnJvbURpcnNdO1xuICBlbHNlXG4gICAgZnJvbURpcnMgPSBfZnJvbURpcnM7XG4gIHJldHVybiBtZXJnZSguLi5mcm9tRGlycy5tYXAoZCA9PiBuZXcgRm9sZGVyU2Nhbm5lcihkKS5nZXRQYWNrYWdlSnNvbkZpbGVzKHN0YXJ0RnJvbVN1YkRpcikpKTtcbn1cblxuY2xhc3MgRm9sZGVyU2Nhbm5lciB7XG4gIGZyb21EaXI6IHN0cmluZztcbiAgcHJpdmF0ZSBvdXQ6IFN1YnNjcmliZXI8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3Rvcihmcm9tRGlyOiBzdHJpbmcpIHtcbiAgICB0aGlzLmZyb21EaXIgPSBQYXRoLnJlc29sdmUoZnJvbURpcik7XG4gIH1cblxuICBnZXRQYWNrYWdlSnNvbkZpbGVzKHN0YXJ0RnJvbVN1YkRpcjogYm9vbGVhbik6IE9ic2VydmFibGU8c3RyaW5nPiB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oc3ViID0+IHtcbiAgICAgIHRoaXMub3V0ID0gc3ViO1xuICAgICAgaWYgKHN0YXJ0RnJvbVN1YkRpcilcbiAgICAgICAgdGhpcy5jaGVja1N1YkZvbGRlcnModGhpcy5mcm9tRGlyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgdGhpcy5jaGVja0ZvbGRlcih0aGlzLmZyb21EaXIpO1xuICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNoZWNrU3ViRm9sZGVycyhwYXJlbnREaXI6IHN0cmluZykge1xuICAgIGNvbnN0IGZvbGRlcnMgPSBmcy5yZWFkZGlyU3luYyhwYXJlbnREaXIpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBmb2xkZXJzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAobmFtZSA9PT0gJ25vZGVfbW9kdWxlcycpIHtcbiAgICAgICAgICBjb25zdCB0ZXN0RGlyID0gUGF0aC5yZXNvbHZlKHBhcmVudERpciwgJ25vZGVfbW9kdWxlcycpO1xuICAgICAgICAgIGlmIChmcy5sc3RhdFN5bmModGVzdERpcikuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgIGxvZy5pbmZvKCdGb3VuZCBhIHN5bWxpbmsgbm9kZV9tb2R1bGVzOicsIHRlc3REaXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4ocGFyZW50RGlyLCBuYW1lKTtcbiAgICAgICAgdGhpcy5jaGVja0ZvbGRlcihkaXIpO1xuICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignJywgZXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tGb2xkZXIoZGlyOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpICYmIGZzLnN0YXRTeW5jKGRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3QgcGtKc29uUGF0aCA9IFBhdGguam9pbihkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBrSnNvblBhdGgpKSB7XG4gICAgICAgIHRoaXMub3V0Lm5leHQocGtKc29uUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLmNoZWNrU3ViRm9sZGVycyhkaXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4iXX0=