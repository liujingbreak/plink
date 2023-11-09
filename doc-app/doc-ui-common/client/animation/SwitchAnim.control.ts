import {ReactorComposite, ActionTableDataType} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import cln from 'classnames';
import styles from './SwitchAnim.module.scss';

const TRANSION_DURATION = 400;

type RenderItem = {
  clsName: string;
  renderable: React.ReactNode;
  key: string;
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
  syncFromProps(hashKey: string, children: React.ReactNode): void;
  setBaseOptions(opts: BaseOptions): void;
  updateContent(key: string, content: React.ReactNode): void;
  switchContent(key: string, content: React.ReactNode): void;
  contentRerendered(content: React.ReactNode): void;
};

type SwitchEvents = {
  switchContentDone(): void;
  entering(key: string | null): void;
  leaving(key: string | null): void;
  /** As React state */
  changeContent(contentKeys: string[], contentByKey: Map<string, RenderItem>): void;
};

const inputTableFor = ['setBaseOptions'] as const;
const outputTableFor = ['entering', 'changeContent'] as const;

export function createControl(setState: (s: SwitchAnimOutputData) => void, debug?: boolean) {
  const composite = new ReactorComposite<SwitchActions, SwitchEvents, typeof inputTableFor, typeof outputTableFor>({
    name: 'switchAnim',
    debug,
    inputTableFor, outputTableFor
  });

  const {i, o, r, outputTable, inputTable} = composite;

  r('entering -> changeContent', o.pt.entering.pipe(
    rx.filter(([, key]) => key != null),
    rx.withLatestFrom(o.pt.changeContent),
    rx.tap(([[m, key], [, keys, contentByKey]]) => {
      const item = contentByKey.get(key!)!;
      item.clsName = cln(styles.enterStart, styles.entering);
      o.dpf.changeContent(m, keys, contentByKey);
    })
  ));

  r('switchContent, wait for switchContentDone -> leaving, entering', i.pt.switchContent.pipe(
    rx.switchMap(payload => outputTable.l.entering.pipe(rx.take(1), rx.map(act => [payload, act] as const))),
    rx.switchMap(([payload, [, enteringKey]]) => {
      if (enteringKey != null) {
        return o.pt.switchContentDone.pipe(
          rx.take(1),
          rx.map(() => payload)
        );
      } else{
        return rx.of(payload);
      }
    }),
    rx.switchMap(([m, key, node]) => rx.combineLatest([outputTable.l.changeContent, inputTable.l.setBaseOptions]).pipe(
      rx.take(1),
      rx.concatMap(([[, contentKeys, contentByKey], [, opts]]) => {
        if (contentByKey.has(key)) {
          return rx.EMPTY;
        }
        const item: RenderItem = {
          renderable: node,
          key,
          clsName: contentKeys.length > 0 || opts.animFirstContent ? styles.enterStart : '',
          onContainerReady(div) {
            if (div) {
              item.dom = div;
            }
          }
        };
        contentByKey.set(key, item);
        contentKeys.push(key);
        o.dp.changeContent(contentKeys, contentByKey);
        if (contentKeys.length > 1) {
          return o.dfo.leaving(o.at.leaving, m, contentKeys[0]).pipe(
            rx.take(1),
            rx.map(() => [m, key, opts] as const)
          );
        } else {
          return opts.animFirstContent ? rx.of([m, key, opts] as const) : rx.EMPTY;
        }
      }),
      composite.labelError(' -> leaving')
    )),
    rx.switchMap(([m, key, opts]) => {
      return rx.timer(opts.type === 'translateY' || opts.type == null ? 200 : 20).pipe(
        rx.tap(() => o.dpf.entering(m, key)),
        rx.switchMap(() => rx.timer(TRANSION_DURATION)),
        rx.tap(() => {
          o.dpf.entering(m, null);
          o.dpf.switchContentDone(m);
        })
      );
    })
  ));

  r('updateContent -> changeContent', i.pt.updateContent.pipe(
    rx.switchMap(([, key, content]) => outputTable.l.changeContent.pipe(
      rx.take(1),
      rx.tap(([, keys, contentByKey]) => {
        contentByKey.get(key)!.renderable = content;
        o.dp.changeContent(keys, contentByKey);
      })
    ))
  ));

  r('syncFromProps', i.pt.syncFromProps.pipe(
    rx.map(([, ...all]) => all),
    rx.scan(([pKey, pContent], curr) => {
      const [cKey, cContent] = curr;
      if (cKey == null)
        return curr;
      if (pKey !== cKey) {
        i.dp.switchContent(cKey, cContent);
      } else if (pContent !== cContent) {
        i.dp.updateContent(cKey, cContent);
      }
      return curr;
    }, [null, null] as [string | null, React.ReactNode | null])
  ));

  r('leaving -> leaving(null), changeContent', o.pt.leaving.pipe(
    rx.filter(([m, key]) => key != null),
    rx.withLatestFrom(o.pt.changeContent),
    rx.concatMap(([[m, key], [, keys, contentByKey]]) => {
      const content = contentByKey.get(key!)!;
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

  r('Synce output table to UI state', outputTable.dataChange$.pipe(
    rx.tap(data => setState(data))
  ));
  o.dp.changeContent([], new Map());
  o.dp.entering(null);
  o.dp.leaving(null);

  return composite;
}

export type SwitchAnimOutputData = ActionTableDataType<SwitchEvents, typeof outputTableFor>;
