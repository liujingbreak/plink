import React from 'react';

import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import './FormTextField.scss';
// import {Ripple} from './Ripple';
import {useTinyRtk} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {sliceOptionFactory, epicFactory, FormTextFieldProps as Props, FormTextFieldSlice as _FormTextFieldSlice} from './formTextField.state';

// CRA's babel plugin will remove statement "export {FormTextFieldProps}" in case there is only type definition, have to reassign and export it.
export type FormTextFieldProps = Props;
export type FormTextFieldSlice = _FormTextFieldSlice;

const FormTextField: React.FC<FormTextFieldProps> = function(props) {
  const [state, slice] = useTinyRtk(sliceOptionFactory, props, epicFactory);
  const {actionDispatcher: dispatcher} = slice;

  return <label ref={dispatcher.onDomRef} className={cls(
    props.className,
    props.showLabel === false ? 'mdc-text-field--no-label' : '',
    'mdc-text-field mdc-text-field--filled'
    )}
    onFocus={dispatcher._focusChange}
    onBlur={dispatcher._focusChange}
    >
    <span className="mdc-text-field__ripple"></span>
    <span className="mdc-floating-label" id="my-label-id">{props.hintText}</span>
    <input className="mdc-text-field__input" name={state.randomId} // random name for preventing Chrome autocomplete popups
      ref={dispatcher.onInputRef}
      autoComplete={state.randomId} // random autoComplete for preventing Chrome autocomplete popups
      type={props.inputType || 'text'}
      required={props.isRequired !== false}
      aria-labelledby="my-label-id"
      onChange={dispatcher._valueChange}/>
    <span className="mdc-line-ripple" ref={dispatcher.onRippleLineRef}></span>
  </label>;
};

export {FormTextField};



