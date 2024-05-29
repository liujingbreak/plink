/* eslint-disable no-console */
import * as rx from 'rxjs';
import commander from 'commander';
import chalk from 'chalk';
import {sexyFont} from '../utils/misc';
import {createPackageMgrService} from '../package-mgr/package-mgr2';
import {languageServices} from './sub-cmds/tsc-language-service';
import {addOnPackageFeatures} from './sub-cmds/tsc-language-service4pkg';
import {cmdModelService} from './cmd-model';

export function define(rootDir: string, onShutdown: () => void) {
  const packageMgrService = createPackageMgrService();
  cmdModelService.i.ft.setRootDir(rootDir).dp();
  cmdModelService.r('didSwitchSpace -> setActiveInstallSpace', packageMgrService.ot.l.didSwitchSpace.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.map(([m, spaceKey]) => {
      if (spaceKey)
        cmdModelService.i.ft.setActiveInstallSpace(spaceKey).dp(m);
    })
  ));
  cmdModelService.r('cmdModelService.enableRxMessageTrace ->', cmdModelService.inputTable.l.enableRxMessageTrace.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.map(([, enabled]) => {
      packageMgrService.config({debug: enabled});
    })
  ));

  return cmdModelService.outputTable.l.load.pipe(
    rx.map(([, done]) => done),
    rx.filter(done => done),
    rx.take(1),
    rx.mergeMap(() => packageMgrService.i.ft.scan(rootDir)
      .do(packageMgrService.o.pt.onScanCompleted)),
    rx.mergeMap(() => rx.combineLatest([
      cmdModelService.it.l.enableRxMessageTrace,
      cmdModelService.it.l.setActiveInstallSpace.pipe(
        rx.take(1)
      ) // take only initially loaded value
    ])),
    rx.map(([[, enabled], [, activeSpaceKey]]) => [enabled, activeSpaceKey] as const),
    // rx.distinctUntilChanged((a) => ),
    rx.map(([enableRxMessageTrace, activeSpaceKey]) => {
      packageMgrService.o.ft.didSwitchSpace(activeSpaceKey, [], [], 0, 0).dp();
      const program = new commander.Command('plink');
      program.description('A monorepo and multi-repo management tool')
        .action(() => {
          console.log(sexyFont('PLink').string);
          console.log(program.helpInformation());
        });

      program.command('switch')
        .argument('<directory>', 'target directory')
        .description('switch installation directory')
        .action(async (dir: string) => {
          await rx.firstValueFrom(packageMgrService.i.ft.switchToSpace(dir).od(
            packageMgrService.o.pt.didSwitchSpace));
        });

      if (enableRxMessageTrace) {
        program.command('disable-trace')
          .description('Stop printing debug messages')
          .action(() => {
            cmdModelService.i.ft.enableRxMessageTrace(false).dp();
            console.log('Disabled');
          });
      } else {
        program.command('enable-trace')
          .description('Print debug messages')
          .action(() => {
            cmdModelService.i.ft.enableRxMessageTrace(true).dp();
            console.log('Enabled');
          });
      }

      program.command('tsc')
        .argument('[package...]', 'target packages')
        .description('Run Typescript compiler')
        .option('-w, --watch', 'Typescript compiler watch mode', false)
        .option('--poll', 'Use poll mode watch', false)
        .option('--pj, --project <project-dir,...>', 'Compile only specific project directory', (v, prev) => {
          prev.push(...v.split(',')); return prev;
        }, [] as string[])
        .action(async (packages: string[]) => {
          console.log('Run tsc on', ...packages);
          const lang = languageServices();
          const langExt = addOnPackageFeatures(lang, packageMgrService);
          const {i, o} = langExt;
          i.ft.setTsConfigOfPlinkBase().dp();
          if (enableRxMessageTrace)
            langExt.config({debug: true});
          const printMsg = rx.merge(
            o.pt.onSuggest.pipe(
              rx.tap(([, , msg]) => console.log(chalk.yellow('[suggestion]'), chalk.yellow(msg)))
            ),
            o.pt.onEmitFailure.pipe(
              rx.tap(([, , diag]) => console.log(chalk.red('[error]'), chalk.red(diag)))
            )
          ).pipe(rx.ignoreElements());
          await rx.lastValueFrom(rx.merge(
            o.pt.emitFile.pipe(
              rx.map(([, file, _content]) => {
                console.log('compiled', file);
              })
            ),
            printMsg
          ).pipe(
            rx.takeUntil(i.ft.addSourcePackage(packages).od(o.pt.didAddSourcePackage)),
            rx.count()
          ));
        });

      program.command('stop')
        .description('Stop daemon process')
        .action(async () => {
          await rx.firstValueFrom(cmdModelService.i.ft.shutdown().od(
            cmdModelService.o.pt.saved
          ));
          onShutdown();
          cmdModelService.dispose();
          // eslint-disable-next-line no-console
          console.log('Bye');
        });
      return program;
    })
  );
}
