"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = exports.defaultSetting = void 0;
const plink_1 = require("@wfh/plink");
/**
 * Plink runs this funtion to get package level setting value
 */
function defaultSetting() {
    var _a, _b;
    const defaultValue = {
        ssl: {
            enabled: false,
            key: 'key.pem',
            cert: 'cert.pem',
            port: 443,
            httpForward: true
        },
        noHealthCheck: false,
        hostnames: []
    };
    // Return settings based on command line option "dev"
    if ((_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.dev) {
        defaultValue.noHealthCheck = true;
    }
    const env = (_b = (0, plink_1.config)().cliOptions) === null || _b === void 0 ? void 0 : _b.env;
    // Return settings based on command line option "env"
    if (env === 'local') {
        defaultValue.noHealthCheck = true;
    }
    return defaultValue;
}
exports.defaultSetting = defaultSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
function getSetting() {
    /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
    return (0, plink_1.config)()['@wfh/http-server'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=http-server-setting.js.map