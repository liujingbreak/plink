"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process_utils_1 = require("../process-utils");
async function ensureNodeVersion() {
    const output = await (0, process_utils_1.promisifySpawn)('node', '-v', { silent: true });
    const match = /^v?([^]+)$/.exec(output.trim());
    if (match) {
        if (parseInt(match[1].split('.')[0], 10) < 12) {
            // eslint-disable-next-line no-console
            console.log('Please upgrade Node.js version to v12, current version: ' + match[1]);
            // try {
            //   await require('open')('https://nodejs.org/');
            // } catch (ex) {
            //   // It is OK for errors, probably dependency 'open' is not installed yet
            // }
            // throw new Error('Please upgrade Node.js version to v12');
        }
    }
    else {
        // eslint-disable-next-line no-console
        console.log('Can not recognize "node -v" output:', output);
        throw new Error('Can not recognize "node -v" output:' + output);
    }
}
exports.default = ensureNodeVersion;
//# sourceMappingURL=node-version-check.js.map