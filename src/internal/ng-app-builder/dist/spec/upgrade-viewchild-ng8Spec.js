"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const upgrade_viewchild_ng8_1 = require("../utils/upgrade-viewchild-ng8");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('ViewChild transformer', () => {
    it('should work', () => {
        const content = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/upgrade-viewchild-ng8-sample.txt'), 'utf8');
        const newContent = upgrade_viewchild_ng8_1.transform(content, 'test view child upgrade');
        // eslint-disable-next-line no-console
        console.log(newContent);
        // expect(newContent)
        // TODO
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZS12aWV3Y2hpbGQtbmc4U3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInVwZ3JhZGUtdmlld2NoaWxkLW5nOFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwRUFBeUQ7QUFDekQsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUV4QixRQUFRLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3JCLE1BQU0sT0FBTyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FDMUMsU0FBUyxFQUFFLGdEQUFnRCxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEUsTUFBTSxVQUFVLEdBQUcsaUNBQVMsQ0FBQyxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUNqRSxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4QixxQkFBcUI7UUFDckIsT0FBTztJQUNULENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3RyYW5zZm9ybX0gZnJvbSAnLi4vdXRpbHMvdXBncmFkZS12aWV3Y2hpbGQtbmc4JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuZGVzY3JpYmUoJ1ZpZXdDaGlsZCB0cmFuc2Zvcm1lcicsICgpID0+IHtcbiAgaXQoJ3Nob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKFxuICAgICAgX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy91cGdyYWRlLXZpZXdjaGlsZC1uZzgtc2FtcGxlLnR4dCcpLCAndXRmOCcpO1xuICAgIGNvbnN0IG5ld0NvbnRlbnQgPSB0cmFuc2Zvcm0oY29udGVudCwgJ3Rlc3QgdmlldyBjaGlsZCB1cGdyYWRlJyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhuZXdDb250ZW50KTtcbiAgICAvLyBleHBlY3QobmV3Q29udGVudClcbiAgICAvLyBUT0RPXG4gIH0pO1xufSk7XG5cbiJdfQ==