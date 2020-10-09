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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectSymlink = exports.removeProjectSymlink = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1kaXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wcm9qZWN0LWRpci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQW9CO0FBRXBCLDJDQUE2QjtBQUM3Qjs7O0dBR0c7QUFDSCxTQUFnQixvQkFBb0IsQ0FBQyxhQUFzQjtJQUN6RCxJQUFJLFFBQVEsQ0FBQztJQUNiLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFDekUsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQztRQUNoQyxRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3RDLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ25DLEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxFQUFFO1lBQzdCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3ZELElBQUk7Z0JBQ0YsTUFBTSxLQUFLLEdBQUcsWUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUU7b0JBQzFCLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQzFCO2FBQ0Y7WUFBQyxPQUFPLENBQUMsRUFBRSxHQUFFO1NBQ2Y7S0FDRjtJQUNELElBQUksYUFBYSxFQUFFO1FBQ2pCLHdHQUF3RztRQUN4RyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUNuRyxjQUFjLENBQUMsQ0FBQztRQUNsQixJQUFJO1lBQ0YsTUFBTSxLQUFLLEdBQUcsWUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN0QyxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDMUIsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUMxQjtTQUNGO1FBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRTtLQUNmO0FBQ0gsQ0FBQztBQTNCRCxvREEyQkM7QUFFRCwrQkFBK0I7QUFDL0IsU0FBZ0Isb0JBQW9CO0lBQ2xDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9ELE1BQU0sUUFBUSxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUM5RSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3pFLElBQUksQ0FBQyxZQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQztRQUNqQyxPQUFPO0lBQ1QsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFhLEVBQUU7UUFDekQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdkQsSUFBSSxpQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFDOUIsSUFBSSxLQUFLLENBQUM7UUFFVixJQUFJO1lBQ0YsS0FBSyxHQUFHLFlBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDaEMsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDbkUsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksWUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsS0FBSyxRQUFRLEVBQUU7b0JBQ3hFLElBQUksS0FBSyxDQUFDLGNBQWMsRUFBRSxFQUFFO3dCQUMxQixZQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO3FCQUMxQjt5QkFBTTt3QkFDTCxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxFQUFFOzRCQUNyQyxNQUFNLFdBQVcsR0FBc0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQzs0QkFDdEUsV0FBVyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQzt5QkFDakM7d0JBQ0QsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxHQUFHLE1BQU0sQ0FBQyxDQUFDO3dCQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsU0FBUyxTQUFTLFNBQVMsT0FBTyxDQUFDLENBQUM7cUJBQzVEO29CQUNELGlCQUFpQixHQUFHLElBQUksQ0FBQztpQkFDMUI7YUFDRjs7Z0JBQ0MsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1NBQzVCO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDViw0REFBNEQ7WUFDNUQsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1NBQzFCO1FBQ0QsSUFBSSxpQkFBaUIsRUFBRTtZQUNyQiw0RUFBNEU7WUFDNUUsWUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxZQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMzRztLQUNGO0FBQ0gsQ0FBQztBQXRDRCxvREFzQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtyZW1vdmVTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLyoqXG4gKiBPdGhlcndpc2UgYG5wbSBpbnN0YWxsYCB3aWxsIGdldCBhbiBtYXggc3RhY2sgb3ZlcmZsb3cgZXJyb3JcbiAqIEBwYXJhbSBpc0RyY3BEZXZNb2RlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlUHJvamVjdFN5bWxpbmsoaXNEcmNwRGV2TW9kZTogYm9vbGVhbikge1xuICBsZXQgcHJvamVjdHM7XG4gIGNvbnN0IHByb2plY3RMaXN0RmlsZSA9IFBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnZHIucHJvamVjdC5saXN0Lmpzb24nKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocHJvamVjdExpc3RGaWxlKSlcbiAgICBwcm9qZWN0cyA9IHJlcXVpcmUocHJvamVjdExpc3RGaWxlKTtcbiAgaWYgKHByb2plY3RzICYmIHByb2plY3RzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGNvbnN0IHByamRpciBvZiBwcm9qZWN0cykge1xuICAgICAgY29uc3QgbW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHByamRpciwgJ25vZGVfbW9kdWxlcycpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSBmcy5sc3RhdFN5bmMobW9kdWxlRGlyKTtcbiAgICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICBmcy51bmxpbmtTeW5jKG1vZHVsZURpcik7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICB9XG4gIGlmIChpc0RyY3BEZXZNb2RlKSB7XG4gICAgLy8gU2luY2UgZHJjcCBpdHNlbGYgaXMgc3ltbGluaywgaW4gY2FzZSB0aGVyZSBpcyBubyBkci5wcm9qZWN0Lmxpc3QuanNvbiwgd2Ugc3RpbGwgbmVlZCB0byBtYWtlIHN1cmUuLi5cbiAgICBjb25zdCBtb2R1bGVEaXIgPSBQYXRoLmpvaW4oUGF0aC5kaXJuYW1lKGZzLnJlYWxwYXRoU3luYyhyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpKSxcbiAgICAgICdub2RlX21vZHVsZXMnKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBmcy5sc3RhdFN5bmMobW9kdWxlRGlyKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIGZzLnVubGlua1N5bmMobW9kdWxlRGlyKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7fVxuICB9XG59XG5cbi8qIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGUgKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm9qZWN0U3ltbGluaygpIHtcbiAgY29uc3QgaXNXaW4zMiA9IHJlcXVpcmUoJ29zJykucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG4gIGNvbnN0IG5vZGVQYXRoID0gZnMucmVhbHBhdGhTeW5jKFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJykpO1xuICBjb25zdCBwcm9qZWN0TGlzdEZpbGUgPSBQYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJ2RyLnByb2plY3QubGlzdC5qc29uJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhwcm9qZWN0TGlzdEZpbGUpKVxuICAgIHJldHVybjtcbiAgZm9yIChjb25zdCBwcmpkaXIgb2YgcmVxdWlyZShwcm9qZWN0TGlzdEZpbGUpIGFzIHN0cmluZ1tdKSB7XG4gICAgY29uc3QgbW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHByamRpciwgJ25vZGVfbW9kdWxlcycpO1xuICAgIGxldCBuZWVkQ3JlYXRlU3ltbGluayA9IGZhbHNlO1xuICAgIGxldCBzdGF0cztcblxuICAgIHRyeSB7XG4gICAgICBzdGF0cyA9IGZzLmxzdGF0U3luYyhtb2R1bGVEaXIpO1xuICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkgfHwgc3RhdHMuaXNEaXJlY3RvcnkoKSB8fCBzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobW9kdWxlRGlyKSB8fCBmcy5yZWFscGF0aFN5bmMobW9kdWxlRGlyKSAhPT0gbm9kZVBhdGgpIHtcbiAgICAgICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgZnMudW5saW5rU3luYyhtb2R1bGVEaXIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhtb2R1bGVEaXIgKyAnLmJhaycpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IF9yZW1vdmVTeW5jOiB0eXBlb2YgcmVtb3ZlU3luYyA9IHJlcXVpcmUoJ2ZzLWV4dHJhJykucmVtb3ZlU3luYztcbiAgICAgICAgICAgICAgX3JlbW92ZVN5bmMobW9kdWxlRGlyICsgJy5iYWsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZzLnJlbmFtZVN5bmMobW9kdWxlRGlyLCBtb2R1bGVEaXIgKyAnLmJhaycpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYEJhY2t1cCBcIiR7bW9kdWxlRGlyfVwiIHRvIFwiJHttb2R1bGVEaXJ9LmJha1wiYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5lZWRDcmVhdGVTeW1saW5rID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlXG4gICAgICAgIG5lZWRDcmVhdGVTeW1saW5rID0gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBub2RlX21vZHVsZXMgZG9lcyBub3QgZXhpc3RzLCBmcy5sc3RhdFN5bmMoKSB0aHJvd3MgZXJyb3JcbiAgICAgIG5lZWRDcmVhdGVTeW1saW5rID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG5lZWRDcmVhdGVTeW1saW5rKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnQ3JlYXRlIHN5bWxpbmsgXCIlc1wiJywgUGF0aC5yZXNvbHZlKHByamRpciwgJ25vZGVfbW9kdWxlcycpKTtcbiAgICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUocHJqZGlyLCBmcy5yZWFscGF0aFN5bmMobm9kZVBhdGgpKSwgbW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==