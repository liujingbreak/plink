import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/es/rx-utils';

// eslint-disable-next-line @typescript-eslint/tslint/config
const worker = new Worker(new URL('./paintable-worker', import.meta.url));

type SlowActions = {
  calcBoundingBox(): void;
};

export const heavyCal = createActionStreamByType<SlowActions>();
const {actionOfType: aot} = heavyCal;

rx.merge(
  aot('calcBoundingBox').pipe(
    op.map(({payload: segments}) => {
      worker.postMessage('hello');
    })
  )
).subscribe();

