import chalk from 'chalk';
import {isMainThread} from 'worker_threads';
export default function() {
  let stats = `[${process.pid}, is main:${isMainThread}]`;
  const mem = process.memoryUsage();
  for (const key of Object.keys(mem)) {
    stats += `${key}: ${mem[key]/1024/1024}M, `;
  }
  return chalk.greenBright(stats);
}
