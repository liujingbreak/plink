/**
 * Node option prever-symlink does not effect on "main" file, so this file acts as main file to call real file from
 * a symlink location
 */
import Path from 'path';
require(Path.resolve(process.cwd(), 'node_modules', process.env.__plink_fork_main!));
