import fs from 'fs';
import Path from 'path';
import * as rx from 'rxjs';
import {ReactorCompositeExtendType, SingleActionFactory} from '@wfh/reactivizer';
import {PackageMgrFullServiceType} from '../../package-mgr/package-mgr2';
import {getTscConfigOfPkg} from '../../package-mgr/package-mgr2-utils';
import {LanguageServiceType} from './tsc-language-service';

interface PackageFeatureInput {
  addSourcePackage(pkgNames: string[]): SingleActionFactory;
}
export function addOnPackageFeatures(baseService: LanguageServiceType, pkgMgr: PackageMgrFullServiceType) {
  const service = baseService as unknown as ReactorCompositeExtendType<LanguageServiceType, PackageFeatureInput>;
  const {i, r} = service;
  r('addSourcePackage', i.pt.addSourcePackage.pipe(
    rx.mergeMap(([m, pkgNames]) => pkgMgr.ot.l.data_allPackages.pipe(
      rx.take(1),
      rx.mergeMap(([, allPackages]) => {
        return pkgNames.map(pkgName => [pkgName, allPackages.get(pkgName)] as const);
      }),
      rx.mergeMap(([pkgName, pkgInfo]) => {
        if (pkgInfo == null) {
          service.dispatchErrorFor(`Source directory of ${pkgName} is not found`, m);
          return rx.EMPTY;
        }
        const tscCfg = getTscConfigOfPkg(pkgInfo.json);
        return rx.merge(
          rx.from(tscCfg.include ?? []),
          rx.of(
            Path.resolve(pkgInfo.realPath, tscCfg.srcDir),
            Path.resolve(pkgInfo.realPath, tscCfg.isomDir)
          ).pipe(
            rx.mergeMap(dir => fs.promises.access(dir).then(() => dir).catch(() => null)),
            rx.filter((dir): dir is string => dir != null)
            // rx.map(dir => dir + '/**/*.ts')
          )
        );
      })
    ))
  ));
}
