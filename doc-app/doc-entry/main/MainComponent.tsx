import React from 'react';
import {createRoot} from 'react-dom/client';
import clsddp from 'classnames/dedupe';
import './Main.module.scss';
import {Provider as ReduxProvider} from 'react-redux';
import {stateFactory} from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import {useStoreOfStateFactory} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {AppLayout} from '@wfh/doc-ui-common/client/components/AppLayout';
import type {AnimatableRoutesProps} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {AnimatableRoutes} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import '@material-icons/font/css/outline.css';

const rootEl = document.getElementById('root');
if (/\WWindows\W/.test(navigator.userAgent)) {
  document.body.className = clsddp(document.body.className, 'is-windows');
}

const MainComp: React.FC<{routes: AnimatableRoutesProps['routes']}> = function(prop) {
  const reduxStore = useStoreOfStateFactory(stateFactory);

  if (reduxStore == null) {
    return <>...</>;
  }
  return <ReduxProvider store={reduxStore}>
    <AppLayout parentDom={rootEl}>
      <AnimatableRoutes routes={prop.routes} basename={process.env.REACT_APP_routeBasename}/>
    </AppLayout>
  </ReduxProvider>;
};

stateFactory.configureStore();

export default MainComp;

export function renderDom(dom: HTMLElement, providers: {routes: AnimatableRoutesProps['routes']} & Record<string, any>) {
  const root = createRoot(dom);
  root.render(<MainComp routes={providers.routes}/>);

  return {
    unmount() {
      root.unmount();
    }
  };
}

