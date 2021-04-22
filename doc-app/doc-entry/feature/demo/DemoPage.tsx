import React from 'react';
import * as rr from 'react-router-dom';
import classnames from 'classnames/bind';
import styles from './DemoPage.module.scss';
// import {useParams} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {Ripple} from '@wfh/doc-ui-common/client/material/Ripple';
import {useAppLayout} from '@wfh/doc-ui-common/client/components/appLayout.state';
import {Button} from '@wfh/doc-ui-common/client/material/Button';
import * as op from 'rxjs/operators';
const cx = classnames.bind(styles);
const cls = cx('DemoPage');
const rippleContentCls = cx('rippleContent');

export type DemoPageProps = React.PropsWithChildren<{
  // Define your component properties
}>;

const DemoPage: React.FC<DemoPageProps> = function(props) {
  const layout = useAppLayout();
  const [layoutState, setLayoutState] = React.useState(layout?.state$.getValue());

  const turnOnLoading = React.useCallback(() => {
    layout?.actionDispatcher.setLoadingVisible(true);
  }, []);

  const turnOffLoading = React.useCallback(() => {
    layout?.actionDispatcher.setLoadingVisible(false);
  }, []);
  React.useEffect(() => {
    let destroy: undefined  | (() => void);
    if (layout) {
      setTimeout(() => layout.actionDispatcher.updateBarTitle('Demo'), 0);
      const sub = layout.state$.pipe(
        // op.distinctUntilChanged(),
        op.tap(s => setLayoutState(s))
      ).subscribe();
      destroy = () => sub.unsubscribe();
    }
    if (destroy)
      return destroy;
  }, [layout]);

  return <div className={cls} >
    <div className={classnames(rippleContentCls, 'mdc-layout-grid__cell--span-4')}  tabIndex={1}>
      <Ripple className={styles.ripple}>"Dark" Ripple in light background</Ripple>
    </div>

    <div className={cx('rippleContent', 'dark')} tabIndex={1}>
      <Ripple className={styles.ripple} color='light'>"Light" Ripple in dark background</Ripple>
    </div>
    <rr.NavLink to='/doc/intro'><Button>Go Document</Button></rr.NavLink>

    <rr.NavLink to='/test'><Button>Go Test</Button></rr.NavLink>

    <section className={styles.demoButtons}>
      <Button>Text button</Button>
      <Button type='raised'>Primary button</Button>
      <Button type='outlined'>OutLined button</Button>
      <Button type='outlined'>中文</Button>
      <a href='https://material-components.github.io/material-components-web-catalog/#/'>
        <Button>Official Material web components demo</Button>
      </a>
    </section>

    <section>
      Number of on-going "loading" request: {layoutState ? layoutState.showTopLoadingReqsCount : ''}
      <br/>
      <Button type='outlined' onClick={turnOnLoading}>Try turning on top loading indicator</Button>
      <br/>
      <Button type='outlined' onClick={turnOffLoading}>Try turning off top loading indicator</Button>
    </section>
    <section className={styles.heightPlaceHolder}>
    </section>
  </div>;
};


export {DemoPage};



