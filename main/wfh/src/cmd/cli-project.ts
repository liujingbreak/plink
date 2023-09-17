// import fs from 'fs-extra';
import Path from 'node:path';
import _ from 'lodash';
import log4js from 'log4js';
// import * as rx from 'rxjs';
import {distinctUntilChanged, map, skip, take} from 'rxjs/operators';
// import {map, take} from 'rxjs/operators';
import {actionDispatcher as pkgActions, getStore, slice} from '../package-mgr';
import {boxString, getRootDir} from '../utils/misc';
import {dispatcher as storeSettingDispatcher} from '../store';
// import { writeFile } from './utils';
// import config from '../config';
const rootPath = getRootDir();
const log = log4js.getLogger('plink.project');
/**
 * @param action 
 * @param dirs 
 */
export default async function(opts: {isSrcDir: boolean}, action?: 'add' | 'remove', dirs?: string[]) {
  void listProject(undefined, true);
  switch (action) {
    case 'add':
      storeSettingDispatcher.changeActionOnExit('save');
      if (dirs) {
        if (opts.isSrcDir)
          pkgActions.addSrcDirs(dirs);
        else
          pkgActions.addProject(dirs);
      }
      break;
    case 'remove':
      storeSettingDispatcher.changeActionOnExit('save');
      if (dirs) {
        if (opts.isSrcDir)
          pkgActions.deleteSrcDirs(dirs);
        else
          pkgActions.deleteProject(dirs);
      }
      break;
    default:
      try {
        log.info('## start', slice.name);
        await listProject();
      } catch (e) {
        log.error(e);
      }
  }
  log.info('## command out');
}

export function listProject(projects?: string[], afterChange = false) {
  return getStore().pipe(
    distinctUntilChanged((a, b) => a.project2Packages === b.project2Packages &&
      a.srcDir2Packages === b.srcDir2Packages),
    map(s => ({project2Packages: [...s.project2Packages.keys()], srcDir2Packages: [...s.srcDir2Packages.keys()]})),
    distinctUntilChanged((a, b) => {
      return _.difference(a.project2Packages, b.project2Packages).length === 0 &&
      _.difference(b.project2Packages, a.project2Packages).length === 0 &&
      _.difference(a.srcDir2Packages, b.srcDir2Packages).length === 0 &&
      _.difference(b.srcDir2Packages, a.srcDir2Packages).length === 0;
    }),
    afterChange ? skip(1) : map(s => s),
    map(s => {
      printProjects(s.project2Packages, s.srcDir2Packages);
    }),
    take(1)
  ).toPromise();
}

function printProjects(projects: Iterable<string>, srcDirs: Iterable<string>) {

  let str = 'Project directories'.toUpperCase();
  str += '\n \n';
  let i = 0;
  for (let dir of projects) {
    dir = Path.resolve(rootPath, dir);
    str += _.padEnd(i + 1 + '. ', 5, ' ') + dir;
    str += '\n';
    i++;
  }
  if (i === 0) {
    str += 'No projects';
  }
  // eslint-disable-next-line no-console
  console.log(boxString(str));
  str = 'Linked source directories'.toUpperCase();
  str += '\n \n';
  i = 0;

  for (let dir of srcDirs) {
    dir = Path.resolve(rootPath, dir);
    str += _.padEnd(i + 1 + '. ', 5, ' ') + dir;
    str += '\n';
    i++;
  }
  if (i === 0) {
    str = 'No linked source directories';
  }
  // eslint-disable-next-line no-console
  console.log(boxString(str));
}
