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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsZ0RBQWlEO0FBTWpELFNBQWdCLFNBQVMsQ0FBQyxJQUFZLEVBQUUsT0FBZTtJQUNyRCxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDaEMsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGVBQUssQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFKRCw4QkFJQztBQUVELFFBQWUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQW9CLEVBQUUsYUFBdUI7SUFDaEYsS0FBSyxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLEVBQUU7UUFDM0QsSUFBSSxHQUFHLEVBQUU7WUFDUCxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUM7U0FDaEI7YUFBTTtZQUNMLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUFSRCxrREFRQztBQUVELDZDQUE2QztBQUM3QyxRQUFlLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFvQixFQUFFLGFBQXVCO0lBRWhGLE1BQU0sTUFBTSxHQUFtQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFcEQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDNUUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztJQUNwQyxLQUFLLE1BQU0sRUFBRSxJQUFJLGFBQWEsRUFBRTtRQUM5QixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbEIsS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUU7WUFDN0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQztZQUN6QixJQUFJLElBQUksS0FBSyxZQUFZLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtnQkFDN0MsTUFBTSxLQUFLLENBQUMsVUFBVSxDQUFDO2dCQUN2QixLQUFLLEdBQUcsSUFBSSxDQUFDO2dCQUNiLE1BQU07YUFDUDtZQUNELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEMsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsTUFBTSxHQUFHLENBQUM7Z0JBQ1YsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDYixNQUFNO2FBQ1A7aUJBQU07Z0JBQ0wsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksVUFBVSxFQUFFO29CQUNkLE1BQU0sK0JBQWlCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUMxQyxLQUFLLEdBQUcsSUFBSSxDQUFDO29CQUNiLE1BQU07aUJBQ1A7YUFDRjtTQUNGO1FBRUQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUFsQ0Qsa0RBa0NDO0FBRUQsTUFBTSxTQUFTLEdBQWEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN0Rzs7O0dBR0c7QUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxVQUFrQjtJQUNsRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLFNBQVMsRUFBRTtRQUN6QixNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDekQsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN2QixPQUFPLElBQUksQ0FBQztTQUNiO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFSRCw4Q0FRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2NyZWF0ZVBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge1BhY2thZ2VzU3RhdGUsIFBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCBfY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUZpbGUoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgZnMud3JpdGVGaWxlU3luYyhmaWxlLCBjb250ZW50KTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCclcyBpcyB3cml0dGVuJywgY2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogY29tcGxldGVQYWNrYWdlTmFtZShzdGF0ZTogUGFja2FnZXNTdGF0ZSwgZ3Vlc3NpbmdOYW1lczogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBwa2cgb2YgZmluZFBhY2thZ2VzQnlOYW1lcyhzdGF0ZSwgZ3Vlc3NpbmdOYW1lcykpIHtcbiAgICBpZiAocGtnKSB7XG4gICAgICB5aWVsZCBwa2cubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgeWllbGQgbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuLyoqIFVzZSBwYWNrYWdlLXV0aWxzLnRzI2xvb2tGb3JQYWNrYWdlcygpICovXG5leHBvcnQgZnVuY3Rpb24qIGZpbmRQYWNrYWdlc0J5TmFtZXMoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIGd1ZXNzaW5nTmFtZXM6IHN0cmluZ1tdKTpcbiAgR2VuZXJhdG9yPFBhY2thZ2VJbmZvIHwgbnVsbD4ge1xuICBjb25zdCBjb25maWc6IHR5cGVvZiBfY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbiAgY29uc3QgcHJlZml4ZXMgPSBbJycsIC4uLmNvbmZpZygpLnBhY2thZ2VTY29wZXMubWFwKHNjb3BlID0+IGBAJHtzY29wZX0vYCldO1xuICBjb25zdCBhdmFpbGFibGUgPSBzdGF0ZS5zcmNQYWNrYWdlcztcbiAgZm9yIChjb25zdCBnbiBvZiBndWVzc2luZ05hbWVzKSB7XG4gICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBwcmVmaXggb2YgcHJlZml4ZXMpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBwcmVmaXggKyBnbjtcbiAgICAgIGlmIChuYW1lID09PSAnQHdmaC9wbGluaycgJiYgc3RhdGUubGlua2VkRHJjcCkge1xuICAgICAgICB5aWVsZCBzdGF0ZS5saW5rZWREcmNwO1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY29uc3QgcGtnID0gYXZhaWxhYmxlLmdldChuYW1lKTtcbiAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgeWllbGQgcGtnO1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcGtqc29uRmlsZSA9IGxvb2t1cFBhY2thZ2VKc29uKGduKTtcbiAgICAgICAgaWYgKHBranNvbkZpbGUpIHtcbiAgICAgICAgICB5aWVsZCBjcmVhdGVQYWNrYWdlSW5mbyhwa2pzb25GaWxlLCB0cnVlKTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICB5aWVsZCBudWxsO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCBub2RlUGF0aHM6IHN0cmluZ1tdID0gcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID8gcHJvY2Vzcy5lbnYuTk9ERV9QQVRIIS5zcGxpdChQYXRoLmRlbGltaXRlcikgOiBbXTtcbi8qKlxuICogTG9vayB1cCBwYWNrYWdlLmpzb24gZmlsZSBpbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBOT0RFX1BBVEggXG4gKiBAcGFyYW0gbW9kdWxlTmFtZSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvb2t1cFBhY2thZ2VKc29uKG1vZHVsZU5hbWU6IHN0cmluZykge1xuICBmb3IgKGNvbnN0IHAgb2Ygbm9kZVBhdGhzKSB7XG4gICAgY29uc3QgdGVzdCA9IFBhdGgucmVzb2x2ZShwLCBtb2R1bGVOYW1lLCAncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdCkpIHtcbiAgICAgIHJldHVybiB0ZXN0O1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cbiJdfQ==