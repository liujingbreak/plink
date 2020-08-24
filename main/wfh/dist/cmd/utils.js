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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPackageJsonPath = exports.findPackagesByNames = exports.completePackageName = exports.writeFile = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const package_mgr_1 = require("../package-mgr");
const _ = __importStar(require("lodash"));
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
                const pkjsonFile = exports.findPackageJsonPath(gn);
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
exports.findPackageJsonPath = _.memoize(_findPackageJsonPath);
function _findPackageJsonPath(moduleName) {
    let resolvedPath;
    try {
        resolvedPath = require.resolve(moduleName + '/package.json');
        return resolvedPath;
    }
    catch (er) {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtEQUEwQjtBQUMxQix3REFBMEI7QUFDMUIsZ0RBQXdCO0FBQ3hCLGdEQUFpRDtBQUVqRCwwQ0FBNEI7QUFJNUIsU0FBZ0IsU0FBUyxDQUFDLElBQVksRUFBRSxPQUFlO0lBQ3JELGtCQUFFLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNoQyx1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUpELDhCQUlDO0FBRUQsUUFBZSxDQUFDLENBQUMsbUJBQW1CLENBQUMsS0FBb0IsRUFBRSxhQUF1QjtJQUNoRixLQUFLLE1BQU0sR0FBRyxJQUFJLG1CQUFtQixDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsRUFBRTtRQUMzRCxJQUFJLEdBQUcsRUFBRTtZQUNQLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQztTQUNoQjthQUFNO1lBQ0wsTUFBTSxJQUFJLENBQUM7U0FDWjtLQUNGO0FBQ0gsQ0FBQztBQVJELGtEQVFDO0FBRUQsUUFBZSxDQUFDLENBQUMsbUJBQW1CLENBQUMsS0FBb0IsRUFBRSxhQUF1QjtJQUVoRixNQUFNLE1BQU0sR0FBbUIsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRXBELE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVFLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7SUFDcEMsS0FBSyxNQUFNLEVBQUUsSUFBSSxhQUFhLEVBQUU7UUFDOUIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ2xCLEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxFQUFFO1lBQzdCLE1BQU0sSUFBSSxHQUFHLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDekIsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxJQUFJLEdBQUcsRUFBRTtnQkFDUCxNQUFNLEdBQUcsQ0FBQztnQkFDVixLQUFLLEdBQUcsSUFBSSxDQUFDO2dCQUNiLE1BQU07YUFDUDtpQkFBTTtnQkFDTCxNQUFNLFVBQVUsR0FBRywyQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxVQUFVLEVBQUU7b0JBQ2QsTUFBTSwrQkFBaUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQzFDLEtBQUssR0FBRyxJQUFJLENBQUM7b0JBQ2IsTUFBTTtpQkFDUDthQUNGO1NBQ0Y7UUFFRCxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1YsTUFBTSxJQUFJLENBQUM7U0FDWjtLQUNGO0FBQ0gsQ0FBQztBQTdCRCxrREE2QkM7QUFFWSxRQUFBLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUVuRSxTQUFTLG9CQUFvQixDQUFDLFVBQWtCO0lBQzlDLElBQUksWUFBWSxDQUFDO0lBQ2pCLElBQUk7UUFDRixZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsZUFBZSxDQUFDLENBQUM7UUFDN0QsT0FBTyxZQUFZLENBQUM7S0FDckI7SUFBQyxPQUFPLEVBQUUsRUFBRTtRQUNYLE9BQU8sSUFBSSxDQUFDO0tBQ2I7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Y3JlYXRlUGFja2FnZUluZm99IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB0eXBlIHtQYWNrYWdlc1N0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQgX2NvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVGaWxlKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG4gIGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgY29udGVudCk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnJXMgaXMgd3JpdHRlbicsIGNoYWxrLmN5YW4oUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24qIGNvbXBsZXRlUGFja2FnZU5hbWUoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIGd1ZXNzaW5nTmFtZXM6IHN0cmluZ1tdKSB7XG4gIGZvciAoY29uc3QgcGtnIG9mIGZpbmRQYWNrYWdlc0J5TmFtZXMoc3RhdGUsIGd1ZXNzaW5nTmFtZXMpKSB7XG4gICAgaWYgKHBrZykge1xuICAgICAgeWllbGQgcGtnLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHlpZWxkIG51bGw7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogZmluZFBhY2thZ2VzQnlOYW1lcyhzdGF0ZTogUGFja2FnZXNTdGF0ZSwgZ3Vlc3NpbmdOYW1lczogc3RyaW5nW10pOlxuICBHZW5lcmF0b3I8UGFja2FnZUluZm8gfCBudWxsPiB7XG4gIGNvbnN0IGNvbmZpZzogdHlwZW9mIF9jb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxuICBjb25zdCBwcmVmaXhlcyA9IFsnJywgLi4uY29uZmlnKCkucGFja2FnZVNjb3Blcy5tYXAoc2NvcGUgPT4gYEAke3Njb3BlfS9gKV07XG4gIGNvbnN0IGF2YWlsYWJsZSA9IHN0YXRlLnNyY1BhY2thZ2VzO1xuICBmb3IgKGNvbnN0IGduIG9mIGd1ZXNzaW5nTmFtZXMpIHtcbiAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHByZWZpeCBvZiBwcmVmaXhlcykge1xuICAgICAgY29uc3QgbmFtZSA9IHByZWZpeCArIGduO1xuICAgICAgY29uc3QgcGtnID0gYXZhaWxhYmxlLmdldChuYW1lKTtcbiAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgeWllbGQgcGtnO1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcGtqc29uRmlsZSA9IGZpbmRQYWNrYWdlSnNvblBhdGgoZ24pO1xuICAgICAgICBpZiAocGtqc29uRmlsZSkge1xuICAgICAgICAgIHlpZWxkIGNyZWF0ZVBhY2thZ2VJbmZvKHBranNvbkZpbGUsIHRydWUpO1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghZm91bmQpIHtcbiAgICAgIHlpZWxkIG51bGw7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjb25zdCBmaW5kUGFja2FnZUpzb25QYXRoID0gXy5tZW1vaXplKF9maW5kUGFja2FnZUpzb25QYXRoKTtcblxuZnVuY3Rpb24gX2ZpbmRQYWNrYWdlSnNvblBhdGgobW9kdWxlTmFtZTogc3RyaW5nKSB7XG4gIGxldCByZXNvbHZlZFBhdGg7XG4gIHRyeSB7XG4gICAgcmVzb2x2ZWRQYXRoID0gcmVxdWlyZS5yZXNvbHZlKG1vZHVsZU5hbWUgKyAnL3BhY2thZ2UuanNvbicpO1xuICAgIHJldHVybiByZXNvbHZlZFBhdGg7XG4gIH0gY2F0Y2ggKGVyKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==