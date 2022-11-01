"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_cluster_1 = tslib_1.__importDefault(require("node:cluster"));
const plink_1 = require("@wfh/plink");
void (async function () {
    const { startStore } = require('../../http-cache-server/cache-service-store');
    const { startCluster } = require('../../http-cache-server/run-cluster');
    plink_1.exitHooks.push(() => {
        storeServer.shutdown();
    });
    const storeServer = startStore();
    await storeServer.started;
    node_cluster_1.default.setupMaster({
        exec: require.resolve('../../../dist/__tests__/http-cache-server/service-client-worker'),
        args: []
    });
    startCluster(2);
    await new Promise(resolve => setTimeout(resolve, 10000));
    storeServer.shutdown();
})();
//# sourceMappingURL=service-main-process.js.map