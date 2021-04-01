import * as Path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import log4js from 'log4js';
import {hookCommonJsRequire} from './loaderHooks';
import _ from 'lodash';
import {isMainThread} from 'worker_threads';

let logPrefix = 'node-path - ';
if (process.send)
  logPrefix = `[pid: ${process.pid}]` + logPrefix;
else if (!isMainThread)
  logPrefix = '[thread]' + logPrefix;

let envSetDone = false;

if (!envSetDone) {
  envSetDone = true;
  require('source-map-support/register');

  /** environment varaible __plink is used for share basic Plink information between:
   * - Node.js "-r" preload module and normal modules, especially setting NODE_PATH in "-r" module
   * - Main process and forked process or thread worker
   */
  const exitingEnvVar = process.env.__plink ? JSON.parse(process.env.__plink) as PlinkEnv : null;

  if (!process.env.PLINK_DATA_DIR) {
    process.env.PLINK_DATA_DIR = 'dist';
    // tslint:disable-next-line: no-console
    console.log(chalk.gray(logPrefix + 'By default, Plink reads and writes state files in directory "<root-dir>/dist",\n' +
    'you may change it by' +
    ' setting environment variable PLINK_DATA_DIR to another relative directory'));
  } else {
    // tslint:disable-next-line: no-console
    console.log(chalk.gray(logPrefix + 'PLINK_DATA_DIR: ' + process.env.PLINK_DATA_DIR));
  }
  const workDir = process.env.PLINK_WORK_DIR ? Path.resolve(process.env.PLINK_WORK_DIR) : process.cwd();
  const rootDir = exitingEnvVar ? exitingEnvVar.rootDir : findRootDir(process.env.PLINK_DATA_DIR, workDir);

  // We can change this path to another directory like '.links',
  // if we don't want node_modules to be polluted by symlinks;
  const symlinkDirName = exitingEnvVar && exitingEnvVar.symlinkDirName ?
    exitingEnvVar.symlinkDirName : 'node_modules';


  let plinkDir = Path.resolve(rootDir, 'node_modules/@wfh/plink');
  const isDrcpSymlink = exitingEnvVar ? exitingEnvVar.isDrcpSymlink : fs.lstatSync(plinkDir).isSymbolicLink();
  if (isDrcpSymlink)
    plinkDir = fs.realpathSync(plinkDir);
  const nodePath = setupNodePath(workDir, rootDir,
    fs.existsSync(Path.resolve(symlinkDirName)) ? Path.resolve(symlinkDirName) : null,
    plinkDir);
  const distDir = Path.resolve(rootDir, process.env.PLINK_DATA_DIR);
  process.env.__plink = JSON.stringify({
    workDir, distDir, isDrcpSymlink, rootDir, symlinkDirName, nodePath, plinkDir} as PlinkEnv);

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

function findRootDir(distDir: string, currDir: string) {
  let dir = currDir;
  while (!fs.existsSync(Path.resolve(dir, distDir, 'plink-state.json'))) {
    const parentDir = Path.dirname(dir);
    if (parentDir === dir) {
      dir = currDir;
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
function setupNodePath(currDir: string, rootDir: string, symlinksDir: string | null, plinkDir: string) {
  const pathArray = calcNodePaths(rootDir, symlinksDir, currDir, plinkDir);
  process.env.NODE_PATH = pathArray.join(Path.delimiter);
  // tslint:disable-next-line: no-console
  console.log(chalk.gray(logPrefix + 'NODE_PATH', process.env.NODE_PATH));
  require('module').Module._initPaths();
  return pathArray;
}

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

/**
 * Get environment variables predefined by
```
import {plinkEnv} from './utils/misc';
```
 */
export interface PlinkEnv {
  distDir: string;
  /** is Plink a symlink, Drcp is old name of Plink */
  isDrcpSymlink: boolean;
  rootDir: string;
  /** to allow Plink command line work for any directory other than process.cwd() */
  workDir: string;
  symlinkDirName: string | 'node_modules';
  nodePath: string[];
  plinkDir: string;
}


hookCommonJsRequire((file, target, req, resolve) => {
  if (target === 'log4js') {
    return log4js;
  }
});
