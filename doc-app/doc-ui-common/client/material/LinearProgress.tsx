import React from 'react';
import { MDCLinearProgress } from '@material/linear-progress';
import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import './LinearProgress.scss';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

export type LinearProgressProps = React.PropsWithChildren<{
  className?: string;
  determinate?: boolean;
  open?: boolean;
}>;

const LinearProgress: React.ForwardRefRenderFunction<Promise<MDCLinearProgress>, LinearProgressProps> = function(props, ref) {
  const api$ = React.useMemo(() => new rx.ReplaySubject<MDCLinearProgress>(1), []);

  const onRef = React.useCallback<React.RefCallback<HTMLDivElement>>((div) => {
    if (div) {
      const mdcInstance = new MDCLinearProgress(div);
      api$.next(mdcInstance);
    }
  }, []);

  React.useEffect(() => {
    return () => {
      api$.pipe(
        op.tap(api => api.destroy()),
        op.take(1)
      ).subscribe();
    };
  }, []);

  React.useImperativeHandle(ref, () => {
    return api$.pipe(op.take(1)).toPromise();
  });

  React.useEffect(() => {
    api$.subscribe({
      next(api) {
        api.determinate = !!props.determinate;
      }
    });
  }, [props.determinate]);
  React.useEffect(() => {
    api$.subscribe({
      next(api) {
        if (props.open) {
          api.open();
        } else {
          api.close();
        }
      }
    });
  }, [props.open]);
  // Your Component rendering goes here
  return <div ref={onRef} className={cls(props.className, 'LinearProgress', 'mdc-linear-progress')}
    role='progressbar'
      aria-label='Progress Bar' aria-valuemin={0} aria-valuemax={1} aria-valuenow={0}>
    <div className='mdc-linear-progress__buffer'>
      <div className='mdc-linear-progress__buffer-bar'></div>
      <div className='mdc-linear-progress__buffer-dots'></div>
    </div>
    <div className='mdc-linear-progress__bar mdc-linear-progress__primary-bar'>
      <span className='mdc-linear-progress__bar-inner'></span>
    </div>
    <div className='mdc-linear-progress__bar mdc-linear-progress__secondary-bar'>
      <span className='mdc-linear-progress__bar-inner'></span>
    </div>
  </div>;
};

const Forwarded = React.forwardRef(LinearProgress);
export {Forwarded as LinearProgress};



