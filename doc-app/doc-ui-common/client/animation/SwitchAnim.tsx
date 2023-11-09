import React from 'react';

import classnames from 'classnames/bind';
import clsddp from 'classnames/dedupe';
import cls from 'classnames';
import styles from './SwitchAnim.module.scss';
import {SwitchAnimOutputData, createControl} from './SwitchAnim.control';
// import get from 'lodash/get';
const cx = classnames.bind(styles);

interface BaseOptions {
  /** 'full' works like 'flex-grow: 1;', default: 'fit' */
  size?: 'full' | 'fit';
  /** default false, show animation effect for first time content rendering */
  animFirstContent?: boolean;
  type?: 'opacity' | 'translateY';
  className?: string;
  innerClassName?: string;
  debug?: boolean;
}

export type SwitchAnimProps = React.PropsWithChildren<BaseOptions & {
  parentDom?: {className: string} | null;
  contentHash: any;
}>;

const SwitchAnim: React.FC<SwitchAnimProps> = function(props) {
  const [data, setData] = React.useState<SwitchAnimOutputData>();
  const composite = React.useMemo(() => {
    const composite = createControl(setData, props.debug);
    return composite;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  composite.i.dp.syncFromProps(props.contentHash, props.children);

  React.useEffect(() => {
    composite.i.dp.setBaseOptions(props);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.animFirstContent, props.size, props.type, props.className]);

  React.useEffect(() => {
    if (props.parentDom) {
      props.parentDom.className = clsddp(props.parentDom.className, styles.scope, props.size == null ? 'fit' : styles[props.size]);
    }
  }, [props.parentDom, props.size]);

  const [displayKeys, displayContentByKey] = data?.changeContent ?? [];

  const content = (displayKeys ?? []).map(key => {
    const item = displayContentByKey!.get(key)!;
    return <div key={key} className={cls(props.innerClassName ?? '', styles.movingBox, item.clsName)} ref={item.onContainerReady}>{item.renderable}</div>;
  });
  const rootCls = cls( props.className || '', cx(
    props.size == null ? 'fit' : props.size,
    'scope',
    props.type === 'opacity' ? 'animate-opacity' : ''
  ));
  // Your Component rendering goes here
  return props.parentDom != null ?
    <>{content}</> :
    <div className={rootCls}>{ content }</div>;
};

export {SwitchAnim};



