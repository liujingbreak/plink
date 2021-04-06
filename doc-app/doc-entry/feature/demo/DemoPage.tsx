import React from 'react';
import * as rr from 'react-router-dom';
import classnames from 'classnames/bind';
import styles from './DemoPage.module.scss';
// import {useParams} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {RippleComp} from '@wfh/doc-ui-common/client/material/RippleComp';

const cx = classnames.bind(styles);
const cls = cx('DemoPage');
const rippleContentCls = cx('rippleContent');

export type DemoPageProps = React.PropsWithChildren<{
  // Define your component properties
}>;

const DemoPage: React.FC<DemoPageProps> = function(props) {

  return <div className={cls} >
    <div className={rippleContentCls}  tabIndex={1}><RippleComp>"Dark" Ripple in light background</RippleComp></div>
    <div className={cx('rippleContent', 'dark')} tabIndex={1}><RippleComp color='light'>"Light" Ripple in dark background</RippleComp></div>
    <rr.NavLink to='/doc/intro'>Document</rr.NavLink>
    <rr.NavLink to='/test'>Test</rr.NavLink>
    <a href='https://material-components.github.io/material-components-web-catalog/#/'>Official Material web components demo</a>
  </div>;
};


export {DemoPage};



