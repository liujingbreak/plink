import React from 'react';

import cls from 'classnames';
import {useRtk} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {IconButton} from '@wfh/material-components-react/client/IconButton';
import styles from './Dialog.module.scss';
import './Dialog.scss';
import {sliceOptionFactory, epicFactory, DialogProps as Props, DialogSliceHelper as _DialogSliceHelper} from './dialogSlice';

export type DialogProps = Props;
export type DialogSliceHelper = _DialogSliceHelper;

const Dialog: React.FC<DialogProps> = function(props) {
  const [state, slice] = useRtk(sliceOptionFactory, props, epicFactory);

  return <div ref={slice.actionDispatcher.onDomRef} className={cls('mdc-dialog', styles.scope, state.fullscreen ? 'mdc-dialog--fullscreen' : '')}>
    <div className='mdc-dialog__container'>
      <div className='mdc-dialog__surface'
        role='alertdialog'
        aria-modal='true'
        aria-labelledby={state.componentProps?.title || ''}
        aria-describedby={state.componentProps?.title || ''} >
        {// Title cannot contain leading whitespace due to mdc-typography-baseline-top() 
        }
        <div className='mdc-dialog__header'>
          <h2 className='mdc-dialog__title'>
            {state.componentProps?.title}
          </h2>
          {/* A bug of Dialog, uncaught animationFrame error if removing Icon button dom */}
          <IconButton materialIcon='close' className={cls('mdc-dialog__close', state.fullscreen ? styles.show : styles.hide)} dialogAction='close'/>
        </div>
        <div className='mdc-dialog__content'>
          {props.children}
        </div>
        <div className='mdc-dialog__actions'>
          {
            state.buttonsRenderer()
          }
        </div>
      </div>
    </div>
    <div className='mdc-dialog__scrim'></div>
  </div>;
};

/**
 * https://material-components.github.io/material-components-web-catalog/#/component/dialog
 */
export {Dialog};



