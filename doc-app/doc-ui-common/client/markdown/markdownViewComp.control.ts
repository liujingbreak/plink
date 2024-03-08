import {SingleActionFactory, ReactorComposite2, actionRelatedToAction} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import {useAppLayout} from '../components/appLayout.control';
import {Router} from '../animation/AnimatableRoutes.hooks';
import {LoaderRecivedData} from '../../isom/md-types';
import {markdownsControl} from './markdownSlice';

export type Actions = {
  setMarkdownKey(key: string): SingleActionFactory;
  setMermaidClassName(n: string): SingleActionFactory;
  setMarkdownBodyRef(div: HTMLDivElement | null, forMdKey: string): SingleActionFactory;
  setRouter(router: Router): SingleActionFactory;
  setLayoutControl(layout: NonNullable<ReturnType<typeof useAppLayout>>): SingleActionFactory;
  setScrollTopHandler(cb: () => void): SingleActionFactory;
  handleTogglePopup(isOn: boolean, toggleIcon: (isOn: boolean) => void): SingleActionFactory;
  setFileInputRef(el: HTMLInputElement | null): SingleActionFactory;
  /** true if there are at least one head item in TOC list data */
  hasToc(mdKey: string, yes: boolean): SingleActionFactory;
};

export interface Events {
  markdownDataLoaded(data: LoaderRecivedData): SingleActionFactory;
  /** mermaide, anchors are all renderred */
  htmlRenderredFor(key: string): SingleActionFactory;
  scrollToTop(): SingleActionFactory;
  setFileInputVisible(visible: boolean): SingleActionFactory;
  setSwitchAnimTemplates(
    updatedKey: string | null,
    map: Map<string, SwitchTemplateType>
  ): SingleActionFactory;
}

export type SwitchTemplateType = {
  mdKey: string;
  onBodyRef(ref: HTMLDivElement | null): void;
  reactHtmlProp?: {__html: string};
  hasToc: boolean;
};

export function createMarkdownViewControl(touchUiState: (s: any) => void) {
  const inputTableFor = [
    'setScrollTopHandler', 'setLayoutControl', 'setMarkdownKey',
    'setMermaidClassName', 'setRouter', 'setMarkdownBodyRef', 'setFileInputRef'
  ] as const;

  const outputTableFor = [
    'setFileInputVisible', 'markdownDataLoaded', 'htmlRenderredFor',
    'setSwitchAnimTemplates'
  ] as const;

  const composite = new ReactorComposite2<Actions, Events, typeof inputTableFor, typeof outputTableFor>({
    name: 'MarkdownView',
    outputTableFor,
    inputTableFor,
    debug: process.env.NODE_ENV === 'development'
  });

  const {i, r, inputTable, o, outputTable} = composite;

  const markdownRefBykey = new Map<string, HTMLDivElement>();

  let mermaidIdSeed = 0;
  r('setMarkdownBodyRef, setMarkdownKey, setMermaidClassName, setRouter, markdownDataLoaded -> htmlRenderredFor',
    rx.combineLatest([
      // i.pt.setMarkdownBodyRef.pipe( rx.filter(([, dom]) => dom != null)),
      inputTable.l.setMarkdownKey,
      inputTable.l.setMermaidClassName,
      inputTable.l.setRouter.pipe(
        rx.filter(([, r]) => r.control != null && r.matchedRoute?.path != null),
        rx.map(([, r]) => r),
        rx.distinctUntilChanged((a, b) => a.matchedRoute === b.matchedRoute)
      )
    ]).pipe(
      rx.filter(([[, key], , router]) => router.matchedRoute?.matchedParams.mdKey === key),
      rx.mergeMap(([[m2, key], [, mermaidClassName], router]) =>
        outputTable.l.markdownDataLoaded.pipe(
          actionRelatedToAction(m2),
          rx.take(1),
          rx.mergeMap(action => outputTable.l.setSwitchAnimTemplates.pipe(
            rx.take(1),
            rx.map(tempatesAction => [action, tempatesAction] as const)
          )),
          rx.map(([action, [, , templates]]) => {
            const [m, {html}] = action;
            templates.set(key, {
              mdKey: key,
              onBodyRef(ref) {
                if (ref && key)
                  i.ft.setMarkdownBodyRef(ref, key).dp();
              },
              reactHtmlProp: {__html: html},
              hasToc: false
            });
            o.ft.setSwitchAnimTemplates(key, templates).dp(m);
            return action;
          }),
          rx.delay(50),
          rx.mergeMap(loadedAction => {
            return inputTable.l.setMarkdownBodyRef.pipe(
              rx.filter(() => markdownRefBykey.has(key)),
              rx.take(1),
              rx.map(() => [loadedAction, markdownRefBykey.get(key)] as const)
            );
          }),
          rx.mergeMap(([[m, {links, mermaids: mermaidTexts}], containerDom]) => {
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
            if (links) {
              markdownsControl.i.ft.registerFiles(links).dp(m);
            }

            containerDom!.querySelectorAll('a').forEach(el => {
              const hash = el.getAttribute('data-md-hash');
              if (hash) {
                el.setAttribute('href', '#');
                const handleAnchor = (event: MouseEvent) => {
                  router.control!.ft.navigateToRel(encodeURIComponent(hash)).dp();
                  event.stopPropagation();
                  event.preventDefault();
                };
                removeAnchorListener.push(() => el.removeEventListener('click', handleAnchor));
                el.addEventListener('click', handleAnchor);
              }
            });
            if ((router.matchedRoute!.isPopState !== true && !router.matchedRoute?.location.hash )) {
              o.ft.scrollToTop().dp(m2);
            }
            o.ft.htmlRenderredFor(key).dp(m, m2);
            return new rx.Observable(() => {
              return () => {
                removeAnchorListener.forEach(cb => cb());
              };
            });
          })
        ))
    ));

  r('', i.pt.setMarkdownBodyRef.pipe(
    rx.tap(([, div, key]) => {
      if (div) {
        markdownRefBykey.set(key, div);
      }
    })
  ));

  r('scrollToTop, setScrollTopHandler ->', o.pt.scrollToTop.pipe(
    rx.switchMap(a => inputTable.l.setScrollTopHandler.pipe(rx.take(1), rx.map(b => [a, b] as const))),
    rx.delay(100),
    rx.tap(([, [, scrollToTop]]) => scrollToTop())
  ));

  r('markdownsControl::htmlByKey -> markdownDataLoaded', inputTable.l.setMarkdownKey.pipe(
    rx.mergeMap(payload => inputTable.l.setLayoutControl.pipe(
      rx.take(1),
      rx.map(([, layout]) => {
        layout.i.ft.setLoadingVisible(true).dp();
        return [payload, layout] as const;
      })
    )),
    rx.switchMap(([[m1, key], layout]) => markdownsControl.o.pt.htmlByKey.pipe(
      rx.map(([m2, map]) => [m1, m2, map.get(key)] as const),
      rx.filter((data): data is [typeof data[0], typeof data[1], NonNullable<typeof data[2]>] => data[2] != null),
      rx.tap(([m1, m2, data]) => {
        o.ft.markdownDataLoaded(data).dp(m1, m2);
        layout.i.ft.setLoadingVisible(false).dp(m1, m2);
      })
    ))
  ));

  r('markdownDataLoaded, layout.onTopAppBarRaisedShown -> layout.updateBarTitle', o.pt.markdownDataLoaded.pipe(
    rx.switchMap(map => inputTable.l.setLayoutControl.pipe(
      rx.take(1),
      rx.map(b => [map, b] as const)
    )),
    rx.switchMap(([[m, data], [, layout]]) => layout.outputTable.l.onTopAppBarRaisedShown.pipe(
      rx.tap(([, raised]) => layout.i.ft.updateBarTitle(raised ? data.toc[0].text : '').dp(m))
    ))
  ));

  r('setRouter -> setFileInputVisible', i.pt.setRouter.pipe(
    rx.map(([m, r]) => {
      return [m, r.matchedRoute?.path === '/markdown/open'] as const;
    }),
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.tap(([m, visible]) => {
      o.ft.setFileInputVisible(visible).dp(m);
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
          function listener(_event: Event) {
            if (ref?.files)
              sub.next(ref);
          }
          ref.addEventListener('change', listener);
          return () => ref.removeEventListener('change', listener);
        });
      }
      return rx.EMPTY;
    })
  ));

  // r('setMarkdownKey, markdownDataLoaded -> setSwitchAnimTemplates', i.pt.setMarkdownKey.pipe(
  //   rx.concatMap(([m, key]) => outputTable.l.markdownDataLoaded.pipe(
  //     actionRelatedToAction(m),
  //     rx.take(1),
  //     rx.withLatestFrom(outputTable.l.setSwitchAnimTemplates),
  //     rx.tap(([[, {html}], [, , templates]]) => {
  //       if (key) {
  //         templates.set(key, {
  //           mdKey: key,
  //           onBodyRef(ref) {
  //             if (ref && key)
  //               i.ft.setMarkdownBodyRef(ref, key).dp();
  //           },
  //           reactHtmlProp: {__html: html},
  //           hasToc: false
  //         });
  //         o.ft.setSwitchAnimTemplates(key, templates).dp(m);
  //       }
  //     })
  //   ))
  // ));

  r('hasToc -> setSwitchAnimTemplates', i.pt.hasToc.pipe(
    rx.switchMap(([m, key, yes]) => outputTable.l.setSwitchAnimTemplates.pipe(
      rx.take(1),
      rx.tap(([, , templates]) => {
        const old = templates.get(key)!;
        templates.set(key, {...old, hasToc: yes});
        o.ft.setSwitchAnimTemplates(key, templates).dp(m);
      })
    ))
  ));
  o.ft.setSwitchAnimTemplates(null, new Map()).dp();
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
