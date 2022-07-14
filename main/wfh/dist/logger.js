"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log4File = void 0;
const tslib_1 = require("tslib");
const log4js = tslib_1.__importStar(require("log4js"));
const package_info_gathering_1 = require("./package-mgr/package-info-gathering");
const path_1 = tslib_1.__importDefault(require("path"));
/**
 * Get log4js Logger for specific node.js file, the output log will have
 * category in form of "<pkg name>.<file base name>"
 *
 * Usage:
 * - Common JS module (cjs): loggerForFile(__filename);
 * - EJS module (mjs): loggerForFile(new URL(import.meta.url).pathname)
 * @param file
 */
function log4File(file) {
    const pkg = (0, package_info_gathering_1.packageOfFileFactory)().getPkgOfFile(file);
    if (pkg) {
        return log4js.getLogger(pkg.name + '.' + /^(.*?)\.[^.]*$/.exec(path_1.default.basename(file))[1]);
    }
    else {
        return log4js.getLogger(/^(.*?)\.[^.]*$/.exec(path_1.default.basename(file))[1]);
    }
}
exports.log4File = log4File;
//# sourceMappingURL=logger.js.map