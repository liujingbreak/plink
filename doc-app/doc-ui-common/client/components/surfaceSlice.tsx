import {EpicFactory, castByActionType, createReducers, SliceHelper, Refrigerator} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {Immutable} from 'immer';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';
import bezierEasing from 'bezier-easing';
import {animate} from '@wfh/doc-ui-common/client/animation/ease-functions';
import Color from 'color';

const gradientCurveFn = bezierEasing(0.35, 0, 0.6, 1);
const gradientLevels = [0, 0.2, 0.4, 0.6, 0.8, 1].map(level => ({level: Math.round(level * 100) + '%', opacity: (1 - gradientCurveFn(level))}));

export type SurfaceProps = React.PropsWithChildren<{
  className?: string;
  color?: string;
  /** 0 - 1 */
  minAlpha?: number;
  sliceRef?(sliceHelper: SurfaceSliceHelper): void;
}>;
export interface SurfaceState {
  componentProps?: SurfaceProps;
  surfaceDom?: Immutable<Refrigerator<HTMLElement>>;
  rgbColor: string;
  colorAlpha: number;
}

const simpleReducers = {
  onSurfaceDomRef(s: SurfaceState, payload: HTMLElement | null) {
    if (payload) {
      s.surfaceDom = new Refrigerator(payload);
    } else {
      s.surfaceDom = undefined;
    }
  },
  changeBgPosition(s: SurfaceState, top: number) {
    const backgroundImage = genBackgroundStr(top, s.rgbColor, s.colorAlpha, s.componentProps?.minAlpha);
    s.surfaceDom!.getRef().style.backgroundImage = backgroundImage;
  },

  changeBgColor(s: SurfaceState, color: string) {
  },

  onFirstRender(s: SurfaceState) {},

  _syncComponentProps(s: SurfaceState, payload: SurfaceProps) {
    s.componentProps = {...payload};
  }
  // define more reducers...
};
const reducers = createReducers<SurfaceState, typeof simpleReducers>(simpleReducers);

export function sliceOptionFactory() {
  const initialState: SurfaceState = {
    rgbColor: '66, 141, 233',
    colorAlpha: 0.45
  };
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
      slice.getStore().pipe(op.map(s => s.componentProps?.color),
        op.distinctUntilChanged(),
        op.map(color => {
          const rawColor = new Color(color || 'rgba(66, 141, 233, 0.45)');
          slice.actionDispatcher._change(s => {
            s.rgbColor = [rawColor.red(), rawColor.green(), rawColor.blue()].join(',');
            s.colorAlpha = rawColor.alpha();
          });
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
          return animate(150, 35, 1000);
        }),
        op.map(value => {
          slice.actionDispatcher.changeBgPosition(value);
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
      )
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};

function genBackgroundStr(top: number, colorRgb: string, alpha: number, minAlpha?: number) {
  return `radial-gradient(circle farthest-corner at 50% ${top}%, ${gradientLevels.map(item => `rgba(${colorRgb}, ${item.opacity * alpha}) ${item.level}`).join(', ')})`;
}
