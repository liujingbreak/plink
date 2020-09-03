"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupPackageJson = exports.findPackagesByNames = exports.completePackageName = exports.writeFile = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const package_mgr_1 = require("../package-mgr");
function writeFile(file, content) {
    fs_extra_1.default.writeFileSync(file, content);
    // tslint:disable-next-line: no-console
    console.log('%s is written', chalk_1.default.cyan(path_1.default.relative(process.cwd(), file)));
}
exports.writeFile = writeFile;
function* completePackageName(state, guessingNames) {
    for (const pkg of findPackagesByNames(state, guessingNames)) {
        if (pkg) {
            yield pkg.name;
        }
        else {
            yield null;
        }
    }
}
exports.completePackageName = completePackageName;
function* findPackagesByNames(state, guessingNames) {
    const config = require('../config');
    const prefixes = ['', ...config().packageScopes.map(scope => `@${scope}/`)];
    const available = state.srcPackages;
    for (const gn of guessingNames) {
        let found = false;
        for (const prefix of prefixes) {
            const name = prefix + gn;
            const pkg = available.get(name);
            if (pkg) {
                yield pkg;
                found = true;
                break;
            }
            else {
                const pkjsonFile = lookupPackageJson(gn);
                if (pkjsonFile) {
                    yield package_mgr_1.createPackageInfo(pkjsonFile, true);
                    found = true;
                    break;
                }
            }
        }
        if (!found) {
            yield null;
        }
    }
}
exports.findPackagesByNames = findPackagesByNames;
// export const findPackageJsonPath = _.memoize(_findPackageJsonPath);
// function _findPackageJsonPath(moduleName: string) {
//   let resolvedPath;
//   try {
//     resolvedPath = require.resolve(moduleName + '/package.json');
//     return resolvedPath;
//   } catch (er) {
//     return null;
//   }
// }
const nodePaths = process.env.NODE_PATH ? process.env.NODE_PATH.split(path_1.default.delimiter) : [];
/**
 * Look up package.json file in environment variable NODE_PATH
 * @param moduleName
 */
function lookupPackageJson(moduleName) {
    for (const p of nodePaths) {
        const test = path_1.default.resolve(p, moduleName, 'package.json');
        if (fs_extra_1.default.existsSync(test)) {
            return test;
        }
    }
    return null;
}
exports.lookupPackageJson = lookupPackageJson;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsZ0RBQWlEO0FBTWpELFNBQWdCLFNBQVMsQ0FBQyxJQUFZLEVBQUUsT0FBZTtJQUNyRCxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDaEMsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGVBQUssQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFKRCw4QkFJQztBQUVELFFBQWUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQW9CLEVBQUUsYUFBdUI7SUFDaEYsS0FBSyxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLEVBQUU7UUFDM0QsSUFBSSxHQUFHLEVBQUU7WUFDUCxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUM7U0FDaEI7YUFBTTtZQUNMLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUFSRCxrREFRQztBQUVELFFBQWUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQW9CLEVBQUUsYUFBdUI7SUFFaEYsTUFBTSxNQUFNLEdBQW1CLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUVwRCxNQUFNLFFBQVEsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM1RSxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDO0lBQ3BDLEtBQUssTUFBTSxFQUFFLElBQUksYUFBYSxFQUFFO1FBQzlCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNsQixLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRTtZQUM3QixNQUFNLElBQUksR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEMsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsTUFBTSxHQUFHLENBQUM7Z0JBQ1YsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDYixNQUFNO2FBQ1A7aUJBQU07Z0JBQ0wsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksVUFBVSxFQUFFO29CQUNkLE1BQU0sK0JBQWlCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUMxQyxLQUFLLEdBQUcsSUFBSSxDQUFDO29CQUNiLE1BQU07aUJBQ1A7YUFDRjtTQUNGO1FBRUQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUE3QkQsa0RBNkJDO0FBRUQsc0VBQXNFO0FBRXRFLHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFDdEIsVUFBVTtBQUNWLG9FQUFvRTtBQUNwRSwyQkFBMkI7QUFDM0IsbUJBQW1CO0FBQ25CLG1CQUFtQjtBQUNuQixNQUFNO0FBQ04sSUFBSTtBQUVKLE1BQU0sU0FBUyxHQUFhLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVUsQ0FBQyxLQUFLLENBQUMsY0FBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDdEc7OztHQUdHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsVUFBa0I7SUFDbEQsS0FBSyxNQUFNLENBQUMsSUFBSSxTQUFTLEVBQUU7UUFDekIsTUFBTSxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3pELElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkIsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBUkQsOENBUUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtjcmVhdGVQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHR5cGUge1BhY2thZ2VzU3RhdGUsIFBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCBfY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUZpbGUoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgZnMud3JpdGVGaWxlU3luYyhmaWxlLCBjb250ZW50KTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCclcyBpcyB3cml0dGVuJywgY2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogY29tcGxldGVQYWNrYWdlTmFtZShzdGF0ZTogUGFja2FnZXNTdGF0ZSwgZ3Vlc3NpbmdOYW1lczogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBwa2cgb2YgZmluZFBhY2thZ2VzQnlOYW1lcyhzdGF0ZSwgZ3Vlc3NpbmdOYW1lcykpIHtcbiAgICBpZiAocGtnKSB7XG4gICAgICB5aWVsZCBwa2cubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgeWllbGQgbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBmaW5kUGFja2FnZXNCeU5hbWVzKHN0YXRlOiBQYWNrYWdlc1N0YXRlLCBndWVzc2luZ05hbWVzOiBzdHJpbmdbXSk6XG4gIEdlbmVyYXRvcjxQYWNrYWdlSW5mbyB8IG51bGw+IHtcbiAgY29uc3QgY29uZmlnOiB0eXBlb2YgX2NvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG4gIGNvbnN0IHByZWZpeGVzID0gWycnLCAuLi5jb25maWcoKS5wYWNrYWdlU2NvcGVzLm1hcChzY29wZSA9PiBgQCR7c2NvcGV9L2ApXTtcbiAgY29uc3QgYXZhaWxhYmxlID0gc3RhdGUuc3JjUGFja2FnZXM7XG4gIGZvciAoY29uc3QgZ24gb2YgZ3Vlc3NpbmdOYW1lcykge1xuICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgcHJlZml4IG9mIHByZWZpeGVzKSB7XG4gICAgICBjb25zdCBuYW1lID0gcHJlZml4ICsgZ247XG4gICAgICBjb25zdCBwa2cgPSBhdmFpbGFibGUuZ2V0KG5hbWUpO1xuICAgICAgaWYgKHBrZykge1xuICAgICAgICB5aWVsZCBwa2c7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwa2pzb25GaWxlID0gbG9va3VwUGFja2FnZUpzb24oZ24pO1xuICAgICAgICBpZiAocGtqc29uRmlsZSkge1xuICAgICAgICAgIHlpZWxkIGNyZWF0ZVBhY2thZ2VJbmZvKHBranNvbkZpbGUsIHRydWUpO1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghZm91bmQpIHtcbiAgICAgIHlpZWxkIG51bGw7XG4gICAgfVxuICB9XG59XG5cbi8vIGV4cG9ydCBjb25zdCBmaW5kUGFja2FnZUpzb25QYXRoID0gXy5tZW1vaXplKF9maW5kUGFja2FnZUpzb25QYXRoKTtcblxuLy8gZnVuY3Rpb24gX2ZpbmRQYWNrYWdlSnNvblBhdGgobW9kdWxlTmFtZTogc3RyaW5nKSB7XG4vLyAgIGxldCByZXNvbHZlZFBhdGg7XG4vLyAgIHRyeSB7XG4vLyAgICAgcmVzb2x2ZWRQYXRoID0gcmVxdWlyZS5yZXNvbHZlKG1vZHVsZU5hbWUgKyAnL3BhY2thZ2UuanNvbicpO1xuLy8gICAgIHJldHVybiByZXNvbHZlZFBhdGg7XG4vLyAgIH0gY2F0Y2ggKGVyKSB7XG4vLyAgICAgcmV0dXJuIG51bGw7XG4vLyAgIH1cbi8vIH1cblxuY29uc3Qgbm9kZVBhdGhzOiBzdHJpbmdbXSA9IHByb2Nlc3MuZW52Lk5PREVfUEFUSCA/IHByb2Nlc3MuZW52Lk5PREVfUEFUSCEuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpIDogW107XG4vKipcbiAqIExvb2sgdXAgcGFja2FnZS5qc29uIGZpbGUgaW4gZW52aXJvbm1lbnQgdmFyaWFibGUgTk9ERV9QQVRIIFxuICogQHBhcmFtIG1vZHVsZU5hbWUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb29rdXBQYWNrYWdlSnNvbihtb2R1bGVOYW1lOiBzdHJpbmcpIHtcbiAgZm9yIChjb25zdCBwIG9mIG5vZGVQYXRocykge1xuICAgIGNvbnN0IHRlc3QgPSBQYXRoLnJlc29sdmUocCwgbW9kdWxlTmFtZSwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4gICAgICByZXR1cm4gdGVzdDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=