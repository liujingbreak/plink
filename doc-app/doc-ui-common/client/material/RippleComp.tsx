import React from 'react';
import classnames from 'classnames/bind';
import styles from './RippleComp.scss';
// import '@material/ripple/styles.scss';
import {MDCRipple} from '@material/ripple/index';

import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

const cx = classnames.bind(styles);


export type RippleCompProps = React.PropsWithChildren<{
  color?: 'dark' | 'light';
  getMdcRef?: (ref: MDCRipple) => void;
  renderOn?: HTMLElement;
}>;

const RippleComp: React.ForwardRefRenderFunction<Promise<MDCRipple>, RippleCompProps> = function(props, ref) {

  React.useEffect(() => {
    if (props.renderOn) {
      renderTo(props.renderOn, props);
    }
  }, [props.renderOn]);
  const sub$ = React.useMemo(() => new rx.BehaviorSubject<MDCRipple | null>(null), []);

  const onDivReady = React.useCallback<React.RefCallback<HTMLDivElement>>((div) => {
    if (div && sub$.getValue() == null) {
      setTimeout(() => {
        const mdc = renderTo(div, props);
        sub$.next(mdc);
      }, 200);
    }
  }, []);

  React.useImperativeHandle(ref, () => sub$.pipe(op.filter(item => item != null), op.take(1)).toPromise() as Promise<MDCRipple>, [sub$]);

  React.useEffect(() => {
    return () => {
      sub$.subscribe({
        next(mdc) { if (mdc) mdc.destroy();}
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
    {
      dark: props.color === 'dark' || props.color == null,
      light: props.color === 'light'}
    );

  div.className = cls;
  const mdc = new MDCRipple(div);
  if (props.getMdcRef) {
    props.getMdcRef(mdc);
  }
  return mdc;
}

const Forwarded = React.forwardRef(RippleComp);

export {Forwarded as RippleComp};

