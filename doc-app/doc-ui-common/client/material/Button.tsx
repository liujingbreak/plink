import React from 'react';

import classnames from 'classnames/bind';
import styles from './Button.scss';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {RippleComp} from './RippleComp';

const cx = classnames.bind(styles);
const cls = cx('mdc-button', 'mdc-button--raised', 'mdc-button--touch');

export type ButtonProps = React.PropsWithChildren<{
  onClick?(evt: any): void;
  disabled?: boolean;
  className?: string;
}>;

function doNothing() {}

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

  return (
    <div onClick={props.onClick ? props.onClick : doNothing} className={classnames(props.className, 'mdc-touch-target-wrapper', 'matButton')}>
      <button ref={onRef} className={cls}>
        <span className="mdc-button__label">{props.children}</span>
        <span className="mdc-button__touch"></span>
        <RippleComp/>
      </button>
    </div>);
};


export {Button};



