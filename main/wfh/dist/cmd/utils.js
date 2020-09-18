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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsZ0RBQWlEO0FBTWpELFNBQWdCLFNBQVMsQ0FBQyxJQUFZLEVBQUUsT0FBZTtJQUNyRCxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDaEMsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGVBQUssQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFKRCw4QkFJQztBQUVELFFBQWUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQW9CLEVBQUUsYUFBdUI7SUFDaEYsS0FBSyxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLEVBQUU7UUFDM0QsSUFBSSxHQUFHLEVBQUU7WUFDUCxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUM7U0FDaEI7YUFBTTtZQUNMLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUFSRCxrREFRQztBQUVELFFBQWUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQW9CLEVBQUUsYUFBdUI7SUFFaEYsTUFBTSxNQUFNLEdBQW1CLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUVwRCxNQUFNLFFBQVEsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM1RSxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDO0lBQ3BDLEtBQUssTUFBTSxFQUFFLElBQUksYUFBYSxFQUFFO1FBQzlCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNsQixLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRTtZQUM3QixNQUFNLElBQUksR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEMsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsTUFBTSxHQUFHLENBQUM7Z0JBQ1YsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDYixNQUFNO2FBQ1A7aUJBQU07Z0JBQ0wsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksVUFBVSxFQUFFO29CQUNkLE1BQU0sK0JBQWlCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUMxQyxLQUFLLEdBQUcsSUFBSSxDQUFDO29CQUNiLE1BQU07aUJBQ1A7YUFDRjtTQUNGO1FBRUQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUE3QkQsa0RBNkJDO0FBRUQsc0VBQXNFO0FBRXRFLHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFDdEIsVUFBVTtBQUNWLG9FQUFvRTtBQUNwRSwyQkFBMkI7QUFDM0IsbUJBQW1CO0FBQ25CLG1CQUFtQjtBQUNuQixNQUFNO0FBQ04sSUFBSTtBQUVKLE1BQU0sU0FBUyxHQUFhLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVUsQ0FBQyxLQUFLLENBQUMsY0FBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDdEc7OztHQUdHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsVUFBa0I7SUFDbEQsS0FBSyxNQUFNLENBQUMsSUFBSSxTQUFTLEVBQUU7UUFDekIsTUFBTSxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3pELElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkIsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBUkQsOENBUUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtjcmVhdGVQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtQYWNrYWdlc1N0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQgX2NvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVGaWxlKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG4gIGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgY29udGVudCk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnJXMgaXMgd3JpdHRlbicsIGNoYWxrLmN5YW4oUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24qIGNvbXBsZXRlUGFja2FnZU5hbWUoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIGd1ZXNzaW5nTmFtZXM6IHN0cmluZ1tdKSB7XG4gIGZvciAoY29uc3QgcGtnIG9mIGZpbmRQYWNrYWdlc0J5TmFtZXMoc3RhdGUsIGd1ZXNzaW5nTmFtZXMpKSB7XG4gICAgaWYgKHBrZykge1xuICAgICAgeWllbGQgcGtnLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHlpZWxkIG51bGw7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogZmluZFBhY2thZ2VzQnlOYW1lcyhzdGF0ZTogUGFja2FnZXNTdGF0ZSwgZ3Vlc3NpbmdOYW1lczogc3RyaW5nW10pOlxuICBHZW5lcmF0b3I8UGFja2FnZUluZm8gfCBudWxsPiB7XG4gIGNvbnN0IGNvbmZpZzogdHlwZW9mIF9jb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxuICBjb25zdCBwcmVmaXhlcyA9IFsnJywgLi4uY29uZmlnKCkucGFja2FnZVNjb3Blcy5tYXAoc2NvcGUgPT4gYEAke3Njb3BlfS9gKV07XG4gIGNvbnN0IGF2YWlsYWJsZSA9IHN0YXRlLnNyY1BhY2thZ2VzO1xuICBmb3IgKGNvbnN0IGduIG9mIGd1ZXNzaW5nTmFtZXMpIHtcbiAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHByZWZpeCBvZiBwcmVmaXhlcykge1xuICAgICAgY29uc3QgbmFtZSA9IHByZWZpeCArIGduO1xuICAgICAgY29uc3QgcGtnID0gYXZhaWxhYmxlLmdldChuYW1lKTtcbiAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgeWllbGQgcGtnO1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcGtqc29uRmlsZSA9IGxvb2t1cFBhY2thZ2VKc29uKGduKTtcbiAgICAgICAgaWYgKHBranNvbkZpbGUpIHtcbiAgICAgICAgICB5aWVsZCBjcmVhdGVQYWNrYWdlSW5mbyhwa2pzb25GaWxlLCB0cnVlKTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICB5aWVsZCBudWxsO1xuICAgIH1cbiAgfVxufVxuXG4vLyBleHBvcnQgY29uc3QgZmluZFBhY2thZ2VKc29uUGF0aCA9IF8ubWVtb2l6ZShfZmluZFBhY2thZ2VKc29uUGF0aCk7XG5cbi8vIGZ1bmN0aW9uIF9maW5kUGFja2FnZUpzb25QYXRoKG1vZHVsZU5hbWU6IHN0cmluZykge1xuLy8gICBsZXQgcmVzb2x2ZWRQYXRoO1xuLy8gICB0cnkge1xuLy8gICAgIHJlc29sdmVkUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShtb2R1bGVOYW1lICsgJy9wYWNrYWdlLmpzb24nKTtcbi8vICAgICByZXR1cm4gcmVzb2x2ZWRQYXRoO1xuLy8gICB9IGNhdGNoIChlcikge1xuLy8gICAgIHJldHVybiBudWxsO1xuLy8gICB9XG4vLyB9XG5cbmNvbnN0IG5vZGVQYXRoczogc3RyaW5nW10gPSBwcm9jZXNzLmVudi5OT0RFX1BBVEggPyBwcm9jZXNzLmVudi5OT0RFX1BBVEghLnNwbGl0KFBhdGguZGVsaW1pdGVyKSA6IFtdO1xuLyoqXG4gKiBMb29rIHVwIHBhY2thZ2UuanNvbiBmaWxlIGluIGVudmlyb25tZW50IHZhcmlhYmxlIE5PREVfUEFUSCBcbiAqIEBwYXJhbSBtb2R1bGVOYW1lIFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9va3VwUGFja2FnZUpzb24obW9kdWxlTmFtZTogc3RyaW5nKSB7XG4gIGZvciAoY29uc3QgcCBvZiBub2RlUGF0aHMpIHtcbiAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHAsIG1vZHVsZU5hbWUsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0KSkge1xuICAgICAgcmV0dXJuIHRlc3Q7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuIl19