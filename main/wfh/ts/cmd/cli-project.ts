// import fs from 'fs-extra';
import _ from 'lodash';
import Path from 'path';
import { distinctUntilChanged, map, skip, take, pluck } from 'rxjs/operators';
import { actionDispatcher as pkgActions, getStore } from '../package-mgr';
import { boxString, getRootDir } from '../utils';
// import { writeFile } from './utils';
import config from '../config';
const rootPath = getRootDir();

/**
 * @param action 
 * @param dirs 
 */
export default async function(action?: 'add' | 'remove', dirs?: string[]) {
  await config.init({config: [], prop: [], logStat: false});
  getStore().pipe(
    pluck('project2Packages'), distinctUntilChanged(),
    map(project2Packages => Array.from(project2Packages.keys())),
    // tap(project2Packages => console.log(project2Packages)),
    distinctUntilChanged((keys1, keys2) => keys1.length === keys2.length && keys1.join() === keys2.join()),
    skip(1),
    map(projects => {
      // // tslint:disable-next-line: no-console
      // console.log(boxString('Project list is updated, you need to run\n\tdrcp init\n' +
      // ' to install new dependencies from the new project.', 60));
      printProjects(projects);
    })
  ).subscribe();
  switch (action) {
    case 'add':
      if (dirs)
        addProject(dirs);
      break;
    case 'remove':
      if (dirs)
        removeProject(dirs);
      break;
    default:
      listProject();
  }
}

function removeProject(dirs: string[]) {
  pkgActions.deleteProject(dirs);
  // const projectListFile = Path.join(rootPath, 'dr.project.list.json');
  // if (fs.existsSync(projectListFile)) {
  //   // tslint:disable-next-line: no-console
  //   console.log('Removing project: %s', dirs.join(', '));
  //   let prjs: string[] = JSON.parse(fs.readFileSync(projectListFile, 'utf8'));
  //   prjs = _.differenceBy(prjs, dirs, dir => Path.resolve(dir));
  //   const str = JSON.stringify(prjs, null, '  ');
  //   writeFile(projectListFile, str);
  //   delete require.cache[require.resolve(projectListFile)];
  //   listProject(prjs);
  // }
}

function listProject(projects?: string[]) {
  getStore().pipe(
    map(s => s.project2Packages), distinctUntilChanged(),
    map(projects2pks => {
      printProjects(Array.from(projects2pks.keys()));
    }),
    take(1)
  ).subscribe();
}

function printProjects(projects: string[]) {
  // const projects = Object.keys(projects2pks);
  if (projects.length === 0) {
    // tslint:disable-next-line: no-console
    console.log(boxString('No project'));
    return;
  } else {
    let str = _.pad(' Projects directory ', 40, ' ');
    str += '\n \n';
    _.each(projects, (dir, i) => {
      dir = Path.resolve(rootPath, dir);
      str += _.padEnd(i + 1 + '. ', 5, ' ') + dir;
      str += '\n';
    });
    // tslint:disable-next-line: no-console
    console.log(boxString(str));
  }
}

function addProject(dirs: string[]) {
  pkgActions.addProject(dirs);
}

