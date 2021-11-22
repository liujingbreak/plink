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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdlbi1zc2wta2V5cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1nZW4tc3NsLWtleXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQW9DO0FBQ3BDLHFFQUFzRDtBQUN0RCxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsMkRBQTJEO0FBQzNELDZCQUE2QjtBQUV0QixLQUFLLFVBQVUsVUFBVTtJQUM5QixNQUFNLElBQUksR0FBRywyRUFBMkUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUIsTUFBTSxJQUFBLG1CQUFHLEVBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0VBQXdFLENBQUMsQ0FBQztJQUNuRiw2Q0FBNkM7QUFDL0MsQ0FBQztBQU5ELGdDQU1DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtsb2c0RmlsZX0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQge2V4ZX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuLy8gQ2hhbGsgaXMgdXNlZnVsIGZvciBwcmludGluZyBjb2xvcmZ1bCB0ZXh0IGluIGEgdGVybWluYWxcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5Tc2xLZXlzKCkge1xuICBjb25zdCBhcmdzID0gJ3JlcSAtbmV3a2V5IHJzYToyMDQ4IC1ub2RlcyAta2V5b3V0IGtleS5wZW0gLXg1MDkgLWRheXMgMzY1IC1vdXQgY2VydC5wZW0nLnNwbGl0KC9cXHMrLyk7XG4gIGxvZy5pbmZvKCdydW4gb3BlbnNzbCcsIGFyZ3MpO1xuICBhd2FpdCBleGUoJ29wZW5zc2wnLCAuLi5hcmdzKS5wcm9taXNlO1xuICBsb2cuaW5mbygnU3RhcnQgc2VydmUgd2l0aCBhcmd1bWVudHM6IFwiLS1wcm9wIEB3ZmgvaHR0cC1zZXJ2ZXIuc3NsLmVuYWJsZWQ9dHJ1ZVwiJyk7XG4gIC8vIFRPRE86IFlvdXIgY29tbWFuZCBqb2IgaW1wbGVtZW50YXRpb24gaGVyZVxufVxuIl19