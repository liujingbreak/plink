import Path from 'node:path';
import fs from 'node:fs';
import * as rx from 'rxjs';
import {ReactorComposite2, ReactorCompositeMergeType, SingleActionFactory, timeoutLog} from '@wfh/reactivizer';
import {closestCommonParentDir} from '../utils/misc';
import {PackageMgrServiceType} from './package-mgr2';
import {PackageMgr2ModelType} from './package-mgr2-model';
import {createTsConfigForRepos, createTsConfigFile} from './package-mgr2-utils';
import {createPackageInfo} from './package-mgr2-utils';
import type {PackageInfo} from './index';

export const INSTALLATION_JSON_FILE = '.plink.install.json';

export interface PackageMgr2SpaceSwitchActions {
  doingSwitchSpace(
    rootDir: string,
    key: string,
    pkgSet: Set<string>,
    projPkgMap: Map<string, Set<string>>,
    allPackages: Map<string, PackageInfo>,
    spaceDependency: Map<string, Set<string>>
  ): SingleActionFactory;
  createArbitraryTsConfig(spaceKey: string, tsconfigDir: string): SingleActionFactory;
}
export interface PackageMgr2SpaceSwitchEvents {
  didCreatingSymlinksToInstallDir(createdNmParentDirs: string[], links: string[]): SingleActionFactory;
  didCreatingWorkspaceSymlinks(numOfWorkspace: number): SingleActionFactory;
  didWriteTsConfigFiles(fileWrittenCount: number): SingleActionFactory;
  updateTypeRootPackages(spaceKey: string): SingleActionFactory;
  didUpdateTypeRootPackages(spaceKey: string, data: Map<string, PackageInfo>): SingleActionFactory;
  updateCommonSrcDir(dir: string): SingleActionFactory;
  didArbitraryTsConfig(spaceKey: string, json: any): SingleActionFactory;
}
const outputTableFor = ['updateCommonSrcDir'] as const;
export function createSwitchSpaceService<R extends ReactorComposite2<any, any, any, any>>(origService: R) {
  const service = origService as ReactorCompositeMergeType<ReactorCompositeMergeType<PackageMgr2ModelType, PackageMgrServiceType>,
  PackageMgr2SpaceSwitchServiceType>;
  service.config({
    debugExcludeTypes: ['doingSwitchSpace']
  });
  service.ot.addActions(...outputTableFor);
  const repoNoModuleSymlinkDirTable = service.o.createDataTable('repoNoModuleSymlinkDirs', ([, projKey]) => projKey);
  const npmInstallSpacePkgJsonTable = service.o.createDataTable('didCheckSpace', ([, key]) => key);
  const typeRootPackagesTable = service.o.createDataTable('didUpdateTypeRootPackages', ([, key]) => key);
  const {i, o, r, ot} = service;
  // 1. create symlinks to <install-space>/node_moodules
  r('doingSwitchSpace -> didCreatingSymlinksToInstallDir', i.pt.doingSwitchSpace.pipe(
    rx.mergeMap(([m, rootDir, key, pkgSet, projPkgMap, allPackages]) => rx.defer(async () => {
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
        rx.map(links => o.ft.didCreatingSymlinksToInstallDir(createdNmParentDirs, links).re(m).dp())
      ))
    ))
  ));

  // 2. create "worksapce" symlinks under "npm install" directory
  r('doingSwitchSpace -> didCreatingWorkspaceSymlinks', i.pt.doingSwitchSpace.pipe(
    rx.mergeMap(([m, rootDir, key, pkgSet, , allPackages]) => rx.from(pkgSet).pipe(
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
            .re(m).od(o.pt.didSymlinkCreation));
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
        o.ft.didCreatingWorkspaceSymlinks(workspaces.length).re(m).dp();
      }),
      service.labelError('Creating NPM workspace in ' + Path.resolve(rootDir, key))
    ))
  ));
  r('data_projPkgMap -> updateCommonSrcDir', i.pt.updatePackagesEnd.pipe(
    rx.switchMap(() => ot.l.data_projPkgMap.pipe(rx.take(1))),
    rx.map(([, projSrcMap]) => {
      const srcRootDir = closestCommonParentDir(projSrcMap.keys());
      o.ft.updateCommonSrcDir(srcRootDir).dp();
    })
  ));

  const tsConfigData$ = rx.combineLatest([
    ot.l.data_allPackages,
    ot.l.data_spaceDependencyMap,
    ot.l.data_projPkgMap,
    ot.l.rootDir,
    ot.l.updateCommonSrcDir,
    rx.merge(
      ot.l.installedDrcp.pipe(
        rx.map(a => [a, true] as const)
      ),
      ot.l.linkedDrcp.pipe(
        rx.map(a => [a, false] as const)
      )
    ).pipe(
      rx.filter(([[, pkgInfo]]) => pkgInfo != null),
      rx.take(1),
      rx.map(([[, plinkPkg], isInstalled]) => [plinkPkg!, isInstalled] as const)
    )
  // eslint-disable-next-line no-console
  ]).pipe(rx.take(1), timeoutLog(5000, () => console.log('Fetching latest TS config data timeout')));

  // 3. write tsconfig.json to all repo
  r('didRunInstall -> didWriteTsConfigFiles, updateTypeRootPackages', o.pt.didRunInstall.pipe(
    rx.mergeMap(([m, spaceKey]) => rx.combineLatest([
      o.ft.updateTypeRootPackages(spaceKey).re(m).od(o.pt.didUpdateTypeRootPackages),
      tsConfigData$
    ]).pipe(
      rx.take(1),
      rx.map(([a, b]) => [a, ...b] as const),
      rx.mergeMap(([[, , typeRootPkgs], [, allPackages], [, _spaceDependencyMap], [, projPkgMap], [, rootDir], [, commonSrcDir], [plinkPkg, isInstalled]]) => {
        return createTsConfigForRepos(
          plinkPkg.realPath,
          !isInstalled,
          Path.resolve(rootDir, spaceKey),
          [...projPkgMap.keys()],
          rootDir,
          commonSrcDir,
          allPackages,
          typeRootPkgs.values(),
          {},
          [...allPackages.values()].map(pkg => pkg.realPath)
        );
      }),
      rx.mergeMap(([file, json]) => {
        return fs.promises.writeFile(file, JSON.stringify(json, null, '  '), 'utf8');
      }),
      rx.count(),
      rx.tap(count => o.ft.didWriteTsConfigFiles(count).dp(m))
    ))
  ));

  r('updateTypeRootPackages -> didUpdateTypeRootPackages', o.pt.updateTypeRootPackages.pipe(
    rx.mergeMap(a => rx.combineLatest([ot.l.data_allPackages, ot.l.data_spaceDependencyMap, ot.l.rootDir]).pipe(
      rx.map(b => [a, ...b] as const),
      rx.take(1)
    )),
    rx.concatMap(([[m, spaceKey], [, allPackages], [, spaceDependencyMap], [, rootDir]]) => {
      const deps = spaceDependencyMap.get(spaceKey);
      // eslint-disable-next-line multiline-ternary
      return (deps ? rx.of(deps) : rx.merge(
        ot.l.data_spaceDependencyMap.pipe(
          rx.filter(([, depMap]) => depMap.has(spaceKey)),
          rx.map(([, map]) => map.get(spaceKey)!)
        ),
        new rx.Observable<never>(sub => {
          o.ft.checkSpace(spaceKey).dp(m);
          sub.complete();
        })
      )).pipe(
        rx.take(1),
        rx.map(deps => {
          const typeRootPkgs = new Map<string, PackageInfo>();
          for (const dep of deps) {
            if (dep.startsWith('@wfh/')) {
              if (allPackages.has(dep)) {
                const pkgInfo = allPackages.get(dep)!;
                if (pkgInfo.json.plink?.typeRoot)
                  typeRootPkgs.set(dep, pkgInfo);
              } else {
                const jsonFile = Path.resolve(rootDir, spaceKey, 'node_modules', dep, 'package.json');
                const pkgInfo = createPackageInfo(jsonFile, true);
                if (pkgInfo.json.plink?.typeRoot)
                  typeRootPkgs.set(dep, pkgInfo);
              }
            }
          }
          o.ft.didUpdateTypeRootPackages(spaceKey, typeRootPkgs).dp(m);
        })
      );
    })
  ));
  r('createArbitraryTsConfig -> didArbitraryTsConfig', i.pt.createArbitraryTsConfig.pipe(
    rx.mergeMap(([m, spaceKey, tsconfigDir]) => {
      const typeRootPackages = typeRootPackagesTable.snapshot.get(spaceKey);
      const typeRootPackages$ = typeRootPackages ?
        rx.of(typeRootPackages) :
        o.ft.updateTypeRootPackages(spaceKey).re(m).od(o.pt.didUpdateTypeRootPackages).pipe(
          rx.take(1)
        );
      return rx.combineLatest([
        typeRootPackages$,
        ot.l.data_allPackages,
        ot.l.data_spacePkgMap.pipe(
          rx.map(([, map]) => map.get(spaceKey)),
          rx.filter((spacePkgSet): spacePkgSet is NonNullable<typeof spacePkgSet> => spacePkgSet != null)
        ),
        ot.l.rootDir,
        ot.l.updateCommonSrcDir,
        rx.merge(
          ot.l.installedDrcp.pipe(
            rx.map(a => [a, true] as const)
          ),
          ot.l.linkedDrcp.pipe(
            rx.map(a => [a, false] as const)
          )
        ).pipe(
          rx.filter(([[, pkgInfo]]) => pkgInfo != null),
          rx.take(1),
          rx.map(([[, plinkPkg], isInstalled]) => [plinkPkg!, isInstalled] as const)
        )
      ]).pipe(
        rx.take(1),
        rx.map(([[, , typeRootPkgMap], [, allPackages], spacePkgSet, [, rootDir], [, commonSrcDir], [plinkPkg, isInstalled]]) => {
          const baseTsConfigFile = Path.resolve(plinkPkg.realPath, 'wfh/tsconfig-base.json');
          const srcPkgMap = new Map<string, PackageInfo>();
          for (const [name, pkg] of allPackages) {
            if (spacePkgSet.has(name))
              srcPkgMap.set(name, pkg);
          }
          const json = createTsConfigFile(tsconfigDir, baseTsConfigFile, plinkPkg.realPath, !isInstalled,
            Path.resolve(rootDir, spaceKey), rootDir, srcPkgMap,
            commonSrcDir, typeRootPkgMap.values(), {}, ['nothing.ts']);
          o.ft.didArbitraryTsConfig(spaceKey, json).dp(m);
        })
      );
    })
  ));
  return service as unknown as ReactorCompositeMergeType<R, PackageMgr2SpaceSwitchServiceType>;
}

export type PackageMgr2SpaceSwitchServiceType = ReactorComposite2<PackageMgr2SpaceSwitchActions, PackageMgr2SpaceSwitchEvents, [], typeof outputTableFor>;
