import * as rx from 'rxjs';
import {ReactorComposite2, SingleActionFactory, ActionTableDataType} from '@wfh/reactivizer';
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
  titleDom?: HTMLElement;
} & Omit<TOC, 'children'>;

export type TocUIActions = {
  setLayoutControl(layout: NonNullable<ReturnType<typeof useAppLayout>>): SingleActionFactory;
  setDataKey(key: string): SingleActionFactory;
  // expand(id: string, isExpand: boolean): SingleActionFactory;
  setRouter(router: Router): SingleActionFactory;
  clicked(id: string): SingleActionFactory;
  onScrollDetectorRef(ref: HTMLDivElement | null): SingleActionFactory;
  onContentDomRef(ref: HTMLDivElement | null): SingleActionFactory;
  onContentScroll(): SingleActionFactory;
  setMarkdownViewCtl(viewControl: ReturnType<typeof createMarkdownViewControl>): SingleActionFactory;
  scrollTocToVisible(id: string): SingleActionFactory;
  setItemTitleElement(id: string, dom: HTMLElement): SingleActionFactory;
};

export type TocUIEvents = {
  changeFixedPosition(fixed: boolean): SingleActionFactory;
  handleTogglePopup(isOn: boolean, toggleIcon: (isOn: boolean) => void): SingleActionFactory;
  setMarkdownBodyRef(dom: HTMLDivElement): SingleActionFactory;

  /** @param allIds is immutable */
  itemsIdUpdated(tocLevelIds: string[], allIds: string[]): SingleActionFactory;
  itemUpdated(toc: ItemState): SingleActionFactory;

  loadRawItem(toc: TOC, levelDecrement?: number): SingleActionFactory;
  /** mutable, do not rely on this field for dirty-check */
  itemById(map: Map<string, ItemState>): SingleActionFactory;
  togglePopupClassName(cln: string): SingleActionFactory;
  mdHtmlScanned(done: boolean, key?: string): SingleActionFactory;
  onTocLayoutChange(mode: 'aside' | 'popup'): SingleActionFactory;
};

const tocInputTableFor = [
  'setDataKey', 'onContentDomRef', 'setMarkdownViewCtl',
  'setRouter', 'onScrollDetectorRef', 'setLayoutControl', 'scrollTocToVisible'
] as const;

export const tocOutputTableFor = [
  'changeFixedPosition', 'itemsIdUpdated', 'itemById', 'setMarkdownBodyRef',
  'handleTogglePopup', 'togglePopupClassName', 'mdHtmlScanned', 'onTocLayoutChange'
] as const;

export type TocUIEventTable = ActionTableDataType<TocUIEvents, typeof tocOutputTableFor>;

export function createControl(uiDirtyCheck: (immutableObj: any) => any) {
  const compositeBase = new ReactorComposite2<TocUIActions, TocUIEvents, typeof tocInputTableFor, typeof tocOutputTableFor>({
    name: 'markdown-toc',
    debug: false, // process.env.NODE_ENV === 'development',
    inputTableFor: tocInputTableFor,
    outputTableFor: tocOutputTableFor
  });
  const composite = applyHighlightFeature(compositeBase);
  const {i, o, r, outputTable, inputTable, labelError} = composite;
  o.ft.changeFixedPosition(false).dp();
  o.ft.itemById(new Map()).dp();
  o.ft.mdHtmlScanned(false).dp();
  let tocTitleIds = [] as string[];

  r('Recursively loadRowItem -> loadRowItem, itemUpdated', o.pt.loadRawItem.pipe(
    rx.tap(([m, toc, levelDecre]) => {
      tocTitleIds.push(toc.id);
      o.ft.itemUpdated({
        ...toc,
        level: levelDecre != null ? toc.level - levelDecre : toc.level,
        children: toc.children?.map(c => c.id)
      }).dp(m);
      if (toc.children) {
        for (const chr of toc.children)
          o.ft.loadRawItem(chr, levelDecre ?? 0).dp(m);
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
              rx.tap(([m, ...all]) => o.ft.handleTogglePopup(...all).dp(m)),
              labelError('handleTogglePopup -> handleTogglePopup')
            ),
            ctl.outputTable.l.htmlRenderredFor.pipe(
              rx.filter(([, key]) => key === tocMdKey),
              rx.take(1),
              rx.switchMap(() => ctl.inputTable.l.setMarkdownBodyRef.pipe(
                rx.take(1),
                rx.tap(([m, dom]) => {
                  if (dom)
                    o.ft.setMarkdownBodyRef(dom).dp(m);
                })
              )),
              labelError('setMarkdownBodyRef -> setMarkdownBodyRef')
            )
          ) :
          rx.EMPTY)
      ))
    ))
  ));

  r('setDataKey -> loadRowItem, reset mdHtmlScanned, itemsIdUpdated', i.pt.setDataKey.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.tap(([m, key]) => o.ft.mdHtmlScanned(false, key).dp(m)),
    rx.switchMap(([m, key]) => markdownsControl.outputTable.l.htmlByKey.pipe(
      rx.map(([, map]) => map.get(key)),
      rx.filter((data): data is NonNullable<typeof data> => data != null),
      rx.distinctUntilChanged(),
      rx.take(1),
      rx.withLatestFrom(inputTable.l.setMarkdownViewCtl),
      rx.map(([data, [, markdownView]]) => {
        if (data.toc.length === 0) {
          tocTitleIds = [];
          o.ft.itemsIdUpdated([], []).dp(m);
          return;
        }
        // Do not display top level title element, if there is only 1 top level, instead we display 2nd level titles
        let items = data.toc;
        let levelDecre = 0;
        if (items.length <= 1) {
          items = items[0]?.children ?? [];
          levelDecre = 1;
        }
        for (const toc of items) {
          o.ft.loadRawItem(toc, levelDecre).dp(m);
        }
        o.ft.itemsIdUpdated(items.map(t => t.id), tocTitleIds).dp(m);
        markdownView.i.ft.hasToc(key, items.length > 0).dp(m);
      })
    ))
  ));

  r('setItemTitleElement', i.pt.setItemTitleElement.pipe(
    rx.withLatestFrom(outputTable.l.itemById),
    rx.tap(([[, id, el], [, itemById]]) => {
      itemById.get(id)!.titleDom = el;
    })
  ));

  r('itemUpdated -> itemById, itemDomRefHandlers', o.pt.itemUpdated.pipe(
    rx.withLatestFrom(outputTable.l.itemById),
    rx.tap(([[, it], [, map]]) => {
      map.set(it.id, it);
    })
  ));

  r('setDataKey, setMarkdownBodyRef, itemById, itemsIdUpdated -> scan HTML for heads (itemById.textDom), mdHtmlScanned',
    o.pt.itemsIdUpdated.pipe(
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
          o.ft.itemById(itemById).dp(...r);
          o.ft.mdHtmlScanned(true, mdKey).dp(...r);
        })
      ))
    ));

  r('clicked -> router navigate', i.pt.clicked.pipe(
    rx.switchMap(([, id]) => composite.inputTable.l.setRouter.pipe(
      rx.filter(([, r]) => r.control != null),
      rx.take(1),
      rx.tap(([, {matchedRoute, control}]) => {
        control!.ft.navigateTo(matchedRoute!.location.pathname + '#' + id).dp();
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
            o.ft.handleTogglePopup(false, toggleIcon).dp();
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

  r('scrollTocToVisible', inputTable.l.scrollTocToVisible.pipe(
    rx.switchMap(([, id]) => rx.combineLatest([
      inputTable.l.onContentDomRef.pipe(
        rx.filter(([, dom]) => dom != null)
      ),

      outputTable.l.itemById,

      inputTable.l.setPosIndicatorRef.pipe(
        rx.filter(([, ref]) => ref != null)
      )
    ]).pipe(
      rx.filter(([[, contentDom], [, items], [, posIndicator]]) => items.get(id)?.titleDom != null),
      rx.take(1),
      rx.map(([[, contentDom], [, items], [, posIndicator]]) => [id, contentDom, items.get(id)?.titleDom, posIndicator] as const)
    )),
    rx.tap(([, contentDom, target, posIndicator]) => {
      // const {titleDom: target} = items.get(id)!;
      const targetRect = target!.getBoundingClientRect();
      const scrollableRect = contentDom!.getBoundingClientRect();
      const top = Math.round(targetRect.y - scrollableRect.y + contentDom!.scrollTop);
      posIndicator!.style.top = top + targetRect.height / 2 - 6 + 'px';
      if (targetRect.y < scrollableRect.y || (targetRect.y + targetRect.height) > (scrollableRect.y + contentDom!.clientHeight)) {
        contentDom!.scrollTo({top, behavior: 'smooth'});
      }
    })
  ));

  r('layout setDeviceSize -> ', i.pt.setLayoutControl.pipe(
    rx.switchMap(([, layout]) => layout.inputTable.l.setDeviceSize),
    rx.tap(([m, size]) => {
      o.ft.onTocLayoutChange(size === 'phone' ? 'popup' : 'aside').dp(m);
    })
  ));

  r('onTocLayoutChange(popup), handleTogglePopup -> togglePopupClassName', outputTable.l.onTocLayoutChange.pipe(
    rx.filter(([, mode]) => mode === 'popup'),
    rx.switchMap(([, mode]) => {
      if (mode === 'popup') {
        o.ft.changeFixedPosition(false).dp();
        return rx.merge(
          inputTable.l.onContentDomRef.pipe(
            rx.filter(([, ref]) => ref != null),
            rx.tap(([, contentDom]) => {
              contentDom!.style.width = '';
            })
          ),
          o.pt.handleTogglePopup.pipe(
            rx.distinctUntilChanged(([, a], [, b]) => a === b),
            rx.map(([_m, on]) => on),
            // eslint-disable-next-line multiline-ternary
            rx.concatMap(on => on ? rx.concat(
              rx.defer(() => {o.ft.togglePopupClassName('toggleOnBegin').dp(); return rx.EMPTY; }),
              rx.timer(16),
              rx.defer(() => {o.ft.togglePopupClassName('toggleOn').dp(); return rx.EMPTY; }),
              rx.timer(300)
            ) : rx.concat(
              rx.defer(() => {o.ft.togglePopupClassName('toggleOnBegin').dp(); return rx.EMPTY; }),
              rx.timer(300),
              rx.defer(() => {o.ft.togglePopupClassName('').dp(); return rx.EMPTY; }),
              rx.timer(16)
            ))
          )
        );
      } else {
        return rx.EMPTY;
      }
    })
  ));

  r('onTocLayoutChange(aside) -> changeFixedPosition', outputTable.l.onTocLayoutChange.pipe(
    rx.switchMap(([, mode]) => mode === 'aside' ?
      inputTable.l.onScrollDetectorRef.pipe(
        rx.filter(([, ref]) => ref != null),
        rx.switchMap(([, el]) => new rx.Observable(() => {
          const tocScrollDetector = new IntersectionObserver(entries => {
            o.ft.changeFixedPosition(!entries[0].isIntersecting).dp();
          }, {threshold: 0});
          const target = el!;
          tocScrollDetector.observe(target);
          return () => tocScrollDetector.unobserve(target);
        }))) :
      rx.EMPTY)
  ));

  // let tocContentTopToScreenEdge = 0;

  r('When changeFixedPosition', outputTable.l.onTocLayoutChange.pipe(
    rx.switchMap(([, mode]) => mode === 'aside' ?
      outputTable.l.changeFixedPosition.pipe(
        rx.withLatestFrom(
          inputTable.l.onContentDomRef.pipe(
            rx.map(([, ref]) => ref),
            rx.filter((ref): ref is NonNullable<typeof ref> => ref != null)
          ),
          inputTable.l.setLayoutControl.pipe(
            rx.switchMap(([, layout]) => layout.inputTable.l.setFrontLayerRef),
            rx.filter(([, el]) => el != null)
          )
        ),
        rx.switchMap(([[m, fixed], contentRef, [, scrollable]]) => {
          if (fixed) {
            const w = contentRef.parentElement!.clientWidth + 'px';
            contentRef.style.width = w;
            contentRef.style.top = '0';
            contentRef.style.height = '100vh';
            return rx.EMPTY;
          } else {
            contentRef.style.top = '';
            contentRef.style.height = '';
            // In Safari, the flash is pretty abvious when "fixed" position change which causes browsr reflow
            return rx.merge(
              rx.timer(32).pipe(
                rx.tap(() => {
                  contentRef.style.width = contentRef.parentElement!.clientWidth + 'px';
                  // tocContentTopToScreenEdge = contentRef.parentElement!.getBoundingClientRect().y + scrollable!.scrollTop;
                })
              )
            );
          }
        })
      ) :
      rx.EMPTY)
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

export type TocControl = ReactorComposite2<TocUIActions, TocUIEvents, typeof tocInputTableFor, typeof tocOutputTableFor>;
