import React from 'react';
import {ReactiveCanvas} from '@wfh/doc-ui-common/client/graphics/ReactiveCanvas';
import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
// import * as rx from 'rxjs';
// import * as op from 'rxjs/operators';
import {sliceOptionFactory, epicFactory, BackgroundDemoProps as Props} from './backgroundDemo.state';
import styles from './BackgroundDemo.module.scss';
// CRA's babel plugin will remove statement "export {BackgroundDemoProps}" in case there is only type definition, have to reassign and export it.
export type BackgroundDemoProps = Props;

const BackgroundDemo: React.FC<BackgroundDemoProps> = function(props) {
  const [state, slice] = useTinyReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  }, Object.values(props));

  return <div className={styles.host} style={state.style}>
    <ReactiveCanvas className={styles.canvas} onReady={slice.actionDispatcher._paint}/>
    <div className={styles.demoLayer}></div>
  </div>;
};


export {BackgroundDemo};

