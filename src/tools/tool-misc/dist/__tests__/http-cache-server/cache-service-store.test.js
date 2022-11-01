"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const plink_1 = require("@wfh/plink");
globals_1.jest.setTimeout(60000);
(0, globals_1.describe)('http cache server', () => {
    // it('"preserve symlinks" should be on', () => {
    //   console.log(process.env);
    //   console.log(process.execArgv);
    // });
    (0, globals_1.it)('multi-process state server and client uses http "keep-alive" connection', () => {
        (0, plink_1.forkAsPreserveSymlink)('@wfh/tool-misc/dist/__tests__/http-cache-server/service-main-process.js', {});
    });
});
//# sourceMappingURL=cache-service-store.test.js.map