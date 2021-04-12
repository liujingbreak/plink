import React from 'react';
// import classnames from 'classnames/bind';
import clsddp from 'classnames/dedupe';

import './Ripple.scss';
// import '@material/ripple/styles.scss';
import {MDCRipple} from '@material/ripple/index';

import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

// const cx = classnames.bind(styles);


export type RippleProps = React.PropsWithChildren<{
  color?: 'dark' | 'light';
  className?: string;
  getMdcRef?: (ref: MDCRipple) => void;
  renderTo?: HTMLElement;
  renderToWhen?: rx.Observable<HTMLElement>;
}>;

const Ripple: React.ForwardRefRenderFunction<Promise<MDCRipple>, RippleProps> = function(props, ref) {

  React.useEffect(() => {
    if (props.renderTo) {
      renderTo(props.renderTo, props);
    }
  }, [props.renderTo]);

  React.useEffect(() => {
    if (props.renderToWhen) {
      props.renderToWhen.pipe(
        op.filter(dom => dom != null),
        op.tap(dom => renderTo(dom, props)),
        op.take(1)
      ).subscribe();
    }
  }, [props.renderToWhen]);

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

  // const Content = props.renderTo ? props.renderTo() : null;

  return (
      <div ref={onDivReady}>{props.children}</div>
  );
};

export function renderTo(div: HTMLElement, props: RippleProps) {
  const cls = clsddp(props.className || '', div.className, 'matRipple', 'mdc-ripple-surface',
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

const Forwarded = React.forwardRef(Ripple);

export {Forwarded as Ripple};

