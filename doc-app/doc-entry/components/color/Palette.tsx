import React from 'react';

// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import styles from './Palette.module.scss';
import {useReduxTookit} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {sliceOptionFactory, epicFactory, PaletteObservableProps} from './paletteSlice';
import {ColorTool} from './ColorTool';
import {Slider} from '@wfh/doc-ui-common/client/material/Slider';

export type PaletteProps = React.PropsWithChildren<PaletteObservableProps & {
  // Define extra (non-observable) properties
}>;

const Palette: React.FC<PaletteProps> = function(props) {
  const [state, slice] = useReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  }, Object.values(props));

  const lightness = state.inputLightness;
  const sat = state.inputSaturation;
  return <>
    {lightness != null && sat != null ? <>
      <div>
        <span className={styles.label}>Lightness: {lightness}</span>
        <Slider max={100} min={0} onChange={slice.actionDispatcher._onLightnessChange} value={lightness}/>
      </div>
      <div>
        <span className={styles.label}>Saturation: {sat}</span>
        <Slider max={100} min={0} onChange={slice.actionDispatcher._onSaturationChange} value={sat}/>
      </div>
      </>
    : null}
    <ColorTool mixColors={state.mixColors}/>
    <ColorTool hue={state.hue} sliceRef={slice.actionDispatcher._onMixColorToolRef}/>
  </>;
};

export {Palette};



