import React, {useCallback} from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames/bind';
import {MDCRipple} from '@material/ripple/index';
import '@material/ripple/styles.scss';
import styles from './Main.module.scss';


const cx = classNames.bind(styles);
const bannerImgCls = cx('assets', 'matRipple', 'mdc-ripple-surface', 'mdc-ripple-surface--primary');

const MainComp: React.FC<{}> = function(prop) {
  const onDivReady = useCallback((div: HTMLDivElement) => {
    // tslint:disable-next-line: no-unused-expression
    new MDCRipple(div);
  }, []);

  return <>
    <div className={bannerImgCls} ref={onDivReady}></div>
    <div className={styles.red}>You component goes here!</div>
    </>;
};


export default MainComp;

export function renderDom(dom: HTMLElement) {
  ReactDOM.render(<MainComp/>, dom);

  return {
    unmount() {
      ReactDOM.unmountComponentAtNode(dom);
    }
  };
}

