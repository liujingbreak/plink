import * as Path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';

let envSetDone = false;

if (!envSetDone) {
  envSetDone = true;
  require('source-map-support/register');

  /** environment varaible __plink is used for share basic Plink information between:
   * - Node.js "-r" preload module and normal modules, especially setting NODE_PATH in "-r" module
   * - Main process and forked process or thread worker
   */
  const exitingEnvVar = process.env.__plink ? JSON.parse(process.env.__plink) as PlinkEnv : null;

  if (process.env.PLINK_DATA_DIR == null) {
    process.env.PLINK_DATA_DIR = 'dist';
    // tslint:disable-next-line: no-console
    console.log(chalk.gray('[node-path] By default, Plink reads and writes state files in directory "<root-dir>/dist",\n' +
    'you may change it by' +
    ' setting environment variable PLINK_DATA_DIR to another relative directory'));
  }
  const rootDir = exitingEnvVar ? exitingEnvVar.rootDir : findRootDir(process.env.PLINK_DATA_DIR);

  const symlinkDir = exitingEnvVar ? exitingEnvVar.symlinkDir : Path.resolve(rootDir, 'node_modules');
  const isDrcpSymlink = exitingEnvVar ? exitingEnvVar.isDrcpSymlink : fs.lstatSync(Path.resolve(rootDir, 'node_modules/@wfh/plink')).isSymbolicLink();
  const nodePath = setupNodePath(rootDir, symlinkDir, isDrcpSymlink);
  const distDir = Path.resolve(rootDir, process.env.PLINK_DATA_DIR);
  process.env.__plink = JSON.stringify({distDir, isDrcpSymlink, rootDir, symlinkDir, nodePath} as PlinkEnv);

  // delete register from command line option, to avoid child process get this option, since we have NODE_PATH set
  // for child process
  const deleteExecArgIdx: number[] = [];
  for (let i = 0, l = process.execArgv.length; i < l; i++) {
    if (i < l - 1 && /^(?:-r|--require)$/.test(process.execArgv[i]) &&
      /^@wfh\/plink\/register$/.test(process.execArgv[i + 1])) {
      deleteExecArgIdx.push(i);
    }
  }
  deleteExecArgIdx.reduce((offset, deleteIdx) => {
    process.execArgv.splice(deleteIdx + offset, 2);
    return offset + 2;
  }, 0);

  const envOptions = process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS.split(Path.delimiter) : [];
  process.env.NODE_OPTIONS =
    envOptions.filter(item => !/(-r|--require)\s+@wfh\/plink\/register/.test(item)).join(Path.delimiter);
}

function findRootDir(distDir: string) {
  let dir = process.cwd();
  while (!fs.existsSync(Path.resolve(dir, distDir, 'plink-state.json'))) {
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

  /**
   * Somehow when I install @wfh/plink in an new directory, npm does not dedupe dependencies from 
   * @wfh/plink/node_modules directory up to current node_modules directory, results in MODULE_NOT_FOUND
   * from @wfh/plink/redux-toolkit-abservable for rxjs
   */
  nodePaths.add(fs.realpathSync(Path.resolve(rootDir!, 'node_modules/@wfh/plink')) + Path.sep + 'node_modules');
  if (process.env.NODE_PATH) {
    for (const path of process.env.NODE_PATH.split(Path.delimiter)) {
      nodePaths.add(path);
    }
  }
  const pathArray = Array.from(nodePaths.values());
  process.env.NODE_PATH = pathArray.join(Path.delimiter);
  // tslint:disable-next-line: no-console
  console.log(chalk.gray('[node-path] NODE_PATH', process.env.NODE_PATH));
  require('module').Module._initPaths();
  return pathArray;
}

/**
 * Get environment variables predefined by
```
const {isDrcpSymlink, symlinkDir, rootDir, nodePath, distDir} = JSON.parse(process.env.__plink!) as PlinkEnv;
```
 */
export interface PlinkEnv {
  distDir: string;
  isDrcpSymlink: boolean;
  rootDir: string;
  symlinkDir: string;
  nodePath: string[];
}
