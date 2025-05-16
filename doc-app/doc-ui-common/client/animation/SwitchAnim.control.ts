import React from 'react';
import {ReactorComposite2, SingleActionFactory, ActionTableDataType, actionRelatedToAction} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import cln from 'classnames';
import styles from './SwitchAnim.module.scss';
import {switchWaitingMap} from './rx-anim-utils';

const TRANSION_DURATION = 400;

type RenderItem = {
  clsName: string;
  templateData: any;
  key: string | number;
  dom?: HTMLDivElement;
  onContainerReady(div: HTMLDivElement | null): void;
};

export interface BaseOptions {
  /** 'full' works like 'flex-grow: 1;', default: 'fit' */
  size?: 'full' | 'fit';
  /** default false, show animation effect for first time content rendering */
  animFirstContent?: boolean;
  type?: 'opacity' | 'translateY';
  className?: string;
  innerClassName?: string;
  debug?: boolean;
  /** For debug animation layout issue */
  superSlow?: boolean;
  logName?: string;
}

export type SwitchActions = {
  // syncFromProps(hashKey: string, children: React.ReactNode): SingleActionFactory;
  setBaseOptions(opts: BaseOptions): SingleActionFactory;
  setTemplateData(data: any): SingleActionFactory;
  setSwitchOnDistinct(value: any): SingleActionFactory;
  setTemplateRenderer(r: (data: any) => React.ReactNode): SingleActionFactory;
};

type SwitchEvents = {
  entering(key: number | string | null): SingleActionFactory;
  leaving(key: number | string | null): SingleActionFactory;
  /** As React state */
  changeContent(contentKeys: (number | string)[], contentByKey: Map<string | number, RenderItem>): SingleActionFactory;
};

const inputTableFor = ['setTemplateRenderer', 'setTemplateData', 'setBaseOptions'] as const;
const outputTableFor = ['leaving', 'entering', 'changeContent'] as const;

export function createControl(setState: (s: SwitchAnimOutputData) => void, debug?: boolean) {
  const composite = new ReactorComposite2<SwitchActions, SwitchEvents, typeof inputTableFor, typeof outputTableFor>({
    name: 'switchAnim',
    debug,
    debugExcludeTypes: ['changeContent'],
    inputTableFor, outputTableFor
  });

  const {i, o, r, outputTable, inputTable} = composite;

  r('entering -> set className, changeContent & entering(null) -> changeContent', o.pt.entering.pipe(
    rx.filter(([, key]) => key != null),
    rx.withLatestFrom(outputTable.l.changeContent),
    rx.mergeMap(([[m, key], [, keys, contentByKey]]) => {
      const item = contentByKey.get(key!)!;
      item.clsName = cln(styles.enterStart, styles.entering);
      o.ft.changeContent(keys, contentByKey).dp(m);
      return o.pt.entering.pipe(
        rx.filter(([, key]) => key == null),
        actionRelatedToAction({i: m.r as number}),
        rx.take(1),
        rx.tap(() => {
          item.clsName = '';
          o.ft.changeContent(keys, contentByKey).dp(m);
        })
      );
    })
  ));

  r('setSwitchOnDistinct, setTemplateRenderer -> leaving, entering', i.pt.setSwitchOnDistinct.pipe(
    switchWaitingMap(([m], idx) => {
      return rx.combineLatest([
        outputTable.l.changeContent,
        inputTable.l.setBaseOptions,
        inputTable.l.setTemplateData
      ]).pipe(
        rx.take(1),
        rx.concatMap(([[, contentKeys, contentByKey], [, opts], [, data]]) => {
          const item: RenderItem = {
            key: idx,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            templateData: data,
            clsName: contentKeys.length > 0 || opts.animFirstContent ? styles.enterStart : '',
            onContainerReady(div) {
              if (div) {
                item.dom = div;
              }
            }
          };
          contentByKey.set(idx, item);
          contentKeys.push(idx);
          o.ft.changeContent(contentKeys, contentByKey).dp();
          if (contentKeys.length > 1) {
            // leaving animation
            return o.ft.leaving(contentKeys[0]).ddo(o.at.leaving, m).pipe(
              rx.take(1),
              rx.map(() => opts)
            );
          } else {
            return opts.animFirstContent ? rx.of(opts) : /* skip all animations */ rx.EMPTY;
          }
        }),
        // entering animation
        rx.switchMap(opts => {
          return rx.timer(opts.type === 'translateY' || opts.type == null ? 200 : 20).pipe(
            rx.tap(() => o.ft.entering(idx).dp(m)),
            rx.switchMap(() => rx.timer(opts.superSlow ? 20000 : TRANSION_DURATION)),
            rx.tap(() => {
              o.ft.entering(null).dp(m);
            })
          );
        })
      );
    })
  ));

  r('setTemplateData -> ', i.pt.setTemplateData.pipe(
    rx.switchMap(([m, data]) => outputTable.l.changeContent.pipe(
      rx.filter(([, keys]) => keys.length > 0),
      rx.take(1),
      rx.tap(([, keys, contents]) => {
        // only rerender last item, since the leading item will leave the scene
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        contents.get(keys[keys.length - 1])!.templateData = data;
      })
    ))
  ));

  r('leaving -> leaving(null), changeContent', o.pt.leaving.pipe(
    rx.filter(([, key]) => key != null),
    rx.withLatestFrom(outputTable.l.changeContent, inputTable.l.setBaseOptions),
    rx.concatMap(([[m, key], [, keys, contentByKey], [, opts]]) => {
      const content = contentByKey.get(key!);
      if (content == null)
        return rx.EMPTY;
      if (content.dom) {
        const style = content.dom.style;
        style.boxSizing = 'border-box';
        style.width = content.dom.parentElement!.clientWidth + 'px';
        style.height = content.dom.parentElement!.clientHeight + 'px';
        style.top = '0px';
        style.left = '0px';
      }
      return rx.timer(30).pipe(
        rx.tap(() => {
          content.clsName = styles.leaving;
          o.ft.changeContent(keys, contentByKey).dp(m);
        }),
        rx.switchMap(() => rx.timer(opts.superSlow ? 20000 : TRANSION_DURATION)),
        rx.tap(() => {
          contentByKey.delete(key!);
          o.ft.changeContent(keys.slice(1), contentByKey).dp(m);
          o.ft.leaving(null).dp(m);
        })
      );
    })
  ));

  r('Synce output table to UI state', rx.combineLatest([
    inputTable.dataChange$,
    outputTable.dataChange$
  ]).pipe(
    rx.tap(([data, data2]) => setState({...data, ...data2}))
  ));
  i.ft.setTemplateRenderer((data: React.ReactNode) => {
    return data;
  }).dp();
  o.ft.changeContent([], new Map()).dp();
  o.ft.entering(null).dp();
  o.ft.leaving(null).dp();

  return composite;
}

export type SwitchAnimOutputData = ActionTableDataType<SwitchEvents, typeof outputTableFor> & ActionTableDataType<SwitchActions, typeof inputTableFor>;
