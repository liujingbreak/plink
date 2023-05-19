import React from 'react';
import cls from 'classnames/bind';
// import {useParams} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {Ripple} from '@wfh/material-components-react/client/Ripple';
import {useAppLayout} from '@wfh/doc-ui-common/client/components/appLayout.state';
import {Button} from '@wfh/material-components-react/client/Button';
import {IconButton} from '@wfh/material-components-react/client/IconButton';
import * as op from 'rxjs/operators';
import {useRtk} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {Palette} from '../../components/color/Palette';
// import {useRouter} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes.hooks';
import styles from './DemoPage.module.scss';
import {sliceOptionFactory, epicFactory, DemoPageObservableProps as Props} from './demoPageSlice';
// const cx = cls.bind(styles);
// const cls = cx('DemoPage');
// const rippleContentCls = cx('rippleContent');
type DemoPageProps = Props;

const DemoPage: React.FC<DemoPageProps> = function(props) {
  const layout = useAppLayout();
  const [layoutState, setLayoutState] = React.useState(layout?.state$.getValue());

  useRtk(sliceOptionFactory, props, epicFactory);

  const turnOnLoading = React.useCallback(() => {
    layout?.actionDispatcher.setLoadingVisible(true);
  }, [ layout?.actionDispatcher]);

  const turnOffLoading = React.useCallback(() => {
    layout?.actionDispatcher.setLoadingVisible(false);
  }, [ layout?.actionDispatcher]);
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

  return <div className={(cls(styles.DemoPage, 'mdc-layout-grid'))} >
    <section>
      <header>Ripple effect</header>
      <div className="mdc-layout-grid__inner">
        <Ripple className={'mdc-layout-grid__cell--span-4 ' + styles.ripple}>"Dark" Ripple in light background</Ripple>
        <Ripple className={cls(styles.ripple, styles.dark, 'mdc-layout-grid__cell--span-4')}
          color="light">"Light" Ripple in dark background</Ripple>
      </div>
    </section>
    <section>
      <header>Animation effect of switching routes</header>
      <rr.NavLink to="/doc/intro"><Button>Go Document</Button></rr.NavLink>
      <rr.NavLink to="/test"><Button>Go Test</Button></rr.NavLink>
      <rr.NavLink to="/demo/surface"><Button>Surface background effect</Button></rr.NavLink>
      <rr.NavLink to="/demo/background"><Button>Background Canvas</Button></rr.NavLink>
      <rr.NavLink to="/demo/background-blur"><Button>Blur background</Button></rr.NavLink>
    </section>
    <section className={styles.buttonSection}>
      <header>Buttons</header>
      <div>
        <Button>Text button</Button>
        <Button type="raised" materialIcon="thumb_up">Raised button with icon</Button>
        <Button type="outlined" materialIcon="thumb_up">OutLined button</Button>
        <Button type="outlined">中文</Button>
        <IconButton materialIcon="face"/>
        <IconButton materialIcon="self_improvement"/>
        <IconButton disabled={true} materialIcon="self_improvement"/>
        <a href="https://material-components.github.io/material-components-web-catalog/#/">
          <Button>Official Material web components demo</Button>
        </a>
        <a href="https://fonts.google.com/icons">
          <Button>Material Icons https://fonts.google.com/icons</Button>
        </a>
      </div>
    </section>

    <section>
      <header>Top loading bar</header>
      Number of on-going "loading" request: {layoutState ? layoutState.showTopLoadingReqsCount : ''}
      <br/>
      <Button type="outlined" onClick={turnOnLoading}>Try turning on top loading indicator</Button>
      <Button type="outlined" onClick={turnOffLoading}>Try turning off top loading indicator</Button>
    </section>

    <section>
      <header>Colors</header>
      <Palette colorMain="#FCFAE9" colorMix="#1916a5"/>
    </section>

    <section className={styles.heightPlaceHolder}>
    </section>
  </div>;
};


export {DemoPage};



