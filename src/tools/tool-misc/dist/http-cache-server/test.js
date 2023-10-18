"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_cluster_1 = tslib_1.__importDefault(require("node:cluster"));
const plink_1 = require("@wfh/plink");
async function default_1() {
    const { startStore } = require('@wfh/assets-processer/dist/proxy-cache/cache-service-store');
    const { startCluster } = require('@wfh/assets-processer/dist/proxy-cache/run-cluster');
    plink_1.exitHooks.push(() => {
        storeServer.shutdown();
    });
    const storeServer = startStore();
    await storeServer.started;
    // eslint-disable-next-line no-console
    console.log('server started: ', require.resolve('@wfh/assets-processer/dist/proxy-cache/cache-service-store'));
    node_cluster_1.default.setupMaster({
        exec: require.resolve('@wfh/assets-processer/dist/proxy-cache/client-worker'),
        args: []
    });
    startCluster(2);
    await new Promise(resolve => setTimeout(resolve, 4000));
    storeServer.shutdown();
}
exports.default = default_1;
//# sourceMappingURL=test.js.map