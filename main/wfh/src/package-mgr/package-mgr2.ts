import Path from 'node:path';
import fs from 'node:fs';
import * as chr from 'node:child_process';
import util from 'util';
import * as rx from 'rxjs';
import {ReactorComposite2, SingleActionFactory, actionRelatedToAction, actionRelatedToActionRelatives,
  timeoutLog} from '../../../packages/reactivizer';
import {symlinkAsync} from '../utils/symlinks';
import {plinkEnv} from '../utils/misc';
import {RepoPackageJson, createStoreService} from './package-mgr2-model';
import {PackageJsonInterf, createPackageInfo, createTsConfigForRepos} from './package-mgr2-utils';
import type {NpmOptions, PackageInfo} from './index';

// const log = getLogger('plink.package-mgr2');

type PackageMgrActions = {
  /** scan current project,
   * Related by actions: rootPackageJson
   **/
  scan(rootDir: string): SingleActionFactory;
  /** Create symlinks and install dependency */
  syncWorkspace(spaceDir: string, npmOpts?: NpmOptions): SingleActionFactory;
};

interface PackagesInternalSteps {
  checkSpace(spaceKey: string): SingleActionFactory;
  didRemoveSymlink(link: string): SingleActionFactory;
  didScanSource(): SingleActionFactory;
  didPackagesScan(changedOrAdded: PackageInfo[], deleted: PackageInfo[]): SingleActionFactory;
  didCheckSpace(spacePackageJson: PackageJsonInterf): SingleActionFactory;
  didSwitchSpace(spaceKey: string, symlinksToSpace: string[], actuallyCreated: string[], tsconfiFileWritten: number): SingleActionFactory;

  doAllSymlinks(): SingleActionFactory;
  didAllSymlinks(countCreated: number, countDeleted: number): SingleActionFactory;
}

/** Intercept these messages to replace with virtual file operations, in case we need to test or for "dry run" */
interface PackageMgrFileEvents {
  createOrChangeSymlink(linkTarget: string, link: string): SingleActionFactory;
  /** @return false in case symlink already exists or other reason (but not include errors) */
  didSymlinkCreation(success: boolean): SingleActionFactory;
  writeFile(file: string, content: string): SingleActionFactory;
  /** Relates to writeFile */
  didWriteFile(): SingleActionFactory;
}

interface PackageMgrEvents extends PackagesInternalSteps, PackageMgrFileEvents {
  /** related to input action "scan" */
  onScanCompleted(): SingleActionFactory;
  onSpaceSynced(spaceKey: string): SingleActionFactory;
  rootPackageJson(json: RepoPackageJson): SingleActionFactory;
  repoPkgJson(projKey: string, json: RepoPackageJson): SingleActionFactory;
  /** @param dirs each directory string must ends with path.sep */
  repoNoModuleSymlinkDirs(projDir: string, dirs: string[]): SingleActionFactory;
  rootDir(dir: string): SingleActionFactory;
  onProjectLinked(projDir: string): SingleActionFactory;
  onDirLinked(dir: string): SingleActionFactory;
  onNotifiableError(content: string): SingleActionFactory;
  linkedDrcp(pkgInfo: PackageInfo | null): SingleActionFactory;
  installedDrcp(pkgInfo: PackageInfo | null): SingleActionFactory;
}

const inputTableFor = ['scan'] as const;
const outputTableFor = ['rootPackageJson', 'rootDir', 'linkedDrcp', 'installedDrcp'] as const;

const packagesService = new ReactorComposite2<PackageMgrActions, PackageMgrEvents, typeof inputTableFor, typeof outputTableFor>({
  name: 'PackageMgr2',
  debug: true,
  inputTableFor,
  outputTableFor,
  debugExcludeTypes: ['createOrChangeSymlink', 'didSymlinkCreation', 'writeFile'],
  log(...obj) {
    // eslint-disable-next-line no-console
    console.log(...obj.map(value => typeof value === 'string' ? value : util.inspect(value, false, 0)));
  }
});

const {service, spaceDependencyMap, spacePkgMap, allPackages, projPkgMap} = createStoreService(packagesService);
export {spaceDependencyMap, service, allPackages, spacePkgMap, projPkgMap};

const {i, o, r, outputTable} = service;
const repoNoModuleSymlinkDirTable = service.o.createDataTable('repoNoModuleSymlinkDirs', ([, projKey]) => projKey);

if (plinkEnv.isDrcpSymlink) {
  o.ft.linkedDrcp(createPackageInfo(Path.resolve(plinkEnv.plinkDir, 'package.json'))).dp();
  o.ft.installedDrcp(null).dp();
} else {
  o.ft.linkedDrcp(null).dp();
  o.ft.installedDrcp(createPackageInfo(Path.resolve(plinkEnv.plinkDir, 'package.json'))).dp();
}

r('scan, didScanSource, didAllSymlinks -> rootDir, onProjectLinked, onDirLinked, rootPackageJson, removeSpace, checkSpace', i.pt.scan.pipe(
  rx.concatMap(async ([m, rootDir]) => {
    try {
      o.ft.rootDir(rootDir).dp(m);
      const content = await fs.promises.readFile(Path.join(rootDir, 'package.json'), 'utf8');
      const pjson = JSON.parse(content) as RepoPackageJson;
      i.ft.updateBegin().dp(m);
      const waitForScan = rx.firstValueFrom(o.pt.didScanSource.pipe(
        actionRelatedToAction(m)
      ));

      if (pjson.externalRepo) {
        for (const dir of pjson.externalRepo) {
          o.ft.onProjectLinked(dir).dp(m);
        }
      }
      if (pjson.externalDir) {
        for (const d of pjson.externalDir) {
          o.ft.onDirLinked(d).dp(m);
        }
      }
      o.ft.onProjectLinked('').dp(m);
      i.ft.updateEnd().dp(m);
      o.ft.rootPackageJson(pjson).dp(m);
      await Promise.all([
        waitForScan,
        // check spaces
        spaceDependencyMap.size > 0 ?
          rx.firstValueFrom(rx.from(spaceDependencyMap.keys()).pipe(
            rx.mergeMap(async name => {
              try {
                const stat = await fs.promises.stat(Path.resolve(rootDir, name));
                if (!stat.isDirectory()) {
                  i.ft.removeSpace(name).dp(m);
                } else {
                  await rx.firstValueFrom(
                    o.ft.checkSpace(name).do(o.pt.didCheckSpace, m));
                }
              } catch (e) {
                i.ft.removeSpace(name).dp(m);
              }
            })
          )) :
          Promise.resolve()
      ]);
      await rx.firstValueFrom(o.ft.doAllSymlinks().ddo(o.pt.didAllSymlinks));
      o.ft.onScanCompleted().dp(m);
    } catch (e) {
      packagesService.dispatchErrorFor(e, m);
    }
  })
));

r('syncWorkspace, didCheckSpace, didSwitchSpace -> checkSpace, updateCurrentSpace, onSpaceSynced', i.pt.syncWorkspace.pipe(
  rx.mergeMap(a => outputTable.l.rootDir.pipe(
    rx.map(([, rootDir]) => [a, rootDir] as const),
    rx.take(1)
  )),
  rx.concatMap(([[m, space, npmOpts], rootDir]) => {
    const spaceDir = Path.resolve(rootDir, space);
    const spaceKey = Path.relative(rootDir, spaceDir).replace(/\\/g, '/');
    return o.ft.checkSpace(spaceKey).do(o.pt.didCheckSpace, m).pipe(
      rx.take(1),
      rx.mergeMap(async ([, pkgJson]) => {
        const toWrite = {...pkgJson};
        if (pkgJson.dependencies) {
          toWrite.dependencies = {...pkgJson.dependencies};
        }
        for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
          if (allPackages.has(dep)) {
            toWrite.dependencies![dep] = Path.relative(spaceDir, allPackages.get(dep)!.realPath).replace(/\\/g, '/');
          }
        }
        if (pkgJson.devDependencies) {
          toWrite.devDependencies = {...pkgJson.devDependencies};
        }
        for (const dep of Object.keys(pkgJson.devDependencies ?? {})) {
          if (allPackages.has(dep)) {
            toWrite.devDependencies![dep] = Path.relative(spaceDir, allPackages.get(dep)!.realPath).replace(/\\/g, '/');
          }
        }
        const spacePkgJsonFile = Path.resolve(spaceDir, 'package.json');
        const backup = Path.resolve(spaceDir, 'package.lock.json');
        await fs.promises.rename(spacePkgJsonFile, backup);
        await rx.firstValueFrom(o.ft.writeFile(spacePkgJsonFile, JSON.stringify(toWrite, null, '  '))
          .ddo(o.pt.didWriteFile, m));
        await new Promise(resolve => setImmediate(resolve));
        const spawnOpt: chr.SpawnOptions = {
          cwd: spaceDir,
          windowsHide: true,
          stdio: 'inherit',
          env: {...process.env}
        };
        delete spawnOpt.env?.NODE_ENV;
        if (process.platform === 'win32') {
          spawnOpt.shell = true;
        }
        try {
          let cp = chr.spawn('npm', ['install'], spawnOpt);
          await new Promise<[number | null, NodeJS.Signals | null]>((resolve, rej) => {
            cp.on('exit', (code, sigal) => resolve([code, sigal] as const));
            cp.on('error', rej);
          });
          if (npmOpts?.dedupe) {
            cp = chr.spawn('npm', ['dedupe'], spawnOpt);
            await new Promise<[number | null, NodeJS.Signals | null]>((resolve, rej) => {
              cp.on('exit', (code, sigal) => resolve([code, sigal] as const));
              cp.on('error', rej);
            });
          }
        } catch (err) {
          console.error(err);
        } finally {
          const actualInstallJson = Path.resolve(spaceDir, 'install.package.json');
          if (fs.existsSync(actualInstallJson)) {
            await fs.promises.unlink(actualInstallJson);
          }
          await fs.promises.rename(spacePkgJsonFile, actualInstallJson);
          void fs.promises.rename(backup, spacePkgJsonFile);
        }
      }),
      rx.mergeMap(() => {
        return i.ft.updateCurrentSpace(spaceKey)
          .do(o.pt.didSwitchSpace, m).pipe(
            rx.take(1)
          );
      }),
      rx.finalize(() => o.ft.onSpaceSynced(spaceKey).dp(m))
    );
  })
));

r('updateCurrentSpace -> createOrChangeSymlink, didSwitchSpace, writeFile',
  i.pt.updateCurrentSpace.pipe(
    rx.filter(([, key]) => key != null),
    rx.distinctUntilChanged(),
    rx.mergeMap(a => outputTable.l.rootDir.pipe(
      rx.map(([, rootDir]) => [...a, rootDir] as const),
      rx.take(1)
    )),
    rx.mergeMap(([m, key, rootDir]) => rx.forkJoin([
      // create symlinks to <space>/node_moodules
      rx.defer(async () => {
        const spaceNodeModulesDir = Path.resolve(rootDir, key!, 'node_modules');
        const pkgSet = spacePkgMap.get(key!)!;
        const projList = [...projPkgMap.keys()];
        const createdNmParentDirs = [] as string[]; // Those directories under which a node_module symlink was previously created
        const waitingTasks = [] as rx.Observable<string>[];
        for (const pkgName of pkgSet) {
          const pkgDir = allPackages.get(pkgName)!.realPath;
          const proj = projList.find(proj => projPkgMap.get(proj)?.has(pkgName));
          if (proj == null) {
            o.ft.onNotifiableError(`Source package ${pkgName} does not belong to any project`).dp(m);
            continue;
          }
          const noModuleSymlinkDirs = repoNoModuleSymlinkDirTable.snapshot.get(proj)?.[2];
          if (createdNmParentDirs.some(dir => pkgDir.startsWith(dir)) ||
              (noModuleSymlinkDirs?.some(dirWithSlashSuffix => pkgDir.startsWith(dirWithSlashSuffix)))) {
          // current package is in child directory of which previously "node_module" symlink was created in
          // so that Node can resolve to the created symlink from current package, so skip creating symlinks to node_modules
            continue;
          }
          const projDir = Path.resolve(rootDir, proj);
          const relPathElements = Path.relative(projDir, pkgDir).split(/[\\/]/);

          // Up from "project directory" down to the "package directory", looking for a directory which is for creating a "node_modules" symlink in
          let foundPerfectDir = false;
          for (let i = 1, l = relPathElements.length; i <= l; i++) {
            const nmDir = Path.join(projDir, ...relPathElements.slice(0, i), 'node_modules');
            try {
              const nmStat = await fs.promises.lstat(nmDir);
              if (nmStat.isDirectory()) {
                if (spaceNodeModulesDir === nmDir) {
                  foundPerfectDir = true;
                }
                continue;
              } else if (nmStat.isSymbolicLink()) {
                createdNmParentDirs.push(Path.dirname(nmDir) + Path.sep);
                void rx.firstValueFrom(o.ft.createOrChangeSymlink(spaceNodeModulesDir, nmDir).do(o.pt.didSymlinkCreation));
                foundPerfectDir = true;
                break;
              }
            } catch (e) {
              waitingTasks.push(o.ft.createOrChangeSymlink(spaceNodeModulesDir, nmDir)
                .do(o.pt.didSymlinkCreation).pipe(
                  rx.take(1),
                  rx.catchError(() => rx.of(false)),
                  rx.map(() => nmDir)
                ));
              createdNmParentDirs.push(Path.dirname(nmDir) + Path.sep);
              foundPerfectDir = true;
              break;
            }
          }
          if (!foundPerfectDir) {
            o.ft.onNotifiableError(`Can not create a symlink of ${Path.join(key!, 'node_modules')} for package ${pkgDir}, please check whether the directory of package is in a proper location`).dp(m);
          }
        }
        return await rx.firstValueFrom(rx.merge(...waitingTasks).pipe(
          rx.reduce((addup, item) => {
            addup.push(item);
            return addup;
          }, [] as string[]),
          // eslint-disable-next-line no-console
          timeoutLog(5000, () => console.log('Slow completion of updateCurrentSpace waitingTasks')),
          rx.map(links => [createdNmParentDirs, links] as const)
        ));
      }).pipe(
        service.labelError('updateCurrentSpace -> createOrChangeSymlink, didSwitchSpace, [create/update symlinks of space node_modules]')
      ),
      // write tsconfig.json to all repo
      rx.merge(
        outputTable.l.installedDrcp.pipe(
          rx.map(a => [a, true] as const)
        ),
        outputTable.l.linkedDrcp.pipe(
          rx.map(a => [a, false] as const)
        )
      ).pipe(
        rx.filter(([[, pkgInfo]]) => pkgInfo != null),
        rx.take(1),
        rx.mergeMap(([[, plinkPkg], isInstalled]) => {
          return createTsConfigForRepos(
            plinkPkg!.realPath,
            !isInstalled,
            Path.resolve(rootDir, key!),
            [...projPkgMap.keys()],
            rootDir,
            allPackages,
            [...spaceDependencyMap.get(key!)!.values()],
            {}
          );
        }),
        rx.mergeMap(([tsConfigFile, json]) => o.ft.writeFile(tsConfigFile, JSON.stringify(json, null, '  '))
          .do(o.pt.didWriteFile).pipe(rx.take(1))
        ),
        rx.count()
      )
    ]).pipe(
      rx.tap(([[createdNmParentDirs, links], fileWrittenCount]) =>
        o.ft.didSwitchSpace(key!, createdNmParentDirs, links, fileWrittenCount).dp(m)
      )
    ))
  ));

r('onProjectLinked, onDirLinked, rootPackageJson -> didScanSource',
  rx.from(import('../recipe-manager.js')).pipe(
    rx.mergeMap(rm => i.pt.updateBegin.pipe(
      rx.mergeMap(([m]) => outputTable.l.rootDir.pipe(
        rx.map(([, rootDir]) => [m, rootDir] as const)
      )),
      rx.switchMap(([m, rootDir]) => rx.forkJoin([
        o.pt.onProjectLinked.pipe(
          actionRelatedToActionRelatives(m),
          rx.takeUntil(i.pt.updateEnd.pipe(
            actionRelatedToActionRelatives(m)
          )),
          rx.reduce((arr, [, dir]) => {
            arr.push(Path.resolve(rootDir, dir));
            return arr;
          }, [] as string[]),
          rx.map(dirs => {
            rm.setProjectList(dirs);
            return true;
          })
        ),
        o.pt.onDirLinked.pipe(
          actionRelatedToActionRelatives(m),
          rx.takeUntil(i.pt.updateEnd.pipe(
            actionRelatedToActionRelatives(m)
          )),
          rx.reduce((arr, [, dirPattern]) => {
            arr.push(dirPattern);
            return arr;
          }, [] as string[]),
          rx.map(dirs => {
            rm.setLinkPatterns(dirs);
            return true;
          })
        ),
        rx.of(m)
      ]).pipe(
        rx.mergeMap(([, , m]) => {
          // const packageToBeDeleted = new Set<string>(allPackages.keys());
          return rx.concat(
            rm.scanPackages().pipe(
              rx.map(([proj, jsonFile, srcDir]) => {
                const info = createPackageInfo(jsonFile, false);
                if (info.json.dr == null && info.json.plink == null)
                  return;

                if (proj) {
                  i.ft.addPackageToProject(proj, 'repo', info).dp(m);
                } else if (srcDir) {
                  i.ft.addPackageToProject(srcDir, 'dir', info).dp(m);
                } else {
                  // eslint-disable-next-line no-console
                  console.log(`Package of ${jsonFile} is skipped (due to no "dr" or "plink" property)`, info.json);
                }
              })
            ),
            new rx.Observable(sub => {
              o.ft.didScanSource().dp(m.r);
              sub.complete();
            })
          );
        })
      ))
    ))
  ));

r('onProjectLinked -> repoPkgJson, repoNoModuleSymlinkDirs', o.pt.onProjectLinked.pipe(
  rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(b => [a, b] as const), rx.take(1))),
  rx.mergeMap(async ([[m, dir], [, rootDir]]) => {
    const projDir = Path.resolve(rootDir, dir);
    const jsonFile = Path.resolve(projDir, 'package.json');
    if (!fs.existsSync(jsonFile))
      return;
    const content = await fs.promises.readFile(jsonFile, 'utf8');
    const json = JSON.parse(content) as RepoPackageJson;
    o.ft.repoPkgJson(projDir, json).dp(m);
    const noModuleSymlinkDirs = (json.plink?.noModuleSymlink ?? []).map(dir => Path.resolve(projDir, dir) + Path.sep);
    o.ft.repoNoModuleSymlinkDirs(projDir, noModuleSymlinkDirs).dp(m);
  })
));

r('checkSpace, rootDir -> updateDependencyOfSpace, didCheckSpace', o.pt.checkSpace.pipe(
  rx.mergeMap(a => outputTable.l.rootDir.pipe(
    rx.filter(([, dir]) => dir != null),
    rx.take(1),
    rx.map(b => [a, b] as const)
  )),
  rx.concatMap(async ([[mOfCheckSpace, spaceKey], [, rootDir]]) => {
    // const spaceKey = Path.relative(rootDir, Path.resolve(rootDir, spaceDir));
    const spacePkgJsonFile = Path.resolve(rootDir, spaceKey, 'package.json');
    const content = await fs.promises.readFile(spacePkgJsonFile, 'utf8');
    const json = JSON.parse(content) as PackageJsonInterf;
    i.ft.updateDependencyOfSpace(spaceKey, (json.dependencies ? Object.keys(json.dependencies) : []).concat(
      json.devDependencies ? Object.keys(json.devDependencies) : []
    )).dp(mOfCheckSpace.r);
    o.ft.didCheckSpace(json).dp(mOfCheckSpace);
  })
));

r('deletePackageOfSpace -> didRemoveSymlink', i.pt.deletePackageOfSpace.pipe(
  rx.mergeMap(a => outputTable.l.rootDir.pipe(
    rx.map(([, b]) => [...a, b] as const),
    rx.take(1)
  )),
  rx.mergeMap(async ([m, wsKey, pkName, rootDir]) => {
    const link = Path.resolve(rootDir, wsKey, 'node_modules', pkName);
    try {
      await fs.promises.unlink(link);
      return o.ft.didRemoveSymlink(link).dp(m);
    } catch (e) {
      return o.ft.didRemoveSymlink(link).dp(m);
    }
  })
));

r('createOrChangeSymlink -> didSymlinkCreation', o.pt.createOrChangeSymlink.pipe(
  rx.mergeMap(([m, targetPath, linkPath]) => symlinkAsync(targetPath, linkPath)
    .then(success => o.ft.didSymlinkCreation(success).dp(m))
    .catch(() => o.ft.didSymlinkCreation(false).dp(m)))
));

r('writeFile -> didWriteFile', o.pt.writeFile.pipe(
  rx.mergeMap(([m, file, content]) => fs.promises.writeFile(file, content, 'utf8')
    .then(() => o.ft.didWriteFile().dp(m))
    .catch(e => service.dispatchErrorFor(e, m)))
));

r('doAllSymlinks -> addPackageToSpace, createOrChangeSymlink, didSymlinkCreation, deletePackageOfSpace, didRemoveSymlink', o.pt.doAllSymlinks.pipe(
  rx.mergeMap(a => outputTable.l.rootDir.pipe(
    rx.map(b => [a, b] as const),
    rx.take(1)
  )),
  rx.mergeMap(([[m], [, rootDir]]) => {
    // let removeSymlinkCount = 0;
    const waitObservables = [] as rx.Observable<string>[];
    for (const [spaceKey, deps] of spaceDependencyMap) {
      const spaceDir = Path.join(rootDir, spaceKey);
      const sourcePkgOfSpace = spacePkgMap.get(spaceKey);
      for (const pkgName of sourcePkgOfSpace ?? [] as string[]) {
        if (!allPackages.has(pkgName)) {
          waitObservables.push(i.ft.deletePackageOfSpace(spaceKey, pkgName).do(o.pt.didRemoveSymlink, m).pipe(
            rx.take(1), rx.map(() => 'd')
          ));
        }
      }
      for (const dep of deps) {
        const pkg = allPackages.get(dep);
        const realPath = pkg ? Path.relative(spaceDir, pkg.realPath) : null;
        if (realPath) {
          if (!sourcePkgOfSpace?.has(dep)) {
            i.ft.addPackageToSpace(spaceKey, dep).dp(m);
          }
          waitObservables.push(o.ft.createOrChangeSymlink(realPath, Path.join(spaceDir, 'node_modules', dep))
            .do(o.pt.didSymlinkCreation, m)
            .pipe(
              rx.take(1),
              rx.map(([, success]) => success ? 'a' : ''),
              rx.catchError(err => rx.EMPTY)
            ));
        } else {
          if (sourcePkgOfSpace?.has(dep)) {
            i.ft.deletePackageOfSpace(spaceKey, dep).dp(m);
            const link = Path.join(spaceDir, 'node_modules', dep);
            waitObservables.push(i.ft.deletePackageOfSpace(spaceKey, dep).do(o.pt.didRemoveSymlink, m).pipe(
              rx.take(1), rx.map(() => 'd')
            ));
            o.ft.didRemoveSymlink(link).dp(m);
          }
        }
      }
    }
    return rx.merge(...waitObservables).pipe(
      rx.reduce((statistics, res) => {
        if (res === 'a')
          statistics[0]++;
        else if (res === 'd')
          statistics[1]++;
        return statistics;
      }, [0, 0] as [added: number, deleted: number]),
      rx.map(([added, deleted]) => o.ft.didAllSymlinks(added, deleted).dp(m))
    );
  })
));

