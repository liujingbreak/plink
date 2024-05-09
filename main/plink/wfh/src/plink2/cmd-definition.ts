/* eslint-disable no-console */
import * as rx from 'rxjs';
import commander from 'commander';
import {sexyFont} from '../utils/misc';
import {createPackageMgrService} from '../package-mgr/package-mgr2';
import {cmdModelService} from './cmd-model';

export function define(rootDir: string, onShutdown: () => void) {
  const packageMgrService = createPackageMgrService();
  cmdModelService.i.ft.setRootDir(rootDir).dp();

  return cmdModelService.outputTable.l.load.pipe(
    rx.map(([, done]) => done),
    rx.filter(done => done),
    rx.take(1),
    rx.mergeMap(() => packageMgrService.i.ft.scan(rootDir)
      .do(packageMgrService.o.pt.onScanCompleted)),
    rx.mergeMap(() => cmdModelService.inputTable.l.enableRxMessageTrace),
    rx.map(([, enabled]) => enabled),
    rx.distinctUntilChanged(),
    rx.map(enableRxMessageTrace => {
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
          await rx.firstValueFrom(packageMgrService.i.ft.switchToSpace(dir).ddo(
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

      program.command('stop')
        .description('Stop daemon process')
        .action(async () => {
          await rx.firstValueFrom(cmdModelService.i.ft.shutdown().ddo(
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

