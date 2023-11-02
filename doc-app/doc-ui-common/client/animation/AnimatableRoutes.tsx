import React from 'react';
import clsDdp from 'classnames/dedupe';
import {useAppLayout} from '../components/appLayout.control';
import {SwitchAnim} from './SwitchAnim';
import {RouteObject, RouterContext, useRouterProvider} from './AnimatableRoutes.hooks';
import styles from './AnimatableRoutes.module.scss';

export type AnimatableRoutesProps = React.PropsWithChildren<{
  parentDom?: {className: string} | null;
  className?: string;
  /** imutable */
  routes: RouteObject[];
  basename?: string;
}>;

const AnimatableRoutes: React.FC<AnimatableRoutesProps> = function(prop) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const layout = useAppLayout();
  const router = useRouterProvider(prop.basename ?? '', prop.routes);

  // When route is switched, scroll to top
  React.useEffect(() => {
    if (router.matchedRoute && layout) {
      layout.i.dp.scrollTo(0, 0);
    }
  }, [layout, router.matchedRoute]);

  React.useEffect(() => {
    if (prop.parentDom) {
      prop.parentDom.className = clsDdp(prop.parentDom.className, styles.scope, prop.className);
    }
  }, [prop.className, prop.parentDom]);

  const content = <RouterContext.Provider value={router}>
    { router.matchedRoute != null ?
      <SwitchAnim debug={false} size="full" parentDom={prop.parentDom == null ? rootRef.current : prop.parentDom}
        contentHash={router.matchedRoute.path}>{router.matchedRoute.element}</SwitchAnim> :
      prop.children ? prop.children : <></>
    }
  </RouterContext.Provider>;

  return prop.parentDom
    ? content
    : (
      <div ref={rootRef} className={clsDdp(styles.scope, prop.className)}>
        {content}
      </div>
    );
};

export {AnimatableRoutes};

