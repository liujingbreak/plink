"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = exports.defaultSetting = void 0;
const plink_1 = require("@wfh/plink");
const defaultSetting = (cliOption) => {
    const defaultValue = {
        basename: '/plink'
    };
    return defaultValue;
};
exports.defaultSetting = defaultSetting;
exports.defaultSetting.setupWebInjector = (factory, setting) => {
};
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
function getSetting() {
    // tslint:disable:no-string-literal
    return (0, plink_1.config)()['@wfh/doc-entry'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=doc-entry-setting.js.map