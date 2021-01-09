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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsK0JBQW1EO0FBRW5EOztHQUVHO0FBQ0gsU0FBd0IsZUFBZSxDQUFDLFNBQTRCLEVBQUUsZUFBd0I7SUFDNUYsSUFBSSxRQUFrQixDQUFDO0lBQ3ZCLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUMzQixRQUFRLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQzs7UUFFdkIsUUFBUSxHQUFHLFNBQVMsQ0FBQztJQUN2QixPQUFPLFlBQUssQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEcsQ0FBQztBQVBELGtDQU9DO0FBRUQsTUFBTSxhQUFhO0lBSWpCLFlBQVksT0FBZTtRQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELG1CQUFtQixDQUFDLGVBQXdCO1FBQzFDLE9BQU8sSUFBSSxpQkFBVSxDQUFTLEdBQUcsQ0FBQyxFQUFFO1lBQ2xDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQ2YsSUFBSSxlQUFlO2dCQUNqQixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzs7Z0JBRW5DLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxlQUFlLENBQUMsU0FBaUI7UUFDdkMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxQyxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRTtZQUMxQixJQUFJO2dCQUNGLElBQUksSUFBSSxLQUFLLGNBQWMsRUFBRTtvQkFDM0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7b0JBQ3hELElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTt3QkFDMUMsdUNBQXVDO3dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUN0RTtvQkFDRCxTQUFTO2lCQUNWO2dCQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3ZCO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUNyQztTQUNGO0lBQ0gsQ0FBQztJQUVPLFdBQVcsQ0FBQyxHQUFXO1FBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUN4RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNsRCxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQzNCO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDM0I7U0FDRjtJQUNILENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1N1YnNjcmliZXIsIE9ic2VydmFibGUsIG1lcmdlfSBmcm9tICdyeGpzJztcblxuLyoqXG4gKiBSZWN1cnNpdmVseSBsb29rdXAgYGZyb21EaXJgIGZvbGRlciBmb3IgcHJpdmF0ZSBtb2R1bGUncyBwYWNrYWdlLmpzb24gZmlsZVxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmaW5kUGFja2FnZUpzb24oX2Zyb21EaXJzOiBzdHJpbmdbXSB8IHN0cmluZywgc3RhcnRGcm9tU3ViRGlyOiBib29sZWFuKSB7XG4gIGxldCBmcm9tRGlyczogc3RyaW5nW107XG4gIGlmICghQXJyYXkuaXNBcnJheShfZnJvbURpcnMpKVxuICAgIGZyb21EaXJzID0gW19mcm9tRGlyc107XG4gIGVsc2VcbiAgICBmcm9tRGlycyA9IF9mcm9tRGlycztcbiAgcmV0dXJuIG1lcmdlKC4uLmZyb21EaXJzLm1hcChkID0+IG5ldyBGb2xkZXJTY2FubmVyKGQpLmdldFBhY2thZ2VKc29uRmlsZXMoc3RhcnRGcm9tU3ViRGlyKSkpO1xufVxuXG5jbGFzcyBGb2xkZXJTY2FubmVyIHtcbiAgZnJvbURpcjogc3RyaW5nO1xuICBwcml2YXRlIG91dDogU3Vic2NyaWJlcjxzdHJpbmc+O1xuXG4gIGNvbnN0cnVjdG9yKGZyb21EaXI6IHN0cmluZykge1xuICAgIHRoaXMuZnJvbURpciA9IFBhdGgucmVzb2x2ZShmcm9tRGlyKTtcbiAgfVxuXG4gIGdldFBhY2thZ2VKc29uRmlsZXMoc3RhcnRGcm9tU3ViRGlyOiBib29sZWFuKTogT2JzZXJ2YWJsZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihzdWIgPT4ge1xuICAgICAgdGhpcy5vdXQgPSBzdWI7XG4gICAgICBpZiAoc3RhcnRGcm9tU3ViRGlyKVxuICAgICAgICB0aGlzLmNoZWNrU3ViRm9sZGVycyh0aGlzLmZyb21EaXIpO1xuICAgICAgZWxzZVxuICAgICAgICB0aGlzLmNoZWNrRm9sZGVyKHRoaXMuZnJvbURpcik7XG4gICAgICBzdWIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tTdWJGb2xkZXJzKHBhcmVudERpcjogc3RyaW5nKSB7XG4gICAgY29uc3QgZm9sZGVycyA9IGZzLnJlYWRkaXJTeW5jKHBhcmVudERpcik7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGZvbGRlcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChuYW1lID09PSAnbm9kZV9tb2R1bGVzJykge1xuICAgICAgICAgIGNvbnN0IHRlc3REaXIgPSBQYXRoLnJlc29sdmUocGFyZW50RGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgICAgaWYgKGZzLmxzdGF0U3luYyh0ZXN0RGlyKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbZmluZC1wYWNrYWdlXSBmb3VuZCBhIHN5bWxpbmsgbm9kZV9tb2R1bGVzOicsIHRlc3REaXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4ocGFyZW50RGlyLCBuYW1lKTtcbiAgICAgICAgdGhpcy5jaGVja0ZvbGRlcihkaXIpO1xuICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW2ZpbmQtcGFja2FnZV0nLCBlcik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0ZvbGRlcihkaXI6IHN0cmluZykge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpcikgJiYgZnMuc3RhdFN5bmMoZGlyKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb25zdCBwa0pzb25QYXRoID0gUGF0aC5qb2luKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGtKc29uUGF0aCkpIHtcbiAgICAgICAgdGhpcy5vdXQubmV4dChwa0pzb25QYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuY2hlY2tTdWJGb2xkZXJzKGRpcik7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbiJdfQ==