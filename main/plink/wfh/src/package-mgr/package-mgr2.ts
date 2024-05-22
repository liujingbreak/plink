import Path from 'node:path';
import fs from 'node:fs';
import * as chr from 'node:child_process';
import util from 'util';
import * as rx from 'rxjs';
import {ReactorComposite2, SingleActionFactory, actionRelatedToAction, actionRelatedToActionRelatives,
  timeoutLog} from '@wfh/reactivizer';
import {symlinkAsync} from '../utils/symlinks';
import {plinkEnv} from '../utils/misc';
import * as rm0 from '../recipe-manager';
import {cmdModelService} from '../plink2/cmd-model';
import {RepoPackageJson, createStoreService, PackageMgr2ModuleOutput} from './package-mgr2-model';
import {PackageJsonInterf, createPackageInfo, createTsConfigForRepos} from './package-mgr2-utils';
import type {PackageInfo} from './index';
// import inspector from 'inspector';
// inspector.open(9222);

// const log = getLogger('plink.package-mgr2');
const INSTALLATION_JSON_FILE = '.plink.install.json';

type PackageMgrActions = {
  /** scan current project,
   * Related by actions: rootPackageJson
   **/
  scan(rootDir: string): SingleActionFactory;
  /** Create symlinks and install dependency */
  runInstall(): SingleActionFactory;
};

interface PackagesInternalSteps {
  checkSpace(spaceKey: string): SingleActionFactory;
  /** Respond to switchToSpace  */
  doingSwitchSpace(rootDir: string, key: string, pkgSet: Set<string>, projPkgMap: Map<string, Set<string>>, allPackages: Map<string, PackageInfo>): SingleActionFactory;
  didRemoveSymlink(link: string): SingleActionFactory;
  didScanSource(): SingleActionFactory;
  didPackagesScan(changedOrAdded: PackageInfo[], deleted: PackageInfo[]): SingleActionFactory;
  didSyncSpacePackages(): SingleActionFactory;
  didCheckSpace(key: string, spacePackageJson: PackageJsonInterf): SingleActionFactory;
  didSwitchSpace(spaceKey: string, symlinksToSpace: string[], actuallyCreated: string[], workspaceCount: number, tsconfiFileWritten: number): SingleActionFactory;
  didRunInstall(spaceKey: string): SingleActionFactory;

  // doSymlinksOfSrcPkg(): SingleActionFactory;
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
  /** @param dirs each directory string must ends with path.sep */
  repoNoModuleSymlinkDirs(projDir: string, dirs: string[]): SingleActionFactory;
  rootDir(dir: string): SingleActionFactory;
  onProjectLinked(projDir: string): SingleActionFactory;
  /** Associate an external dirctory which contains source packages */
  onDirLinked(dir: string): SingleActionFactory;
  onNotifiableError(content: string): SingleActionFactory;
  linkedDrcp(pkgInfo: PackageInfo | null): SingleActionFactory;
  installedDrcp(pkgInfo: PackageInfo | null): SingleActionFactory;
}

const inputTableFor = ['scan'] as const;
const outputTableFor = ['rootPackageJson', 'rootDir', 'linkedDrcp', 'installedDrcp'] as const;

export type PackageMgrServiceType = ReactorComposite2<PackageMgrActions, PackageMgrEvents & PackageMgr2ModuleOutput, typeof inputTableFor, typeof outputTableFor>;

export function createPackageMgrService() {
  const packagesService = new ReactorComposite2<PackageMgrActions, PackageMgrEvents, typeof inputTableFor, typeof outputTableFor>({
    name: 'PackageMgr2',
    debug: false,
    inputTableFor,
    outputTableFor,
    debugExcludeTypes: ['createOrChangeSymlink', 'didSymlinkCreation', 'writeFile'],
    log(...obj) {
      // eslint-disable-next-line no-console
      console.log(...obj.map(value => typeof value === 'string' ? value : util.inspect(value, false, 0)));
    }
  });

  const {service} = createStoreService(packagesService);

  const {i, o, r, inputTable, outputTable} = service;
  const repoNoModuleSymlinkDirTable = service.o.createDataTable('repoNoModuleSymlinkDirs', ([, projKey]) => projKey);
  const npmInstallSpacePkgJsonTable = service.o.createDataTable('didCheckSpace', ([, key]) => key);

  if (plinkEnv.isDrcpSymlink) {
    o.ft.linkedDrcp(createPackageInfo(Path.resolve(plinkEnv.plinkDir, 'package.json'))).dp();
    o.ft.installedDrcp(null).dp();
  } else {
    o.ft.linkedDrcp(null).dp();
    o.ft.installedDrcp(createPackageInfo(Path.resolve(plinkEnv.plinkDir, 'package.json'))).dp();
  }

  r('cmdModelService.enableRxMessageTrace ->', cmdModelService.inputTable.l.enableRxMessageTrace.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.map(([, enabled]) => {
      service.config({debug: enabled});
    })
  ));

  r('scan, didScanSource -> rootDir, onProjectLinked, onDirLinked, rootPackageJson', i.pt.scan.pipe(
    rx.concatMap(async ([m, rootDir]) => {
      try {
        o.ft.rootDir(rootDir).dp(m);
        const content = await fs.promises.readFile(Path.join(rootDir, 'package.json'), 'utf8');
        const pjson = JSON.parse(content) as RepoPackageJson;
        i.ft.updatePackagesBegin().dp(m);
        const waitForScan = rx.firstValueFrom(o.pt.didScanSource.pipe(
          actionRelatedToAction(m)
        ));

        if (pjson.plink?.externalRepo) {
          for (const dir of pjson.plink.externalRepo) {
            o.ft.onProjectLinked(dir).dp(m);
          }
        }
        if (pjson.plink?.externalDir) {
          for (const d of pjson.plink.externalDir) {
            o.ft.onDirLinked(d).dp(m);
          }
        }
        o.ft.onProjectLinked('').dp(m);
        o.ft.rootPackageJson(pjson).dp(m);
        await waitForScan;
        i.ft.updatePackagesEnd().dp(m);
        o.ft.onScanCompleted().dp(m);
      } catch (e) {
        packagesService.dispatchErrorFor(e, m);
      }
    })
  ));

  r('onProjectLinked, onDirLinked, rootPackageJson -> didScanSource, addPackageToProject',
    i.pt.updatePackagesBegin.pipe(
      rx.mergeMap(a => outputTable.l.rootDir.pipe(
        rx.map(([, rootDir]) => [a, require('../recipe-manager') as typeof rm0, rootDir] as const),
        rx.take(1)
      )),
      rx.switchMap(([[m], rm, rootDir]) => rx.combineLatest([
        o.pt.onProjectLinked.pipe(
          actionRelatedToActionRelatives(m),
          rx.takeUntil(o.pt.rootPackageJson.pipe(
            actionRelatedToActionRelatives(m)
          )),
          // rx.mergeMap(async ([, dir]) => {
          //   const projPkgJson = JSON.parse(await fs.promises.readFile(Path.resolve(rootDir, dir, 'package.json'), 'utf8')) as RepoPackageJson;
          //   if (projPkgJson.workspaces) {
          //     for (const pkgPath of projPkgJson.workspaces) {
          //       const info = createPackageInfo(Path.resolve(dir, pkgPath, 'package.json'), false);
          //       if (info.json.plink)
          //         i.ft.addPackageToProject(dir, 'repo', info).dp(m);
          //     }
          //   }
          //   return dir;
          // }),
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
          rx.takeUntil(o.pt.rootPackageJson.pipe(
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
    )
  );

  const onSpaceDependencyChanged$ = rx.concat(
    outputTable.l.data_spaceDependencyMap.pipe(rx.take(1)),
    i.pt.updateDependencyOfSpace.pipe(
      rx.mergeMap(([m]) => outputTable.l.data_spaceDependencyMap.pipe(
        rx.take(1),
        rx.map(([, ...a]) => [m, ...a] as const)
      ))
    )
  );

  r('didScanSource, data_allPackages, updateDependencyOfSpace, data_spaceDependencyMap -> addPackageToSpace, deletePackageOfSpace, didSyncSpacePackages', rx.combineLatest([
    o.pt.didScanSource.pipe(
      rx.mergeMap(() => outputTable.l.data_allPackages.pipe(
        rx.take(1)
      ))
    ),
    onSpaceDependencyChanged$
  ]).pipe(
    rx.withLatestFrom(outputTable.l.data_spacePkgMap),
    rx.map(([[[, allPackages], [m, spaceDependencyMap]], [, spacePkgMap]]) => {
      for (const [spaceKey, depSet] of spaceDependencyMap.entries()) {
        const spacePkgSet = spacePkgMap.get(spaceKey);
        for (const dep of depSet) {
          if ((spacePkgSet == null || !spacePkgSet.has(dep)) && allPackages.has(dep))
            i.ft.addPackageToSpace(spaceKey, dep).dp(m.r);
        }
      }
      for (const [spaceKey, pkgSet] of spacePkgMap.entries()) {
        const depSet = spaceDependencyMap.get(spaceKey);
        for (const pkgName of [...pkgSet]) {
          if (depSet == null || !depSet.has(pkgName) || !allPackages.has(pkgName))
            i.ft.deletePackageOfSpace(spaceKey, pkgName).dp(m.r);
        }
      }
      o.ft.didSyncSpacePackages().dp(m.r);
    })
  ));

  r('data_spaceDependencyMap, updateDependencyOfSpace -> removeSpace', onSpaceDependencyChanged$.pipe(
    rx.mergeMap(a => outputTable.l.rootDir.pipe(
      rx.map(b => [a, b] as const),
      rx.take(1)
    )),
    rx.mergeMap(([[m, spaceDependencyMap], [, rootDir]]) => {
      return rx.from(spaceDependencyMap.keys()).pipe(
        rx.mergeMap(async name => {
          try {
            const stat = await fs.promises.stat(Path.resolve(rootDir, name));
            if (!stat.isDirectory()) {
              i.ft.removeSpace(name).dp(m.r);
            }
          } catch (e) {
            i.ft.removeSpace(name).dp(m);
          }
        })
      );
    })
  ));

  r('runInstall -> didRunInstall', i.pt.runInstall.pipe(
    rx.mergeMap(a => rx.combineLatest([
      outputTable.l.rootDir,
      inputTable.l.switchToSpace.pipe(
        rx.filter(([, key]) => key != null)
      )
    ]).pipe(
      rx.map(([[, rootDir], [, spaceKey]]) => [a, rootDir, spaceKey] as const),
      rx.take(1)
    )),
    rx.concatMap(async ([[m], rootDir, spaceKey]) => {
      const spaceDir = Path.resolve(rootDir, spaceKey!);
      const installationJsonFile = Path.resolve(spaceDir, INSTALLATION_JSON_FILE);
      const spacePkgJsonFile = Path.resolve(spaceDir, 'package.json');
      const backup = Path.resolve(spaceDir, 'package.lock.json');
      await fs.promises.rename(spacePkgJsonFile, backup);
      await new Promise(resolve => setImmediate(resolve));
      await fs.promises.rename(installationJsonFile, spacePkgJsonFile);
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
        const cp = chr.spawn('npm', ['install'], spawnOpt);
        const [code, sigal] = await new Promise<[number | null, NodeJS.Signals | null]>((resolve, rej) => {
          cp.on('exit', (code, sigal) => resolve([code, sigal] as const));
          cp.on('error', rej);
        });
        if (code !== 0 && code != null) {
          service.dispatchErrorFor(new Error(`npm install exit code is ${code}(${sigal ?? ''})`), m);
        }
        o.ft.didRunInstall(spaceKey!).dp(m);
      } catch (err) {
        console.error(err);
        service.dispatchErrorFor(err, m);
      } finally {
        await fs.promises.rename(spacePkgJsonFile, installationJsonFile);
        await new Promise(resolve => setImmediate(resolve));
        await fs.promises.rename(backup, spacePkgJsonFile);
      }
    })
  ));

  // Create "workspace" symlinks, create node_module symlink, generate actual package.json for "npm install"
  r('switchToSpace, didCheckSpace -> checkSpace, createOrChangeSymlink, runInstall, didSwitchSpace, writeFile',
    i.pt.switchToSpace.pipe(
      rx.filter(([, key]) => key != null),
      rx.mergeMap(([m, keyOrDir]) => outputTable.l.rootDir.pipe(
        rx.map(([, rootDir]) => [m, Path.relative(rootDir, Path.resolve(rootDir, keyOrDir!)), rootDir] as const),
        rx.take(1)
      )),
      rx.concatMap(([m, spaceKey, rootDir]) => {
        return o.ft.checkSpace(spaceKey).ddo(o.pt.didCheckSpace).pipe(
          rx.mergeMap(() => outputTable.l.data_spacePkgMap),
          rx.map(([, spacePkgMap]) => [m, rootDir, spaceKey, spacePkgMap.get(spaceKey) ?? new Set<string>()] as const),
          rx.combineLatestWith(outputTable.l.data_projPkgMap, outputTable.l.data_allPackages),
          rx.take(1),
          rx.map(([[m, rootDir, key, pkgSet], [, projPkgMap], [, allPackages]]) => o.ft.doingSwitchSpace(rootDir, key, pkgSet, projPkgMap, allPackages).dp(m)),
          rx.mergeMap(([m, rootDir, key, pkgSet, projPkgMap, allPackages]) => rx.forkJoin([
            // 1. create symlinks to <install-space>/node_moodules
            rx.defer(async () => {
              const spaceNodeModulesDir = Path.resolve(rootDir, key, 'node_modules');
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
                  o.ft.onNotifiableError(`Can not create a symlink of ${Path.join(key, 'node_modules')} for package ${pkgDir}, please check whether the directory of package is in a proper location`).dp(m);
                }
              }
              return {createdNmParentDirs, waitingTasks};
            }).pipe(
              // eslint-disable-next-line no-console
              timeoutLog(5000, () => console.log('Slow emission of switchToSpace waitingTasks')),
              rx.mergeMap(({createdNmParentDirs, waitingTasks}) => rx.merge(...waitingTasks).pipe(
                rx.reduce((addup, item) => {
                  addup.push(item);
                  return addup;
                }, [] as string[]),
                // eslint-disable-next-line no-console
                timeoutLog(5000, () => console.log('Slow completion of switchToSpace waitingTasks')),
                rx.map(links => [createdNmParentDirs, links] as const)
              )),
              service.labelError('switchToSpace -> createOrChangeSymlink, didSwitchSpace, [create/update symlinks of space node_modules]')
            ),
            // 2. create "worksapce" symlinks under "npm install" directory
            rx.from(pkgSet).pipe(
              rx.mergeMap(async (pkgName, idx) => {
                if (idx === 0) {
                  try {
                    await fs.promises.mkdir(Path.resolve(rootDir, key, 'workspaces'));
                  } catch (e) { /* empty */ }
                }
                const fakeNpmWorkspace = Path.resolve(rootDir, key, 'workspaces', pkgName);
                const realPath = allPackages.get(pkgName)?.realPath;
                if (realPath) {
                  await rx.firstValueFrom(o.ft.createOrChangeSymlink(realPath, fakeNpmWorkspace)
                    .ddo(o.pt.didSymlinkCreation, m));
                  return 'workspaces/' + pkgName;
                } else {
                  o.ft.onNotifiableError(`Unknown error, create not create "NPM workspace" for package ${pkgName}, package is missing`);
                  return null;
                }
              }),
              rx.reduce((acc, it) => {
                if (it)
                  acc.push(it);
                return acc;
              }, [] as string[]),
              rx.mergeMap(a => npmInstallSpacePkgJsonTable.getPayloadStreamOfKey(key).pipe(
                rx.take(1),
                rx.map(b => [a, b] as const)
              )),
              // rx.map(([workspaces, [, , json]]) => {
              //   console.log('workspaces', workspaces, json);
              //   return workspaces.length;
              // }),
              rx.mergeMap(async ([workspaces, [, , json]]) => {
                const toWrite = {...json};
                toWrite.workspaces = (toWrite.workspaces ?? []).concat(workspaces);
                if (json.dependencies) {
                  toWrite.dependencies = {};
                  for (const [k, v] of Object.entries(json.dependencies))  {
                    if (!pkgSet?.has(k))
                      toWrite.dependencies[k] = v;
                  }
                }
                if (json.devDependencies) {
                  toWrite.devDependencies = {};
                  for (const [k, v] of Object.entries(json.devDependencies))  {
                    if (!pkgSet?.has(k))
                      toWrite.devDependencies[k] = v;
                  }
                }
                await rx.firstValueFrom(o.ft.writeFile(Path.resolve(rootDir, key, INSTALLATION_JSON_FILE), JSON.stringify(toWrite, null, '  '))
                  .do(o.pt.didWriteFile, m));
                return workspaces.length;
              }),
              service.labelError('Creating NPM workspace in ' + Path.resolve(rootDir, key))
            ),
            // 3. write tsconfig.json to all repo
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
              rx.withLatestFrom(outputTable.l.data_spaceDependencyMap),
              rx.mergeMap(([[[, plinkPkg], isInstalled], [, spaceDependencyMap]]) => {
                return createTsConfigForRepos(
                  plinkPkg!.realPath,
                  !isInstalled,
                  Path.resolve(rootDir, key),
                  [...projPkgMap.keys()],
                  rootDir,
                  allPackages,
                  [...spaceDependencyMap.get(key)!.values()],
                  {},
                  [...allPackages.values()].flatMap(pkg => {
                    const dir = Path.relative(rootDir, pkg.realPath).replace(/\\/g, '/');
                    return [dir + '/**/*.ts', dir + '/**/*.mts', dir + '/**/*.cts'];
                  })
                );
              }),
              rx.mergeMap(([tsConfigFile, json]) => o.ft.writeFile(tsConfigFile, JSON.stringify(json, null, '  '))
                .do(o.pt.didWriteFile).pipe(rx.take(1))
              ),
              rx.count()
            )
          ]).pipe(
            rx.mergeMap(([[createdNmParentDirs, links], workspaceCount, fileWrittenCount]) => {
              return i.ft.runInstall().ddo(o.pt.didRunInstall, m).pipe(
                rx.take(1),
                rx.tap(() =>
                  o.ft.didSwitchSpace(key, createdNmParentDirs, links, workspaceCount, fileWrittenCount).dp(m)
                )
              );
            })
          )),
          service.catchErrorFor(m)
        );
      })
    ));

  r('checkSpace, rootDir -> updateDependencyOfSpace, didCheckSpace', o.pt.checkSpace.pipe(
    rx.mergeMap(a => outputTable.l.rootDir.pipe(
      rx.filter(([, dir]) => dir != null),
      rx.take(1),
      rx.map(b => [a, b] as const)
    )),
    rx.concatMap(async ([[mOfCheckSpace, spaceKey], [, rootDir]]) => {
      try {
        const spaceDir = Path.resolve(rootDir, spaceKey);
        const spacePkgJsonFile = Path.resolve(rootDir, spaceKey, 'package.json');
        const content = await fs.promises.readFile(spacePkgJsonFile, 'utf8');
        const json = JSON.parse(content) as PackageJsonInterf;
        let workspacePkgs = [] as string[];
        if (json.workspaces) {
          workspacePkgs = await rx.firstValueFrom(rx.from(json.workspaces).pipe(
            rx.mergeMap(async pkgPath => {
              const pkgDir = Path.resolve(spaceDir, pkgPath);
              try {
                const stat = await fs.promises.lstat(pkgDir);
                if (!stat.isSymbolicLink()) {
                  const pkInfo = createPackageInfo(Path.resolve(pkgPath, 'package.json'), false);
                  return pkInfo.name;
                }
              // eslint-disable-next-line no-empty
              } catch (e) {}
              return null;
            }),
            rx.reduce((all, it) => {
              if (it)
                all.push(it);
              return all;
            }, [] as string[])
          ));
        }
        i.ft.updateDependencyOfSpace(spaceKey, (json.dependencies ? Object.keys(json.dependencies) : []).concat(
          json.devDependencies ? Object.keys(json.devDependencies) : []
        ).concat(workspacePkgs)).dp(mOfCheckSpace.r);
        o.ft.didCheckSpace(spaceKey, json).dp(mOfCheckSpace);
      } catch (err) {
        console.error(err);
        packagesService.dispatchErrorFor(err, mOfCheckSpace);
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

  return service;
}

