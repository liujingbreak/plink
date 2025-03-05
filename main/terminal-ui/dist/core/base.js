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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseComponentFac = exports.tableForBase = exports.DisplayMode = void 0;
/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
var DisplayMode;
(function (DisplayMode) {
    DisplayMode[DisplayMode["visible"] = 0] = "visible";
    /** like CSS display:none, does not take any space in layout */
    DisplayMode[DisplayMode["none"] = 1] = "none";
    /** it does take space in layout, but with empty content */
    DisplayMode[DisplayMode["hidden"] = 2] = "hidden";
})(DisplayMode || (exports.DisplayMode = DisplayMode = {}));
exports.tableForBase = [
    'onSize', 'onTransform', 'onPosition', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender',
    'setPreferredSize', 'setFlexGrow', 'ofCanvas', 'setDisplay', 'onBoundingBox', 'onDetached', 'setFlexShrink', 'render', 'setFocusStyle',
    'setBackground', 'onBgChangeWithParent', 'bgCleared', 'setFocusable', 'setRenderChanges', 'isContainer', 'depth', 'focusService'
];
/** Do not prepend controller to returned service, otherwise interceptor won't work */
exports.baseComponentFac = new reactivizer_1.BaseReactorFactory({
    debugExcludeTypes: [
        'ofCanvas', '_saveTransform',
        'queryAbsBounding', 'didQueryAbsBounding'
    ],
    tableFor: exports.tableForBase
}).interceptorByType(ad => {
    return rx.merge(ad.at.onPosition.pipe(rx.distinctUntilChanged(({ p: [ax, ay] }, { p: [bx, by] }) => {
        return ax === bx && ay === by;
    })), ad.at.onSize.pipe(rx.distinctUntilChanged(({ p: [ax, ay] }, { p: [bx, by] }) => {
        return ax === bx && ay === by;
    })), ad.at.onContentSizeChange.pipe(rx.distinctUntilChanged(({ p: [ax, ay] }, { p: [bx, by] }) => {
        return ax === bx && ay === by;
    })), ad.at.setBackground.pipe(rx.distinctUntilChanged(({ p: [a] }, { p: [b] }) => a === b)), ad.at.setDisplay.pipe(rx.distinctUntilChanged(({ p: [a] }, { p: [b] }) => a === b)), ad.at.setFocusStyle.pipe(rx.distinctUntilChanged(({ p: [a] }, { p: [b] }) => a === b)), ad.at.needRerender.pipe(rx.distinctUntilChanged(({ p: [a] }, { p: [b] }) => a === b)), ad.at.bgCleared.pipe(rx.distinctUntilChanged(({ p: [a] }, { p: [b] }) => a === b)), ad.at.setFocusable.pipe(rx.distinctUntilChanged(({ p: [a] }, { p: [b] }) => {
        return a === b;
    })), ad.at.setFlexGrow.pipe(rx.distinctUntilChanged(({ p: [v1] }, { p: [v2] }) => v1 === v2)), ad.at.setFlexShrink.pipe(rx.distinctUntilChanged(({ p: [v1] }, { p: [v2] }) => v1 === v2)), ad.ofOtherTypes());
}).defineReactor(init => {
    const service = init();
    const { ft, at, pt, r, s, table, latest } = service;
    r('_saveTransform -> onTransform', rx.merge(pt._saveTransform.pipe(rx.distinctUntilChanged(([, t1], [, t2]) => gl_matrix_1.mat4.equals(t1, t2)), rx.map(([m, t]) => ft.onTransform(t).dp(m)))));
    r('setPreferredSize, onContentSizeChange -> preferredSize', rx.combineLatest([
        latest.setPreferredSize, pt.onContentSizeChange
    ]).pipe(rx.map(([[, w, h], [, cW, cH]]) => {
        const override = [cW, cH];
        if (w != null && cW !== w)
            override[0] = w;
        if (h != null && cH !== h)
            override[1] = h;
        return override;
    }), rx.distinctUntilChanged((a, b) => a[0] === b[0] && a[1] === b[1]), rx.map(([w, h]) => {
        ft.preferredSize(w, h).dp();
    })));
    r('addRerenderAction', rx.merge(pt.addRerenderAction.pipe(rx.mergeMap(([, action$]) => action$))).pipe(rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? actionOrPayload[0] : actionOrPayload;
        ft.needRerender(true).dp(m);
    })));
    r('setSize,onSize,setParent -> setPreferredSize', pt.setSize.pipe(rx.switchMap(([m, w, h]) => {
        if (typeof w === 'string' && typeof h === 'string') {
            const percW = /(\d+)%/.exec(w)[0];
            const percH = /(\d+)%/.exec(h)[0];
            return latest.setParent.pipe(rx.switchMap(([, p]) => p ?
                p.latest.onSize.pipe(rx.map(([, w0, h0]) => {
                    ft.setPreferredSize(Math.round(w0 * Number(percW) / 100), Math.round(h0 * Number(percH) / 100)).dp(m);
                })) :
                rx.EMPTY));
        }
        else if (typeof w === 'string') {
            const percW = /(\d+)%/.exec(w)[0];
            return latest.setParent.pipe(rx.switchMap(([, p]) => p ?
                p.latest.onSize.pipe(rx.map(([, w0]) => {
                    ft.setPreferredSize(Math.round(w0 * Number(percW) / 100), h).dp(m);
                })) :
                rx.EMPTY));
        }
        else if (typeof h === 'string') {
            const percH = /(\d+)%/.exec(h)[0];
            return latest.setParent.pipe(rx.switchMap(([, p]) => p ?
                p.latest.onSize.pipe(rx.map(([, , h0]) => {
                    ft.setPreferredSize(w, Math.round(h0 * Number(percH) / 100)).dp(m);
                })) :
                rx.EMPTY));
        }
        else {
            ft.setPreferredSize(w, h).dp(m);
            return rx.EMPTY;
        }
    })));
    let lastClips;
    r('render -> needRerender, onRender, onBoundingBox', pt.render.pipe(rx.withLatestFrom(latest.needRerender, latest.onSize, latest.setDisplay), rx.map(([[m, canvas, trans, clips, masks], [, renderSelf], [, width, height], [, display]]) => {
        ft._saveTransform(trans).dp(m);
        if (renderSelf) {
            ft.needRerender(false).dp(m);
        }
        const pos = [0, 0];
        gl_matrix_1.vec2.transformMat4(pos, pos, trans);
        const bounding = [pos[0], pos[1], width, height];
        ft.onBoundingBox(bounding).dp(m);
        if (width === 0 || height === 0)
            return;
        if (display === DisplayMode.hidden) {
            ft.clear(canvas, trans).dp(m);
        }
        else {
            clips = clips !== null && clips !== void 0 ? clips : [[0, 0, width, height]];
            ft.beforeRender(canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
            const needRerender = !!table.getData().needRerender[0];
            if (!renderSelf && !needRerender) {
                // service.log('--lastClips', lastClips, ',clips', clips);
                const isClipChanged = lastClips == null || (clips != null && (lastClips.length !== clips.length || !isRectangeCover(lastClips[0], clips[0])));
                if (isClipChanged) {
                    renderSelf = true;
                }
            }
            ft.onRender(canvas, trans, renderSelf || needRerender, clips, masks).dp(m);
            if (needRerender)
                ft.needRerender(false).dp(m);
        }
        ft.bgCleared(false).dp(m);
        lastClips = clips;
    })));
    r('clear... -> bgCleared...', pt.clear.pipe(rx.withLatestFrom(latest.onSize, latest.onBgChangeWithParent, latest.bgCleared), rx.map(([[m, canvas, trans], [m2, width, height], [m3, bg], [m4, cleared]], _idx) => {
        const pos = [0, 0];
        gl_matrix_1.vec2.transformMat4(pos, pos, trans);
        // service.log('>> clear bg:', bg, 'bgCleared:', cleared);
        if (bg) {
            const fill = ' '.repeat(width);
            for (let i = 0; i < height; i++) {
                canvas.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
            }
        }
        else if (!cleared) {
            canvas.ft.clearRect(pos[0], pos[1], width, height).dp(m);
        }
        ft.bgCleared(true).dp(m, m2, m3, m4);
    })));
    r('setParent, error$, parent.destory$,parent.bgCleared... -> parent.onChildError, dispose()...', latest.setParent.pipe(rx.switchMap(([m, parent]) => {
        if (parent == null) {
            ft.ofCanvas(null).dp(m);
            ft.onDetached(true).dp(m);
            ft.depth(0).dp(m);
            return rx.EMPTY;
        }
        return rx.merge(parent.latest.depth.pipe(rx.map(([mp, d]) => ft.depth(d + 1).dp(mp))), parent.latest.onDetached.pipe(rx.map(([m, d]) => {
            ft.onDetached(d).dp(m);
        })), parent.latest.hasOfflineCanvas.pipe(rx.switchMap(([, has]) => has ?
            rx.EMPTY :
            parent.pt.bgCleared.pipe(rx.map(([m, cleared]) => {
                if (cleared) {
                    ft.bgCleared(true).dp(m);
                    ft.needRerender(true).dp(m);
                }
            })))), parent.latest.ofCanvas.pipe(rx.map(([m, canvas]) => ft.ofCanvas(canvas).dp(m))), service.error$.pipe(rx.tap(errInfo => parent.ft.onChildError(service.s.logPrefix, errInfo))), parent.destory$.pipe(rx.map(() => service.dispose())), parent.pt.needRerenderTree.pipe(rx.map(([m]) => ft.needRerenderTree().dp(m))));
    })));
    r('setParent,setBackground,parent.onBgChangeWithParent -> onBgChangeWithParent', rx.combineLatest([
        latest.setParent.pipe(rx.switchMap(([, parent]) => { var _a; return (_a = parent === null || parent === void 0 ? void 0 : parent.latest.onBgChangeWithParent) !== null && _a !== void 0 ? _a : rx.of([null, null]); })),
        latest.setBackground
    ]).pipe(rx.map(([[m, pBg], [m2, ownBg]]) => {
        if (ownBg)
            ft.onBgChangeWithParent(ownBg).dp(m2);
        else if (m && pBg)
            ft.onBgChangeWithParent(pBg).dp(m, m2);
        else
            ft.onBgChangeWithParent(null).dp(m2);
    })));
    // dispatch onRectChange to offsetParent when setFocusable is not false or "isOffsetParent" is true
    /* r('offsetParent, isOffsetParent, setFocusable -> onRectChange, removeFocusable', latest.offsetParent.pipe(
      rx.distinctUntilChanged(([, a], [, b]) => a === b),
      rx.switchMap(([m, op]) => {
        if (op) {
          return rx.combineLatest([
            latest.setFocusable,
            latest.isOffsetParent
          ]).pipe(
            rx.switchMap(([[m2, focusable], [m1, isOffsetParent]]) => {
              // service.log('>>> dispatch onRectChange for', focusable, 'isOffsetParent', isOffsetParent);
              if (focusable) {
                if (focusable === true) {
                  // service.log('>>> let me queryAbsBounding');
                  return ft.queryAbsBounding(op as TerminalContainer & OffsetParent)
                    .re(m, m2, m1)
                    .od(pt.didQueryAbsBounding).pipe(
                      rx.filter(([, r]) => r != null),
                      rx.map(([, r]) => {
                        // service.log('>>> onRectChange', r, service.opts?.name);
                        op.focusService.ft.onRectChange(r!, service).dp(m1, m2, m);
                      })
                    );
                } else {
                  return ft.queryAbsBounding(op as TerminalContainer & OffsetParent).re(
                    m, m2, m1
                  ).od(
                    pt.didQueryAbsBounding
                  ).pipe(
                    rx.filter(([, r]) => r != null),
                    rx.map(([, r]) => {
                      const [x, y] = r!;
                      const rect = focusable;
                      op.focusService.ft.onRectChange([rect[0] + x, rect[1] + y, rect[2], rect[3]], service).dp(m2, m1, m);
                    })
                  );
                }
              } else if (isOffsetParent) {
                return ft.queryAbsBounding(op as TerminalContainer & OffsetParent)
                  .re(m, m2, m1).od(
                    pt.didQueryAbsBounding
                  ).pipe(
                    rx.filter(([, r]) => r != null),
                    rx.map(([, r]) => {
                      op.focusService.ft.onRectChange(r!, service).dp(m1, m2, m);
                    })
                  );
              } else {
                op.focusService.ft.removeFocusable(service).dp(m, m1, m2);
                return rx.EMPTY;
              }
            }),
            rx.finalize(() => {
              op.focusService.ft.removeFocusable(service).dp(m);
            })
          );
        }
        return rx.EMPTY;
      })
    )); */
    function disableParentFocusable(thisComp, m) {
        return thisComp.latest.setParent.pipe(rx.switchMap(([, p]) => p ? rx.merge(disableParentFocusable(p, m), p.latest.setFocusable.pipe(rx.take(1), rx.map(([, isFocusable]) => {
            if (isFocusable)
                p.ft.setFocusable(false).dp(m);
        }))) : rx.EMPTY));
    }
    r('setFocusable', pt.setFocusable.pipe(rx.switchMap(([m, focusable]) => focusable ?
        rx.merge(disableParentFocusable(service, m), latest.focusService.pipe(rx.switchMap(([, focusSvc]) => focusSvc.latest.forRootComp.pipe(rx.map(([, rootComp]) => [focusSvc, rootComp]))), rx.switchMap(([focusSvc, rootComp]) => ft.queryAbsBounding(rootComp).re(m).od(pt.didQueryAbsBounding).pipe(rx.switchMap(([, r]) => {
            return new rx.Observable(() => {
                if (r) {
                    if (focusable) {
                        focusSvc.ft.onRectChange(r, service).dp(m);
                    }
                    else {
                        const [x, y] = r;
                        const rect = focusable;
                        focusSvc.ft.onRectChange([rect[0] + x, rect[1] + y, rect[2], rect[3]], service).dp(m);
                    }
                }
                return () => {
                    focusSvc.ft.removeFocusable(service).dp(m);
                };
            });
        }))))) :
        rx.EMPTY)));
    // Refer "rootService" to offset parent's focusService's "rootService"
    r('queryAbsBounding -> didQueryAbsBounding', pt.queryAbsBounding.pipe(rx.mergeMap(([m, topParent]) => rx.combineLatest([
        latest.setParent,
        latest.onPosition,
        latest.onSize.pipe(rx.distinctUntilChanged(([, aw, ah], [, bw, bh]) => aw === bw && ah === bh))
    ]).pipe(rx.switchMap(([[, p], [, x, y], [, w, h]]) => {
        if (x == null || y == null) {
            ft.didQueryAbsBounding(null).dp(m);
            return rx.EMPTY;
        }
        if (p == null) {
            ft.didQueryAbsBounding([x, y, w, h]).dp(m);
            return rx.EMPTY;
        }
        if (topParent != null && topParent === p) {
            ft.didQueryAbsBounding([x, y, w, h]).dp(m);
            return rx.EMPTY;
        }
        else {
            return p.ft.queryAbsBounding(topParent).re(m).od(p.pt.didQueryAbsBounding).pipe(rx.switchMap(([m2, r]) => {
                if (r == null) {
                    ft.didQueryAbsBounding([x, y, w, h]).dp(m, m2);
                    return rx.EMPTY;
                }
                const [px, py] = r;
                const scrollData = p.table.getData().onValidScroll;
                // service.log('queryAbsBounding()', s.logPrefix, 'has scrollData', scrollData);
                // eslint-disable-next-line prefer-const
                if ((scrollData === null || scrollData === void 0 ? void 0 : scrollData[0]) != null) {
                    return p.latest.onValidScroll.pipe(rx.map(([, scrLeft, scrTop]) => {
                        const res = [x + px - scrLeft, y + py - scrTop, w, h];
                        ft.didQueryAbsBounding(res).dp(m, m2);
                    }));
                }
                const res = [x + px, y + py, w, h];
                ft.didQueryAbsBounding(res).dp(m, m2);
                return rx.EMPTY;
            }));
        }
    }), rx.takeUntil(s.onCancelOf(m))))));
    r('onDetached -> focusService.removeFocusable', pt.onDetached.pipe(rx.withLatestFrom(latest.setFocusable, latest.focusService), rx.map(([[m], [, focusable], [, focusSvc]]) => {
        if (focusable && focusSvc)
            focusSvc.ft.removeFocusable(service).dp(m);
    })));
    r('setRenderChanges -> needRerender', pt.setRenderChanges.pipe(rx.switchMap(([, list]) => rx.merge(list.map(it => it.pipe(rx.skip(1))))), rx.mergeMap(o => o), rx.map(([m]) => {
        ft.needRerender(true).dp(m);
        return m;
    }), rx.withLatestFrom(table.l.ofCanvas), rx.map(([m, [, canvas]]) => {
        canvas === null || canvas === void 0 ? void 0 : canvas.ft.requestRender().dp(m);
    })));
    r('needRerenderTree -> needRerender', pt.needRerenderTree.pipe(rx.map(([m]) => ft.needRerender(true).dp(m))));
    let contextData;
    r('provideContext', pt.provideContext.pipe(rx.map(([, key, value]) => {
        if (contextData == null)
            contextData = new Map();
        contextData.set(key, value);
    })));
    r('queryContext -> onContextChange', pt.queryContext.pipe(rx.mergeMap(([m, key]) => {
        return rx.concat(rx.of((contextData === null || contextData === void 0 ? void 0 : contextData.has(key)) ?
            contextData.get(key) :
            undefined), pt.provideContext.pipe(rx.filter(([, k]) => k === key), rx.map(([, , v]) => v))).pipe(rx.switchMap(value => value !== undefined ?
            rx.of(value) :
            latest.setParent.pipe(rx.switchMap(([, p]) => p ?
                p.ft.queryContext(key).re(m).od(p.pt.onContextChange).pipe(rx.map(([, , v]) => v)) :
                rx.of(undefined)))), rx.map(v => ft.onContextChange(key, v).dp(m)), rx.takeUntil(service.s.onCancelOf(m)));
    })));
    r('provideFocusService,parent.focusService,queryAbsBounding...', pt.provideFocusService.pipe(rx.switchMap(([m, focusSvc]) => {
        ft.provideContext('focusSvc', focusSvc).dp(m);
        return latest.setParent.pipe(rx.switchMap(([, p]) => p ? p.latest.focusService : rx.EMPTY), rx.switchMap(([, pFocusSvc]) => {
            // disableParentFocusable(service, m),
            return pFocusSvc.latest.forRootComp.pipe(rx.map(([, root]) => [pFocusSvc, root]));
        }), rx.switchMap(([pFocusSvc, root]) => {
            return rx.merge(pFocusSvc.pt.pauseHandleEvents.pipe(rx.map(([ms]) => focusSvc.ft.pauseHandleEvents().dp(ms))), pFocusSvc.pt.resumeHandleEvents.pipe(rx.map(([ms]) => focusSvc.ft.resumeHandleEvents().dp(ms))), ft.queryAbsBounding(root).re(m)
                .od(pt.didQueryAbsBounding).pipe(rx.filter(([, r]) => r != null), rx.map(([, r]) => {
                service.log('--- onRectChange for context focusSvc', r, service.s.logPrefix);
                pFocusSvc.ft.onRectChange(r, service).dp(m);
            }), rx.finalize(() => {
                pFocusSvc.ft.removeFocusable(service).dp(m);
            })));
        }));
    })));
    r('focus', pt.focus.pipe(rx.exhaustMap(([m]) => table.l.focusService.pipe(rx.take(1), rx.map(([, focus]) => focus.ft.focusOnComponent(service).dp(m))))));
    const lastStopFocusPropaAction = new Set();
    r('stopEventPropagation', pt.stopEventPropagation.pipe(rx.map(([m]) => {
        if (Array.isArray(m.r)) {
            for (const i of m.r)
                lastStopFocusPropaAction.add(i);
        }
        else if (m.r != null) {
            lastStopFocusPropaAction.add(m.r);
        }
        else {
            throw new Error('stopEventPropagation must be dispatched with related action meta');
        }
    })));
    r('onFocus,stopEventPropagation -> parent.onFocus', rx.merge(at.onFocus, at.onBlur).pipe(rx.mergeMap(a => {
        return new rx.Observable(sub => {
            setTimeout(() => {
                // service.log('-- lastStopFocusPropaAction', m.i, lastStopFocusPropaAction);
                if (!lastStopFocusPropaAction.has(a.i)) {
                    // service.log('-- propagation', m.i);
                    sub.next();
                }
                else {
                    lastStopFocusPropaAction.delete(a.i);
                }
                sub.complete();
            }, 0);
        }).pipe(rx.switchMap(() => latest.setParent), rx.take(1), rx.map(([, p]) => {
            if (p) {
                const pa = s.createAction(a.t, a.p);
                p.s.actionUpstream.next(pa);
            }
        }));
    })));
    const renderData = [
        latest.setDisplay,
        // latest.onSize,
        latest.setBackground
    ];
    r('-> focusService', ft.queryContext('focusSvc').od(pt.onContextChange).pipe(rx.map((([m, , v]) => {
        if (v != null)
            ft.focusService(v).dp(m);
    }))));
    r('init', new rx.Observable(() => {
        ft.depth(0).dp();
        ft.bgCleared(false).dp();
        ft.onPosition(null, null).dp();
        ft.setFocusStyle('inverse').dp();
        // ft.isOffsetParent(false).dp();
        // ft.offsetParent(null).dp();
        ft.setFlexGrow(0).dp();
        ft.setFlexShrink(1).dp();
        ft.setPreferredSize(null, null).dp();
        ft.needRerender(true).dp();
        ft.setParent(null).dp();
        ft.ofCanvas(null).dp();
        ft.setDisplay(DisplayMode.visible).dp();
        ft.onBoundingBox([0, 0, 0, 0]).dp();
        ft.setFocusable(false).dp();
        ft.onDetached(true).dp();
        ft.setBackground(null).dp();
        ft.isContainer(false).dp();
        ft.onBgChangeWithParent(null).dp();
        ft.setRenderChanges(renderData).dp();
    }));
});
// export interface OffsetParent {
//   focusService: FocusService;
// }
function isRectangeCover(covering, covered) {
    return covering[0] <= covered[0] && covering[0] + covering[2] >= covered[0] + covered[2] &&
        covering[1] <= covered[1] && covering[1] + covering[3] >= covered[1] + covered[3];
}
//# sourceMappingURL=base.js.map