/* eslint-disable no-console */
import {createSlice, castByActionType, ofPayloadAction} from '../tiny-redux-toolkit';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

const demoSlice = createSlice({
  name: 'demo',
  initialState: {} as {ok?: boolean; error?: Error},
  reducers: {
    world(s) {},
    hellow(s, greeting: {data: string}) {}
  },
  debug: true
});
demoSlice.addEpic((slice, ofType) => {
  return (action$, state$) => {
    const actionStreams = castByActionType(slice.actions, action$);

    return rx.merge(
      actionStreams.world.pipe(
        op.tap(action => console.log('on world'))
      ),
      actionStreams.hellow.pipe(
        op.map(action => {
          console.log('on hellow 1', action.payload.data);
          slice.actionDispatcher.world();
        })
      ),
      actionStreams.hellow.pipe(
        op.take(1),
        op.map(action => {
          console.log('on hellow 2', action.payload.data);
        })
      ),
      action$.pipe(
        ofType('world'),
        op.tap(action => console.log(action))
      ),
      action$.pipe(
        ofPayloadAction(slice.actions.hellow),
        op.tap(action => typeof action.payload.data === 'string')
      ),
      action$.pipe(
        ofPayloadAction(slice.actionDispatcher.hellow, slice.actionDispatcher.world),
        op.tap(action => action.payload)
      )
    ).pipe(op.ignoreElements());
  };
});

export function test() {
  demoSlice.actionDispatcher.hellow({data: 'data A'});
  demoSlice.actionDispatcher.hellow({data: 'data B'});
}
