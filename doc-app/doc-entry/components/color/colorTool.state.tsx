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
import {EpicFactory, createReducers} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import Color from 'color';
export interface ColorToolObservableProps {
  mixColors?: {
    color1: string;
    color2: string;
    /** default is 0.1 */
    mixWeightIntervals?: number;
  };
  satuations?: {
    originColor: string;
    /** 0 - 100 */
    satuationInterval: number;
  };
  hue?: {
    originColor: string;
    hueInterval: number;
  };
}

export interface ColorToolState {
  componentProps?: ColorToolObservableProps;
  colors: readonly Color[];
  label?: string;
  error?: Error;
}

const reducers = createReducers({
  _syncComponentProps(s: ColorToolState, payload: ColorToolObservableProps) {
    s.componentProps = {...payload};
    if (payload.mixColors) {
      s.label = 'Color mix';
      const col1 = new Color(payload.mixColors.color1);
      const col2 = new Color(payload.mixColors.color2);

      const interval = payload.mixColors.mixWeightIntervals || 0.1;
      const count = Math.floor(1 / interval);
      const mixed = [col1];
      for (let i = 1; i < count; i++) {
        mixed.push(col1.mix(col2, interval * i));
      }
      mixed.push(col2);
      s.colors = Object.freeze(mixed);
    } else if (payload.satuations) {
      s.label = 'Color in differenct satuations';
      const col = new Color(payload.satuations.originColor);
      const interval = payload.satuations.satuationInterval;
      const count = Math.floor(100 / interval);
      const colors = [] as Color[];
      for (let i = 0; i < count; i++) {
        colors.push(col.saturationl(interval * i));
      }
      colors.push(col.saturationl(100));
      s.colors = Object.freeze(colors);
    } else if (payload.hue) {
      s.label = 'Color in differenct hues';
      const col = new Color(payload.hue.originColor);
      const interval = payload.hue.hueInterval;
      const count = Math.floor(360 / interval);
      const colors = [] as Color[];
      for (let i = 0; i < count; i++) {
        colors.push(col.hue(interval * i));
      }
      s.colors = Object.freeze(colors);
    }
  }
});

export function sliceOptionFactory() {
  const initialState: ColorToolState = {
    colors: [] as Color[]
  };
  return {
    name: 'ColorTool',
    initialState,
    reducers,
    debug: process.env.NODE_ENV !== 'production'
  };
}

export const epicFactory: EpicFactory<ColorToolState, typeof reducers> = function(slice) {
  return (action$, state$) => {
    return rx.merge(
    ).pipe(op.ignoreElements());
  };
};

