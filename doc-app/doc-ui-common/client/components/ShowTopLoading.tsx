import React from 'react';

// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
// import styles from './ShowTopLoading.module.scss';
import {useAppLayout} from './appLayout.control';


export type ShowTopLoadingProps = React.PropsWithChildren<{
  // Define your component properties
}>;

const ShowTopLoading: React.FC<ShowTopLoadingProps> = function() {
  const slice = useAppLayout();
  React.useEffect(() => {
    if (slice)
      slice.i.dp.setLoadingVisible(true);

    return () => {
      if (slice)
        slice.i.dp.setLoadingVisible(false);
    };
  }, [slice]);
  return <></>;
};


export {ShowTopLoading};



