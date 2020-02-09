import chalk from 'chalk';
import { isMainThread, threadId } from 'worker_threads';
export default function() {
  let stats = `[${isMainThread ? 'pid:' + process.pid : 'thread:' + threadId}]`;
  const mem = process.memoryUsage();
  for (const key of Object.keys(mem)) {
    stats += `${key}: ${Math.ceil(mem[key]/1024/1024)}M, `;
  }
  const report = chalk.cyanBright(stats);

  // tslint:disable-next-line: no-console
  console.log(report);
  return report;
}

