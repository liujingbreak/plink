import * as rx from 'rxjs';
import { createPlaceHolder } from './lazy-load-placeholder.js';
import { flexContainerFac } from './flex-container.js';
import { textWidgetFac } from './text.js';
export const infiniteFlexContainerFac = flexContainerFac.forExtend({
    name: 'infiniteFlex'
}).defineReactor(({ init, setting: opts }, handler) => {
    const service = init(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.core));
    const { s, r } = service;
    const { service: lazyService, before: beforePH, after: afterPH } = createPlaceHolder(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.lazyLoad));
    s.ft.addChild(beforePH, afterPH).dp();
    const items = new Map();
    const pageLoaded = new Set();
    const textOptions = Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.textWidget);
    r('lazyService.dp_onLoadPage ->', lazyService.s.pt.dp_onLoadPage.pipe(rx.mergeMap(([m, pageIdx]) => handler(pageIdx).pipe(rx.takeUntil(lazyService.s.pt.dp_onCancelLoad.pipe(rx.filter(([, page]) => page === pageIdx))), rx.reduce((all, it) => {
        all.push(it);
        return all;
    }, []), rx.map(itemWithKey => {
        for (const [k, comp] of itemWithKey) {
            if (items.has(k)) {
                service.log('current item of ', k);
                throw new Error(`Duplicate key is used on different rows, key: "${itemWithKey.map(([key]) => key).join()}"`);
            }
            items.set(k, typeof comp === 'string' ?
                textWidgetFac.setting(textOptions).create(comp) :
                comp);
        }
        if (itemWithKey.length > 0) {
            pageLoaded.add(pageIdx);
        }
        lazyService.s.ft.dp_didLoad(itemWithKey.map(([key]) => key)).dp(m);
    }), rx.catchError(err => {
        lazyService.s.ft.dp_onLoadError(err, pageIdx).dp(m, m.r);
        return rx.EMPTY;
    })))));
});
//# sourceMappingURL=infinite-flex-container.js.map