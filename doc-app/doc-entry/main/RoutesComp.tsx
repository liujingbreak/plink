import React from 'react';
// import classnames from 'classnames/bind';
// import styles from './RoutesComp.module.scss';
import {Switch, Route} from 'react-router-dom';
import loadable from '@loadable/component';
// import {MarkdownViewComp} from '@wfh/doc-ui-common/client/markdown/MarkdownViewComp';
// const cx = classnames.bind(styles);
// const cls = cx('red', 'bold');

// tslint:disable-next-line: no-empty-interface
export interface RoutesCompProps {
}

const LazyDocComponent = loadable(async () => {
  return (await import('../feature/article/ArticalePage')).ArticalePage;
}, {fallback: <>loading...</>});

const RoutesComp: React.FC<RoutesCompProps> = function(prop) {

  return (
    <Switch>
      <Route path='/test'>test ok</Route>
      <Route path='/doc/:mdKey'><LazyDocComponent/></Route>
    </Switch>
  );
};

export {RoutesComp};
