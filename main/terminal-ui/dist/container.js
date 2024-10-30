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
exports.createContainerBase = createContainerBase;
/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const canvas_1 = require("./canvas");
const base_1 = require("./base");
const tableFor = [
    'allChildren', 'allDisplayChildren', 'setLayoutValid', 'onChildPreferredSizeChange', 'hasOfflineCanvas', 'onChildPositions',
    'isOpaque', 'latestReflowData'
];
function createContainerBase(opts) {
    var _a;
    const base = (0, base_1.createBase)(opts);
    const service = base.config({
        tableFor,
        debugExcludeTypes: (_a = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _a !== void 0 ? _a : [
            'ofCanvas', 'bgCleared', '_saveTransform', 'needRerender', 'renderBackgroundFor'
        ]
    });
    const { r, s, table } = service;
    const { ft } = s;
    const children = [];
    r('addChild -> child.setParent', s.pt.addChild.pipe(rx.map(([m, ...added]) => {
        children.push(...added);
        for (const child of added) {
            child.s.ft.setParent(service).dp(m);
        }
    })));
    r('insertChild', s.pt.insertChild.pipe(rx.map(([m, before, added]) => {
        children.splice(before, 0, ...added);
        for (const child of added) {
            child.s.ft.setParent(service).dp(m);
        }
    })));
    r('removeChild', s.pt.removeChild.pipe(rx.map(([m, ...widgets]) => {
        for (const w of widgets) {
            const idx = children.findIndex(c => c === w);
            if (idx >= 0)
                children.splice(idx, 1);
            w.s.ft.setParent(null).dp(m);
        }
    })));
    r('addChild, removeChild, allChildren, children.preferredSize, children.setDisplay -> onChildPreferredSizeChange, setLayoutValid, allDisplayChildren', rx.merge(s.pt.addChild, s.pt.insertChild, s.pt.removeChild).pipe(rx.switchMap(([m]) => table.l.allChildren.pipe(rx.switchMap(([, children]) => {
        return rx.merge(
        // -> allDisplayChildren
        rx.combineLatest(children.map(c => c.table.l.setDisplay.pipe(rx.map(([, d]) => d === base_1.DisplayMode.none ? null : c)))).pipe(rx.map(chdn => chdn.filter(c => c != null)), rx.switchMap(chdn => {
            ft.allDisplayChildren(chdn).dp();
            return rx.combineLatest(chdn.map(widget => {
                return widget.table.l.preferredSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2));
            }));
        }), rx.map(sizes => ft.onChildPreferredSizeChange(sizes.map(([, w, h]) => [w, h])).dp(m))), 
        // watch display property change of each child component, dispatch setLayoutValid(false)
        ...children.map(widget => widget.table.l.setDisplay.pipe(rx.scan(([, prev], curr) => {
            const [m, mode] = curr;
            if (!((prev === base_1.DisplayMode.hidden && mode === base_1.DisplayMode.visible) ||
                (mode === base_1.DisplayMode.hidden && prev === base_1.DisplayMode.visible))) {
                ft.setLayoutValid(false).dp(m);
            }
            return curr;
        }), service.labelError('children.setDisplay -> setLayoutValid'))));
    })))));
    r('addReflowAction -> needRerender, setLayoutValid, bgCleared', s.pt.addReflowAction.pipe(rx.mergeMap(([, action$]) => action$), rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? actionOrPayload[0] : actionOrPayload;
        ft.needRerender(true).dp(m);
        ft.setLayoutValid(false).dp(m);
        ft.bgCleared(false).dp(m);
    })));
    r('renderSelf, onBgChangeWithParent, onSize -> canvas.addString, canvas.clearRect', s.pt.renderSelf.pipe(rx.mergeMap(a => rx.combineLatest([
        table.l.onSize,
        table.l.onBgChangeWithParent,
        table.l.bgCleared
    ]).pipe(rx.take(1), rx.map(b => [a, ...b]))), rx.map(([[m, canvas, trans], [m2, width, height], [m3, bg], [m4, cleared]], _idx) => {
        const pos = [0, 0];
        gl_matrix_1.vec2.transformMat4(pos, pos, trans);
        if (bg) {
            const fill = ' '.repeat(width);
            for (let i = 0; i < height; i++) {
                canvas.s.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
            }
        }
        else if (!cleared) {
            service.log('>>> bgCleared');
            canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
            s.ft.bgCleared(true).dp(m, m2, m3, m4);
        }
    })));
    r('onChildPositions... -> children.onPosition', rx.combineLatest([
        table.l.onChildPositions,
        table.l.allDisplayChildren
    ]).pipe(rx.map(([[m, posMap], [m2, chrd]]) => {
        for (const c of chrd) {
            const pos = posMap.get(c);
            if (pos)
                c.s.ft.onPosition(...pos).dp(m, m2);
        }
    })));
    r('renderSelf -> reflow, setLayoutValid, child.needRerender', s.pt.renderSelf.pipe(rx.withLatestFrom(table.l.setLayoutValid), rx.mergeMap(([[m, , , clips, masks], [, valid]]) => {
        if (!valid) {
            return table.l.allDisplayChildren.pipe(rx.take(1), rx.map(([, allChildren]) => {
                s.ft.setLayoutValid(true).dp(m);
                s.ft.reflow(clips, masks).dp(m);
                for (const child of allChildren)
                    child.s.ft.needRerender(true).dp(m);
            }));
        }
        else {
            return rx.EMPTY;
        }
    })));
    r('onRender -> renderSelf, renderChild', s.pt.onRender.pipe(rx.observeOn(rx.queueScheduler), rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => table.l.allDisplayChildren.pipe(rx.take(1), rx.map(([, children]) => {
        if (renderSelf)
            s.ft.renderSelf(canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
        for (let i = 0, l = children.length; i < l; i++) {
            const chr = children[i];
            s.ft.renderChild(i, chr, canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
        }
    })))));
    r('renderChild, onChildPositions -> child.render', s.pt.renderChild.pipe(rx.switchMap(([m, , chr, canvas, trans, clips, masks]) => rx.combineLatest([
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
        }).filter(c => c != null);
        const masksOfCh = masks.map(mk => {
            const intersection = (0, canvas_1.rectIntersection)([x, y, width, height], mk);
            if (intersection) {
                intersection[0] -= x;
                intersection[1] -= y;
            }
            return intersection;
        }).filter(c => c != null);
        if (clipsOfCh.length > 0) {
            const tranOfChild = gl_matrix_1.mat4.fromTranslation(gl_matrix_1.mat4.create(), [x, y, 0]);
            gl_matrix_1.mat4.mul(tranOfChild, trans, tranOfChild);
            chr.s.ft.render(canvas, tranOfChild, clipsOfCh, masksOfCh).re(m).dp();
        }
    })))));
    r('onChildError -> parent.onChildError', s.pt.onChildError.pipe(rx.withLatestFrom(s.pt.setParent), rx.map(([[, childId, errInfo], [, parent]]) => {
        if (parent)
            parent.s.ft.onChildError(childId, errInfo);
    })));
    r('setLayoutValid, latestReflowData -> setLayoutValid', s.pt.setLayoutValid.pipe(rx.map(([, valid]) => valid), rx.distinctUntilChanged(), rx.switchMap(isValid => isValid ? table.l.latestReflowData.pipe(rx.switchMap(([, data$]) => data$), rx.skip(1), rx.take(1), rx.map(() => {
        s.ft.setLayoutValid(false).dp();
        s.ft.needRerender(true).dp();
        s.ft.bgCleared(false).dp();
    })) : rx.EMPTY)));
    r('findOverlaps -> didFindOverlaps', s.pt.findOverlaps.pipe(rx.mergeMap(([m, ...rect]) => {
        return rx.combineLatest([
            table.l.isOffsetParent,
            table.l.onSize
        ]).pipe(rx.take(1), rx.switchMap(([[, asOp], [, w, h]]) => {
            if (asOp) {
                return table.l.onPosition.pipe(rx.filter(([, x]) => x != null), rx.take(1), rx.map(([, x, y]) => (0, canvas_1.rectIntersection)([x, y, w, h], [rect[0] - x, rect[1] - y, rect[2], rect[3]])));
            }
            else {
                return rx.of((0, canvas_1.rectIntersection)([0, 0, w, h], rect));
            }
        }), rx.mergeMap(rect => {
            if (rect != null)
                return table.l.allDisplayChildren.pipe(rx.take(1), rx.mergeMap(([, chd]) => chd), rx.mergeMap(chr => chr.table.l.onBoundingBox.pipe(rx.take(1), rx.filter(([, bRect]) => {
                    return (0, canvas_1.rectIntersection)(rect, bRect) != null;
                }), rx.map(() => chr))), rx.mergeMap(chr => chr.table.l.isContainer.pipe(rx.take(1), rx.mergeMap(isContainer => {
                    if (isContainer) {
                        return chr.s.ft.findOverlaps(...rect)
                            .re(m).od(chr.s.pt.didFindOverlaps).pipe(rx.take(1), rx.map(([, chdOfChd]) => chdOfChd), rx.endWith([chr]));
                    }
                    return rx.of([chr]);
                }))), rx.reduce((acc, it) => {
                    acc.push(...it);
                    return acc;
                }, []), rx.map(found => s.ft.didFindOverlaps(found).dp(m)));
            else {
                s.ft.didFindOverlaps([]).dp(m);
                return rx.EMPTY;
            }
        }));
    })));
    const reflowData = rx.combineLatest([
        table.l.onSize.pipe(rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)),
        table.l.onChildPreferredSizeChange
    ]);
    r('init', new rx.Observable(() => {
        ft.latestReflowData(reflowData).dp();
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
        ft.isOpaque(false).dp();
    }));
    return service;
}
//# sourceMappingURL=container.js.map