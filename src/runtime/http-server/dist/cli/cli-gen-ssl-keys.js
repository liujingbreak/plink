"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genSslKeys = void 0;
const plink_1 = require("@wfh/plink");
const process_utils_1 = require("@wfh/plink/wfh/dist/process-utils");
const log = plink_1.log4File(__filename);
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';
function genSslKeys() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = 'req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem'.split(/\s+/);
        log.info('run openssl', args);
        yield process_utils_1.exe('openssl', ...args).promise;
        log.info('Start serve with arguments: "--prop @wfh/http-server.ssl.enabled=true"');
        // TODO: Your command job implementation here
    });
}
exports.genSslKeys = genSslKeys;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdlbi1zc2wta2V5cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1nZW4tc3NsLWtleXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQW9DO0FBQ3BDLHFFQUFzRDtBQUN0RCxNQUFNLEdBQUcsR0FBRyxnQkFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLDJEQUEyRDtBQUMzRCw2QkFBNkI7QUFFN0IsU0FBc0IsVUFBVTs7UUFDOUIsTUFBTSxJQUFJLEdBQUcsMkVBQTJFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlCLE1BQU0sbUJBQUcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyx3RUFBd0UsQ0FBQyxDQUFDO1FBQ25GLDZDQUE2QztJQUMvQyxDQUFDO0NBQUE7QUFORCxnQ0FNQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7bG9nNEZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtleGV9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbi8vIENoYWxrIGlzIHVzZWZ1bCBmb3IgcHJpbnRpbmcgY29sb3JmdWwgdGV4dCBpbiBhIHRlcm1pbmFsXG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuU3NsS2V5cygpIHtcbiAgY29uc3QgYXJncyA9ICdyZXEgLW5ld2tleSByc2E6MjA0OCAtbm9kZXMgLWtleW91dCBrZXkucGVtIC14NTA5IC1kYXlzIDM2NSAtb3V0IGNlcnQucGVtJy5zcGxpdCgvXFxzKy8pO1xuICBsb2cuaW5mbygncnVuIG9wZW5zc2wnLCBhcmdzKTtcbiAgYXdhaXQgZXhlKCdvcGVuc3NsJywgLi4uYXJncykucHJvbWlzZTtcbiAgbG9nLmluZm8oJ1N0YXJ0IHNlcnZlIHdpdGggYXJndW1lbnRzOiBcIi0tcHJvcCBAd2ZoL2h0dHAtc2VydmVyLnNzbC5lbmFibGVkPXRydWVcIicpO1xuICAvLyBUT0RPOiBZb3VyIGNvbW1hbmQgam9iIGltcGxlbWVudGF0aW9uIGhlcmVcbn1cbiJdfQ==