import {EpicFactory, castByActionType, createReducers, SliceHelper, Refrigerator} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {Immutable} from 'immer';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';
import bezierEasing from 'bezier-easing';
import {animate} from '@wfh/doc-ui-common/client/animation/ease-functions';

const gradientCurveFn = bezierEasing(0.35, 0, 0.6, 1);
const gradientLevels = [0, 0.2, 0.4, 0.6, 0.8, 1].map(level => ({level, value: (1 - gradientCurveFn(level)) * 0.4}));

export type SurfaceProps = React.PropsWithChildren<{
  className?: string;
  sliceRef?(sliceHelper: SurfaceSliceHelper): void;
}>;
export interface SurfaceState {
  componentProps?: SurfaceProps;
  surfaceDom?: Immutable<Refrigerator<HTMLElement>>;
}

const simpleReducers = {
  onSurfaceDomRef(s: SurfaceState, payload: HTMLElement | null) {
    if (payload) {
      s.surfaceDom = new Refrigerator(payload);
      const backgroundImage =
        `radial-gradient(circle farthest-corner at 50% 120%, ${gradientLevels.map(item => `rgba(66, 141, 233, ${item.value}) ${Math.round(item.level * 100)}%`).join(', ')})`;
      payload.style.backgroundImage = backgroundImage;
    } else {
      s.surfaceDom = undefined;
    }
  },
  transitBackground(s: SurfaceState, top: number) {
    const backgroundImage =
        `radial-gradient(circle farthest-corner at 50% ${top}%, ${gradientLevels.map(item => `rgba(66, 141, 233, ${item.value}) ${Math.round(item.level * 100)}%`).join(', ')})`;
    s.surfaceDom!.getRef().style.backgroundImage = backgroundImage;
  },

  onFirstRender(s: SurfaceState) {},

  _syncComponentProps(s: SurfaceState, payload: SurfaceProps) {
    s.componentProps = {...payload};
  }
  // define more reducers...
};
const reducers = createReducers<SurfaceState, typeof simpleReducers>(simpleReducers);

export function sliceOptionFactory() {
  const initialState: SurfaceState = {};
  return {
    name: 'Surface',
    initialState,
    reducers
  };
}

export type SurfaceSliceHelper = SliceHelper<SurfaceState, typeof reducers>;

export const epicFactory: EpicFactory<SurfaceState, typeof reducers> = function(slice) {
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
      rx.combineLatest(
        actionStreams.onFirstRender.pipe(
          op.concatMap(action => rx.timer(500))
        ),
        actionStreams.onSurfaceDomRef.pipe(
          op.filter(({payload}) => payload != null)
        )
      ).pipe(
        op.switchMap(actions => {
          return animate(120, 35, 1000);
        }),
        op.map(value => {
          slice.actionDispatcher.transitBackground(value);
        })
      )
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};
