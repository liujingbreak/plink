import React from 'react';
// import classnames from 'classnames/bind';
import styles from './AnimatableRoutes.module.scss';
import {Switch, Route, NavLink, useLocation} from 'react-router-dom';

export type AnimatableRoutesProps = React.PropsWithChildren<{
  /** imutable */
  routes: {path: string, component: React.ReactNode}[];
}>;


const AnimatableRoutes: React.FC<AnimatableRoutesProps> = function(prop) {
  const location = useLocation();

  React.useEffect(() => {
    console.log('init');
  }, []);

  const routes = React.useMemo(() => prop.routes.map(({path, component}) => {
    console.log('render', location);

    const DynamicComp: React.FC = function(prop) {
      React.useEffect(() => {
        console.log('create route comp ', path);
        return () => {
          // console.log('destroy', path);
        };
      }, []);
      return null;
    };
    return <Route key={path} path={path}><DynamicComp/></Route>;
  }), [prop.routes]);

  return (<>
    <Switch>
      {routes}
    </Switch>
    <div className={styles.scope}>
      <NavLink to={'/test'}> GO test </NavLink>
      <NavLink to={'/doc/intro'}> GO doc </NavLink>
      <NavLink to={'/doc/sample'}> GO doc </NavLink>
    </div>
    </>
  );
};

export {AnimatableRoutes};
