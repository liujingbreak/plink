import {log4File} from '@wfh/plink';
import {createWorkerControl} from '@wfh/reactivizer/dist/fork-join/node-worker';
import {MdInputActions, MdOutputEvents, setupReacting, MarkdownProcessor} from '../isom/markdown-process-common';

const log = log4File(__filename);

export const markdownProcessor: MarkdownProcessor = createWorkerControl<MdInputActions, MdOutputEvents>({
  name: 'markdownProcessor',
  debug: true,
  debugExcludeTypes: ['wait', 'stopWaiting'],
  log(...msg) {
    log.info(...msg);
  }
});
setupReacting(markdownProcessor);

