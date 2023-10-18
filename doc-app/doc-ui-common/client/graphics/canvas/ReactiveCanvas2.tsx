import React from 'react';
import cls from 'classnames';
import styles from './ReactiveCanvas2.module.scss';
import {createDomControl} from './reactiveCanvas2.dom.control';
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

  const [containerCln, setContainerCln] = React.useState<string>(props.className ?? '');
  React.useEffect(() => {
    setContainerCln((props.className ?? '') + '-container');
  }, [props.className]);

  React.useEffect(() => {
    if (props.scaleRatio != null)
      dispatcher.changeRatio(props.scaleRatio);
  }, [dispatcher, props.scaleRatio]);

  React.useEffect(() => {
    if (props.canvasMainWorker)
      dispatcher.setWorker(props.canvasMainWorker);
  }, [dispatcher, props.canvasMainWorker]);

  React.useEffect(() => {
    return () => {dispatcher.onUnmount(); };
  }, [dispatcher]);

  const onClick = React.useCallback<React.PointerEventHandler>(evt => {
    dispatcher.onClick(evt.nativeEvent.offsetX, evt.nativeEvent.offsetY);
  }, [dispatcher]);

  const onPointerMove = React.useCallback<React.PointerEventHandler>(evt => {
    dispatchPointerMove(evt.nativeEvent.offsetX, evt.nativeEvent.offsetY);
  }, [dispatchPointerMove]);

  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div className={cls(styles.host, containerCln)}>
    <canvas className={props.className} ref={dispatcher.onDomChange}
      onPointerDown={onClick} onPointerMove={onPointerMove}/>
  </div>;
});

export {ReactiveCanvas};

