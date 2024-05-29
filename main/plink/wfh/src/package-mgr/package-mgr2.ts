import Path from 'node:path';
import fs from 'node:fs';
import * as chr from 'node:child_process';
import util from 'util';
import * as rx from 'rxjs';
import _ from 'lodash';
import {ReactorComposite2, SingleActionFactory, actionRelatedToAction, actionRelatedToActionRelatives,
  pairActionToActionStream, ReactorCompositeMergeType} from '@wfh/reactivizer';
import {symlinkAsync} from '../utils/symlinks';
import {plinkEnv} from '../utils/misc';
import * as rm0 from '../recipe-manager';
import {RepoPackageJson, createStoreService, PackageMgr2ModelType} from './package-mgr2-model';
import {PackageJsonInterf, createPackageInfo} from './package-mgr2-utils';
import {createSwitchSpaceService, INSTALLATION_JSON_FILE, PackageMgr2SpaceSwitchServiceType} from './package-mgr2-switch';
import type {PackageInfo} from './index';
// import inspector from 'inspector';
// inspector.open(9222);

type PackageMgrActions = {
  /** scan current project,
   * Related by actions: rootPackageJson
   **/
  scan(rootDir: string): SingleActionFactory;
  /** Create symlinks and install dependency */
  runInstall(spaceKey: string): SingleActionFactory;
};

interface PackagesInternalSteps {
  checkSpace(spaceKey: string): SingleActionFactory;
  /** Respond to switchToSpace  */
  didRemoveSymlink(link: string): SingleActionFactory;
  didScanSource(): SingleActionFactory;
  didPackagesScan(changedOrAdded: PackageInfo[], deleted: PackageInfo[]): SingleActionFactory;
  didSyncSpacePackages(): SingleActionFactory;
  didCheckSpace(key: string, spacePackageJson: PackageJsonInterf): SingleActionFactory;
  didRunInstall(spaceKey: string): SingleActionFactory;
}

/** Intercept these messages to replace with virtual file operations, in case we need to test or for "dry run" */
interface PackageMgrFileEvents {
  createOrChangeSymlink(linkTarget: string, link: string): SingleActionFactory;
  /** @return false in case symlink already exists or other reason (but not include errors) */
  didSymlinkCreation(success: boolean): SingleActionFactory;
  writeFile(file: string, content: string): SingleActionFactory;
  /** Relates to writeFile */
  didWriteFile(): SingleActionFactory;
  didSwitchSpace(spaceKey: string | null, symlinksToSpace: string[], actuallyCreated: string[], workspaceCount: number, tsconfiFileWritten: number): SingleActionFactory;
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
const outputTableFor = ['rootPackageJson', 'rootDir', 'linkedDrcp', 'installedDrcp', 'didSwitchSpace'] as const;
export type PackageMgrServiceType = ReactorComposite2<PackageMgrActions, PackageMgrEvents, typeof inputTableFor, typeof outputTableFor>;

export type PackageMgrFullServiceType = ReactorCompositeMergeType<
ReactorCompositeMergeType<PackageMgrServiceType, PackageMgr2ModelType>,
PackageMgr2SpaceSwitchServiceType
>;

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

  const {service: withModelService} = createStoreService(packagesService);
  const service = createSwitchSpaceService(withModelService);

  const {i, o, r, outputTable} = service;

  if (plinkEnv.isDrcpSymlink) {
    o.ft.linkedDrcp(createPackageInfo(Path.resolve(plinkEnv.plinkDir, 'package.json'))).dp();
    o.ft.installedDrcp(null).dp();
  } else {
    o.ft.linkedDrcp(null).dp();
    o.ft.installedDrcp(createPackageInfo(Path.resolve(plinkEnv.plinkDir, 'package.json'))).dp();
  }

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
    rx.mergeMap(a => outputTable.l.rootDir.pipe(
      rx.map(([, rootDir]) => [...a, rootDir] as const),
      rx.take(1)
    )),
    rx.concatMap(async ([m, spaceKey, rootDir]) => {
      const spaceDir = Path.resolve(rootDir, spaceKey);
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
        o.ft.didRunInstall(spaceKey).dp(m);
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
      rx.map(([m, key]) => [m, _.trim(key!, '/')] as const),
      rx.mergeMap(([m, keyOrDir]) => outputTable.l.rootDir.pipe(
        rx.map(([, rootDir]) => [m, Path.relative(rootDir, Path.resolve(rootDir, keyOrDir)), rootDir] as const),
        rx.take(1)
      )),
      rx.concatMap(([m, spaceKey, rootDir]) => {
        return o.ft.checkSpace(spaceKey).od(o.pt.didCheckSpace).pipe(
          rx.mergeMap(() => outputTable.l.data_spacePkgMap),
          rx.map(([, spacePkgMap]) => [m, rootDir, spacePkgMap.get(spaceKey) ?? new Set<string>()] as const),
          rx.combineLatestWith(outputTable.l.data_projPkgMap, outputTable.l.data_allPackages, outputTable.l.data_spaceDependencyMap),
          rx.take(1),
          rx.mergeMap(([[m, rootDir, pkgSet], [, projPkgMap], [, allPackages], [, spaceDependency]]) => {
            const steps = i.ft.doingSwitchSpace(rootDir, spaceKey, pkgSet, projPkgMap, allPackages, spaceDependency).re(m).od(
              o.pt.didCreatingSymlinksToInstallDir, o.pt.didCreatingWorkspaceSymlinks
            );
            return rx.zip(steps).pipe(
              rx.take(1)
            );
          }),
          rx.mergeMap(([[, createdNmParentDirs, links], [, workspaceCount]]) => {
            return i.ft.runInstall(spaceKey).re(m).od(o.pt.didRunInstall).pipe(
              pairActionToActionStream(o.pt.didWriteTsConfigFiles),
              rx.mergeMap(a$ => a$),
              rx.map(([, fileWrittenCount]) => {
                o.ft.didSwitchSpace(spaceKey, createdNmParentDirs, links, workspaceCount, fileWrittenCount).dp(m);
              }),
              rx.take(1)
            );
          }),
          service.catchErrorFor(m)
        );
      })
    )
  );

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
  o.ft.didSwitchSpace(null, [], [], 0, 0).dp();
  return service;
}
