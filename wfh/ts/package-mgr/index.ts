const config = require('../../lib/config');
const packageUtils = require('../../lib/packageMgr/packageUtils');
const {green: col1, cyan} = require('chalk');
import Path from 'path';
import {eachRecipeSrc} from '../recipe-manager';

export function listPackages(): string {
  let out = '';
  let i = 0;
  packageUtils.findAllPackages(onComponent, 'src');

  function onComponent(name: string, entryPath: string, parsedName: string, json: any, packagePath: string) {
    out += `${i++}. ${name}`;
    out += '\n';
  }
  return out;
}

export function listPackagesByProjects() {
  let out = '';
  for (const prj of config().projectList) {
    out += col1(`Project: ${prj}`) + '\n';
    eachRecipeSrc(prj, (srcDir, recipeDir) => {
      const relDir = Path.relative(prj, srcDir) || '/';
      out += `  ${col1('|-')} ${cyan(relDir)}\n`;
      const deps: string[] = Object.keys(require(Path.resolve(recipeDir, 'package.json')).dependencies);
      deps.forEach(name => out += `  ${col1('|')}  ${ col1('|-')} ${name}\n`);
    });
    out += '\n';
  }
  // out += '\nInstalled:\n';
  // eachInstalledRecipe((recipeDir) => {
  //   out += `${recipeDir}\n`;
  // });
  return out;
}
