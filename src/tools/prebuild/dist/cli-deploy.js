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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWRlcGxveS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBd0I7QUFDeEIscUVBQXdEO0FBQ3hELGtEQUEwQjtBQUMxQixtREFBcUQ7QUFDckQsZ0RBQXdCO0FBR3hCLE1BQU0sR0FBRyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUM7QUFFdkIsbUJBQThCLFFBQWlCLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxVQUFVLEdBQUcsSUFBSSxFQUMxRixPQUFnQixFQUNoQixNQUFpQyxFQUFFLFdBQW9CLEVBQUUsYUFBc0I7O1FBRS9FLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsVUFBVSxHQUFHLGdCQUFnQixRQUFRLG1CQUFtQixXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZHLE1BQU8sT0FBTyxDQUFDLG1CQUFtQixDQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRTdELElBQUksV0FBVyxFQUFFO1lBQ2YsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUMvQixNQUFNLEVBQUUscUJBQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM1QixPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUM7Z0JBQ2xCLE1BQU0scUJBQUssQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRTtvQkFDdEUsR0FBRyxFQUFFLEVBQUU7aUJBQ1IsQ0FBQyxDQUFDLE9BQU8sQ0FBQzthQUNaO2lCQUFNLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3ZDLHVDQUF1QztnQkFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFLLENBQUMsU0FBUyxDQUFDLG1CQUFtQixXQUFXLDRCQUE0QixDQUFDLENBQUMsQ0FBQztnQkFDdkYsT0FBTzthQUNSO2lCQUFNO2dCQUNMLE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzdDLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5Qix1Q0FBdUM7Z0JBQ3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLElBQUksb0JBQW9CLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQzVELE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQzthQUM5RTtTQUNGO1FBQ0QsTUFBTSxvQkFBWSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUMxRyxDQUFDO0NBQUE7QUE1QkQsNEJBNEJDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7c3Bhd259IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHttYWluIGFzIHByZWJ1aWxkUG9zdH0gZnJvbSAnLi9wcmVidWlsZC1wb3N0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgX21hIGZyb20gJy4vbWVyZ2UtYXJ0aWZhY3RzJztcblxuY29uc3QgbG9nID0gYXBpLmxvZ2dlcjtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24oaXNTdGF0aWM6IGJvb2xlYW4sIGVudjogc3RyaW5nLCBhcHA6IHN0cmluZywgcHVzaEJyYW5jaCA9IHRydWUsXG4gIGlzRm9yY2U6IGJvb2xlYW4sXG4gIHNlY3JldDogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCwgc2NyaXB0c0ZpbGU/OiBzdHJpbmcsIGNvbW1pdENvbW1lbnQ/OiBzdHJpbmcpIHtcblxuICBsb2cuaW5mbyhgcG9zdCBidWlsZCwgZW52OiAke2Vudn0sIEFwcDogJHthcHB9LCBpcyBzdGF0aWM6ICR7aXNTdGF0aWN9LCBidWlsZCBzY3JpcHQ6ICR7c2NyaXB0c0ZpbGV9YCk7XG4gIGF3YWl0IChyZXF1aXJlKCcuL21lcmdlLWFydGlmYWN0cycpIGFzIHR5cGVvZiBfbWEpLnByZXBhcmUoKTtcblxuICBpZiAoc2NyaXB0c0ZpbGUpIHtcbiAgICBpZiAoc2NyaXB0c0ZpbGUuZW5kc1dpdGgoJy5zaCcpKSB7XG4gICAgICBjb25zdCBldiA9IHsuLi5wcm9jZXNzLmVudn07XG4gICAgICBkZWxldGUgZXYuX19wbGluaztcbiAgICAgIGF3YWl0IHNwYXduKCdiYXNoJywgc2NyaXB0c0ZpbGUsIGVudiwgYXBwLCBpc1N0YXRpYyA/ICd0cnVlJyA6ICdmYWxzZScsIHtcbiAgICAgICAgZW52OiBldlxuICAgICAgfSkucHJvbWlzZTtcbiAgICB9IGVsc2UgaWYgKHNjcmlwdHNGaWxlLmluZGV4T2YoJyMnKSA8IDApIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLmVycm9yKGNoYWxrLnJlZEJyaWdodChgV3JvbmcgZm9ybWF0IG9mICR7c2NyaXB0c0ZpbGV9LCBpbiB3aGljaCBubyBcIiNcIiBpcyBmb3VuZGApKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc2NyaXB0QW5kRnVuYyA9IHNjcmlwdHNGaWxlLnNwbGl0KCcjJyk7XG4gICAgICBjb25zdCBmaWxlID0gc2NyaXB0QW5kRnVuY1swXTtcbiAgICAgIGNvbnN0IGZ1bmMgPSBzY3JpcHRBbmRGdW5jWzFdO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbyhgZXhlY3V0aW5nIGZpbGU6ICR7ZmlsZX0sIGZ1bmN0aW9uIG5hbWU6ICR7ZnVuY31gKTtcbiAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShyZXF1aXJlKFBhdGgucmVzb2x2ZShmaWxlKSlbZnVuY10oZW52LCBhcHAsIGlzU3RhdGljKSk7XG4gICAgfVxuICB9XG4gIGF3YWl0IHByZWJ1aWxkUG9zdChlbnYsIGFwcCwgaXNTdGF0aWMsIHB1c2hCcmFuY2gsIGlzRm9yY2UsIHNlY3JldCA/IHNlY3JldCA6IHVuZGVmaW5lZCwgY29tbWl0Q29tbWVudCk7XG59XG4iXX0=