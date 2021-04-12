import React from 'react';
/*<% if (isEntry) { %>*/
import ReactDOM from 'react-dom';
/*<%
} %>*/
// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import styles from './$__MyComponent__$.module.scss';
/*<% if (isConnected) { %>*/
import {connect/*<% if (isEntry) { %>*/, Provider as ReduxProvider /*<% } %>*/} from 'react-redux';
import {InjectedCompPropsType /*<% if (isEntry) { %>*/, useStoreOfStateFactory /*<% } %>*/} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
/*<% if (isEntry) { %>*/import {stateFactory} from '@wfh/redux-toolkit-observable/es/state-factory-browser';/*<% } %>*/
// import {createSelector} from '@reduxjs/toolkit';
import {getState} from '$__slice_file__$'; // change to you Redux slice path
/*<% } 
if (withImage) {
%>*/import imgSrc from './demo-assets.jpg';/*<%
} %>*/


export type $__MyComponent__$Props = React.PropsWithChildren<{
  // Define your component properties
}>;
/*<% if (isConnected) { %>*/
/**
 * https://react-redux.js.org/api/connect#factory-functions
 */
function mapToPropsFactory(_rootState: unknown, ownProps: $__MyComponent__$Props) {
  // This is where you create "selectors" (reselector), if you need it:
  // https://redux-toolkit.js.org/api/createSelector
  // import {createSelector} from '@reduxjs/toolkit';
  return function(_rootState: unknown, ownProps: $__MyComponent__$Props) {
    return {
      // map properties from a Redux slice state to component properties
      foobar: getState().foobar,
      html: getState()._computed.reactHtml
    };
  };
}
const ConnectHOC = connect(mapToPropsFactory, {}, null, {forwardRef: true});
/*<%
}
const propType = isConnected ?
  'InjectedCompPropsType<typeof ConnectHOC>' :
    MyComponent + 'Props'
const innerHtml = isConnected ? '' : 'Your component goes here';
%>*/
const $__MyComponent__$: React.FC<$__propType__$> = function(props) {
  // Your Component rendering goes here
  /*<% if (withImage) { 
  %>*/return <div className={styles.$__MyComponent__$}>
    <img src={imgSrc}></img>
    <h1 /*<% if (isConnected) { %>*/dangerouslySetInnerHTML={props.html}/*<% } %>*/>$__innerHtml__$</h1>
  </div>;/*<%
   } else {%>*/return <div className={styles.$__MyComponent__$} /*<% if (isConnected) { %>*/dangerouslySetInnerHTML={props.html}/*<% }
     %>*/>$__innerHtml__$</div>;/*<% }
   %>*/
};

/*<% if (isConnected) { %>*/
const Connected$__MyComponent__$ = ConnectHOC($__MyComponent__$);
export {Connected$__MyComponent__$ as $__MyComponent__$};
/*<% } else { %>*/
export {$__MyComponent__$};
/*<% } %>*/

/*<% if (isEntry) {
  if (isConnected) {
%>*/stateFactory.configureStore();
export const $__MyComponent__$WithStore: React.FC<React.PropsWithChildren<{}>> = function() {
  const reduxStore = useStoreOfStateFactory(stateFactory);
  if (reduxStore == null)
    return <></>;
  return (
    <ReduxProvider store={reduxStore}>
      <Connected$__MyComponent__$/>
    </ReduxProvider>
  );
};/*<% } %>*/
export function renderDom(dom: HTMLElement) {
  ReactDOM.render(/*<% if (isConnected) {%>*/<$__MyComponent__$WithStore/>/*<% } else {%>*/<$__MyComponent__$/>/*<%}%>*/, dom);

  return {
    unmount() {
      ReactDOM.unmountComponentAtNode(dom);
    }
  };
}
/*<% } %>*/
