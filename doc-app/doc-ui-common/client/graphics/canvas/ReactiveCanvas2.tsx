import React from 'react';
import cls from 'classnames';
import styles from './ReactiveCanvas2.module.scss';
import {createDomControl} from './reactiveCanvas2.control';
import {ReactiveCanvasConfig} from './types';

// CRA's babel plugin will remove statement "export {ReactiveCanvasProps}" in case there is only type definition, have to reassign and export it.
export type ReactiveCanvasProps = React.PropsWithChildren<ReactiveCanvasConfig & {
  canvasMainWorker: Worker;
  className?: string;
}>;

const ReactiveCanvas = React.memo<ReactiveCanvasProps>(props => {
  // const [, touchState] = React.useState({});

  const [dispatcher, dispatchPointerMove] = React.useMemo(() => {
    const [ctrl, dispatchPointerMove] = createDomControl();
    // const root = createRootPaintable(engine);
    return [ctrl.dispatcher, dispatchPointerMove] as const;
  }, []);


  React.useEffect(() => {
    if (props.scaleRatio != null)
      dispatcher.changeRatio(props.scaleRatio);
  }, [dispatcher, props.scaleRatio]);

  React.useEffect(() => {
    if (props.canvasMainWorker)
      dispatcher.setWorker(props.canvasMainWorker);
  }, [dispatcher, props.canvasMainWorker]);

  React.useEffect(() => {
    return () => dispatcher.onUnmount();
  }, [dispatcher]);

  const onClick = React.useCallback<React.PointerEventHandler>(evt => {
    dispatcher._onClick(evt.nativeEvent.offsetX, evt.nativeEvent.offsetY);
  }, [dispatcher]);

  const onPointerMove = React.useCallback<React.PointerEventHandler>(evt => {
    dispatchPointerMove(evt.nativeEvent.offsetX, evt.nativeEvent.offsetY);
  }, [dispatchPointerMove]);

  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div className={cls(styles.host, props.className)}>
    <canvas className={props.className} ref={dispatcher.onDomChange}
      onPointerDown={onClick} onPointerMove={onPointerMove}/>
  </div>;
});

export {ReactiveCanvas};

