import Path from 'node:path';
import fs from 'node:fs';
import util from 'util';
import * as rx from 'rxjs';
import {ReactorComposite2, SingleActionFactory, actionRelatedToAction, actionRelatedToActionRelatives} from '../../../packages/reactivizer';
import {symlinkAsync} from '../utils/symlinks';
import {RootPackageJson, createStoreService} from './package-mgr2-model';
import {PackageJsonInterf, createPackageInfo} from './package-mgr2-utils';
import {NpmOptions, PackageInfo} from './index';

// const log = getLogger('plink.package-mgr2');

type PackageMgrActions = {
  /** scan current project,
   * Related by actions: rootPackageJson
   **/
  scan(rootDir: string): SingleActionFactory;
  /** Create symlinks and install dependency */
  syncWorkspace(workspace: string, npmOpts: NpmOptions): SingleActionFactory;
};

interface PackagesInternalSteps {
  checkSpace(wsKey: string): SingleActionFactory;
  createOrChangeSymlink(linkTarget: string, link: string): SingleActionFactory;
  didRemoveSymlink(link: string): SingleActionFactory;
  didScanSource(): SingleActionFactory;
  didPackagesScan(changedOrAdded: PackageInfo[], deleted: PackageInfo[]): SingleActionFactory;
  didCheckSpaces(): SingleActionFactory;
  didSymlinkCreation(): SingleActionFactory;
  didAllSymlinks(countCreated: number, countDeleted: number): SingleActionFactory;
}

interface PackageMgrEvents extends PackagesInternalSteps {
  /** related to input action "scan" */
  onScanCompleted(): SingleActionFactory;
  rootPackageJson(json: RootPackageJson): SingleActionFactory;
  rootDir(dir: string): SingleActionFactory;
  onProjectLinked(projDir: string): SingleActionFactory;
  onDirLinked(dir: string): SingleActionFactory;
  onSpacePackageRemoved(wsKey: string, packageName: string): SingleActionFactory;
  // currentSpace(wsKey: string): SingleActionFactory;
}

const inputTableFor = ['scan'] as const;
const outputTableFor = ['rootPackageJson', 'rootDir'] as const;

const packagesService = new ReactorComposite2<PackageMgrActions, PackageMgrEvents, typeof inputTableFor, typeof outputTableFor>({
  name: 'PackageMgr2',
  debug: true,
  inputTableFor,
  outputTableFor,
  debugExcludeTypes: ['didSymlinkCreation', 'createOrChangeSymlink'],
  log(...obj) {
    // eslint-disable-next-line no-console
    console.log(...obj.map(value => typeof value === 'string' ? value : util.inspect(value, false, 0)));
  }
});

const {service, spacePkgMap, allPackages} = createStoreService(packagesService);
export {spacePkgMap, service, allPackages};

const {i, o, r, outputTable} = service;

r('scan, didScanSource, didAllSymlinks -> rootDir, onProjectLinked, onDirLinked, rootPackageJson, removeSpace, checkSpace', i.pt.scan.pipe(
  rx.concatMap(async ([m, rootDir]) => {
    try {
      // const didAllSymlinks = rx.firstValueFrom(o.pt.didAllSymlinks.pipe(actionRelatedToAction(m)));
      o.ft.rootDir(rootDir).dp(m);
      const content = await fs.promises.readFile(Path.join(rootDir, 'package.json'), 'utf8');
      const pjson = JSON.parse(content) as RootPackageJson;
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
        spacePkgMap.size > 0 ?
          rx.firstValueFrom(rx.from(spacePkgMap.keys()).pipe(
            rx.mergeMap(async name => {
              try {
                const stat = await fs.promises.stat(Path.resolve(rootDir, name));
                if (!stat.isDirectory()) {
                  i.ft.removeSpace(name).dp(m);
                } else {
                  await rx.firstValueFrom(
                    o.ft.checkSpace(name).do(o.pt.didCheckSpaces, m));
                }
              } catch (e) {
                i.ft.removeSpace(name).dp(m);
              }
            })
          )) :
          Promise.resolve()
      ]);
      // await didAllSymlinks;
      o.ft.onScanCompleted().dp(m);
    } catch (e) {
      packagesService.dispatchErrorFor(e, m);
    }
  })
));

r('onSourcPackageRemoved ->', o.pt.onSourcPackageRemoved.pipe(
  rx.mergeMap(a => outputTable.l.rootDir.pipe(
    rx.map(b => [a, b] as const),
    rx.take(1)
  )),
  rx.mergeMap(([[m, pkgs], [, rootDir]]) => rx.from(pkgs).pipe(
    rx.mergeMap(pkg => rx.from(spacePkgMap.keys()).pipe(
      rx.mergeMap(async ws => {
        const link = Path.resolve(rootDir, ws, 'node_modules', pkg.name);
        try {
          if ((await fs.promises.lstat(link)).isDirectory()) {
            await fs.promises.unlink(link);
            o.ft.didRemoveSymlink(link).dp(m.r);
          }
        } catch (e) {
          return console.log(e);
        }
      })
    ))
  ))
));

r('syncWorkspace ->', i.pt.syncWorkspace.pipe(
  // rx.groupBy(([, wsKey]) => wsKey),
  // rx.mergeMap(group => group.pipe(
  //   rx.concatMap(([m, wsKey]) => {
  //   })
  // ))
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

r('checkSpace, rootDir -> updatePackagesOfSpace, onSpacePackageRemoved, didCheckSpaces', o.pt.checkSpace.pipe(
  rx.mergeMap(a => outputTable.l.rootDir.pipe(
    rx.filter(([, dir]) => dir != null),
    rx.take(1),
    rx.map(b => [a, b] as const)
  )),
  rx.concatMap(async ([[mOfCheckSpace, spaceDir], [, rootDir]]) => {
    const spaceKey = Path.relative(rootDir, Path.resolve(rootDir, spaceDir));
    const spacePkgJsonFile = Path.resolve(rootDir, spaceKey, 'package.json');
    const content = await fs.promises.readFile(spacePkgJsonFile, 'utf8');
    const json = JSON.parse(content) as PackageJsonInterf;
    i.ft.updatePackagesOfSpace(spaceKey, (json.dependencies ? Object.keys(json.dependencies) : []).concat(
      json.devDependencies ? Object.keys(json.devDependencies) : []
    )).dp(mOfCheckSpace.r);
    o.ft.didCheckSpaces().dp(mOfCheckSpace);
  })
));

/*
r('didPackagesScan, didCheckSpaces, rootDir, didSymlinkCreation -> createOrChangeSymlink, didAllSymlinks', o.pt.didPackagesScan.pipe(
  rx.mergeMap(([m, changedPackages, removed]) => rx.combineLatest([
    o.pt.didCheckSpaces.pipe(
      rx.filter(([m2]) => m.r === m2.r),
      rx.take(1)
    ),
    outputTable.l.rootDir.pipe(
      rx.take(1)
    )
  ]).pipe(
    rx.map(([, [, rootDir]]) => [m, changedPackages, removed, rootDir] as const)
  )),
  rx.mergeMap(([m, packages, removed, rootDir]) => {
    const needCreateLinks = new Set<[spaceKey: string, packageName: string]>();
    const needDeleteLinks = new Set<[spaceKey: string, packageName: string]>();
    for (const changedPackage of packages) {
      for (const [spaceKey, spacePkgStates] of spacePkgMap) {
        if (spacePkgStates.has(changedPackage.name)) {
          needCreateLinks.add([spaceKey, changedPackage.name]);
        }
      }
    }

    for (const p of removed) {
      for (const [spaceKey, spacePkgStates] of spacePkgMap) {
        if (spacePkgStates.has(p.name)) {
          spacePkgStates.delete(p.name);
          needDeleteLinks.add([spaceKey, p.name]);
        }
      }
    }

    // for (const [spaceKey, spacePkgStates] of spacePkgMap) {
    //   for (const spacePkgState of spacePkgStates.values()) {
    //     if (allPackages.has(spacePkgState.name) && spacePkgState.symlinkCreated !== true) {
    //       needCreateLinks.add([spaceKey, spacePkgState.name]);
    //     }
    //   }
    // }
    return rx.zip(
      rx.from(needCreateLinks).pipe(
        rx.mergeMap(([space, pkg]) => o.ft.createOrChangeSymlink(
          allPackages.get(pkg)!.realPath,
          Path.resolve(rootDir, space, 'node_modules', pkg)
        ).ddo(o.pt.didSymlinkCreation).pipe(rx.take(1))),
        rx.count()
      ),
      rx.from(needDeleteLinks).pipe(
        rx.mergeMap(([space, pkg]) => fs.promises.unlink(Path.resolve(rootDir, space, 'node_modules', pkg))),
        rx.count()
      )
    ).pipe(
      rx.map(([count, count2]) => o.ft.didAllSymlinks(count, count2).dp({i: m.r as ActionMeta['i']}))
    );
  })
));
*/

r('onSpacePackageRemoved ->', o.pt.onSpacePackageRemoved.pipe(
  rx.mergeMap(a => outputTable.l.rootDir.pipe(
    rx.map(([, b]) => [...a, b] as const),
    rx.take(1)
  )),
  rx.mergeMap(([, wsKey, pkName, rootDir]) => {
    return fs.promises.unlink(Path.resolve(rootDir, wsKey, 'node_modules', pkName));
  })
));

r('createOrChangeSymlink ->', o.pt.createOrChangeSymlink.pipe(
  rx.mergeMap(([m, targetPath, linkPath]) => symlinkAsync(targetPath, linkPath)
    .finally(() => o.ft.didSymlinkCreation().dp(m)))
));

// function createDependencies(dependencies: Record<string, string> | undefined, srcPackages: Map<string, PackageInfo>) {
//   const sourceDeps = [] as [string, string][];
//   const toInstallDeps = {} as Record<string, string>;
//   for (const pair of Object.entries<string>(dependencies || {})) {
//     const [name, ver] = pair;
//     const pkgInfo = srcPackages.get(name);
//     if (pkgInfo) {
//       sourceDeps.push(pair);
//       toInstallDeps[name] = pkgInfo.realPath;
//     } else {
//       toInstallDeps[name] = ver;
//     }
//   }

//   return [sourceDeps, toInstallDeps] as const;
// }
