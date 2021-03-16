import React from 'react';
import classnames from 'classnames/bind';
import styles from './RippleComp.module.scss';
import {MDCRipple} from '@material/ripple/index';
import '@material/ripple/styles.scss';
import * as rx from 'rxjs';

const cx = classnames.bind(styles);


export interface RippleCompProps {
  color?: 'primary' | 'accent';
  getMdcRef?: (ref: MDCRipple) => void;
}

const RippleComp: React.ForwardRefRenderFunction<Promise<MDCRipple>, RippleCompProps> = function(props, ref) {
  const cls = cx('matRipple', 'mdc-ripple-surface',
    {'mdc-ripple-surface--primary': props.color === 'primary', 'mdc-ripple-surface--accent': props.color === 'primary'});

  const sub$ = React.useMemo(() => new rx.ReplaySubject<MDCRipple>(), []);

  const onDivReady = React.useCallback((div: HTMLDivElement) => {
    const mdc = new MDCRipple(div);
    sub$.next(mdc);
    sub$.complete();
    if (props.getMdcRef) {
      props.getMdcRef(mdc);
    }
  }, []);

  React.useImperativeHandle(ref, () => sub$.toPromise(), [sub$]);

  React.useEffect(() => {
    return () => {
      sub$.subscribe({
        next(mdc) { mdc.destroy();}
      });
    };
  }, []);

  return (
    <div className={cls} ref={onDivReady}>{props.children}</div>
  );
};

const Forwarded = React.forwardRef(RippleComp);

export {Forwarded as RippleComp};

