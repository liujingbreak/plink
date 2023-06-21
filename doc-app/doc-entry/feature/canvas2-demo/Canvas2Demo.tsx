import React from 'react';
import {ReactiveCanvas} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2/ReactiveCanvas2';
import clnBind from 'classnames/bind';
import styles from './Canvas2Demo.module.scss';
const cln = clnBind.bind(styles);

export const Canvas2Demo = React.memo(_props => {
  return <ReactiveCanvas className={cln('reactive-canvas')} onReady={}/>;
});

