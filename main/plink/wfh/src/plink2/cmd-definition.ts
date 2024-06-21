/* eslint-disable no-console */
// import fs from 'fs';
import util from 'node:util';
import * as rx from 'rxjs';
import commander from 'commander';
import chalk from 'chalk';
import {ActionMeta} from '@wfh/reactivizer';
import {sexyFont} from '../utils/misc';
import {createPackageMgrService} from '../package-mgr/package-mgr2';
import {createPlinkPackageLookupService} from '../package-mgr/package-mgr2-lookup';
import {languageServices} from './sub-cmds/tsc-language-service';
import {addOnPackageFeatures} from './sub-cmds/tsc-language-service4pkg';
import {cmdModelService} from './cmd-model';
import {createTerminalCanvas} from './terminal-ui/terminal-canvas';
import {ServcerChildProcessEntry} from './server-child-process-service';
import {createTextWidget} from './terminal-ui/terminal-text';
import {createListContainer} from './terminal-ui/terminal-featured-widget';

export function define(scp: ServcerChildProcessEntry, logger: (...args: any[]) => void) {
  const lang = languageServices();
  lang.config({log: logger});
  const packageMgrService = createPackageMgrService();
  packageMgrService.config({log: logger});
  const pkgLookupService = createPlinkPackageLookupService();
  pkgLookupService.service.config({log: logger});
  const langExt = addOnPackageFeatures(lang, packageMgrService, pkgLookupService);
  const canvas = createTerminalCanvas();
  const rootWidget = createListContainer({debug: true, log: logger});
  const textWidget = createTextWidget();
  canvas.config({log: logger, debug: true});

  const error$ = rx.merge(
    canvas.error$,
    packageMgrService.error$,
    langExt.error$,
    rootWidget.error$, textWidget.error$
  ).pipe(
    rx.map(err => util.inspect(err)),
    rx.share()
  );
  const {r, s} = scp;
  let latestCommandActionMeta: ActionMeta | undefined;
  r('-> onCommandError', error$.pipe(
    rx.map(err => {
      if (latestCommandActionMeta)
        s.ft.onCommandError(err).dp(latestCommandActionMeta);
      else
        s.ft.onCommandError(err).dp();
    })
  ));

  r('doCommand -> canvs.setClientWindowSize', s.pt.doCommand.pipe(
    rx.map(([m, cols, rows]) => {
      latestCommandActionMeta = m;
      canvas.s.ft.setClientWindowSize(cols, rows).dp(m);
    })
  ));
  r('setRootDir', s.pt.setRootDir.pipe(
    rx.switchMap(([m, rootDir]) => {
      cmdModelService.i.ft.setRootDir(rootDir).dp();
      // canvas.config({debug: true});

      rootWidget.s.ft.addChild(textWidget).dp();
      textWidget.config({log: logger, debug: true});
      // rootWidget.config({debug: true});
      canvas.s.ft.setRootWidget(rootWidget.s.ft).dp();
      canvas.s.ft.setAlwaysRerenderAll(true).dp();
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
          program.addHelpCommand('help [command]', 'show help information, same as "-h". ');

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

          const tsc = program.command('tsc')
            .argument('[package...]', 'target packages')
            .description('Run Typescript compiler')
            .option('-w, --watch', 'Typescript compiler watch mode', false)
            .option('--poll', 'Use poll mode watch', false)
            .option('--stop', 'stop watching', false)
          // .option('--pj, --project <project-dir,...>', 'Compile only specific project directory', (v, prev) => {
          //   prev.push(...v.split(',')); return prev;
          // }, [] as string[])
            .action(async (packages: string[]) => {
              console.log('Run tsc on', ...packages);
              const {s} = langExt;
              s.ft.setTsConfigOfPlinkBase().dp();

              if (tsc.opts().stop) {
                s.ft.stop().dp();
                return;
              } else if (tsc.opts().watch) {
                if (langExt.table.getData().setWatching[0] === true) {
                  console.log('Previous "tsc" watching command is still in process, you need to run "tsc --stop" command to stop it before you proceed new watching command.');
                  return;
                }
                s.ft.watchSourcePackage(packages).dp();
                console.log('watching and compiling...');
                return;
              }
              const done$ = s.ft.addSourcePackage(packages).od(s.pt.didAddSourcePackage);
              await rx.lastValueFrom(rx.merge(
                s.pt.emitFile.pipe(
                  // rx.mergeMap(([, file, content]) => {
                  //   return fs.promises.writeFile(file, content);
                  // }),
                  rx.takeUntil(done$)
                ),
                done$.pipe(
                  rx.take(1),
                  rx.mergeMap(([, countFile, emitFiles, suggests, fails]) => packageMgrService.ot.l.rootDir.pipe(
                    rx.take(1),
                    rx.map(([, _rootDir]) => {
                      console.log('Written files:');
                      for (const emitFile of emitFiles) {
                        console.log(' ', emitFile);
                      }
                      if (suggests.length > 0) {
                        for (const [, msg] of suggests)
                          console.log(chalk.yellow('[suggestion]'), msg);
                      }
                      if (fails.length > 0) {
                        for (const [, diag] of fails)
                          console.log(chalk.red('[error]'), diag);
                      }
                      console.log(`Total ${countFile} files, ${emitFiles.length} is written successfully`);
                    })
                  ))
                )
              ));
            });
          tsc.addHelpCommand();

          program.command('stop')
            .description('Stop daemon process')
            .action(async () => {
              await rx.firstValueFrom(cmdModelService.i.ft.shutdown().od(
                cmdModelService.o.pt.saved
              ));
              s.ft.onShutdown().dp(m);
              cmdModelService.dispose();
              // eslint-disable-next-line no-console
              console.log('Bye');
            });

          program.command('dev:test').description('A test command')
            .action(async () => {
              console.log('hello world');
              await new Promise<void>(resolve => setTimeout(() => {
                textWidget.s.ft.setContent('hello plink').dp();
                canvas.s.ft.render().dp();
                // rl.moveCursor(process.stdout, 0, -1);
                // rl.clearLine(process.stdout, 0);
                // console.log('hellow boss');
                resolve();
              }, 1000));
            });
          s.ft.onCommanderInited(program).dp(m);
        })
      );
    })
  ));
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
      lang.config({debug: enabled});
      // pkgLookupService.service.config({debug: enabled});
    })
  ));
}
