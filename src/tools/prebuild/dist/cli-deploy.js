"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const process_utils_1 = require("dr-comp-package/wfh/dist/process-utils");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const prebuild_post_1 = require("./prebuild-post");
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.cli-deploy');
function default_1(isStatic, env, app, scriptsFile, secret) {
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
        yield prebuild_post_1.main(env, app, isStatic, secret);
    });
}
exports.default = default_1;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLWRlcGxveS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLDBFQUE2RDtBQUM3RCwwREFBMEI7QUFDMUIsbURBQXFEO0FBR3JELE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsbUJBQThCLFFBQWlCLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxXQUFtQixFQUFFLE1BQWU7O1FBRTdHLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsVUFBVSxHQUFHLGdCQUFnQixRQUFRLG1CQUFtQixXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZHLE1BQU8sT0FBTyxDQUFDLG1CQUFtQixDQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRTdELElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUMvQixNQUFNLHFCQUFLLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUM7U0FDakY7YUFBTSxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3ZDLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxTQUFTLENBQUMsbUJBQW1CLFdBQVcsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1lBQ3pGLE9BQU87U0FDUjthQUFNO1lBQ0wsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3QyxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLG9CQUFvQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1NBQ2hFO1FBQ0QsTUFBTSxvQkFBWSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2pELENBQUM7Q0FBQTtBQXBCRCw0QkFvQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L2NsaS1kZXBsb3kuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtzcGF3bn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7bWFpbiBhcyBwcmVidWlsZFBvc3R9IGZyb20gJy4vcHJlYnVpbGQtcG9zdCc7XG5pbXBvcnQgKiBhcyBfbWEgZnJvbSAnLi9tZXJnZS1hcnRpZmFjdHMnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuY2xpLWRlcGxveScpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihpc1N0YXRpYzogYm9vbGVhbiwgZW52OiBzdHJpbmcsIGFwcDogc3RyaW5nLCBzY3JpcHRzRmlsZTogc3RyaW5nLCBzZWNyZXQ/OiBzdHJpbmcpIHtcblxuICBsb2cuaW5mbyhgcG9zdCBidWlsZCwgZW52OiAke2Vudn0sIEFwcDogJHthcHB9LCBpcyBzdGF0aWM6ICR7aXNTdGF0aWN9LCBidWlsZCBzY3JpcHQ6ICR7c2NyaXB0c0ZpbGV9YCk7XG4gIGF3YWl0IChyZXF1aXJlKCcuL21lcmdlLWFydGlmYWN0cycpIGFzIHR5cGVvZiBfbWEpLnByZXBhcmUoKTtcblxuICBpZiAoc2NyaXB0c0ZpbGUuZW5kc1dpdGgoJy5zaCcpKSB7XG4gICAgYXdhaXQgc3Bhd24oJ2Jhc2gnLCBzY3JpcHRzRmlsZSwgZW52LCBhcHAsIGlzU3RhdGljID8gJ3RydWUnIDogJ2ZhbHNlJykucHJvbWlzZTtcbiAgfSBlbHNlIGlmIChzY3JpcHRzRmlsZS5pbmRleE9mKCcjJykgPCAwKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsucmVkQnJpZ2h0KGBXcm9uZyBmb3JtYXQgb2YgJHtzY3JpcHRzRmlsZX0sIGluIHdoaWNoIG5vIFwiI1wiIGlzIGZvdW5kYCkpO1xuICAgIHJldHVybjtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBzY3JpcHRBbmRGdW5jID0gc2NyaXB0c0ZpbGUuc3BsaXQoJyMnKTtcbiAgICBjb25zdCBmaWxlID0gc2NyaXB0QW5kRnVuY1swXTtcbiAgICBjb25zdCBmdW5jID0gc2NyaXB0QW5kRnVuY1sxXTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgZXhlY3V0aW5nIGZpbGU6ICR7ZmlsZX0sIGZ1bmN0aW9uIG5hbWU6ICR7ZnVuY31gKTtcbiAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUocmVxdWlyZShmaWxlKVtmdW5jXShlbnYsIGFwcCwgaXNTdGF0aWMpKTtcbiAgfVxuICBhd2FpdCBwcmVidWlsZFBvc3QoZW52LCBhcHAsIGlzU3RhdGljLCBzZWNyZXQpO1xufVxuIl19
