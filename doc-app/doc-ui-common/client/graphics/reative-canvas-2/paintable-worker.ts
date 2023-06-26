import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/es/rx-utils';
import type {SlowActions} from './paintable-heavy-cal';

/* eslint-disable no-restricted-globals */
addEventListener('message', event => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const msg = event.data;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  _actionFromObject(msg);
  console.log(event);
});

const {actionOfType: aot, _actionFromObject} = createActionStreamByType<SlowActions>();

rx.merge(
  aot('calcBoundingBox').pipe(
    op.map(({payload}) => {
      console.log('payload', payload);
    })
  )
).subscribe();
