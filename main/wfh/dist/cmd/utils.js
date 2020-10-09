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
/** Use package-utils.ts#lookForPackages() */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsZ0RBQWlEO0FBT2pELFNBQWdCLFNBQVMsQ0FBQyxJQUFZLEVBQUUsT0FBZTtJQUNyRCxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDaEMsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGVBQUssQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFKRCw4QkFJQztBQUVELFFBQWUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQW9CLEVBQUUsYUFBdUI7SUFDaEYsS0FBSyxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLEVBQUU7UUFDM0QsSUFBSSxHQUFHLEVBQUU7WUFDUCxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUM7U0FDaEI7YUFBTTtZQUNMLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUFSRCxrREFRQztBQUVELDZDQUE2QztBQUM3QyxRQUFlLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFvQixFQUFFLGFBQXVCO0lBRWhGLE1BQU0sTUFBTSxHQUFtQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFcEQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDNUUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztJQUNwQyxLQUFLLE1BQU0sRUFBRSxJQUFJLGFBQWEsRUFBRTtRQUM5QixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbEIsS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUU7WUFDN0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQztZQUN6QixNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hDLElBQUksR0FBRyxFQUFFO2dCQUNQLE1BQU0sR0FBRyxDQUFDO2dCQUNWLEtBQUssR0FBRyxJQUFJLENBQUM7Z0JBQ2IsTUFBTTthQUNQO2lCQUFNO2dCQUNMLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLFVBQVUsRUFBRTtvQkFDZCxNQUFNLCtCQUFpQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDMUMsS0FBSyxHQUFHLElBQUksQ0FBQztvQkFDYixNQUFNO2lCQUNQO2FBQ0Y7U0FDRjtRQUVELElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDVixNQUFNLElBQUksQ0FBQztTQUNaO0tBQ0Y7QUFDSCxDQUFDO0FBN0JELGtEQTZCQztBQUVELE1BQU0sU0FBUyxHQUFhLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVUsQ0FBQyxLQUFLLENBQUMsY0FBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDdEc7OztHQUdHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsVUFBa0I7SUFDbEQsS0FBSyxNQUFNLENBQUMsSUFBSSxTQUFTLEVBQUU7UUFDekIsTUFBTSxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3pELElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkIsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBUkQsOENBUUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtjcmVhdGVQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtQYWNrYWdlc1N0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHtjcmVhdGVTZWxlY3Rvcn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5cbmltcG9ydCBfY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUZpbGUoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgZnMud3JpdGVGaWxlU3luYyhmaWxlLCBjb250ZW50KTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCclcyBpcyB3cml0dGVuJywgY2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogY29tcGxldGVQYWNrYWdlTmFtZShzdGF0ZTogUGFja2FnZXNTdGF0ZSwgZ3Vlc3NpbmdOYW1lczogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBwa2cgb2YgZmluZFBhY2thZ2VzQnlOYW1lcyhzdGF0ZSwgZ3Vlc3NpbmdOYW1lcykpIHtcbiAgICBpZiAocGtnKSB7XG4gICAgICB5aWVsZCBwa2cubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgeWllbGQgbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuLyoqIFVzZSBwYWNrYWdlLXV0aWxzLnRzI2xvb2tGb3JQYWNrYWdlcygpICovXG5leHBvcnQgZnVuY3Rpb24qIGZpbmRQYWNrYWdlc0J5TmFtZXMoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIGd1ZXNzaW5nTmFtZXM6IHN0cmluZ1tdKTpcbiAgR2VuZXJhdG9yPFBhY2thZ2VJbmZvIHwgbnVsbD4ge1xuICBjb25zdCBjb25maWc6IHR5cGVvZiBfY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbiAgY29uc3QgcHJlZml4ZXMgPSBbJycsIC4uLmNvbmZpZygpLnBhY2thZ2VTY29wZXMubWFwKHNjb3BlID0+IGBAJHtzY29wZX0vYCldO1xuICBjb25zdCBhdmFpbGFibGUgPSBzdGF0ZS5zcmNQYWNrYWdlcztcbiAgZm9yIChjb25zdCBnbiBvZiBndWVzc2luZ05hbWVzKSB7XG4gICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBwcmVmaXggb2YgcHJlZml4ZXMpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBwcmVmaXggKyBnbjtcbiAgICAgIGNvbnN0IHBrZyA9IGF2YWlsYWJsZS5nZXQobmFtZSk7XG4gICAgICBpZiAocGtnKSB7XG4gICAgICAgIHlpZWxkIHBrZztcbiAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHBranNvbkZpbGUgPSBsb29rdXBQYWNrYWdlSnNvbihnbik7XG4gICAgICAgIGlmIChwa2pzb25GaWxlKSB7XG4gICAgICAgICAgeWllbGQgY3JlYXRlUGFja2FnZUluZm8ocGtqc29uRmlsZSwgdHJ1ZSk7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgeWllbGQgbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuY29uc3Qgbm9kZVBhdGhzOiBzdHJpbmdbXSA9IHByb2Nlc3MuZW52Lk5PREVfUEFUSCA/IHByb2Nlc3MuZW52Lk5PREVfUEFUSCEuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpIDogW107XG4vKipcbiAqIExvb2sgdXAgcGFja2FnZS5qc29uIGZpbGUgaW4gZW52aXJvbm1lbnQgdmFyaWFibGUgTk9ERV9QQVRIIFxuICogQHBhcmFtIG1vZHVsZU5hbWUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb29rdXBQYWNrYWdlSnNvbihtb2R1bGVOYW1lOiBzdHJpbmcpIHtcbiAgZm9yIChjb25zdCBwIG9mIG5vZGVQYXRocykge1xuICAgIGNvbnN0IHRlc3QgPSBQYXRoLnJlc29sdmUocCwgbW9kdWxlTmFtZSwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4gICAgICByZXR1cm4gdGVzdDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=