import cluster from 'node:cluster';
import {cpus} from 'node:os';
import {log4File} from '@wfh/plink';

const numCPUs = cpus().length - 1;
const log = log4File(__filename);

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
export function startCluster(num = numCPUs) {
  if (num < 2) {
    num = 2;
  }

  if (cluster.isPrimary) {

    log.info(`Primary ${process.pid} is running`);

    for (let i = 0; i < num; i++) {
      const worker = cluster.fork();
      worker.send(JSON.stringify({__plink_cluster_worker_index: i}));
    }
    cluster.on('exit', (worker, _code, _signal) => {
      log.info('Worker', worker.process.pid, 'exits');
    });
  }
}

