/**
 * @deprecated This file is no longer used in favor of "--preserve-symlinks-main"
 *
 * Node option prever-symlink does not effect on "main" file, so this file acts as main file to call real file from
 * a symlink location
 */
import Path from 'path';

console.log('[fork-preserve-symlink-main]', __dirname, process.env.__plink_fork_main);
let dir = process.env.PLINK_WORK_DIR ? process.env.PLINK_WORK_DIR : process.cwd();
const root = Path.parse(dir).root;
let target: string;
for (;;) {
  target = Path.resolve(dir, 'node_modules', process.env.__plink_fork_main!);
  try {
    require.resolve(target);
    break;
  } catch (ex) {
    if (dir === root) {
      console.error(ex);
      break;
    }
    dir = Path.dirname(dir);
  }
}
require(target);
