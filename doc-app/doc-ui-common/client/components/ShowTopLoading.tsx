import React from 'react';

// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
// import styles from './ShowTopLoading.module.scss';
import {useAppLayout} from './appLayout.state';


export type ShowTopLoadingProps = React.PropsWithChildren<{
  // Define your component properties
}>;

const ShowTopLoading: React.FC<ShowTopLoadingProps> = function(props) {
  const slice = useAppLayout();
  React.useEffect(() => {
    if (slice)
      slice.actionDispatcher.setLoadingVisible(true);

    return () => {
      if (slice)
        slice.actionDispatcher.setLoadingVisible(false);
    };
  }, [slice]);
  return <></>;
};


export {ShowTopLoading};



