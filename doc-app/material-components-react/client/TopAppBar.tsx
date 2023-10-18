import React from 'react';
import classnames from 'classnames/bind';
import cls from 'classnames';
import {MDCTopAppBar} from '@material/top-app-bar';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import styles from './TopAppBar.scss';
export {MDCTopAppBar};
const cx = classnames.bind(styles);
// const cls = cx('mdc-top-app-bar');

// tslint:disable-next-line: no-empty-interface
// export interface TopAppBarProps {
//   getMdcRef?: (ref: MDCTopAppBar) => void;
// }

export type TopAppBarProps = React.PropsWithChildren<{
  classNameHeader?: string;
  classNameMain?: string;
  renderMain?: (mainAreaClassName: string) => React.ReactNode;
  title: React.ReactNode ;
  type?: 'fixed' | 'prominent' | 'dense' | 'short' | 'standard';
  left?: React.ReactNode;
  right?: React.ReactNode;
  onDrawerMenuClick?: () => void;
  getMdcRef?: (ref: MDCTopAppBar) => void;
  // renderBelowHeader?: (topBarType: TopAppBarProps['type']) => React.ReactNode;
  belowHeader?: React.ReactNode;
  _onHeaderRef?(headerRef: HTMLHeadElement | null): void;
}>;

const typeStyleMap: {[key in NonNullable<TopAppBarProps['type']>]: {header: string; main: string}} = {
  standard: {header: '', main: 'mdc-top-app-bar--fixed-adjust'},
  fixed: {header: 'mdc-top-app-bar--fixed', main: 'mdc-top-app-bar--fixed-adjust'},
  prominent: {header: 'mdc-top-app-bar--prominent', main: 'mdc-top-app-bar--prominent-fixed-adjust'},
  dense: {header: 'mdc-top-app-bar--dense', main: 'mdc-top-app-bar--dense-fixed-adjust'},
  short: {header: 'mdc-top-app-bar--short', main: 'mdc-top-app-bar--short-fixed-adjust'}
};

const TopAppBar: React.ForwardRefRenderFunction<Promise<MDCTopAppBar>, TopAppBarProps> = function(props, ref) {
  const sub$ = React.useMemo(() => new rx.BehaviorSubject<MDCTopAppBar | null>(null), []);

  const onDivReady = React.useCallback((div: HTMLHeadElement | null) => {
    if (props._onHeaderRef)
      props._onHeaderRef(div);
    if (div == null) {
      if (sub$.getValue()) {
        sub$.getValue()!.destroy();
        sub$.next(null);
      }
      return;
    }
    const mdc = new MDCTopAppBar(div);
    sub$.next(mdc);
    // sub$.complete();
    if (props.getMdcRef) {
      props.getMdcRef(mdc);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useImperativeHandle(ref,
    () => sub$.pipe(op.filter(item => item != null), op.take(1)).toPromise() as Promise<MDCTopAppBar>,
    [sub$]);

  React.useEffect(() => {
    return () => {
      if (sub$.getValue()) {
        sub$.getValue()!.destroy();
      }
    };
  }, [sub$]);

  const headerStyle = props.type ? typeStyleMap[props.type].header : typeStyleMap.standard.header;
  const mainStyle = props.type ? typeStyleMap[props.type].main : typeStyleMap.standard.main;

  return (<>
    <header className={cls(props.classNameHeader || '', cx('mdc-top-app-bar', headerStyle))} ref={onDivReady}>
      <div className="mdc-top-app-bar__row">
        <section className="mdc-top-app-bar__section mdc-top-app-bar__section--align-start">
          {props.left || null}
          {/* <button className='material-icons mdc-top-app-bar__navigation-icon mdc-icon-button' aria-label='Open navigation menu' onClick={props.onDrawerMenuClick}>menu</button> */}
          <span className="mdc-top-app-bar__title">
            {props.title}
            {/* <SwitchAnim type='opacity' contentHash={props.title}>{props.title}</SwitchAnim>
             */}
          </span>
        </section>
        <section className="mdc-top-app-bar__section mdc-top-app-bar__section--align-end" role="toolbar">
          {props.right || null}
          {/* <button className='material-icons mdc-top-app-bar__action-item mdc-icon-button' aria-label='Share'>share</button>
          <button className='material-icons mdc-top-app-bar__action-item mdc-icon-button' aria-label='Delete'>delete</button>
          <button className='material-icons mdc-top-app-bar__action-item mdc-icon-button' aria-label='Open menu'>more_vert</button> */}
        </section>
      </div>
      {props.belowHeader ? props.belowHeader : null}
    </header>
    {
      props.renderMain
        ? props.renderMain(cls(props.classNameMain || '', cx(mainStyle))) :
        <main className={cls(props.classNameMain || '', cx(mainStyle))}>{props.children}</main>
    }
  </>
  );
};
const Forwarded = React.forwardRef(TopAppBar);

export {Forwarded as TopAppBar};

