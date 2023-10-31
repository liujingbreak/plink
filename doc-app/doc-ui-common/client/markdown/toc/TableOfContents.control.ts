import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {ReactorComposite, ActionTableDataType} from '@wfh/reactivizer';
import {useAppLayout} from '../../components/appLayout.state';
import {getStore as getMarkdownStore} from '../markdownSlice';
import {TOC} from '../../../isom/md-types';

// const desktopAppTitleBarHeight = 64;
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
  expand(id: string, isExpand: boolean): void;
  clicked(id: string): void;
  onPlaceHolderRef(ref: HTMLDivElement | null): void;
  onContentDomRef(ref: HTMLDivElement | null): void;
  onContentScroll(): void;
  unmount(): void;
};

type TocUIEvents = {
  changeFixPosition(fixed: boolean): void;

  topLevelItemIdsUpdated(ids: string[]): void;
  itemUpdated(toc: ItemState): void;

  loadRawItem(toc: TOC): void;
  itemById(map: Map<string, ItemState>): void;
};

const tocInputTableFor = ['expand', 'setDataKey', 'onPlaceHolderRef', 'onContentDomRef'] as const;
const tocOutputTableFor = ['changeFixPosition', 'topLevelItemIdsUpdated', 'itemById'] as const;

export function createControl(uiDirtyCheck: (immutableObj: any) => any) {
  const composite = new ReactorComposite<TocUIActions, TocUIEvents, typeof tocInputTableFor, typeof tocOutputTableFor>({
    name: 'markdown-toc',
    debug: process.env.NODE_ENV === 'development',
    inputTableFor: tocInputTableFor,
    outputTableFor: tocOutputTableFor
  });
  const {i, o, r, outputTable} = composite;
  o.dp.changeFixPosition(false);
  o.dp.itemById(new Map());

  r('Recursively loadRowItem, itemUpdated', o.pt.loadRawItem.pipe(
    rx.tap(([m, toc]) => {
      o.dpf.itemUpdated(m, {...toc, children: toc.children?.map(c => c.id)});
      if (toc.children) {
        for (const chr of toc.children)
          o.dpf.loadRawItem(m, chr);
      }
    })
  ));

  r('when load dataByKey, loadRowItem', i.pt.setDataKey.pipe(
    rx.switchMap(([m, key]) => getMarkdownStore().pipe(
      op.map(s => s.contents[key]),
      op.distinctUntilChanged(),
      op.filter(data => data != null),
      op.take(1),
      op.map(data => {
        if (data.toc.length === 0) {
          o.dpf.topLevelItemIdsUpdated(m, []);
          return;
        }
        // Do not display top level title element, if there is only 1 top level, instead we display 2nd level titles
        const items = data.toc.length > 1 ? data.toc : data.toc[0]?.children ?? [];
        for (const toc of items) {
          o.dpf.loadRawItem(m, toc);
        }
        o.dpf.topLevelItemIdsUpdated(m, items.map(t => t.id));
      })
    ))
  ));

  r('set map for itemState', o.pt.itemUpdated.pipe(
    rx.withLatestFrom(outputTable.l.itemById),
    rx.tap(([[, it], [, map]]) => {
      map.set(it.id, it);
    })
  ));

  r('TOC placeholder instersection observing', composite.inputTable.l.onPlaceHolderRef.pipe(
    rx.combineLatestWith(
      i.pt.setLayoutControl.pipe(
        rx.switchMap(([, layout]) => layout.getStore()),
        rx.map(state => state.frontLayer),
        rx.filter(container => container != null),
        rx.take(1)
      )
    ),
    rx.filter(([[, ref], container]) => ref != null),
    rx.switchMap(([[, ref], container]) => new rx.Observable<boolean>(sub => {
      const ob = new IntersectionObserver(entries => {
        sub.next(entries[0].isIntersecting);
        console.log(entries[0]);
      }, {// rootMargin: '-' + desktopAppTitleBarHeight + 'px',
        root: container,
        threshold: 0
      });
      ob.observe(ref!);
      return () => ob.observe(ref!);
    })),
    rx.map(isIntersecting => o.dp.changeFixPosition(!isIntersecting))
  ));

  // r('When scrolling…dispatch changeFixPosition', i.pt.setLayoutControl.pipe(
  //   rx.combineLatestWith(composite.inputTable.l.onPlaceHolderRef.pipe(
  //     rx.filter(([, ref]) => ref != null)
  //   )),
  //   rx.switchMap(([[, slice], [, ref]]) => slice.action$ByType._onScroll.pipe(
  //     rx.map(() => ref!)
  //   )),
  //   rx.map(ref => {
  //     return ref.getBoundingClientRect().top <= desktopAppTitleBarHeight;
  //   }),
  //   op.distinctUntilChanged(),
  //   op.map(fixed => o.dp.changeFixPosition(fixed))
  // ));

  r('When position changed', o.pt.changeFixPosition.pipe(
    op.withLatestFrom(
      i.pt.onPlaceHolderRef.pipe(
        rx.map(([, ref]) => ref),
        op.filter((ref): ref is NonNullable<typeof ref> => ref != null)
      ),
      i.pt.onContentDomRef.pipe(
        rx.map(([, ref]) => ref),
        op.filter((ref): ref is NonNullable<typeof ref> => ref != null)
      )
    ),
    op.map(([[, fixed], placeHolderRef, contentRef]) => {
      if (fixed) {
        const w = placeHolderRef.clientWidth + 'px';
        const h = placeHolderRef.clientHeight + 'px';
        placeHolderRef.style.width = w;
        placeHolderRef.style.height = h;
        contentRef.style.width = w;
      } else {
        placeHolderRef.style.width = '';
        contentRef.style.width = '';
      }
    })
  ));

  let state: ActionTableDataType<TocUIEvents, typeof tocOutputTableFor> | undefined;
  r('update state', composite.outputTable.dataChange$.pipe(
    rx.tap(obj => {
      state = obj;
      uiDirtyCheck(state);
    })
  ));

  return [i, () => state] as const;
}
