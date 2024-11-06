"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.infiniteFlexContainerFac = void 0;
const rx = __importStar(require("rxjs"));
const lazy_load_placeholder_1 = require("./lazy-load-placeholder");
const flex_container_1 = require("./flex-container");
const text_1 = require("./text");
exports.infiniteFlexContainerFac = flex_container_1.flexContainerFac.forExtend({
    name: 'infiniteFlex'
}).defineReactor((init, handler, opts) => {
    const service = init(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.core));
    const { s, r } = service;
    const { service: lazyService, before: beforePH, after: afterPH } = (0, lazy_load_placeholder_1.createPlaceHolder)(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.lazyLoad));
    s.ft.addChild(beforePH, afterPH).dp();
    const items = new Map();
    const pageLoaded = new Set();
    const textOptions = Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.textWidget);
    r('lazyService.dp_onLoadPage ->', lazyService.s.pt.dp_onLoadPage.pipe(rx.mergeMap(([m, pageIdx, _type]) => handler(pageIdx).pipe(rx.takeUntil(lazyService.s.pt.dp_onCancelLoad.pipe(rx.filter(([, page]) => page === pageIdx))), rx.reduce((all, it) => {
        all.push(it);
        return all;
    }, []), rx.map(itemWithKey => {
        for (const [k, comp] of itemWithKey) {
            if (items.has(k)) {
                service.log('current item of ', k);
                throw new Error(`Duplicate key is used on different rows, key: "${itemWithKey.map(([key]) => key).join()}"`);
            }
            items.set(k, typeof comp === 'string' ?
                text_1.textWidgetFac.create(comp, textOptions) :
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
//# sourceMappingURL=infinit-flex-container.js.map