
import {queueUp} from '../utils/promise-queque';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import * as Path from 'path';
import {promisifyExe} from '../process-utils';
// import {boxString} from './utils';
// import * as recipeManager from './recipe-manager';
import jsonParser, {ObjectAst, Token} from '../utils/json-sync-parser';
import replaceCode, {ReplacementInf} from 'require-injector/dist/patch-text';
import config from '../config';
import {PackOptions} from './types';
import logConfig from '../log-config';
import {getPackagesOfProjects, getState} from '../package-mgr';

// import * as packageUtils from './package-utils';
// const recipeManager = require('../lib/gulp/recipeManager');
const log = require('log4js').getLogger('drcp-cmd');
// const namePat = /name:\s+([^ \n\r]+)/mi;
// const fileNamePat = /filename:\s+([^ \n\r]+)/mi;

export async function pack(opts: PackOptions & {packageDirs: string[]}) {
  await config.init(opts);
  logConfig(config());

  fs.mkdirpSync('tarballs');

  if (opts.project && opts.project.length > 0)
    return packProject(opts.project);

  await packPackages(opts.packageDirs);
}

async function packPackages(packageDirs: string[]) {
  const package2tarball = new Map<string, string>();
  if (packageDirs && packageDirs.length > 0) {
    const pgPaths: string[] = packageDirs;

    const done = queueUp(3, pgPaths.map(packageDir => () => npmPack(packageDir)));
    let tarInfos = await done;

    tarInfos = tarInfos.filter(item => item != null);
    tarInfos.forEach(item => {
      package2tarball.set(item!.name, './tarballs/' + item!.filename);
    });
    log.info(Array.from(package2tarball.entries()));
    await deleteOldTar(tarInfos.map(item => item!.name.replace('@', '').replace(/[/\\]/g, '-')),
      tarInfos.map(item => item!.filename));
    changePackageJson(package2tarball);
  }
}

async function packProject(projectDirs: string[]) {
  const dirs = [] as string[];
  for (const pkg of getPackagesOfProjects(projectDirs)) {
    dirs.push(pkg.realPath);
  }
  await packPackages(dirs);
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

function changePackageJson(package2tarball: Map<string, string>) {

  for (const workspace of getState().workspaces.keys()) {
    log.warn('workspace', workspace);
    const jsonFile = Path.resolve(config().rootPath, workspace, 'package.json');
    const pkj = fs.readFileSync(jsonFile, 'utf8');
    const ast = jsonParser(pkj);
    const depsAst = ast.properties.find(({name}) => JSON.parse(name.text) === 'dependencies');
    const devDepsAst = ast.properties.find(({name}) => JSON.parse(name.text) === 'devDependencies');
    const replacements: ReplacementInf[] = [];
    if (depsAst) {
      changeDependencies(depsAst.value as ObjectAst);
    }
    if (devDepsAst) {
      changeDependencies(devDepsAst.value as ObjectAst);
    }

    if (replacements.length > 0) {
      // tslint:disable-next-line: no-console
      console.log(replaceCode(pkj, replacements));
      const replaced = replaceCode(pkj, replacements);
      fs.writeFileSync(jsonFile, replaced);
    }

    function changeDependencies(deps: ObjectAst) {
      const foundDeps = deps.properties.filter(({name}) => package2tarball.has(JSON.parse(name.text)));
      for (const foundDep of foundDeps) {
        const verToken = foundDep.value as Token;
        const newVersion = package2tarball.get(JSON.parse(foundDep.name.text));
        log.info(`Update ${jsonFile}: ${verToken.text} => ${newVersion}`);
        replacements.push({
          start: verToken.pos,
          end: verToken.end!,
          text: JSON.stringify(newVersion)
        });
      }
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
  if (!fs.existsSync('tarballs'))
    fs.mkdirpSync('tarballs');
  // TODO: wait for timeout
  for (const file of fs.readdirSync('tarballs')) {
    if (!tarSet.has(file) && deleteFilePrefix.some(prefix => file.startsWith(prefix))) {
      deleteDone.push(fs.remove(Path.resolve('tarballs', file)));
    }
  }
  return Promise.all(deleteDone);
  // log.info('You may delete old version tar file by execute commands:\n' + cmd);
}
