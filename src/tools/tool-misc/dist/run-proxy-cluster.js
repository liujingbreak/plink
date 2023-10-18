"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_cluster_1 = tslib_1.__importDefault(require("node:cluster"));
const node_os_1 = require("node:os");
const plink_1 = require("@wfh/plink");
const numCPUs = (0, node_os_1.cpus)().length;
const log = (0, plink_1.log4File)(__filename);
if (node_cluster_1.default.isPrimary) {
    log.info(`Primary ${process.pid} is running`);
    for (let i = 0; i < numCPUs - 1; i++) {
        node_cluster_1.default.fork();
    }
    node_cluster_1.default.on('exit', (worker, code, signal) => {
        log.info('Worker', worker.process.pid, 'exits');
    });
}
//# sourceMappingURL=run-proxy-cluster.js.map