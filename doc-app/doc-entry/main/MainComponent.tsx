import React from 'react';
import {createRoot} from 'react-dom/client';
import clsddp from 'classnames/dedupe';
import './Main.module.scss';
import {BrowserRouter as Router, Switch, Redirect} from 'react-router-dom';
import {Provider as ReduxProvider} from 'react-redux';
import { stateFactory } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import { useStoreOfStateFactory } from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import { AppLayout } from '@wfh/doc-ui-common/client/components/AppLayout';
import {AnimatableRoutes} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {routes, defaultRedirect} from '@wfh/doc-entry/configurable/routes';
import '@material-icons/font/css/outline.css';
import registerMarkdownFiles from '@wfh/doc-entry/configurable/markdown-setup';


const rootEl = document.getElementById('root');
if (/\WWindows\W/.test(navigator.userAgent)) {
  document.body.className = clsddp(document.body.className, 'is-windows');
}
registerMarkdownFiles();

const MainComp: React.FC<{[p: string]: never}> = function(prop) {
  const reduxStore = useStoreOfStateFactory(stateFactory);

  if (reduxStore == null) {
    return <>...</>;
  }
  return <ReduxProvider store={reduxStore}>
    <AppLayout parentDom={rootEl}>
      <Router basename={process.env.REACT_APP_routeBasename}>
        <AnimatableRoutes routes={routes}>
          <Switch>
            <Redirect from='/' exact to={defaultRedirect}/>
          </Switch>
        </AnimatableRoutes>
      </Router>
    </AppLayout>
  </ReduxProvider>;
};

stateFactory.configureStore();

export default MainComp;

export function renderDom(dom: HTMLElement) {
  const root = createRoot(dom);
  root.render(<MainComp/>);

  return {
    unmount() {
      root.unmount();
    }
  };
}

