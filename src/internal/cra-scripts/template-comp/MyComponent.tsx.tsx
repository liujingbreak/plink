import React from 'react';
import classnames from 'classnames/bind';
import styles from './$__MyComponent__$.module.scss';

const cx = classnames.bind(styles);
const cls = cx('red', 'bold');

export type $__MyComponent__$Props = React.PropsWithChildren<{
}>;

const $__MyComponent__$: React.FC<$__MyComponent__$Props> = function(props) {
  return (
    <div className={cls}>You component goes here</div>
  );
};

export {$__MyComponent__$};

