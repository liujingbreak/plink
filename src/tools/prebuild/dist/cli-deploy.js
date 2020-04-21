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
            yield process_utils_1.spawn(scriptsFile, env, app, isStatic ? 'true' : 'false').promise;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLWRlcGxveS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLDBFQUE2RDtBQUM3RCwwREFBMEI7QUFDMUIsbURBQXFEO0FBR3JELE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsbUJBQThCLFFBQWlCLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxXQUFtQjs7UUFFNUYsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxVQUFVLEdBQUcsZ0JBQWdCLFFBQVEsbUJBQW1CLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDdkcsTUFBTyxPQUFPLENBQUMsbUJBQW1CLENBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFN0QsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQy9CLE1BQU0scUJBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDO1NBQ3pFO2FBQU0sSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN2Qyx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsU0FBUyxDQUFDLG1CQUFtQixXQUFXLDRCQUE0QixDQUFDLENBQUMsQ0FBQztZQUN6RixPQUFPO1NBQ1I7YUFBTTtZQUNMLE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDN0MsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5Qix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxvQkFBb0IsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUMvRCxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztTQUNoRTtRQUNELE1BQU0sb0JBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7Q0FBQTtBQXBCRCw0QkFvQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L2NsaS1kZXBsb3kuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtzcGF3bn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7bWFpbiBhcyBwcmVidWlsZFBvc3R9IGZyb20gJy4vcHJlYnVpbGQtcG9zdCc7XG5pbXBvcnQgKiBhcyBfbWEgZnJvbSAnLi9tZXJnZS1hcnRpZmFjdHMnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuY2xpLWRlcGxveScpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihpc1N0YXRpYzogYm9vbGVhbiwgZW52OiBzdHJpbmcsIGFwcDogc3RyaW5nLCBzY3JpcHRzRmlsZTogc3RyaW5nKSB7XG5cbiAgbG9nLmluZm8oYHBvc3QgYnVpbGQsIGVudjogJHtlbnZ9LCBBcHA6ICR7YXBwfSwgaXMgc3RhdGljOiAke2lzU3RhdGljfSwgYnVpbGQgc2NyaXB0OiAke3NjcmlwdHNGaWxlfWApO1xuICBhd2FpdCAocmVxdWlyZSgnLi9tZXJnZS1hcnRpZmFjdHMnKSBhcyB0eXBlb2YgX21hKS5wcmVwYXJlKCk7XG5cbiAgaWYgKHNjcmlwdHNGaWxlLmVuZHNXaXRoKCcuc2gnKSkge1xuICAgIGF3YWl0IHNwYXduKHNjcmlwdHNGaWxlLCBlbnYsIGFwcCwgaXNTdGF0aWMgPyAndHJ1ZScgOiAnZmFsc2UnKS5wcm9taXNlO1xuICB9IGVsc2UgaWYgKHNjcmlwdHNGaWxlLmluZGV4T2YoJyMnKSA8IDApIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5yZWRCcmlnaHQoYFdyb25nIGZvcm1hdCBvZiAke3NjcmlwdHNGaWxlfSwgaW4gd2hpY2ggbm8gXCIjXCIgaXMgZm91bmRgKSk7XG4gICAgcmV0dXJuO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHNjcmlwdEFuZEZ1bmMgPSBzY3JpcHRzRmlsZS5zcGxpdCgnIycpO1xuICAgIGNvbnN0IGZpbGUgPSBzY3JpcHRBbmRGdW5jWzBdO1xuICAgIGNvbnN0IGZ1bmMgPSBzY3JpcHRBbmRGdW5jWzFdO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBleGVjdXRpbmcgZmlsZTogJHtmaWxlfSwgZnVuY3Rpb24gbmFtZTogJHtmdW5jfWApO1xuICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShyZXF1aXJlKGZpbGUpW2Z1bmNdKGVudiwgYXBwLCBpc1N0YXRpYykpO1xuICB9XG4gIGF3YWl0IHByZWJ1aWxkUG9zdChlbnYsIGFwcCwgaXNTdGF0aWMpO1xufVxuIl19
