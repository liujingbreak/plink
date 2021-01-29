"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayOptionFn = exports.hlDesc = exports.hl = exports.lookupPackageJson = exports.findPackagesByNames = exports.completePackageName = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const package_mgr_1 = require("../package-mgr");
const chalk_1 = __importDefault(require("chalk"));
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
/** Use package-utils.ts#lookForPackages() */
function* findPackagesByNames(state, guessingNames) {
    const config = require('../config');
    const prefixes = ['', ...config().packageScopes.map(scope => `@${scope}/`)];
    const available = state.srcPackages;
    for (const gn of guessingNames) {
        let found = false;
        for (const prefix of prefixes) {
            const name = prefix + gn;
            if (name === '@wfh/plink' && state.linkedDrcp) {
                yield state.linkedDrcp;
                found = true;
                break;
            }
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
function hl(text) {
    return chalk_1.default.green(text);
}
exports.hl = hl;
function hlDesc(text) {
    return chalk_1.default.gray(text);
}
exports.hlDesc = hlDesc;
function arrayOptionFn(curr, prev) {
    if (prev)
        prev.push(curr);
    return prev;
}
exports.arrayOptionFn = arrayOptionFn;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUN4QixnREFBaUQ7QUFHakQsa0RBQTBCO0FBSTFCLFFBQWUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQW9CLEVBQUUsYUFBdUI7SUFDaEYsS0FBSyxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLEVBQUU7UUFDM0QsSUFBSSxHQUFHLEVBQUU7WUFDUCxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUM7U0FDaEI7YUFBTTtZQUNMLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUFSRCxrREFRQztBQUVELDZDQUE2QztBQUM3QyxRQUFlLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFvQixFQUFFLGFBQXVCO0lBRWhGLE1BQU0sTUFBTSxHQUFtQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFcEQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDNUUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztJQUNwQyxLQUFLLE1BQU0sRUFBRSxJQUFJLGFBQWEsRUFBRTtRQUM5QixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbEIsS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUU7WUFDN0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQztZQUN6QixJQUFJLElBQUksS0FBSyxZQUFZLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtnQkFDN0MsTUFBTSxLQUFLLENBQUMsVUFBVSxDQUFDO2dCQUN2QixLQUFLLEdBQUcsSUFBSSxDQUFDO2dCQUNiLE1BQU07YUFDUDtZQUNELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEMsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsTUFBTSxHQUFHLENBQUM7Z0JBQ1YsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDYixNQUFNO2FBQ1A7aUJBQU07Z0JBQ0wsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksVUFBVSxFQUFFO29CQUNkLE1BQU0sK0JBQWlCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUMxQyxLQUFLLEdBQUcsSUFBSSxDQUFDO29CQUNiLE1BQU07aUJBQ1A7YUFDRjtTQUNGO1FBRUQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUFsQ0Qsa0RBa0NDO0FBRUQsTUFBTSxTQUFTLEdBQWEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN0Rzs7O0dBR0c7QUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxVQUFrQjtJQUNsRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLFNBQVMsRUFBRTtRQUN6QixNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDekQsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN2QixPQUFPLElBQUksQ0FBQztTQUNiO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFSRCw4Q0FRQztBQUVELFNBQWdCLEVBQUUsQ0FBQyxJQUFZO0lBQzdCLE9BQU8sZUFBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzQixDQUFDO0FBRkQsZ0JBRUM7QUFFRCxTQUFnQixNQUFNLENBQUMsSUFBWTtJQUNqQyxPQUFPLGVBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUIsQ0FBQztBQUZELHdCQUVDO0FBRUQsU0FBZ0IsYUFBYSxDQUFDLElBQVksRUFBRSxJQUEwQjtJQUNwRSxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUpELHNDQUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtjcmVhdGVQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtQYWNrYWdlc1N0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuaW1wb3J0IF9jb25maWcgZnJvbSAnLi4vY29uZmlnJztcblxuZXhwb3J0IGZ1bmN0aW9uKiBjb21wbGV0ZVBhY2thZ2VOYW1lKHN0YXRlOiBQYWNrYWdlc1N0YXRlLCBndWVzc2luZ05hbWVzOiBzdHJpbmdbXSkge1xuICBmb3IgKGNvbnN0IHBrZyBvZiBmaW5kUGFja2FnZXNCeU5hbWVzKHN0YXRlLCBndWVzc2luZ05hbWVzKSkge1xuICAgIGlmIChwa2cpIHtcbiAgICAgIHlpZWxkIHBrZy5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICB5aWVsZCBudWxsO1xuICAgIH1cbiAgfVxufVxuXG4vKiogVXNlIHBhY2thZ2UtdXRpbHMudHMjbG9va0ZvclBhY2thZ2VzKCkgKi9cbmV4cG9ydCBmdW5jdGlvbiogZmluZFBhY2thZ2VzQnlOYW1lcyhzdGF0ZTogUGFja2FnZXNTdGF0ZSwgZ3Vlc3NpbmdOYW1lczogc3RyaW5nW10pOlxuICBHZW5lcmF0b3I8UGFja2FnZUluZm8gfCBudWxsPiB7XG4gIGNvbnN0IGNvbmZpZzogdHlwZW9mIF9jb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxuICBjb25zdCBwcmVmaXhlcyA9IFsnJywgLi4uY29uZmlnKCkucGFja2FnZVNjb3Blcy5tYXAoc2NvcGUgPT4gYEAke3Njb3BlfS9gKV07XG4gIGNvbnN0IGF2YWlsYWJsZSA9IHN0YXRlLnNyY1BhY2thZ2VzO1xuICBmb3IgKGNvbnN0IGduIG9mIGd1ZXNzaW5nTmFtZXMpIHtcbiAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHByZWZpeCBvZiBwcmVmaXhlcykge1xuICAgICAgY29uc3QgbmFtZSA9IHByZWZpeCArIGduO1xuICAgICAgaWYgKG5hbWUgPT09ICdAd2ZoL3BsaW5rJyAmJiBzdGF0ZS5saW5rZWREcmNwKSB7XG4gICAgICAgIHlpZWxkIHN0YXRlLmxpbmtlZERyY3A7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjb25zdCBwa2cgPSBhdmFpbGFibGUuZ2V0KG5hbWUpO1xuICAgICAgaWYgKHBrZykge1xuICAgICAgICB5aWVsZCBwa2c7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwa2pzb25GaWxlID0gbG9va3VwUGFja2FnZUpzb24oZ24pO1xuICAgICAgICBpZiAocGtqc29uRmlsZSkge1xuICAgICAgICAgIHlpZWxkIGNyZWF0ZVBhY2thZ2VJbmZvKHBranNvbkZpbGUsIHRydWUpO1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghZm91bmQpIHtcbiAgICAgIHlpZWxkIG51bGw7XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IG5vZGVQYXRoczogc3RyaW5nW10gPSBwcm9jZXNzLmVudi5OT0RFX1BBVEggPyBwcm9jZXNzLmVudi5OT0RFX1BBVEghLnNwbGl0KFBhdGguZGVsaW1pdGVyKSA6IFtdO1xuLyoqXG4gKiBMb29rIHVwIHBhY2thZ2UuanNvbiBmaWxlIGluIGVudmlyb25tZW50IHZhcmlhYmxlIE5PREVfUEFUSCBcbiAqIEBwYXJhbSBtb2R1bGVOYW1lIFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9va3VwUGFja2FnZUpzb24obW9kdWxlTmFtZTogc3RyaW5nKSB7XG4gIGZvciAoY29uc3QgcCBvZiBub2RlUGF0aHMpIHtcbiAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHAsIG1vZHVsZU5hbWUsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0KSkge1xuICAgICAgcmV0dXJuIHRlc3Q7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGwodGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBjaGFsay5ncmVlbih0ZXh0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhsRGVzYyh0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNoYWxrLmdyYXkodGV4dCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcnJheU9wdGlvbkZuKGN1cnI6IHN0cmluZywgcHJldjogc3RyaW5nW10gfCB1bmRlZmluZWQpIHtcbiAgaWYgKHByZXYpXG4gICAgcHJldi5wdXNoKGN1cnIpO1xuICByZXR1cm4gcHJldjtcbn1cbiJdfQ==