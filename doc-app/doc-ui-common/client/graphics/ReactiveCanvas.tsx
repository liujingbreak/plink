import React from 'react';
import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {sliceOptionFactory, epicFactory, ReactiveCanvasProps as Props} from './reactiveCanvas.state';
import styles from './ReactiveCanvas.module.scss';
// import cls from 'classnames';

// CRA's babel plugin will remove statement "export {ReactiveCanvasProps}" in case there is only type definition, have to reassign and export it.
export type ReactiveCanvasProps = Props;

const ReactiveCanvas: React.FC<ReactiveCanvasProps> = function(props) {
  const [, slice] = useTinyReduxTookit(sliceOptionFactory, epicFactory, props.epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  }, [...Object.values(props)]);

  React.useEffect(() => {
    setTimeout(() => slice.actionDispatcher.resize(), 20);
  }, []);
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div className={styles.host}><canvas className={props.className} ref={slice.actionDispatcher.create}/></div>;
};

export {ReactiveCanvas};
