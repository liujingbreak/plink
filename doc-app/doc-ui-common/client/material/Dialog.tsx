import React from 'react';
// import {MDCDialog} from '@material/dialog';
// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import './Dialog.scss';
import {useReduxTookit} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {sliceOptionFactory, epicFactory, DialogProps as Props} from './dialogSlice';

export type DialogProps = Props;

const Dialog: React.FC<DialogProps> = function(props) {
  const [state, slice] = useReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props));

  return <div ref={slice.actionDispatcher.onDomRef} className={'mdc-dialog'}>
    <div className={'mdc-dialog__container'}>
      <div className={'mdc-dialog__surface'}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="my-dialog-title"
        aria-describedby="my-dialog-content">
        {// Title cannot contain leading whitespace due to mdc-typography-baseline-top() 
        }
        <h2 className={'mdc-dialog__title'} id="my-dialog-title">
        </h2>
        <div className={'mdc-dialog__content'} id="my-dialog-content">
          hellow
        </div>
        {/* <div className={styles['mdc-dialog__actions']}>
          <button type="button" className={cls(styles['mdc-button'], styles['mdc-dialog__button'])} data-mdc-dialog-action="close">
            <div className={styles['mdc-button__ripple']}></div>
            <span className={styles['mdc-button__label']}>Cancel</span>
          </button>
          <button type="button" className={cls(styles['mdc-button'], styles['mdc-dialog__button'])} data-mdc-dialog-action="accept">
            <div className={styles['mdc-button__ripple']}></div>
            <span className={styles['mdc-button__label']}>OK</span>
          </button>
        </div> */}
      </div>
    </div>
    <div className={'mdc-dialog__scrim'}></div>
  </div>;
};

/**
 * https://material-components.github.io/material-components-web-catalog/#/component/dialog
 */
export {Dialog};



