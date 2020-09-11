import * as Path from 'path';
import * as fs from 'fs';

if (process.env.__plink == null) {
  require('source-map-support/register');
  const rootDir = findRootDir();
  const symlinkDir = Path.resolve(rootDir, 'node_modules');
  const isDrcpSymlink = fs.lstatSync(Path.resolve(rootDir, 'node_modules/dr-comp-package')).isSymbolicLink();
  const nodePath = setupNodePath(rootDir, symlinkDir, isDrcpSymlink);
  process.env.__plink = JSON.stringify({isDrcpSymlink, rootDir, symlinkDir, nodePath} as PlinkEnv);
}

function findRootDir() {
  let dir = process.cwd();
  while (!fs.existsSync(Path.resolve(dir, 'dist/plink-state.json'))) {
    const parentDir = Path.dirname(dir);
    if (parentDir === dir) {
      dir = process.cwd();
      break;
    }
    dir = parentDir;
  }
  return dir;
}

/**
 * if cwd is not root directory, then append NODE_PATH with <cwd>/node_modules:<rootDir>/symlinks,
 * otherwise append NODE_PATH with <rootDir>/node_modules
 * @param rootDir 
 * @param isDrcpSymlink 
 */
function setupNodePath(rootDir: string, symlinkDir: string, isDrcpSymlink: boolean) {
  let nodePaths: Set<string>;
  // const symlinkDir = Path.resolve(rootDir, 'dist', 'symlinks');
  if (rootDir !== process.cwd()) {
    nodePaths = new Set([
      Path.resolve(process.cwd(), 'node_modules'),
      symlinkDir,
      Path.resolve(rootDir, 'node_modules')
    ]);
  } else {
    nodePaths = new Set([
      symlinkDir,
      Path.resolve(rootDir, 'node_modules')
    ]);
  }

  if (isDrcpSymlink)
    nodePaths.add(fs.realpathSync(Path.resolve(rootDir!, 'node_modules/dr-comp-package')) + Path.sep + 'node_modules');
  if (process.env.NODE_PATH) {
    for (const path of process.env.NODE_PATH.split(Path.delimiter)) {
      nodePaths.add(path);
    }
  }
  const pathArray = Array.from(nodePaths.values());
  process.env.NODE_PATH = pathArray.join(Path.delimiter);
  // tslint:disable-next-line: no-console
  console.log('[node-path] NODE_PATH', process.env.NODE_PATH);
  require('module').Module._initPaths();
  return pathArray;
}

/**
 * Get environment variables predefined by
```
const {isDrcpSymlink, symlinkDir, rootDir, nodePath} = JSON.parse(process.env.__plink!) as PlinkEnv;
```
 */
export interface PlinkEnv {
  isDrcpSymlink: boolean;
  rootDir: string;
  symlinkDir: string;
  nodePath: string[];
}
