import React from 'react';
import classnames from 'classnames/bind';
import styles from './$__MyComponent__$.module.scss';

const cx = classnames.bind(styles);
const cls = cx('red', 'bold');

const $__MyComponent__$: React.FC<{}> = function(prop) {
  return (
    <div className={cls}>You component goes here</div>
  );
};

export default $__MyComponent__$;

