import React from 'react';

import classnames from 'classnames/bind';
import clsddp from 'classnames/dedupe';
import cls from 'classnames';
// import {useLightReduxObs} from '../lightReduxHooks';
import {useTinyReduxTookit, EpicFactory, ofPayloadAction} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import styles from './SwitchAnim.module.scss';
// import get from 'lodash/get';
const cx = classnames.bind(styles);

const TRANSION_DURATION = 400;
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

// const contentClassNames = [styles.leaving, styles.entering];
let CONTENT_KEY_SEED = 0;

interface SwitchState extends BaseOptions {
  error?: Error;
  contentKeys: string[];
  contentByKey: {
    [key: string]: {
      clsName: string;
      renderable: React.ReactNode;
      key: string;
      dom?: HTMLDivElement;
      onContainerReady(div: HTMLDivElement | null): void;
    };
  };
  keyOfEntering?: string;
  keyOfLeaving?: string;
}

const reducers = {
  setBaseOptions(s: SwitchState, payload: BaseOptions) {
    Object.assign(s, payload);
  },
  contentRerendered(s: SwitchState, payload: React.ReactNode) {
    if (s.keyOfEntering && s.contentByKey[s.keyOfEntering]) {
      s.contentByKey[s.keyOfEntering] = {
        ...s.contentByKey[s.keyOfEntering],
        renderable: payload
      };
    } else if (s.contentKeys.length > 0) {
      const lastKey = s.contentKeys[s.contentKeys.length - 1];
      s.contentByKey[lastKey] = {
        ...s.contentByKey[lastKey],
        renderable: payload
      };
    }
    return {...s};
  },
  switchContent(s: SwitchState, payload: React.ReactNode) {
    // console.log('switch content:', (payload as any)?._source?.fileName);
  },
  enterStart(s: SwitchState, payload: {node: React.ReactNode; anim: boolean}) {
    // s.entering = true;
    const key = '' + CONTENT_KEY_SEED++;
    s.keyOfEntering = key;
    s.contentByKey[key] = {
      renderable: payload.node,
      key,
      clsName: payload.anim ? cx('enterStart') : '',
      onContainerReady(div) {
        if (div)
          s.contentByKey[key] = {
            ...s.contentByKey[key],
            dom: div
          };
      }
    };
    Object.freeze(s.contentByKey[key]);
    s.contentKeys.push(key);
  },
  leaving(s: SwitchState) {
    if (s.contentKeys.length > 1) {
      s.keyOfLeaving = s.contentKeys[0];
      const content = s.contentByKey[s.keyOfLeaving];
      content.clsName = styles.leaving;
      if (content.dom) {
        const style = content.dom.style;
        style.width = content.dom.clientWidth + 'px';
        style.height = content.dom.clientHeight + 'px';
        style.top = '0px';
        style.left = '0px';
      }
    }
    return s;
  },
  entering(s: SwitchState) {
    const enteringContent = s.contentByKey[s.keyOfEntering!];
    enteringContent.clsName = cx('enterStart', 'entering');
    return {...s};
  },
  removeOldContent(s: SwitchState) {
    if (s.keyOfLeaving) {
      const key = s.keyOfLeaving;
      delete s.contentByKey[key];
      const idx = s.contentKeys.indexOf(key);
      s.contentKeys.splice(idx, 1);
      // s.leaving = false;
      s.keyOfLeaving = undefined;
    }
    return {...s};
  },
  switchContentDone(s: SwitchState) {
    // s.entering = false;
    const enteringContent = s.contentByKey[s.keyOfEntering!];
    enteringContent.clsName = '';
    s.keyOfEntering = undefined;
    return {...s};
  }
};

const epicFactory: EpicFactory<SwitchState, typeof reducers> = function(slice, ofType) {
  return (action$, state$) => {
    return rx.merge(
      action$.pipe(ofType('switchContent'),
        // switch to replace current one, if user frequently trigger animation
        op.switchMap(({payload}) => {
          if (state$.getValue().keyOfEntering != null) {
            // If there is an entering animation ongoing, wait for "switchContentDone" then do "enterStart"
            return action$.pipe(ofType('switchContentDone'),
              op.take(1),
              op.mapTo(payload)
            );
          } else {
            // Do "enterStart"
            return rx.of(payload);
          }
        }),
        // "enterStart" must be seperate to another RX operator, so that can be cancelled
        op.tap((node) => {
          const hasExisting = state$.getValue().contentKeys.length > 0;
          slice.actionDispatcher.enterStart({node, anim: state$.getValue().animFirstContent || hasExisting});
        }),
        op.ignoreElements()
      ),
      action$.pipe(ofPayloadAction(slice.actions.enterStart),
        op.concatMap(async ({type, payload}) => {
          const hasExisting = state$.getValue().contentKeys.length > 0;
          if (hasExisting) {
            slice.actionDispatcher.leaving();
            setTimeout(() => {
              slice.actionDispatcher.removeOldContent();
            }, TRANSION_DURATION);
          }
          if (state$.getValue().animFirstContent || hasExisting) {
            const type = state$.getValue().type;
            await new Promise(resolve => setTimeout(resolve, type === 'translateY' || type == null ? 200 : 20));
            slice.actionDispatcher.entering();
            await new Promise(resolve => setTimeout(resolve, TRANSION_DURATION));
            slice.actionDispatcher.switchContentDone();
          }
        }),
        op.ignoreElements()
      )
    );
  };
};


const SwitchAnim: React.FC<SwitchAnimProps> = function(props) {
  const [state, slice] = useTinyReduxTookit(() => {
    const initialState: SwitchState = {size: 'fit', contentKeys: [], contentByKey: {}};
    return {
      name: 'SwitchAnim',
      initialState,
      reducers,
      debug: !!props.debug // process.env.NODE_ENV !== 'production',
    };
  }, epicFactory);


  React.useEffect(() => {
    if (props.children && slice) {
      slice.actionDispatcher.switchContent(props.children);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.contentHash, slice]);

  React.useEffect(() => {
    if (props.children && slice) {
      slice.actionDispatcher.contentRerendered(props.children);
    }
  }, [props.children, slice]);

  React.useEffect(() => {
    if (slice)
      slice.actionDispatcher.setBaseOptions(props);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.animFirstContent, props.size, slice, props.type, props.className]);

  React.useEffect(() => {
    if (props.parentDom) {
      props.parentDom.className = clsddp(props.parentDom.className, styles.scope, props.size == null ? 'fit' : styles[props.size]);
    }
  }, [props.parentDom, props.size]);

  const content = state.contentKeys.map((key, idx) => {
    const item = state.contentByKey[key];
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



