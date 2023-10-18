"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import cluster from 'node:cluster';
const plink_1 = require("@wfh/plink");
// import * as runCluster from '../../http-cache-server/run-cluster';
(0, plink_1.initProcess)('none');
void (async function () {
    // const {startCluster} = require('../../http-cache-server/run-cluster') as typeof runCluster;
    plink_1.exitHooks.push(() => {
        storeServer.shutdown();
    });
    const { startStore } = require('../../http-cache-server/cache-service-store');
    const storeServer = startStore({ reconnInterval: 2000 });
    await storeServer.started;
    // cluster.setupMaster({
    //   exec: require.resolve('../../../dist/__tests__/http-cache-server/service-client-worker'),
    //   args: []
    // });
    // startCluster(2);
    // storeServer.shutdown();
})();
//# sourceMappingURL=service-main-process.js.map