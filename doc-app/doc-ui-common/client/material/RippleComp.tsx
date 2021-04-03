import React from 'react';
import classnames from 'classnames/bind';
import styles from './RippleComp.scss';
import '@material/ripple/styles.scss';
import {MDCRipple} from '@material/ripple/index';

import * as rx from 'rxjs';

const cx = classnames.bind(styles);


export type RippleCompProps = React.PropsWithChildren<{
  color?: 'primary' | 'accent';
  getMdcRef?: (ref: MDCRipple) => void;
  renderOn?: HTMLElement;
}>;

const RippleComp: React.ForwardRefRenderFunction<Promise<MDCRipple>, RippleCompProps> = function(props, ref) {
  
  React.useEffect(() => {
    if (props.renderOn) {
      renderTo(props.renderOn, props);
    }
  }, [props.renderOn]);
  const sub$ = React.useMemo(() => new rx.ReplaySubject<MDCRipple>(), []);

  const onDivReady = React.useCallback((div: HTMLDivElement) => {
    setTimeout(() => {
    const mdc = renderTo(div, props);
    sub$.next(mdc);
    sub$.complete();
    }, 500);
  }, []);

  React.useImperativeHandle(ref, () => sub$.toPromise(), [sub$]);

  React.useEffect(() => {
    return () => {
      sub$.subscribe({
        next(mdc) { mdc.destroy();}
      });
    };
  }, []);

  // const Content = props.renderOn ? props.renderOn() : null;

  return (
      <div ref={onDivReady}>{props.children}</div>
  );
};

export function renderTo(div: HTMLElement, props: RippleCompProps) {
  const cls = cx(div.className, 'matRipple', 'mdc-ripple-surface',
    {'mdc-ripple-surface--primary': props.color === 'primary', 'mdc-ripple-surface--accent': props.color === 'primary'});

  div.className = cls;
  const mdc = new MDCRipple(div);
  if (props.getMdcRef) {
    props.getMdcRef(mdc);
  }
  return mdc;
}

const Forwarded = React.forwardRef(RippleComp);

export {Forwarded as RippleComp};

