// import fs from 'fs-extra';
import _ from 'lodash';
import Path from 'path';
import { distinctUntilChanged, map, skip, take } from 'rxjs/operators';
import { actionDispatcher as pkgActions, getStore, PackagesState } from '../package-mgr';
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
    map(s => s.project2Packages), distinctUntilChanged(),
    skip(1),
    map(project2Packages => {
      // tslint:disable-next-line: no-console
      console.log(boxString('Project list is updated, you need to run\n\tdrcp init\n' +
      ' to install new dependencies from the new project.', 60));
      printProjects(project2Packages);
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
      printProjects(projects2pks);
    }),
    take(1)
  ).subscribe();
}

function printProjects(projects2pks: PackagesState['project2Packages']) {
  const projects = Object.keys(projects2pks);
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
  // const changed = writeProjectListFile(dirs);

  // if (changed) {
  //   // tslint:disable-next-line: no-console
  //   console.log(boxString('Project list is updated, you need to run\n\tdrcp init\n' +
  //     ' or other offline init command to install new dependencies from the new project.', 60));
  // } else {
  //   // tslint:disable-next-line: no-console
  //   console.log(boxString('No new project is added.', 60));
  // }
}

// function writeProjectListFile(dirs: string[]) {
//   let changed = false;
//   const projectListFile = Path.join(rootPath, 'dr.project.list.json');
//   let prj: string[];
//   if (fs.existsSync(projectListFile)) {
//     fs.copySync(Path.join(rootPath, 'dr.project.list.json'), Path.join(rootPath, 'dr.project.list.json.bak'));
//     prj = JSON.parse(fs.readFileSync(projectListFile, 'utf8'));
//     const toAdd = _.differenceBy(dirs, prj, dir => fs.realpathSync(dir).replace(/[/\\]$/, ''));
//     if (toAdd.length > 0) {
//       prj.push(...toAdd);
//       writeFile(projectListFile, JSON.stringify(_.uniqBy(prj, p => fs.realpathSync(p)), null, '  '));
//       changed = true;
//     }
//   } else {
//     prj = [...dirs];
//     writeFile(projectListFile, JSON.stringify(_.uniqBy(prj, p => fs.realpathSync(p)), null, '  '));
//     changed = true;
//   }
//   delete require.cache[require.resolve(projectListFile)];
//   return changed;
// }

