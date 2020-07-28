"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFile = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function writeFile(file, content) {
    fs_extra_1.default.writeFileSync(file, content);
    // tslint:disable-next-line: no-console
    console.log('%s is written', chalk_1.default.cyan(path_1.default.relative(process.cwd(), file)));
}
exports.writeFile = writeFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsU0FBZ0IsU0FBUyxDQUFDLElBQVksRUFBRSxPQUFlO0lBQ3JELGtCQUFFLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNoQyx1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUpELDhCQUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRmlsZShmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykge1xuICBmcy53cml0ZUZpbGVTeW5jKGZpbGUsIGNvbnRlbnQpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJyVzIGlzIHdyaXR0ZW4nLCBjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSkpKTtcbn1cblxuIl19