import React from 'react';
import {ReactorComposite, ActionTableDataType, payloadRelatedToAction} from '@wfh/reactivizer';
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

export type SwitchActions = {
  // syncFromProps(hashKey: string, children: React.ReactNode): void;
  setBaseOptions(opts: BaseOptions): void;
  setTemplateData(data: any): void;
  setSwitchOnDistinct(value: any): void;
  setTemplateRenderer(r: (data: any) => React.ReactNode): void;
};

type SwitchEvents = {
  entering(key: number | string | null): void;
  leaving(key: number | string | null): void;
  /** As React state */
  changeContent(contentKeys: (number | string)[], contentByKey: Map<string | number, RenderItem>): void;
};

const inputTableFor = ['setTemplateRenderer', 'setTemplateData', 'setBaseOptions'] as const;
const outputTableFor = ['leaving', 'entering', 'changeContent'] as const;

export function createControl(setState: (s: SwitchAnimOutputData) => void, debug?: boolean) {
  const composite = new ReactorComposite<SwitchActions, SwitchEvents, typeof inputTableFor, typeof outputTableFor>({
    name: 'switchAnim',
    debug,
    debugExcludeTypes: ['changeContent'],
    inputTableFor, outputTableFor
  });

  const {i, o, r, outputTable, inputTable} = composite;

  r('entering -> set className, changeContent & entering(null) -> changeContent', o.pt.entering.pipe(
    rx.filter(([, key]) => key != null),
    rx.withLatestFrom(o.pt.changeContent),
    rx.mergeMap(([[m, key], [, keys, contentByKey]]) => {
      const item = contentByKey.get(key!)!;
      item.clsName = cln(styles.enterStart, styles.entering);
      o.dpf.changeContent(m, keys, contentByKey);
      return o.pt.entering.pipe(
        payloadRelatedToAction({i: m.r as number}),
        rx.take(1),
        rx.tap(() => {
          item.clsName = '';
          o.dpf.changeContent(m, keys, contentByKey);
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
          o.dp.changeContent(contentKeys, contentByKey);
          if (contentKeys.length > 1) {
            // leaving animation
            return o.dfo.leaving(o.at.leaving, m, contentKeys[0]).pipe(
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
            rx.tap(() => o.dpf.entering(m, idx)),
            rx.switchMap(() => rx.timer(TRANSION_DURATION)),
            rx.tap(() => {
              o.dpf.entering(m, null);
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
    rx.withLatestFrom(o.pt.changeContent),
    rx.concatMap(([[m, key], [, keys, contentByKey]]) => {
      const content = contentByKey.get(key!);
      if (content == null)
        return rx.EMPTY;
      content.clsName = styles.leaving;
      o.dpf.changeContent(m, keys, contentByKey);
      if (content.dom) {
        const style = content.dom.style;
        style.width = content.dom.clientWidth + 'px';
        style.height = content.dom.clientHeight + 'px';
        style.top = '0px';
        style.left = '0px';
      }
      return rx.timer(TRANSION_DURATION).pipe(
        rx.tap(() => {
          contentByKey.delete(key!);
          o.dpf.changeContent(m, keys.slice(1), contentByKey);
          o.dpf.leaving(m, null);
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
  i.dp.setTemplateRenderer((data: React.ReactNode) => {
    return data;
  });
  o.dp.changeContent([], new Map());
  o.dp.entering(null);
  o.dp.leaving(null);

  return composite;
}

export type SwitchAnimOutputData = ActionTableDataType<SwitchEvents, typeof outputTableFor> & ActionTableDataType<SwitchActions, typeof inputTableFor>;
