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
const process_utils_1 = require("@wfh/plink/wfh/dist/process-utils");
const chalk_1 = __importDefault(require("chalk"));
const prebuild_post_1 = require("./prebuild-post");
const path_1 = __importDefault(require("path"));
const log = __api_1.default.logger;
function default_1(isStatic, env, app, pushBranch = true, isForce, secret, scriptsFile, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        log.info(`post build, env: ${env}, App: ${app}, is static: ${isStatic}, build script: ${scriptsFile}`);
        yield require('./merge-artifacts').prepare();
        if (scriptsFile) {
            if (scriptsFile.endsWith('.sh')) {
                const ev = Object.assign({}, process.env);
                delete ev.__plink;
                delete ev.PLINK_CLI_OPTS;
                yield process_utils_1.spawn('bash', scriptsFile, env, app, isStatic ? 'true' : 'false', {
                    env: ev
                }).promise;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWRlcGxveS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBd0I7QUFDeEIscUVBQXdEO0FBQ3hELGtEQUEwQjtBQUMxQixtREFBcUQ7QUFDckQsZ0RBQXdCO0FBR3hCLE1BQU0sR0FBRyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUM7QUFFdkIsbUJBQThCLFFBQWlCLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxVQUFVLEdBQUcsSUFBSSxFQUMxRixPQUFnQixFQUNoQixNQUFpQyxFQUFFLFdBQW9CLEVBQUUsYUFBc0I7O1FBRS9FLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsVUFBVSxHQUFHLGdCQUFnQixRQUFRLG1CQUFtQixXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZHLE1BQU8sT0FBTyxDQUFDLG1CQUFtQixDQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRTdELElBQUksV0FBVyxFQUFFO1lBQ2YsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUMvQixNQUFNLEVBQUUscUJBQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM1QixPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUM7Z0JBQ2xCLE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQztnQkFDekIsTUFBTSxxQkFBSyxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFO29CQUN0RSxHQUFHLEVBQUUsRUFBRTtpQkFDUixDQUFDLENBQUMsT0FBTyxDQUFDO2FBQ1o7aUJBQU0sSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdkMsdUNBQXVDO2dCQUN2QyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQUssQ0FBQyxTQUFTLENBQUMsbUJBQW1CLFdBQVcsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO2dCQUN2RixPQUFPO2FBQ1I7aUJBQU07Z0JBQ0wsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLHVDQUF1QztnQkFDdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxvQkFBb0IsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDNUQsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQzlFO1NBQ0Y7UUFDRCxNQUFNLG9CQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQzFHLENBQUM7Q0FBQTtBQTdCRCw0QkE2QkMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtzcGF3bn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge21haW4gYXMgcHJlYnVpbGRQb3N0fSBmcm9tICcuL3ByZWJ1aWxkLXBvc3QnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfbWEgZnJvbSAnLi9tZXJnZS1hcnRpZmFjdHMnO1xuXG5jb25zdCBsb2cgPSBhcGkubG9nZ2VyO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihpc1N0YXRpYzogYm9vbGVhbiwgZW52OiBzdHJpbmcsIGFwcDogc3RyaW5nLCBwdXNoQnJhbmNoID0gdHJ1ZSxcbiAgaXNGb3JjZTogYm9vbGVhbixcbiAgc2VjcmV0OiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsLCBzY3JpcHRzRmlsZT86IHN0cmluZywgY29tbWl0Q29tbWVudD86IHN0cmluZykge1xuXG4gIGxvZy5pbmZvKGBwb3N0IGJ1aWxkLCBlbnY6ICR7ZW52fSwgQXBwOiAke2FwcH0sIGlzIHN0YXRpYzogJHtpc1N0YXRpY30sIGJ1aWxkIHNjcmlwdDogJHtzY3JpcHRzRmlsZX1gKTtcbiAgYXdhaXQgKHJlcXVpcmUoJy4vbWVyZ2UtYXJ0aWZhY3RzJykgYXMgdHlwZW9mIF9tYSkucHJlcGFyZSgpO1xuXG4gIGlmIChzY3JpcHRzRmlsZSkge1xuICAgIGlmIChzY3JpcHRzRmlsZS5lbmRzV2l0aCgnLnNoJykpIHtcbiAgICAgIGNvbnN0IGV2ID0gey4uLnByb2Nlc3MuZW52fTtcbiAgICAgIGRlbGV0ZSBldi5fX3BsaW5rO1xuICAgICAgZGVsZXRlIGV2LlBMSU5LX0NMSV9PUFRTO1xuICAgICAgYXdhaXQgc3Bhd24oJ2Jhc2gnLCBzY3JpcHRzRmlsZSwgZW52LCBhcHAsIGlzU3RhdGljID8gJ3RydWUnIDogJ2ZhbHNlJywge1xuICAgICAgICBlbnY6IGV2XG4gICAgICB9KS5wcm9taXNlO1xuICAgIH0gZWxzZSBpZiAoc2NyaXB0c0ZpbGUuaW5kZXhPZignIycpIDwgMCkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cuZXJyb3IoY2hhbGsucmVkQnJpZ2h0KGBXcm9uZyBmb3JtYXQgb2YgJHtzY3JpcHRzRmlsZX0sIGluIHdoaWNoIG5vIFwiI1wiIGlzIGZvdW5kYCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzY3JpcHRBbmRGdW5jID0gc2NyaXB0c0ZpbGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IGZpbGUgPSBzY3JpcHRBbmRGdW5jWzBdO1xuICAgICAgY29uc3QgZnVuYyA9IHNjcmlwdEFuZEZ1bmNbMV07XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKGBleGVjdXRpbmcgZmlsZTogJHtmaWxlfSwgZnVuY3Rpb24gbmFtZTogJHtmdW5jfWApO1xuICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoUGF0aC5yZXNvbHZlKGZpbGUpKVtmdW5jXShlbnYsIGFwcCwgaXNTdGF0aWMpKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgcHJlYnVpbGRQb3N0KGVudiwgYXBwLCBpc1N0YXRpYywgcHVzaEJyYW5jaCwgaXNGb3JjZSwgc2VjcmV0ID8gc2VjcmV0IDogdW5kZWZpbmVkLCBjb21taXRDb21tZW50KTtcbn1cbiJdfQ==