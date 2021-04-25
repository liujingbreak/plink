import React from 'react';

// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import './Slider.scss';
import {MDCSlider, MDCSliderChangeEventDetail} from '@material/slider';

export type SliderProps = React.PropsWithChildren<{
  /** must be a memoized callback property */
  getMdcRef?(mdcRef: MDCSlider): any;
  type?: 'continuous' | 'range' | 'discrete';
  disabled?: boolean;
  name?: string;
  value: number;
  max: number;
  min: number;
  onChange?(evt: Event & {detail: MDCSliderChangeEventDetail}): void;
}>;

interface SlideState {
  mdcRef?: MDCSlider;
  dom?: HTMLElement | null;
  className?: string;
}

const Slider: React.FC<SliderProps> = function(props) {
  const [state, setState] = React.useState<SlideState>({});

  const onRef = React.useCallback((dom: HTMLDivElement|null) => {
    if (dom) {
      setState(s => ({...s, dom}));
    }
  }, []);

  const changeHandler = React.useCallback((evt: Event & {detail: MDCSliderChangeEventDetail}) => {
    setState(s => ({...s, value: evt.detail.value}));
    if (props.onChange) {
      props.onChange(evt);
    }
  }, []);

  React.useEffect(() => {
    if (state.mdcRef) {
      state.mdcRef.unlisten('MDCSlider:change', changeHandler);
      state.mdcRef.destroy();
      setState(s => ({...s, mdcRef: undefined}));
    }
    if (state.dom) {
      const mdcRef = new MDCSlider(state.dom);
      setState(s => ({...s, mdcRef}));
      mdcRef.listen('MDCSlider:change', changeHandler);
    }
  }, [state.dom]);

  React.useEffect(() => {
    return () => {
      if (state.mdcRef) {
        state.mdcRef.destroy();
      }
    };
  }, []);

  React.useEffect(() => {
    if (props.value != null && state.mdcRef && props.value !== state.mdcRef.getValue()) {
      state.mdcRef.setValue(props.value);
    }
  }, [props.value, state.mdcRef]);

  React.useEffect(() => {
    if (state.mdcRef) {
      state.mdcRef.setDisabled(!!props.disabled);
    }
  }, [props.disabled, state.mdcRef]);

  React.useEffect(() => {
    if (props.getMdcRef && state.mdcRef) {
      props.getMdcRef(state.mdcRef);
    }
  }, [props.getMdcRef, state.mdcRef]);

  return <div ref={onRef} className='mdc-slider mdc-slider--discrete'>
    <input className='mdc-slider__input' type='range' min={props.min} max={props.max} defaultValue={props.min} name={props.name} aria-label='Continuous slider demo'/>
    <div className='mdc-slider__track'>
      <div className='mdc-slider__track--inactive'></div>
      <div className='mdc-slider__track--active'>
        <div className='mdc-slider__track--active_fill'></div>
      </div>
    </div>
    <div className='mdc-slider__thumb'>
      <div className='mdc-slider__value-indicator-container' aria-hidden='true'>
        <div className='mdc-slider__value-indicator'>
          <span className='mdc-slider__value-indicator-text'></span>
        </div>
      </div>
      <div className='mdc-slider__thumb-knob'></div>
    </div>
  </div>;
};


export {Slider};



