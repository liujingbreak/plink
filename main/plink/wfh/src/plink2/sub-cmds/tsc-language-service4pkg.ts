import fs from 'fs';
import Path from 'path';
import * as rx from 'rxjs';
import glob from 'glob';
import {SimplexReactorMergeType, SimplexReactor, SingleActionFactory, actionRelatedToAction,
  ActionDispenser, InferPayload, InferMapParam} from '@wfh/reactivizer';
import {PackageMgrFullServiceType} from '../../package-mgr/package-mgr2';
import {getTscConfigOfPkg, TsconfigType} from '../../package-mgr/package-mgr2-utils';
import {PlinkPackageLookupService} from '../../package-mgr/package-mgr2-lookup';
import {LanguageServiceType, LogLevel, LangServiceOutput} from './tsc-language-service';

interface PackageFeatureInput {
  setTsConfigOfPlinkBase(): SingleActionFactory;
  addSourcePackage(pkgNames: string[]): SingleActionFactory;
}

interface PackageFeatureOutput {
  /** In context of "addSourcePackage" */
  onEmitFileForPackage(file: string, content: string): SingleActionFactory;
  didAddSourcePackage(countFiles: number, emitFiles: string[], suggestions: [file: string, msg: string][], fails: InferPayload<LangServiceOutput['onEmitFailure']>[]): SingleActionFactory;
  onTscDirsConfig(data: Map<string, {isom?: string; srcRoots: string[]; dest: string}>): SingleActionFactory;
}
const newTableActions = ['onTscDirsConfig'] as const;
type FullFeaturedType = SimplexReactorMergeType<LanguageServiceType, SimplexReactor<PackageFeatureInput & PackageFeatureOutput, typeof newTableActions>>;
type OutputEvents = FullFeaturedType extends SimplexReactor<infer T, any> ? T : never;

export function addOnPackageFeatures(baseService: LanguageServiceType, pkgMgr: PackageMgrFullServiceType, lookupService: PlinkPackageLookupService) {
  const s = (baseService as unknown as FullFeaturedType).s.forkController();
  const table = (baseService as unknown as FullFeaturedType).table.addActions('onTscDirsConfig');
  const {r} = baseService;
  const ft = s.ft;
  // const lookupService = createPlinkPackageLookupService();
  lookupService.input.fromPackageService(pkgMgr).dp();
  const packageToTscDirMap = new Map<string, {isom?: string; srcRoots: string[]; dest: string}>();
  s.interceptor$.next(a$ => {
    const dispenser = new ActionDispenser<OutputEvents>(a$, s.typePrefix);
    return rx.merge(
      dispenser.ofType('emitFile').pipe(
        rx.mergeMap(a => rx.concat(
          table.l.onTscDirsConfig.pipe(
            rx.take(1), rx.ignoreElements()
          ),
          pkgMgr.ot.l.data_allPackages
        ).pipe(
          rx.map(b => [a, b] as const)
        )),
        rx.mergeMap(([action, [, allPackages]]) => {
          const {p: [emittedFile]} = action;
          const file = emittedFile.replace(/[\\/]/g, Path.sep);
          return lookupService.input.lookupPackage(file).od(lookupService.output.lookupPackageResolved).pipe(
            rx.take(1),
            rx.map(([, pkgName]) => {
              if (pkgName) {
                const tscConfig = packageToTscDirMap.get(pkgName);
                if (tscConfig) {
                  const {isom, srcRoots, dest} = tscConfig;
                  const pkgPath = allPackages.get(pkgName)!.realPath;
                  const srcDir = srcRoots.find(src => file.startsWith(Path.resolve(pkgPath, src) + Path.sep));
                  if (srcDir) {
                    const absSrcDir = Path.resolve(pkgPath, srcDir) + Path.sep;
                    const relativePath = file.slice(absSrcDir.length);
                    action.p[0] = Path.resolve(pkgPath, dest, relativePath);
                    return action;
                  } else if (isom) {
                    const absIsomDir = Path.resolve(pkgPath, isom) + Path.sep;
                    if (file.startsWith(absIsomDir)) {
                      const relativePath = file.slice(absIsomDir.length);
                      action.p[0] = Path.resolve(pkgPath, 'isom', relativePath);
                      return action;
                    }
                  }
                }
                // console.log('intercept', file, pkgName, tscConfig);
                ft.log(LogLevel.log, `Source file ${file} is not under any of package's source directroies`).dp(action);
                return action;
              } else {
                ft.log(LogLevel.log, `Source file ${file} does not belong to any package`).dp(action);
                return null;
              }
            })
          );
        }),
        rx.filter((a): a is NonNullable<typeof a> => a != null)
      ),
      dispenser.ofOtherTypes()
    );
  });
  r('data_allPackages, updatePackagesEnd -> "packageToTscDirMap", onTscDirsConfig',
    // pkgMgr.ot.l.data_allPackages.pipe(rx.take(1)),
    pkgMgr.i.pt.updatePackagesEnd.pipe(
      rx.switchMap(() => pkgMgr.ot.l.data_allPackages.pipe(rx.take(1)))
    ).pipe(
      rx.switchMap(([m, data]) => {
        packageToTscDirMap.clear();
        return rx.from(data.values()).pipe(
          rx.mergeMap(pkgInfo => {
            const tscCfg = getTscConfigOfPkg(pkgInfo.json);
            const normalSrcRoots = [tscCfg.srcDir];
            const includeDirs = tscCfg.include;
            if (includeDirs) {
              normalSrcRoots.push(...includeDirs.map(includeDir => {
                const wildcardPos = includeDir.indexOf('/*');
                if (wildcardPos >= 0)
                  return includeDir.slice(0, wildcardPos);
                else
                  return includeDir;
              }));
            }
            const result = {srcRoots: [] as string[], dest: tscCfg.destDir} as {isom?: string; srcRoots: string[]; dest: string};
            return rx.merge(
              rx.from(normalSrcRoots).pipe(
                rx.mergeMap(srcRootDir => fs.promises.access(Path.resolve(pkgInfo.realPath, srcRootDir))
                  .then(() => result.srcRoots.push(srcRootDir)).catch(() => {})
                )
              ),
              tscCfg.isomDir ?
                fs.promises.access(Path.resolve(pkgInfo.realPath, tscCfg.isomDir))
                  .then(() => result.isom = tscCfg.isomDir).catch(() => {}) :
                rx.EMPTY
            ).pipe(
              rx.finalize(() => {
                packageToTscDirMap.set(pkgInfo.name, result);
              })
            );
          }),
          rx.finalize(() => {
            ft.onTscDirsConfig(packageToTscDirMap).dp(m);
          })
        );
      })
    ));
  r('addSourcePackage -> addSourceFile, onEmitFileForPackage, didAddSourcePackage', s.pt.addSourcePackage.pipe(
    rx.mergeMap(([m, pkgNames]) => {
      const dir$ = pkgMgr.ot.l.data_allPackages.pipe(
        // eslint-disable-next-line no-console
        rx.take(1),
        rx.mergeMap(([, allPackages]) => {
          return pkgNames.map(pkgName => [pkgName, allPackages.get(pkgName)] as const);
        }),
        rx.mergeMap(([pkgName, pkgInfo]) => {
          if (pkgInfo == null) {
            baseService.dispatchErrorFor(`Source directory of ${pkgName} is not found`, m);
            ft.log(LogLevel.error, `Source directory of ${pkgName} is not found`).dp();
            return rx.EMPTY;
          }
          const tscCfg = getTscConfigOfPkg(pkgInfo.json);
          return rx.merge(
            rx.from(tscCfg.include ?? []),
            rx.of(
              Path.resolve(pkgInfo.realPath, tscCfg.srcDir),
              Path.resolve(pkgInfo.realPath, tscCfg.isomDir)
            )
          );
        }),
        rx.mergeMap(dir => fs.promises.access(dir).then(() => dir).catch(() => null)),
        rx.filter((dir): dir is string => dir != null)
      );
      const compileFile$ = new rx.Subject<InferMapParam<LangServiceOutput['compileFile']>>();
      const emitFile$ = new rx.Subject<InferMapParam<LangServiceOutput['emitFile']>>();
      const allDone$ = new rx.Subject<void>();
      const onSuggest$ = new rx.Subject<InferMapParam<LangServiceOutput['onSuggest']>>();
      const onFail$ = new rx.Subject<InferMapParam<LangServiceOutput['onEmitFailure']>>();
      const splitCompileFileEvents$ = dir$.pipe(
        rx.mergeMap(dir => {
          return new rx.Observable<[typeof s.pt.compileFile, typeof s.pt.emitFile]>(sink => {
            glob(dir + '/**/*.?([cm])ts', (err, files) => {
              if (err) {
                ft.log(LogLevel.error, err.stack!).dp();
                sink.error(err);
              } else {
                for (const file of files) {
                  if (!file.endsWith('.d.ts')) {
                    const [compileFile$, emitFile$] = ft.addSourceFile(file, false).re(m).od(s.pt.compileFile, s.pt.emitFile);
                    sink.next([
                      compileFile$.pipe(rx.take(1)),
                      emitFile$
                    ] as const);
                  }
                }
                sink.complete();
              }
            });
          });
        }),
        rx.mergeMap(([a, b]) => {
          return rx.merge(
            a.pipe(
              rx.map(action => compileFile$.next(action))
            ),
            b.pipe(
              rx.map(action => emitFile$.next(action))
            )
          );
        }),
        rx.ignoreElements()
      );
      return rx.merge(
        rx.zip(
          compileFile$.pipe(rx.count()),
          emitFile$.pipe(
            rx.takeUntil(allDone$),
            rx.reduce((arr, [, file]) => {
              arr.push(file);
              return arr;
            }, [] as string[])
          ),
          onSuggest$.pipe(
            rx.reduce((arr, [, ...payload]) => {
              arr.push(payload);
              return arr;
            }, [] as [string, string][])
          ),
          onFail$.pipe(
            rx.reduce((arr, [, ...payload]) => {
              arr.push(payload);
              return arr;
            }, [] as InferPayload<LangServiceOutput['onEmitFailure']>[])
          )
        ),
        compileFile$.pipe(
          rx.mergeMap(([m]) => {
            const done$ = s.pt.didCompileFile.pipe(
              actionRelatedToAction(m),
              rx.share()
            );
            return rx.merge(
              s.pt.onSuggest.pipe(
                actionRelatedToAction(m),
                rx.map(p => onSuggest$.next(p))
              ),
              s.pt.onEmitFailure.pipe(
                actionRelatedToAction(m),
                rx.map(p => onFail$.next(p))
              )
            ).pipe(
              rx.takeUntil(done$)
            );
          }),
          rx.ignoreElements(),
          rx.finalize(() => {
            allDone$.next();
            onSuggest$.complete();
            onFail$.complete();
          })
        ),
        splitCompileFileEvents$
      ).pipe(
        rx.map(([countFiles, emitFiles, suggests, fails]) => {
          ft.didAddSourcePackage(countFiles, emitFiles, suggests, fails).dp(m);
        }),
        rx.take(1)
      );
    })
  ));
  r('setTsConfigOfPlinkBase -> ', s.pt.setTsConfigOfPlinkBase.pipe(
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
      json.compilerOptions.sourceMap = true;
      ft.setTsConfig(json, dir).dp(m);
    })
  ));
  return baseService as unknown as FullFeaturedType;
}
