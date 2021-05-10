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
export default async function(opts: {isSrcDir: boolean}, action?: 'add' | 'remove', dirs?: string[]) {
  getStore().pipe(
    distinctUntilChanged((x, y) => x.srcDir2Packages === y.srcDir2Packages &&
      x.project2Packages === y.project2Packages),
    skip(1),
    map(s => {
      // // tslint:disable-next-line: no-console
      // console.log(boxString('Project list is updated, you need to run\n\tdrcp init\n' +
      // ' to install new dependencies from the new project.', 60));
      printProjects(s.project2Packages.keys(), s.srcDir2Packages.keys());
    })
  ).subscribe();
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

export function listProject(projects?: string[]) {
  getStore().pipe(
    distinctUntilChanged((a, b) => a.project2Packages === b.project2Packages &&
      a.srcDir2Packages === b.srcDir2Packages),
    map(s => {
      printProjects(s.project2Packages.keys(), s.srcDir2Packages.keys());
    }),
    take(1)
  ).subscribe();
}

function printProjects(projects: Iterable<string>, srcDirs: Iterable<string>) {

  let list = [...projects];
  if (list.length === 0) {
    // tslint:disable-next-line: no-console
    console.log(boxString('No project'));
  } else {
    let str = 'Project directories'.toUpperCase();
    str += '\n \n';
    let i = 0;
    for (let dir of list) {
      dir = Path.resolve(rootPath, dir);
      str += _.padEnd(i + 1 + '. ', 5, ' ') + dir;
      str += '\n';
      i++;
    }
    // tslint:disable-next-line: no-console
    console.log(boxString(str));
  }
  list = [...srcDirs];
  if (list.length > 0) {
    let str = 'Linked directories'.toUpperCase();
    str += '\n \n';
    let i = 0;

    for (let dir of list) {
      dir = Path.resolve(rootPath, dir);
      str += _.padEnd(i + 1 + '. ', 5, ' ') + dir;
      str += '\n';
      i++;
    }
    // tslint:disable-next-line: no-console
    console.log(boxString(str));
  }
}
