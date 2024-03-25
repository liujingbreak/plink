/* eslint-disable @typescript-eslint/indent */
import Path from 'node:path';
import fs from 'node:fs';
import * as rx from 'rxjs';
import {getLogger} from 'log4js';
import {ReactorComposite2, SingleActionFactory, ActionMeta, actionRelatedToAction} from '../../../packages/reactivizer';
import {symlinkAsync} from '../utils/symlinks';
import {RootPackageJson, externalProjects, externalSourceDirs, projPkgMap, srcPkgMap, allPackages,
  spacePkgMap} from './package-mgr2-model';
import {PackageJsonInterf} from './package-mgr2-utils';
import {NpmOptions, PackageInfo, createPackageInfo} from './index';

const log = getLogger('plink.package-mgr2');

type PackagesInput = {
  /** scan current project,
   * Related by actions: rootPackageJson
   **/
  scan(rootDir: string): SingleActionFactory;
  /** Create symlinks and install dependency */
  syncWorkspace(workspace: string, npmOpts: NpmOptions): SingleActionFactory;
};

// interface PackagesChangeTable {
//   npmInstallOpt(data: NpmOptions): SingleActionFactory;
//   inited(d: boolean): SingleActionFactory;
//   srcPackages(d: Map<string, PackageInfo>): SingleActionFactory;
//   /** Key is relative path to root workspace */
//   workspaces(d: Map<string, WorkspaceState>): SingleActionFactory;
//   /** key of current "workspaces" */
//   currWorkspace(d?: string | null): SingleActionFactory;
//   project2Packages(data: Map<string, string[]>): SingleActionFactory;
//   srcDir2Packages(data: Map<string, string[]>): SingleActionFactory;
//   /** Drcp is the original name of Plink project */
//   linkedDrcp(data?: PackageInfo | null): SingleActionFactory;
//   linkedDrcpProject(data?: string | null): SingleActionFactory;
//   installedDrcp(data?: PackageInfo | null): SingleActionFactory;
//   gitIgnores(data: {[file: string]: string[]}): SingleActionFactory;
//   isInChina(data?: boolean): SingleActionFactory;
//   /** Everytime a hoist workspace state calculation is basically done, it is increased by 1 */
//   workspaceUpdateChecksum(data: number): SingleActionFactory;
//   packagesUpdateChecksum(data: number): SingleActionFactory;
//   /** workspace key */
//   lastCreatedWorkspace(data?: string): SingleActionFactory;
// }

interface PackagesChanges {
  /** project loaded state from file, relates to input action "scan" */
  rootPackageJson(json: RootPackageJson): SingleActionFactory;
  rootDir(dir: string): SingleActionFactory;
  onProjectLinked(projDir: string): SingleActionFactory;
  onProjectUnlinked(projDir: string): SingleActionFactory;
  onDirLinked(dir: string): SingleActionFactory;
  onDirUnlinked(dir: string): SingleActionFactory;
  onPackageRemoved(projOrDirKey: string, pkg: PackageInfo): SingleActionFactory;
  onPackageAdded(projOrDirKey: string, pkg: PackageInfo): SingleActionFactory;
  /** For now, it only means the location of package directory is changed */
  onPackageChanged(pkgName: string): SingleActionFactory;
  onSpaceRemoved(wsKey: string): SingleActionFactory;
  /** "dependencies, devDependencies" property of package.json were changed */
  onSpaceAddOrUpdated(wsKey: string, json: PackageJsonInterf): SingleActionFactory;
  onSpacePackageAdded(wsKey: string, packageName: string): SingleActionFactory;
  onSpacePackageRemoved(wsKey: string, packageName: string): SingleActionFactory;
}

interface PackagesInternalSteps {
  checkSpace(wsKey: string): SingleActionFactory;
  createOrChangeSymlink(linkTarget: string, link: string): SingleActionFactory;
  removeSymlink(link: string): SingleActionFactory;
  didScan(): SingleActionFactory;
  didCheckSpace(): SingleActionFactory;
  didSymlinkCreation(): SingleActionFactory;
  didAllSymlinks(count: number): SingleActionFactory;
}

// const packageChangesTable = ['onPackageUpdated', 'onPackageUpdated', 'onSpaceRemoved', 'onSpaceUpdated'] as const;

interface PackagesEvents extends PackagesChanges {
  onScanned(): SingleActionFactory;
  currentSpace(wsKey: string): SingleActionFactory;
}

const inputTableFor = ['scan'] as const;
const outputTableFor = [
  'rootPackageJson', 'rootDir'
  // 'currentSpace', 'inited', 'workspaces', 'project2Packages', 'srcDir2Packages', 'srcPackages',
  // 'gitIgnores', 'workspaceUpdateChecksum', 'packagesUpdateChecksum', 'npmInstallOpt', 'currWorkspace',
  // 'linkedDrcp', 'linkedDrcpProject', 'installedDrcp', 'isInChina'
] as const;

export const packagesService = new ReactorComposite2<PackagesInput, PackagesEvents & PackagesInternalSteps, typeof inputTableFor, typeof outputTableFor>({
  name: 'PackageMgr2',
  inputTableFor,
  outputTableFor,
  log(msg, ...obj) {
    log.info(msg, ...obj);
  }
});

const {i, o, r, outputTable} = packagesService;
r('scan -> rootDir, onProjectLinked, onProjectUnlinked, onDirLinked, onDirUnlinked, rootPackageJson, onSpaceRemoved, checkSpace', i.pt.scan.pipe(
  rx.concatMap(async ([m, rootDir]) => {
    try {
      const didAllSymlinks = rx.firstValueFrom(o.pt.didAllSymlinks.pipe(actionRelatedToAction(m)));
      o.ft.rootDir(rootDir).dp(m);
      o.ft.onProjectLinked(rootDir).dp(m);
      const content = await fs.promises.readFile(Path.join(rootDir, 'package.json'), 'utf8');
      const pjson = JSON.parse(content) as RootPackageJson;
      if (pjson.externalRepo) {
        for (const k of externalProjects.keys()) {
          externalProjects.set(k, false);
        }
        for (const dir of pjson.externalRepo) {
          const d = Path.resolve(rootDir, dir);
          if (externalProjects.has(d)) {
            o.ft.onProjectLinked(d).dp(m);
            externalProjects.set(d, true);
          }
        }
        for (const [k, active] of externalProjects.entries()) {
          if (!active) {
            o.ft.onProjectUnlinked(k);
            externalProjects.delete(k);
          }
        }
      }
      if (pjson.externalDir) {
        for (const k of externalSourceDirs.keys()) {
          externalSourceDirs.set(k, false);
        }
        for (const dir of pjson.externalDir) {
          const d = Path.resolve(rootDir, dir);
          if (externalSourceDirs.has(d)) {
            o.ft.onDirLinked(d).dp(m);
            externalSourceDirs.set(d, true);
          }
        }
        for (const [k, active] of externalSourceDirs.entries()) {
          if (!active) {
            o.ft.onDirUnlinked(k);
            externalSourceDirs.delete(k);
          }
        }
      }
      o.ft.rootPackageJson(pjson).dp(m);
      // check spaces
      await rx.firstValueFrom(rx.from(spacePkgMap.keys()).pipe(
        rx.mergeMap(async name => {
          try {
            const stat = await fs.promises.stat(Path.resolve(rootDir, name));
            if (!stat.isDirectory()) {
              o.ft.onSpaceRemoved(name).dp(m);
            } else {
              o.ft.checkSpace(name).dp(m);
            }
          } catch (e) {
            o.ft.onSpaceRemoved(name).dp(m);
          }
        })
      ));
      await didAllSymlinks;
    } catch (e) {
      packagesService.dispatchErrorFor(e, m);
    }
  })
));

r('syncWorkspace ->', i.pt.syncWorkspace.pipe(
  rx.groupBy(([, wsKey]) => wsKey),
  rx.mergeMap(group => group.pipe(
    rx.concatMap(([m, wsKey]) => {
    })
  ))
));

r('onProjectLinked, onDirLinked, rootPackageJson -> onPackageAdded, onPackageRemoved, onPackageChanged, didScan',
  rx.from(import('../recipe-manager.js')).pipe(
    rx.switchMap(rm => rx.forkJoin([
      o.pt.onProjectLinked.pipe(
        rx.windowWhen(() => o.pt.rootPackageJson),
        rx.concatMap(group => group.pipe(
          rx.reduce((arr, [, dirPattern]) => {
            arr.push(dirPattern);
            return arr;
          }, [] as string[]),
          rx.map(dirs => {
            rm.setProjectList(dirs);
            return true;
          })
        ))
      ),
      o.pt.onDirLinked.pipe(
        rx.windowWhen(() => o.pt.rootPackageJson),
        rx.concatMap(group => group.pipe(
          rx.reduce((arr, [, dirPattern]) => {
            arr.push(dirPattern);
            return arr;
          }, [] as string[]),
          rx.map(dirs => {
            rm.setLinkPatterns(dirs);
            return true;
          })
        )
      )),
      o.pt.rootPackageJson
    ]).pipe(
      rx.mergeMap(([, , [m2]]) => {
        const m = {i: m2.r as ActionMeta['i']};
        const packageToBeDeleted = new Set<string>(allPackages.keys());
        return rx.concat(
          rm.scanPackages().pipe(
            rx.map(([proj, jsonFile, srcDir]) => {
              const info = createPackageInfo(jsonFile, false);
              if (info.json.dr == null && info.json.plink == null)
                return;

              const pkName = info.name;
              allPackages.set(pkName, info);
              packageToBeDeleted.delete(pkName);
              if (proj) {
                if (!projPkgMap.has(proj))
                  projPkgMap.set(proj, [] as string[]);

                if (!allPackages.has(pkName)) {
                  o.ft.onPackageAdded(proj, info).dp(m);
                } else if (allPackages.get(pkName)?.realPath !== info.realPath) {
                  o.ft.onPackageChanged(pkName).dp(m);
                }
                projPkgMap.get(proj)!.push(pkName);
              } else if (srcDir) {
                if (!srcPkgMap.has(srcDir))
                  srcPkgMap.set(srcDir, []);

                srcPkgMap.get(srcDir)!.push(pkName);
                if (!allPackages.has(pkName)) {
                  o.ft.onPackageAdded(srcDir, info).dp(m);
                } else if (allPackages.get(pkName)?.realPath !== info.realPath) {
                  o.ft.onPackageChanged(pkName).dp(m);
                }
              } else {
                log.debug(`Package of ${jsonFile} is skipped (due to no "dr" or "plink" property)`, info.json);
              }
            })
          ),
          new rx.Observable(sub => {
            // dispatch onPackageRemoved
            for (const delkey of packageToBeDeleted) {
              const pkg = allPackages.get(delkey);
              allPackages.delete(delkey);
              let foundProject = false;
              for (const [proj, pkgs] of projPkgMap.entries()) {
                const idx = pkgs.indexOf(delkey);
                if (idx >= 0) {
                  o.ft.onPackageRemoved(proj, pkg!).dp(m);
                  pkgs.splice(idx, 1);
                  foundProject = true;
                  break;
                }
              }
              if (!foundProject) {
                for (const [proj, pkgs] of srcPkgMap.entries()) {
                  const idx = pkgs.indexOf(delkey);
                  if (idx >= 0) {
                    o.ft.onPackageRemoved(proj, pkg!).dp();
                    pkgs.splice(idx, 1);
                    foundProject = true;
                    break;
                  }
                }
              }
            }
            o.ft.didScan().dp(m);
            sub.complete();
          })
        );
      })
    ))
  ));

r('checkSpace, rootDir -> onSpaceAddOrUpdated, onSpacePackageAdded, onSpacePackageRemoved, didCheckSpace', o.pt.checkSpace.pipe(
  rx.mergeMap(a => outputTable.l.rootDir.pipe(
    rx.filter(([, dir]) => dir != null),
    rx.take(1),
    rx.map(b => [a, b] as const)
  )),
  rx.concatMap(async ([[mOfCheckSpace, spaceDir], [, rootDir]]) => {
    const m = {i: mOfCheckSpace.r as number};
    const spaceKey = Path.relative(rootDir, spaceDir);
    const spacePkgJsonFile = Path.resolve(rootDir, spaceDir, 'package.json');
    const content = await fs.promises.readFile(spacePkgJsonFile, 'utf8');
    const json = JSON.parse(content) as PackageJsonInterf;
    if (!spacePkgMap.has(spaceKey))
      o.ft.onSpaceAddOrUpdated(spaceKey, json).dp(m);
    else {
      const existing = spacePkgMap.get(spaceKey);
      const toDelete = new Set(existing);
      if (json.dependencies) {
        for (const [key] of Object.entries(json.dependencies)) {
          if (!toDelete.has(key)) {
            o.ft.onSpacePackageAdded(spaceKey, key).dp(m);
          } else {
            toDelete.delete(key);
          }
        }
      }
      if (json.devDependencies) {
        for (const [key] of Object.entries(json.devDependencies)) {
          if (!toDelete.has(key)) {
            o.ft.onSpacePackageAdded(spaceKey, key).dp(m);
          } else {
            toDelete.delete(key);
          }
        }
      }
      for (const key of toDelete) {
        o.ft.onSpacePackageRemoved(spaceKey, key).dp(m);
      }
    }
    o.ft.didCheckSpace().dp(m);
  })
));

r('onSpaceRemoved', o.pt.onSpaceRemoved.pipe(
  rx.map(([, name]) => spacePkgMap.delete(name))
));

r('onSpacePackageAdded, onPackageChanged -> createOrChangeSymlink', rx.merge(
  o.pt.onPackageChanged.pipe(
    rx.mergeMap(([m, pkName]) => {
      return rx.from(spacePkgMap.entries()).pipe(
        rx.filter(([, packageSet]) => packageSet.has(pkName)),
        rx.map(([wsKey]) => [m, wsKey, pkName] as const)
      );
    })
  ),
  o.pt.onSpacePackageAdded
).pipe(
  rx.groupBy(([m]) => m.r),
  rx.mergeMap(grouped => grouped.pipe(
    // take until didScan and didCheckSpace were both emitted for group's key
    rx.takeUntil(rx.merge(o.pt.didScan, o.pt.didCheckSpace).pipe(
      rx.filter(([mOfDidScan]) => mOfDidScan.r === grouped.key),
      rx.take(2),
      rx.count()
    )),
    rx.mergeMap(a => outputTable.l.rootDir.pipe(
      rx.map(([, b]) => [...a, b] as const),
      rx.take(1)
    )),
    rx.mergeMap(([m, wsKey, pkgName, rootDir]) => o.ft.createOrChangeSymlink(
      allPackages.get(pkgName)!.realPath,
      Path.resolve(rootDir, wsKey, 'node_modules', pkgName)
    ).do(o.pt.didSymlinkCreation, m).pipe(
      rx.take(1)
    )),
    rx.count(),
    rx.map(count => o.ft.didAllSymlinks(count).dp({i: grouped.key as ActionMeta['i']}))
  ))
));

r('onSpacePackageRemoved', o.pt.onSpacePackageRemoved.pipe(
  rx.mergeMap(a => outputTable.l.rootDir.pipe(
    rx.map(([, b]) => [...a, b] as const),
    rx.take(1)
  )),
  rx.mergeMap(([m, wsKey, pkName, rootDir]) => {
    return fs.promises.unlink(Path.resolve(rootDir, wsKey, 'node_modules', pkName));
  })
));

r('createOrChangeSymlink', o.pt.createOrChangeSymlink.pipe(
  rx.mergeMap(([m, targetPath, linkPath]) => symlinkAsync(targetPath, linkPath)
    .finally(() => o.ft.didSymlinkCreation().dp(m)))
));

function createDependencies(dependencies: Record<string, string> | undefined, srcPackages: Map<string, PackageInfo>) {
  const sourceDeps = [] as [string, string][];
  const toInstallDeps = {} as Record<string, string>;
  for (const pair of Object.entries<string>(dependencies || {})) {
    const [name, ver] = pair;
    const pkgInfo = srcPackages.get(name);
    if (pkgInfo) {
      sourceDeps.push(pair);
      toInstallDeps[name] = pkgInfo.realPath;
    } else {
      toInstallDeps[name] = ver;
    }
  }

  return [sourceDeps, toInstallDeps] as const;
}
