import React from 'react';
import {useReduxTookit} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {sliceOptionFactory, epicFactory, SurfaceProps as Props} from './surfaceSlice';
// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import styles from './Surface.module.scss';

// CRA's babel plugin will remove statement "export {SurfaceProps}" in case there is only type definition, have to reassign and export it.
export type SurfaceProps = Props;

const Surface: React.FC<SurfaceProps> = function(props) {
  const [state, slice] = useReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props));
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div onClick={slice.actionDispatcher.onClick}>{state.yourStateProp}</div>;
};

export {Surface};
