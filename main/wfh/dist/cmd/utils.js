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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsZ0RBQXlGO0FBTXpGLFFBQWUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQXVDLEVBQUUsYUFBZ0M7SUFDNUcsS0FBSyxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxLQUFzQixFQUFFLGFBQWlDLENBQUMsRUFBRTtRQUNoRyxJQUFJLEdBQUcsRUFBRTtZQUNQLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQztTQUNoQjthQUFNO1lBQ0wsTUFBTSxJQUFJLENBQUM7U0FDWjtLQUNGO0FBQ0gsQ0FBQztBQVJELGtEQVFDO0FBT0QsUUFBZSxDQUFDLENBQUMsbUJBQW1CLENBQUMsS0FBdUMsRUFBRSxhQUFnQztJQUU1RyxJQUFJLGFBQWEsS0FBSyxTQUFTLEVBQUU7UUFDL0IsYUFBYSxHQUFHLEtBQWlCLENBQUM7UUFDbEMsS0FBSyxHQUFHLElBQUEsc0JBQVEsR0FBRSxDQUFDO0tBQ3BCO0lBQ0QsTUFBTSxNQUFNLEdBQW1CLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFFNUQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDNUUsTUFBTSxTQUFTLEdBQUksS0FBdUIsQ0FBQyxXQUFXLENBQUM7SUFDdkQsS0FBSyxNQUFNLEVBQUUsSUFBSSxhQUFhLEVBQUU7UUFDOUIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ2xCLEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxFQUFFO1lBQzdCLE1BQU0sSUFBSSxHQUFHLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDekIsSUFBSSxJQUFJLEtBQUssWUFBWSxJQUFLLEtBQXVCLENBQUMsVUFBVSxFQUFFO2dCQUNoRSxNQUFPLEtBQXVCLENBQUMsVUFBVSxDQUFDO2dCQUMxQyxLQUFLLEdBQUcsSUFBSSxDQUFDO2dCQUNiLE1BQU07YUFDUDtZQUNELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEMsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsTUFBTSxHQUFHLENBQUM7Z0JBQ1YsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDYixNQUFNO2FBQ1A7aUJBQU07Z0JBQ0wsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksVUFBVSxFQUFFO29CQUNkLE1BQU0sSUFBQSwrQkFBaUIsRUFBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQzFDLEtBQUssR0FBRyxJQUFJLENBQUM7b0JBQ2IsTUFBTTtpQkFDUDthQUNGO1NBQ0Y7UUFFRCxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1YsTUFBTSxJQUFJLENBQUM7U0FDWjtLQUNGO0FBQ0gsQ0FBQztBQXRDRCxrREFzQ0M7QUFFRCxNQUFNLFNBQVMsR0FBYSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFVLENBQUMsS0FBSyxDQUFDLGNBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3RHOzs7R0FHRztBQUNILFNBQWdCLGlCQUFpQixDQUFDLFVBQWtCO0lBQ2xELEtBQUssTUFBTSxDQUFDLElBQUksU0FBUyxFQUFFO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN6RCxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7S0FDRjtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQVJELDhDQVFDO0FBRUQsU0FBZ0IsRUFBRSxDQUFDLElBQVk7SUFDN0IsT0FBTyxlQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUFGRCxnQkFFQztBQUVELFNBQWdCLE1BQU0sQ0FBQyxJQUFZO0lBQ2pDLE9BQU8sZUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixDQUFDO0FBRkQsd0JBRUM7QUFFRCxTQUFnQixhQUFhLENBQUMsSUFBWSxFQUFFLElBQTBCO0lBQ3BFLElBQUksSUFBSTtRQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBSkQsc0NBSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF9jb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7IGNyZWF0ZVBhY2thZ2VJbmZvLCBQYWNrYWdlSW5mbywgUGFja2FnZXNTdGF0ZSwgZ2V0U3RhdGUgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wbGV0ZVBhY2thZ2VOYW1lKGd1ZXNzaW5nTmFtZXM6IEl0ZXJhYmxlPHN0cmluZz4pOlxuICBHZW5lcmF0b3I8c3RyaW5nIHwgbnVsbCwgdm9pZCwgdW5rbm93bj47XG5leHBvcnQgZnVuY3Rpb24gY29tcGxldGVQYWNrYWdlTmFtZShzdGF0ZTogUGFja2FnZXNTdGF0ZSwgZ3Vlc3NpbmdOYW1lczogSXRlcmFibGU8c3RyaW5nPik6XG4gIEdlbmVyYXRvcjxzdHJpbmcgfCBudWxsLCB2b2lkLCB1bmtub3duPjtcbmV4cG9ydCBmdW5jdGlvbiogY29tcGxldGVQYWNrYWdlTmFtZShzdGF0ZTogUGFja2FnZXNTdGF0ZSB8IEl0ZXJhYmxlPHN0cmluZz4sIGd1ZXNzaW5nTmFtZXM/OiBJdGVyYWJsZTxzdHJpbmc+KSB7XG4gIGZvciAoY29uc3QgcGtnIG9mIGZpbmRQYWNrYWdlc0J5TmFtZXMoc3RhdGUgYXMgUGFja2FnZXNTdGF0ZSwgZ3Vlc3NpbmdOYW1lcyBhcyBJdGVyYWJsZTxzdHJpbmc+KSkge1xuICAgIGlmIChwa2cpIHtcbiAgICAgIHlpZWxkIHBrZy5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICB5aWVsZCBudWxsO1xuICAgIH1cbiAgfVxufVxuXG4vKiogVXNlIHBhY2thZ2UtdXRpbHMudHMjbG9va0ZvclBhY2thZ2VzKCkgKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUGFja2FnZXNCeU5hbWVzKGd1ZXNzaW5nTmFtZXM6IEl0ZXJhYmxlPHN0cmluZz4pOlxuICBHZW5lcmF0b3I8UGFja2FnZUluZm8gfCBudWxsIHwgdW5kZWZpbmVkPjtcbmV4cG9ydCBmdW5jdGlvbiBmaW5kUGFja2FnZXNCeU5hbWVzKHN0YXRlOiBQYWNrYWdlc1N0YXRlLCBndWVzc2luZ05hbWVzOiBJdGVyYWJsZTxzdHJpbmc+KTpcbiAgR2VuZXJhdG9yPFBhY2thZ2VJbmZvIHwgbnVsbCB8IHVuZGVmaW5lZD47XG5leHBvcnQgZnVuY3Rpb24qIGZpbmRQYWNrYWdlc0J5TmFtZXMoc3RhdGU6IFBhY2thZ2VzU3RhdGUgfCBJdGVyYWJsZTxzdHJpbmc+LCBndWVzc2luZ05hbWVzPzogSXRlcmFibGU8c3RyaW5nPik6XG4gIEdlbmVyYXRvcjxQYWNrYWdlSW5mbyB8IG51bGwgfCB1bmRlZmluZWQ+IHtcbiAgaWYgKGd1ZXNzaW5nTmFtZXMgPT09IHVuZGVmaW5lZCkge1xuICAgIGd1ZXNzaW5nTmFtZXMgPSBzdGF0ZSBhcyBzdHJpbmdbXTtcbiAgICBzdGF0ZSA9IGdldFN0YXRlKCk7XG4gIH1cbiAgY29uc3QgY29uZmlnOiB0eXBlb2YgX2NvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpLmRlZmF1bHQ7XG5cbiAgY29uc3QgcHJlZml4ZXMgPSBbJycsIC4uLmNvbmZpZygpLnBhY2thZ2VTY29wZXMubWFwKHNjb3BlID0+IGBAJHtzY29wZX0vYCldO1xuICBjb25zdCBhdmFpbGFibGUgPSAoc3RhdGUgYXMgUGFja2FnZXNTdGF0ZSkuc3JjUGFja2FnZXM7XG4gIGZvciAoY29uc3QgZ24gb2YgZ3Vlc3NpbmdOYW1lcykge1xuICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgcHJlZml4IG9mIHByZWZpeGVzKSB7XG4gICAgICBjb25zdCBuYW1lID0gcHJlZml4ICsgZ247XG4gICAgICBpZiAobmFtZSA9PT0gJ0B3ZmgvcGxpbmsnICYmIChzdGF0ZSBhcyBQYWNrYWdlc1N0YXRlKS5saW5rZWREcmNwKSB7XG4gICAgICAgIHlpZWxkIChzdGF0ZSBhcyBQYWNrYWdlc1N0YXRlKS5saW5rZWREcmNwO1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY29uc3QgcGtnID0gYXZhaWxhYmxlLmdldChuYW1lKTtcbiAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgeWllbGQgcGtnO1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcGtqc29uRmlsZSA9IGxvb2t1cFBhY2thZ2VKc29uKGduKTtcbiAgICAgICAgaWYgKHBranNvbkZpbGUpIHtcbiAgICAgICAgICB5aWVsZCBjcmVhdGVQYWNrYWdlSW5mbyhwa2pzb25GaWxlLCB0cnVlKTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICB5aWVsZCBudWxsO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCBub2RlUGF0aHM6IHN0cmluZ1tdID0gcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID8gcHJvY2Vzcy5lbnYuTk9ERV9QQVRIIS5zcGxpdChQYXRoLmRlbGltaXRlcikgOiBbXTtcbi8qKlxuICogTG9vayB1cCBwYWNrYWdlLmpzb24gZmlsZSBpbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBOT0RFX1BBVEggXG4gKiBAcGFyYW0gbW9kdWxlTmFtZSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvb2t1cFBhY2thZ2VKc29uKG1vZHVsZU5hbWU6IHN0cmluZykge1xuICBmb3IgKGNvbnN0IHAgb2Ygbm9kZVBhdGhzKSB7XG4gICAgY29uc3QgdGVzdCA9IFBhdGgucmVzb2x2ZShwLCBtb2R1bGVOYW1lLCAncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdCkpIHtcbiAgICAgIHJldHVybiB0ZXN0O1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhsKHRleHQ6IHN0cmluZykge1xuICByZXR1cm4gY2hhbGsuZ3JlZW4odGV4dCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBobERlc2ModGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBjaGFsay5ncmF5KHRleHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXJyYXlPcHRpb25GbihjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59XG4iXX0=