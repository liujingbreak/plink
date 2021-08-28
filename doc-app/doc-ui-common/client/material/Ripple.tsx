import React from 'react';
import cls from 'classnames';
import {useTinyRtk} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {sliceOptionFactory, epicFactory, RippleObservableProps} from './ripple.state';

import './Ripple.scss';
import styles from './Ripple.module.scss';
// import '@material/ripple/styles.scss';
import {MDCRipple} from '@material/ripple/index';

// import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

// const cx = classnames.bind(styles);

export {MDCRipple};

export type RippleProps = RippleObservableProps;

const Ripple: React.ForwardRefRenderFunction<Promise<MDCRipple>, RippleProps> = function(props, ref) {

  const [state, slice] = useTinyRtk(sliceOptionFactory, props, epicFactory);
  const store = slice.getStore();

  React.useImperativeHandle(ref, () => store.pipe(
    op.map(s => s.mdcRef), op.filter(value => value != null),
    op.distinctUntilChanged(),
    op.take(1)
  ).toPromise() as Promise<MDCRipple>, [store]);

  React.useEffect(() => {
    return () => {slice.actionDispatcher.destory(); };
  }, [slice.actionDispatcher]);
  // const Content = props.renderTo ? props.renderTo() : null;

  return state.mode === 'wrapper' ?
      <div className={cls(props.className ? props.className : '', styles.wrapper)}>
        {props.children}
        <div tabIndex={0} ref={slice.actionDispatcher.onDomRef}></div>
      </div> :
      <div tabIndex={0} ref={slice.actionDispatcher.onDomRef}></div>;
};



const Forwarded = React.forwardRef(Ripple);

export {Forwarded as Ripple};

