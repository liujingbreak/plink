"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ping = void 0;
const tslib_1 = require("tslib");
const http_1 = tslib_1.__importDefault(require("http"));
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
function ping() {
    const req = http_1.default.request('http://localhost:14333/takeMeToPing', {
        method: 'POST'
    });
    req.on('response', (res) => {
        const bufs = [];
        res.on('data', data => bufs.push(data));
        res.on('end', () => {
            log.info('response', Buffer.concat(bufs).toString('utf8'));
        });
    });
    req.end('hellow world');
}
exports.ping = ping;
//# sourceMappingURL=ping-client.js.map