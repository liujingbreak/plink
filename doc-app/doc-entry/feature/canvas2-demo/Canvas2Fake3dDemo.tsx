import React from 'react';
import {ReactiveCanvas} from '@wfh/doc-ui-common/client/graphics/canvas/ReactiveCanvas2';
import clnBind from 'classnames/bind';
import styles from './Canvas2Demo.module.scss';
const cln = clnBind.bind(styles);

// eslint-disable-next-line @typescript-eslint/tslint/config
const worker = new Worker(new URL('./canvas2Fake3dDemo.worker', import.meta.url));

export const Canvas2Demo = React.memo(_props => {
  return <ReactiveCanvas className={cln('reactive-canvas')} canvasMainWorker={worker}/>;
});

