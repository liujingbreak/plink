import {ReactorComposite} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import {Router} from '../animation/AnimatableRoutes.hooks';
import {markdownsControl} from './markdownSlice';
import {TocInputDispatcher} from './toc/TableOfContents';

type Actions = {
  setMarkdownKey(key: string): void;
  setMermaidClassName(n: string): void;
  setMarkdownBodyRef(div: HTMLDivElement | null): void;
  setRouter(router: Router): void;
  setTocDispatcher(tocDp: TocInputDispatcher): void;
  setScrollTopHandler(cb: () => void): void;
};

export interface Events {
  scrollTop(): void;
}

const inputTableFor = ['setScrollTopHandler', 'setTocDispatcher', 'setMarkdownKey', 'setMermaidClassName', 'setRouter'] as const;

const outputTableFor = [] as const;

const composite = new ReactorComposite<Actions, Events, typeof inputTableFor, typeof outputTableFor>({
  name: 'MarkdownView',
  outputTableFor,
  inputTableFor,
  debug: process.env.NODE_ENV === 'development'
});

const {i, r, inputTable, o} = composite;

let mermaidIdSeed = 0;
r('group markdown by key -> htmlDone',
  rx.combineLatest([
    i.pt.setMarkdownBodyRef.pipe( rx.filter(([, dom]) => dom != null)),
    inputTable.l.setMarkdownKey,
    inputTable.l.setMermaidClassName,
    i.pt.setTocDispatcher,
    inputTable.l.setRouter.pipe(rx.filter(([, r]) => r.control != null && r.matchedRoute?.path != null))
  ]).pipe(
    rx.switchMap(([[, containerDom], [, key], [, mermaidClassName], [, tocDp], [, router]]) =>
      markdownsControl.outputTable.l.htmlByKey.pipe(
        rx.map(([m, map]) => [m, map.get(key)] as const),
        rx.filter(data => data[1] != null),
        rx.tap(([m, ret]) => {
          const {html} = ret!;
          containerDom!.innerHTML = html;
          tocDp.setMarkdownBodyRef(key, containerDom!);
        }),
        rx.delay(50),
        rx.mergeMap(([m, data]) => {
          const {mermaids: mermaidTexts} = data!;
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

          if (router.matchedRoute?.isPopState == null || !router.matchedRoute.isPopState) {
            o.dpf.scrollTop(m);
          }
          return new rx.Observable(() => {
            return () => {
              removeAnchorListener.forEach(cb => cb());
            };
          });
        })
      ))
  ));

r('scrollTop, setScrollTopHandler ->', o.pt.scrollTop.pipe(
  rx.switchMap(a => inputTable.l.setScrollTopHandler.pipe(rx.take(1), rx.map(b => [a, b] as const))),
  rx.delay(100),
  rx.tap(([, [, scrollTop]]) => scrollTop())
));

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
export {composite as markdownViewControl};

if (module.hot) {
  module.hot.dispose(_data => {
    composite.destory();
  });
}
