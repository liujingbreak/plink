import { EpicFactory, createReducers, SliceHelper, Refrigerator, castByActionType } from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';
import {Immutable} from 'immer';
import bezierEasing from 'bezier-easing';

const gradientCurveFn = bezierEasing(0.35, 0, 0.6, 1);
const gradientLevels = [0, 0.2, 0.4, 0.6, 0.8, 1].map(level => ({level, value: (1 - gradientCurveFn(level)) * 0.3}));

export type SurfaceBackgroundDemoProps = React.PropsWithChildren<{
  // define component properties
  sliceRef?(sliceHelper: SurfaceBackgroundDemoSliceHelper): void;
}>;
export interface SurfaceBackgroundDemoState {
  componentProps?: SurfaceBackgroundDemoProps;
  surfaceDom?: Immutable<Refrigerator<HTMLElement>>;
}

const simpleReducers = {
  _syncComponentProps(s: SurfaceBackgroundDemoState, payload: SurfaceBackgroundDemoProps) {
    s.componentProps = {...payload};
  },

  onSurfaceDomRef(s: SurfaceBackgroundDemoState, payload: HTMLElement | null) {
    if (payload) {
      s.surfaceDom = new Refrigerator(payload);
      const backgroundImage =
        `radial-gradient(circle farthest-corner at 50% 35%, ${gradientLevels.map(item => `rgba(66, 141, 233, ${item.value}) ${Math.round(item.level * 100)}%`).join(', ')})`;
      payload.style.backgroundImage = backgroundImage;
    } else {
      s.surfaceDom = undefined;
    }
  },

  onFirstRender(s: SurfaceBackgroundDemoState) {}
  // define more reducers...
};
const reducers = createReducers<SurfaceBackgroundDemoState, typeof simpleReducers>(simpleReducers);

export function sliceOptionFactory() {
  const initialState: SurfaceBackgroundDemoState = {};
  return {
    name: 'SurfaceBackgroundDemo',
    initialState,
    reducers
  };
}

export type SurfaceBackgroundDemoSliceHelper = SliceHelper<SurfaceBackgroundDemoState, typeof reducers>;

export const epicFactory: EpicFactory<SurfaceBackgroundDemoState, typeof reducers> = function(slice) {
  return (action$) => {
    const actionStreams = castByActionType(slice.actions, action$);
    return rx.merge(
      // Observe state (state$) change event, exactly like React.useEffect(), but more powerful for async time based reactions
      slice.getStore().pipe(
        op.map(s => s.componentProps), // watch component property changes
        op.filter(props => props != null),
        op.distinctUntilChanged(), // distinctUntilChanged accept an expression as parameter
        op.map(() => {
          // slice.actionDispatcher....
        })
      ),
      slice.getStore().pipe(op.map(s => s.componentProps?.sliceRef),
        op.distinctUntilChanged(),
        op.map(sliceRef => {
          if (sliceRef) {
            sliceRef(slice);
          }
          return null;
        })
      ),
      actionStreams.onFirstRender.pipe()
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};

