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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1kaXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wcm9qZWN0LWRpci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSw0Q0FBb0I7QUFFcEIsMkNBQTZCO0FBQzdCOzs7R0FHRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLGFBQXNCO0lBQzFELElBQUksUUFBUSxDQUFDO0lBQ2IsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztJQUN6RSxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDO1FBQ2pDLFFBQVEsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDckMsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDcEMsS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUU7WUFDOUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDdkQsSUFBSTtnQkFDSCxNQUFNLEtBQUssR0FBRyxZQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN0QyxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUUsRUFBRTtvQkFDM0IsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDekI7YUFDRDtZQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUU7U0FDZDtLQUNEO0lBQ0QsSUFBSSxhQUFhLEVBQUU7UUFDbEIsd0dBQXdHO1FBQ3hHLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQ3pHLGNBQWMsQ0FBQyxDQUFDO1FB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bW92ZVN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vKipcbiAqIE90aGVyd2lzZSBgbnBtIGluc3RhbGxgIHdpbGwgZ2V0IGFuIG1heCBzdGFjayBvdmVyZmxvdyBlcnJvclxuICogQHBhcmFtIGlzRHJjcERldk1vZGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVQcm9qZWN0U3ltbGluayhpc0RyY3BEZXZNb2RlOiBib29sZWFuKSB7XG5cdGxldCBwcm9qZWN0cztcblx0Y29uc3QgcHJvamVjdExpc3RGaWxlID0gUGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdkci5wcm9qZWN0Lmxpc3QuanNvbicpO1xuXHRpZiAoZnMuZXhpc3RzU3luYyhwcm9qZWN0TGlzdEZpbGUpKVxuXHRcdHByb2plY3RzID0gcmVxdWlyZShwcm9qZWN0TGlzdEZpbGUpO1xuXHRpZiAocHJvamVjdHMgJiYgcHJvamVjdHMubGVuZ3RoID4gMCkge1xuXHRcdGZvciAoY29uc3QgcHJqZGlyIG9mIHByb2plY3RzKSB7XG5cdFx0XHRjb25zdCBtb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUocHJqZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCBzdGF0cyA9IGZzLmxzdGF0U3luYyhtb2R1bGVEaXIpO1xuXHRcdFx0XHRpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuXHRcdFx0XHRcdGZzLnVubGlua1N5bmMobW9kdWxlRGlyKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBjYXRjaCAoZSkge31cblx0XHR9XG5cdH1cblx0aWYgKGlzRHJjcERldk1vZGUpIHtcblx0XHQvLyBTaW5jZSBkcmNwIGl0c2VsZiBpcyBzeW1saW5rLCBpbiBjYXNlIHRoZXJlIGlzIG5vIGRyLnByb2plY3QubGlzdC5qc29uLCB3ZSBzdGlsbCBuZWVkIHRvIG1ha2Ugc3VyZS4uLlxuXHRcdGNvbnN0IG1vZHVsZURpciA9IFBhdGguam9pbihQYXRoLmRpcm5hbWUoZnMucmVhbHBhdGhTeW5jKHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpKSksXG5cdFx0XHQnbm9kZV9tb2R1bGVzJyk7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHN0YXRzID0gZnMubHN0YXRTeW5jKG1vZHVsZURpcik7XG5cdFx0XHRpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuXHRcdFx0XHRmcy51bmxpbmtTeW5jKG1vZHVsZURpcik7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge31cblx0fVxufVxuXG4vKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJvamVjdFN5bWxpbmsoKSB7XG5cdGNvbnN0IGlzV2luMzIgPSByZXF1aXJlKCdvcycpLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXHRjb25zdCBub2RlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhQYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ25vZGVfbW9kdWxlcycpKTtcblx0Y29uc3QgcHJvamVjdExpc3RGaWxlID0gUGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdkci5wcm9qZWN0Lmxpc3QuanNvbicpO1xuXHRpZiAoIWZzLmV4aXN0c1N5bmMocHJvamVjdExpc3RGaWxlKSlcblx0XHRyZXR1cm47XG5cdGZvciAoY29uc3QgcHJqZGlyIG9mIHJlcXVpcmUocHJvamVjdExpc3RGaWxlKSBhcyBzdHJpbmdbXSkge1xuXHRcdGNvbnN0IG1vZHVsZURpciA9IFBhdGgucmVzb2x2ZShwcmpkaXIsICdub2RlX21vZHVsZXMnKTtcblx0XHRsZXQgbmVlZENyZWF0ZVN5bWxpbmsgPSBmYWxzZTtcblx0XHRsZXQgc3RhdHM7XG5cblx0XHR0cnkge1xuXHRcdFx0c3RhdHMgPSBmcy5sc3RhdFN5bmMobW9kdWxlRGlyKTtcblx0XHRcdGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpIHx8IHN0YXRzLmlzRGlyZWN0b3J5KCkgfHwgc3RhdHMuaXNGaWxlKCkpIHtcblx0XHRcdFx0aWYgKCFmcy5leGlzdHNTeW5jKG1vZHVsZURpcikgfHwgZnMucmVhbHBhdGhTeW5jKG1vZHVsZURpcikgIT09IG5vZGVQYXRoKSB7XG5cdFx0XHRcdFx0aWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcblx0XHRcdFx0XHRcdGZzLnVubGlua1N5bmMobW9kdWxlRGlyKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aWYgKGZzLmV4aXN0c1N5bmMobW9kdWxlRGlyICsgJy5iYWsnKSkge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBfcmVtb3ZlU3luYzogdHlwZW9mIHJlbW92ZVN5bmMgPSByZXF1aXJlKCdmcy1leHRyYScpLnJlbW92ZVN5bmM7XG5cdFx0XHRcdFx0XHRcdF9yZW1vdmVTeW5jKG1vZHVsZURpciArICcuYmFrJyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRmcy5yZW5hbWVTeW5jKG1vZHVsZURpciwgbW9kdWxlRGlyICsgJy5iYWsnKTtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGBCYWNrdXAgXCIke21vZHVsZURpcn1cIiB0byBcIiR7bW9kdWxlRGlyfS5iYWtcImApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRuZWVkQ3JlYXRlU3ltbGluayA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZVxuXHRcdFx0XHRuZWVkQ3JlYXRlU3ltbGluayA9IHRydWU7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Ly8gbm9kZV9tb2R1bGVzIGRvZXMgbm90IGV4aXN0cywgZnMubHN0YXRTeW5jKCkgdGhyb3dzIGVycm9yXG5cdFx0XHRuZWVkQ3JlYXRlU3ltbGluayA9IHRydWU7XG5cdFx0fVxuXHRcdGlmIChuZWVkQ3JlYXRlU3ltbGluaykge1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ0NyZWF0ZSBzeW1saW5rIFwiJXNcIicsIFBhdGgucmVzb2x2ZShwcmpkaXIsICdub2RlX21vZHVsZXMnKSk7XG5cdFx0XHRmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKHByamRpciwgZnMucmVhbHBhdGhTeW5jKG5vZGVQYXRoKSksIG1vZHVsZURpciwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG5cdFx0fVxuXHR9XG59XG4iXX0=