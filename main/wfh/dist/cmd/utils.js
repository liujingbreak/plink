"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayOptionFn = exports.hlDesc = exports.hl = exports.lookupPackageJson = exports.findPackagesByNames = exports.completePackageName = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const package_mgr_1 = require("../package-mgr");
const misc_1 = require("../utils/misc");
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
    if (guessingNames === undefined) {
        guessingNames = state;
        state = (0, package_mgr_1.getState)();
    }
    const config = require('../config').default;
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
                    yield (0, package_mgr_1.createPackageInfo)(pkjsonFile, true);
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
/**
 * Look up package.json file in environment variable NODE_PATH
 * @param moduleName
 */
function lookupPackageJson(moduleName) {
    for (const p of [misc_1.plinkEnv.workDir, misc_1.plinkEnv.rootDir]) {
        const test = path_1.default.resolve(p, misc_1.plinkEnv.symlinkDirName, moduleName, 'package.json');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsZ0RBQXlGO0FBQ3pGLHdDQUF1QztBQU12QyxRQUFlLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUF1QyxFQUFFLGFBQWdDO0lBQzVHLEtBQUssTUFBTSxHQUFHLElBQUksbUJBQW1CLENBQUMsS0FBc0IsRUFBRSxhQUFpQyxDQUFDLEVBQUU7UUFDaEcsSUFBSSxHQUFHLEVBQUU7WUFDUCxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUM7U0FDaEI7YUFBTTtZQUNMLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUFSRCxrREFRQztBQU9ELFFBQWUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQXVDLEVBQUUsYUFBZ0M7SUFFNUcsSUFBSSxhQUFhLEtBQUssU0FBUyxFQUFFO1FBQy9CLGFBQWEsR0FBRyxLQUFpQixDQUFDO1FBQ2xDLEtBQUssR0FBRyxJQUFBLHNCQUFRLEdBQUUsQ0FBQztLQUNwQjtJQUNELE1BQU0sTUFBTSxHQUFtQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBRTVELE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVFLE1BQU0sU0FBUyxHQUFJLEtBQXVCLENBQUMsV0FBVyxDQUFDO0lBQ3ZELEtBQUssTUFBTSxFQUFFLElBQUksYUFBYSxFQUFFO1FBQzlCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNsQixLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRTtZQUM3QixNQUFNLElBQUksR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ3pCLElBQUksSUFBSSxLQUFLLFlBQVksSUFBSyxLQUF1QixDQUFDLFVBQVUsRUFBRTtnQkFDaEUsTUFBTyxLQUF1QixDQUFDLFVBQVUsQ0FBQztnQkFDMUMsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDYixNQUFNO2FBQ1A7WUFDRCxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hDLElBQUksR0FBRyxFQUFFO2dCQUNQLE1BQU0sR0FBRyxDQUFDO2dCQUNWLEtBQUssR0FBRyxJQUFJLENBQUM7Z0JBQ2IsTUFBTTthQUNQO2lCQUFNO2dCQUNMLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLFVBQVUsRUFBRTtvQkFDZCxNQUFNLElBQUEsK0JBQWlCLEVBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUMxQyxLQUFLLEdBQUcsSUFBSSxDQUFDO29CQUNiLE1BQU07aUJBQ1A7YUFDRjtTQUNGO1FBRUQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUF0Q0Qsa0RBc0NDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsVUFBa0I7SUFDbEQsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsZUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ3BELE1BQU0sSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLGVBQVEsQ0FBQyxjQUFjLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2xGLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkIsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBUkQsOENBUUM7QUFFRCxTQUFnQixFQUFFLENBQUMsSUFBWTtJQUM3QixPQUFPLGVBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUZELGdCQUVDO0FBRUQsU0FBZ0IsTUFBTSxDQUFDLElBQVk7SUFDakMsT0FBTyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFGRCx3QkFFQztBQUVELFNBQWdCLGFBQWEsQ0FBQyxJQUFZLEVBQUUsSUFBMEI7SUFDcEUsSUFBSSxJQUFJO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFKRCxzQ0FJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgX2NvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgY3JlYXRlUGFja2FnZUluZm8sIFBhY2thZ2VJbmZvLCBQYWNrYWdlc1N0YXRlLCBnZXRTdGF0ZSB9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGxldGVQYWNrYWdlTmFtZShndWVzc2luZ05hbWVzOiBJdGVyYWJsZTxzdHJpbmc+KTpcbiAgR2VuZXJhdG9yPHN0cmluZyB8IG51bGwsIHZvaWQsIHVua25vd24+O1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBsZXRlUGFja2FnZU5hbWUoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIGd1ZXNzaW5nTmFtZXM6IEl0ZXJhYmxlPHN0cmluZz4pOlxuICBHZW5lcmF0b3I8c3RyaW5nIHwgbnVsbCwgdm9pZCwgdW5rbm93bj47XG5leHBvcnQgZnVuY3Rpb24qIGNvbXBsZXRlUGFja2FnZU5hbWUoc3RhdGU6IFBhY2thZ2VzU3RhdGUgfCBJdGVyYWJsZTxzdHJpbmc+LCBndWVzc2luZ05hbWVzPzogSXRlcmFibGU8c3RyaW5nPikge1xuICBmb3IgKGNvbnN0IHBrZyBvZiBmaW5kUGFja2FnZXNCeU5hbWVzKHN0YXRlIGFzIFBhY2thZ2VzU3RhdGUsIGd1ZXNzaW5nTmFtZXMgYXMgSXRlcmFibGU8c3RyaW5nPikpIHtcbiAgICBpZiAocGtnKSB7XG4gICAgICB5aWVsZCBwa2cubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgeWllbGQgbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuLyoqIFVzZSBwYWNrYWdlLXV0aWxzLnRzI2xvb2tGb3JQYWNrYWdlcygpICovXG5leHBvcnQgZnVuY3Rpb24gZmluZFBhY2thZ2VzQnlOYW1lcyhndWVzc2luZ05hbWVzOiBJdGVyYWJsZTxzdHJpbmc+KTpcbiAgR2VuZXJhdG9yPFBhY2thZ2VJbmZvIHwgbnVsbCB8IHVuZGVmaW5lZD47XG5leHBvcnQgZnVuY3Rpb24gZmluZFBhY2thZ2VzQnlOYW1lcyhzdGF0ZTogUGFja2FnZXNTdGF0ZSwgZ3Vlc3NpbmdOYW1lczogSXRlcmFibGU8c3RyaW5nPik6XG4gIEdlbmVyYXRvcjxQYWNrYWdlSW5mbyB8IG51bGwgfCB1bmRlZmluZWQ+O1xuZXhwb3J0IGZ1bmN0aW9uKiBmaW5kUGFja2FnZXNCeU5hbWVzKHN0YXRlOiBQYWNrYWdlc1N0YXRlIHwgSXRlcmFibGU8c3RyaW5nPiwgZ3Vlc3NpbmdOYW1lcz86IEl0ZXJhYmxlPHN0cmluZz4pOlxuICBHZW5lcmF0b3I8UGFja2FnZUluZm8gfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gIGlmIChndWVzc2luZ05hbWVzID09PSB1bmRlZmluZWQpIHtcbiAgICBndWVzc2luZ05hbWVzID0gc3RhdGUgYXMgc3RyaW5nW107XG4gICAgc3RhdGUgPSBnZXRTdGF0ZSgpO1xuICB9XG4gIGNvbnN0IGNvbmZpZzogdHlwZW9mIF9jb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKS5kZWZhdWx0O1xuXG4gIGNvbnN0IHByZWZpeGVzID0gWycnLCAuLi5jb25maWcoKS5wYWNrYWdlU2NvcGVzLm1hcChzY29wZSA9PiBgQCR7c2NvcGV9L2ApXTtcbiAgY29uc3QgYXZhaWxhYmxlID0gKHN0YXRlIGFzIFBhY2thZ2VzU3RhdGUpLnNyY1BhY2thZ2VzO1xuICBmb3IgKGNvbnN0IGduIG9mIGd1ZXNzaW5nTmFtZXMpIHtcbiAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHByZWZpeCBvZiBwcmVmaXhlcykge1xuICAgICAgY29uc3QgbmFtZSA9IHByZWZpeCArIGduO1xuICAgICAgaWYgKG5hbWUgPT09ICdAd2ZoL3BsaW5rJyAmJiAoc3RhdGUgYXMgUGFja2FnZXNTdGF0ZSkubGlua2VkRHJjcCkge1xuICAgICAgICB5aWVsZCAoc3RhdGUgYXMgUGFja2FnZXNTdGF0ZSkubGlua2VkRHJjcDtcbiAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBrZyA9IGF2YWlsYWJsZS5nZXQobmFtZSk7XG4gICAgICBpZiAocGtnKSB7XG4gICAgICAgIHlpZWxkIHBrZztcbiAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHBranNvbkZpbGUgPSBsb29rdXBQYWNrYWdlSnNvbihnbik7XG4gICAgICAgIGlmIChwa2pzb25GaWxlKSB7XG4gICAgICAgICAgeWllbGQgY3JlYXRlUGFja2FnZUluZm8ocGtqc29uRmlsZSwgdHJ1ZSk7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgeWllbGQgbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBMb29rIHVwIHBhY2thZ2UuanNvbiBmaWxlIGluIGVudmlyb25tZW50IHZhcmlhYmxlIE5PREVfUEFUSCBcbiAqIEBwYXJhbSBtb2R1bGVOYW1lIFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9va3VwUGFja2FnZUpzb24obW9kdWxlTmFtZTogc3RyaW5nKSB7XG4gIGZvciAoY29uc3QgcCBvZiBbcGxpbmtFbnYud29ya0RpciwgcGxpbmtFbnYucm9vdERpcl0pIHtcbiAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHAsIHBsaW5rRW52LnN5bWxpbmtEaXJOYW1lLCBtb2R1bGVOYW1lLCAncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdCkpIHtcbiAgICAgIHJldHVybiB0ZXN0O1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhsKHRleHQ6IHN0cmluZykge1xuICByZXR1cm4gY2hhbGsuZ3JlZW4odGV4dCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBobERlc2ModGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBjaGFsay5ncmF5KHRleHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXJyYXlPcHRpb25GbihjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59XG4iXX0=