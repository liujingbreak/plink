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
const log = (0, log4js_1.getLogger)('plink.package-mgr.find-package');
/**
 * Recursively lookup `fromDir` folder for private module's package.json file
 */
function findPackageJson(_fromDirs, startFromSubDir) {
    let fromDirs;
    if (!Array.isArray(_fromDirs))
        fromDirs = [_fromDirs];
    else
        fromDirs = _fromDirs;
    return (0, rxjs_1.merge)(...fromDirs.map(d => new FolderScanner(d).getPackageJsonFiles(startFromSubDir)));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsK0JBQW1EO0FBQ25ELG1DQUFpQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFBLGtCQUFTLEVBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUN4RDs7R0FFRztBQUNILFNBQXdCLGVBQWUsQ0FBQyxTQUE0QixFQUFFLGVBQXdCO0lBQzVGLElBQUksUUFBa0IsQ0FBQztJQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDM0IsUUFBUSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7O1FBRXZCLFFBQVEsR0FBRyxTQUFTLENBQUM7SUFDdkIsT0FBTyxJQUFBLFlBQUssRUFBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEcsQ0FBQztBQVBELGtDQU9DO0FBRUQsTUFBTSxhQUFhO0lBSWpCLFlBQVksT0FBZTtRQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELG1CQUFtQixDQUFDLGVBQXdCO1FBQzFDLE9BQU8sSUFBSSxpQkFBVSxDQUFTLEdBQUcsQ0FBQyxFQUFFO1lBQ2xDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQ2YsSUFBSSxlQUFlO2dCQUNqQixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzs7Z0JBRW5DLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxlQUFlLENBQUMsU0FBaUI7UUFDdkMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxQyxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRTtZQUMxQixJQUFJO2dCQUNGLElBQUksSUFBSSxLQUFLLGNBQWMsRUFBRTtvQkFDM0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7b0JBQ3hELElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTt3QkFDMUMsc0NBQXNDO3dCQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUNwRDtvQkFDRCxTQUFTO2lCQUNWO2dCQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3ZCO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDdkI7U0FDRjtJQUNILENBQUM7SUFFTyxXQUFXLENBQUMsR0FBVztRQUM3QixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUN4RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNsRCxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxHQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQzVCO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDM0I7U0FDRjtJQUNILENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1N1YnNjcmliZXIsIE9ic2VydmFibGUsIG1lcmdlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLW1nci5maW5kLXBhY2thZ2UnKTtcbi8qKlxuICogUmVjdXJzaXZlbHkgbG9va3VwIGBmcm9tRGlyYCBmb2xkZXIgZm9yIHByaXZhdGUgbW9kdWxlJ3MgcGFja2FnZS5qc29uIGZpbGVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZmluZFBhY2thZ2VKc29uKF9mcm9tRGlyczogc3RyaW5nW10gfCBzdHJpbmcsIHN0YXJ0RnJvbVN1YkRpcjogYm9vbGVhbikge1xuICBsZXQgZnJvbURpcnM6IHN0cmluZ1tdO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoX2Zyb21EaXJzKSlcbiAgICBmcm9tRGlycyA9IFtfZnJvbURpcnNdO1xuICBlbHNlXG4gICAgZnJvbURpcnMgPSBfZnJvbURpcnM7XG4gIHJldHVybiBtZXJnZSguLi5mcm9tRGlycy5tYXAoZCA9PiBuZXcgRm9sZGVyU2Nhbm5lcihkKS5nZXRQYWNrYWdlSnNvbkZpbGVzKHN0YXJ0RnJvbVN1YkRpcikpKTtcbn1cblxuY2xhc3MgRm9sZGVyU2Nhbm5lciB7XG4gIGZyb21EaXI6IHN0cmluZztcbiAgcHJpdmF0ZSBvdXQ6IFN1YnNjcmliZXI8c3RyaW5nPiB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3Rvcihmcm9tRGlyOiBzdHJpbmcpIHtcbiAgICB0aGlzLmZyb21EaXIgPSBQYXRoLnJlc29sdmUoZnJvbURpcik7XG4gIH1cblxuICBnZXRQYWNrYWdlSnNvbkZpbGVzKHN0YXJ0RnJvbVN1YkRpcjogYm9vbGVhbik6IE9ic2VydmFibGU8c3RyaW5nPiB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oc3ViID0+IHtcbiAgICAgIHRoaXMub3V0ID0gc3ViO1xuICAgICAgaWYgKHN0YXJ0RnJvbVN1YkRpcilcbiAgICAgICAgdGhpcy5jaGVja1N1YkZvbGRlcnModGhpcy5mcm9tRGlyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgdGhpcy5jaGVja0ZvbGRlcih0aGlzLmZyb21EaXIpO1xuICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNoZWNrU3ViRm9sZGVycyhwYXJlbnREaXI6IHN0cmluZykge1xuICAgIGNvbnN0IGZvbGRlcnMgPSBmcy5yZWFkZGlyU3luYyhwYXJlbnREaXIpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBmb2xkZXJzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAobmFtZSA9PT0gJ25vZGVfbW9kdWxlcycpIHtcbiAgICAgICAgICBjb25zdCB0ZXN0RGlyID0gUGF0aC5yZXNvbHZlKHBhcmVudERpciwgJ25vZGVfbW9kdWxlcycpO1xuICAgICAgICAgIGlmIChmcy5sc3RhdFN5bmModGVzdERpcikuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgIGxvZy5pbmZvKCdGb3VuZCBhIHN5bWxpbmsgbm9kZV9tb2R1bGVzOicsIHRlc3REaXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4ocGFyZW50RGlyLCBuYW1lKTtcbiAgICAgICAgdGhpcy5jaGVja0ZvbGRlcihkaXIpO1xuICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignJywgZXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tGb2xkZXIoZGlyOiBzdHJpbmcpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpICYmIGZzLnN0YXRTeW5jKGRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3QgcGtKc29uUGF0aCA9IFBhdGguam9pbihkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBrSnNvblBhdGgpKSB7XG4gICAgICAgIHRoaXMub3V0IS5uZXh0KHBrSnNvblBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jaGVja1N1YkZvbGRlcnMoZGlyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuIl19