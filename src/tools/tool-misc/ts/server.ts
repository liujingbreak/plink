import {ExtensionContext, log4File} from '@wfh/plink';
import {exit$} from '@wfh/plink/wfh/dist/app-server';
import * as op from 'rxjs/operators';

const log = log4File(__filename);

export function activate(api: ExtensionContext) {
  const router = api.router();
  log.info('Plink command server is up and running');

  router.post<{cmdName: string}>('/plink-cli/:cmdName', (req, res) => {
    log.info('Recieve command', req.params.cmdName);
  });

  router.post('/plink-cli-stoi', (req, res) => {
    exit$.pipe(
      op.filter(action => action === 'done'),
      op.tap(() => {
        process.exit(0);
      })
    ).subscribe();

    exit$.next('start');
  });
}
