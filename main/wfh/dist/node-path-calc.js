"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcNodePaths = void 0;
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
// TODO: Node path is no longer useful, remove it
function calcNodePaths(rootDir, symlinksDir, cwd, plinkDir) {
    const nodePaths = [path_1.default.resolve(rootDir, 'node_modules')];
    if (symlinksDir) {
        nodePaths.unshift(symlinksDir);
    }
    if (rootDir !== cwd) {
        nodePaths.unshift(path_1.default.resolve(cwd, 'node_modules'));
    }
    /**
     * Somehow when I install @wfh/plink in an new directory, npm does not dedupe dependencies from
     * @wfh/plink/node_modules directory up to current node_modules directory, results in MODULE_NOT_FOUND
     * from @wfh/plink/redux-toolkit-abservable for rxjs
     */
    nodePaths.push(plinkDir + path_1.default.sep + 'node_modules');
    if (process.env.NODE_PATH) {
        for (const path of process.env.NODE_PATH.split(path_1.default.delimiter)) {
            nodePaths.push(path);
        }
    }
    return lodash_1.default.uniq(nodePaths);
}
exports.calcNodePaths = calcNodePaths;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLWNhbGMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9ub2RlLXBhdGgtY2FsYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsb0RBQXVCO0FBRXZCLGlEQUFpRDtBQUNqRCxTQUFnQixhQUFhLENBQUMsT0FBZSxFQUFFLFdBQTBCLEVBQUUsR0FBVyxFQUFFLFFBQWdCO0lBQ3RHLE1BQU0sU0FBUyxHQUFhLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUNwRSxJQUFJLFdBQVcsRUFBRTtRQUNmLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDaEM7SUFDRCxJQUFJLE9BQU8sS0FBSyxHQUFHLEVBQUU7UUFDbkIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0tBQ3REO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLGNBQUksQ0FBQyxHQUFHLEdBQUcsY0FBYyxDQUFDLENBQUM7SUFDckQsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRTtRQUN6QixLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDOUQsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN0QjtLQUNGO0lBRUQsT0FBTyxnQkFBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMzQixDQUFDO0FBdEJELHNDQXNCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuLy8gVE9ETzogTm9kZSBwYXRoIGlzIG5vIGxvbmdlciB1c2VmdWwsIHJlbW92ZSBpdFxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNOb2RlUGF0aHMocm9vdERpcjogc3RyaW5nLCBzeW1saW5rc0Rpcjogc3RyaW5nIHwgbnVsbCwgY3dkOiBzdHJpbmcsIHBsaW5rRGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgbm9kZVBhdGhzOiBzdHJpbmdbXSA9IFtQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpXTtcbiAgaWYgKHN5bWxpbmtzRGlyKSB7XG4gICAgbm9kZVBhdGhzLnVuc2hpZnQoc3ltbGlua3NEaXIpO1xuICB9XG4gIGlmIChyb290RGlyICE9PSBjd2QpIHtcbiAgICBub2RlUGF0aHMudW5zaGlmdChQYXRoLnJlc29sdmUoY3dkLCAnbm9kZV9tb2R1bGVzJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNvbWVob3cgd2hlbiBJIGluc3RhbGwgQHdmaC9wbGluayBpbiBhbiBuZXcgZGlyZWN0b3J5LCBucG0gZG9lcyBub3QgZGVkdXBlIGRlcGVuZGVuY2llcyBmcm9tIFxuICAgKiBAd2ZoL3BsaW5rL25vZGVfbW9kdWxlcyBkaXJlY3RvcnkgdXAgdG8gY3VycmVudCBub2RlX21vZHVsZXMgZGlyZWN0b3J5LCByZXN1bHRzIGluIE1PRFVMRV9OT1RfRk9VTkRcbiAgICogZnJvbSBAd2ZoL3BsaW5rL3JlZHV4LXRvb2xraXQtYWJzZXJ2YWJsZSBmb3Igcnhqc1xuICAgKi9cbiAgbm9kZVBhdGhzLnB1c2gocGxpbmtEaXIgKyBQYXRoLnNlcCArICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfUEFUSCkge1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBwcm9jZXNzLmVudi5OT0RFX1BBVEguc3BsaXQoUGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgICBub2RlUGF0aHMucHVzaChwYXRoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gXy51bmlxKG5vZGVQYXRocyk7XG59XG4iXX0=