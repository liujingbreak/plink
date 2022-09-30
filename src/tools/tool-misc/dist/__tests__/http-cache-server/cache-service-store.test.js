"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_cluster_1 = tslib_1.__importDefault(require("node:cluster"));
const globals_1 = require("@jest/globals");
const plink_1 = require("@wfh/plink");
globals_1.jest.setTimeout(60000);
(0, globals_1.describe)('http cache server', () => {
    // it('"preserve symlinks" should be on', () => {
    //   console.log(process.env);
    //   console.log(process.execArgv);
    // });
    (0, globals_1.it)('multi-process state server and client uses http "keep-alive" connection', async () => {
        (0, plink_1.initProcess)('none');
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
        // cluster.workers?.forEach(it => it.destroy());
        // Object.values(cluster.workers!).forEach(it => it?.kill());
        storeServer.shutdown();
    });
});
//# sourceMappingURL=cache-service-store.test.js.map