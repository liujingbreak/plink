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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWRlcGxveS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBd0I7QUFDeEIsb0RBQTRCO0FBQzVCLHFFQUF3RDtBQUN4RCxrREFBMEI7QUFDMUIsbURBQXFEO0FBQ3JELGdEQUF3QjtBQUd4QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBRTlELG1CQUE4QixRQUFpQixFQUFFLEdBQVcsRUFBRSxHQUFXLEVBQUUsVUFBVSxHQUFHLElBQUksRUFDMUYsT0FBZ0IsRUFDaEIsTUFBaUMsRUFBRSxXQUFvQixFQUFFLGFBQXNCOztRQUUvRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFVBQVUsR0FBRyxnQkFBZ0IsUUFBUSxtQkFBbUIsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN2RyxJQUFJLFVBQVUsRUFBRTtZQUNkLE1BQU8sT0FBTyxDQUFDLG1CQUFtQixDQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQzlEO1FBRUQsSUFBSSxXQUFXLEVBQUU7WUFDZixJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQy9CLE1BQU0sRUFBRSxxQkFBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzVCLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQztnQkFDbEIsTUFBTSxxQkFBSyxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFO29CQUN0RSxHQUFHLEVBQUUsRUFBRTtpQkFDUixDQUFDLENBQUMsT0FBTyxDQUFDO2FBQ1o7aUJBQU0sSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdkMsdUNBQXVDO2dCQUN2QyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQUssQ0FBQyxTQUFTLENBQUMsbUJBQW1CLFdBQVcsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO2dCQUN2RixPQUFPO2FBQ1I7aUJBQU07Z0JBQ0wsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLHVDQUF1QztnQkFDdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxvQkFBb0IsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDNUQsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQzlFO1NBQ0Y7UUFDRCxNQUFNLG9CQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQzFHLENBQUM7Q0FBQTtBQTlCRCw0QkE4QkMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtzcGF3bn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge21haW4gYXMgcHJlYnVpbGRQb3N0fSBmcm9tICcuL3ByZWJ1aWxkLXBvc3QnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfbWEgZnJvbSAnLi9tZXJnZS1hcnRpZmFjdHMnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuY2xpLWRlcGxveScpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihpc1N0YXRpYzogYm9vbGVhbiwgZW52OiBzdHJpbmcsIGFwcDogc3RyaW5nLCBwdXNoQnJhbmNoID0gdHJ1ZSxcbiAgaXNGb3JjZTogYm9vbGVhbixcbiAgc2VjcmV0OiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsLCBzY3JpcHRzRmlsZT86IHN0cmluZywgY29tbWl0Q29tbWVudD86IHN0cmluZykge1xuXG4gIGxvZy5pbmZvKGBwb3N0IGJ1aWxkLCBlbnY6ICR7ZW52fSwgQXBwOiAke2FwcH0sIGlzIHN0YXRpYzogJHtpc1N0YXRpY30sIGJ1aWxkIHNjcmlwdDogJHtzY3JpcHRzRmlsZX1gKTtcbiAgaWYgKHB1c2hCcmFuY2gpIHtcbiAgICBhd2FpdCAocmVxdWlyZSgnLi9tZXJnZS1hcnRpZmFjdHMnKSBhcyB0eXBlb2YgX21hKS5wcmVwYXJlKCk7XG4gIH1cblxuICBpZiAoc2NyaXB0c0ZpbGUpIHtcbiAgICBpZiAoc2NyaXB0c0ZpbGUuZW5kc1dpdGgoJy5zaCcpKSB7XG4gICAgICBjb25zdCBldiA9IHsuLi5wcm9jZXNzLmVudn07XG4gICAgICBkZWxldGUgZXYuX19wbGluaztcbiAgICAgIGF3YWl0IHNwYXduKCdiYXNoJywgc2NyaXB0c0ZpbGUsIGVudiwgYXBwLCBpc1N0YXRpYyA/ICd0cnVlJyA6ICdmYWxzZScsIHtcbiAgICAgICAgZW52OiBldlxuICAgICAgfSkucHJvbWlzZTtcbiAgICB9IGVsc2UgaWYgKHNjcmlwdHNGaWxlLmluZGV4T2YoJyMnKSA8IDApIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLmVycm9yKGNoYWxrLnJlZEJyaWdodChgV3JvbmcgZm9ybWF0IG9mICR7c2NyaXB0c0ZpbGV9LCBpbiB3aGljaCBubyBcIiNcIiBpcyBmb3VuZGApKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc2NyaXB0QW5kRnVuYyA9IHNjcmlwdHNGaWxlLnNwbGl0KCcjJyk7XG4gICAgICBjb25zdCBmaWxlID0gc2NyaXB0QW5kRnVuY1swXTtcbiAgICAgIGNvbnN0IGZ1bmMgPSBzY3JpcHRBbmRGdW5jWzFdO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbyhgZXhlY3V0aW5nIGZpbGU6ICR7ZmlsZX0sIGZ1bmN0aW9uIG5hbWU6ICR7ZnVuY31gKTtcbiAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShyZXF1aXJlKFBhdGgucmVzb2x2ZShmaWxlKSlbZnVuY10oZW52LCBhcHAsIGlzU3RhdGljKSk7XG4gICAgfVxuICB9XG4gIGF3YWl0IHByZWJ1aWxkUG9zdChlbnYsIGFwcCwgaXNTdGF0aWMsIHB1c2hCcmFuY2gsIGlzRm9yY2UsIHNlY3JldCA/IHNlY3JldCA6IHVuZGVmaW5lZCwgY29tbWl0Q29tbWVudCk7XG59XG4iXX0=