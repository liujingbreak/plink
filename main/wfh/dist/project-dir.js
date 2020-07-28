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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1kaXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wcm9qZWN0LWRpci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQW9CO0FBRXBCLDJDQUE2QjtBQUM3Qjs7O0dBR0c7QUFDSCxTQUFnQixvQkFBb0IsQ0FBQyxhQUFzQjtJQUN6RCxJQUFJLFFBQVEsQ0FBQztJQUNiLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFDekUsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQztRQUNoQyxRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3RDLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ25DLEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxFQUFFO1lBQzdCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3ZELElBQUk7Z0JBQ0YsTUFBTSxLQUFLLEdBQUcsWUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUU7b0JBQzFCLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQzFCO2FBQ0Y7WUFBQyxPQUFPLENBQUMsRUFBRSxHQUFFO1NBQ2Y7S0FDRjtJQUNELElBQUksYUFBYSxFQUFFO1FBQ2pCLHdHQUF3RztRQUN4RyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUN4RyxjQUFj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O1xuaW1wb3J0IHtyZW1vdmVTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLyoqXG4gKiBPdGhlcndpc2UgYG5wbSBpbnN0YWxsYCB3aWxsIGdldCBhbiBtYXggc3RhY2sgb3ZlcmZsb3cgZXJyb3JcbiAqIEBwYXJhbSBpc0RyY3BEZXZNb2RlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlUHJvamVjdFN5bWxpbmsoaXNEcmNwRGV2TW9kZTogYm9vbGVhbikge1xuICBsZXQgcHJvamVjdHM7XG4gIGNvbnN0IHByb2plY3RMaXN0RmlsZSA9IFBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnZHIucHJvamVjdC5saXN0Lmpzb24nKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocHJvamVjdExpc3RGaWxlKSlcbiAgICBwcm9qZWN0cyA9IHJlcXVpcmUocHJvamVjdExpc3RGaWxlKTtcbiAgaWYgKHByb2plY3RzICYmIHByb2plY3RzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGNvbnN0IHByamRpciBvZiBwcm9qZWN0cykge1xuICAgICAgY29uc3QgbW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHByamRpciwgJ25vZGVfbW9kdWxlcycpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSBmcy5sc3RhdFN5bmMobW9kdWxlRGlyKTtcbiAgICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICBmcy51bmxpbmtTeW5jKG1vZHVsZURpcik7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICB9XG4gIGlmIChpc0RyY3BEZXZNb2RlKSB7XG4gICAgLy8gU2luY2UgZHJjcCBpdHNlbGYgaXMgc3ltbGluaywgaW4gY2FzZSB0aGVyZSBpcyBubyBkci5wcm9qZWN0Lmxpc3QuanNvbiwgd2Ugc3RpbGwgbmVlZCB0byBtYWtlIHN1cmUuLi5cbiAgICBjb25zdCBtb2R1bGVEaXIgPSBQYXRoLmpvaW4oUGF0aC5kaXJuYW1lKGZzLnJlYWxwYXRoU3luYyhyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSkpLFxuICAgICAgJ25vZGVfbW9kdWxlcycpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGZzLmxzdGF0U3luYyhtb2R1bGVEaXIpO1xuICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgZnMudW5saW5rU3luYyhtb2R1bGVEaXIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHt9XG4gIH1cbn1cblxuLyogdHNsaW50OmRpc2FibGU6bm8tY29uc29sZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb2plY3RTeW1saW5rKCkge1xuICBjb25zdCBpc1dpbjMyID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbiAgY29uc3Qgbm9kZVBhdGggPSBmcy5yZWFscGF0aFN5bmMoUGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMnKSk7XG4gIGNvbnN0IHByb2plY3RMaXN0RmlsZSA9IFBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnZHIucHJvamVjdC5saXN0Lmpzb24nKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKHByb2plY3RMaXN0RmlsZSkpXG4gICAgcmV0dXJuO1xuICBmb3IgKGNvbnN0IHByamRpciBvZiByZXF1aXJlKHByb2plY3RMaXN0RmlsZSkgYXMgc3RyaW5nW10pIHtcbiAgICBjb25zdCBtb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUocHJqZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgbGV0IG5lZWRDcmVhdGVTeW1saW5rID0gZmFsc2U7XG4gICAgbGV0IHN0YXRzO1xuXG4gICAgdHJ5IHtcbiAgICAgIHN0YXRzID0gZnMubHN0YXRTeW5jKG1vZHVsZURpcik7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSB8fCBzdGF0cy5pc0RpcmVjdG9yeSgpIHx8IHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhtb2R1bGVEaXIpIHx8IGZzLnJlYWxwYXRoU3luYyhtb2R1bGVEaXIpICE9PSBub2RlUGF0aCkge1xuICAgICAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICBmcy51bmxpbmtTeW5jKG1vZHVsZURpcik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKG1vZHVsZURpciArICcuYmFrJykpIHtcbiAgICAgICAgICAgICAgY29uc3QgX3JlbW92ZVN5bmM6IHR5cGVvZiByZW1vdmVTeW5jID0gcmVxdWlyZSgnZnMtZXh0cmEnKS5yZW1vdmVTeW5jO1xuICAgICAgICAgICAgICBfcmVtb3ZlU3luYyhtb2R1bGVEaXIgKyAnLmJhaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnMucmVuYW1lU3luYyhtb2R1bGVEaXIsIG1vZHVsZURpciArICcuYmFrJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgQmFja3VwIFwiJHttb2R1bGVEaXJ9XCIgdG8gXCIke21vZHVsZURpcn0uYmFrXCJgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmVlZENyZWF0ZVN5bWxpbmsgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2VcbiAgICAgICAgbmVlZENyZWF0ZVN5bWxpbmsgPSB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIG5vZGVfbW9kdWxlcyBkb2VzIG5vdCBleGlzdHMsIGZzLmxzdGF0U3luYygpIHRocm93cyBlcnJvclxuICAgICAgbmVlZENyZWF0ZVN5bWxpbmsgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAobmVlZENyZWF0ZVN5bWxpbmspIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdDcmVhdGUgc3ltbGluayBcIiVzXCInLCBQYXRoLnJlc29sdmUocHJqZGlyLCAnbm9kZV9tb2R1bGVzJykpO1xuICAgICAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShwcmpkaXIsIGZzLnJlYWxwYXRoU3luYyhub2RlUGF0aCkpLCBtb2R1bGVEaXIsIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgIH1cbiAgfVxufVxuIl19