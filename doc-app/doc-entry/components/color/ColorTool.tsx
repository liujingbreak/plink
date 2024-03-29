import React from 'react';

import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import {ReactiveCanvas} from '@wfh/doc-ui-common/client/graphics/canvas';
import {useReduxTookit} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import styles from './ColorTool.module.scss';
// import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {createControl, sliceOptionFactory, epicFactory, ColorToolProps as Props, ColorToolEpicFactory} from './colorTool.state';
import {ColorInfo} from './ColorInfo';

// export type ColorToolProps = ColorToolObservableProps;
export interface ColorToolProps extends Props {
  epicFactory?: ColorToolEpicFactory;
}

// eslint-disable-next-line @typescript-eslint/tslint/config
const worker = new Worker(new URL('./colorToolCanvas.worker', import.meta.url));

const ColorTool = React.memo<ColorToolProps>(props => {

  const [state, slice] = useReduxTookit(sliceOptionFactory, epicFactory, props.epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props));

  const [{dispatcher}] = React.useMemo(() => {
    return createControl();
  }, []);

  React.useEffect(() => () => dispatcher.onUnmount(), [dispatcher]);
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div className={cls(styles.scope, {[styles.mix]: state.componentProps?.mixColors != null})}>
    <div className={styles.label}>{state.label || ''}</div>
    <div className={styles.cells}>
      {state.colors.map((col, idx) => {
        const hex = col.hex();
        return <ColorInfo key={idx} color={col} onClick={state.colorClickCallbacks[hex]}></ColorInfo>;
      })}
    </div>
    <div style={state.gradientStyle} className={styles.gradient}></div>
    <ReactiveCanvas className={styles.canvas} canvasMainWorker={worker}/>
  </div>
  ;
});

export {ColorTool};

