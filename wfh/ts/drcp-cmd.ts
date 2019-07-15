
import Q from 'promise-queue';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import * as Path from 'path';
import {promisifyExe} from './process-utils';
import {boxString} from './utils';
import * as recipeManager from './recipe-manager';
const config = require('../lib/config');
require('../lib/logConfig')(config());

const packageUtils = require('../lib/packageMgr/packageUtils');
// const recipeManager = require('../lib/gulp/recipeManager');
const log = require('log4js').getLogger('drcp-cmd');

export async function pack(argv: any) {
  fs.mkdirpSync('tarballs');
  const promises: Promise<string>[] = [];
  // var count = 0;
  const q = new Q(5, Infinity);
  const recipe2packages: {[recipe: string]: {[name: string]: string}} = {};
  const package2tarball: {[name: string]: string} = {};

  recipeManager.eachRecipeSrc(argv.projectDir, function(src: string, recipeDir: string) {
    if (!recipeDir)
      return;
    const data = JSON.parse(fs.readFileSync(Path.join(recipeDir, 'package.json'), 'utf8'));
    recipe2packages[data.name + '@' + data.version] = data.dependencies;
  });
  const namePat = /name:\s+([^ \n\r]+)/mi;
  const fileNamePat = /filename:\s+([^ \n\r]+)/mi;
  packageUtils.findAllPackages((name: string, entryPath: string, parsedName: string, json: any, packagePath: string) => {
    promises.push(
      q.add<string>(async () => {
        try {
          const output = await promisifyExe('npm', 'pack', packagePath, {silent: true, cwd: Path.resolve('tarballs')});
          const offset = output.indexOf('Tarball Details');
          namePat.lastIndex = offset;
          const name = namePat.exec(output)[1];
          fileNamePat.lastIndex = namePat.lastIndex;
          const tarball = fileNamePat.exec(output)[1];
          package2tarball[name] = './tarballs/' + tarball;
          log.info(output);
          return output;
        } catch (e) {
          handleExption(json.name + '@' + json.version, e);
        }
      }));
  }, 'src', argv.projectDir);

  function handleExption(packageName: string, e: Error) {
    if (e && e.message && e.message.indexOf('EPUBLISHCONFLICT') > 0)
      log.info(packageName + ' exists.');
    else
      log.error(packageName, e);
  }
  await Promise.all(promises);
  _.each(recipe2packages, (packages, recipe) => {
    _.each(packages, (ver, name) => {
      packages[name] = package2tarball[name];
    });
    // tslint:disable-next-line:no-console
    console.log(boxString('recipe:' + recipe + ', you need to copy following dependencies to your package.json\n'));
    // tslint:disable-next-line:no-console
    console.log(JSON.stringify(packages, null, '  '));
  });
  // tslint:disable-next-line:no-console
  console.log(boxString(`Tarball files have been written to ${Path.resolve('tarballs')}`));
}
