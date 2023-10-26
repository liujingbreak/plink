import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {ReactorComposite} from '@wfh/reactivizer';
import {createActionStreamWithEpic} from '../../reactive-base';
import {useAppLayout} from '../../components/appLayout.state';
import {getStore as getMarkdownStore} from '../markdownSlice';
import {TOC} from '../../../isom/md-types';

const desktopAppTitleBarHeight = 64;
export type ItemState = {
  expanded?: boolean;
  highlighted?: boolean;
  children?: string[]; // hashes
} & Omit<TOC, 'children'>;

export type TocUIState = {
  topLevelItems: string[];
  positionFixed: boolean;
  itemByHash?: Map<string, ItemState>;
};

type TocUIActions = {
  setLayoutControl(slice: NonNullable<ReturnType<typeof useAppLayout>>): void;
  setDataKey(key: string): void;
  expand(itemKey: string, isExpand: boolean): void;
  clicked(titleHasg: string): void;
  onPlaceHolderRef(ref: HTMLDivElement | null): void;
  onContentDomRef(ref: HTMLDivElement | null): void;
  onContentScroll(): void;
  unmount(): void;
};

type TocUIEvents = {
  changeFixPosition(fixed: boolean): void;
  loadItem(toc: ItemState): void;
  loadRawItem(toc: TOC): void;
  tableByHash(): void;
};

const tocInputTableFor = ['expand', 'setDataKey', 'onPlaceHolderRef', 'onContentDomRef'] as const;
const tocOutputTableFor = ['changeFixPosition'] as const;

export function createControl(uiDirtyCheck: (immutableObj: any) => any) {
  const state$ = new rx.BehaviorSubject<TocUIState>({
    topLevelItems: [],
    positionFixed: false,
    itemByHash: new Map()
  });

  const composite = new ReactorComposite<TocUIActions, TocUIEvents, typeof tocInputTableFor, typeof tocOutputTableFor>({
    name: 'markdown-toc',
    debug: true,
    inputTableFor: tocInputTableFor,
    outputTableFor: tocOutputTableFor
  });
  const {i, o, r} = composite;
  o.dp.changeFixPosition(false);

  r('when load dataByKey, loadRowItem', i.pt.setDataKey.pipe(
    rx.switchMap(([m, key]) => getMarkdownStore().pipe(
      op.map(s => s.contents[key]),
      op.distinctUntilChanged(),
      op.filter(data => data != null),
      op.take(1),
      op.map(data => {
        for (const toc of data.toc) {
          const multipleTopLevelTitles = data.toc.length > 1;
          // Do not display top level title element, if there is only 1 top level, instead we display 2nd level titles
          if (multipleTopLevelTitles)
            o.dpf.loadRawItem(m, toc);
        }
      })
    ))
  ));

  r('Recursively loadRowItem, loadItem', o.pt.loadRawItem.pipe(
    rx.tap(([m, toc]) => {
      o.dpf.loadItem(m, {...toc, children: toc.children?.map(c => c.id)});
      if (toc.children) {
        for (const chr of toc.children)
          o.dpf.loadRawItem(m, chr);
      }
    })
  ));

  const ctl = createActionStreamWithEpic<TocUIActions>({debug: 'tocUiControl'});
  ctl.dispatcher.addEpic<TocUIActions>(tocUiControl => {
    // const rPayloads = tocUiControl.createLatestPayloads('onPlaceHolderRef', 'onContentDomRef');
    const {payloadByType: pt, dispatcher} = tocUiControl;

    return rx.merge(
      pt.setDataKey.pipe(
        op.switchMap(key => {
          const toc$ = new rx.Subject<[toc: TOC, isTop: boolean]>();
          const itemByHash = new Map<string, ItemState>();

          return rx.merge(
            toc$.pipe(
              op.observeOn(rx.queueScheduler),
              op.map(([toc, isTop]) => {
                if (toc.children) {
                // Do not display top level title element, if there is only 1 top level, instead we display 2nd level titles
                  toc.children.forEach(chr => toc$.next([chr, !isTop && toc.level === 0]));
                }
                const tocState = {...toc} as ItemState;
                const childToc = (tocState as TOC).children;
                if (childToc) {
                  delete tocState.children;
                  tocState.children = childToc.map(toc => toc.id);
                }
                itemByHash.set(toc.id, tocState);
                if (isTop) {
                  state$.getValue().topLevelItems.push(toc.id);
                }
              })
            ),
            getMarkdownStore().pipe(
              op.map(s => s.contents[key]),
              op.distinctUntilChanged(),
              op.filter(data => data != null),
              op.take(1),
              op.map(data => {
                const topLevelItems = [] as string[];
                state$.getValue().topLevelItems = topLevelItems;
                for (const toc of data.toc) {
                  const multipleTopLevelTitles = data.toc.length > 1;
                  // Do not display top level title element, if there is only 1 top level, instead we display 2nd level titles
                  toc$.next([toc, multipleTopLevelTitles]);
                }
                toc$.complete();
                state$.next({...state$.getValue(), itemByHash});
              })
            )
          );
        })
      ),
      pt.expand.pipe(
        op.map(payload => {
          const s = state$.getValue();
          state$.next({...s, expanded: payload});
        })
      ),
      state$.pipe(
        op.map(s => {
          uiDirtyCheck({});
        })
      ),
      o.pt.changeFixPosition.pipe(
        op.withLatestFrom(
          pt.onPlaceHolderRef.pipe(
            op.filter((ref): ref is NonNullable<typeof ref> => ref != null)
          ),
          pt.onContentDomRef.pipe(
            op.filter((ref): ref is NonNullable<typeof ref> => ref != null)
          )
        ),
        op.map(([[, fixed], placeHolderRef, contentRef]) => {
          if (fixed) {
            const w = placeHolderRef.clientWidth + 'px';
            placeHolderRef.style.width = w;
            contentRef.style.width = w;
          } else {
            placeHolderRef.style.width = '';
            contentRef.style.width = '';
          }
          state$.next({...state$.getValue(), positionFixed: fixed});
          uiDirtyCheck({});
        })
      ),
      pt.setLayoutControl.pipe(
        op.map(slice => slice.addEpic(slice => {
          return () => slice.action$ByType._onScroll.pipe(
            op.withLatestFrom(pt.onPlaceHolderRef),
            op.filter(([, ref]) => ref != null),
            op.map(([, ref]) => {
              return ref!.getBoundingClientRect().top <= desktopAppTitleBarHeight;
            }),
            op.distinctUntilChanged(),
            op.map(fixed => o.dp.changeFixPosition(fixed)),
            op.ignoreElements()
          );
        }))
      )
    );
  });

  return [ctl, state$] as const;
}
