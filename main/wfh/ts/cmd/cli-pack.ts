
import {queueUp} from '../../../packages/thread-promise-pool/dist/promise-queque';
import * as _ from 'lodash';
import * as fs from 'fs';
import fsext from 'fs-extra';
import * as Path from 'path';
import {exe} from '../process-utils';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
// import {boxString} from './utils';
// import * as recipeManager from './recipe-manager';
import jsonParser, {ObjectAst, Token} from '../utils/json-sync-parser';
import replaceCode, {ReplacementInf} from 'require-injector/dist/patch-text';
import config from '../config';
import {PackOptions, PublishOptions} from './types';
import {getPackagesOfProjects, getState, workspaceKey, actionDispatcher} from '../package-mgr';
import {packages4WorkspaceKey} from '../package-mgr/package-list-helper';
import log4js from 'log4js';
import stripAnsi from 'strip-ansi';
import {findPackagesByNames} from './utils';
import {plinkEnv} from '../utils/misc';
import '../editor-helper';

// let tarballDir: string;
const log = log4js.getLogger('plink.cli-pack');

function init(opts: PublishOptions | PackOptions) {
  const tarballDir = opts.tarDir || Path.resolve(config().rootPath, 'tarballs');
  fsext.mkdirpSync(tarballDir);
  return tarballDir;
}

export async function pack(opts: PackOptions) {
  const tarballDir = init(opts);
  const targetJsonFile = opts.jsonFile;

  if (opts.workspace && opts.workspace.length > 0) {
    await Promise.all(opts.workspace.map(ws => packPackages(
      Array.from(linkedPackagesOfWorkspace(ws)), tarballDir, targetJsonFile))
    );
  } else if (opts.project && opts.project.length > 0) {
    return packProject(opts.project, tarballDir, targetJsonFile);
  } else if (opts.dir && opts.dir.length > 0) {
    await packPackages(opts.dir, tarballDir, targetJsonFile);
  } else if (opts.packages && opts.packages.length > 0) {
    const dirs = Array.from(findPackagesByNames(getState(), opts.packages))
    .filter(pkg => pkg && (pkg.json.dr != null || pkg.json.plink != null))
    .map(pkg => pkg!.realPath);
    await packPackages(dirs, tarballDir, targetJsonFile);
  } else {
    await packPackages(Array.from(linkedPackagesOfWorkspace(plinkEnv.workDir)), tarballDir, targetJsonFile);
  }
}

export async function publish(opts: PublishOptions) {
  init(opts);

  if (opts.project && opts.project.length > 0)
    return publishProject(opts.project, opts.public ? ['--access', 'public'] : []);
  else if (opts.dir && opts.dir.length > 0) {
    await publishPackages(opts.dir, opts.public ? ['--access', 'public'] : []);
  } else if (opts.packages && opts.packages.length > 0) {
    const dirs = Array.from(findPackagesByNames(getState(), opts.packages))
    .filter(pkg => pkg)
    .map(pkg => pkg!.realPath);
    await publishPackages(dirs, opts.public ? ['--access', 'public'] : []);
  } else {
    await publishPackages(Array.from(linkedPackagesOfWorkspace(plinkEnv.workDir)),
      opts.public ? ['--access', 'public'] : []);
  }
}

function *linkedPackagesOfWorkspace(workspaceDir: string) {
  const wsKey = workspaceKey(workspaceDir);
  if (!getState().workspaces.has(wsKey)) {
    log.error(`Workspace ${workspaceDir} is not a workspace directory`);
    return;
  }
  for (const pkg of packages4WorkspaceKey(wsKey)) {
    yield pkg.realPath;
  }
}

async function packPackages(packageDirs: string[], tarballDir: string, targetJsonFile?: string) {
  const excludeFromSync = new Set<string>();
  const package2tarball = new Map<string, string>();


  if (packageDirs && packageDirs.length > 0) {
    const done = rx.from(packageDirs).pipe(
      op.mergeMap(packageDir => rx.defer(() => npmPack(packageDir, tarballDir)), 4),
      op.reduce<ReturnType<typeof npmPack> extends Promise<infer T> ? T : unknown>((all, item) => {
        all.push(item);
        return all;
      }, [])
    ).toPromise();

    const tarInfos = (await done).filter(item => typeof item != null) as
      (typeof done extends Promise<(infer T)[]> ? NonNullable<T> : unknown)[];

    for (const item of tarInfos) {
      // log.info(item);
      package2tarball.set(item.name, Path.resolve(tarballDir, item.filename));
      if (item.name === '@wfh/plink') {
        excludeFromSync.add(item.dir);
      }
    }

    await deleteOldTar(tarInfos.map(item => new RegExp('^' +
      _.escapeRegExp(item.name.replace('@', '').replace(/[/\\]/g, '-'))
        + '\\-\\d+(?:\\.\\d+){1,2}(?:\\-[^]+?)?\\.tgz$', 'i'
      )),
      tarInfos.map(item => item.filename),
      tarballDir);
    changePackageJson(package2tarball, targetJsonFile);
    await new Promise(resolve => setImmediate(resolve));
    actionDispatcher.scanAndSyncPackages({
      packageJsonFiles: packageDirs.filter(dir => !excludeFromSync.has(dir))
        .map(dir => Path.resolve(dir, 'package.json'))
    });
  }
}

async function packProject(projectDirs: string[], tarballDir: string, targetJsonFile: string | undefined) {
  const dirs = [] as string[];
  for (const pkg of getPackagesOfProjects(projectDirs)) {
    dirs.push(pkg.realPath);
  }
  await packPackages(dirs, tarballDir, targetJsonFile);
}

async function publishPackages(packageDirs: string[], npmCliOpts: string[]) {
  if (packageDirs && packageDirs.length > 0) {
    const pgPaths: string[] = packageDirs;

    await queueUp(4, pgPaths.map(packageDir => async () => {
      try {
        log.info(`publishing ${packageDir}`);
        const params = ['publish', ...npmCliOpts, {silent: true, cwd: packageDir}];
        const output = await exe('npm', ...params).promise;
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

async function npmPack(packagePath: string, tarballDir: string):
  Promise<{name: string; filename: string; version: string; dir: string} | null> {
  try {
    const output = await (exe('npm', 'pack', Path.resolve(packagePath),
      {silent: true, cwd: tarballDir}).done);

    const resultInfo = parseNpmPackOutput(output.errout);

    const packageName = resultInfo.get('name')!;
    // cb(packageName, resultInfo.get('filename')!);
    log.info(output.errout);
    log.info(output.stdout);
    return {
      name: packageName,
      filename: output.stdout.trim(),
      version: resultInfo.get('version')!,
      dir: packagePath
    };
  } catch (e) {
    handleExption(packagePath, e);
    return null;
  }
}

/**
 * @param package2tarball 
 */
function changePackageJson(packageTarballMap: Map<string, string>, targetJsonFile?: string) {
  const package2tarball = new Map(packageTarballMap);
  if (targetJsonFile) {
    changeSinglePackageJson(Path.dirname(targetJsonFile), package2tarball);
    return;
  }
  for (const workspace of _.uniq([
    ...getState().workspaces.keys(), '']).map(dir => Path.resolve(config().rootPath, dir))
  ) {
    const wsDir = Path.resolve(config().rootPath, workspace);
    changeSinglePackageJson(wsDir, package2tarball);
  }
}

function changeSinglePackageJson(wsDir: string, package2tarball: Map<string, string>) {
  const jsonFile = Path.resolve(wsDir, 'package.json');
  const pkj = fs.readFileSync(jsonFile, 'utf8');
  const ast = jsonParser(pkj);
  const depsAst = ast.properties.find(({name}) => JSON.parse(name.text) === 'dependencies');
  const devDepsAst = ast.properties.find(({name}) => JSON.parse(name.text) === 'devDependencies');
  const replacements: ReplacementInf[] = [];
  if (depsAst) {
    changeDependencies(package2tarball, depsAst.value as ObjectAst, wsDir, jsonFile, replacements);
  }
  if (devDepsAst) {
    changeDependencies(package2tarball, devDepsAst.value as ObjectAst, wsDir, jsonFile, replacements);
  }

  if (replacements.length > 0) {
    const replaced = replaceCode(pkj, replacements);
    // eslint-disable-next-line no-console
    log.info(`Updated ${jsonFile}\n`, replaced);
    fs.writeFileSync(jsonFile, replaced);
  }
}

function changeDependencies(package2tarball: Map<string, string>, deps: ObjectAst, wsDir: string, jsonFile: string, replacements: ReplacementInf[]) {
  // console.log(deps.properties.map(prop => prop.name.text + ':' + (prop.value as Token).text));
  // console.log(Array.from(package2tarball.entries()));
  const foundDeps = deps.properties.filter(({name}) => package2tarball.has(JSON.parse(name.text)));
  for (const foundDep of foundDeps) {
    const verToken = foundDep.value as Token;
    const pkName = JSON.parse(foundDep.name.text) as string;
    const tarFile = package2tarball.get(pkName);
    let newVersion = Path.relative(wsDir, tarFile!).replace(/\\/g, '/');
    if (!newVersion.startsWith('.')) {
      newVersion = './' + newVersion;
    }
    log.info(`Update ${jsonFile}: ${verToken.text} => ${newVersion}`);
    replacements.push({
      start: verToken.pos,
      end: verToken.end,
      text: JSON.stringify(newVersion)
    });
    // package2tarball.delete(pkName);
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
function parseNpmPackOutput(output: string) {
  const lines = stripAnsi(output).split(/\r?\n/);
  const linesOffset = _.findLastIndex(lines, line => line.indexOf('Tarball Details') >= 0);
  const tarballInfo = new Map<string, string>();
  lines.slice(linesOffset).forEach(line => {
    const match = /npm notice\s+([^:]+)[:]\s*(.+?)\s*$/.exec(line);
    if (!match) {
      return null;
    }
    return tarballInfo.set(match[1], match[2]);
  });
  return tarballInfo;
}

export const testable = {parseNpmPackOutput};

function deleteOldTar(deleteFileReg: RegExp[], keepfiles: string[], tarballDir: string) {
  // log.warn(deleteFileReg, keepfiles);
  const tarSet = new Set(keepfiles);
  const deleteDone: Promise<any>[] = [];

  if (!fs.existsSync(tarballDir))
    fsext.mkdirpSync(tarballDir);

  // console.log(tarSet, deleteFileReg);

  for (const file of fs.readdirSync(tarballDir)) {
    if (!tarSet.has(file) && deleteFileReg.some(reg => reg.test(file))) {
      log.warn('Remove ' + file);
      deleteDone.push(fs.promises.unlink(Path.resolve(tarballDir, file)));
    }
  }
  return Promise.all(deleteDone);
}
