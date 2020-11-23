import React from 'react';
import ReactDOM from 'react-dom';

import styles from './$__MyComponent__$.module.scss';

const $__MyComponent__$: React.FC<{}> = function(prop) {
  return <React.Fragment>
    <div className={styles.assets}></div>
    <div className={styles.red}>You component goes here</div>
    </React.Fragment>;
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
