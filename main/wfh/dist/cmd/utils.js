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
        state = package_mgr_1.getState();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsZ0RBQXlGO0FBTXpGLFFBQWUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQXVDLEVBQUUsYUFBZ0M7SUFDNUcsS0FBSyxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxLQUFzQixFQUFFLGFBQWlDLENBQUMsRUFBRTtRQUNoRyxJQUFJLEdBQUcsRUFBRTtZQUNQLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQztTQUNoQjthQUFNO1lBQ0wsTUFBTSxJQUFJLENBQUM7U0FDWjtLQUNGO0FBQ0gsQ0FBQztBQVJELGtEQVFDO0FBT0QsUUFBZSxDQUFDLENBQUMsbUJBQW1CLENBQUMsS0FBdUMsRUFBRSxhQUFnQztJQUU1RyxJQUFJLGFBQWEsS0FBSyxTQUFTLEVBQUU7UUFDL0IsYUFBYSxHQUFHLEtBQWlCLENBQUM7UUFDbEMsS0FBSyxHQUFHLHNCQUFRLEVBQUUsQ0FBQztLQUNwQjtJQUNELE1BQU0sTUFBTSxHQUFtQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBRTVELE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVFLE1BQU0sU0FBUyxHQUFJLEtBQXVCLENBQUMsV0FBVyxDQUFDO0lBQ3ZELEtBQUssTUFBTSxFQUFFLElBQUksYUFBYSxFQUFFO1FBQzlCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNsQixLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRTtZQUM3QixNQUFNLElBQUksR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ3pCLElBQUksSUFBSSxLQUFLLFlBQVksSUFBSyxLQUF1QixDQUFDLFVBQVUsRUFBRTtnQkFDaEUsTUFBTyxLQUF1QixDQUFDLFVBQVUsQ0FBQztnQkFDMUMsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDYixNQUFNO2FBQ1A7WUFDRCxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hDLElBQUksR0FBRyxFQUFFO2dCQUNQLE1BQU0sR0FBRyxDQUFDO2dCQUNWLEtBQUssR0FBRyxJQUFJLENBQUM7Z0JBQ2IsTUFBTTthQUNQO2lCQUFNO2dCQUNMLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLFVBQVUsRUFBRTtvQkFDZCxNQUFNLCtCQUFpQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDMUMsS0FBSyxHQUFHLElBQUksQ0FBQztvQkFDYixNQUFNO2lCQUNQO2FBQ0Y7U0FDRjtRQUVELElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDVixNQUFNLElBQUksQ0FBQztTQUNaO0tBQ0Y7QUFDSCxDQUFDO0FBdENELGtEQXNDQztBQUVELE1BQU0sU0FBUyxHQUFhLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVUsQ0FBQyxLQUFLLENBQUMsY0FBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDdEc7OztHQUdHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsVUFBa0I7SUFDbEQsS0FBSyxNQUFNLENBQUMsSUFBSSxTQUFTLEVBQUU7UUFDekIsTUFBTSxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3pELElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkIsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBUkQsOENBUUM7QUFFRCxTQUFnQixFQUFFLENBQUMsSUFBWTtJQUM3QixPQUFPLGVBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUZELGdCQUVDO0FBRUQsU0FBZ0IsTUFBTSxDQUFDLElBQVk7SUFDakMsT0FBTyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFGRCx3QkFFQztBQUVELFNBQWdCLGFBQWEsQ0FBQyxJQUFZLEVBQUUsSUFBMEI7SUFDcEUsSUFBSSxJQUFJO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFKRCxzQ0FJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgX2NvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgY3JlYXRlUGFja2FnZUluZm8sIFBhY2thZ2VJbmZvLCBQYWNrYWdlc1N0YXRlLCBnZXRTdGF0ZSB9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBsZXRlUGFja2FnZU5hbWUoZ3Vlc3NpbmdOYW1lczogSXRlcmFibGU8c3RyaW5nPik6XG4gIEdlbmVyYXRvcjxzdHJpbmcgfCBudWxsLCB2b2lkLCB1bmtub3duPjtcbmV4cG9ydCBmdW5jdGlvbiBjb21wbGV0ZVBhY2thZ2VOYW1lKHN0YXRlOiBQYWNrYWdlc1N0YXRlLCBndWVzc2luZ05hbWVzOiBJdGVyYWJsZTxzdHJpbmc+KTpcbiAgR2VuZXJhdG9yPHN0cmluZyB8IG51bGwsIHZvaWQsIHVua25vd24+O1xuZXhwb3J0IGZ1bmN0aW9uKiBjb21wbGV0ZVBhY2thZ2VOYW1lKHN0YXRlOiBQYWNrYWdlc1N0YXRlIHwgSXRlcmFibGU8c3RyaW5nPiwgZ3Vlc3NpbmdOYW1lcz86IEl0ZXJhYmxlPHN0cmluZz4pIHtcbiAgZm9yIChjb25zdCBwa2cgb2YgZmluZFBhY2thZ2VzQnlOYW1lcyhzdGF0ZSBhcyBQYWNrYWdlc1N0YXRlLCBndWVzc2luZ05hbWVzIGFzIEl0ZXJhYmxlPHN0cmluZz4pKSB7XG4gICAgaWYgKHBrZykge1xuICAgICAgeWllbGQgcGtnLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHlpZWxkIG51bGw7XG4gICAgfVxuICB9XG59XG5cbi8qKiBVc2UgcGFja2FnZS11dGlscy50cyNsb29rRm9yUGFja2FnZXMoKSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRQYWNrYWdlc0J5TmFtZXMoZ3Vlc3NpbmdOYW1lczogSXRlcmFibGU8c3RyaW5nPik6XG4gIEdlbmVyYXRvcjxQYWNrYWdlSW5mbyB8IG51bGwgfCB1bmRlZmluZWQ+O1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRQYWNrYWdlc0J5TmFtZXMoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIGd1ZXNzaW5nTmFtZXM6IEl0ZXJhYmxlPHN0cmluZz4pOlxuICBHZW5lcmF0b3I8UGFja2FnZUluZm8gfCBudWxsIHwgdW5kZWZpbmVkPjtcbmV4cG9ydCBmdW5jdGlvbiogZmluZFBhY2thZ2VzQnlOYW1lcyhzdGF0ZTogUGFja2FnZXNTdGF0ZSB8IEl0ZXJhYmxlPHN0cmluZz4sIGd1ZXNzaW5nTmFtZXM/OiBJdGVyYWJsZTxzdHJpbmc+KTpcbiAgR2VuZXJhdG9yPFBhY2thZ2VJbmZvIHwgbnVsbCB8IHVuZGVmaW5lZD4ge1xuICBpZiAoZ3Vlc3NpbmdOYW1lcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZ3Vlc3NpbmdOYW1lcyA9IHN0YXRlIGFzIHN0cmluZ1tdO1xuICAgIHN0YXRlID0gZ2V0U3RhdGUoKTtcbiAgfVxuICBjb25zdCBjb25maWc6IHR5cGVvZiBfY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJykuZGVmYXVsdDtcblxuICBjb25zdCBwcmVmaXhlcyA9IFsnJywgLi4uY29uZmlnKCkucGFja2FnZVNjb3Blcy5tYXAoc2NvcGUgPT4gYEAke3Njb3BlfS9gKV07XG4gIGNvbnN0IGF2YWlsYWJsZSA9IChzdGF0ZSBhcyBQYWNrYWdlc1N0YXRlKS5zcmNQYWNrYWdlcztcbiAgZm9yIChjb25zdCBnbiBvZiBndWVzc2luZ05hbWVzKSB7XG4gICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBwcmVmaXggb2YgcHJlZml4ZXMpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBwcmVmaXggKyBnbjtcbiAgICAgIGlmIChuYW1lID09PSAnQHdmaC9wbGluaycgJiYgKHN0YXRlIGFzIFBhY2thZ2VzU3RhdGUpLmxpbmtlZERyY3ApIHtcbiAgICAgICAgeWllbGQgKHN0YXRlIGFzIFBhY2thZ2VzU3RhdGUpLmxpbmtlZERyY3A7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjb25zdCBwa2cgPSBhdmFpbGFibGUuZ2V0KG5hbWUpO1xuICAgICAgaWYgKHBrZykge1xuICAgICAgICB5aWVsZCBwa2c7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwa2pzb25GaWxlID0gbG9va3VwUGFja2FnZUpzb24oZ24pO1xuICAgICAgICBpZiAocGtqc29uRmlsZSkge1xuICAgICAgICAgIHlpZWxkIGNyZWF0ZVBhY2thZ2VJbmZvKHBranNvbkZpbGUsIHRydWUpO1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghZm91bmQpIHtcbiAgICAgIHlpZWxkIG51bGw7XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IG5vZGVQYXRoczogc3RyaW5nW10gPSBwcm9jZXNzLmVudi5OT0RFX1BBVEggPyBwcm9jZXNzLmVudi5OT0RFX1BBVEghLnNwbGl0KFBhdGguZGVsaW1pdGVyKSA6IFtdO1xuLyoqXG4gKiBMb29rIHVwIHBhY2thZ2UuanNvbiBmaWxlIGluIGVudmlyb25tZW50IHZhcmlhYmxlIE5PREVfUEFUSCBcbiAqIEBwYXJhbSBtb2R1bGVOYW1lIFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9va3VwUGFja2FnZUpzb24obW9kdWxlTmFtZTogc3RyaW5nKSB7XG4gIGZvciAoY29uc3QgcCBvZiBub2RlUGF0aHMpIHtcbiAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHAsIG1vZHVsZU5hbWUsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0KSkge1xuICAgICAgcmV0dXJuIHRlc3Q7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGwodGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBjaGFsay5ncmVlbih0ZXh0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhsRGVzYyh0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNoYWxrLmdyYXkodGV4dCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcnJheU9wdGlvbkZuKGN1cnI6IHN0cmluZywgcHJldjogc3RyaW5nW10gfCB1bmRlZmluZWQpIHtcbiAgaWYgKHByZXYpXG4gICAgcHJldi5wdXNoKGN1cnIpO1xuICByZXR1cm4gcHJldjtcbn1cbiJdfQ==