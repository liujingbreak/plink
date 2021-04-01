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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectSymlink = exports.removeProjectSymlink = void 0;
/**
 * @Deprecated
 */
const fs_1 = __importDefault(require("fs"));
const Path = __importStar(require("path"));
const misc_1 = require("./utils/misc");
/**
 * Otherwise `npm install` will get an max stack overflow error
 * @param isDrcpDevMode
 */
function removeProjectSymlink(isDrcpDevMode) {
    let projects;
    const projectListFile = Path.join(misc_1.getWorkDir(), 'dr.project.list.json');
    if (fs_1.default.existsSync(projectListFile))
        projects = require(projectListFile);
    if (projects && projects.length > 0) {
        for (const prjdir of projects) {
            const moduleDir = Path.resolve(prjdir, 'node_modules');
            try {
                const stats = fs_1.default.lstatSync(moduleDir);
                if (stats.isSymbolicLink()) {
                    fs_1.default.unlinkSync(moduleDir);
                }
            }
            catch (e) { }
        }
    }
    if (isDrcpDevMode) {
        // Since drcp itself is symlink, in case there is no dr.project.list.json, we still need to make sure...
        const moduleDir = Path.join(Path.dirname(fs_1.default.realpathSync(require.resolve('@wfh/plink/package.json'))), 'node_modules');
        try {
            const stats = fs_1.default.lstatSync(moduleDir);
            if (stats.isSymbolicLink()) {
                fs_1.default.unlinkSync(moduleDir);
            }
        }
        catch (e) { }
    }
}
exports.removeProjectSymlink = removeProjectSymlink;
/* tslint:disable:no-console */
function createProjectSymlink() {
    const isWin32 = require('os').platform().indexOf('win32') >= 0;
    const nodePath = fs_1.default.realpathSync(Path.resolve(misc_1.getWorkDir(), 'node_modules'));
    const projectListFile = Path.join(misc_1.getWorkDir(), 'dr.project.list.json');
    if (!fs_1.default.existsSync(projectListFile))
        return;
    for (const prjdir of require(projectListFile)) {
        const moduleDir = Path.resolve(prjdir, 'node_modules');
        let needCreateSymlink = false;
        let stats;
        try {
            stats = fs_1.default.lstatSync(moduleDir);
            if (stats.isSymbolicLink() || stats.isDirectory() || stats.isFile()) {
                if (!fs_1.default.existsSync(moduleDir) || fs_1.default.realpathSync(moduleDir) !== nodePath) {
                    if (stats.isSymbolicLink()) {
                        fs_1.default.unlinkSync(moduleDir);
                    }
                    else {
                        if (fs_1.default.existsSync(moduleDir + '.bak')) {
                            const _removeSync = require('fs-extra').removeSync;
                            _removeSync(moduleDir + '.bak');
                        }
                        fs_1.default.renameSync(moduleDir, moduleDir + '.bak');
                        console.log(`Backup "${moduleDir}" to "${moduleDir}.bak"`);
                    }
                    needCreateSymlink = true;
                }
            }
            else
                needCreateSymlink = true;
        }
        catch (e) {
            // node_modules does not exists, fs.lstatSync() throws error
            needCreateSymlink = true;
        }
        if (needCreateSymlink) {
            // console.log('Create symlink "%s"', Path.resolve(prjdir, 'node_modules'));
            fs_1.default.symlinkSync(Path.relative(prjdir, fs_1.default.realpathSync(nodePath)), moduleDir, isWin32 ? 'junction' : 'dir');
        }
    }
}
exports.createProjectSymlink = createProjectSymlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1kaXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wcm9qZWN0LWRpci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7O0dBRUc7QUFDSCw0Q0FBb0I7QUFFcEIsMkNBQTZCO0FBQzdCLHVDQUF3QztBQUN4Qzs7O0dBR0c7QUFDSCxTQUFnQixvQkFBb0IsQ0FBQyxhQUFzQjtJQUN6RCxJQUFJLFFBQVEsQ0FBQztJQUNiLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQVUsRUFBRSxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFDeEUsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQztRQUNoQyxRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3RDLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ25DLEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxFQUFFO1lBQzdCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3ZELElBQUk7Z0JBQ0YsTUFBTSxLQUFLLEdBQUcsWUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUU7b0JBQzFCLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQzFCO2FBQ0Y7WUFBQyxPQUFPLENBQUMsRUFBRSxHQUFFO1NBQ2Y7S0FDRjtJQUNELElBQUksYUFBYSxFQUFFO1FBQ2pCLHdHQUF3RztRQUN4RyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUMs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Ki9cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3JlbW92ZVN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldFdvcmtEaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG4vKipcbiAqIE90aGVyd2lzZSBgbnBtIGluc3RhbGxgIHdpbGwgZ2V0IGFuIG1heCBzdGFjayBvdmVyZmxvdyBlcnJvclxuICogQHBhcmFtIGlzRHJjcERldk1vZGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVQcm9qZWN0U3ltbGluayhpc0RyY3BEZXZNb2RlOiBib29sZWFuKSB7XG4gIGxldCBwcm9qZWN0cztcbiAgY29uc3QgcHJvamVjdExpc3RGaWxlID0gUGF0aC5qb2luKGdldFdvcmtEaXIoKSwgJ2RyLnByb2plY3QubGlzdC5qc29uJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHByb2plY3RMaXN0RmlsZSkpXG4gICAgcHJvamVjdHMgPSByZXF1aXJlKHByb2plY3RMaXN0RmlsZSk7XG4gIGlmIChwcm9qZWN0cyAmJiBwcm9qZWN0cy5sZW5ndGggPiAwKSB7XG4gICAgZm9yIChjb25zdCBwcmpkaXIgb2YgcHJvamVjdHMpIHtcbiAgICAgIGNvbnN0IG1vZHVsZURpciA9IFBhdGgucmVzb2x2ZShwcmpkaXIsICdub2RlX21vZHVsZXMnKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gZnMubHN0YXRTeW5jKG1vZHVsZURpcik7XG4gICAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgZnMudW5saW5rU3luYyhtb2R1bGVEaXIpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgfVxuICBpZiAoaXNEcmNwRGV2TW9kZSkge1xuICAgIC8vIFNpbmNlIGRyY3AgaXRzZWxmIGlzIHN5bWxpbmssIGluIGNhc2UgdGhlcmUgaXMgbm8gZHIucHJvamVjdC5saXN0Lmpzb24sIHdlIHN0aWxsIG5lZWQgdG8gbWFrZSBzdXJlLi4uXG4gICAgY29uc3QgbW9kdWxlRGlyID0gUGF0aC5qb2luKFBhdGguZGlybmFtZShmcy5yZWFscGF0aFN5bmMocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKSksXG4gICAgICAnbm9kZV9tb2R1bGVzJyk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gZnMubHN0YXRTeW5jKG1vZHVsZURpcik7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBmcy51bmxpbmtTeW5jKG1vZHVsZURpcik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge31cbiAgfVxufVxuXG4vKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJvamVjdFN5bWxpbmsoKSB7XG4gIGNvbnN0IGlzV2luMzIgPSByZXF1aXJlKCdvcycpLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuICBjb25zdCBub2RlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhQYXRoLnJlc29sdmUoZ2V0V29ya0RpcigpLCAnbm9kZV9tb2R1bGVzJykpO1xuICBjb25zdCBwcm9qZWN0TGlzdEZpbGUgPSBQYXRoLmpvaW4oZ2V0V29ya0RpcigpLCAnZHIucHJvamVjdC5saXN0Lmpzb24nKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKHByb2plY3RMaXN0RmlsZSkpXG4gICAgcmV0dXJuO1xuICBmb3IgKGNvbnN0IHByamRpciBvZiByZXF1aXJlKHByb2plY3RMaXN0RmlsZSkgYXMgc3RyaW5nW10pIHtcbiAgICBjb25zdCBtb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUocHJqZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgbGV0IG5lZWRDcmVhdGVTeW1saW5rID0gZmFsc2U7XG4gICAgbGV0IHN0YXRzO1xuXG4gICAgdHJ5IHtcbiAgICAgIHN0YXRzID0gZnMubHN0YXRTeW5jKG1vZHVsZURpcik7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSB8fCBzdGF0cy5pc0RpcmVjdG9yeSgpIHx8IHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhtb2R1bGVEaXIpIHx8IGZzLnJlYWxwYXRoU3luYyhtb2R1bGVEaXIpICE9PSBub2RlUGF0aCkge1xuICAgICAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICBmcy51bmxpbmtTeW5jKG1vZHVsZURpcik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKG1vZHVsZURpciArICcuYmFrJykpIHtcbiAgICAgICAgICAgICAgY29uc3QgX3JlbW92ZVN5bmM6IHR5cGVvZiByZW1vdmVTeW5jID0gcmVxdWlyZSgnZnMtZXh0cmEnKS5yZW1vdmVTeW5jO1xuICAgICAgICAgICAgICBfcmVtb3ZlU3luYyhtb2R1bGVEaXIgKyAnLmJhaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnMucmVuYW1lU3luYyhtb2R1bGVEaXIsIG1vZHVsZURpciArICcuYmFrJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgQmFja3VwIFwiJHttb2R1bGVEaXJ9XCIgdG8gXCIke21vZHVsZURpcn0uYmFrXCJgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmVlZENyZWF0ZVN5bWxpbmsgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2VcbiAgICAgICAgbmVlZENyZWF0ZVN5bWxpbmsgPSB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIG5vZGVfbW9kdWxlcyBkb2VzIG5vdCBleGlzdHMsIGZzLmxzdGF0U3luYygpIHRocm93cyBlcnJvclxuICAgICAgbmVlZENyZWF0ZVN5bWxpbmsgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAobmVlZENyZWF0ZVN5bWxpbmspIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdDcmVhdGUgc3ltbGluayBcIiVzXCInLCBQYXRoLnJlc29sdmUocHJqZGlyLCAnbm9kZV9tb2R1bGVzJykpO1xuICAgICAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShwcmpkaXIsIGZzLnJlYWxwYXRoU3luYyhub2RlUGF0aCkpLCBtb2R1bGVEaXIsIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgIH1cbiAgfVxufVxuIl19