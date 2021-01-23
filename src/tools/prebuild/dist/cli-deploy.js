"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __api_1 = __importDefault(require("__api"));
const log4js_1 = __importDefault(require("log4js"));
const process_utils_1 = require("@wfh/plink/wfh/dist/process-utils");
const chalk_1 = __importDefault(require("chalk"));
const prebuild_post_1 = require("./prebuild-post");
const path_1 = __importDefault(require("path"));
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.cli-deploy');
function default_1(isStatic, env, app, pushBranch = true, isForce, secret, scriptsFile, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
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
                yield Promise.resolve(require(path_1.default.resolve(file))[func](env, app, isStatic));
            }
        }
        yield prebuild_post_1.main(env, app, isStatic, pushBranch, isForce, secret ? secret : undefined, commitComment);
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWRlcGxveS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBd0I7QUFDeEIsb0RBQTRCO0FBQzVCLHFFQUF3RDtBQUN4RCxrREFBMEI7QUFDMUIsbURBQXFEO0FBQ3JELGdEQUF3QjtBQUd4QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBRTlELG1CQUE4QixRQUFpQixFQUFFLEdBQVcsRUFBRSxHQUFXLEVBQUUsVUFBVSxHQUFHLElBQUksRUFDMUYsT0FBZ0IsRUFDaEIsTUFBaUMsRUFBRSxXQUFvQixFQUFFLGFBQXNCOztRQUUvRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFVBQVUsR0FBRyxnQkFBZ0IsUUFBUSxtQkFBbUIsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN2RyxJQUFJLFVBQVUsRUFBRTtZQUNkLE1BQU8sT0FBTyxDQUFDLG1CQUFtQixDQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQzlEO1FBRUQsSUFBSSxXQUFXLEVBQUU7WUFDZixJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQy9CLE1BQU0scUJBQUssQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQzthQUNqRjtpQkFBTSxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN2Qyx1Q0FBdUM7Z0JBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBSyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsV0FBVyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZGLE9BQU87YUFDUjtpQkFBTTtnQkFDTCxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsdUNBQXVDO2dCQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQixJQUFJLG9CQUFvQixJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7YUFDOUU7U0FDRjtRQUNELE1BQU0sb0JBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDMUcsQ0FBQztDQUFBO0FBMUJELDRCQTBCQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge3NwYXdufSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7bWFpbiBhcyBwcmVidWlsZFBvc3R9IGZyb20gJy4vcHJlYnVpbGQtcG9zdCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF9tYSBmcm9tICcuL21lcmdlLWFydGlmYWN0cyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jbGktZGVwbG95Jyk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKGlzU3RhdGljOiBib29sZWFuLCBlbnY6IHN0cmluZywgYXBwOiBzdHJpbmcsIHB1c2hCcmFuY2ggPSB0cnVlLFxuICBpc0ZvcmNlOiBib29sZWFuLFxuICBzZWNyZXQ6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwsIHNjcmlwdHNGaWxlPzogc3RyaW5nLCBjb21taXRDb21tZW50Pzogc3RyaW5nKSB7XG5cbiAgbG9nLmluZm8oYHBvc3QgYnVpbGQsIGVudjogJHtlbnZ9LCBBcHA6ICR7YXBwfSwgaXMgc3RhdGljOiAke2lzU3RhdGljfSwgYnVpbGQgc2NyaXB0OiAke3NjcmlwdHNGaWxlfWApO1xuICBpZiAocHVzaEJyYW5jaCkge1xuICAgIGF3YWl0IChyZXF1aXJlKCcuL21lcmdlLWFydGlmYWN0cycpIGFzIHR5cGVvZiBfbWEpLnByZXBhcmUoKTtcbiAgfVxuXG4gIGlmIChzY3JpcHRzRmlsZSkge1xuICAgIGlmIChzY3JpcHRzRmlsZS5lbmRzV2l0aCgnLnNoJykpIHtcbiAgICAgIGF3YWl0IHNwYXduKCdiYXNoJywgc2NyaXB0c0ZpbGUsIGVudiwgYXBwLCBpc1N0YXRpYyA/ICd0cnVlJyA6ICdmYWxzZScpLnByb21pc2U7XG4gICAgfSBlbHNlIGlmIChzY3JpcHRzRmlsZS5pbmRleE9mKCcjJykgPCAwKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGxvZy5lcnJvcihjaGFsay5yZWRCcmlnaHQoYFdyb25nIGZvcm1hdCBvZiAke3NjcmlwdHNGaWxlfSwgaW4gd2hpY2ggbm8gXCIjXCIgaXMgZm91bmRgKSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHNjcmlwdEFuZEZ1bmMgPSBzY3JpcHRzRmlsZS5zcGxpdCgnIycpO1xuICAgICAgY29uc3QgZmlsZSA9IHNjcmlwdEFuZEZ1bmNbMF07XG4gICAgICBjb25zdCBmdW5jID0gc2NyaXB0QW5kRnVuY1sxXTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oYGV4ZWN1dGluZyBmaWxlOiAke2ZpbGV9LCBmdW5jdGlvbiBuYW1lOiAke2Z1bmN9YCk7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUocmVxdWlyZShQYXRoLnJlc29sdmUoZmlsZSkpW2Z1bmNdKGVudiwgYXBwLCBpc1N0YXRpYykpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBwcmVidWlsZFBvc3QoZW52LCBhcHAsIGlzU3RhdGljLCBwdXNoQnJhbmNoLCBpc0ZvcmNlLCBzZWNyZXQgPyBzZWNyZXQgOiB1bmRlZmluZWQsIGNvbW1pdENvbW1lbnQpO1xufVxuIl19