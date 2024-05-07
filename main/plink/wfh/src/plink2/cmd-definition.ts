import * as rx from 'rxjs';
import commander from 'commander';
import {sexyFont} from '../utils/misc';
import {createPackageMgrService} from '../package-mgr/package-mgr2';

export async function define(rootDir: string, onShutdown: () => void) {
  const packageMgrService = createPackageMgrService();
  await rx.firstValueFrom(packageMgrService.i.ft.scan(rootDir)
    .do(packageMgrService.o.pt.onScanCompleted));
  const program = new commander.Command('plink');
  program.description('A monorepo and multi-repo management tool')
    .action(() => {
      // eslint-disable-next-line no-console
      console.log(sexyFont('PLink').string);
    });

  program.command('stop')
    .description('Stop daemon process')
    .action(onShutdown);
  return Promise.resolve(program);
}

