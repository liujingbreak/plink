"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const process_utils_1 = require("dr-comp-package/wfh/dist/process-utils");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const prebuild_post_1 = require("./prebuild-post");
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.cli-deploy');
function default_1(isStatic, env, app, secret, scriptsFile) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        log.info(`post build, env: ${env}, App: ${app}, is static: ${isStatic}, build script: ${scriptsFile}`);
        yield require('./merge-artifacts').prepare();
        if (scriptsFile) {
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
        }
        yield prebuild_post_1.main(env, app, isStatic, secret);
    });
}
exports.default = default_1;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLWRlcGxveS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLDBFQUE2RDtBQUM3RCwwREFBMEI7QUFDMUIsbURBQXFEO0FBR3JELE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsbUJBQThCLFFBQWlCLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxNQUFlLEVBQUUsV0FBb0I7O1FBRTlHLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsVUFBVSxHQUFHLGdCQUFnQixRQUFRLG1CQUFtQixXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZHLE1BQU8sT0FBTyxDQUFDLG1CQUFtQixDQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRTdELElBQUksV0FBVyxFQUFFO1lBQ2YsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUMvQixNQUFNLHFCQUFLLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUM7YUFDakY7aUJBQU0sSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdkMsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxTQUFTLENBQUMsbUJBQW1CLFdBQVcsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO2dCQUN6RixPQUFPO2FBQ1I7aUJBQU07Z0JBQ0wsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLHVDQUF1QztnQkFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxvQkFBb0IsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDL0QsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7YUFDaEU7U0FDRjtRQUNELE1BQU0sb0JBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNqRCxDQUFDO0NBQUE7QUF0QkQsNEJBc0JDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvZGlzdC9jbGktZGVwbG95LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7c3Bhd259IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge21haW4gYXMgcHJlYnVpbGRQb3N0fSBmcm9tICcuL3ByZWJ1aWxkLXBvc3QnO1xuaW1wb3J0ICogYXMgX21hIGZyb20gJy4vbWVyZ2UtYXJ0aWZhY3RzJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmNsaS1kZXBsb3knKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24oaXNTdGF0aWM6IGJvb2xlYW4sIGVudjogc3RyaW5nLCBhcHA6IHN0cmluZywgc2VjcmV0Pzogc3RyaW5nLCBzY3JpcHRzRmlsZT86IHN0cmluZykge1xuXG4gIGxvZy5pbmZvKGBwb3N0IGJ1aWxkLCBlbnY6ICR7ZW52fSwgQXBwOiAke2FwcH0sIGlzIHN0YXRpYzogJHtpc1N0YXRpY30sIGJ1aWxkIHNjcmlwdDogJHtzY3JpcHRzRmlsZX1gKTtcbiAgYXdhaXQgKHJlcXVpcmUoJy4vbWVyZ2UtYXJ0aWZhY3RzJykgYXMgdHlwZW9mIF9tYSkucHJlcGFyZSgpO1xuXG4gIGlmIChzY3JpcHRzRmlsZSkge1xuICAgIGlmIChzY3JpcHRzRmlsZS5lbmRzV2l0aCgnLnNoJykpIHtcbiAgICAgIGF3YWl0IHNwYXduKCdiYXNoJywgc2NyaXB0c0ZpbGUsIGVudiwgYXBwLCBpc1N0YXRpYyA/ICd0cnVlJyA6ICdmYWxzZScpLnByb21pc2U7XG4gICAgfSBlbHNlIGlmIChzY3JpcHRzRmlsZS5pbmRleE9mKCcjJykgPCAwKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnJlZEJyaWdodChgV3JvbmcgZm9ybWF0IG9mICR7c2NyaXB0c0ZpbGV9LCBpbiB3aGljaCBubyBcIiNcIiBpcyBmb3VuZGApKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc2NyaXB0QW5kRnVuYyA9IHNjcmlwdHNGaWxlLnNwbGl0KCcjJyk7XG4gICAgICBjb25zdCBmaWxlID0gc2NyaXB0QW5kRnVuY1swXTtcbiAgICAgIGNvbnN0IGZ1bmMgPSBzY3JpcHRBbmRGdW5jWzFdO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgZXhlY3V0aW5nIGZpbGU6ICR7ZmlsZX0sIGZ1bmN0aW9uIG5hbWU6ICR7ZnVuY31gKTtcbiAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShyZXF1aXJlKGZpbGUpW2Z1bmNdKGVudiwgYXBwLCBpc1N0YXRpYykpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBwcmVidWlsZFBvc3QoZW52LCBhcHAsIGlzU3RhdGljLCBzZWNyZXQpO1xufVxuIl19
