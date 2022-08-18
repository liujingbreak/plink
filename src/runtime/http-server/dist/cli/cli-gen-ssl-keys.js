"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genSslKeys = void 0;
const plink_1 = require("@wfh/plink");
const process_utils_1 = require("@wfh/plink/wfh/dist/process-utils");
const log = (0, plink_1.log4File)(__filename);
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';
async function genSslKeys() {
    const args = 'req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem'.split(/\s+/);
    log.info('run openssl', args);
    await (0, process_utils_1.exe)('openssl', ...args).promise;
    log.info('Start serve with arguments: "--prop @wfh/http-server.ssl.enabled=true"');
    // TODO: Your command job implementation here
}
exports.genSslKeys = genSslKeys;
//# sourceMappingURL=cli-gen-ssl-keys.js.map