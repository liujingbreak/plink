import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {ReactorComposite, ActionTableDataType, actionRelatedToPayload} from '@wfh/reactivizer';
import {useAppLayout} from '../../components/appLayout.control';
import {markdownsControl} from '../markdownSlice';
import {TOC} from '../../../isom/md-types';

// const desktopAppTitleBarHeight = 64;
export type ItemState = {
  expanded?: boolean;
  highlighted?: boolean;
  children?: string[]; // hashes
  textDom?: HTMLDivElement;
} & Omit<TOC, 'children'>;

export type TocUIActions = {
  setLayoutControl(layout: NonNullable<ReturnType<typeof useAppLayout>>): void;
  setDataKey(key: string): void;
  setMarkdownBodyRef(key: string, dom: HTMLDivElement): void;
  expand(id: string, isExpand: boolean): void;
  clicked(id: string): void;
  onPlaceHolderRef(ref: HTMLDivElement | null): void;
  onContentDomRef(ref: HTMLDivElement | null): void;
  onContentScroll(): void;
  togglePopup(isOn: boolean): void;
};

type TocUIEvents = {
  changeFixPosition(fixed: boolean): void;

  topLevelItemIdsUpdated(ids: string[]): void;
  itemUpdated(toc: ItemState): void;

  loadRawItem(toc: TOC): void;
  itemById(map: Map<string, ItemState>): void;
  togglePopup: TocUIActions['togglePopup'];
  togglePopupClassName(cln: string): void;
};

const tocInputTableFor = ['expand', 'setDataKey', 'onPlaceHolderRef', 'onContentDomRef', 'togglePopup'] as const;
const tocOutputTableFor = ['changeFixPosition', 'topLevelItemIdsUpdated', 'itemById', 'togglePopup',
  'togglePopupClassName'] as const;

export type TocUIEventTable = ActionTableDataType<TocUIEvents, typeof tocOutputTableFor>;

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

  r('Recursively loadRowItem -> loadRowItem, itemUpdated', o.pt.loadRawItem.pipe(
    rx.tap(([m, toc]) => {
      o.dpf.itemUpdated(m, {...toc, children: toc.children?.map(c => c.id)});
      if (toc.children) {
        for (const chr of toc.children)
          o.dpf.loadRawItem(m, chr);
      }
    })
  ));

  r('setDataKey -> loadRowItem', i.pt.setDataKey.pipe(
    rx.switchMap(([m, key]) => markdownsControl.outputTable.l.htmlDone.pipe(
      rx.filter(([, key0]) => key0 === key),
      op.map(([, , contents]) => contents),
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

  r('itemUpdated -> itemById, itemDomRefHandlers', o.pt.itemUpdated.pipe(
    rx.withLatestFrom(outputTable.l.itemById),
    rx.tap(([[, it], [, map]]) => {
      map.set(it.id, it);
    })
  ));

  r('setDataKey, onContentDomRef, topLevelItemIdsUpdated -> scan HTML for heads (itemById.textDom)',
    rx.combineLatest([
      i.pt.setMarkdownBodyRef,
      i.pt.setDataKey
    ]).pipe(
      rx.filter(([[, mdKey], [, key]]) => mdKey === key),
      rx.switchMap(([[, mdKey, dom], [m, key]]) => outputTable.l.topLevelItemIdsUpdated.pipe(
        actionRelatedToPayload(m.i),
        rx.take(1),
        rx.withLatestFrom(outputTable.l.itemById),
        rx.tap(([, [, itemById]]) => {
          for (const [id, item] of itemById.entries()) {
            const textDiv = dom.querySelector('[id="mdt-' + id + '"]');
            if (textDiv) {
              item.textDom = textDiv as HTMLDivElement;
            }
          }
        })
      ))
    ));

  r('clicked', i.pt.setLayoutControl.pipe(
    rx.switchMap(([, layout]) => layout.inputTable.l.setFrontLayerRef),
    rx.filter(([, ref]) => ref != null),
    rx.switchMap(([, scrollable]) => i.pt.clicked.pipe(
      rx.switchMap(([, id]) => {
        return outputTable.l.itemById.pipe(
          rx.take(1),
          rx.switchMap(([, map]) => {
            const itemState = map.get(id);
            const rect = itemState?.textDom!.getBoundingClientRect();
            // eslint-disable-next-line no-console
            console.log(rect);
            i.dp.togglePopup(false);
            if (rect)
              return rx.timer(250).pipe(
                rx.tap(() => scrollable!.scrollTo({
                  left: 0,
                  top: rect.y - scrollable!.getBoundingClientRect().y,
                  behavior: 'smooth'
                }))
              );
            else
              return rx.EMPTY;
          })
        );
      })
    ))
  ));

  r('For desktop device: layout.onTopAppBarScrollChange -> changeFixPosition', i.pt.setLayoutControl.pipe(
    rx.switchMap(([, layout]) => layout.inputTable.l.setDeviceSize.pipe(
      // rx.filter(([, size]) => size === 'desktop'),
      rx.switchMap(([, size]) => {
        if (size === 'desktop') {
          return rx.merge(
            layout.outputTable.l.onTopAppBarScrollChange.pipe(
              rx.tap(([, outOfViewPort]) => {
                o.dp.changeFixPosition(outOfViewPort);
              }),
              composite.labelError('-> changeFixPosition')
            )
          );
        } else {
          return rx.EMPTY;
        }
      })
    ))
  ));

  r('For non-desktop device: -> togglePopup', i.pt.setLayoutControl.pipe(
    rx.switchMap(([, layout]) => layout.inputTable.l.setDeviceSize),
    rx.filter(([, size]) => size !== 'desktop'),
    rx.switchMap(() => {
      o.dp.changeFixPosition(false);
      return i.pt.togglePopup;
    }),
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.map(([m, on]) => {
      o.dpf.togglePopup(m, on);
      return on;
    }),
    // eslint-disable-next-line multiline-ternary
    rx.concatMap(on => on ? rx.concat(
      rx.defer(() => {o.dp.togglePopupClassName('toggleOnBegin'); return rx.EMPTY; }),
      rx.timer(16),
      rx.defer(() => {o.dp.togglePopupClassName('toggleOn'); return rx.EMPTY; }),
      rx.timer(300)
    ) : rx.concat(
      rx.defer(() => {o.dp.togglePopupClassName('toggleOnBegin'); return rx.EMPTY; }),
      rx.timer(300),
      rx.defer(() => {o.dp.togglePopupClassName(''); return rx.EMPTY; }),
      rx.timer(16)
    ))
  ));

  r('When changeFixPosition', o.pt.changeFixPosition.pipe(
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
    op.switchMap(([[, fixed], placeHolderRef, contentRef]) => {
      if (fixed) {
        const w = placeHolderRef.clientWidth + 'px';
        const h = placeHolderRef.clientHeight + 'px';
        placeHolderRef.style.width = w;
        placeHolderRef.style.height = h;
        contentRef.style.width = w;
        return rx.EMPTY;
      } else {
        contentRef.style.width = '';
        // In Safari, the flash is pretty abvious when "fixed" position change which causes browsr reflow
        return rx.timer(2000).pipe(
          rx.tap(() => {
            placeHolderRef.style.width = '';
          })
        );
      }
    })
  ));

  let state: TocUIEventTable | undefined;
  r('update state', composite.outputTable.dataChange$.pipe(
    rx.tap(obj => {
      state = obj;
      uiDirtyCheck(state);
    })
  ));

  return [i, () => composite.destory(), () => state] as const;
}
