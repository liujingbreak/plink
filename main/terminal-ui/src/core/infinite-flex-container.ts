import * as rx from 'rxjs';
import {CreateOptsInDef, CoreOptions, SingleActionFactory} from '@wfh/reactivizer';
import {LazyLoadPlaceHolderOpts, createPlaceHolder} from './lazy-load-placeholder.js';
import {flexContainerFac} from './flex-container.js';
import {textWidgetFac, MultiLineTextWidgetOpts} from './text.js';
import {BaseWidget} from './base.js';

export type PageLoader = (pageIndex: number) => rx.Observable<[key: unknown, comp: (BaseWidget | string)]>;
export interface InfiniteFlexEvents {
  onItemLoaded(index: number, key: unknown, comp: BaseWidget): SingleActionFactory;
}
export type InfiniteFlexOpts = {
  default?: CoreOptions<any>;
  core?: CreateOptsInDef<InfiniteFlexEvents, typeof flexContainerFac>;
  lazyLoad?: LazyLoadPlaceHolderOpts;
  textWidget?: MultiLineTextWidgetOpts;
};
export const infiniteFlexContainerFac = flexContainerFac.forExtend<InfiniteFlexEvents>({
  name: 'infiniteFlex'
}).defineReactor((init, handler: PageLoader, opts?: InfiniteFlexOpts) => {
  const service = init({...opts?.default as any, ...opts?.core});
  const {s, r} = service;
  const {service: lazyService, before: beforePH, after: afterPH} = createPlaceHolder({
    ...opts?.default as any,
    ...opts?.lazyLoad
  });
  s.ft.addChild(beforePH, afterPH).dp();
  const items = new Map<unknown, BaseWidget | string>();
  const pageLoaded = new Set<number>();
  const textOptions = {...opts?.default as MultiLineTextWidgetOpts, ...opts?.textWidget};
  r('lazyService.dp_onLoadPage ->', lazyService.s.pt.dp_onLoadPage.pipe(
    rx.mergeMap(([m, pageIdx, _type]) => handler(pageIdx).pipe(
      rx.takeUntil(lazyService.s.pt.dp_onCancelLoad.pipe(
        rx.filter(([, page]) => page === pageIdx)
      )),
      rx.reduce((all, it) => {
        all.push(it); return all;
      }, [] as [unknown, (string | BaseWidget)][]),
      rx.map(itemWithKey => {
        for (const [k, comp] of itemWithKey) {
          if (items.has(k)) {
            service.log('current item of ', k);
            throw new Error(`Duplicate key is used on different rows, key: "${itemWithKey.map(([key]) => key as string).join()}"`);
          }
          items.set(k, typeof comp === 'string' ?
            textWidgetFac.create(comp, textOptions) :
            comp);
        }
        if (itemWithKey.length > 0) {
          pageLoaded.add(pageIdx);
        }
        lazyService.s.ft.dp_didLoad(itemWithKey.map(([key]) => key)).dp(m);
      }),
      rx.catchError(err => {
        lazyService.s.ft.dp_onLoadError(err, pageIdx).dp(m, m.r);
        return rx.EMPTY;
      })
    ))
  ));
});
