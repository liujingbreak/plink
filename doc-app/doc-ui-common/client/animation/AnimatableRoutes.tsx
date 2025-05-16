import React from 'react';
import clsDdp from 'classnames/dedupe';
// import {useAppLayout} from '../components/appLayout.control';
import {SwitchAnim} from './SwitchAnim';
import {RouteActions, RouteObject, RouterContext, useRouterProvider} from './AnimatableRoutes.hooks';
import styles from './AnimatableRoutes.module.scss';

export type AnimatableRoutesProps = React.PropsWithChildren<{
  // parentDom?: {className: string} | null;
  className?: string;
  /** imutable */
  routes: RouteObject[];
  basename?: string;
  noAnim?: boolean;
}>;

const AnimatableRoutes: React.FC<AnimatableRoutesProps> = function(prop) {
  // const layout = useAppLayout();
  const router = useRouterProvider(prop.basename ?? '', prop.routes);

  // When route is switched, scroll to top
  // React.useEffect(() => {
  //   if (router.matchedRoute?.location && layout) {
  //     // TODO: not working, since the content is usually rendered after that asynchronously
  //     layout.i.dp.scrollTo(0, 0);
  //   }
  // }, [layout, router.matchedRoute?.location]);

  const content = router.rootElement ?
    <RouterContext.Provider value={router}>
      { router.matchedRoute != null ?
        prop.noAnim === true ?
          router.matchedRoute.element :
          <SwitchAnim logName="RouterSwitchAnim" debug={true} size="full"
            type="opacity"
            parentDom={router.rootElement}
            switchOnDistinct={router.matchedRoute.element}
            templateData={router.matchedRoute.element}
          /> :
        prop.children ? prop.children : <></>
      }
    </RouterContext.Provider>
    : null;

  const setRootElement = React.useCallback((...args: Parameters<RouteActions['setRootElement']>) => {
    if (router.control)
      router.control.ft.setRootElement(...args).dp();
  }, [router.control]);

  return router.control ?
    <div ref={setRootElement} className={clsDdp(styles.scope, prop.className)}>
      {content}
    </div> :
    null;
};

export {AnimatableRoutes};

