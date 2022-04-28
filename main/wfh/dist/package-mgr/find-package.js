"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
                        log.debug('Found existing symlink node_modules:', testDir);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLCtCQUFtRDtBQUNuRCxtQ0FBaUM7QUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDeEQ7O0dBRUc7QUFDSCxTQUF3QixlQUFlLENBQUMsU0FBNEIsRUFBRSxlQUF3QjtJQUM1RixJQUFJLFFBQWtCLENBQUM7SUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQzNCLFFBQVEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztRQUV2QixRQUFRLEdBQUcsU0FBUyxDQUFDO0lBQ3ZCLE9BQU8sSUFBQSxZQUFLLEVBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLENBQUM7QUFQRCxrQ0FPQztBQUVELE1BQU0sYUFBYTtJQUlqQixZQUFZLE9BQWU7UUFDekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxlQUF3QjtRQUMxQyxPQUFPLElBQUksaUJBQVUsQ0FBUyxHQUFHLENBQUMsRUFBRTtZQUNsQyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUNmLElBQUksZUFBZTtnQkFDakIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7O2dCQUVuQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNqQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sZUFBZSxDQUFDLFNBQWlCO1FBQ3ZDLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLEVBQUU7WUFDMUIsSUFBSTtnQkFDRixJQUFJLElBQUksS0FBSyxjQUFjLEVBQUU7b0JBQzNCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO29CQUN4RCxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7d0JBQzFDLHNDQUFzQzt3QkFDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDNUQ7b0JBQ0QsU0FBUztpQkFDVjtnQkFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUN2QjtZQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZCO1NBQ0Y7SUFDSCxDQUFDO0lBRU8sV0FBVyxDQUFDLEdBQVc7UUFDN0IsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDeEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDbEQsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUM3QixJQUFJLENBQUMsR0FBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUM1QjtpQkFBTTtnQkFDTCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzNCO1NBQ0Y7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtTdWJzY3JpYmVyLCBPYnNlcnZhYmxlLCBtZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucGFja2FnZS1tZ3IuZmluZC1wYWNrYWdlJyk7XG4vKipcbiAqIFJlY3Vyc2l2ZWx5IGxvb2t1cCBgZnJvbURpcmAgZm9sZGVyIGZvciBwcml2YXRlIG1vZHVsZSdzIHBhY2thZ2UuanNvbiBmaWxlXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZpbmRQYWNrYWdlSnNvbihfZnJvbURpcnM6IHN0cmluZ1tdIHwgc3RyaW5nLCBzdGFydEZyb21TdWJEaXI6IGJvb2xlYW4pIHtcbiAgbGV0IGZyb21EaXJzOiBzdHJpbmdbXTtcbiAgaWYgKCFBcnJheS5pc0FycmF5KF9mcm9tRGlycykpXG4gICAgZnJvbURpcnMgPSBbX2Zyb21EaXJzXTtcbiAgZWxzZVxuICAgIGZyb21EaXJzID0gX2Zyb21EaXJzO1xuICByZXR1cm4gbWVyZ2UoLi4uZnJvbURpcnMubWFwKGQgPT4gbmV3IEZvbGRlclNjYW5uZXIoZCkuZ2V0UGFja2FnZUpzb25GaWxlcyhzdGFydEZyb21TdWJEaXIpKSk7XG59XG5cbmNsYXNzIEZvbGRlclNjYW5uZXIge1xuICBmcm9tRGlyOiBzdHJpbmc7XG4gIHByaXZhdGUgb3V0OiBTdWJzY3JpYmVyPHN0cmluZz4gfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoZnJvbURpcjogc3RyaW5nKSB7XG4gICAgdGhpcy5mcm9tRGlyID0gUGF0aC5yZXNvbHZlKGZyb21EaXIpO1xuICB9XG5cbiAgZ2V0UGFja2FnZUpzb25GaWxlcyhzdGFydEZyb21TdWJEaXI6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPHN0cmluZz4ge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxzdHJpbmc+KHN1YiA9PiB7XG4gICAgICB0aGlzLm91dCA9IHN1YjtcbiAgICAgIGlmIChzdGFydEZyb21TdWJEaXIpXG4gICAgICAgIHRoaXMuY2hlY2tTdWJGb2xkZXJzKHRoaXMuZnJvbURpcik7XG4gICAgICBlbHNlXG4gICAgICAgIHRoaXMuY2hlY2tGb2xkZXIodGhpcy5mcm9tRGlyKTtcbiAgICAgIHN1Yi5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja1N1YkZvbGRlcnMocGFyZW50RGlyOiBzdHJpbmcpIHtcbiAgICBjb25zdCBmb2xkZXJzID0gZnMucmVhZGRpclN5bmMocGFyZW50RGlyKTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgZm9sZGVycykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKG5hbWUgPT09ICdub2RlX21vZHVsZXMnKSB7XG4gICAgICAgICAgY29uc3QgdGVzdERpciA9IFBhdGgucmVzb2x2ZShwYXJlbnREaXIsICdub2RlX21vZHVsZXMnKTtcbiAgICAgICAgICBpZiAoZnMubHN0YXRTeW5jKHRlc3REaXIpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICBsb2cuZGVidWcoJ0ZvdW5kIGV4aXN0aW5nIHN5bWxpbmsgbm9kZV9tb2R1bGVzOicsIHRlc3REaXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4ocGFyZW50RGlyLCBuYW1lKTtcbiAgICAgICAgdGhpcy5jaGVja0ZvbGRlcihkaXIpO1xuICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignJywgZXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tGb2xkZXIoZGlyOiBzdHJpbmcpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpICYmIGZzLnN0YXRTeW5jKGRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3QgcGtKc29uUGF0aCA9IFBhdGguam9pbihkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBrSnNvblBhdGgpKSB7XG4gICAgICAgIHRoaXMub3V0IS5uZXh0KHBrSnNvblBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jaGVja1N1YkZvbGRlcnMoZGlyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuIl19