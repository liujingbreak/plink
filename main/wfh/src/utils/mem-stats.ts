import * as _wt from 'worker_threads';
import chalk from 'chalk';
// import { isMainThread, threadId } from 'worker_threads';

let header: string | undefined;
try {
  const wt = require('worker_threads') as typeof _wt;
  header = `[${wt.isMainThread ? 'pid:' + process.pid : 'thread:' + wt.threadId}]`;
} catch (err) {
  header = `[pid: ${process.pid}]`;
}
export default function() {

  const mem = process.memoryUsage();
  let stats = header!;
  for (const key of Object.keys(mem)) {
    stats += `${key}: ${Math.ceil(mem[key as keyof NodeJS.MemoryUsage] / 1024 / 1024)}M, `;
  }
  const report = chalk.cyanBright(stats);

  // eslint-disable-next-line no-console
  console.log(report);
  return report;
}

