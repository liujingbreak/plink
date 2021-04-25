import {EpicFactory, ofPayloadAction, createReducers} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {ColorToolProps} from './ColorTool';
import Color from 'color';
import {SliderProps} from '@wfh/doc-ui-common/client/material/Slider';

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
  satuations: NonNullable<ColorToolProps['satuations']>;
  hue: NonNullable<ColorToolProps['hue']>;
  _computed: {
    selectedMixedColor?: Color;
  };
}

const reducers = createReducers({
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
    const computed = {
      ...s._computed,
      selectedMixedColor: new Color(s.selectedMixedColor)
    };
    Object.freeze(computed);
    s._computed = computed;
  },
  _syncComponentProps(s: PaletteState, payload: PaletteObservableProps) {
    s.componentProps = {...payload};
    s.mixColors = {
      color1: payload.colorMain,
      color2: payload.colorMix
    };
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
});

export function sliceOptionFactory() {
  const initColor = new Color('#FCFAE9');
  const hex = initColor.hex();
  const initialState: PaletteState = {
    selectedMixedColor: initColor.hex(),
    inputLightness: Math.round(initColor.lightness()),
    inputSaturation: Math.round(initColor.saturationl()),
    mixColors: {color1: 'black', color2: hex},
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
      action$.pipe(ofPayloadAction(slice.actionDispatcher._syncComponentProps),
        op.tap(doneAction => {
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


