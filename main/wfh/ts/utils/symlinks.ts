import * as fs from 'fs';
// import {removeSync} from 'fs-extra';
import Path from 'path';
import util from 'util';
import os from 'os';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {getWorkDir} from './misc';

export const isWin32 = os.platform().indexOf('win32') >= 0;
// export const readdirAsync = util.promisify(fs.readdir);
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
  await listModuleSymlinks(Path.join(getWorkDir(), 'node_modules'),
    link => {
      if (validateLink(link, deleteAll)) {
        deletedList.push(link);
      }
    });
  return deletedList;
}

export function listModuleSymlinks(
  parentDir: string,
  onFound: (link: string) => void | Promise<void>) {
  // const level1Dirs = await readdirAsync(parentDir);
  return rx.from(fs.promises.readdir(parentDir)).pipe(
    op.concatMap(level1Dirs => level1Dirs),
    op.mergeMap(dirname => {
      const dir = Path.resolve(parentDir, dirname);
      if (dirname.startsWith('@') && fs.statSync(dir).isDirectory()) {
        // it is a scope package
        return rx.from(fs.promises.readdir(dir))
        .pipe(
          op.mergeMap(subdirs => subdirs),
          op.mergeMap(file => onEachFile(Path.resolve(dir, file)))
        );
      } else {
        return onEachFile(dir);
      }
    })
  ).toPromise();
  // await Promise.all(level1Dirs.map(async dir => {
  //   if (dir.startsWith('@')) {
  //     // it is a scope package
  //     const subdirs = await readdirAsync(Path.resolve(parentDir, dir));
  //     await Promise.all(subdirs.map(file => onEachFile(Path.resolve(parentDir, dir, file))));
  //   } else {
  //     await onEachFile(Path.resolve(parentDir, dir));
  //   }
  // }));

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

