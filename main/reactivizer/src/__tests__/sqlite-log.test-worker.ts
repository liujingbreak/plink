import {parentPort} from 'worker_threads';
import {BaseReactorFactory} from '../reactor-factory';
import {SingleActionFactory} from '../action-factory';
import {useAsInitOption} from '../sqlite-log/sqlite-api';

interface TestWorkerService {
  test2Action(text: string): SingleActionFactory;
}
// eslint-disable-next-line no-console
console.log('-- test worker begins');
const logger = useAsInitOption(null, true);
const testWorkerServiceFac = new BaseReactorFactory<TestWorkerService>({
  name: 'testWorkerService'
});

const service = testWorkerServiceFac.setting({
  enableLog: true
}).create();
service.ft.test2Action('111').dp();
service.ft.test2Action('222').dp();
service.ft.test2Action('333').dp();

void logger.waitForPending().then(() => {
  parentPort?.postMessage('done');
});

