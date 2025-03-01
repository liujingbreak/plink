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
exports.baseContainerFac = void 0;
/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const canvas_1 = require("./canvas");
const base_1 = require("./base");
const tableFor = [
    'allChildren', 'allDisplayChildren', 'setLayoutValid', 'onChildPreferredSizeChange', 'hasOfflineCanvas', 'onChildPositions',
    'isOpaque', 'latestReflowData', 'isLayoutDirty', 'setLayoutCheck'
];
exports.baseContainerFac = base_1.baseComponentFac.forExtend({
    tableFor,
    debugExcludeTypes: ['ofCanvas', '_saveTransform', 'renderChild'
        // 'queryAbsBounding', 'didQueryAbsBounding'
    ]
}).interceptorByType(ad => rx.merge(ad.at.setLayoutValid.pipe(rx.distinctUntilChanged(({ p: [a] }, { p: [b] }) => a === b)), ad.ofOtherTypes())).defineReactor(init => {
    const service = init();
    const { r, ft, pt, table } = service;
    const children = [];
    r('addChild -> child.setParent', pt.addChild.pipe(rx.map(([m, ...added]) => {
        // service.log('>>> add child of', service.s.logPrefix, 'action', m.i);
        children.push(...added);
        for (const child of added) {
            // service.log('>>>> loop child', child.s.logPrefix, ', setParent', service.s.logPrefix);
            child.ft.setParent(service).dp(m);
        }
        ft.allChildren(children).dp(m);
    })));
    r('insertChild', pt.insertChild.pipe(rx.map(([m, before, added]) => {
        children.splice(before, 0, ...added);
        for (const child of added) {
            child.ft.setParent(service).dp(m);
        }
        ft.allChildren(children).dp(m);
    })));
    r('removeChild', pt.removeChild.pipe(rx.map(([m, ...widgets]) => {
        for (const w of widgets) {
            const idx = children.findIndex(c => c === w);
            if (idx >= 0)
                children.splice(idx, 1);
            w.ft.setParent(null).dp(m);
        }
        ft.allChildren(children).dp(m);
    })));
    r('addChild, removeChild, allChildren, children.preferredSize, children.setDisplay' +
        '-> onChildPreferredSizeChange, setLayoutValid, allDisplayChildren', rx.merge(pt.addChild, pt.insertChild, pt.removeChild).pipe(rx.switchMap(([m]) => table.l.allChildren.pipe(rx.switchMap(([, children]) => {
        return rx.merge(
        // -> allDisplayChildren
        rx.combineLatest(children.map(c => c.table.l.setDisplay.pipe(rx.map(([, d]) => d === base_1.DisplayMode.none ? null : c)))).pipe(rx.map(chdn => chdn.filter((c) => c != null)), rx.switchMap(chdn => {
            ft.allDisplayChildren(chdn).dp();
            return rx.combineLatest(chdn.map(c => {
                return c.table.l.preferredSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2));
            }));
        }), rx.map(sizes => ft.onChildPreferredSizeChange(sizes.map(([, w, h]) => [w, h])).dp(m))));
    })))));
    r('requestReflowOn', pt.requestReflowOn.pipe(rx.switchMap(([, ...a$]) => rx.merge(...a$, pt.addReflowAction.pipe(rx.mergeMap(([, p$]) => p$)))), rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? actionOrPayload[0] : actionOrPayload;
        ft.requestReflow().dp(m);
    })));
    r('requestReflow', pt.requestReflow.pipe(rx.map(([m]) => {
        ft.setLayoutValid(false).dp(m.r);
        ft.bgCleared(false).dp(m.r);
    })));
    r('onChildPositions... -> children.onPosition', rx.combineLatest([
        table.l.onChildPositions,
        table.l.allDisplayChildren
    ]).pipe(rx.map(([[m, posMap], [m2, chrd]]) => {
        for (const c of chrd) {
            const pos = posMap.get(c);
            if (pos)
                c.ft.onPosition(...pos).dp(m, m2);
        }
    })));
    // If not "setLayoutValid", then "reflow", and if "isLayoutDirty", then "clear"
    r('beforeRender,setLayoutValid -> isLayoutDirty,reflow,clear,needRerender', pt.beforeRender.pipe(rx.withLatestFrom(table.l.setLayoutValid), rx.mergeMap(([[m, canvas, trans, clips, masks], [, valid]]) => {
        if (!valid) {
            ft.isLayoutDirty(false).dp(m);
            ft.reflow(clips, masks).dp(m);
            ft.setLayoutValid(true).dp(m);
            // get changed "isLayoutDirty"
            return table.l.isLayoutDirty.pipe(rx.map(([, dirty]) => dirty), rx.take(1), rx.filter(d => d), rx.map(() => [m, canvas, trans]));
        }
        return rx.EMPTY;
    }), rx.map(([m, canvas, trans], _idx) => {
        ft.clear(canvas, trans).dp(m);
        ft.needRerender(true).dp(m);
    })));
    r('onRender -> renderSelf, renderChild', pt.onRender.pipe(
    // rx.observeOn(rx.queueScheduler),
    rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => table.l.allDisplayChildren.pipe(rx.take(1), rx.map(([, children]) => {
        if (renderSelf) {
            ft.renderSelf(canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
        }
        for (let i = 0, l = children.length; i < l; i++) {
            const chr = children[i];
            ft.renderChild(i, chr, canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
        }
    })))));
    r('renderChild, onChildPositions -> child.render', pt.renderChild.pipe(rx.switchMap(([m, , chr, canvas, trans, clips, masks]) => rx.combineLatest([
        chr.table.l.onSize,
        table.l.onChildPositions
    ]).pipe(rx.take(1), rx.map(([[, width, height], [, childrenPosition]]) => {
        // listContainer.log('.renderChild', index, ': childrenPosition:', ...childrenPosition[index]);
        const [x, y] = childrenPosition.get(chr);
        const clipsOfCh = clips.map(cp => {
            const intersection = (0, canvas_1.rectIntersection)([x, y, width, height], cp);
            if (intersection) {
                intersection[0] -= x;
                intersection[1] -= y;
            }
            return intersection;
        }).filter((c) => c != null);
        const masksOfCh = masks.map(mk => {
            const intersection = (0, canvas_1.rectIntersection)([x, y, width, height], mk);
            if (intersection) {
                intersection[0] -= x;
                intersection[1] -= y;
            }
            return intersection;
        }).filter((c) => c != null);
        if (clipsOfCh.length > 0) {
            const tranOfChild = gl_matrix_1.mat4.fromTranslation(gl_matrix_1.mat4.create(), [x, y, 0]);
            gl_matrix_1.mat4.mul(tranOfChild, trans, tranOfChild);
            chr.ft.render(canvas, tranOfChild, clipsOfCh, masksOfCh).re(m).dp();
        }
    })))));
    r('onChildError -> parent.onChildError', pt.onChildError.pipe(rx.withLatestFrom(pt.setParent), rx.map(([[, childId, errInfo], [, parent]]) => {
        if (parent)
            parent.ft.onChildError(childId, errInfo);
    })));
    r('setLayoutValid, latestReflowData -> setLayoutValid', pt.setLayoutValid.pipe(rx.switchMap(([, isValid]) => isValid ? table.l.latestReflowData.pipe(rx.switchMap(([m2, data$]) => data$.pipe(rx.skip(1), rx.take(1), rx.map(() => {
        ft.setLayoutValid(false).dp(m2);
        ft.bgCleared(false).dp(m2);
    })))) : rx.EMPTY)));
    r('setLayoutValid(false), ofCanvas -> canvas.requestRender', pt.setLayoutValid.pipe(rx.filter(([, valid]) => !valid), rx.switchMap(([m]) => table.l.ofCanvas.pipe(rx.map(([, canvas]) => {
        if (canvas)
            canvas.ft.requestRender().dp(m);
    })))));
    r('findOverlaps -> didFindOverlaps', pt.findOverlaps.pipe(rx.mergeMap(([m, ...rect]) => {
        return table.l.onBoundingBox.pipe(rx.take(1), rx.mergeMap(([, [x, y, w, h]]) => {
            const interction = (0, canvas_1.rectIntersection)([x, y, w, h], rect);
            if (interction == null) {
                ft.didFindOverlaps([]).dp(m);
                return rx.EMPTY;
            }
            return table.l.allDisplayChildren.pipe(rx.take(1), rx.mergeMap(([, chd]) => chd), rx.mergeMap(chr => chr.table.l.onBoundingBox.pipe(rx.take(1), rx.filter(([, bRect]) => {
                return (0, canvas_1.rectIntersection)(rect, bRect) != null;
            }), rx.map(() => chr))), rx.mergeMap(chr => chr.table.l.isContainer.pipe(rx.take(1), rx.mergeMap(isContainer => {
                if (isContainer) {
                    return chr.ft.findOverlaps(...rect)
                        .re(m).od(chr.pt.didFindOverlaps).pipe(rx.take(1), rx.map(([, chdOfChd]) => chdOfChd), rx.endWith([chr]));
                }
                return rx.of([chr]);
            }))), rx.reduce((acc, it) => {
                acc.push(...it);
                return acc;
            }, []), rx.map(found => ft.didFindOverlaps(found).dp(m)));
        }));
    })));
    // When "setLayoutCheck" is changed, set "isLayoutDirty" to true
    r('isLayoutDirty(false),setLayoutCheck -> isLayoutDirty(true)', pt.isLayoutDirty.pipe(rx.switchMap(([, dirty]) => dirty ?
        rx.EMPTY :
        table.l.setLayoutCheck.pipe(rx.switchMap(([, target]) => target))), rx.map(([m]) => ft.isLayoutDirty(true).dp(m))));
    r('init', new rx.Observable(() => {
        ft.requestReflowOn(pt.onSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)), pt.onChildPreferredSizeChange).dp();
        ft.isContainer(true).dp();
        ft.allChildren(children).dp();
        ft.onSize(0, 0).dp();
        ft.onContentSizeChange(0, 0).dp();
        ft.overflow(false).dp();
        ft.setLayoutValid(false).dp();
        ft.hasOfflineCanvas(false).dp();
        ft.onChildPositions(new Map()).dp();
        ft.allDisplayChildren([]).dp();
        ft.onChildPreferredSizeChange([]).dp();
        ft.setLayoutCheck(rx.merge(pt.onSize, table.l.allDisplayChildren.pipe(rx.switchMap(([, chd]) => rx.merge(chd).pipe(rx.mergeMap(c => rx.merge(c.pt.onSize, c.pt.onPosition))))), pt.allDisplayChildren)).dp();
        ft.isOpaque(false).dp();
    }));
});
//# sourceMappingURL=container.js.map