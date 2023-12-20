import * as rx from 'rxjs';
import {ReactorComposite, ActionTableDataType} from '@wfh/reactivizer';
import {useAppLayout} from '../../components/appLayout.control';
import {Router} from '../../animation/AnimatableRoutes.hooks';
import {markdownsControl} from '../markdownSlice';
import {createMarkdownViewControl} from '../markdownViewComp.control';
import {TOC} from '../../../isom/md-types';
import {applyHighlightFeature} from './TableOfContents.title-highlight';

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
  // expand(id: string, isExpand: boolean): void;
  setRouter(router: Router): void;
  clicked(id: string): void;
  onPlaceHolderRef(ref: HTMLDivElement | null): void;
  onContentDomRef(ref: HTMLDivElement | null): void;
  onContentScroll(): void;
  setMarkdownViewCtl(viewControl: ReturnType<typeof createMarkdownViewControl>): void;
};

export type TocUIEvents = {
  changeFixedPosition(fixed: boolean): void;
  handleTogglePopup(isOn: boolean, toggleIcon: (isOn: boolean) => void): void;
  setMarkdownBodyRef(dom: HTMLDivElement): void;

  topLevelItemIdsUpdated(ids: string[]): void;
  itemUpdated(toc: ItemState): void;

  loadRawItem(toc: TOC, levelDecrement?: number): void;
  itemById(map: Map<string, ItemState>): void;
  togglePopupClassName(cln: string): void;
  mdHtmlScanned(done: boolean, key?: string): void;
};

const tocInputTableFor = ['setDataKey', 'onPlaceHolderRef', 'onContentDomRef',
  'setRouter'
] as const;

export const tocOutputTableFor = [
  'changeFixedPosition', 'topLevelItemIdsUpdated', 'itemById', 'setMarkdownBodyRef',
  'handleTogglePopup', 'togglePopupClassName', 'mdHtmlScanned'
] as const;

export type TocUIEventTable = ActionTableDataType<TocUIEvents, typeof tocOutputTableFor>;

export function createControl(uiDirtyCheck: (immutableObj: any) => any) {
  const composite = new ReactorComposite<TocUIActions, TocUIEvents, typeof tocInputTableFor, typeof tocOutputTableFor>({
    name: 'markdown-toc',
    debug: process.env.NODE_ENV === 'development',
    inputTableFor: tocInputTableFor,
    outputTableFor: tocOutputTableFor
  });
  applyHighlightFeature(composite);
  const {i, o, r, outputTable, inputTable, labelError} = composite;
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

  // Sync handleTogglePopup, setMarkdownBodyRef from markdownViewControl
  r('setMarkdownViewCtl, when markdownViewCtl::setMarkdownKey === setDataKey,' +
    'markdownViewCtl::handleTogglePopup, htmlRenderredFor -> handleTogglePopup, setMarkdownBodyRef',
  i.pt.setMarkdownViewCtl.pipe(
    rx.switchMap(([, ctl]) => ctl.inputTable.l.setMarkdownKey.pipe(
      rx.switchMap(([, key]) => inputTable.l.setDataKey.pipe(
        rx.take(1),
        rx.switchMap(([, tocMdKey]) => key === tocMdKey ?
          rx.merge(
            ctl.i.pt.handleTogglePopup.pipe(
              rx.tap(all => o.dpf.handleTogglePopup(...all)),
              labelError('handleTogglePopup -> handleTogglePopup')
            ),
            ctl.outputTable.l.htmlRenderredFor.pipe(
              rx.filter(([, key]) => key === tocMdKey),
              rx.take(1),
              rx.switchMap(() => ctl.inputTable.l.setMarkdownBodyRef.pipe(
                rx.take(1),
                rx.tap(([m, dom]) => {
                  if (dom)
                    o.dpf.setMarkdownBodyRef(m, dom);
                })
              )),
              labelError('setMarkdownBodyRef -> setMarkdownBodyRef')
            )
          ) :
          rx.EMPTY)
      ))
    ))
  ));

  r('setDataKey -> loadRowItem, reset mdHtmlScanned', i.pt.setDataKey.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.tap(([m, key]) => o.dpf.mdHtmlScanned(m, false, key)),
    rx.switchMap(([m, key]) => markdownsControl.outputTable.l.htmlByKey.pipe(
      rx.map(([, map]) => map.get(key)),
      rx.filter((data): data is NonNullable<typeof data> => data != null),
      rx.distinctUntilChanged(),
      rx.take(1),
      rx.map(data => {
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
    o.pt.topLevelItemIdsUpdated.pipe(
      rx.switchMap(([m]) => rx.combineLatest([
        outputTable.l.setMarkdownBodyRef,
        outputTable.l.itemById,
        inputTable.l.setDataKey
      ]).pipe(
        rx.take(1),
        rx.tap(([[, dom], [m2, itemById], [, mdKey]]) => {
          for (const [id, item] of itemById.entries()) {
            const textDiv = dom.querySelector('[id="mdt-' + id + '"]');
            if (textDiv) {
              item.textDom = textDiv as HTMLDivElement;
            } else {
              // eslint-disable-next-line no-console
              console.log('Can not find element [id="mdt-' + id + '"]');
            }
          }
          const r = [m, m2];
          o.dpf.itemById(r, itemById);
          o.dpf.mdHtmlScanned(r, true, mdKey);
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

  r('matched route, mdHtmlScanned -> handleTogglePopup(false), scroll to heads', i.pt.setLayoutControl.pipe(
    rx.switchMap(([, layout]) => layout.inputTable.l.setFrontLayerRef),
    rx.filter(([, ref]) => ref != null),
    rx.switchMap(([, scrollable]) => rx.combineLatest([
      outputTable.l.mdHtmlScanned.pipe(
        rx.filter(([, done, key]) => done),
        rx.take(1),
        rx.delay(50) // Give some time to waiting for rendering
      ),
      inputTable.l.setRouter,
      inputTable.l.setDataKey
    ]).pipe(
      rx.filter(([[, , key], [, router], [, dataKey]]) => key === dataKey &&
                router.matchedRoute?.matchedParams.mdKey === key &&
               router.matchedRoute.location.hash.length > 0
      ),
      rx.switchMap(([, [, router]]) => outputTable.l.itemById.pipe(
        rx.take(1),
        rx.switchMap(([, map]) => {
          const hash = router.matchedRoute!.location.hash.slice(1);
          const itemState = map.get(hash);
          const rect = itemState?.textDom?.getBoundingClientRect();
          const [, toggleIcon] = composite.outputTable.getData().handleTogglePopup;
          if (toggleIcon) {
            // change icon button
            toggleIcon(false);
            // close TOC popup
            o.dp.handleTogglePopup(false, toggleIcon);
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
            console.error(`Can not find item of ${hash} to be scrolled to, client rectangle is`, rect, 'element:', itemState?.textDom);
            return rx.EMPTY;
          }
        })
      ))
    ))
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

  r('For non-desktop device, handleTogglePopup -> togglePopupClassName', i.pt.setLayoutControl.pipe(
    rx.switchMap(([, layout]) => layout.inputTable.l.setDeviceSize),
    rx.filter(([, size]) => size !== 'desktop'),
    rx.switchMap(() => {
      o.dp.changeFixedPosition(false);
      return o.pt.handleTogglePopup;
    }),
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.map(([_m, on]) => on),
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
    rx.withLatestFrom(
      i.pt.onPlaceHolderRef.pipe(
        rx.map(([, ref]) => ref),
        rx.filter((ref): ref is NonNullable<typeof ref> => ref != null)
      ),
      i.pt.onContentDomRef.pipe(
        rx.map(([, ref]) => ref),
        rx.filter((ref): ref is NonNullable<typeof ref> => ref != null)
      )
    ),
    rx.switchMap(([[m, fixed], placeHolderRef, contentRef]) => {
      if (fixed) {
        if (placeHolderRef.clientWidth < 0.05) {
          // The window is probably resized or direction of it is rotated, clientWidth is incorrect, give it a chance to reflow and repaint
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

  return [i, () => composite.dispose(), () => state] as const;
}

export type TocControl = ReactorComposite<TocUIActions, TocUIEvents, typeof tocInputTableFor, typeof tocOutputTableFor>;
