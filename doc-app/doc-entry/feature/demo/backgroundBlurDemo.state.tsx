/**
 * For those components which has complicated "state" or a lot async "actions",
 * leverage a Redux (Redux-toolkit, Redux-observable) like internal store to manage
 * your component.
 * 
 * It's more powerful than React's useReducer() (https://reactjs.org/docs/hooks-reference.html#usereducer)
 * 
 * You should be familiar with concept of "slice" (Redux-toolkit) and "Epic" (Redux-observable) first.
 * 
 * Unlike real Redux-toolkit, we does not use ImmerJs inside, its your job to take care of
 * immutabilities of state, but also as perks, you can use any ImmerJS unfriendly object in state,
 * e.g. DOM object, React Component, functions
 */
import {EpicFactory, ofPayloadAction, Slice} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {PaintableContext, createPaintableSlice} from '@wfh/doc-ui-common/client/graphics/reactiveCanvas.state';

export type BackgroundBlurDemoProps = React.PropsWithChildren<{
  // define component properties
  sliceRef?(slice: BackgroundBlurDemoSlice): void;
}>;
export interface BackgroundBlurDemoState {
  componentProps?: BackgroundBlurDemoProps;
  canvasPaintCtx?: PaintableContext;
  error?: Error;
}

const reducers = {
  _syncComponentProps(s: BackgroundBlurDemoState, payload: BackgroundBlurDemoProps) {
    s.componentProps = {...payload};
  },
  _paint(s: BackgroundBlurDemoState, pctx: PaintableContext) {
    s.canvasPaintCtx = pctx;
  }
  // define more reducers...
};

export function sliceOptionFactory() {
  const initialState: BackgroundBlurDemoState = {};
  return {
    name: 'BackgroundBlurDemo',
    initialState,
    reducers,
    debug: process.env.NODE_ENV !== 'production'
  };
}

export type BackgroundBlurDemoSlice = Slice<BackgroundBlurDemoState, typeof reducers>;

export const epicFactory: EpicFactory<BackgroundBlurDemoState, typeof reducers> = function(slice) {
  return (action$) => {
    return rx.merge(
      action$.pipe(ofPayloadAction(slice.actions._paint),
        op.map(action => {
          createPaintable(action.payload, slice);
        })),
      // Observe state (state$) change event, exactly like React.useEffect(), but more powerful for async time based reactions
      slice.getStore().pipe(
        op.map(s => s.componentProps), // watch component property changes
        op.filter(props => props != null),
        op.distinctUntilChanged(), // distinctUntilChanged accept an expression as parameter
        op.map(() => {
          // slice.actionDispatcher....
        })
      ),
      slice.getStore().pipe(
        op.map(s => s.componentProps?.sliceRef), op.distinctUntilChanged(),
        op.map(sliceRef => {
          if (sliceRef) {
            sliceRef(slice);
          }
        })
      )
    ).pipe(op.ignoreElements());
  };
};
function createPaintable(pctx: PaintableContext, bgDemoSlice: BackgroundBlurDemoSlice) {
  const mainPaintable = createPaintableSlice('main');
  mainPaintable.addEpic(slice => {
    return action$ => {
      return rx.merge(
        action$.pipe(ofPayloadAction(slice.actions.render),
          op.map(({payload: ctx}) => {

          }))
      ).pipe(op.ignoreElements());
    };
  });
  pctx.addChild(mainPaintable.actionDispatcher);
}
/**
 * Below is how you use slice inside your component:

import React from 'react';
import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {sliceOptionFactory, epicFactory, BackgroundBlurDemoProps as Props} from './backgroundBlurDemo.state';

// CRA's babel plugin will remove statement "export {BackgroundBlurDemoProps}" in case there is only type definition, have to reassign and export it.
export type BackgroundBlurDemoProps = Props;

const BackgroundBlurDemo: React.FC<BackgroundBlurDemoProps> = function(props) {
  const [state, slice] = useTinyReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  }, Object.values(props));
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div onClick={slice.actionDispatcher.onClick}>{state}</div>;
};

export {BackgroundBlurDemo};

 */
