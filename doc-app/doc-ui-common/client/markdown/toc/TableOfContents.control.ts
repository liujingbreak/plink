import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {ReactorComposite, ActionTableDataType, actionRelatedToPayload} from '@wfh/reactivizer';
import {useAppLayout} from '../../components/appLayout.control';
import {Router} from '../../animation/AnimatableRoutes.hooks';
import {markdownsControl} from '../markdownSlice';
import {TOC} from '../../../isom/md-types';

// const desktopAppTitleBarHeight = 64;
export type ItemState = {
  expanded?: boolean;
  highlighted?: boolean;
  children?: string[]; // hashes
  textDom?: HTMLDivElement;
  level: number;
} & Omit<TOC, 'children'>;

export type TocUIActions = {
  setLayoutControl(layout: NonNullable<ReturnType<typeof useAppLayout>>): void;
  setDataKey(key: string): void;
  setMarkdownBodyRef(key: string, dom: HTMLDivElement): void;
  expand(id: string, isExpand: boolean): void;
  setRouter(router: Router): void;
  clicked(id: string): void;
  onPlaceHolderRef(ref: HTMLDivElement | null): void;
  onContentDomRef(ref: HTMLDivElement | null): void;
  onContentScroll(): void;
  togglePopup(isOn: boolean, toggleIcon: (isOn: boolean) => void): void;
};

type TocUIEvents = {
  changeFixedPosition(fixed: boolean): void;

  topLevelItemIdsUpdated(ids: string[]): void;
  itemUpdated(toc: ItemState): void;

  loadRawItem(toc: TOC, levelDecrement?: number): void;
  itemById(map: Map<string, ItemState>): void;
  togglePopupClassName(cln: string): void;
  scrollToItem(id: string): void;
  mdHtmlScanned(done: boolean, key?: string): void;
};

const tocInputTableFor = ['expand', 'setDataKey', 'onPlaceHolderRef', 'onContentDomRef', 'togglePopup', 'setRouter'] as const;
const tocOutputTableFor = ['changeFixedPosition', 'topLevelItemIdsUpdated', 'itemById',
  'togglePopupClassName', 'mdHtmlScanned'] as const;

export type TocUIEventTable = ActionTableDataType<TocUIEvents, typeof tocOutputTableFor>;

export function createControl(uiDirtyCheck: (immutableObj: any) => any) {
  const composite = new ReactorComposite<TocUIActions, TocUIEvents, typeof tocInputTableFor, typeof tocOutputTableFor>({
    name: 'markdown-toc',
    debug: process.env.NODE_ENV === 'development',
    inputTableFor: tocInputTableFor,
    outputTableFor: tocOutputTableFor
  });
  const {i, o, r, outputTable} = composite;
  o.dp.changeFixedPosition(false);
  o.dp.itemById(new Map());
  o.dp.mdHtmlScanned(false);

  r('Recursively loadRowItem -> loadRowItem, itemUpdated', o.pt.loadRawItem.pipe(
    rx.tap(([m, toc, levelDecre]) => {
      o.dpf.itemUpdated(m, {
        ...toc,
        level: levelDecre != null ? toc.level - levelDecre : toc.level,
        children: toc.children?.map(c => c.id)
      });
      if (toc.children) {
        for (const chr of toc.children)
          o.dpf.loadRawItem(m, chr, levelDecre ?? 0);
      }
    })
  ));

  r('setDataKey -> loadRowItem, reset mdHtmlScanned', i.pt.setDataKey.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.tap(() => o.dp.mdHtmlScanned(false)),
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
        let items = data.toc;
        let levelDecre = 0;
        if (data.toc.length <= 1) {
          items = data.toc[0]?.children ?? [];
          levelDecre = 1;
        }
        for (const toc of items) {
          o.dpf.loadRawItem(m, toc, levelDecre);
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

  r('setDataKey, onContentDomRef, topLevelItemIdsUpdated -> scan HTML for heads (itemById.textDom), mdHtmlScanned',
    rx.combineLatest([
      i.pt.setMarkdownBodyRef,
      i.pt.setDataKey
    ]).pipe(
      rx.filter(([[, mdKey], [, key]]) => mdKey === key),
      rx.switchMap(([[, , dom], [m, key]]) => outputTable.l.topLevelItemIdsUpdated.pipe(
        actionRelatedToPayload(m.i),
        rx.take(1),
        rx.withLatestFrom(outputTable.l.itemById),
        rx.tap(([[m2], [, itemById]]) => {
          for (const [id, item] of itemById.entries()) {
            const textDiv = dom.querySelector('[id="mdt-' + id + '"]');
            if (textDiv) {
              item.textDom = textDiv as HTMLDivElement;
            }
          }
          o.dpf.mdHtmlScanned([m, m2], true, key);
        })
      ))
    ));

  r('clicked -> router navigate', i.pt.clicked.pipe(
    rx.switchMap(([, id]) => composite.inputTable.l.setRouter.pipe(
      rx.filter(([, r]) => r.control != null),
      rx.take(1),
      rx.tap(([, {matchedRoute, control}]) => {
        control!.dp.navigateTo(matchedRoute!.location.pathname + '#' + id);
      })
    ))
  ));

  r('matched route, mdHtmlScanned -> togglePopup(false), scroll to heads', i.pt.setLayoutControl.pipe(
    rx.switchMap(([, layout]) => layout.inputTable.l.setFrontLayerRef),
    rx.filter(([, ref]) => ref != null),
    rx.combineLatestWith(
      composite.inputTable.l.setRouter.pipe(
        rx.map(([, {matchedRoute}]) => matchedRoute!.location.hash.length > 0 ? matchedRoute!.location.hash.slice(1) : null),
        rx.distinctUntilChanged()
      ),
      outputTable.l.mdHtmlScanned.pipe(
        rx.filter(([, done, key]) => done)
      )),
    rx.filter(([, id]) => id != null),
    rx.switchMap(([[, scrollable], id]) => {
      o.dp.scrollToItem(id!);
      return rx.combineLatest([
        outputTable.l.mdHtmlScanned.pipe(rx.filter(([, done]) => done)),
        outputTable.l.itemById
      ]).pipe(
        rx.take(1),
        rx.switchMap(([, [, map]]) => {
          const itemState = map.get(id!);
          const rect = itemState?.textDom!.getBoundingClientRect();
          const [, toggleIcon] = composite.inputTable.getData().togglePopup;
          if (toggleIcon) {
            // change icon button
            toggleIcon(false);
            // close TOC popup
            i.dp.togglePopup(false, toggleIcon);
          }
          if (rect) {
            let targetY = Math.floor(rect.y - scrollable!.getBoundingClientRect().y + scrollable!.scrollTop);
            if (targetY > 64)
              targetY -= 64;
            return rx.timer(250).pipe(
              rx.tap(() => scrollable!.scrollTo({
                left: 0,
                top: targetY,
                behavior: 'smooth'
              }))
            );
          } else {
            console.error(`Can not find item of ${id!} to be scrolled to, client rectangle is`, rect);
            return rx.EMPTY;
          }
        })
      );
    })
  ));

  r('For desktop device: layout.onTopAppBarScrollChange -> changeFixedPosition', i.pt.setLayoutControl.pipe(
    rx.switchMap(([, layout]) => layout.inputTable.l.setDeviceSize.pipe(
      rx.switchMap(([, size]) => {
        if (size === 'desktop') {
          return rx.merge(
            layout.outputTable.l.onTopAppBarScrollChange.pipe(
              rx.tap(([, outOfViewPort]) => {
                o.dp.changeFixedPosition(outOfViewPort);
              }),
              composite.labelError('-> changeFixedPosition')
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
      o.dp.changeFixedPosition(false);
      return i.pt.togglePopup;
    }),
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.map(([_m, on]) => {
      // o.dpf.togglePopup(m, on);
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

  r('When changeFixedPosition', o.pt.changeFixedPosition.pipe(
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
    op.switchMap(([[m, fixed], placeHolderRef, contentRef]) => {
      if (fixed) {
        if (placeHolderRef.clientWidth < 0.05) {
          return rx.timer(1).pipe(
            rx.tap(() => {
              o.dpf.changeFixedPosition(m, false);
            }),
            rx.switchMap(() => rx.timer(320)),
            rx.tap(() => o.dpf.changeFixedPosition(m, true))
          );
        }
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
