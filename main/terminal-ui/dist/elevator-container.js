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
exports.elevatorFac = void 0;
exports.createElevator = createElevator;
exports.getBoundingOfCompTree = getBoundingOfCompTree;
const rx = __importStar(require("rxjs"));
const base_1 = require("./base");
const focusable_1 = require("./focusable");
const container_1 = require("./container");
const index_1 = require("./index");
exports.elevatorFac = container_1.baseContainerFac.forExtend({
    name: 'elevator'
}).interceptorForBaseByType(ac => rx.merge(rx.merge(ac.at.onRender, ac.at.findOverlaps).pipe(rx.ignoreElements()), ac.ofOtherTypes())).defineReactor((init, opts) => {
    const service = init(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.core));
    const { s, r, table } = service;
    // let lastBottom: BaseWidget | undefined;
    /** Offline canvas by root component */
    const canvasMap = new Map();
    r('addChild,insertChild, removeChild -> "canvasMap"', rx.merge(s.pt.addChild.pipe(rx.map(([m, ...chdn]) => [m, chdn])), s.pt.insertChild.pipe(rx.map(([m, , chdn]) => [m, chdn]))).pipe(rx.mergeMap(([m, chd]) => rx.from(chd).pipe(rx.mergeMap(chd => {
        const cv = (0, index_1.createTerminalCanvas)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'Elevator.canvas' }), opts === null || opts === void 0 ? void 0 : opts.canvas));
        canvasMap.set(chd, cv);
        cv.s.ft.setRootComponent(chd).dp(m);
        return rx.merge(
        // Set chd as an "offsetParent" if it was not already an offset parent
        chd.table.l.isOffsetParent.pipe(rx.take(1), rx.map(([, isOffsetP]) => isOffsetP ? false : true), rx.filter(notOffsetParent => notOffsetParent), rx.map(() => {
            const o = chd;
            o.focusService = (0, focusable_1.createFocusService)(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.focusable));
            o.destory$.subscribe(() => o.focusService.dispose());
            s.ft.onFocusServieReady(o, o.focusService).dp(m);
        })), 
        // table.l.ofCanvas.pipe(
        //   rx.filter(([, c]) => c != null),
        //   rx.take(1),
        //   rx.switchMap(([, outerCanvas]) => cv.s.pt.requestRender.pipe(
        //     rx.map(([m]) => outerCanvas!.s.ft.requestRender().dp(m))
        //   )),
        //   rx.takeUntil(cv.destory$)
        // ),
        // Delete corresponding canvas when chd is removed
        s.pt.removeChild.pipe(rx.filter(([, w]) => w === chd), rx.take(1), rx.map(() => {
            chd.s.ft.isOffsetParent(false).dp(m);
            canvasMap.delete(chd);
            cv.dispose();
        })));
    })))));
    r('allDisplayChildren -> last.isOffsetParent', s.pt.allDisplayChildren.pipe(rx.filter(([, childrn]) => childrn.length > 0), rx.map(([, childrn]) => childrn[childrn.length - 1]), rx.distinctUntilChanged(), rx.switchMap(last => {
        const waitForFocusService$ = last.focusService != null ?
            rx.of(true) :
            s.pt.onFocusServieReady.pipe(rx.filter(() => last.focusService != null), rx.take(1), rx.map(() => true));
        return waitForFocusService$.pipe(rx.map(() => {
            last.s.ft.isOffsetParent(last).dp();
        }), rx.finalize(() => {
            last.s.ft.isOffsetParent(false).dp();
        }));
    })));
    r('querySizeOf', s.pt.querySizeOf.pipe(rx.mergeMap(([m, w, h]) => {
        return table.l.allDisplayChildren.pipe(rx.take(1), rx.mergeMap(([, chdn]) => {
            if (w == null && h != null) {
                return rx.from(chdn).pipe(rx.mergeMap(comp => {
                    return comp.s.ft.querySizeOf(w, h).re(m).od(comp.s.pt.prefWidthFor).pipe(rx.take(1));
                }), rx.reduce((acc, [, w]) => {
                    return w > acc ? w : acc;
                }, 0), rx.tap(width => s.ft.prefWidthFor(width, h).dp(m)));
            }
            else if (h == null && w != null) {
                return rx.from(chdn).pipe(rx.mergeMap(comp => {
                    return comp.s.ft.querySizeOf(w, h).re(m).od(comp.s.pt.prefHeightFor).pipe(rx.take(1));
                }), rx.reduce((acc, [, , h]) => {
                    return h > acc ? h : acc;
                }, 0), rx.tap(height => s.ft.prefHeightFor(w, height).dp(m)));
            }
            return rx.EMPTY;
        }));
    })));
    r('onChildPreferredSizeChange -> preferredSize', table.l.onChildPreferredSizeChange.pipe(rx.map(([m, sizes]) => {
        const [xw, xh] = sizes.reduce(([maxW, maxH], [w, h]) => {
            return [maxW > w ? maxW : w, maxH > h ? maxH : h];
        }, [0, 0]);
        s.ft.onContentSizeChange(xw, xh).dp(m);
    })));
    r('reflow -> canvas.setBounding', s.pt.reflow.pipe(rx.mergeMap(([m]) => {
        return rx.combineLatest([table.l.onSize, table.l.allDisplayChildren]).pipe(rx.take(1), rx.map(([[, w, h], [, chdn]]) => {
            s.ft.onChildPositions(new Map(chdn.map(chd => [chd, [0, 0]]))).dp(m);
            for (const cv of canvasMap.values()) {
                cv.s.ft.setBounding(0, 0, w, h).dp(m);
            }
        }));
    })));
    /*
    r('addChild,insertChild,c.setDisplay -> onChildLayerHidden', rx.merge(
      s.pt.addChild.pipe(
        rx.map(([, ...chd]) => chd)
      ),
      s.pt.insertChild.pipe(
        rx.map(([, , chd]) => chd)
      )
    ).pipe(
      rx.mergeMap(chd => {
        return rx.from(chd).pipe(
          rx.map(c => c)
        );
      }),
      rx.mergeMap(c => rx.merge(
        c.table.l.setDisplay.pipe(
          rx.scan(([, prevDis], setDisplay) => {
            const [m2, display] = setDisplay;
            if ((prevDis === DisplayMode.visible) && (display === DisplayMode.none || display === DisplayMode.hidden)) {
              s.ft.onChildLayerHidden(c).dp(m2);
            }
            return setDisplay;
          }),
          rx.takeUntil(s.pt.removeChild.pipe(
            rx.filter(([, ...removed]) => removed.some(d => c === d))
          )),
          rx.takeUntil(c.destory$)
        ),
        s.pt.removeChild.pipe(
          rx.map(([m, ...chd]) => {
            for (const c of chd) {
              s.ft.onChildLayerHidden(c).dp(m);
            }
          })
        )
      ))
    ));
    */
    r('onRender', s.pt.onRender.pipe(rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => rx.combineLatest([
        table.l.allDisplayChildren.pipe(rx.take(1), rx.mergeMap(([, chrd]) => chrd), rx.reduce((acc, chr) => {
            acc.push(chr);
            return acc;
        }, [])),
        table.l.bgCleared
    ]).pipe(rx.take(1), rx.mergeMap(([children, [, bgCleared]]) => {
        if (!bgCleared) {
            s.ft.clear(canvas, trans).dp();
        }
        if (renderSelf) {
            s.ft.renderSelf(canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
        }
        const allMasks = [];
        const last = children.length - 1;
        return rx.concat(
        // From top layer to bottom, render them to corresponding offline canvas,
        // so that get a tree of bounding box of all child compnents of each layer.
        // The bounding box tree is treated as "mask" array being given to next
        // lower layer's rendering parameter
        rx.from(children.slice(0).reverse()).pipe(rx.concatMap((chd, i) => {
            const canvasOfChd = canvasMap.get(chd);
            const isBottomLayer = i === last;
            const idx = last - i;
            s.ft.renderChild(idx, chd, canvasOfChd, trans, clips, allMasks).dp(m);
            return isBottomLayer ? rx.EMPTY : getBoundingOfCompTree(chd).pipe(rx.take(1));
        }), rx.map(rects => {
            service.log('-- getBoundingOfCompTree', rects.join());
            allMasks.push(...rects);
        })), rx.from(children).pipe(
        // rx.skip(1), // the 1st has been directly rendered to outer canvas
        rx.map(chd => canvasMap.get(chd)), rx.concatMap(c => {
            return copyCanvas(c, canvas, m);
        })));
    })))));
    r('findOverlaps -> didFindOverlaps', s.pt.findOverlaps.pipe(rx.withLatestFrom(s.pt.allDisplayChildren), rx.mergeMap(([[m, ...rect], [, chdr]]) => {
        const last = chdr[chdr.length - 1];
        return last.table.l.isContainer.pipe(rx.concatMap(([, isContainer]) => {
            if (!isContainer) {
                s.ft.didFindOverlaps([last]).dp(m);
                return rx.EMPTY;
            }
            const comp = last;
            return comp.s.ft.findOverlaps(...rect).re(m).od(comp.s.pt.didFindOverlaps).pipe(rx.take(1), rx.map(([m2, comps]) => s.ft.didFindOverlaps(comps.concat(comp)).dp(m, m2)));
        }));
    })));
    function copyCanvas(source, canvas, m) {
        return source.table.l.setBounding.pipe(rx.take(1), rx.mergeMap(([, , , w, h]) => {
            return source.s.ft.copyRect(0, 0, w, h).re(m).od(source.s.pt.onCopyRect);
        }), rx.map(([, lines]) => {
            for (const [x, , y, units, style] of lines) {
                canvas.s.ft.addDisplayUnits(x, y, units, [style]).dp(m);
            }
        }), rx.take(1));
    }
    s.ft.hasOfflineCanvas(true).dp();
});
function createElevator(opts) {
    return exports.elevatorFac.create(opts);
}
function getBoundingOfCompTree(c) {
    return rx.combineLatest([
        c.table.l.setDisplay,
        isContainerWithoutOfflineCanvas(c) ?
            rx.combineLatest([c.table.l.setBackground, c.table.l.isOpaque]) :
            rx.of([[null, ''], [null, false]])
    ]).pipe(rx.switchMap(([[, d], [[, bg], [, isOpaque]]]) => {
        if (d !== base_1.DisplayMode.visible)
            return rx.of([]);
        else if (bg != null || isOpaque) {
            return c.table.l.onBoundingBox.pipe(rx.map(([, r]) => [r]));
        }
        else {
            const p = c;
            return rx.concat(p.table.l.allChildren.pipe(rx.take(1)), rx.merge(p.s.pt.addChild, p.s.pt.insertChild, p.s.pt.removeChild).pipe(rx.switchMap(() => p.table.l.allChildren.pipe(rx.take(1))))).pipe(rx.mergeMap(([, chrd]) => chrd.length > 0 ?
                rx.combineLatest(chrd.map(it => getBoundingOfCompTree(it))) :
                rx.of([])), rx.map(chrdArr => chrdArr.flat()));
        }
    }));
}
function isContainerWithoutOfflineCanvas(root) {
    const container = root.table.getData();
    return container.allChildren != null &&
        container.hasOfflineCanvas[0] === false;
}
//# sourceMappingURL=elevator-container.js.map