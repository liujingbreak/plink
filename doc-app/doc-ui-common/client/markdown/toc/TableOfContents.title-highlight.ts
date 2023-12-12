import * as rx from 'rxjs';
import {ExtendedReactorCompositeType} from '@wfh/reactivizer';
import {TocControl} from './TableOfContents.control';

interface TocHLActions {
  updateSectionRectangleIntervals(sections: Record<string, [top: number, bottom: number]>): void;
}

interface TocHLEvents {
  gotHeadingByIds(data: Map<string, readonly [number, Element]>): void;
  onHeadingIntersecting(isIntersecting: boolean, el: Element): void;
  gotIntersectDirection(isDown: boolean): void;
}

export function applyHighlightFeature(tocControl: TocControl) {
  const tocTitleHighlight = tocControl as unknown as ExtendedReactorCompositeType<TocControl, TocHLActions, TocHLEvents>;
  const {r, i, o, outputTable} = tocTitleHighlight;
  const intersectionsInId = new Set<string>();
  r('onHeadingIntersecting', o.pt.onHeadingIntersecting.pipe(
    rx.filter(([, isIntersecting]) => !isIntersecting),
    rx.scan((prev: Element | null, [m, , el]) => {
      if (prev == null)
        o.dpf.gotIntersectDirection(m, true);
      return el;
    }, null)
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
            o.dpf.onHeadingIntersecting(m, entry.isIntersecting, entry.target);
            if (entry.isIntersecting)
              intersectionsInId.add(entry.target.id);
            else
              intersectionsInId.delete(entry.target.id);
          }
        }, {
          root: scrollable,
          threshold: 1
        });
        const els = container.querySelectorAll('[data-mdt]');
        const headingElsById = new Map<string, readonly [number, Element]>((function*() {
          for (let i = 0; i < els.length; i++) {
            const el = els.item(i);
            yield [el.id, [i, el]] as const;
          }
        })());
        o.dpf.gotHeadingByIds(m, headingElsById);
        els.forEach(el => {
          obs.observe(el);
        });

        return () => els.forEach(el => obs.unobserve(el));
      }))
    ))
  ));
  return tocTitleHighlight;
}

