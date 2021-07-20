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
        log.info(`post build, env: ${env}, App: ${app}, is static: ${isStatic}, build script: ${scriptsFile || '<unknown>'}`);
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
                // eslint-disable-next-line no-console
                log.error(chalk_1.default.redBright(`Wrong format of ${scriptsFile}, in which no "#" is found`));
                return;
            }
            else {
                const scriptAndFunc = scriptsFile.split('#');
                const file = scriptAndFunc[0];
                const func = scriptAndFunc[1];
                // eslint-disable-next-line no-console
                log.info(`executing file: ${file}, function name: ${func}`);
                yield Promise.resolve(require(path_1.default.resolve(file))[func](env, app, isStatic));
            }
        }
        yield prebuild_post_1.main(env, app, isStatic, pushBranch, isForce, secret ? secret : undefined, commitComment);
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWRlcGxveS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBd0I7QUFDeEIscUVBQXdEO0FBQ3hELGtEQUEwQjtBQUMxQixtREFBcUQ7QUFDckQsZ0RBQXdCO0FBR3hCLE1BQU0sR0FBRyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUM7QUFFdkIsbUJBQThCLFFBQWlCLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxVQUFVLEdBQUcsSUFBSSxFQUMxRixPQUFnQixFQUNoQixNQUFpQyxFQUFFLFdBQW9CLEVBQUUsYUFBc0I7O1FBRS9FLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsVUFBVSxHQUFHLGdCQUFnQixRQUFRLG1CQUFtQixXQUFXLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN0SCxNQUFPLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUU3RCxJQUFJLFdBQVcsRUFBRTtZQUNmLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDL0IsTUFBTSxFQUFFLHFCQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDNUIsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDO2dCQUNsQixPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUM7Z0JBQ3pCLE1BQU0scUJBQUssQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRTtvQkFDdEUsR0FBRyxFQUFFLEVBQUU7aUJBQ1IsQ0FBQyxDQUFDLE9BQU8sQ0FBQzthQUNaO2lCQUFNLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3ZDLHNDQUFzQztnQkFDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFLLENBQUMsU0FBUyxDQUFDLG1CQUFtQixXQUFXLDRCQUE0QixDQUFDLENBQUMsQ0FBQztnQkFDdkYsT0FBTzthQUNSO2lCQUFNO2dCQUNMLE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzdDLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixzQ0FBc0M7Z0JBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLElBQUksb0JBQW9CLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQzVELE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQzthQUM5RTtTQUNGO1FBQ0QsTUFBTSxvQkFBWSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUMxRyxDQUFDO0NBQUE7QUE3QkQsNEJBNkJDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7c3Bhd259IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHttYWluIGFzIHByZWJ1aWxkUG9zdH0gZnJvbSAnLi9wcmVidWlsZC1wb3N0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgX21hIGZyb20gJy4vbWVyZ2UtYXJ0aWZhY3RzJztcblxuY29uc3QgbG9nID0gYXBpLmxvZ2dlcjtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24oaXNTdGF0aWM6IGJvb2xlYW4sIGVudjogc3RyaW5nLCBhcHA6IHN0cmluZywgcHVzaEJyYW5jaCA9IHRydWUsXG4gIGlzRm9yY2U6IGJvb2xlYW4sXG4gIHNlY3JldDogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCwgc2NyaXB0c0ZpbGU/OiBzdHJpbmcsIGNvbW1pdENvbW1lbnQ/OiBzdHJpbmcpIHtcblxuICBsb2cuaW5mbyhgcG9zdCBidWlsZCwgZW52OiAke2Vudn0sIEFwcDogJHthcHB9LCBpcyBzdGF0aWM6ICR7aXNTdGF0aWN9LCBidWlsZCBzY3JpcHQ6ICR7c2NyaXB0c0ZpbGUgfHwgJzx1bmtub3duPid9YCk7XG4gIGF3YWl0IChyZXF1aXJlKCcuL21lcmdlLWFydGlmYWN0cycpIGFzIHR5cGVvZiBfbWEpLnByZXBhcmUoKTtcblxuICBpZiAoc2NyaXB0c0ZpbGUpIHtcbiAgICBpZiAoc2NyaXB0c0ZpbGUuZW5kc1dpdGgoJy5zaCcpKSB7XG4gICAgICBjb25zdCBldiA9IHsuLi5wcm9jZXNzLmVudn07XG4gICAgICBkZWxldGUgZXYuX19wbGluaztcbiAgICAgIGRlbGV0ZSBldi5QTElOS19DTElfT1BUUztcbiAgICAgIGF3YWl0IHNwYXduKCdiYXNoJywgc2NyaXB0c0ZpbGUsIGVudiwgYXBwLCBpc1N0YXRpYyA/ICd0cnVlJyA6ICdmYWxzZScsIHtcbiAgICAgICAgZW52OiBldlxuICAgICAgfSkucHJvbWlzZTtcbiAgICB9IGVsc2UgaWYgKHNjcmlwdHNGaWxlLmluZGV4T2YoJyMnKSA8IDApIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBsb2cuZXJyb3IoY2hhbGsucmVkQnJpZ2h0KGBXcm9uZyBmb3JtYXQgb2YgJHtzY3JpcHRzRmlsZX0sIGluIHdoaWNoIG5vIFwiI1wiIGlzIGZvdW5kYCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzY3JpcHRBbmRGdW5jID0gc2NyaXB0c0ZpbGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IGZpbGUgPSBzY3JpcHRBbmRGdW5jWzBdO1xuICAgICAgY29uc3QgZnVuYyA9IHNjcmlwdEFuZEZ1bmNbMV07XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oYGV4ZWN1dGluZyBmaWxlOiAke2ZpbGV9LCBmdW5jdGlvbiBuYW1lOiAke2Z1bmN9YCk7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUocmVxdWlyZShQYXRoLnJlc29sdmUoZmlsZSkpW2Z1bmNdKGVudiwgYXBwLCBpc1N0YXRpYykpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBwcmVidWlsZFBvc3QoZW52LCBhcHAsIGlzU3RhdGljLCBwdXNoQnJhbmNoLCBpc0ZvcmNlLCBzZWNyZXQgPyBzZWNyZXQgOiB1bmRlZmluZWQsIGNvbW1pdENvbW1lbnQpO1xufVxuIl19