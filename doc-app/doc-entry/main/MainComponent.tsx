import React from 'react';
import ReactDOM from 'react-dom';
// import classNames from 'classnames/bind';
// import {RippleComp} from '@wfh/doc-ui-common/client/material/RippleComp';
import './Main.module.scss';
import {BrowserRouter as Router} from 'react-router-dom';
import {RoutesComp} from './RoutesComp';
import {Provider as ReduxProvider} from 'react-redux';
import { stateFactory } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import './markdown-setup';
// const cx = classNames.bind(styles);
// const bannerImgCls = cx('assets');

const MainComp: React.FC<{}> = function(prop) {
  const [reduxStore, setReduxStore] = React.useState(stateFactory.getRootStore());

  React.useEffect(() => {
    stateFactory.rootStoreReady.then(store => {
      setReduxStore(store);
    });
  }, []);

  if (reduxStore == null) {
    return <>...</>;
  }
  return <ReduxProvider store={reduxStore}>
      <Router basename={process.env.REACT_APP_routeBasename}>
        <RoutesComp/>
      </Router>
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

