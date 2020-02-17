import React from 'react';
import ReactDOM from 'react-dom';

import styles from './MyComponent.module.scss';

const MyComp: React.FC<{}> = function(prop) {
  return <React.Fragment>
    <div className={styles.assets}></div>
    <div className={styles.red}>You component goes here</div>
    </React.Fragment>;
};

export default MyComp;

export function renderDom(dom: HTMLElement) {
  ReactDOM.render(<MyComp/>, dom);

  return {
    unmount() {
      ReactDOM.unmountComponentAtNode(dom);
    }
  };
}
