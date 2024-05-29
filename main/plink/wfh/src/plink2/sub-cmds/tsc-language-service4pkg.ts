import fs from 'fs';
import Path from 'path';
import * as rx from 'rxjs';
import glob from 'glob';
import {ReactorCompositeExtendType, SingleActionFactory, pairActionToActionStream, ActionDispenser, ReactorComposite2} from '@wfh/reactivizer';
import {PackageMgrFullServiceType} from '../../package-mgr/package-mgr2';
import {getTscConfigOfPkg, TsconfigType, PlinkPackageLookup} from '../../package-mgr/package-mgr2-utils';
import {LanguageServiceType, LogLevel} from './tsc-language-service';

interface PackageFeatureInput {
  setTsConfigOfPlinkBase(): SingleActionFactory;
  addSourcePackage(pkgNames: string[]): SingleActionFactory;
}

interface PackageFeatureOutput {
  didAddSourcePackage(count: number): SingleActionFactory;
}
type OutputEvents = ReactorCompositeExtendType<LanguageServiceType, PackageFeatureInput, PackageFeatureOutput> extends ReactorComposite2<any, infer O, any, any> ? O : unknown;

export function addOnPackageFeatures(baseService: LanguageServiceType, pkgMgr: PackageMgrFullServiceType) {
  const service = baseService as unknown as ReactorCompositeExtendType<LanguageServiceType, PackageFeatureInput, PackageFeatureOutput>;
  const {i, r, o} = service;
  const packageLookuper = new PlinkPackageLookup();
  packageLookuper.fromService(pkgMgr);
  o.interceptor$.next(a$ => {
    const dispenser = new ActionDispenser<OutputEvents>(a$, o.typePrefix);
    return pkgMgr.ot.l.data_allPackages.pipe(
      rx.switchMap(([, allPackages]) => rx.merge(
        dispenser.ofType('emitFile').pipe(
          rx.mergeMap(({p: [file]}) => {
            const pkgName = packageLookuper.dirMap?.getData(file);
            console.log('intercept', file, pkgName, pkgName ? allPackages.get(pkgName)?.realPath : '');
            return rx.EMPTY;
          })
        ),
        dispenser.ofOtherTypes()
      ))
    );
  });
  r('addSourcePackage -> addSourceFile', i.pt.addSourcePackage.pipe(
    rx.mergeMap(([m, pkgNames]) => {
      const dir$ = pkgMgr.ot.l.data_allPackages.pipe(
        // eslint-disable-next-line no-console
        rx.take(1),
        rx.mergeMap(([, allPackages]) => {
          return pkgNames.map(pkgName => [pkgName, allPackages.get(pkgName)] as const);
        }),
        rx.mergeMap(([pkgName, pkgInfo]) => {
          if (pkgInfo == null) {
            service.dispatchErrorFor(`Source directory of ${pkgName} is not found`, m);
            o.ft.log(LogLevel.error, `Source directory of ${pkgName} is not found`).dp();
            return rx.EMPTY;
          }
          const tscCfg = getTscConfigOfPkg(pkgInfo.json);
          return rx.merge(
            rx.from(tscCfg.include ?? []),
            rx.of(
              Path.resolve(pkgInfo.realPath, tscCfg.srcDir).replace(/\\/g, '/'),
              Path.resolve(pkgInfo.realPath, tscCfg.isomDir).replace(/\\/g, '/')
            )
          );
        }),
        rx.mergeMap(dir => fs.promises.access(dir).then(() => dir).catch(() => null)),
        rx.filter((dir): dir is string => dir != null)
      );

      return dir$.pipe(
        rx.mergeMap(dir => {
          return new rx.Observable<typeof o.pt.compileFile>(sink => {
            glob(dir + '/**/*.?([cm])ts', (err, files) => {
              if (err) {
                o.ft.log(LogLevel.error, err.stack!).dp();
                sink.error(err);
              } else {
                for (const file of files) {
                  if (!file.endsWith('.d.ts'))
                    sink.next(i.ft.addSourceFile(file, false).re(m).od(o.pt.compileFile).pipe(rx.take(1)));
                }
                // o.ft.didAddSourcePackage(files).dp(m);
                sink.complete();
              }
            });
          });
        }),
        rx.mergeMap(compileFile$ => compileFile$),
        pairActionToActionStream(o.pt.didCompileFile),
        rx.mergeMap(didCompileFile$ => didCompileFile$.pipe(rx.take(1))),
        rx.count(),
        rx.tap(count => {
          o.ft.didAddSourcePackage(count).dp(m);
        })
      );
    })
  ));
  r('setTsConfigOfPlinkBase -> ', i.pt.setTsConfigOfPlinkBase.pipe(
    rx.mergeMap(a => pkgMgr.ot.l.updateCommonSrcDir.pipe(
      rx.map(b => [a, b] as const), rx.take(1)
    )),
    rx.mergeMap(async ([[m], [, commonSrcDir]]) => {
      const file = Path.resolve(__dirname, '../../../tsconfig-base.json');
      const dir = Path.dirname(file);
      const baseTsConfig = await fs.promises.readFile(file, 'utf8');
      const json = JSON.parse(baseTsConfig) as TsconfigType;
      json.compilerOptions.declaration = true;
      json.compilerOptions.importHelpers = true;
      json.compilerOptions.rootDir = commonSrcDir;
      json.compilerOptions.outDir = commonSrcDir; // Path.relative(process.cwd(), dir).replace(/\\/g, '/');
      json.compilerOptions.inlineSourceMap = false;
      i.ft.setTsConfig(json, dir).dp(m);
    })
  ));
  return service;
}
