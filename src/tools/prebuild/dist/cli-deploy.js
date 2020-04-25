"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const process_utils_1 = require("dr-comp-package/wfh/dist/process-utils");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const prebuild_post_1 = require("./prebuild-post");
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.cli-deploy');
function default_1(isStatic, env, app, scriptsFile) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        log.info(`post build, env: ${env}, App: ${app}, is static: ${isStatic}, build script: ${scriptsFile}`);
        yield require('./merge-artifacts').prepare();
        if (scriptsFile.endsWith('.sh')) {
            yield process_utils_1.spawn('bash', scriptsFile, env, app, isStatic ? 'true' : 'false').promise;
        }
        else if (scriptsFile.indexOf('#') < 0) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.redBright(`Wrong format of ${scriptsFile}, in which no "#" is found`));
            return;
        }
        else {
            const scriptAndFunc = scriptsFile.split('#');
            const file = scriptAndFunc[0];
            const func = scriptAndFunc[1];
            // tslint:disable-next-line: no-console
            console.log(`executing file: ${file}, function name: ${func}`);
            yield Promise.resolve(require(file)[func](env, app, isStatic));
        }
        yield prebuild_post_1.main(env, app, isStatic);
    });
}
exports.default = default_1;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLWRlcGxveS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLDBFQUE2RDtBQUM3RCwwREFBMEI7QUFDMUIsbURBQXFEO0FBR3JELE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsbUJBQThCLFFBQWlCLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxXQUFtQjs7UUFFNUYsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxVQUFVLEdBQUcsZ0JBQWdCLFFBQVEsbUJBQW1CLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDdkcsTUFBTyxPQUFPLENBQUMsbUJBQW1CLENBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFN0QsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQy9CLE1BQU0scUJBQUssQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQztTQUNqRjthQUFNLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdkMsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsV0FBVyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7WUFDekYsT0FBTztTQUNSO2FBQU07WUFDTCxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzdDLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QixNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksb0JBQW9CLElBQUksRUFBRSxDQUFDLENBQUM7WUFDL0QsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7U0FDaEU7UUFDRCxNQUFNLG9CQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN6QyxDQUFDO0NBQUE7QUFwQkQsNEJBb0JDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvZGlzdC9jbGktZGVwbG95LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7c3Bhd259IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge21haW4gYXMgcHJlYnVpbGRQb3N0fSBmcm9tICcuL3ByZWJ1aWxkLXBvc3QnO1xuaW1wb3J0ICogYXMgX21hIGZyb20gJy4vbWVyZ2UtYXJ0aWZhY3RzJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmNsaS1kZXBsb3knKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24oaXNTdGF0aWM6IGJvb2xlYW4sIGVudjogc3RyaW5nLCBhcHA6IHN0cmluZywgc2NyaXB0c0ZpbGU6IHN0cmluZykge1xuXG4gIGxvZy5pbmZvKGBwb3N0IGJ1aWxkLCBlbnY6ICR7ZW52fSwgQXBwOiAke2FwcH0sIGlzIHN0YXRpYzogJHtpc1N0YXRpY30sIGJ1aWxkIHNjcmlwdDogJHtzY3JpcHRzRmlsZX1gKTtcbiAgYXdhaXQgKHJlcXVpcmUoJy4vbWVyZ2UtYXJ0aWZhY3RzJykgYXMgdHlwZW9mIF9tYSkucHJlcGFyZSgpO1xuXG4gIGlmIChzY3JpcHRzRmlsZS5lbmRzV2l0aCgnLnNoJykpIHtcbiAgICBhd2FpdCBzcGF3bignYmFzaCcsIHNjcmlwdHNGaWxlLCBlbnYsIGFwcCwgaXNTdGF0aWMgPyAndHJ1ZScgOiAnZmFsc2UnKS5wcm9taXNlO1xuICB9IGVsc2UgaWYgKHNjcmlwdHNGaWxlLmluZGV4T2YoJyMnKSA8IDApIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5yZWRCcmlnaHQoYFdyb25nIGZvcm1hdCBvZiAke3NjcmlwdHNGaWxlfSwgaW4gd2hpY2ggbm8gXCIjXCIgaXMgZm91bmRgKSk7XG4gICAgcmV0dXJuO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHNjcmlwdEFuZEZ1bmMgPSBzY3JpcHRzRmlsZS5zcGxpdCgnIycpO1xuICAgIGNvbnN0IGZpbGUgPSBzY3JpcHRBbmRGdW5jWzBdO1xuICAgIGNvbnN0IGZ1bmMgPSBzY3JpcHRBbmRGdW5jWzFdO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBleGVjdXRpbmcgZmlsZTogJHtmaWxlfSwgZnVuY3Rpb24gbmFtZTogJHtmdW5jfWApO1xuICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShyZXF1aXJlKGZpbGUpW2Z1bmNdKGVudiwgYXBwLCBpc1N0YXRpYykpO1xuICB9XG4gIGF3YWl0IHByZWJ1aWxkUG9zdChlbnYsIGFwcCwgaXNTdGF0aWMpO1xufVxuIl19
