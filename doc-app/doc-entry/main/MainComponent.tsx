import React from 'react';
import ReactDOM from 'react-dom';
import clsddp from 'classnames/dedupe';
import './Main.module.scss';
import {BrowserRouter as Router} from 'react-router-dom';
import {RoutesComp} from './RoutesComp';
import {Provider as ReduxProvider} from 'react-redux';
import { stateFactory } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import { useStoreOfStateFactory } from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import { AppLayout } from '@wfh/doc-ui-common/client/components/AppLayout';
import '@material-icons/font/css/outline.css';
import './markdown-setup';
// const cx = classNames.bind(styles);
// const bannerImgCls = cx('assets');
const rootEl = document.getElementById('root');
if (/\WWindows\W/.test(navigator.userAgent)) {
  document.body.className = clsddp(document.body.className, 'is-windows');
}

const MainComp: React.FC<{}> = function(prop) {
  const reduxStore = useStoreOfStateFactory(stateFactory);

  if (reduxStore == null) {
    return <>...</>;
  }
  return <ReduxProvider store={reduxStore}>
      <AppLayout parentDom={rootEl}>
        <Router basename={process.env.REACT_APP_routeBasename}>
          <RoutesComp/>
        </Router>
      </AppLayout>
    </ReduxProvider>;
};

stateFactory.configureStore();

export default MainComp;

export function renderDom(dom: HTMLElement) {
  ReactDOM.render(<MainComp/>, dom);

  return {
    unmount() {
      ReactDOM.unmountComponentAtNode(dom);
    }
  };
}

