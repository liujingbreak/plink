// import cluster from 'node:cluster';
import {exitHooks, initProcess} from '@wfh/plink';
import * as __service from '../../http-cache-server/cache-service-store';
// import * as runCluster from '../../http-cache-server/run-cluster';

initProcess('none');

void (async function() {
  // const {startCluster} = require('../../http-cache-server/run-cluster') as typeof runCluster;

  exitHooks.push(() => {
    storeServer.shutdown();
  });

  const {startStore} = require('../../http-cache-server/cache-service-store') as typeof __service;

  const storeServer = startStore({reconnInterval: 2000});
  await storeServer.started;

  // cluster.setupMaster({
  //   exec: require.resolve('../../../dist/__tests__/http-cache-server/service-client-worker'),
  //   args: []
  // });

  // startCluster(2);
  // storeServer.shutdown();
})();
