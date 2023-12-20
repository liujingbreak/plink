import * as rx from 'rxjs';
import {ReactorCompositeMergeType, InferMapParam} from '@wfh/reactivizer';
import {getMinAndMax} from '@wfh/algorithms';
import {TocControl} from './TableOfContents.control';

interface TocHLActions {
  updateSectionRectangleIntervals(sections: Record<string, [top: number, bottom: number]>): void;
}

interface TocHLEvents {
  /** key is id,*/
  gotHeadingByIds(mapById: Map<string, readonly [index: number, el: HTMLElement]>, byIndex: {item: (i: number) => Element}): void;
  onHeadingIntersecting(isIntersecting: boolean, el: Element): void;
  gotIntersectDirection(isDown: boolean): void;
  _highlightTitle(id: string, el: HTMLElement): void;
  highlightTitle(id: string, el: HTMLElement): void;
  unhighlightTitle(id: string, el: HTMLElement): void;
}

export function applyHighlightFeature(tocControl: TocControl) {
  const tocTitleHighlight = tocControl as unknown as ReactorCompositeMergeType<TocControl, TocHLActions, TocHLEvents>;
  const outputTable = tocTitleHighlight.outputTable.addActions('gotHeadingByIds', 'highlightTitle');
  const {r, i, o} = tocTitleHighlight;
  const intersectionsInId = new Set<string>();
  const last2LeavingTitles = [null, null] as Array<string | null>;

  r('onHeadingIntersecting', o.pt.onHeadingIntersecting.pipe(
    rx.withLatestFrom(outputTable.l.gotHeadingByIds),
    rx.tap(([[m, , el], [, byIds, byIndex]]) => {
      if (intersectionsInId.size > 0) {
        const [id] = getMinAndMax(intersectionsInId.values(), (a, b) => byIds.get(a)![0] - byIds.get(b)![0]);
        if (id == null)
          throw new Error('Head element of id found in viewport does not exist: ' + [...intersectionsInId.values()].join(', '));
        o.dpf._highlightTitle(m, id, byIds.get(id)![1]);
      } else {
        if (last2LeavingTitles[0] == null) {
          o.dp._highlightTitle(el.id, el as HTMLElement);
        } else {
          const [idx0] = byIds.get(last2LeavingTitles[0])!;
          const [idx1] = byIds.get(el.id)!;
          if (idx0 < idx1) {
            o.dp._highlightTitle(el.id, el as HTMLElement);
          } else {
            const el = byIndex.item(idx1 - 1);
            o.dp._highlightTitle(el.id, el as HTMLElement);
          }
        }
      }
    })
  ));

  r('mdHtmlScanned, setLayoutControl -> new IntersectionObserver', rx.combineLatest([
    i.pt.setLayoutControl.pipe(
      rx.switchMap(([, layout]) => layout.inputTable.l.setFrontLayerRef),
      rx.filter(([, el]) => el != null)
    ),
    outputTable.l.mdHtmlScanned.pipe(rx.filter(([, done]) => done))
  ]).pipe(
    rx.switchMap(([[, scrollable], [m]]) => outputTable.l.setMarkdownBodyRef.pipe(
      rx.take(1),
      rx.switchMap(([, container]) => new rx.Observable(sub => {
        const obs = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (entry.isIntersecting)
              intersectionsInId.add(entry.target.id);
            else {
              intersectionsInId.delete(entry.target.id);
              last2LeavingTitles[0] = last2LeavingTitles[1];
              last2LeavingTitles[1] = entry.target.id;
            }
            o.dpf.onHeadingIntersecting(m, entry.isIntersecting, entry.target);
          }
        }, {
          root: scrollable,
          threshold: 1
        });
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

  r('_highlightTitle -> itemUpdated', o.pt._highlightTitle.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.switchMap(a => outputTable.l.itemById.pipe(
      rx.take(1),
      rx.map(([, byId]) => [...a, byId.get(a[1])] as const)
    )),
    rx.tap(([m, , , item]) => {
      if (item)
        o.dpf.itemUpdated(m, {...item, highlighted: true});
    }),
    rx.scan((prev, curr) => {
      const [, id, el, item] = prev as typeof curr;
      const [meta] = curr;
      o.dpf.unhighlightTitle(meta, id, el);
      o.dpf.highlightTitle(...(curr as unknown as InferMapParam<TocHLEvents, 'highlightTitle'>));
      if (item)
        o.dpf.itemUpdated(meta, {...item, highlighted: false});
      return curr;
    })
  ));
  return tocTitleHighlight;
}

