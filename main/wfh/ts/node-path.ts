import * as Path from 'path';
import * as fs from 'fs';

let rootDir: string;
findRootDir();

export function findRootDir() {
  let dir = process.cwd();
  while (!fs.existsSync(Path.resolve(dir, 'dist/dr-state.json'))) {
    const parentDir = Path.dirname(dir);
    if (parentDir === dir) {
      dir = process.cwd();
      break;
    }
    dir = parentDir;
  }
  rootDir = dir;
  return dir;
}

export {rootDir};

export const isDrcpSymlink = fs.lstatSync(Path.resolve(rootDir!, 'node_modules/dr-comp-package')).isSymbolicLink();


export default function() {
  const nodePaths = [Path.resolve(rootDir, 'node_modules')];
  if (rootDir !== process.cwd()) {
    nodePaths.unshift(Path.resolve(process.cwd(), 'node_modules'));
  }
  if (isDrcpSymlink)
    nodePaths.push(fs.realpathSync(Path.resolve(rootDir!, 'node_modules/dr-comp-package')) + Path.sep + 'node_modules');
  if (process.env.NODE_PATH) {
    nodePaths.push(...process.env.NODE_PATH.split(Path.delimiter));
  }
  process.env.NODE_PATH = nodePaths.join(Path.delimiter);
  require('module').Module._initPaths();
  // console.log(process.env.NODE_PATH)
}
