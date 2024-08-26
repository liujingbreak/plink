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
exports.createElevator = createElevator;
exports.getBoundingOfCompTree = getBoundingOfCompTree;
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const index_1 = require("./index");
function createElevator(opts) {
    var _a, _b;
    const base = (0, index_1.createContainerBase)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: (_b = (_a = opts === null || opts === void 0 ? void 0 : opts.default) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'Elevator' }), opts === null || opts === void 0 ? void 0 : opts.core));
    const service = base.config({});
    const { s, r, table } = service;
    const canvasMap = new Map();
    // intercept "onRender"
    base.s.interceptor$.next(action$ => {
        const dispenser = reactivizer_1.ActionDispenser.ofAction$(action$);
        return rx.merge(dispenser.at.onRender.pipe(rx.ignoreElements()), dispenser.ofOtherTypes());
    });
    const prependCtl = service.s.prependController();
    r('addChild, removeChild -> "canvasMap"', rx.merge(s.pt.addChild.pipe(rx.map(([m, ...chdn]) => [m, chdn])), s.pt.insertChild.pipe(rx.map(([m, , chdn]) => [m, chdn]))).pipe(rx.mergeMap(([m, chd]) => rx.from(chd).pipe(rx.mergeMap(chd => {
        const cv = (0, index_1.createTerminalCanvas)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'Elevator.canvas' }), opts === null || opts === void 0 ? void 0 : opts.canvas));
        canvasMap.set(chd, cv);
        cv.s.ft.setRootComponent(chd).dp(m);
        return s.pt.removeChild.pipe(rx.filter(([, w]) => w === chd), rx.take(1), rx.map(() => {
            canvasMap.delete(chd);
        }));
    })))));
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
    r('onRender', prependCtl.pt.onRender.pipe(rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => table.l.allDisplayChildren.pipe(rx.take(1), rx.mergeMap(([, chrd]) => chrd), rx.reduce((acc, chr) => {
        acc.push(chr);
        return acc;
    }, []), rx.mergeMap(children => {
        if (renderSelf)
            s.ft.renderSelf(canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
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
            s.ft.renderChild(idx, chd, isBottomLayer ? canvas : canvasOfChd, trans, clips, allMasks).dp(m);
            return isBottomLayer ? rx.EMPTY : getBoundingOfCompTree(chd).pipe(rx.take(1));
        }), rx.map(rects => {
            service.log('-- getBoundingOfCompTree', rects.join());
            allMasks.push(...rects);
        })), rx.from(children).pipe(rx.skip(1), // the 1st has been directly rendered to outer canvas
        rx.map(chd => canvasMap.get(chd)), rx.concatMap(c => {
            return c.table.l.setBounding.pipe(rx.take(1), rx.mergeMap(([, , , w, h]) => {
                return c.s.ft.copyDirtyRectAndClear(0, 0, w, h).re(m).od(c.s.pt.onCopyRect);
            }), rx.map(([, lines]) => {
                for (const [x, , y, units, style] of lines) {
                    canvas.s.ft.addDisplayUnits(x, y, units, [style]).dp(m);
                }
            }), rx.take(1));
        })));
    })))));
    service.s = prependCtl;
    return service;
}
function getBoundingOfCompTree(c) {
    return rx.combineLatest([
        c.table.l.setDisplay,
        isContainerWithoutOfflineCanvas(c) ?
            rx.combineLatest([c.table.l.setBackground, c.table.l.isOpaque]) :
            rx.of([[null, ''], [null, false]])
    ]).pipe(rx.switchMap(([[, d], [[, bg], [, isOpaque]]]) => {
        if (d !== index_1.DisplayMode.visible)
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
// export function unionRectangles(rects: Iterable<Rectangle>) {
//   let curr: Rectangle | undefined;
//   for (const rect of rects) {
//     const [x, y, w, h] = rect;
//     if (curr != null) {
//       if (x < curr[0])
//         curr[0] = x;
//       if (y < curr[1])
//         curr[1] = y;
//       if (x + w > curr[0] + curr[2])
//         curr[2] = x + w - curr[0];
//       if (y + h > curr[1] + curr[3])
//         curr[3] = y + h - curr[1];
//     }
//   }
//   return curr;
// }
//# sourceMappingURL=elevator-container.js.map