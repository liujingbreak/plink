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
    const projectListFile = Path.join((0, misc_1.getWorkDir)(), 'dr.project.list.json');
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
/* eslint-disable no-console */
function createProjectSymlink() {
    const isWin32 = require('os').platform().indexOf('win32') >= 0;
    const nodePath = fs_1.default.realpathSync(Path.resolve((0, misc_1.getWorkDir)(), 'node_modules'));
    const projectListFile = Path.join((0, misc_1.getWorkDir)(), 'dr.project.list.json');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1kaXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wcm9qZWN0LWRpci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOztHQUVHO0FBQ0gsNENBQW9CO0FBRXBCLDJDQUE2QjtBQUM3Qix1Q0FBd0M7QUFDeEM7OztHQUdHO0FBQ0gsU0FBZ0Isb0JBQW9CLENBQUMsYUFBc0I7SUFDekQsSUFBSSxRQUFRLENBQUM7SUFDYixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUEsaUJBQVUsR0FBRSxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFDeEUsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQztRQUNoQyxRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3RDLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ25DLEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxFQUFFO1lBQzdCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3ZELElBQUk7Z0JBQ0YsTUFBTSxLQUFLLEdBQUcsWUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUU7b0JBQzFCLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQzFCO2FBQ0Y7WUFBQyxPQUFPLENBQUMsRUFBRSxHQUFFO1NBQ2Y7S0FDRjtJQUNELElBQUksYUFBYSxFQUFFO1FBQ2pCLHdHQUF3RztRQUN4RyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHlCQUF5QixD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XG4gKiBARGVwcmVjYXRlZFxuICovXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtyZW1vdmVTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRXb3JrRGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuLyoqXG4gKiBPdGhlcndpc2UgYG5wbSBpbnN0YWxsYCB3aWxsIGdldCBhbiBtYXggc3RhY2sgb3ZlcmZsb3cgZXJyb3JcbiAqIEBwYXJhbSBpc0RyY3BEZXZNb2RlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlUHJvamVjdFN5bWxpbmsoaXNEcmNwRGV2TW9kZTogYm9vbGVhbikge1xuICBsZXQgcHJvamVjdHM7XG4gIGNvbnN0IHByb2plY3RMaXN0RmlsZSA9IFBhdGguam9pbihnZXRXb3JrRGlyKCksICdkci5wcm9qZWN0Lmxpc3QuanNvbicpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhwcm9qZWN0TGlzdEZpbGUpKVxuICAgIHByb2plY3RzID0gcmVxdWlyZShwcm9qZWN0TGlzdEZpbGUpO1xuICBpZiAocHJvamVjdHMgJiYgcHJvamVjdHMubGVuZ3RoID4gMCkge1xuICAgIGZvciAoY29uc3QgcHJqZGlyIG9mIHByb2plY3RzKSB7XG4gICAgICBjb25zdCBtb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUocHJqZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IGZzLmxzdGF0U3luYyhtb2R1bGVEaXIpO1xuICAgICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgIGZzLnVubGlua1N5bmMobW9kdWxlRGlyKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG4gIH1cbiAgaWYgKGlzRHJjcERldk1vZGUpIHtcbiAgICAvLyBTaW5jZSBkcmNwIGl0c2VsZiBpcyBzeW1saW5rLCBpbiBjYXNlIHRoZXJlIGlzIG5vIGRyLnByb2plY3QubGlzdC5qc29uLCB3ZSBzdGlsbCBuZWVkIHRvIG1ha2Ugc3VyZS4uLlxuICAgIGNvbnN0IG1vZHVsZURpciA9IFBhdGguam9pbihQYXRoLmRpcm5hbWUoZnMucmVhbHBhdGhTeW5jKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSkpLFxuICAgICAgJ25vZGVfbW9kdWxlcycpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGZzLmxzdGF0U3luYyhtb2R1bGVEaXIpO1xuICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgZnMudW5saW5rU3luYyhtb2R1bGVEaXIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHt9XG4gIH1cbn1cblxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb2plY3RTeW1saW5rKCkge1xuICBjb25zdCBpc1dpbjMyID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbiAgY29uc3Qgbm9kZVBhdGggPSBmcy5yZWFscGF0aFN5bmMoUGF0aC5yZXNvbHZlKGdldFdvcmtEaXIoKSwgJ25vZGVfbW9kdWxlcycpKTtcbiAgY29uc3QgcHJvamVjdExpc3RGaWxlID0gUGF0aC5qb2luKGdldFdvcmtEaXIoKSwgJ2RyLnByb2plY3QubGlzdC5qc29uJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhwcm9qZWN0TGlzdEZpbGUpKVxuICAgIHJldHVybjtcbiAgZm9yIChjb25zdCBwcmpkaXIgb2YgcmVxdWlyZShwcm9qZWN0TGlzdEZpbGUpIGFzIHN0cmluZ1tdKSB7XG4gICAgY29uc3QgbW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHByamRpciwgJ25vZGVfbW9kdWxlcycpO1xuICAgIGxldCBuZWVkQ3JlYXRlU3ltbGluayA9IGZhbHNlO1xuICAgIGxldCBzdGF0cztcblxuICAgIHRyeSB7XG4gICAgICBzdGF0cyA9IGZzLmxzdGF0U3luYyhtb2R1bGVEaXIpO1xuICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkgfHwgc3RhdHMuaXNEaXJlY3RvcnkoKSB8fCBzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobW9kdWxlRGlyKSB8fCBmcy5yZWFscGF0aFN5bmMobW9kdWxlRGlyKSAhPT0gbm9kZVBhdGgpIHtcbiAgICAgICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgZnMudW5saW5rU3luYyhtb2R1bGVEaXIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhtb2R1bGVEaXIgKyAnLmJhaycpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IF9yZW1vdmVTeW5jOiB0eXBlb2YgcmVtb3ZlU3luYyA9IHJlcXVpcmUoJ2ZzLWV4dHJhJykucmVtb3ZlU3luYztcbiAgICAgICAgICAgICAgX3JlbW92ZVN5bmMobW9kdWxlRGlyICsgJy5iYWsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZzLnJlbmFtZVN5bmMobW9kdWxlRGlyLCBtb2R1bGVEaXIgKyAnLmJhaycpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYEJhY2t1cCBcIiR7bW9kdWxlRGlyfVwiIHRvIFwiJHttb2R1bGVEaXJ9LmJha1wiYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5lZWRDcmVhdGVTeW1saW5rID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlXG4gICAgICAgIG5lZWRDcmVhdGVTeW1saW5rID0gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBub2RlX21vZHVsZXMgZG9lcyBub3QgZXhpc3RzLCBmcy5sc3RhdFN5bmMoKSB0aHJvd3MgZXJyb3JcbiAgICAgIG5lZWRDcmVhdGVTeW1saW5rID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG5lZWRDcmVhdGVTeW1saW5rKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnQ3JlYXRlIHN5bWxpbmsgXCIlc1wiJywgUGF0aC5yZXNvbHZlKHByamRpciwgJ25vZGVfbW9kdWxlcycpKTtcbiAgICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUocHJqZGlyLCBmcy5yZWFscGF0aFN5bmMobm9kZVBhdGgpKSwgbW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==