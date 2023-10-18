"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = exports.defaultSetting = void 0;
const plink_1 = require("@wfh/plink");
/**
 * Plink runs this funtion to get package level setting value
 */
function defaultSetting() {
    return {
        enableCORS: true
    };
}
exports.defaultSetting = defaultSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
function getSetting() {
    /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
    return (0, plink_1.config)()['@wfh/express-app'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=express-app-setting.js.map