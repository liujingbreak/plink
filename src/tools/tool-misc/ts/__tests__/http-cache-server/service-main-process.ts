import cluster from 'node:cluster';
import {exitHooks} from '@wfh/plink';
import * as cacheServiceStore from '../../http-cache-server/cache-service-store';
import * as runCluster from '../../http-cache-server/run-cluster';

void (async function() {
  const {startStore} = require('../../http-cache-server/cache-service-store') as typeof cacheServiceStore;
  const {startCluster} = require('../../http-cache-server/run-cluster') as typeof runCluster;

  exitHooks.push(() => {
    storeServer.shutdown();
  });

  const storeServer = startStore();
  await storeServer.started;

  cluster.setupMaster({
    exec: require.resolve('../../../dist/__tests__/http-cache-server/service-client-worker'),
    args: []
  });

  startCluster(2);
  await new Promise(resolve => setTimeout(resolve, 10000));
  storeServer.shutdown();
})();
