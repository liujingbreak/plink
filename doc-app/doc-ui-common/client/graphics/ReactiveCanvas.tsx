import React from 'react';
import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import cls from 'classnames';
import {sliceOptionFactory, epicFactory, ReactiveCanvasProps as Props} from './reactiveCanvas.state';
import styles from './ReactiveCanvas.module.scss';

// CRA's babel plugin will remove statement "export {ReactiveCanvasProps}" in case there is only type definition, have to reassign and export it.
export type ReactiveCanvasProps = Props;

const ReactiveCanvas: React.FC<ReactiveCanvasProps> = function(props) {
  const [, slice] = useTinyReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slice.actionDispatcher, ...Object.values(props)]);

  React.useEffect(() => {
    slice.actionDispatcher.onDomMount();
  }, [slice.actionDispatcher]);
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div className={cls(styles.host, props.className)}>
    <canvas className={props.className} ref={slice.actionDispatcher._create}/>
  </div>;
};

export {ReactiveCanvas};
export * from './reactiveCanvas.state';
