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
                log.error(chalk_1.default.redBright(`Wrong format of ${scriptsFile}, in which no "#" is found`));
                return;
            }
            else {
                const scriptAndFunc = scriptsFile.split('#');
                const file = scriptAndFunc[0];
                const func = scriptAndFunc[1];
                // tslint:disable-next-line: no-console
                log.info(`executing file: ${file}, function name: ${func}`);
                yield Promise.resolve(require(file)[func](env, app, isStatic));
            }
        }
        yield prebuild_post_1.main(env, app, isStatic, secret ? secret : undefined);
    });
}
exports.default = default_1;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLWRlcGxveS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLDBFQUE2RDtBQUM3RCwwREFBMEI7QUFDMUIsbURBQXFEO0FBR3JELE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsbUJBQThCLFFBQWlCLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxNQUFpQyxFQUFFLFdBQW9COztRQUVoSSxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFVBQVUsR0FBRyxnQkFBZ0IsUUFBUSxtQkFBbUIsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN2RyxNQUFPLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUU3RCxJQUFJLFdBQVcsRUFBRTtZQUNmLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDL0IsTUFBTSxxQkFBSyxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDO2FBQ2pGO2lCQUFNLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3ZDLHVDQUF1QztnQkFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFLLENBQUMsU0FBUyxDQUFDLG1CQUFtQixXQUFXLDRCQUE0QixDQUFDLENBQUMsQ0FBQztnQkFDdkYsT0FBTzthQUNSO2lCQUFNO2dCQUNMLE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzdDLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5Qix1Q0FBdUM7Z0JBQ3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLElBQUksb0JBQW9CLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQzVELE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQ2hFO1NBQ0Y7UUFDRCxNQUFNLG9CQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7Q0FBQTtBQXRCRCw0QkFzQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L2NsaS1kZXBsb3kuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtzcGF3bn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7bWFpbiBhcyBwcmVidWlsZFBvc3R9IGZyb20gJy4vcHJlYnVpbGQtcG9zdCc7XG5pbXBvcnQgKiBhcyBfbWEgZnJvbSAnLi9tZXJnZS1hcnRpZmFjdHMnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuY2xpLWRlcGxveScpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihpc1N0YXRpYzogYm9vbGVhbiwgZW52OiBzdHJpbmcsIGFwcDogc3RyaW5nLCBzZWNyZXQ6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwsIHNjcmlwdHNGaWxlPzogc3RyaW5nKSB7XG5cbiAgbG9nLmluZm8oYHBvc3QgYnVpbGQsIGVudjogJHtlbnZ9LCBBcHA6ICR7YXBwfSwgaXMgc3RhdGljOiAke2lzU3RhdGljfSwgYnVpbGQgc2NyaXB0OiAke3NjcmlwdHNGaWxlfWApO1xuICBhd2FpdCAocmVxdWlyZSgnLi9tZXJnZS1hcnRpZmFjdHMnKSBhcyB0eXBlb2YgX21hKS5wcmVwYXJlKCk7XG5cbiAgaWYgKHNjcmlwdHNGaWxlKSB7XG4gICAgaWYgKHNjcmlwdHNGaWxlLmVuZHNXaXRoKCcuc2gnKSkge1xuICAgICAgYXdhaXQgc3Bhd24oJ2Jhc2gnLCBzY3JpcHRzRmlsZSwgZW52LCBhcHAsIGlzU3RhdGljID8gJ3RydWUnIDogJ2ZhbHNlJykucHJvbWlzZTtcbiAgICB9IGVsc2UgaWYgKHNjcmlwdHNGaWxlLmluZGV4T2YoJyMnKSA8IDApIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLmVycm9yKGNoYWxrLnJlZEJyaWdodChgV3JvbmcgZm9ybWF0IG9mICR7c2NyaXB0c0ZpbGV9LCBpbiB3aGljaCBubyBcIiNcIiBpcyBmb3VuZGApKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc2NyaXB0QW5kRnVuYyA9IHNjcmlwdHNGaWxlLnNwbGl0KCcjJyk7XG4gICAgICBjb25zdCBmaWxlID0gc2NyaXB0QW5kRnVuY1swXTtcbiAgICAgIGNvbnN0IGZ1bmMgPSBzY3JpcHRBbmRGdW5jWzFdO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbyhgZXhlY3V0aW5nIGZpbGU6ICR7ZmlsZX0sIGZ1bmN0aW9uIG5hbWU6ICR7ZnVuY31gKTtcbiAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShyZXF1aXJlKGZpbGUpW2Z1bmNdKGVudiwgYXBwLCBpc1N0YXRpYykpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBwcmVidWlsZFBvc3QoZW52LCBhcHAsIGlzU3RhdGljLCBzZWNyZXQgPyBzZWNyZXQgOiB1bmRlZmluZWQpO1xufVxuIl19
