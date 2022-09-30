import cluster from 'node:cluster';
import {exitHooks} from '@wfh/plink';
import * as cacheServiceStore from '@wfh/assets-processer/dist/proxy-cache/cache-service-store';
import * as runCluster from '@wfh/assets-processer/dist/proxy-cache/run-cluster';

export default async function() {
  const {startStore} = require('@wfh/assets-processer/dist/proxy-cache/cache-service-store') as typeof cacheServiceStore;
  const {startCluster} = require('@wfh/assets-processer/dist/proxy-cache/run-cluster') as typeof runCluster;
  exitHooks.push(() => {
    storeServer.shutdown();
  });

  const storeServer = startStore();
  await storeServer.started;

  // eslint-disable-next-line no-console
  console.log('server started: ', require.resolve('@wfh/assets-processer/dist/proxy-cache/cache-service-store'));
  cluster.setupMaster({
    exec: require.resolve('@wfh/assets-processer/dist/proxy-cache/client-worker'),
    args: []
  });

  startCluster(2);
  await new Promise(resolve => setTimeout(resolve, 4000));
  storeServer.shutdown();
}
