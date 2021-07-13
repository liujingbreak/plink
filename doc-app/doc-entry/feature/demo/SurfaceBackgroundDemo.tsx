import React from 'react';
import {useReduxTookit} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {sliceOptionFactory, epicFactory, SurfaceBackgroundDemoProps as Props} from './surfaceBackgroundDemoSlice';
import styles from './SurfaceBackgroundDemo.module.scss';

// import cls from 'classnames';
// CRA's babel plugin will remove statement "export {SurfaceBackgroundDemoProps}" in case there is only type definition, have to reassign and export it.
export type SurfaceBackgroundDemoProps = Props;

const SurfaceBackgroundDemo: React.FC<SurfaceBackgroundDemoProps> = function(props) {
  const [, slice] = useReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props));

  React.useEffect(() => {
    setTimeout(() => slice.actionDispatcher.onFirstRender(), 50);
  }, [slice.actionDispatcher]);
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div className={styles.host}>
    <section className={styles.surface} ref={slice.actionDispatcher.onSurfaceDomRef}>
      I am surface component
      <br/><br/>
      (Design style: colors on white surface)
    </section>
  </div>;
};

export {SurfaceBackgroundDemo};
