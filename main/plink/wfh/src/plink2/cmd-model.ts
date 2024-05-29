import Path from 'path';
import fs from 'fs';
import * as rx from 'rxjs';
import {ReactorComposite2, SingleActionFactory} from '@wfh/reactivizer';

interface CmdActions {
  setRootDir(dir: string): SingleActionFactory;
  enableRxMessageTrace(enabled: boolean): SingleActionFactory;
  setActiveInstallSpace(spaceKey: string | null): SingleActionFactory;
  shutdown(): SingleActionFactory;
}

interface CmdEvents {
  saved(): SingleActionFactory;
  load(done: boolean): SingleActionFactory;
}

const inputTableFor = ['enableRxMessageTrace', 'setRootDir', 'setActiveInstallSpace'] as const;
const outputTableFor = ['load'] as const;

export const cmdModelService = new ReactorComposite2<CmdActions, CmdEvents, typeof inputTableFor, typeof outputTableFor>({
  name: 'CmdModel',
  debug: true,
  inputTableFor,
  outputTableFor
});

const {i, o, r, inputTable} = cmdModelService;

r('shutdown -> save', i.pt.shutdown.pipe(
  rx.mergeMap(a => inputTable.l.setRootDir.pipe(
    rx.map(b => [a, b] as const),
    rx.take(1)
  )),
  rx.concatMap(async ([[m], [, rootDir]]) => {
    try {
      await fs.promises.writeFile(Path.resolve(rootDir, '.plink2.stat.json'), JSON.stringify(inputTable.getData(), null, '  '));
      o.ft.saved().dp(m);
    } catch (err) {
      cmdModelService.dispatchErrorFor(err, m);
    }
  })
));

i.ft.enableRxMessageTrace(false).dp();
i.ft.setActiveInstallSpace(null).dp();
o.ft.load(false).dp();

r('-> load', inputTable.l.setRootDir.pipe(
  rx.take(1),
  rx.mergeMap(async ([, rootDir]) => {
    const statFile = Path.resolve(rootDir, '.plink2.stat.json');
    try {
      const content = await fs.promises.readFile(statFile, 'utf8');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = JSON.parse(content);
      for (const [type, params] of Object.entries(json)) {
        cmdModelService.i.dispatchFactory(type as keyof CmdActions)(...(params as any));
      }
    } catch (err) {
      i.ft.enableRxMessageTrace(false).dp();
      i.ft.setActiveInstallSpace(null).dp();
    } finally {
      o.ft.load(true).dp();
    }
  })
));

