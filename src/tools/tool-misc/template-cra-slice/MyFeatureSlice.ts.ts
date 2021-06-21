import { ofPayloadAction as ofa, stateFactory } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import {createReducers, RegularReducers} from '@wfh/redux-toolkit-observable/es/helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
// We suggest to use axios-observable instead of axios or fetch,
// since axios-observable gives a easier way to CANCEL request (which is simply `unsubscribe()` from it)
import axiosObs from 'axios-observable';

export interface $__SliceName__$State {
  foobar: string;
  _computed: {
    reactHtml: {__html: string};
  };
}

const initialState: $__SliceName__$State = {
  foobar: 'You component',
  _computed: {
    reactHtml: {__html: 'You component goes here'}
  }
};

const simplyReducers = {
  exampleAction(s: $__SliceName__$State, payload: string) {
    // modify state draft
    s.foobar = payload;
  }
};

const reducers: RegularReducers<$__SliceName__$State, typeof simplyReducers> = createReducers(simplyReducers);

const $__sliceName__$Slice = stateFactory.newSlice({
  name: '$__sliceName__$',
  initialState,
  reducers
});

export const dispatcher = stateFactory.bindActionCreators($__sliceName__$Slice);

const releaseEpic = stateFactory.addEpic<{$__SliceName__$: $__SliceName__$State}>((action$, state$) => {

  return rx.merge(
    action$.pipe(ofa($__sliceName__$Slice.actions.exampleAction),
      // switchMap will cancel (unsubscribe) previous unfinished action.
      // Choose one of switchMap, concatMap, mergeMap, exhaustMap from async reaction to certain Actions
      op.switchMap(({payload}) => {
        // mock async HTTP request call, you may return a Promise as well.
        // return Promise.resolve('some data'); 
        return axiosObs.get('https://www.baidu.com/guoji');
      })
    ),
    getStore().pipe(
      op.map(s => s.foobar),
      op.distinctUntilChanged(),
      op.map(changedFoo => {
        dispatcher._change(s => {
          s._computed.reactHtml.__html = changedFoo + ' goes here';
        });
      })
    )
  ).pipe(
    op.catchError((ex, src) => {
      // eslint-disable-next-line no-console
      console.error(ex);
      // To recover from async action errors, always return "src" stream when error is encountered.
      return src;
    }),
    op.ignoreElements()
  );
});

export function getState() {
  return stateFactory.sliceState($__sliceName__$Slice);
}

export function getStore() {
  return stateFactory.sliceStore($__sliceName__$Slice);
}

if (module.hot) {
  module.hot.dispose(() => {
    stateFactory.removeSlice($__sliceName__$Slice);
    releaseEpic();
  });
}
