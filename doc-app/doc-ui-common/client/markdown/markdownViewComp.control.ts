import {ReactorComposite, payloadRelatedToAction} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import {useAppLayout} from '../components/appLayout.control';
import {Router} from '../animation/AnimatableRoutes.hooks';
import {LoaderRecivedData} from '../../isom/md-types';
import {markdownsControl} from './markdownSlice';

type Actions = {
  setMarkdownKey(key: string): void;
  setMermaidClassName(n: string): void;
  setMarkdownBodyRef(div: HTMLDivElement | null, forMdKey: string): void;
  setRouter(router: Router): void;
  setLayoutControl(layout: NonNullable<ReturnType<typeof useAppLayout>>): void;
  setScrollTopHandler(cb: () => void): void;
  handleTogglePopup(isOn: boolean, toggleIcon: (isOn: boolean) => void): void;
  setFileInputRef(el: HTMLInputElement | null): void;
};

export interface Events {
  markdownDataLoaded(data: LoaderRecivedData): void;
  /** mermaide, anchors are all renderred */
  htmlRenderredFor(key: string): void;
  scrollToTop(): void;
  setFileInputVisible(visible: boolean): void;
}

export function createMarkdownViewControl(touchUiState: (s: any) => void) {
  const inputTableFor = ['setScrollTopHandler', 'setLayoutControl', 'setMarkdownKey',
    'setMermaidClassName', 'setRouter', 'setMarkdownBodyRef', 'setFileInputRef'
  ] as const;

  const outputTableFor = ['setFileInputVisible', 'markdownDataLoaded', 'htmlRenderredFor'] as const;

  const composite = new ReactorComposite<Actions, Events, typeof inputTableFor, typeof outputTableFor>({
    name: 'MarkdownView',
    outputTableFor,
    inputTableFor,
    debug: process.env.NODE_ENV === 'development'
  });

  const {i, r, inputTable, o, outputTable} = composite;

  let mermaidIdSeed = 0;
  r('setMarkdownBodyRef, setMarkdownKey, setMermaidClassName, setRouter, markdownDataLoaded -> htmlRenderredFor',
    rx.combineLatest([
      i.pt.setMarkdownBodyRef.pipe( rx.filter(([, dom]) => dom != null)),
      inputTable.l.setMarkdownKey,
      inputTable.l.setMermaidClassName,
      inputTable.l.setRouter.pipe(
        rx.filter(([, r]) => r.control != null && r.matchedRoute?.path != null),
        rx.map(([, r]) => r),
        rx.distinctUntilChanged((a, b) => a.matchedRoute === b.matchedRoute)
      )
    ]).pipe(
      rx.filter(([[, , key0], [, key], , router]) => router.matchedRoute?.matchedParams.mdKey === key && key0 === key),
      rx.mergeMap(([[, containerDom], [m2, key], [, mermaidClassName], router]) =>
        outputTable.l.markdownDataLoaded.pipe(
          payloadRelatedToAction(m2),
          rx.take(1),
          rx.tap(([, {html}]) => {
            containerDom!.innerHTML = html;
          }),
          rx.delay(50),
          rx.mergeMap(([m, {mermaids: mermaidTexts}]) => {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            containerDom!.querySelectorAll('.language-mermaid').forEach(async (el, idx) => {
              el.id = 'mermaid-diagram-' + mermaidIdSeed++;
              const container = document.createElement('div');
              container.className = mermaidClassName;
              el.parentElement!.insertBefore(container, el);
              // Can not be moved to a Worker, mermaid relies on DOM
              const svgStr = await drawMermaidDiagram(el.id, mermaidTexts[idx]);
              container.innerHTML = svgStr;
            });

            const removeAnchorListener = [] as Array<() => void>;

            containerDom!.querySelectorAll('a').forEach(el => {
              const href = el.getAttribute('href');
              if (href && !/^\/|https?:\/\//.test(href)) {
                el.setAttribute('href', '#');
                const handleAnchor = (event: MouseEvent) => {
                  router.control!.dp.navigateToRel(href);
                  // router.control!.dp.navigateTo(router.matchedRoute!.path);
                  event.stopPropagation();
                  event.preventDefault();
                };
                removeAnchorListener.push(() => el.removeEventListener('click', handleAnchor));
                el.addEventListener('click', handleAnchor);
              }
            });
            if ((router.matchedRoute!.isPopState !== true && !router.matchedRoute?.location.hash )) {
              o.dpf.scrollToTop(m2);
            }
            o.dpf.htmlRenderredFor([m, m2], key);
            return new rx.Observable(() => {
              return () => {
                removeAnchorListener.forEach(cb => cb());
              };
            });
          })
        ))
    ));

  r('scrollToTop, setScrollTopHandler ->', o.pt.scrollToTop.pipe(
    rx.switchMap(a => inputTable.l.setScrollTopHandler.pipe(rx.take(1), rx.map(b => [a, b] as const))),
    rx.delay(100),
    rx.tap(([, [, scrollToTop]]) => scrollToTop())
  ));

  r('markdownsControl::htmlByKey -> markdownDataLoaded', inputTable.l.setMarkdownKey.pipe(
    rx.switchMap(([m1, key]) => markdownsControl.o.pt.htmlByKey.pipe(
      rx.map(([m2, map]) => [m1, m2, map.get(key)] as const),
      rx.filter((data): data is [typeof data[0], typeof data[1], NonNullable<typeof data[2]>] => data[2] != null),
      rx.tap(([m1, m2, data]) => {
        o.dpf.markdownDataLoaded([m1, m2], data);
      })
    ))
  ));

  r('markdownDataLoaded -> ', o.pt.markdownDataLoaded.pipe(
    rx.switchMap(map => inputTable.l.setLayoutControl.pipe(
      rx.take(1),
      rx.map(b => [map, b] as const)
    )),
    rx.switchMap(([[m, data], [, layout]]) => layout.outputTable.l.onTopAppBarRaisedShown.pipe(
      rx.tap(([, raised]) => layout.i.dpf.updateBarTitle(m, raised ? data.toc[0].text : ''))
    ))
  ));

  r('setRouter -> setFileInputVisible', i.pt.setRouter.pipe(
    rx.map(([m, r]) => {
      return [m, r.matchedRoute?.path === '/markdown/open'] as const;
    }),
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.tap(([m, visible]) => {
      o.dpf.setFileInputVisible(m, visible);
    })
  ));

  r('sync UI state', rx.merge(outputTable.dataChange$, inputTable.dataChange$).pipe(
    rx.tap(() => touchUiState({}))
  ));

  r('setFileInputRef', i.pt.setFileInputRef.pipe(
    rx.switchMap(([, ref]) => {
      if (ref) {
        ref.setAttribute('multiple', '');
        ref.webkitdirectory = true;
        return new rx.Observable<HTMLInputElement>(sub => {
          function listener(event: Event) {
            if (ref?.files)
              sub.next(ref);
          }
          ref.addEventListener('change', listener);
          return () => ref.removeEventListener('change', listener);
        });
      }
      return rx.EMPTY;
    }),
    rx.tap(ref => {
      console.log(ref.files);
      console.log(ref.webkitEntries);
    })
  ));

  return composite;
}

const mermaidInited = false;

async function drawMermaidDiagram(id: string, mermaidStr: string | null): Promise<string> {
  const mermaid = (await import('mermaid')).default;
  if (mermaidStr == null)
    return Promise.resolve('');
  if (!mermaidInited) {
    mermaid.initialize({
      securityLevel: 'loose',
      startOnLoad: false
    });
  }

  try {
    const {svg} = await mermaid.render(id, mermaidStr);
    return svg;
  } catch (err) {
    console.error('Failed to draw mermaid diagram', err);
    return '';
  }
}

// if (module.hot) {
//   module.hot.dispose(_data => {
//     composite.destory();
//   });
// }
