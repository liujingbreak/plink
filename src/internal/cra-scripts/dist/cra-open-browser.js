"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
function openBrowser(url) {
    const setting = (0, plink_1.config)()['@wfh/cra-scripts'].openBrowser;
    if (setting !== false) {
        return require('react-dev-utils/openBrowser')(setting ? setting : url);
    }
    return true;
}
exports.default = openBrowser;
//# sourceMappingURL=cra-open-browser.js.map