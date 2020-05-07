"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const process_utils_1 = require("dr-comp-package/wfh/dist/process-utils");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const prebuild_post_1 = require("./prebuild-post");
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.cli-deploy');
function default_1(isStatic, env, app, pushBranch = true, secret, scriptsFile) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        log.info(`post build, env: ${env}, App: ${app}, is static: ${isStatic}, build script: ${scriptsFile}`);
        if (pushBranch) {
            yield require('./merge-artifacts').prepare();
        }
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
        yield prebuild_post_1.main(env, app, isStatic, pushBranch, secret ? secret : undefined);
    });
}
exports.default = default_1;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLWRlcGxveS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLDBFQUE2RDtBQUM3RCwwREFBMEI7QUFDMUIsbURBQXFEO0FBR3JELE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsbUJBQThCLFFBQWlCLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxVQUFVLEdBQUcsSUFBSSxFQUMxRixNQUFpQyxFQUFFLFdBQW9COztRQUV2RCxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFVBQVUsR0FBRyxnQkFBZ0IsUUFBUSxtQkFBbUIsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN2RyxJQUFJLFVBQVUsRUFBRTtZQUNkLE1BQU8sT0FBTyxDQUFDLG1CQUFtQixDQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQzlEO1FBRUQsSUFBSSxXQUFXLEVBQUU7WUFDZixJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQy9CLE1BQU0scUJBQUssQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQzthQUNqRjtpQkFBTSxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN2Qyx1Q0FBdUM7Z0JBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBSyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsV0FBVyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZGLE9BQU87YUFDUjtpQkFBTTtnQkFDTCxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsdUNBQXVDO2dCQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQixJQUFJLG9CQUFvQixJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQzthQUNoRTtTQUNGO1FBQ0QsTUFBTSxvQkFBWSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEYsQ0FBQztDQUFBO0FBekJELDRCQXlCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL3ByZWJ1aWxkL2Rpc3QvY2xpLWRlcGxveS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge3NwYXdufSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHttYWluIGFzIHByZWJ1aWxkUG9zdH0gZnJvbSAnLi9wcmVidWlsZC1wb3N0JztcbmltcG9ydCAqIGFzIF9tYSBmcm9tICcuL21lcmdlLWFydGlmYWN0cyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jbGktZGVwbG95Jyk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKGlzU3RhdGljOiBib29sZWFuLCBlbnY6IHN0cmluZywgYXBwOiBzdHJpbmcsIHB1c2hCcmFuY2ggPSB0cnVlLFxuICBzZWNyZXQ6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwsIHNjcmlwdHNGaWxlPzogc3RyaW5nKSB7XG5cbiAgbG9nLmluZm8oYHBvc3QgYnVpbGQsIGVudjogJHtlbnZ9LCBBcHA6ICR7YXBwfSwgaXMgc3RhdGljOiAke2lzU3RhdGljfSwgYnVpbGQgc2NyaXB0OiAke3NjcmlwdHNGaWxlfWApO1xuICBpZiAocHVzaEJyYW5jaCkge1xuICAgIGF3YWl0IChyZXF1aXJlKCcuL21lcmdlLWFydGlmYWN0cycpIGFzIHR5cGVvZiBfbWEpLnByZXBhcmUoKTtcbiAgfVxuXG4gIGlmIChzY3JpcHRzRmlsZSkge1xuICAgIGlmIChzY3JpcHRzRmlsZS5lbmRzV2l0aCgnLnNoJykpIHtcbiAgICAgIGF3YWl0IHNwYXduKCdiYXNoJywgc2NyaXB0c0ZpbGUsIGVudiwgYXBwLCBpc1N0YXRpYyA/ICd0cnVlJyA6ICdmYWxzZScpLnByb21pc2U7XG4gICAgfSBlbHNlIGlmIChzY3JpcHRzRmlsZS5pbmRleE9mKCcjJykgPCAwKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGxvZy5lcnJvcihjaGFsay5yZWRCcmlnaHQoYFdyb25nIGZvcm1hdCBvZiAke3NjcmlwdHNGaWxlfSwgaW4gd2hpY2ggbm8gXCIjXCIgaXMgZm91bmRgKSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHNjcmlwdEFuZEZ1bmMgPSBzY3JpcHRzRmlsZS5zcGxpdCgnIycpO1xuICAgICAgY29uc3QgZmlsZSA9IHNjcmlwdEFuZEZ1bmNbMF07XG4gICAgICBjb25zdCBmdW5jID0gc2NyaXB0QW5kRnVuY1sxXTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oYGV4ZWN1dGluZyBmaWxlOiAke2ZpbGV9LCBmdW5jdGlvbiBuYW1lOiAke2Z1bmN9YCk7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUocmVxdWlyZShmaWxlKVtmdW5jXShlbnYsIGFwcCwgaXNTdGF0aWMpKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgcHJlYnVpbGRQb3N0KGVudiwgYXBwLCBpc1N0YXRpYywgcHVzaEJyYW5jaCwgc2VjcmV0ID8gc2VjcmV0IDogdW5kZWZpbmVkKTtcbn1cbiJdfQ==
