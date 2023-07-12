import React from 'react';
import cls from 'classnames';
import styles from '../ReactiveCanvas.module.scss';
import {create as createEngine, ReactiveCanvas2Engine, ReactiveCanvasConfig,
  createRootPaintable
} from './reactiveCanvas2.control';
// import {sliceOptionFactory, epicFactory, ReactiveCanvasProps as Props} from './reactiveCanvas.state';

// CRA's babel plugin will remove statement "export {ReactiveCanvasProps}" in case there is only type definition, have to reassign and export it.
export type ReactiveCanvasProps = React.PropsWithChildren<ReactiveCanvasConfig & {
  className?: string;
  onReady?(root: ReturnType<typeof createRootPaintable>, engine: ReactiveCanvas2Engine): void;
}>;

const ReactiveCanvas = React.memo<ReactiveCanvasProps>(props => {
  const [, touchState] = React.useState({});

  const [engine, dispatcher, state$, dispatchPointerMove, root] = React.useMemo(() => {
    const engine = createEngine();
    const root = createRootPaintable(engine);
    return [engine, engine.canvasController.dispatcher, engine.canvasState$, engine.onPointerMove, root];
  }, []);


  React.useEffect(() => {
    if (props.scaleRatio != null)
      dispatcher.changeRatio(props.scaleRatio);
  }, [dispatcher, props.scaleRatio]);

  React.useEffect(() => {
    dispatcher.onDomMount();
    return () => dispatcher.onUnmount();
  }, [dispatcher]);

  React.useEffect(() => {
    if (props.onReady)
      props.onReady(root, engine);
  }, [root, props, engine]);

  React.useEffect(() => {
    const sub = state$.subscribe({
      next(s) { touchState({}); }
    });
    return sub.unsubscribe();
  }, [state$]);

  const onClick = React.useCallback<React.PointerEventHandler>(evt => {
    dispatcher._onClick(evt.nativeEvent.offsetX, evt.nativeEvent.offsetY);
  }, [dispatcher]);

  const onPointerMove = React.useCallback<React.PointerEventHandler>(evt => {
    dispatchPointerMove(evt.nativeEvent.offsetX, evt.nativeEvent.offsetY);
  }, [dispatchPointerMove]);

  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div className={cls(styles.host, props.className)}>
    <canvas className={props.className} ref={dispatcher._createDom}
      onPointerDown={onClick} onPointerMove={onPointerMove}/>
  </div>;
});

export {ReactiveCanvas};

