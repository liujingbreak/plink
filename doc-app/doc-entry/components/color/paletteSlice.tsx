import {EpicFactory, ofPayloadAction, createReducers, RegularReducers, sliceRefActionOp} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import Color from 'color';
import {SliderProps} from '@wfh/material-components-react/client/Slider';
import {ColorToolProps} from './ColorTool';
import {ColorToolSliceHelper} from './colorTool.state';
export interface PaletteObservableProps {
  colorMain: string;
  colorMix: string;
}
export interface PaletteState {
  componentProps?: PaletteObservableProps;
  selectedMixedColor: string;
  inputLightness: number;
  inputSaturation: number;
  mixColors: NonNullable<ColorToolProps['mixColors']>;
  // mixColors2: NonNullable<ColorToolProps['mixColors']>;
  satuations: NonNullable<ColorToolProps['satuations']>;
  hue: NonNullable<ColorToolProps['hue']>;
  _computed: {
    selectedMixedColor?: Color;
  };
}

const rawReducers = {
  changeMixedColor(s: PaletteState, color: string) {
    s.selectedMixedColor = color;
    s.satuations = {
      originColor: color,
      satuationInterval: 10
    };
    s.hue = {
      originColor: color,
      hueInterval: 10
    };
    s.mixColors.color1 = color;
    const computed = {
      ...s._computed,
      selectedMixedColor: new Color(s.selectedMixedColor)
    };
    Object.freeze(computed);
    s._computed = computed;
  },
  _onMixColorToolRef(s: PaletteState, slice: ColorToolSliceHelper) {
  },
  _syncComponentProps(s: PaletteState, payload: PaletteObservableProps) {
    s.componentProps = {...payload};
  },
  _onLightnessChange(s: PaletteState, payload: Parameters<NonNullable<SliderProps['onChange']>>[0]) {
    s.inputLightness = payload.detail.value;
    s.selectedMixedColor = new Color(s.selectedMixedColor).lightness(payload.detail.value).hex();
  },
  _onSaturationChange(s: PaletteState, payload: Parameters<NonNullable<SliderProps['onChange']>>[0]) {
    s.inputSaturation = payload.detail.value;
    s.selectedMixedColor = new Color(s.selectedMixedColor).saturationl(payload.detail.value).hex();
  }
  // define more reducers...
};
const reducers: RegularReducers<PaletteState, typeof rawReducers> = createReducers(rawReducers);

export function sliceOptionFactory() {
  const initColor = new Color('#FCFAE9');
  const hex = initColor.hex();
  const initialState: PaletteState = {
    selectedMixedColor: initColor.hex(),
    inputLightness: Math.round(initColor.lightness()),
    inputSaturation: Math.round(initColor.saturationl()),
    mixColors: {color1: hex, color2: 'black', mixWeightIntervals: 0.07},
    // mixColors2: {color1: 'red', color2: 'blue', mixWeightIntervals: 0.07},
    satuations: {originColor: hex, satuationInterval: 10},
    hue: {originColor: hex, hueInterval: 10},
    _computed: {}
  };
  return {
    name: 'Palette',
    initialState,
    reducers
  };
}

export const epicFactory: EpicFactory<PaletteState, typeof reducers> = function(slice) {
  return (action$) => {
    return rx.merge(
      // bind color select event
      action$.pipe(ofPayloadAction(slice.actionDispatcher._onMixColorToolRef),
        sliceRefActionOp((colorToolSlice) => {
          return colorAction$ => {
            return colorAction$.pipe(ofPayloadAction(colorToolSlice.actions.onColorSelected),
              op.tap(action => {
                slice.actionDispatcher.changeMixedColor(action.payload.hex());
              })
            ).pipe(op.ignoreElements());
          };
        })
      ),
      action$.pipe(ofPayloadAction(slice.actionDispatcher._syncComponentProps),
        op.tap(doneAction => {
          if (doneAction.payload.colorMain) {
            slice.actionDispatcher._change(s => {
              const mixColors = {
                ...s.mixColors,
                color1: s.componentProps!.colorMain,
                color2: s.componentProps!.colorMix
              };
              Object.freeze(mixColors);
              s.mixColors = mixColors;
              const color = new Color(s.componentProps!.colorMain);
              s.inputLightness = Math.round(color.lightness());
              s.inputSaturation = Math.round(color.saturationl());
            });
          }
          slice.actionDispatcher.changeMixedColor(slice.getState().componentProps!.colorMain);
        })
      ),
      slice.getStore().pipe(op.map(s => s.selectedMixedColor),
        op.distinctUntilChanged(),
        op.tap(colorStr => {
          slice.actionDispatcher.changeMixedColor(colorStr);
        })
      )
    ).pipe(op.ignoreElements());
  };
};

