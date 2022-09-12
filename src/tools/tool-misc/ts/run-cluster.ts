import cluster from 'node:cluster';
import {cpus} from 'node:os';
import {log4File} from '@wfh/plink';

const numCPUs = cpus().length;
const log = log4File(__filename);

if (cluster.isPrimary) {
  log.info(`Primary ${process.pid} is running`);

  for (let i = 0; i < numCPUs - 1; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    log.info('Worker', worker.process.pid, 'exits');
  });
}
