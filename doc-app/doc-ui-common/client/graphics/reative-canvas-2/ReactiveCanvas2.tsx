import React from 'react';
import cls from 'classnames';
import styles from '../ReactiveCanvas.module.scss';
import {createControl, ReactiveCanvasProps as Props} from './reactiveCanvas2.control';
// import {sliceOptionFactory, epicFactory, ReactiveCanvasProps as Props} from './reactiveCanvas.state';

// CRA's babel plugin will remove statement "export {ReactiveCanvasProps}" in case there is only type definition, have to reassign and export it.
export type ReactiveCanvasProps = React.PropsWithChildren<Props & {
  className?: string;
}>;

const ReactiveCanvas: React.FC<ReactiveCanvasProps> = function(props) {
  const [, touchState] = React.useState({});
  const [state$, control, onUnmount] = React.useMemo(() => {
    return createControl();
  }, []);

  React.useEffect(() => {
    if (props.scaleRatio != null)
      control.dispatcher.changeRatio(props.scaleRatio);
  }, [control.dispatcher, props.scaleRatio]);

  React.useEffect(() => {
    control.dispatcher.onDomMount();
    return onUnmount;
  }, [control.dispatcher, onUnmount]);

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
};

export {ReactiveCanvas};

