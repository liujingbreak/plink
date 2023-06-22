import React from 'react';
import {BehaviorSubject} from 'rxjs';
import cls from 'classnames';
import styles from '../ReactiveCanvas.module.scss';
import {createControl, ReactiveCanvasConfig, ReactiveCanvas2Control, ReactiveCanvas2State,
  createRootPaintable
} from './reactiveCanvas2.control';
import {PaintableCtl, PaintableState} from './paintable';
// import {sliceOptionFactory, epicFactory, ReactiveCanvasProps as Props} from './reactiveCanvas.state';

// CRA's babel plugin will remove statement "export {ReactiveCanvasProps}" in case there is only type definition, have to reassign and export it.
export type ReactiveCanvasProps = React.PropsWithChildren<ReactiveCanvasConfig & {
  className?: string;
  onReady?(rootPaintable: PaintableCtl, rootPaintableState: PaintableState, control: ReactiveCanvas2Control, state$: BehaviorSubject<ReactiveCanvas2State>): void;
}>;

const ReactiveCanvas = React.memo<ReactiveCanvasProps>(props => {
  const [, touchState] = React.useState({});
  const [state$, control, rootPaintable, rootPaintableState] = React.useMemo(() => {
    const [state$, control] = createControl();
    const root = createRootPaintable(control, state$);
    return [state$, control, ...root];
  }, []);

  React.useEffect(() => {
    if (props.scaleRatio != null)
      control.dispatcher.changeRatio(props.scaleRatio);
  }, [control.dispatcher, props.scaleRatio]);

  React.useEffect(() => {
    control.dispatcher.onDomMount();
    return () => control.dispatcher.onUnmount();
  }, [control.dispatcher]);

  React.useEffect(() => {
    if (props.onReady)
      props.onReady(rootPaintable, rootPaintableState, control, state$);
  }, [control, props, rootPaintable, rootPaintableState, state$]);

  React.useEffect(() => {
    const sub = state$.subscribe({
      next(s) { touchState({}); }
    });
    return sub.unsubscribe();
  }, [state$]);

  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div className={cls(styles.host, props.className)}>
    <canvas className={props.className} ref={control.dispatcher._createDom}/>
  </div>;
});

export {ReactiveCanvas};

