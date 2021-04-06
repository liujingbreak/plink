import React from 'react';
// import classnames from 'classnames/bind';
import './TopAppBar.scss';
import {MDCTopAppBar} from '@material/top-app-bar';
import * as rx from 'rxjs';
// const cx = classnames.bind(styles);
// const cls = cx('mdc-top-app-bar');

// tslint:disable-next-line: no-empty-interface
// export interface TopAppBarProps {
//   getMdcRef?: (ref: MDCTopAppBar) => void;
// }

export type TopAppBarProps = React.PropsWithChildren<{
  title: React.ReactNode ;
  type?: 'fixed' | 'prominent' | 'dense' | 'short';
  onDrawerMenuClick?: () => void;
  getMdcRef?: (ref: MDCTopAppBar) => void;

}>;

const typeStyleMap: {[key in NonNullable<TopAppBarProps['type']>]: {header: string; main: string}} = {
  fixed: {header: 'mdc-top-app-bar--fixed', main: 'mdc-top-app-bar--fixed-adjust'},
  prominent: {header: 'mdc-top-app-bar--prominent', main: 'mdc-top-app-bar--prominent-fixed-adjust'},
  dense: {header: 'mdc-top-app-bar--dense', main: 'mdc-top-app-bar--dense-fixed-adjust'},
  short: {header: 'mdc-top-app-bar--short', main: 'mdc-top-app-bar--short-fixed-adjust'}
};

const TopAppBar: React.ForwardRefRenderFunction<Promise<MDCTopAppBar>, TopAppBarProps> = function(props, ref) {
  const sub$ = React.useMemo(() => new rx.ReplaySubject<MDCTopAppBar>(), []);

  const onDivReady = React.useCallback((div: HTMLDivElement | null) => {
    if (div == null) {
      return;
    }
    const mdc = new MDCTopAppBar(div);
    sub$.next(mdc);
    sub$.complete();
    if (props.getMdcRef) {
      props.getMdcRef(mdc);
    }
  }, []);

  React.useImperativeHandle(ref, () => sub$.toPromise(), [sub$]);

  React.useEffect(() => {
    return () => {
      sub$.subscribe({
        next(mdc) { mdc.destroy();}
      });
    };
  }, []);

  let headerStyle = props.type ? typeStyleMap[props.type].header : '';
  // let mainStyle = props.type ? typeStyleMap[props.type].main : '';

  return (<>
    <header className={'mdc-top-app-bar ' + headerStyle} ref={onDivReady}>
      <div className='mdc-top-app-bar__row'>
        <section className='mdc-top-app-bar__section mdc-top-app-bar__section--align-start'>
          {/* <button className='material-icons mdc-top-app-bar__navigation-icon mdc-icon-button' aria-label='Open navigation menu' onClick={props.onDrawerMenuClick}>menu</button> */}
          <span className='mdc-top-app-bar__title'>{props.title}</span>
        </section>
        <section className='mdc-top-app-bar__section mdc-top-app-bar__section--align-end' role='toolbar'>
          {/* <button className='material-icons mdc-top-app-bar__action-item mdc-icon-button' aria-label='Share'>share</button>
          <button className='material-icons mdc-top-app-bar__action-item mdc-icon-button' aria-label='Delete'>delete</button>
          <button className='material-icons mdc-top-app-bar__action-item mdc-icon-button' aria-label='Open menu'>more_vert</button> */}
        </section>
      </div>
    </header></>
  );
};
const Forwarded = React.forwardRef(TopAppBar);

export {Forwarded as TopAppBar};

