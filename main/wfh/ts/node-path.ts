import * as Path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import log4js from 'log4js';
import {hookCommonJsRequire} from './loaderHooks';
import {calcNodePaths} from './node-path-calc';
import _ from 'lodash';
import {isMainThread, threadId} from 'worker_threads';

let logPrefix = '';
if (process.send)
  logPrefix = `[pid: ${process.pid}]`;
if (!isMainThread)
  logPrefix += `[p${process.pid}-t${threadId}]`;

let envSetDone = false;

if (!envSetDone) {
  envSetDone = true;
  require('source-map-support/register');
  hookCommonJsRequire((file, target, req, resolve) => {
    if (target === 'log4js') {
      return log4js;
    }
  });
  /** environment varaible __plink is used for share basic Plink information between:
   * - Node.js "-r" preload module and normal modules, especially setting NODE_PATH in "-r" module
   * - Main process and forked process or thread worker
   */
  const exitingEnvVar = process.env.__plink ? JSON.parse(process.env.__plink) as PlinkEnv : null;

  if (!process.env.PLINK_DATA_DIR) {
    process.env.PLINK_DATA_DIR = 'dist';
    if (isMainThread || process.send == null) {
      // eslint-disable-next-line no-console
      console.log(chalk.gray(logPrefix + 'By default, Plink reads and writes state files in directory "<root-dir>/dist",\n' +
      'you may change it by' +
      ' setting environment variable PLINK_DATA_DIR to another relative directory'));
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(chalk.gray(logPrefix + 'PLINK_DATA_DIR: ' + process.env.PLINK_DATA_DIR));
  }
  const PLINK_WORK_DIR = process.env.PLINK_WORK_DIR;
  if (PLINK_WORK_DIR) {
    // eslint-disable-next-line no-console
    console.log(logPrefix + `Environment variable PLINK_WORK_DIR is set, default workspace is: ${PLINK_WORK_DIR}`);
  }
  const workDir = PLINK_WORK_DIR ? Path.resolve(PLINK_WORK_DIR) : process.cwd();
  const rootDir = exitingEnvVar ? exitingEnvVar.rootDir : findRootDir(process.env.PLINK_DATA_DIR, workDir);
  checkUpLevelNodeModules(rootDir);
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
  let dir = Path.resolve(currDir);
  const {root} = Path.parse(dir);
  while (!fs.existsSync(Path.resolve(dir, distDir, 'plink-state.json'))) {
    const parentDir = Path.dirname(dir);
    if (parentDir === root) {
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
  // process.env.NODE_PATH = pathArray.join(Path.delimiter);
  // process.env.NODE_PRESERVE_SYMLINKS = '1';
  // require('module').Module._initPaths();
  return pathArray;
}

/**
 * Get environment variables predefined by
```
import {plinkEnv} from './utils/misc';
```
 */
export interface PlinkEnv {
  distDir: string;
  /** whether Plink is a symlink, Drcp is old name of Plink */
  isDrcpSymlink: boolean;
  rootDir: string;
  /** current worktree space directory */
  workDir: string;
  symlinkDirName: string | 'node_modules';
  nodePath: string[];
  plinkDir: string;
}

/**
 * Webpack and TS compiler by default will look up node_modules from up level directries,
 * this breaks Plink's way of adding extra node path for Node.js, TS or Webpack, it leads
 * to problematic module loading issue.
 */
function checkUpLevelNodeModules(rootDir: string) {
  // Go with preserve
  // const dirs = [] as string[];

  // let currDir = rootDir;
  // const {root} = Path.parse(rootDir);
  // do {
  //   currDir = Path.dirname(currDir);
  //   dirs.push(Path.resolve(currDir, 'node_modules'));
  // } while (currDir !== root);

  // const nodeModule = dirs.find(dir => fs.existsSync(dir));
  // if (nodeModule) {
  //   // eslint-disable-next-line no-console
  //   console.log(`Please install in another directory, or remove ${chalk.red(nodeModule)}.\n` +
  //     chalk.yellow('It could be problematic for Plink to manage monorepo dependency (through environmet variable "NODE_PATH" in runtime).\n' +
  //     '(Alternatively, you may consider install whatever "global" dependency with `npm i -g` instead of having directory like ' +
  //     chalk.red(nodeModule) + ')' ) );

  //   throw new Error(chalk.red('Found "node_modules" in upper level directories, ' +
  //     'Installation is cancelled, sorry for inconvienience.'));
  // }
}



