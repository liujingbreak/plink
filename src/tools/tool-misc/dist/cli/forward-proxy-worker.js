"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
const [port, mapJson, fallbackJson] = process.argv.slice(2);
const fallbackObj = fallbackJson ? JSON.parse(fallbackJson) : undefined;
const fallbackArr = fallbackObj ? fallbackJson.split(':') : undefined;
(0, plink_1.initProcess)();
(0, plink_1.initConfig)(JSON.parse(process.env.PLINK_CLI_OPTS));
(0, plink_1.initInjectorForNodePackages)();
require('./cli-forward-proxy').start(Number(port), new Map(JSON.parse(mapJson)), fallbackArr
    ? {
        fallbackProxyHost: fallbackArr[0],
        fallbackproxyPort: fallbackArr[1] != null ? Number(fallbackArr[1]) : 80
    }
    : undefined);
//# sourceMappingURL=forward-proxy-worker.js.map