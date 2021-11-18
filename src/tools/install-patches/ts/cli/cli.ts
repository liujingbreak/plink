import {CliExtension, log4File} from '@wfh/plink';
import {getStore as getPkgMgrStore, slice, workspaceDir} from '@wfh/plink/wfh/dist/package-mgr/index';
import {stateFactory, castByActionType} from '@wfh/plink/wfh/dist/store';
import patchPostcss from '../fix-postcss-values-parser';
import * as op from 'rxjs/operators';

const log = log4File(__filename);

const cliExt: CliExtension = (program) => {
  stateFactory.addEpic((action$, state$) => {
    return castByActionType(slice.actions, action$).workspaceChanged.pipe(
      op.map(({payload: workspacekeys}) => {
        log.info('Checking... worktree space:', workspacekeys.join(', '));
        void patchPostcss(workspacekeys.map(key => workspaceDir(key)));
      }),
      op.ignoreElements()
    );
  });

  program.command('patch:postcss-values-parser')
  .description('Fix postcss-values-parser@2.0.1')
  // .argument('[argument1...]', 'Description for argument1', [])
  // .option('-f, --file <spec>', 'sample option')
  .action((argument1: string[]) => {
    return getPkgMgrStore().pipe(
      op.map(s => s.workspaces),
      op.distinctUntilChanged(),
      op.take(1),
      op.switchMap(map => patchPostcss(map.keys()))
    ).toPromise();
  });

};

export default cliExt;
