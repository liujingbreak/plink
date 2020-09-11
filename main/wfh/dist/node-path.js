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
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
if (process.env.__plink == null) {
    require('source-map-support/register');
    const rootDir = findRootDir();
    const symlinkDir = Path.resolve(rootDir, 'node_modules');
    const isDrcpSymlink = fs.lstatSync(Path.resolve(rootDir, 'node_modules/dr-comp-package')).isSymbolicLink();
    const nodePath = setupNodePath(rootDir, symlinkDir, isDrcpSymlink);
    process.env.__plink = JSON.stringify({ isDrcpSymlink, rootDir, symlinkDir, nodePath });
}
function findRootDir() {
    let dir = process.cwd();
    while (!fs.existsSync(Path.resolve(dir, 'dist/plink-state.json'))) {
        const parentDir = Path.dirname(dir);
        if (parentDir === dir) {
            dir = process.cwd();
            break;
        }
        dir = parentDir;
    }
    return dir;
}
/**
 * if cwd is not root directory, then append NODE_PATH with <cwd>/node_modules:<rootDir>/symlinks,
 * otherwise append NODE_PATH with <rootDir>/node_modules
 * @param rootDir
 * @param isDrcpSymlink
 */
function setupNodePath(rootDir, symlinkDir, isDrcpSymlink) {
    let nodePaths;
    // const symlinkDir = Path.resolve(rootDir, 'dist', 'symlinks');
    if (rootDir !== process.cwd()) {
        nodePaths = new Set([
            Path.resolve(process.cwd(), 'node_modules'),
            symlinkDir,
            Path.resolve(rootDir, 'node_modules')
        ]);
    }
    else {
        nodePaths = new Set([
            symlinkDir,
            Path.resolve(rootDir, 'node_modules')
        ]);
    }
    if (isDrcpSymlink)
        nodePaths.add(fs.realpathSync(Path.resolve(rootDir, 'node_modules/dr-comp-package')) + Path.sep + 'node_modules');
    if (process.env.NODE_PATH) {
        for (const path of process.env.NODE_PATH.split(Path.delimiter)) {
            nodePaths.add(path);
        }
    }
    const pathArray = Array.from(nodePaths.values());
    process.env.NODE_PATH = pathArray.join(Path.delimiter);
    // tslint:disable-next-line: no-console
    console.log('[node-path] NODE_PATH', process.env.NODE_PATH);
    require('module').Module._initPaths();
    return pathArray;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFFekIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7SUFDL0IsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDdkMsTUFBTSxPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUM7SUFDOUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDekQsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDM0csTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDbkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBYSxDQUFDLENBQUM7Q0FDbEc7QUFFRCxTQUFTLFdBQVc7SUFDbEIsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLHVCQUF1QixDQUFDLENBQUMsRUFBRTtRQUNqRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUksU0FBUyxLQUFLLEdBQUcsRUFBRTtZQUNyQixHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLE1BQU07U0FDUDtRQUNELEdBQUcsR0FBRyxTQUFTLENBQUM7S0FDakI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILFNBQVMsYUFBYSxDQUFDLE9BQWUsRUFBRSxVQUFrQixFQUFFLGFBQXNCO0lBQ2hGLElBQUksU0FBc0IsQ0FBQztJQUMzQixnRUFBZ0U7SUFDaEUsSUFBSSxPQUFPLEtBQUssT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQzdCLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxjQUFjLENBQUM7WUFDM0MsVUFBVTtZQUNWLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQztTQUN0QyxDQUFDLENBQUM7S0FDSjtTQUFNO1FBQ0wsU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDO1lBQ2xCLFVBQVU7WUFDVixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUM7U0FDdEMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxJQUFJLGFBQWE7UUFDZixTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFRLEVBQUUsOEJBQThCLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsY0FBYyxDQUFDLENBQUM7SUFDckgsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRTtRQUN6QixLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDOUQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNyQjtLQUNGO0lBQ0QsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN2RCx1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzVELE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDdEMsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbmlmIChwcm9jZXNzLmVudi5fX3BsaW5rID09IG51bGwpIHtcbiAgcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJyk7XG4gIGNvbnN0IHJvb3REaXIgPSBmaW5kUm9vdERpcigpO1xuICBjb25zdCBzeW1saW5rRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgaXNEcmNwU3ltbGluayA9IGZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkuaXNTeW1ib2xpY0xpbmsoKTtcbiAgY29uc3Qgbm9kZVBhdGggPSBzZXR1cE5vZGVQYXRoKHJvb3REaXIsIHN5bWxpbmtEaXIsIGlzRHJjcFN5bWxpbmspO1xuICBwcm9jZXNzLmVudi5fX3BsaW5rID0gSlNPTi5zdHJpbmdpZnkoe2lzRHJjcFN5bWxpbmssIHJvb3REaXIsIHN5bWxpbmtEaXIsIG5vZGVQYXRofSBhcyBQbGlua0Vudik7XG59XG5cbmZ1bmN0aW9uIGZpbmRSb290RGlyKCkge1xuICBsZXQgZGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgd2hpbGUgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShkaXIsICdkaXN0L3BsaW5rLXN0YXRlLmpzb24nKSkpIHtcbiAgICBjb25zdCBwYXJlbnREaXIgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbiAgICBpZiAocGFyZW50RGlyID09PSBkaXIpIHtcbiAgICAgIGRpciA9IHByb2Nlc3MuY3dkKCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGlyID0gcGFyZW50RGlyO1xuICB9XG4gIHJldHVybiBkaXI7XG59XG5cbi8qKlxuICogaWYgY3dkIGlzIG5vdCByb290IGRpcmVjdG9yeSwgdGhlbiBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPGN3ZD4vbm9kZV9tb2R1bGVzOjxyb290RGlyPi9zeW1saW5rcyxcbiAqIG90aGVyd2lzZSBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPHJvb3REaXI+L25vZGVfbW9kdWxlc1xuICogQHBhcmFtIHJvb3REaXIgXG4gKiBAcGFyYW0gaXNEcmNwU3ltbGluayBcbiAqL1xuZnVuY3Rpb24gc2V0dXBOb2RlUGF0aChyb290RGlyOiBzdHJpbmcsIHN5bWxpbmtEaXI6IHN0cmluZywgaXNEcmNwU3ltbGluazogYm9vbGVhbikge1xuICBsZXQgbm9kZVBhdGhzOiBTZXQ8c3RyaW5nPjtcbiAgLy8gY29uc3Qgc3ltbGlua0RpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAnZGlzdCcsICdzeW1saW5rcycpO1xuICBpZiAocm9vdERpciAhPT0gcHJvY2Vzcy5jd2QoKSkge1xuICAgIG5vZGVQYXRocyA9IG5ldyBTZXQoW1xuICAgICAgUGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMnKSxcbiAgICAgIHN5bWxpbmtEaXIsXG4gICAgICBQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgXSk7XG4gIH0gZWxzZSB7XG4gICAgbm9kZVBhdGhzID0gbmV3IFNldChbXG4gICAgICBzeW1saW5rRGlyLFxuICAgICAgUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKVxuICAgIF0pO1xuICB9XG5cbiAgaWYgKGlzRHJjcFN5bWxpbmspXG4gICAgbm9kZVBhdGhzLmFkZChmcy5yZWFscGF0aFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIhLCAnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpKSArIFBhdGguc2VwICsgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9QQVRIKSB7XG4gICAgZm9yIChjb25zdCBwYXRoIG9mIHByb2Nlc3MuZW52Lk5PREVfUEFUSC5zcGxpdChQYXRoLmRlbGltaXRlcikpIHtcbiAgICAgIG5vZGVQYXRocy5hZGQocGF0aCk7XG4gICAgfVxuICB9XG4gIGNvbnN0IHBhdGhBcnJheSA9IEFycmF5LmZyb20obm9kZVBhdGhzLnZhbHVlcygpKTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gcGF0aEFycmF5LmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1tub2RlLXBhdGhdIE5PREVfUEFUSCcsIHByb2Nlc3MuZW52Lk5PREVfUEFUSCk7XG4gIHJlcXVpcmUoJ21vZHVsZScpLk1vZHVsZS5faW5pdFBhdGhzKCk7XG4gIHJldHVybiBwYXRoQXJyYXk7XG59XG5cbi8qKlxuICogR2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBwcmVkZWZpbmVkIGJ5XG5gYGBcbmNvbnN0IHtpc0RyY3BTeW1saW5rLCBzeW1saW5rRGlyLCByb290RGlyLCBub2RlUGF0aH0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbmBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsaW5rRW52IHtcbiAgaXNEcmNwU3ltbGluazogYm9vbGVhbjtcbiAgcm9vdERpcjogc3RyaW5nO1xuICBzeW1saW5rRGlyOiBzdHJpbmc7XG4gIG5vZGVQYXRoOiBzdHJpbmdbXTtcbn1cbiJdfQ==