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
  logName?: string;
}

export type SwitchAnimProps<D = unknown> = BaseOptions & {
  parentDom?: {className: string} | null;
  /** changing this property will only rerender content, no switch animation will be triggered */
  templateData: D;
  /** changing this property will trigger switch animation */
  switchOnDistinct: any;
  templateRenderer?: (data: D) => React.ReactNode;
};

const SwitchAnim = React.memo<SwitchAnimProps<any>>(function(props) {
  const [data, setData] = React.useState<SwitchAnimOutputData>();
  const composite = React.useMemo(() => {
    const composite = createControl(setData, props.debug);
    return composite;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {i} = composite;
  React.useEffect(() => {
    i.dp.setSwitchOnDistinct(props.switchOnDistinct);
  }, [i.dp, props.switchOnDistinct]);
  React.useEffect(() => {
    if (props.templateRenderer)
      i.dp.setTemplateRenderer(props.templateRenderer);
  }, [i.dp, props.templateRenderer]);

  React.useEffect(() => {
    i.dp.setTemplateData(props.templateData);
  }, [i.dp, props.templateData]);

  React.useEffect(() => {
    if (props.logName)
      composite.setName(props.logName);
  }, [composite, props.logName]);

  React.useEffect(() => {
    i.dp.setBaseOptions(props);
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
    return <div key={key} className={cls(props.innerClassName ?? '', styles.movingBox, item.clsName)}
      ref={item.onContainerReady}>{data?.setTemplateRenderer[0]!(item.templateData)}</div>;
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
});

export {SwitchAnim};

