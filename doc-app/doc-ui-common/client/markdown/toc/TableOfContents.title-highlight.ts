import * as rx from 'rxjs';
import {ReactorCompositeMergeType, ActionMeta} from '@wfh/reactivizer';
import {getMinAndMax} from '@wfh/algorithms';
import {TocControl, ItemState} from './TableOfContents.control';

export interface TocHLActions {
  setPosIndicatorRef(ref: HTMLDivElement | null): void;
  updateSectionRectangleIntervals(sections: Record<string, [top: number, bottom: number]>): void;
}

interface TocHLEvents {
  /** key is id,*/
  gotHeadingByIds(mapById: Map<string, readonly [index: number, el: HTMLElement]>, byIndex: {item: (i: number) => Element}): void;
  onHeadingIntersectChange(isIntersecting: boolean, el: Element): void;
  gotIntersectDirection(isDown: boolean): void;
  scrolledOverTitle(id: string, el: HTMLElement, debugCase: number): void;
  highlightTitle(id: string, el: HTMLElement): void;
  unhighlightTitle(id: string, el: HTMLElement): void;
}

export function applyHighlightFeature(tocControl: TocControl) {
  const tocTitleHighlight = tocControl as unknown as ReactorCompositeMergeType<TocControl, TocHLActions, TocHLEvents, ['setPosIndicatorRef']>;
  const outputTable = tocTitleHighlight.outputTable.addActions('gotHeadingByIds', 'highlightTitle');
  tocTitleHighlight.inputTable.addActions('setPosIndicatorRef');
  const {r, i, o} = tocTitleHighlight;
  // Store Markdown head element ID which starts with "mdt-"
  const intersectionsInId = new Set<string>();

  r('onHeadingIntersectChange -> scrolledOverTitle', o.pt.onHeadingIntersectChange.pipe(
    rx.withLatestFrom(outputTable.l.gotHeadingByIds),
    rx.tap(([[m, , el], [, byIds, byIndex]]) => {
      if (intersectionsInId.size > 0) {
        // console.log('intersectionsInId', [...intersectionsInId.values()], byIds);
        const [id] = getMinAndMax(intersectionsInId.values(), (a, b) => byIds.get(a)![0] - byIds.get(b)![0]);
        if (id == null)
          throw new Error('Head element of id found in viewport does not exist: ' + [...intersectionsInId.values()].join(', '));
        o.dpf.scrolledOverTitle(m, contentHeadIdToTocTitleId(id), byIds.get(id)![1], 0);
      } else {
        if (el.getBoundingClientRect().y < 0) {
          // In case of "user scrolls down"
          o.dp.scrolledOverTitle(contentHeadIdToTocTitleId(el.id), el as HTMLElement, 1);
        } else {
          const [idx] = byIds.get(el.id)!;
          const prevTitle = byIndex.item(idx - 1);
          o.dp.scrolledOverTitle(contentHeadIdToTocTitleId(prevTitle.id), prevTitle as HTMLElement, 2);
        }
      }
    })
  ));

  r('mdHtmlScanned, setLayoutControl -> new IntersectionObserver', outputTable.l.mdHtmlScanned.pipe(
    rx.filter(([, done]) => done),
    rx.switchMap(([m]) => outputTable.l.setMarkdownBodyRef.pipe(
      rx.take(1),
      rx.switchMap(([, container]) => new rx.Observable(sub => {
        const obs = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              intersectionsInId.add(entry.target.id);
            } else {
              intersectionsInId.delete(entry.target.id);
            }
            o.dpf.onHeadingIntersectChange(m, entry.isIntersecting, entry.target);
          }
        }, {threshold: 1});
        const els = container.querySelectorAll('[data-mdt]');
        const headingElsById = new Map<string, readonly [number, HTMLElement]>((function*() {
          for (let i = 0; i < els.length; i++) {
            const el = els.item(i);
            yield [el.id, [i, el as HTMLElement]] as const;
          }
        })());
        o.dpf.gotHeadingByIds(m, headingElsById, els);
        els.forEach(el => {
          obs.observe(el);
        });

        return () => els.forEach(el => obs.unobserve(el));
      }))
    ))
  ));

  r('scrolledOverTitle -> itemUpdated', o.pt.scrolledOverTitle.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.switchMap(([m, id]) => outputTable.l.itemById.pipe(
      rx.take(1),
      // rx.map(([, byId]) => [a, byId.get(contentHeadIdToTocTitleId(a[1]))] as const),
      rx.concatMap(([, itemById]) => {
        const item = itemById.get(id);
        if (item) {
          return rx.of([m, id, item] as const);
        } else {
          return outputTable.l.itemsIdUpdated.pipe(
            rx.take(1),
            rx.map(([, , byIndex]) => [m, byIndex[0], itemById.get(byIndex[0])!] as const)
          );
        }
      })
    )),
    rx.scan<readonly [ActionMeta, string, ItemState], readonly[ActionMeta, string, ItemState], null>((prev, curr) => {
      const [meta, cId, cItem] = curr;
      if (prev != null) {
        const [, id, pItem] = prev as typeof curr;
        o.dpf.unhighlightTitle(meta, id, pItem.titleDom!);
        if (pItem) {
          o.dpf.itemUpdated(meta, {...pItem, highlighted: false});
        }
      }
      o.dpf.highlightTitle(meta, cId, cItem.titleDom!);
      i.dpf.scrollTocToVisible(meta, contentHeadIdToTocTitleId(cId));
      o.dpf.itemUpdated(meta, {...cItem, highlighted: true});
      return curr;
    }, null)
  ));

  r('highlightTitle', o.pt.highlightTitle.pipe(
    rx.switchMap(([meta, id]) => outputTable.l.onTocLayoutChange.pipe(
      rx.switchMap(([, mode]) => mode === 'aside' ?
        new rx.Observable(() => {
          i.dpf.scrollTocToVisible(meta, contentHeadIdToTocTitleId(id));
        }) :
        outputTable.l.handleTogglePopup.pipe(
          rx.filter(([, isOn]) => isOn),
          rx.take(1),
          rx.mergeMap(() => rx.timer(32)),
          rx.tap(() => {
            i.dpf.scrollTocToVisible(meta, contentHeadIdToTocTitleId(id));
          })
        )
      )
    ))
  ));
  return tocTitleHighlight;
}

function contentHeadIdToTocTitleId(id: string) {
  return id.startsWith('mdt-') ? id.slice('mdt-'.length) : id;
}
