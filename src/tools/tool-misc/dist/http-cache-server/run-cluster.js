"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCluster = void 0;
const tslib_1 = require("tslib");
const node_cluster_1 = tslib_1.__importDefault(require("node:cluster"));
const node_os_1 = require("node:os");
const plink_1 = require("@wfh/plink");
const numCPUs = (0, node_os_1.cpus)().length - 1;
const log = (0, plink_1.log4File)(__filename);
/**
 * Usage:
 *
cluster.setupMaster({
  exec: Path.resolve(__dirname, '<your worker js file>'),
  args: [
   // your parameter passed to workers
  ]
});

startCluster(2);
*/
function startCluster(num = numCPUs) {
    if (num < 2) {
        num = 2;
    }
    if (node_cluster_1.default.isPrimary) {
        log.info(`Primary ${process.pid} is running`);
        for (let i = 0; i < num; i++) {
            node_cluster_1.default.fork();
        }
        node_cluster_1.default.on('exit', (worker, _code, _signal) => {
            log.info('Worker', worker.process.pid, 'exits');
        });
    }
}
exports.startCluster = startCluster;
//# sourceMappingURL=run-cluster.js.map