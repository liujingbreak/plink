"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const Path = __importStar(require("path"));
/**
 * Otherwise `npm install` will get an max stack overflow error
 * @param isDrcpDevMode
 */
function removeProjectSymlink(isDrcpDevMode) {
    let projects;
    const projectListFile = Path.join(process.cwd(), 'dr.project.list.json');
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
        const moduleDir = Path.join(Path.dirname(fs_1.default.realpathSync(require.resolve('dr-comp-package/package.json'))), 'node_modules');
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
    const nodePath = fs_1.default.realpathSync(Path.resolve(process.cwd(), 'node_modules'));
    const projectListFile = Path.join(process.cwd(), 'dr.project.list.json');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1kaXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wcm9qZWN0LWRpci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSw0Q0FBb0I7QUFFcEIsMkNBQTZCO0FBQzdCOzs7R0FHRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLGFBQXNCO0lBQ3pELElBQUksUUFBUSxDQUFDO0lBQ2IsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztJQUN6RSxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDO1FBQ2hDLFFBQVEsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDdEMsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDbkMsS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUU7WUFDN0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDdkQsSUFBSTtnQkFDRixNQUFNLEtBQUssR0FBRyxZQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN0QyxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUUsRUFBRTtvQkFDMUIsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDMUI7YUFDRjtZQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUU7U0FDZjtLQUNGO0lBQ0QsSUFBSSxhQUFhLEVBQUU7UUFDakIsd0dBQXdHO1FBQ3hHLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQ3hHLGNBQWMsQ0FBQyxDQUFDO1FB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bW92ZVN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vKipcbiAqIE90aGVyd2lzZSBgbnBtIGluc3RhbGxgIHdpbGwgZ2V0IGFuIG1heCBzdGFjayBvdmVyZmxvdyBlcnJvclxuICogQHBhcmFtIGlzRHJjcERldk1vZGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVQcm9qZWN0U3ltbGluayhpc0RyY3BEZXZNb2RlOiBib29sZWFuKSB7XG4gIGxldCBwcm9qZWN0cztcbiAgY29uc3QgcHJvamVjdExpc3RGaWxlID0gUGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdkci5wcm9qZWN0Lmxpc3QuanNvbicpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhwcm9qZWN0TGlzdEZpbGUpKVxuICAgIHByb2plY3RzID0gcmVxdWlyZShwcm9qZWN0TGlzdEZpbGUpO1xuICBpZiAocHJvamVjdHMgJiYgcHJvamVjdHMubGVuZ3RoID4gMCkge1xuICAgIGZvciAoY29uc3QgcHJqZGlyIG9mIHByb2plY3RzKSB7XG4gICAgICBjb25zdCBtb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUocHJqZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IGZzLmxzdGF0U3luYyhtb2R1bGVEaXIpO1xuICAgICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgIGZzLnVubGlua1N5bmMobW9kdWxlRGlyKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG4gIH1cbiAgaWYgKGlzRHJjcERldk1vZGUpIHtcbiAgICAvLyBTaW5jZSBkcmNwIGl0c2VsZiBpcyBzeW1saW5rLCBpbiBjYXNlIHRoZXJlIGlzIG5vIGRyLnByb2plY3QubGlzdC5qc29uLCB3ZSBzdGlsbCBuZWVkIHRvIG1ha2Ugc3VyZS4uLlxuICAgIGNvbnN0IG1vZHVsZURpciA9IFBhdGguam9pbihQYXRoLmRpcm5hbWUoZnMucmVhbHBhdGhTeW5jKHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpKSksXG4gICAgICAnbm9kZV9tb2R1bGVzJyk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gZnMubHN0YXRTeW5jKG1vZHVsZURpcik7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBmcy51bmxpbmtTeW5jKG1vZHVsZURpcik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge31cbiAgfVxufVxuXG4vKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJvamVjdFN5bWxpbmsoKSB7XG4gIGNvbnN0IGlzV2luMzIgPSByZXF1aXJlKCdvcycpLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuICBjb25zdCBub2RlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhQYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ25vZGVfbW9kdWxlcycpKTtcbiAgY29uc3QgcHJvamVjdExpc3RGaWxlID0gUGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdkci5wcm9qZWN0Lmxpc3QuanNvbicpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMocHJvamVjdExpc3RGaWxlKSlcbiAgICByZXR1cm47XG4gIGZvciAoY29uc3QgcHJqZGlyIG9mIHJlcXVpcmUocHJvamVjdExpc3RGaWxlKSBhcyBzdHJpbmdbXSkge1xuICAgIGNvbnN0IG1vZHVsZURpciA9IFBhdGgucmVzb2x2ZShwcmpkaXIsICdub2RlX21vZHVsZXMnKTtcbiAgICBsZXQgbmVlZENyZWF0ZVN5bWxpbmsgPSBmYWxzZTtcbiAgICBsZXQgc3RhdHM7XG5cbiAgICB0cnkge1xuICAgICAgc3RhdHMgPSBmcy5sc3RhdFN5bmMobW9kdWxlRGlyKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpIHx8IHN0YXRzLmlzRGlyZWN0b3J5KCkgfHwgc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKG1vZHVsZURpcikgfHwgZnMucmVhbHBhdGhTeW5jKG1vZHVsZURpcikgIT09IG5vZGVQYXRoKSB7XG4gICAgICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgIGZzLnVubGlua1N5bmMobW9kdWxlRGlyKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMobW9kdWxlRGlyICsgJy5iYWsnKSkge1xuICAgICAgICAgICAgICBjb25zdCBfcmVtb3ZlU3luYzogdHlwZW9mIHJlbW92ZVN5bmMgPSByZXF1aXJlKCdmcy1leHRyYScpLnJlbW92ZVN5bmM7XG4gICAgICAgICAgICAgIF9yZW1vdmVTeW5jKG1vZHVsZURpciArICcuYmFrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcy5yZW5hbWVTeW5jKG1vZHVsZURpciwgbW9kdWxlRGlyICsgJy5iYWsnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBCYWNrdXAgXCIke21vZHVsZURpcn1cIiB0byBcIiR7bW9kdWxlRGlyfS5iYWtcImApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZWVkQ3JlYXRlU3ltbGluayA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZVxuICAgICAgICBuZWVkQ3JlYXRlU3ltbGluayA9IHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gbm9kZV9tb2R1bGVzIGRvZXMgbm90IGV4aXN0cywgZnMubHN0YXRTeW5jKCkgdGhyb3dzIGVycm9yXG4gICAgICBuZWVkQ3JlYXRlU3ltbGluayA9IHRydWU7XG4gICAgfVxuICAgIGlmIChuZWVkQ3JlYXRlU3ltbGluaykge1xuICAgICAgLy8gY29uc29sZS5sb2coJ0NyZWF0ZSBzeW1saW5rIFwiJXNcIicsIFBhdGgucmVzb2x2ZShwcmpkaXIsICdub2RlX21vZHVsZXMnKSk7XG4gICAgICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKHByamRpciwgZnMucmVhbHBhdGhTeW5jKG5vZGVQYXRoKSksIG1vZHVsZURpciwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAgfVxuICB9XG59XG4iXX0=