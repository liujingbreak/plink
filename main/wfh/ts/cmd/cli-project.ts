// import fs from 'fs-extra';
import _ from 'lodash';
import Path from 'path';
import { distinctUntilChanged, map, skip, take } from 'rxjs/operators';
import { actionDispatcher as pkgActions, getStore } from '../package-mgr';
import { boxString, getRootDir } from '../utils/misc';
// import { writeFile } from './utils';
// import config from '../config';
const rootPath = getRootDir();

/**
 * @param action 
 * @param dirs 
 */
export default function(opts: {isSrcDir: boolean}, action?: 'add' | 'remove', dirs?: string[]) {
  listProject(undefined, true);
  switch (action) {
    case 'add':
      if (dirs) {
        if (opts.isSrcDir)
          pkgActions.addSrcDirs(dirs);
        else
          pkgActions.addProject(dirs);
      }
      break;
    case 'remove':
      if (dirs) {
        if (opts.isSrcDir)
          pkgActions.deleteSrcDirs(dirs);
        else
          pkgActions.deleteProject(dirs);
      }
      break;
    default:
      listProject();
  }
}

export function listProject(projects?: string[], afterChange = false) {
  getStore().pipe(
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
  ).subscribe();
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
