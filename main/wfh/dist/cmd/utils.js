"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completePackageName = exports.writeFile = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function writeFile(file, content) {
    fs_extra_1.default.writeFileSync(file, content);
    // tslint:disable-next-line: no-console
    console.log('%s is written', chalk_1.default.cyan(path_1.default.relative(process.cwd(), file)));
}
exports.writeFile = writeFile;
function completePackageName(state, guessingName) {
    const config = require('../config');
    const prefixes = ['', ...config().packageScopes.map(scope => `@${scope}/`)];
    const available = state.srcPackages;
    return guessingName.map(gn => {
        for (const prefix of prefixes) {
            const name = prefix + gn;
            if (available[name]) {
                return name;
            }
        }
        return null;
    });
}
exports.completePackageName = completePackageName;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFJeEIsU0FBZ0IsU0FBUyxDQUFDLElBQVksRUFBRSxPQUFlO0lBQ3JELGtCQUFFLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNoQyx1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUpELDhCQUlDO0FBRUQsU0FBZ0IsbUJBQW1CLENBQUMsS0FBb0IsRUFBRSxZQUFzQjtJQUM5RSxNQUFNLE1BQU0sR0FBbUIsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRXBELE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVFLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7SUFDcEMsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1FBQzNCLEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxFQUFFO1lBQzdCLE1BQU0sSUFBSSxHQUFHLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDekIsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ25CLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBZEQsa0RBY0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtQYWNrYWdlc1N0YXRlfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgX2NvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVGaWxlKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG4gIGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgY29udGVudCk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnJXMgaXMgd3JpdHRlbicsIGNoYWxrLmN5YW4oUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGxldGVQYWNrYWdlTmFtZShzdGF0ZTogUGFja2FnZXNTdGF0ZSwgZ3Vlc3NpbmdOYW1lOiBzdHJpbmdbXSk6IChzdHJpbmd8bnVsbClbXSB7XG4gIGNvbnN0IGNvbmZpZzogdHlwZW9mIF9jb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxuICBjb25zdCBwcmVmaXhlcyA9IFsnJywgLi4uY29uZmlnKCkucGFja2FnZVNjb3Blcy5tYXAoc2NvcGUgPT4gYEAke3Njb3BlfS9gKV07XG4gIGNvbnN0IGF2YWlsYWJsZSA9IHN0YXRlLnNyY1BhY2thZ2VzO1xuICByZXR1cm4gZ3Vlc3NpbmdOYW1lLm1hcChnbiA9PiB7XG4gICAgZm9yIChjb25zdCBwcmVmaXggb2YgcHJlZml4ZXMpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBwcmVmaXggKyBnbjtcbiAgICAgIGlmIChhdmFpbGFibGVbbmFtZV0pIHtcbiAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9KTtcbn1cbiJdfQ==