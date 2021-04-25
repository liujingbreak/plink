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
import {EpicFactory} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import Color from 'color';


// export interface ColorInfo {
//   luminosity: number;
//   hue: number;
//   saturationl: ReturnType<Color['saturationl']>;
//   lightness: ReturnType<Color['lightness']>;
//   isLight: ReturnType<Color['isLight']>;
//   isDark: ReturnType<Color['isDark']>;
//   alpha: ReturnType<Color['alpha']>;
//   gray: ReturnType<Color['gray']>;
//   white: ReturnType<Color['white']>;
//   grayscale: string;
//   hex: ReturnType<Color['hex']>;
//   rgb: ReturnType<Color['rgb']>;
//   hsl: ReturnType<Color['hsl']>;
//   hsv: ReturnType<Color['hsv']>;
//   ansi256: ReturnType<Color['ansi256']>;
//   ansi16: ReturnType<Color['ansi16']>;
//   cmyk: ReturnType<Color['cmyk']>;
//   apple: ReturnType<Color['apple']>;
// }

export interface ColorInfoObservableProps {
  color: string | Color;
  showDetail?: boolean;
}
export interface ColorInfoState {
  componentProps?: ColorInfoObservableProps;
  details?: Color;
  textColor: string;
  error?: Error;
}

export function sliceOptionFactory() {
  const initialState: ColorInfoState = {
    textColor: 'black'
  };
  return {
    name: 'ColorInfo',
    initialState,
    reducers: {
      setDetails(s: ColorInfoState, value: Color) {
        s.details = value;
        s.textColor = value.isDark() ? 'white' : 'black';
      },
      _syncComponentProps(s: ColorInfoState, payload: ColorInfoObservableProps) {
        s.componentProps = {...payload};
      }
    }
  };
}

export const epicFactory: EpicFactory<ColorInfoState, ReturnType<typeof sliceOptionFactory>['reducers']> = function(slice) {
  return (action$, state$) => {
    return rx.merge(
      state$.pipe(
        op.filter(s => s.componentProps != null), op.map(s => s.componentProps!.color),
        op.distinctUntilChanged(),
        op.tap(color => {
          if (typeof color === 'string') {
            const col = new Color(color);
            slice.actionDispatcher.setDetails(col);
          } else {
            slice.actionDispatcher.setDetails(color);
          }
        })
      )
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};
