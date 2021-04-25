import React from 'react';
// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import styles from './ColorInfo.module.scss';
import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {Ripple} from '@wfh/doc-ui-common/client/material/Ripple';
import {epicFactory, sliceOptionFactory, ColorInfoObservableProps} from './colorInfo.state';

export type ColorInfoProps = React.PropsWithChildren<ColorInfoObservableProps & {
  // Define extra (non-observable) properties
  onClick?(event: React.MouseEvent<HTMLDivElement, MouseEvent>): void;
}>;

const ColorInfo: React.FC<ColorInfoProps> = function(props) {
  const [state, slice] = useTinyReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  }, [...Object.values(props)]);
  // Your Component rendering goes here
  return state.details ?
    <div className={styles.colorCell} style={{backgroundColor: state.details.hex(), color: state.textColor}}
      onClick={props.onClick}>
      {state.details.hex()}
      <Ripple color={state.details?.isLight() ? 'dark' : 'light'}/>
    </div>
     : null;
};


export {ColorInfo};



