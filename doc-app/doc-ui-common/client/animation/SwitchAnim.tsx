import React from 'react';

import classnames from 'classnames/bind';
import styles from './SwitchAnim.module.scss';
// import {useLightReduxObs} from '../lightReduxHooks';
import {useTinyReduxTookit, ofAction} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';

const cx = classnames.bind(styles);
const cls = cx('SwitchAnim');

export type SwitchAnimProps = React.PropsWithChildren<{
  /** default false, show animation effect for first time content rendering */
  animFirstContent?: boolean;
  contentHash: string | number | null | undefined;
}>;

// const contentClassNames = [styles.leaving, styles.entering];
let CONTENT_KEY_SEED = 0;

interface SwitchState {
  error?: Error;
  // entering: boolean;
  // leaving: boolean;
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


const SwitchAnim: React.FC<SwitchAnimProps> = function(props) {

  const {state, actionDispatcher, useEpic} = useTinyReduxTookit(
    {
      initialState: {
        contentKeys: [], contentByKey: {}
      } as SwitchState,
      reducers: {
        contentRerendered(s, payload: React.ReactNode) {
          if (s.keyOfEntering) {
            s.contentByKey[s.keyOfEntering].renderable = payload;
          } else {
            s.contentByKey[s.contentKeys[s.contentKeys.length - 1]].renderable = payload;
          }
        },
        switchContent(s, payload: React.ReactNode) {
        },
        enterStart(s, payload: {node: React.ReactNode, anim: boolean}) {
          // s.entering = true;
          const key = '' + CONTENT_KEY_SEED++;
          s.keyOfEntering = key;
          s.contentByKey[key] = {
            renderable: payload.node, key, clsName: payload.anim ? cx('enterStart') : '',
            onContainerReady(div) {
              if (div)
                s.contentByKey[key].dom = div;
            }
          };
          s.contentKeys.push(key);
          return {...s};
        },
        leaving(s) {
          if (s.contentKeys.length > 1) {
            s.keyOfLeaving = s.contentKeys[0];
            const content = s.contentByKey[s.keyOfLeaving];
            content.clsName = styles.leaving;
            content.dom!.style.width = content.dom?.clientWidth + 'px';
            content.dom!.style.height = content.dom?.clientHeight + 'px';
            return {...s};
          }
          return s;
        },
        entering(s) {
          const enteringContent = s.contentByKey[s.keyOfEntering!];
          enteringContent.clsName = cx('enterStart', 'entering');
          return {...s};
        },
        removeOldContent(s) {
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
        switchContentDone(s) {
          // s.entering = false;
          const enteringContent = s.contentByKey[s.keyOfEntering!];
          enteringContent.clsName = '';
          s.keyOfEntering = undefined;
          return {...s};
        }
      },
      logPrefix: 'SwitchAnim'
    });
    useEpic((action$, state$) => {
      return rx.merge(
        action$.pipe(ofAction(actionDispatcher.switchContent),
          // switch to replace current one, if user frequently trigger animation
          op.switchMap(({payload}) => {
            if (state$.getValue().keyOfEntering != null) {
              // If there is an entering animation ongoing, wait for "switchContentDone" then do "enterStart"
              return action$.pipe(ofAction(actionDispatcher.switchContentDone),
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
            actionDispatcher.enterStart({node, anim: props.animFirstContent || hasExisting});
          })
        ),
        action$.pipe(ofAction(actionDispatcher.enterStart),
          op.concatMap(async ({type, payload}) => {
            const hasExisting = state$.getValue().contentKeys.length > 0;
            if (hasExisting) {
              actionDispatcher.leaving();
              setTimeout(() => {
                actionDispatcher.removeOldContent();
              }, 350);
            }
            if (props.animFirstContent || hasExisting) {
              await new Promise(resolve => setTimeout(resolve, 100));
              actionDispatcher.entering();
              await new Promise(resolve => setTimeout(resolve, 330));
              actionDispatcher.switchContentDone();
            }
          })
        )
      ).pipe(op.ignoreElements());
    });

  React.useEffect(() => {
    if (props.children) {
      actionDispatcher.switchContent(props.children);
    }
  }, [props.contentHash]);

  React.useEffect(() => {
    if (props.children) {
      actionDispatcher.contentRerendered(props.children);
    }
  }, [props.children]);

  // Your Component rendering goes here
  return <div className={cls}>
    { state.contentKeys.map((key, idx) => {
      const item = state.contentByKey[key];
      return <div key={key} className={item.clsName} ref={item.onContainerReady}>{item.renderable}</div>;
    }) }
  </div>;
};

export {SwitchAnim};



