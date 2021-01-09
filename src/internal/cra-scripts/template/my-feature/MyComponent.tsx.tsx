import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames/bind';
import styles from './$__MyComponent__$.module.scss';

const cx = classNames.bind(styles);

const imgCls = cx('assets');
const textCls = cx('red');

const $__MyComponent__$: React.FC<{}> = function(prop) {
  return <>
    <div className={imgCls}></div>
    <div className={textCls}>You component goes here</div>
    </>;
};

export default $__MyComponent__$;

/**
 * Export a render method if build as a library
 * @param dom 
 */
export function renderDom(dom: HTMLElement) {
  ReactDOM.render(<$__MyComponent__$/>, dom);

  return {
    unmount() {
      ReactDOM.unmountComponentAtNode(dom);
    }
  };
}
