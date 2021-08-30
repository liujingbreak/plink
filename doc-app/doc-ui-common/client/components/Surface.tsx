import React from 'react';
import {useRtk} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {sliceOptionFactory, epicFactory, SurfaceProps as Props} from './surfaceSlice';
import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import styles from './Surface.module.scss';

// CRA's babel plugin will remove statement "export {SurfaceProps}" in case there is only type definition, have to reassign and export it.
export type SurfaceProps = Props;

const Surface: React.FC<SurfaceProps> = function(props) {
  const [, slice] = useRtk(sliceOptionFactory, props, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher.onFirstRender();
  }, [slice.actionDispatcher]);

  return <section className={cls(props.className, styles.scope)}
    ref={slice.actionDispatcher.onSurfaceDomRef}>{props.children}</section>;
};

export {Surface};
