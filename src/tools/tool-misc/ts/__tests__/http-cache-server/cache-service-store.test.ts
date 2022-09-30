import cluster from 'node:cluster';
import {jest, describe, it} from '@jest/globals';
import {initProcess, exitHooks} from '@wfh/plink';
import * as cacheServiceStore from '../../http-cache-server/cache-service-store';
import * as runCluster from '../../http-cache-server/run-cluster';

jest.setTimeout(60000);
describe('http cache server', () => {
  // it('"preserve symlinks" should be on', () => {
  //   console.log(process.env);
  //   console.log(process.execArgv);
  // });

  it('multi-process state server and client uses http "keep-alive" connection', async () => {
    initProcess('none');
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
    // cluster.workers?.forEach(it => it.destroy());
    // Object.values(cluster.workers!).forEach(it => it?.kill());
    storeServer.shutdown();
  });
});

