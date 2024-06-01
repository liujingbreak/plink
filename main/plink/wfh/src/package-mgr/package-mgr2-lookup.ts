import Path from 'node:path';
import {SingleActionFactory, SimplexReactor, PayloadByType}  from '@wfh/reactivizer';
import * as rx from 'rxjs';
import {PackageMgrFullServiceType} from './package-mgr2';

interface PlinkPackageLookupInput {
  /** To initialize lookup functionality, send required information of either fromTsconfig or fromPackageService,
   * if "installDir" is provided, will also consider include search range of directories like <install-dir>/node_modules/<package-name>
   * */
  fromTsconfig(baseDir: string, json: {compilerOptions: {paths: Record<string, string[]>}}, installDir?: string): SingleActionFactory;
  /** To initialize lookup functionality, send required information of either fromTsconfig or fromPackageService */
  fromPackageService(ps: PackageMgrFullServiceType): SingleActionFactory;
  /** Result is replied in message "lookupPackageResolved" */
  lookupPackage(file: string): SingleActionFactory;
}
interface PlinkPackageLookupOutput {
  lookupPackageResolved(packageName: string | undefined | null): SingleActionFactory;
  packageToPathMap(map: Map<string, string>): SingleActionFactory;
}
interface PlinkPackageLookupInternal {
  rootDir(dir: string): SingleActionFactory;
  pkgPathLenToPathMapChanged(initialized: boolean): SingleActionFactory;
}
const tableFor = ['rootDir', 'fromPackageService', 'pkgPathLenToPathMapChanged', 'packageToPathMap'] as const;
export function createPlinkPackageLookupService() {
  const service = new SimplexReactor<PlinkPackageLookupInput & PlinkPackageLookupOutput & PlinkPackageLookupInternal, typeof tableFor>({
    name: 'PlinkPackageLookup',
    debug: false,
    tableFor
  });

  let pkgPathLenToPathMap: Map<number, Map<string, string>>;
  const {r, s, table} = service;
  r('fromPackageService -> rootDir, pkgPathLenToPathMapChanged', s.pt.fromPackageService.pipe(
    rx.switchMap(([m, service]) => {
      return service.ot.l.didSwitchSpace.pipe(
        rx.filter(([, k]) => k != null),
        rx.distinctUntilChanged(([, a], [, b]) => a === b),
        rx.map(b => [[m, service], b] as const)
      );
    }),
    rx.mergeMap(([[m, service], [, activeSpaceKey]]) => {
      const spacePkgs = service.ot.getData().data_spacePkgMap[0]?.get(activeSpaceKey!);
      return rx.combineLatest([
      // If data_spacePkgMap doesn't have activeSpaceKey, dispatch "checkSpace" message
        spacePkgs != null ?
          rx.of(spacePkgs) :
          service.o.ft.checkSpace(activeSpaceKey!).od(service.o.pt.didCheckSpace).pipe(
            rx.take(1),
            rx.mergeMap(() => service.ot.l.data_spacePkgMap),
            rx.map(([, data]) => data.get(activeSpaceKey!)),
            rx.filter(v => v != null)
          ),
        service.ot.l.data_allPackages.pipe(rx.take(1)),
        service.ot.l.rootDir
      ]).pipe(
        rx.map(([spacePkgs, [, allPackages], [, rootPath]]) => {
          const installDir = Path.resolve(rootPath, activeSpaceKey!);
          pkgPathLenToPathMap = new Map();
          s.ft.rootDir(rootPath).dp(m);
          for (const pkgName of spacePkgs!) {
            const pkgPath = allPackages.get(pkgName)?.realPath;
            const dirs = [pkgPath, Path.resolve(installDir, 'node_modules', pkgName)].filter((dir): dir is string => dir != null);
            for (const dir of dirs) {
              const pkgPath = Path.relative(rootPath, dir).replace(/\\/g, '/');
              const pathLen = pkgPath.split(/[/\\]/).length;
              let pathMap = pkgPathLenToPathMap.get(pathLen);
              if (pathMap) {
                pathMap.set(pkgPath, pkgName);
              } else {
                pathMap = new Map<string, string>();
                pathMap.set(pkgPath, pkgName);
                pkgPathLenToPathMap.set(pathLen, pathMap);
              }
            }
          }
          s.ft.pkgPathLenToPathMapChanged(true).dp(m);
        })
      );
    })
  ));

  r('fromTsconfig -> rootDir, pkgPathLenToPathMapChanged, packageToPathMap', s.pt.fromTsconfig.pipe(
    rx.map(([m, baseDir, json, _installDir]) => {
      s.ft.rootDir(baseDir).dp(m);
      pkgPathLenToPathMap = new Map();
      const pkg2PathMap = new Map<string, string>();
      for (const [key, list] of Object.entries(json.compilerOptions.paths)) {
        const match = /^((?:@[^/]+\/)?[^/]+)\/\*/.exec(key);
        if (match) {
          const path = list[0];
          const relPath = /^.+(?!\/\*).(?=\/\*)/.exec(path)?.[0];
          if (relPath) {
            const pkgName = match[1];
            pkg2PathMap.set(pkgName, Path.resolve(baseDir, relPath));
            const pathLen = relPath.split(/[/\\]/).length;
            let pathMap = pkgPathLenToPathMap.get(pathLen);
            if (pathMap) {
              pathMap.set(relPath, pkgName);
            } else {
              pathMap = new Map<string, string>();
              pathMap.set(relPath, pkgName);
              pkgPathLenToPathMap.set(pathLen, pathMap);
            }
          }
        }
      }
      s.ft.pkgPathLenToPathMapChanged(true).dp(m);
      s.ft.packageToPathMap(pkg2PathMap).dp(m);
    })
  ));

  r('lookupPackage, (pkgPathLenToPathMapChanged) -> lookupPackageResolved', s.pt.lookupPackage.pipe(
    rx.mergeMap(([m, file]) => table.l.rootDir.pipe(
      rx.map(([, rootDir]) => {
        if (table.getData().pkgPathLenToPathMapChanged[0] !== true)
          throw new Error('You have to run "switch" command to install dependencies before proceed this operation');
        const pathEls = Path.relative(rootDir, file).split(/[\\/]/);
        for (const [len, pathMap] of pkgPathLenToPathMap.entries()) {
          const dir = pathEls.splice(0, len).join('/');
          const pkgName = pathMap.get(dir);
          s.ft.lookupPackageResolved(pkgName).dp(m);
          if (pkgName)
            break;
        }
      }),
      service.catchErrorFor(m)
    ))
  ));
  s.ft.pkgPathLenToPathMapChanged(false).dp();
  return {
    input: s.ft as PlinkPackageLookupInput,
    output: s.pt as PayloadByType<PlinkPackageLookupOutput>,
    table,
    service
  };
}
export type PlinkPackageLookupService = ReturnType<typeof createPlinkPackageLookupService>;
