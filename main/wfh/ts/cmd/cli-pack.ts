
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
import {PackOptions, PublishOptions} from './types';
import logConfig from '../log-config';
import {getPackagesOfProjects, getState, workspaceKey} from '../package-mgr';
import log4js from 'log4js';
// import * as packageUtils from './package-utils';
// const recipeManager = require('../lib/gulp/recipeManager');
const log = log4js.getLogger('cli-pack');
// const namePat = /name:\s+([^ \n\r]+)/mi;
// const fileNamePat = /filename:\s+([^ \n\r]+)/mi;

export async function pack(opts: PackOptions) {
  await config.init(opts);
  logConfig(config());

  fs.mkdirpSync('tarballs');

  if (opts.workspace && opts.workspace.length > 0) {
    await Promise.all(opts.workspace.map(ws => packPackagesOfWorkspace(ws)));
  } else if (opts.project && opts.project.length > 0) {
    return packProject(opts.project);
  } if (opts.packageDirs && opts.packageDirs.length > 0) {
    await packPackages(opts.packageDirs);
  } else {
    await packPackagesOfWorkspace(process.cwd());
  }
}

export async function publish(opts: PublishOptions) {
  await config.init(opts);
  logConfig(config());

  fs.mkdirpSync('tarballs');

  if (opts.project && opts.project.length > 0)
    return publishProject(opts.project, opts.public ? ['--access', 'public'] : []);

  await publishPackages(opts.packageDirs, opts.public ? ['--access', 'public'] : []);
}

async function packPackagesOfWorkspace(workspaceDir: string) {
  const wsKey = workspaceKey(workspaceDir);
  const linkedPackages = getState().srcPackages;
  const ws = getState().workspaces.get(wsKey);
  if (ws) {
    const dirs = ws.linkedDependencies.map(entry => linkedPackages.get(entry[0]))
      .filter(pkg => pkg != null)
      .map(pkg => pkg!.realPath);
    await packPackages(dirs);
  } else {
    log.error(`Workspace ${workspaceDir} is not a workspace directory`);
  }
}

async function packPackages(packageDirs: string[]) {
  const package2tarball = new Map<string, string>();
  if (packageDirs && packageDirs.length > 0) {
    const pgPaths: string[] = packageDirs;

    const done = queueUp(3, pgPaths.map(packageDir => () => npmPack(packageDir)));
    let tarInfos = await done;

    tarInfos = tarInfos.filter(item => item != null);
    const rootPath = config().rootPath;
    for (const item of tarInfos) {
      package2tarball.set(item!.name, Path.resolve(rootPath, 'tarballs', item!.filename));
    }
    // log.info(Array.from(package2tarball.entries())
    //   .map(([pkName, ver]) => `"${pkName}": "${ver}",`)
    //   .join('\n'));
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

async function publishPackages(packageDirs: string[], npmCliOpts: string[]) {
  if (packageDirs && packageDirs.length > 0) {
    const pgPaths: string[] = packageDirs;

    await queueUp(3, pgPaths.map(packageDir => async () => {
      try {
        log.info(`publishing ${packageDir}`);
        const params = ['publish', ...npmCliOpts, {silent: true, cwd: packageDir}];
        const output = await promisifyExe('npm', ...params);
        log.info(output);
      } catch (e) {
        log.error(e);
      }
    }));
  }
}

async function publishProject(projectDirs: string[], npmCliOpts: string[]) {
  const dirs = [] as string[];
  for (const pkg of getPackagesOfProjects(projectDirs)) {
    dirs.push(pkg.realPath);
  }
  await publishPackages(dirs, npmCliOpts);
}

async function npmPack(packagePath: string):
  Promise<{name: string, filename: string} | null> {
  try {
    const output = await promisifyExe('npm', 'pack', Path.resolve(packagePath),
      {silent: true, cwd: Path.resolve(config().rootPath, 'tarballs')});
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
    const wsDir = Path.resolve(config().rootPath, workspace);
    const jsonFile = Path.resolve(wsDir, 'package.json');
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
      const replaced = replaceCode(pkj, replacements);
      // tslint:disable-next-line: no-console
      log.info('Updated package.json\n', replaced);
      fs.writeFileSync(jsonFile, replaced);
    }

    function changeDependencies(deps: ObjectAst) {
      const foundDeps = deps.properties.filter(({name}) => package2tarball.has(JSON.parse(name.text)));
      for (const foundDep of foundDeps) {
        const verToken = foundDep.value as Token;
        const tarFile = package2tarball.get(JSON.parse(foundDep.name.text));
        let newVersion = Path.relative(wsDir, tarFile!).replace(/\\/g, '/');
        if (!newVersion.startsWith('.')) {
          newVersion = './' + newVersion;
        }
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
  if (!fs.existsSync(config.resolve('rootPath', 'tarballs')))
    fs.mkdirpSync(config.resolve('rootPath', 'tarballs'));
  // TODO: wait for timeout
  for (const file of fs.readdirSync('tarballs')) {
    if (!tarSet.has(file) && deleteFilePrefix.some(prefix => file.startsWith(prefix))) {
      deleteDone.push(fs.remove(Path.resolve('tarballs', file)));
    }
  }
  return Promise.all(deleteDone);
  // log.info('You may delete old version tar file by execute commands:\n' + cmd);
}
