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
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const rxjs_1 = require("rxjs");
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
                this.out.next(pkJsonPath);
            }
            else {
                self.checkSubFolders(dir);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vdHMvcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsK0JBQW1EO0FBRW5EOztHQUVHO0FBQ0gsU0FBd0IsZUFBZSxDQUFDLFNBQTRCLEVBQUUsZUFBd0I7SUFDNUYsSUFBSSxRQUFrQixDQUFDO0lBQ3ZCLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUMzQixRQUFRLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQzs7UUFFdkIsUUFBUSxHQUFHLFNBQVMsQ0FBQztJQUN2QixPQUFPLFlBQUssQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEcsQ0FBQztBQVBELGtDQU9DO0FBRUQsTUFBTSxhQUFhO0lBSWpCLFlBQVksT0FBZTtRQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELG1CQUFtQixDQUFDLGVBQXdCO1FBQzFDLE9BQU8sSUFBSSxpQkFBVSxDQUFTLEdBQUcsQ0FBQyxFQUFFO1lBQ2xDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQ2YsSUFBSSxlQUFlO2dCQUNqQixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzs7Z0JBRW5DLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxlQUFlLENBQUMsU0FBaUI7UUFDdkMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxQyxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRTtZQUMxQixJQUFJO2dCQUNGLElBQUksSUFBSSxLQUFLLGNBQWMsRUFBRTtvQkFDM0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7b0JBQ3hELElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTt3QkFDMUMsdUNBQXVDO3dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUN0RTtvQkFDRCxTQUFTO2lCQUNWO2dCQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3ZCO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUNyQztTQUNGO0lBQ0gsQ0FBQztJQUVPLFdBQVcsQ0FBQyxHQUFXO1FBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDbEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDbEQsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUMzQjtpQkFBTTtnQkFDTCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzNCO1NBQ0Y7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtTdWJzY3JpYmVyLCBPYnNlcnZhYmxlLCBtZXJnZX0gZnJvbSAncnhqcyc7XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgbG9va3VwIGBmcm9tRGlyYCBmb2xkZXIgZm9yIHByaXZhdGUgbW9kdWxlJ3MgcGFja2FnZS5qc29uIGZpbGVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZmluZFBhY2thZ2VKc29uKF9mcm9tRGlyczogc3RyaW5nW10gfCBzdHJpbmcsIHN0YXJ0RnJvbVN1YkRpcjogYm9vbGVhbikge1xuICBsZXQgZnJvbURpcnM6IHN0cmluZ1tdO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoX2Zyb21EaXJzKSlcbiAgICBmcm9tRGlycyA9IFtfZnJvbURpcnNdO1xuICBlbHNlXG4gICAgZnJvbURpcnMgPSBfZnJvbURpcnM7XG4gIHJldHVybiBtZXJnZSguLi5mcm9tRGlycy5tYXAoZCA9PiBuZXcgRm9sZGVyU2Nhbm5lcihkKS5nZXRQYWNrYWdlSnNvbkZpbGVzKHN0YXJ0RnJvbVN1YkRpcikpKTtcbn1cblxuY2xhc3MgRm9sZGVyU2Nhbm5lciB7XG4gIGZyb21EaXI6IHN0cmluZztcbiAgcHJpdmF0ZSBvdXQ6IFN1YnNjcmliZXI8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3Rvcihmcm9tRGlyOiBzdHJpbmcpIHtcbiAgICB0aGlzLmZyb21EaXIgPSBQYXRoLnJlc29sdmUoZnJvbURpcik7XG4gIH1cblxuICBnZXRQYWNrYWdlSnNvbkZpbGVzKHN0YXJ0RnJvbVN1YkRpcjogYm9vbGVhbik6IE9ic2VydmFibGU8c3RyaW5nPiB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oc3ViID0+IHtcbiAgICAgIHRoaXMub3V0ID0gc3ViO1xuICAgICAgaWYgKHN0YXJ0RnJvbVN1YkRpcilcbiAgICAgICAgdGhpcy5jaGVja1N1YkZvbGRlcnModGhpcy5mcm9tRGlyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgdGhpcy5jaGVja0ZvbGRlcih0aGlzLmZyb21EaXIpO1xuICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNoZWNrU3ViRm9sZGVycyhwYXJlbnREaXI6IHN0cmluZykge1xuICAgIGNvbnN0IGZvbGRlcnMgPSBmcy5yZWFkZGlyU3luYyhwYXJlbnREaXIpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBmb2xkZXJzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAobmFtZSA9PT0gJ25vZGVfbW9kdWxlcycpIHtcbiAgICAgICAgICBjb25zdCB0ZXN0RGlyID0gUGF0aC5yZXNvbHZlKHBhcmVudERpciwgJ25vZGVfbW9kdWxlcycpO1xuICAgICAgICAgIGlmIChmcy5sc3RhdFN5bmModGVzdERpcikuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW2ZpbmQtcGFja2FnZV0gZm91bmQgYSBzeW1saW5rIG5vZGVfbW9kdWxlczonLCB0ZXN0RGlyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlyID0gUGF0aC5qb2luKHBhcmVudERpciwgbmFtZSk7XG4gICAgICAgIHRoaXMuY2hlY2tGb2xkZXIoZGlyKTtcbiAgICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tmaW5kLXBhY2thZ2VdJywgZXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tGb2xkZXIoZGlyOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBpZiAoZnMuc3RhdFN5bmMoZGlyKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb25zdCBwa0pzb25QYXRoID0gUGF0aC5qb2luKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGtKc29uUGF0aCkpIHtcbiAgICAgICAgdGhpcy5vdXQubmV4dChwa0pzb25QYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuY2hlY2tTdWJGb2xkZXJzKGRpcik7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbiJdfQ==