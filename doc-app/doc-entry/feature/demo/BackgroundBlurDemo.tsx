import React from 'react';
import {ReactiveCanvas} from '@wfh/doc-ui-common/client/graphics/ReactiveCanvas';
import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {sliceOptionFactory, epicFactory, BackgroundBlurDemoProps as Props} from './backgroundBlurDemo.state';
// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import styles from './BackgroundBlurDemo.module.scss';

export type BackgroundBlurDemoProps = Props;

const BackgroundBlurDemo: React.FC<BackgroundBlurDemoProps> = function(props) {
  const [, slice] = useTinyReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  }, Object.values(props));

  return <div className={styles.host}>
    <ReactiveCanvas className={styles.canvas} onReady={slice.actionDispatcher._paint}/>
  </div>;
};


export {BackgroundBlurDemo};



