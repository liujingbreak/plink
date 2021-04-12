import React from 'react';
import * as rr from 'react-router-dom';
import classnames from 'classnames/bind';
import styles from './DemoPage.module.scss';
// import {useParams} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {Ripple} from '@wfh/doc-ui-common/client/material/Ripple';
import {useAppLayout} from '@wfh/doc-ui-common/client/components/appLayout.state';
import {Button} from '@wfh/doc-ui-common/client/material/Button';

const cx = classnames.bind(styles);
const cls = cx('DemoPage');
const rippleContentCls = cx('rippleContent');

export type DemoPageProps = React.PropsWithChildren<{
  // Define your component properties
}>;

const DemoPage: React.FC<DemoPageProps> = function(props) {
  const layout = useAppLayout();
  const doSwitchLoading = React.useCallback(() => {
    layout?.actionDispatcher.setLoadingVisible(!layout.state$.getValue().showTopLoading);
  }, []);
  React.useEffect(() => {
    if (layout) {
      setTimeout(() => layout.actionDispatcher.updateBarTitle('Demo'), 0);
    }
  }, [layout]);

  return <div className={cls} >
    <div className={rippleContentCls}  tabIndex={1}>
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
      <Button onClick={doSwitchLoading}>Switch off top loading indicator</Button>
    </section>
  </div>;
};


export {DemoPage};



