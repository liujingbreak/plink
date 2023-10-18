"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log4File = void 0;
const node_path_1 = __importDefault(require("node:path"));
const log4js_1 = require("log4js");
const package_info_gathering_1 = require("./package-mgr/package-info-gathering");
/**
 * Get log4js Logger for specific node.js file, the output log will have
 * category in form of "<pkg name>.<file base name>"
 *
 * How to configure Plink log inside a self controlled process in simplest way:
   ```
   initProcess('none');
   logConfig(initConfig({})());
   const log = log4File(__filename);
   ```
   If your script is not started with Plink's command line extension or app server plugin package, you have to configure Logger like above code snippet

 * Usage:
 * - Common JS module (cjs): loggerForFile(__filename);
 * - EJS module (mjs): loggerForFile(new URL(import.meta.url).pathname)
 * @param file
 */
function log4File(file, subName) {
    const pkg = (0, package_info_gathering_1.packageOfFileFactory)().getPkgOfFile(file);
    if (pkg) {
        return (0, log4js_1.getLogger)(pkg.name + '.' + /^(.*?)\.[^.]*$/.exec(node_path_1.default.basename(file))[1] + (subName ? '.' + subName : ''));
    }
    else {
        return (0, log4js_1.getLogger)(/^(.*?)\.[^.]*$/.exec(node_path_1.default.basename(file))[1] + (subName ? '.' + subName : ''));
    }
}
exports.log4File = log4File;
//# sourceMappingURL=logger.js.map