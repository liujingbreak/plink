/**
 * Do not import any 3rd-party dependency in this file,
 * it is run by `init` command at the time there probably is
 * no dependencies installed yet
 */

import * as fs from 'fs';
import {removeSync} from 'fs-extra';
import Path from 'path';
import util from 'util';
import os from 'os';

export const isWin32 = os.platform().indexOf('win32') >= 0;
export const readdirAsync = util.promisify(fs.readdir);
export const lstatAsync = util.promisify(fs.lstat);
export const _symlinkAsync = util.promisify(fs.symlink);
export const unlinkAsync = util.promisify(fs.unlink);

/**
 * Return all deleted symlinks
 * @param deleteOption 
 */
export default async function scanNodeModules(deleteOption: 'all' | 'invalid' = 'invalid') {
  const deleteAll = deleteOption === 'all';
  const deletedList: string[] = [];
  await listModuleSymlinks(Path.join(process.cwd(), 'node_modules'),
    link => {
      if (validateLink(link, deleteAll)) {
        deletedList.push(link);
      }
    });
  return deletedList;
}

export async function listModuleSymlinks(
  parentDir: string,
  onFound: (link: string) => void | Promise<void>) {
  const level1Dirs = await readdirAsync(parentDir);
  await Promise.all(level1Dirs.map(async dir => {
    if (dir.startsWith('@')) {
      // it is a scope package
      const subdirs = await readdirAsync(Path.resolve(parentDir, dir));
      await Promise.all(subdirs.map(file => onEachFile(Path.resolve(parentDir, dir, file))));
    } else {
      await onEachFile(Path.resolve(parentDir, dir));
    }
  }));

  async function onEachFile(file: string) {
    let isSymlink = false;
    try {
      isSymlink = fs.lstatSync(file).isSymbolicLink();
    } catch (e) {}
    if (isSymlink) {
      await Promise.resolve(onFound(file));
    }
  }
}

/**
 * 1. create symlink node_modules/@wfh/plink --> directory "main"
 * 2. create symlink <parent directory of "main">/node_modules --> node_modules
 */
export function linkDrcp() {
  const sourceDir = Path.resolve(__dirname, '../../..'); // directory "main"

  // 1. create symlink node_modules/@wfh/plink --> directory "main"
  const target = getRealPath('node_modules/@wfh/plink');
  if (target !== sourceDir) {
    if (!fs.existsSync('node_modules'))
      fs.mkdirSync('node_modules');
    if (!fs.existsSync('node_modules/@wfh'))
      fs.mkdirSync('node_modules/@wfh');

    if (target != null) {
      removeSync(Path.resolve('node_modules/@wfh/plink'));
      // fs.unlinkSync(Path.resolve('node_modules/@wfh/plink'));
    }
    fs.symlinkSync(Path.relative(Path.resolve('node_modules', '@wfh'), sourceDir),
      Path.resolve('node_modules', '@wfh', 'plink'), isWin32 ? 'junction' : 'dir');
    // tslint:disable-next-line: no-console
    console.log(Path.resolve('node_modules', '@wfh/plink') + ' is created');
  }

  // // 2. create symlink <parent directory of "main">/node_modules --> node_modules
  // const topModuleDir = Path.resolve(sourceDir, '../node_modules');
  // if (fs.existsSync(topModuleDir)) {
  //   if (fs.realpathSync(topModuleDir) !== Path.resolve('node_modules')) {
  //     fs.unlinkSync(topModuleDir);
  //     fs.symlinkSync(Path.relative(Path.dirname(topModuleDir), Path.resolve('node_modules')),
  //     topModuleDir, isWin32 ? 'junction' : 'dir');
  //     // tslint:disable-next-line: no-console
  //     console.log(topModuleDir + ' is created');
  //   }
  // } else {
  //   fs.symlinkSync(Path.relative(Path.dirname(topModuleDir), Path.resolve('node_modules')),
  //     topModuleDir, isWin32 ? 'junction' : 'dir');
  //   // tslint:disable-next-line: no-console
  //   console.log(topModuleDir + ' is created');
  // }
}

/**
 * Do check existing symlink, recreate a new one if existing one is invalid symlink
 * @param linkTarget 
 * @param link 
 */
export async function symlinkAsync(linkTarget: string, link: string) {
  try {
    if (fs.lstatSync(link).isSymbolicLink() && Path.resolve(Path.dirname(link), fs.readlinkSync(link)) === linkTarget) {
      // console.log('exits', link);
      return;
    }
     // tslint:disable-next-line: no-console
    console.log(`remove ${link}`);
    fs.unlinkSync(link);
  } catch (ex) {
    // link does not exist
    // console.log(ex);
  }
  // tslint:disable-next-line: no-console
  console.log(`create symlink ${link} --> ${linkTarget}`);
  return _symlinkAsync(
    Path.relative(Path.dirname(link), linkTarget),
    link, isWin32 ? 'junction' : 'dir'
  );
}

export async function validateLink(link: string, deleteAll = false): Promise<boolean> {
  try {
    if ((await lstatAsync(link)).isSymbolicLink() &&
      (deleteAll || !fs.existsSync(Path.resolve(Path.dirname(link), fs.readlinkSync(link))))
      ) {
      // tslint:disable-next-line: no-console
      console.log(`[symlink check] Remove ${deleteAll ? '' : 'invalid'} symlink ${Path.relative('.', link)}`);
      await unlinkAsync(link);
      return false;
    }
    return true;
  } catch (ex) {
    return false;
  }
}

/**
 * Delete symlink or file/directory if it is invalid symlink or pointing to nonexisting target
 * @param link the symlink
 * @param target 
 * @returns true if needs to create a new symlink
 */
export async function recreateSymlink(link: string, target: string): Promise<boolean> {
  try {
    if ((await lstatAsync(link)).isSymbolicLink() &&
      !fs.existsSync(Path.resolve(Path.dirname(link), fs.readlinkSync(link)))
      ) {
      await unlinkAsync(link);
      return false;
    }
    return true;
  } catch (ex) {
    return false;
  }
}

/**
 * Unlike fs.realPath(), it supports symlink of which target file no longer exists
 * @param file 
 */
export function getRealPath(file: string): string | null {
  try {
    if (fs.lstatSync(file).isSymbolicLink()) {
      return Path.resolve(Path.dirname(file), fs.readlinkSync(file));
    } else {
      return Path.resolve(file);
    }
  } catch (e) {
    return null;
  }
}

