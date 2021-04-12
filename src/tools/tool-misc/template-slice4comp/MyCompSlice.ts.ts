import { PayloadAction } from '@reduxjs/toolkit';
import { ofPayloadAction, stateFactory, ResourceKey, ResourceMap } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
// We suggest to use axios-observable instead of axios or fetch,
// since axios-observable gives a easier way to CANCEL request (which is simply `unsubscribe()` from it)
import axiosObs from 'axios-observable';
import React from 'react';

export interface $__SliceName__$State {
  foobar: boolean;
  /**  ImmerJS unfriendly object should be kept in ResourceMap, only put Reference in state */
  renderingObjKey?: ResourceKey<React.ReactNode>;
  _computed: {
    reactHtml: {__html: string};
  };
}

let ID_SEED = 0;
/**
 * Usage in React
 * 
 * import {useInternalReduxForComponent} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
 * import {forComponent} from '<this file>';
 * 
 * function YourReactComponent(props: Props) {
  * const {dispatcher, state} = useInternalReduxForComponent('foobar', forComponent);
  * ...
  * }
 */
export function forComponent(name: string) {
  const initialState: $__SliceName__$State = {
    foobar: true,
    _computed: {
      reactHtml: {__html: 'You component goes here'}
    }
  };
  const resourceMap = new ResourceMap();
  const id = name + '-' + ID_SEED++;

  const slice = stateFactory.newSlice({
    name: id,
    initialState,
    reducers: {
      exampleAction(s, {payload}: PayloadAction<{foobar: boolean; renderingObj: RT1}>) {
        // modify state draft
        s.foobar = payload.foobar;
        // Save a reference in state instead of saving ImmerJS unfriendly object directly in state
        s.renderingObjKey = resourceMap.replace(s.renderingObjKey, payload.renderingObj);
      }
    }
  });

  const dispatcher = stateFactory.bindActionCreators(slice);

  const releaseEpic = stateFactory.addEpic<{example: $__SliceName__$State}>((action$, state$) => {
    return rx.merge(
      action$.pipe(ofPayloadAction(slice.actions.exampleAction),
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
        // tslint:disable-next-line: no-console
        console.error(ex);
        // To recover from async action errors, always return "src" stream when error is encountered.
        return src;
      }),
      op.ignoreElements()
    );
  });

  function getState() {
    return stateFactory.sliceState(slice);
  }

  function getStore() {
    return stateFactory.sliceStore(slice);
  }

  return {
    id, slice, dispatcher, getState, getStore, resourceMap,
    destory() {
      stateFactory.removeSlice(slice);
      releaseEpic();
    }
  };
}


