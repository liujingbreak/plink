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
    const base = (0, index_1.createContainerBase)(opts);
    const service = base.config({ name: 'Elevator' });
    const { s, r, table } = service;
    const canvasMap = new Map();
    // intercept "onRender"
    base.s.interceptor$.next(action$ => {
        const dispenser = reactivizer_1.ActionDispenser.ofAction$(action$);
        return rx.merge(dispenser.at.onRender.pipe(rx.ignoreElements()), dispenser.ofOtherTypes());
    });
    const prependCtl = service.s.prependController();
    r('addChild, removeChild -> "canvasMap"', s.pt.addChild.pipe(rx.mergeMap(([m, ...chd]) => rx.from(chd).pipe(rx.mergeMap(chd => {
        const cv = (0, index_1.createTerminalCanvas)({
            debug: opts.debug,
            log: opts.log,
            name: 'Elevator.canvas'
        });
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
        s.ft.preferredSize(xw, xh).dp(m);
    })));
    r('reflow', s.pt.reflow.pipe(rx.mergeMap(([m]) => {
        return table.l.onSize.pipe(rx.take(1), rx.map(([, w, h]) => {
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
        return rx.concat(rx.from(children.slice(0).reverse()).pipe(rx.concatMap((chd, i) => {
            const canvasOfChd = canvasMap.get(chd);
            const isBottomLayer = i === last;
            const idx = last - i;
            s.ft.renderChild(idx, chd, isBottomLayer ? canvas : canvasOfChd, trans, clips, allMasks).dp(m);
            return isBottomLayer ? rx.EMPTY : getBoundingOfCompTree(chd).pipe(rx.take(1));
        }), rx.map(rects => {
            service.log('-- getBoundingOfCompTree', rects.join());
            allMasks.push(...rects);
        })), rx.from(children).pipe(
        // rx.tap(chd => service.log('>>>', chd.s.logPrefix)),
        rx.skip(1), // the 1st has been dorectly rendered to outer canvas
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
    return service;
}
function getBoundingOfCompTree(c) {
    return rx.combineLatest([
        c.table.l.setDisplay,
        isContainer(c) ? c.table.l.setBackground : rx.of([null, ''])
    ]).pipe(rx.switchMap(([[, d], [, bg]]) => {
        if (d !== index_1.DisplayMode.visible)
            return rx.of([]);
        else if (bg != null) {
            return c.table.l.onBoundingBox.pipe(rx.map(([, r]) => [r]));
        }
        else {
            const p = c;
            return rx.concat(p.table.l.allChildren.pipe(rx.take(1)), rx.merge(p.s.pt.addChild, p.s.pt.removeChild).pipe(rx.switchMap(() => p.table.l.allChildren.pipe(rx.take(1))))).pipe(rx.mergeMap(([, chrd]) => chrd.length > 0 ?
                rx.combineLatest(chrd.map(it => getBoundingOfCompTree(it))) :
                rx.of([])), rx.map(chrdArr => chrdArr.flat()));
        }
    }));
}
function isContainer(root) {
    return root.table.getData().allChildren != null;
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