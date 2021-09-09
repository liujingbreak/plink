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
const log = (0, plink_1.log4File)(__filename);
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';
function genSslKeys() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = 'req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem'.split(/\s+/);
        log.info('run openssl', args);
        yield (0, process_utils_1.exe)('openssl', ...args).promise;
        log.info('Start serve with arguments: "--prop @wfh/http-server.ssl.enabled=true"');
        // TODO: Your command job implementation here
    });
}
exports.genSslKeys = genSslKeys;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdlbi1zc2wta2V5cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1nZW4tc3NsLWtleXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQW9DO0FBQ3BDLHFFQUFzRDtBQUN0RCxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsMkRBQTJEO0FBQzNELDZCQUE2QjtBQUU3QixTQUFzQixVQUFVOztRQUM5QixNQUFNLElBQUksR0FBRywyRUFBMkUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUIsTUFBTSxJQUFBLG1CQUFHLEVBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0VBQXdFLENBQUMsQ0FBQztRQUNuRiw2Q0FBNkM7SUFDL0MsQ0FBQztDQUFBO0FBTkQsZ0NBTUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2xvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7ZXhlfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG4vLyBDaGFsayBpcyB1c2VmdWwgZm9yIHByaW50aW5nIGNvbG9yZnVsIHRleHQgaW4gYSB0ZXJtaW5hbFxuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlblNzbEtleXMoKSB7XG4gIGNvbnN0IGFyZ3MgPSAncmVxIC1uZXdrZXkgcnNhOjIwNDggLW5vZGVzIC1rZXlvdXQga2V5LnBlbSAteDUwOSAtZGF5cyAzNjUgLW91dCBjZXJ0LnBlbScuc3BsaXQoL1xccysvKTtcbiAgbG9nLmluZm8oJ3J1biBvcGVuc3NsJywgYXJncyk7XG4gIGF3YWl0IGV4ZSgnb3BlbnNzbCcsIC4uLmFyZ3MpLnByb21pc2U7XG4gIGxvZy5pbmZvKCdTdGFydCBzZXJ2ZSB3aXRoIGFyZ3VtZW50czogXCItLXByb3AgQHdmaC9odHRwLXNlcnZlci5zc2wuZW5hYmxlZD10cnVlXCInKTtcbiAgLy8gVE9ETzogWW91ciBjb21tYW5kIGpvYiBpbXBsZW1lbnRhdGlvbiBoZXJlXG59XG4iXX0=