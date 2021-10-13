import Path from 'path';
import _ from 'lodash';

// TODO: Node path is no longer useful, remove it
export function calcNodePaths(rootDir: string, symlinksDir: string | null, cwd: string, plinkDir: string) {
  const nodePaths: string[] = [Path.resolve(rootDir, 'node_modules')];
  if (symlinksDir) {
    nodePaths.unshift(symlinksDir);
  }
  if (rootDir !== cwd) {
    nodePaths.unshift(Path.resolve(cwd, 'node_modules'));
  }

  /**
   * Somehow when I install @wfh/plink in an new directory, npm does not dedupe dependencies from 
   * @wfh/plink/node_modules directory up to current node_modules directory, results in MODULE_NOT_FOUND
   * from @wfh/plink/redux-toolkit-abservable for rxjs
   */
  nodePaths.push(plinkDir + Path.sep + 'node_modules');
  if (process.env.NODE_PATH) {
    for (const path of process.env.NODE_PATH.split(Path.delimiter)) {
      nodePaths.push(path);
    }
  }

  return _.uniq(nodePaths);
}
