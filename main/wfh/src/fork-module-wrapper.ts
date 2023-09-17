import {initProcess} from './utils/bootstrap-process';

if (process.send)
  process.on('message', init);

type ProcMsg = {type?: string, opts?: {stateExitAction?: 'save' | 'send' | 'none'}, moduleFile: string};

function init(msg: string) {
  if (typeof msg !== 'string')
    return;

  const msgObj = JSON.parse(msg) as ProcMsg;
  if (msgObj.type === 'plink-fork-wrapper') {
    process.off('message', init);
    runModule(msgObj.moduleFile, msgObj.opts?.stateExitAction);
  }
}

export function runModule(moduleFile: string, stateExitAction?: 'save' | 'send' | 'none') {
  process.env.__plinkLogMainPid = process.pid + '';
  initProcess(stateExitAction || 'none');
  require(moduleFile);
}

