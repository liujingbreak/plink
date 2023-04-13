"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
function testSSL(endPoint, caFile) {
    let ca;
    if (caFile && fs_1.default.existsSync(caFile)) {
        ca = fs_1.default.readFileSync(caFile);
    }
    return new Promise((resolve, rej) => {
        https_1.default.get('https://' + endPoint, { ca }, res => {
            res.setEncoding('utf8');
            res.on('data', data => {
                console.log(data);
            });
            res.on('end', () => resolve());
        }).on('error', err => {
            console.error(`Failed to connect ${endPoint},\n` + err);
            rej(err);
            // process.exit(1);
        }).end();
    });
}
void Promise.all([
    testSSL('www.baidu.com', process.argv[2]).catch(() => { }),
    testSSL('www.bing.com', process.argv[2]).catch((() => { }))
]);
//# sourceMappingURL=test-ssl.js.map