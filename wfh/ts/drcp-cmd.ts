
import {queueUp, queue} from './utils/promise-queque';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import * as Path from 'path';
import {promisifyExe} from './process-utils';
import {boxString} from './utils';
import * as recipeManager from './recipe-manager';
import jsonParser, {ObjectAst, Token} from './utils/json-parser';
import replaceCode, {ReplacementInf} from 'require-injector/dist/patch-text';
const config = require('../lib/config');
require('../lib/logConfig')(config());

const packageUtils = require('../lib/packageMgr/packageUtils');
// const recipeManager = require('../lib/gulp/recipeManager');
const log = require('log4js').getLogger('drcp-cmd');
// const namePat = /name:\s+([^ \n\r]+)/mi;
// const fileNamePat = /filename:\s+([^ \n\r]+)/mi;

export async function pack(argv: any) {
  if (argv.pj)
    return packProject(argv);

  const package2tarball: {[name: string]: string} = {};
  if (argv.packages) {
    const pgPaths: string[] = argv.packages;

    const done = queueUp(3, pgPaths.map(packageDir => () => npmPack(packageDir)));
    let tarInfos = await done;

    tarInfos = tarInfos.filter(item => item != null);
    tarInfos.forEach(item => {
      package2tarball[item!.name] = './tarballs/' + item!.filename;
    });
    await deleteOldTar(tarInfos.map(item => item!.name.replace('@', '').replace(/[/\\]/g, '-')),
      tarInfos.map(item => item!.filename));
    changePackageJson(package2tarball);
  }
}

export async function packProject(argv: any) {
  fs.mkdirpSync('tarballs');
  // var count = 0;
  const recipe2packages: {[recipe: string]: {[name: string]: string}} = {};
  const package2tarball: {[name: string]: string} = {};

  recipeManager.eachRecipeSrc(argv.pj, function(src: string, recipeDir: string) {
    if (!recipeDir)
      return;
    const data = JSON.parse(fs.readFileSync(Path.join(recipeDir, 'package.json'), 'utf8'));
    recipe2packages[data.name + '@' + data.version] = data.dependencies;
  });

  const packActions = [] as Array<ReturnType<typeof npmPack>>;
  const {add} = queue(3);
  // tslint:disable-next-line: max-line-length
  packageUtils.findAllPackages((name: string, entryPath: string, parsedName: string, json: any, packagePath: string) => {
    packActions.push(add(() => npmPack(packagePath)));
  }, 'src', argv.projectDir);


  let tarInfos = await Promise.all(packActions);
  tarInfos = tarInfos.filter(item => item != null);
  tarInfos.forEach(item => {
    package2tarball[item!.name] = './tarballs/' + item!.filename;
  });

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

async function npmPack(packagePath: string):
  Promise<{name: string, filename: string} | null> {
  try {
    const output = await promisifyExe('npm', 'pack', Path.resolve(packagePath),
      {silent: true, cwd: Path.resolve('tarballs')});
    const resultInfo = parseNpmPackOutput(output);

    const packageName = resultInfo.get('name')!;
    // cb(packageName, resultInfo.get('filename')!);
    log.info(output);
    return {
      name: packageName,
      filename: resultInfo.get('filename')!
    };
  } catch (e) {
    handleExption(packagePath, e);
    return null;
  }
}

async function changePackageJson(package2tarball: {[name: string]: string}) {
  if (!fs.existsSync('package.json')) {
    // tslint:disable-next-line:no-console
    console.log('Could not find package.json.');
    return;
  }
  const pkj = fs.createReadStream('package.json', 'utf8');
  const ast = await jsonParser(pkj);
  const depsAst = ast.properties.find(({name}) => JSON.parse(name.text) === 'dependencies');
  const devDepsAst = ast.properties.find(({name}) => JSON.parse(name.text) === 'devDependencies');
  const replacements: ReplacementInf[] = [];
  if (depsAst) {
    changeDependencies(depsAst.value as ObjectAst);
  }
  if (devDepsAst) {
    changeDependencies(devDepsAst.value as ObjectAst);
  }

  if (replacements.length > 0)
    fs.writeFileSync('package.json', replaceCode(fs.readFileSync('package.json', 'utf8'), replacements));

  function changeDependencies(deps: ObjectAst) {

    const foundDeps = deps.properties.filter(({name}) => _.has(package2tarball, JSON.parse(name.text)));
    for (const foundDep of foundDeps) {
      const verToken = foundDep.value as Token<string>;
      const newVersion = package2tarball[JSON.parse(foundDep.name.text)];
      log.info(`Update package.json: ${verToken.text} => ${newVersion}`);
      replacements.push({
        start: verToken.pos,
        end: verToken.end!,
        text: JSON.stringify(newVersion)
      });
    }
  }
}

function handleExption(packagePath: string, e: Error) {
  if (e && e.message && e.message.indexOf('EPUBLISHCONFLICT') > 0)
    log.info(`npm pack ${packagePath}: EPUBLISHCONFLICT.`);
  else
    log.error(packagePath, e);
}

/**
 * 
 * @param output 
 * e.g.
npm notice === Tarball Details === 
npm notice name:          require-injector                        
npm notice version:       5.1.5                                   
npm notice filename:      require-injector-5.1.5.tgz              
npm notice package size:  56.9 kB                                 
npm notice unpacked size: 229.1 kB                                
npm notice shasum:        c0693270c140f65a696207ab9deb18e64452a02c
npm notice integrity:     sha512-kRGVWcw1fvQ5J[...]ABwLPU8UvStbA==
npm notice total files:   47                                      
npm notice 

 */
export function parseNpmPackOutput(output: string) {
  const lines = output.split(/\r?\n/);
  const linesOffset = _.findLastIndex(lines, line => line.indexOf('Tarball Details') >= 0);
  const tarballInfo = new Map<string, string>();
  lines.slice(linesOffset).forEach(line => {
    const match = /npm notice\s+([^:]+)[:]\s*(.+?)\s*$/.exec(line);
    if (!match)
      return null;
    return tarballInfo.set(match[1], match[2]);
  });
  return tarballInfo;
}

function deleteOldTar(deleteFilePrefix: string[], keepfiles: string[]) {
  const tarSet = new Set(keepfiles);
  const deleteDone: Promise<any>[] = [];
  for (const file of fs.readdirSync('tarballs')) {
    if (!tarSet.has(file) && deleteFilePrefix.some(prefix => file.startsWith(prefix))) {
      deleteDone.push(fs.remove(Path.resolve('tarballs', file)));
    }
  }
  return Promise.all(deleteDone);
  // log.info('You may delete old version tar file by execute commands:\n' + cmd);
}
