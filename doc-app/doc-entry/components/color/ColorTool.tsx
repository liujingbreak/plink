import React from 'react';

// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import styles from './ColorTool.module.scss';
// import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {useReduxTookit} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {sliceOptionFactory, epicFactory, ColorToolObservableProps} from './colorTool.state';
import {ColorInfo} from './ColorInfo';
export type ColorToolProps = React.PropsWithChildren<ColorToolObservableProps & {
  // Define extra (non-observable) properties
}>;

const ColorTool: React.FC<ColorToolProps> = function(props) {

  const [state, slice] = useReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  }, [...Object.values(props)]);
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div className={styles.ColorTool}>
    <div className={styles.label}>{state.label || ''}</div>
    <div className={styles.cells}>
      {state.colors.map(col => (
        <ColorInfo key={col.hex()} color={col}></ColorInfo>
      ))}
    </div>
  </div>
  ;
};

export {ColorTool};



