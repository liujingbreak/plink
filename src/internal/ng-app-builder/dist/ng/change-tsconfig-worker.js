"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const common_1 = require("./common");
const injector_setup_1 = require("./injector-setup");
const mem_stats_1 = __importDefault(require("dr-comp-package/wfh/dist/utils/mem-stats"));
const { tsconfigFile, reportDir, config, ngOptions, packageInfo, deployUrl, baseHref, drcpBuilderOptions } = worker_threads_1.workerData;
// tslint:disable: no-console
// console.log(workerData);
mem_stats_1.default();
common_1.initCli(drcpBuilderOptions)
    .then((drcpConfig) => {
    return injector_setup_1.injectorSetup(packageInfo, drcpBuilderOptions.drcpArgs, deployUrl, baseHref);
}).then(() => {
    const create = require('./change-tsconfig').createTsConfig;
    const content = create(tsconfigFile, ngOptions, config, packageInfo, reportDir);
    worker_threads_1.parentPort.postMessage({ log: mem_stats_1.default() });
    worker_threads_1.parentPort.postMessage({ result: content });
});

//# sourceMappingURL=change-tsconfig-worker.js.map
