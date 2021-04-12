import React from 'react';

import classnames from 'classnames/bind';
import cls from 'classnames';
import styles from './Button.module.scss';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Ripple, RippleProps} from './Ripple';

const cx = classnames.bind(styles);

export type ButtonProps = React.PropsWithChildren<{
  onClick?(evt: any): void;
  type?: 'raised' | 'outlined' | 'text'
  disabled?: boolean;
  // materialIcon?: string;
  className?: string;
  rippleColor?: RippleProps['color'];
}>;


const Button: React.FC<ButtonProps> = function(props) {
  const btn$ = React.useMemo(() => new rx.ReplaySubject<HTMLButtonElement>(1), []);
  const onRef = React.useCallback((btn: HTMLButtonElement | null) => {
    if (btn == null) {
      return;
    }
    btn$.next(btn);
    btn$.complete();
    // renderRipple(btn, {});
  }, []);

  React.useEffect(() => {
    btn$.pipe(
      op.tap((btn) => {
        if (props.disabled === true) {
          btn.setAttribute('disabled', '');
        } else {
          btn.removeAttribute('disabled');
        }
      }),
      op.take(1)
    ).subscribe();
  }, [props.disabled]);

  const clickCb = React.useCallback<React.MouseEventHandler<HTMLDivElement>>((event) => {
    // if (labelRef.current) {
    //   event.stopPropagation();
    //   event.preventDefault();
    //   const a = labelRef.current.querySelector('a');
    //   if (a) {
    //     if (a.getAttribute('__clicked') !== 'yes') {
    //       console.log('click on', a);
    //       a.setAttribute('__clicked', 'yes');
    //       a.click();
    //     } else {
    //       a.removeAttribute('__clicked');
    //     }
    //   }
    // }
    if (props.onClick) {
      props.onClick(event);
    }
  }, []);

  const className = cx('mdc-button', 'mdc-button--' + (props.type == null || props.type === 'text' ? '' : props.type), 'mdc-button--touch');
  return (
    <div onClick={clickCb}
      className={classnames(props.className, cx('mdc-touch-target-wrapper', 'matButton'))}>
      <button ref={onRef} className={className}>
        {/* <span className='mdc-button__ripple'></span> */}
        <span className={cx('mdc-button__label')}>{props.children}</span>
        <span className={cx('mdc-button__touch')}></span>
        <Ripple className={cls(styles.ripple, props.type === 'raised' ? 'raised-btn' : '')} color={props.rippleColor}></Ripple>
      </button>
    </div>
    );
};


export {Button};



