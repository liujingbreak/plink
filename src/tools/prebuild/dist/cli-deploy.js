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

//# sourceMappingURL=cli-deploy.js.map
