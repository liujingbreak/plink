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
exports.FlexBorderSeparator = void 0;
exports.createFlexContainer = createFlexContainer;
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
const base_1 = require("./base");
const rectangle_overlap_tree_1 = require("./rectangle-overlap-tree");
var FlexBorderSeparator;
(function (FlexBorderSeparator) {
    FlexBorderSeparator[FlexBorderSeparator["none"] = 0] = "none";
    FlexBorderSeparator[FlexBorderSeparator["line"] = 1] = "line";
})(FlexBorderSeparator || (exports.FlexBorderSeparator = FlexBorderSeparator = {}));
const tableForFlexContainer = [
    'setDirection', 'alignItems', 'justifyContent', 'setBorderSpacing', 'setBorderSeparator',
    'setBorderSeparatorStyle'
];
function createFlexContainer(opts = {}) {
    const base = (0, base_1.createContainerBase)(Object.assign({ name: 'listContainer' }, opts));
    const listContainer = base.config({ tableFor: tableForFlexContainer });
    // intercept "onRender"
    base.s.prependInterceptor(action$ => {
        const dispenser = reactivizer_1.ActionDispenser.ofAction$(action$);
        return rx.merge(dispenser.at.onRender.pipe(rx.ignoreElements()), dispenser.ofOtherTypes());
    });
    const prependCtl = listContainer.s.prependController();
    const childBoundingTree = new rectangle_overlap_tree_1.RectangleOverlapTree();
    const { r, table, s } = listContainer;
    const { ft } = s;
    const separatorPos = [];
    r('querySizeOf,... -> prefHeightFor, prefWidthFor', listContainer.s.pt.querySizeOf.pipe(rx.withLatestFrom(table.l.allDisplayChildren, table.l.onChildPreferredSizeChange, table.l.justifyContent, table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing, table.l.setBorderSeparator), rx.switchMap(([[m, w, h], [, children], [, chrPreferredSizes], [, _justifyContent], [, _alignItems], [, pWidth, pHeight], [, dir], [, marginWidth], [, borderSep]]) => {
        let mainAxis = w;
        let crossAxis = h;
        let pMainAxis = pWidth;
        const pCrossAxis = pHeight;
        if (dir === 'col') {
            mainAxis = h;
            crossAxis = w;
            pMainAxis = pHeight;
            marginWidth = 0;
            borderSep = FlexBorderSeparator.none;
        }
        if (mainAxis != null) {
            if (mainAxis > pMainAxis) {
                if (dir === 'row')
                    ft.prefHeightFor(mainAxis, pHeight).dp(m);
                else
                    ft.prefWidthFor(pWidth, mainAxis).dp(m);
                return rx.EMPTY;
            }
            else {
                const sep = borderSep === FlexBorderSeparator.line ? 1 + 2 * marginWidth : marginWidth;
                const availableSpace = mainAxis - (children.length > 1 ? sep * children.length - 1 : 0);
                const childrenSizeOfMainAxis$ = rx.combineLatest(children.map(chd => chd.table.l.setFlexShrink.pipe(rx.map(([, v]) => v)))).pipe(rx.take(1), rx.map(shrinks => shrinkEachSize(dir === 'row' ? chrPreferredSizes.map(([w]) => w) : chrPreferredSizes.map(([, h]) => h), shrinks, availableSpace)));
                return childrenSizeOfMainAxis$.pipe(rx.mergeMap(childrenSizeOfMainAxis => rx.merge(...children.map((chr, idx) => {
                    return dir === 'row' ?
                        chr.s.ft.querySizeOf(childrenSizeOfMainAxis[idx], null).re(m).od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h)) :
                        chr.s.ft.querySizeOf(null, childrenSizeOfMainAxis[idx]).re(m).od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w));
                }))), rx.reduce((max, size) => {
                    return Math.max(max, size);
                }, 0), rx.map(crossAxisMaxSize => {
                    if (dir === 'row')
                        ft.prefHeightFor(mainAxis, crossAxisMaxSize).dp(m);
                    else
                        ft.prefWidthFor(crossAxisMaxSize, mainAxis).dp(m);
                }));
            }
        }
        else if (crossAxis != null) {
            if (crossAxis > pCrossAxis) {
                if (dir === 'row')
                    ft.prefWidthFor(pWidth, crossAxis).dp(m);
                else
                    ft.prefHeightFor(crossAxis, pHeight).dp(m);
                return rx.EMPTY;
            }
            else {
                const chrPrefSizeOfCrossAxis = dir === 'row' ? chrPreferredSizes.map(([, h]) => h) : chrPreferredSizes.map(([w]) => w);
                return rx.merge(...children.map((chr, i) => {
                    if (chrPrefSizeOfCrossAxis[i] < crossAxis)
                        return rx.of(dir === 'row' ? chrPreferredSizes[i][0] : chrPreferredSizes[i][1]);
                    return dir === 'row' ?
                        chr.s.ft.querySizeOf(null, crossAxis).re(m).od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w)) :
                        chr.s.ft.querySizeOf(crossAxis, null).re(m).od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h));
                })).pipe(rx.reduce((mainAxisSize, childMainAxisSize) => {
                    mainAxisSize += childMainAxisSize;
                    return mainAxisSize;
                }, 0), rx.map(mainAxisPrefSize => {
                    if (dir === 'row') {
                        const sep = borderSep === FlexBorderSeparator.line ? 1 + 2 * marginWidth : marginWidth;
                        ft.prefWidthFor(mainAxisPrefSize + sep * (children.length - 1), crossAxis).dp(m);
                    }
                    else
                        ft.prefHeightFor(crossAxis, mainAxisPrefSize).dp(m);
                }));
            }
        }
        return rx.EMPTY;
    })));
    r('reflow -> "childBoundingTree"', s.pt.reflow.pipe(rx.switchMap(([m]) => {
        childBoundingTree.clear();
        return rx.combineLatest([
            s.pt.onChildPositions.pipe((0, reactivizer_1.actionRelatedToAction)(m)),
            table.l.allDisplayChildren
        ]).pipe(rx.take(1), rx.mergeMap(([[, pos], [, children]]) => children.map((chd) => [chd, pos.get(chd)])), rx.mergeMap(([chd, pos], idx) => chd.table.l.onSize.pipe(rx.take(1), rx.map(([, w, h]) => {
            const [x, y] = pos;
            childBoundingTree.addContent([x, y, w, h], [idx, chd]);
        }))));
    })));
    r('reflow, ... -> onChildPositions, child.onSize, onChangeChildrenSize', listContainer.s.pt.reflow.pipe(rx.mergeMap(a => rx.combineLatest([
        table.l.onSize,
        table.l.allDisplayChildren.pipe(rx.switchMap(([, chdn]) => {
            return rx.combineLatest([
                rx.combineLatest(chdn.map(chd => chd.table.l.setFlexGrow.pipe(rx.map(([, v]) => v)))),
                rx.combineLatest(chdn.map(chd => chd.table.l.setFlexShrink.pipe(rx.map(([, v]) => v))))
            ]).pipe(rx.map(([grows, shrinks]) => [chdn, grows, shrinks]));
        })),
        table.l.onChildPreferredSizeChange, table.l.justifyContent, table.l.alignItems,
        table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing, table.l.setBorderSeparator
    ]).pipe(rx.take(1), rx.map(b => [a, ...b]))), rx.switchMap(([[m], [, w, h], [children, growOfEach, shrinkOfEach], [, chrPrefSizes], [, justifyContent], [, alignItems], [, pWidth, pHeight], [, dir], [, marginWidth], [, borderSep]]) => {
        const childrenPosition = new Map();
        let mainAxis = w;
        let crossAxis = h;
        let pMainAxis = pWidth;
        let pCrossAxis = pHeight;
        let margin = dir === 'row' ? marginWidth : 0;
        if (dir === 'col') {
            mainAxis = h;
            crossAxis = w;
            pMainAxis = pHeight;
            pCrossAxis = pWidth;
            borderSep = FlexBorderSeparator.none;
        }
        else {
            margin = borderSep === FlexBorderSeparator.line ? 1 + 2 * margin : margin;
        }
        let chrMainAxisSizes;
        let chrCrossAxisSizes = [];
        const chrMainAxisPrefSizes = dir === 'row' ?
            chrPrefSizes.map(([w]) => w) :
            chrPrefSizes.map(([, h]) => h);
        const chrCrossAxisPrefSizes = dir === 'col' ?
            chrPrefSizes.map(([w]) => w) :
            chrPrefSizes.map(([, h]) => h);
        let calcChdSizes$;
        if (mainAxis < pMainAxis) {
            let chdPrefMainChanged$ = rx.of(chrMainAxisPrefSizes);
            listContainer.log('::case mainAxis < pMainAxis');
            if (crossAxis < pCrossAxis) {
                listContainer.log('::case mainAxis < pMainAxis && crossAxis < pCrossAxis');
                chdPrefMainChanged$ = rx.zip(children.map((chd, i) => dir === 'row' ?
                    chd.s.ft.querySizeOf(null, chrCrossAxisPrefSizes[i] > crossAxis ? crossAxis : chrCrossAxisPrefSizes[i])
                        .re(m).od(chd.s.pt.prefWidthFor).pipe(rx.map(([, w]) => w)) :
                    chd.s.ft.querySizeOf(chrCrossAxisPrefSizes[i] > crossAxis ? crossAxis : chrCrossAxisPrefSizes[i], null)
                        .re(m).od(chd.s.pt.prefHeightFor).pipe(rx.map(([, , h]) => h)))).pipe(rx.take(1));
            }
            let remainSpace = mainAxis - margin * (children.length > 0 ? children.length - 1 : 0);
            if (remainSpace < 0)
                remainSpace = 0;
            calcChdSizes$ = chdPrefMainChanged$.pipe(rx.mergeMap(chdMainPrefSize => {
                chrMainAxisSizes = shrinkEachSize(chdMainPrefSize, shrinkOfEach, remainSpace);
                return rx.forkJoin(dir === 'row' ?
                    children.map((chr, i) => chr.s.ft.querySizeOf(chrMainAxisSizes[i], null)
                        .re(m).od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h))) :
                    children.map((chr, i) => chr.s.ft.querySizeOf(null, chrMainAxisSizes[i])
                        .re(m).od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w))));
            }), rx.map((prefCrossSizeOfEach) => {
                if (alignItems !== 'stretch') {
                    chrCrossAxisSizes.push(...prefCrossSizeOfEach.map(pref => pref > crossAxis ? crossAxis : pref));
                    return rx.EMPTY;
                }
                else {
                    chrCrossAxisSizes = children.map(() => crossAxis);
                }
            }));
        }
        else if (crossAxis < pCrossAxis) {
            chrMainAxisSizes = [];
            if (alignItems === 'stretch') {
                chrCrossAxisSizes = children.map(() => crossAxis);
            }
            else {
                for (const v of chrCrossAxisPrefSizes) {
                    chrCrossAxisSizes.push(Math.min(v, crossAxis));
                }
            }
            calcChdSizes$ = rx.zip(dir === 'row' ?
                children.map((chr, i) => chr.s.ft.querySizeOf(null, chrCrossAxisSizes[i]).re(m)
                    .od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w))) :
                children.map((chr, i) => chr.s.ft.querySizeOf(chrCrossAxisSizes[i], null).re(m)
                    .od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h)))).pipe(rx.take(1), rx.switchMap(values => values), rx.reduce((sum, value) => {
                chrMainAxisSizes.push(value);
                sum += value;
                return sum;
            }, 0), rx.mergeMap(sum => {
                if (sum > mainAxis) {
                    chrMainAxisSizes = shrinkEachSize(chrMainAxisSizes, shrinkOfEach, mainAxis - margin * (children.length - 1));
                    return rx.EMPTY;
                }
                else {
                    chrMainAxisSizes = stretchEachSize(chrMainAxisSizes, growOfEach, shrinkOfEach, mainAxis - margin * (children.length - 1));
                    return rx.EMPTY;
                }
            }));
        }
        else {
            chrCrossAxisSizes = [...chrCrossAxisPrefSizes];
            chrMainAxisSizes = stretchEachSize(chrMainAxisPrefSizes, growOfEach, shrinkOfEach, mainAxis - margin * (children.length - 1));
            if (alignItems === 'stretch') {
                for (let i = 0, l = children.length; i < l; i++) {
                    chrCrossAxisSizes[i] = crossAxis;
                }
            }
            calcChdSizes$ = rx.EMPTY;
        }
        const setPositions$ = new rx.Observable(sub => {
            let space = mainAxis - (margin * (children.length - 1)) - chrMainAxisSizes.reduce((sum, v) => {
                sum += v;
                return sum;
            }, 0);
            let pos = (justifyContent === 'start' || justifyContent === 'stretch') ?
                0 :
                justifyContent === 'center' ?
                    space >> 1 :
                    justifyContent === 'end' ?
                        space :
                        0;
            let baseSpaceBetween = 0;
            for (let i = 0, l = children.length; i < l; i++) {
                const crossSpace = crossAxis - chrCrossAxisSizes[i];
                const crossPos = alignItems === 'start' ? 0 : alignItems === 'center' ? crossSpace >> 1 : crossSpace;
                if (dir === 'row')
                    childrenPosition.set(children[i], [pos, crossPos]);
                else
                    childrenPosition.set(children[i], [crossPos, pos]);
                if (i !== l - 1) {
                    const fSpaceBetween = justifyContent === 'space-between' ? space / (l - 1 - i) : 0;
                    baseSpaceBetween = Math.floor(fSpaceBetween);
                    pos += chrMainAxisSizes[i];
                    if (dir === 'row') {
                        separatorPos[i] = borderSep === FlexBorderSeparator.line ?
                            marginWidth + pos + (justifyContent === 'space-between' ? fSpaceBetween >> 1 : 0) :
                            pos;
                    }
                    pos += margin + baseSpaceBetween;
                    space -= baseSpaceBetween;
                }
                if (dir === 'row')
                    children[i].s.ft.onSize(chrMainAxisSizes[i], chrCrossAxisSizes[i]).dp(m);
                else
                    children[i].s.ft.onSize(chrCrossAxisSizes[i], chrMainAxisSizes[i]).dp(m);
            }
            // listContainer.log('childrenPosition:', ...childrenPosition.map(pos => '[' + pos.join(', ') + ']'));
            ft.onChildPositions(childrenPosition).dp(m);
            sub.complete();
        });
        return rx.concat(calcChdSizes$.pipe(rx.finalize(() => s.ft.onChangeChildrenSize(chrMainAxisSizes, chrCrossAxisSizes).dp(m))), setPositions$).pipe(listContainer.catchErrorFor(m));
    })));
    r('onChildPreferredSizeChange,... -> onContentSizeChange', rx.combineLatest([
        listContainer.s.pt.onChildPreferredSizeChange,
        table.l.setDirection, table.l.setBorderSpacing,
        table.l.setBorderSeparator
    ]).pipe(rx.map(([[m, sizes], [, direction], [, marginWidth], [, borderSeq]]) => {
        if (direction === 'row') {
            const finalPreferredSize = sizes.reduce((preferred, [w, h]) => {
                preferred[0] += w;
                if (h > preferred[1])
                    preferred[1] = h;
                return preferred;
            }, [0, 0]);
            finalPreferredSize[0] += (borderSeq === FlexBorderSeparator.line ? 2 + marginWidth + 1 : marginWidth) * (sizes.length - 1);
            ft.onContentSizeChange(finalPreferredSize[0], finalPreferredSize[1]).dp(m);
        }
        else if (direction === 'col') {
            const finalPreferredSize = sizes.reduce((preferred, [w, h]) => {
                preferred[1] += h;
                if (w > preferred[0])
                    preferred[0] = w;
                return preferred;
            }, [0, 0]);
            ft.onContentSizeChange(finalPreferredSize[0], finalPreferredSize[1]).dp(m);
        }
    })));
    r('onRender -> renderSelf, renderChild', prependCtl.pt.onRender.pipe(rx.withLatestFrom(table.l.allDisplayChildren, table.l.setDirection, table.l.onSize, table.l.setBorderSeparator, table.l.setBorderSeparatorStyle), rx.map(([[m, canvas, trans, renderSelf, clips, masks], [, children], [, dir], [, , h], [, borderSep], [, sepStyle]]) => {
        if (masks == null)
            masks = [];
        if (renderSelf)
            s.ft.renderSelf(canvas, trans, clips, masks).dp(m);
        if (dir === 'row' && borderSep === FlexBorderSeparator.line) {
            const orig = gl_matrix_1.vec2.create();
            gl_matrix_1.vec2.transformMat4(orig, orig, trans);
            for (const sepPos of separatorPos) {
                for (let i = 0; i < h; i++)
                    canvas.s.ft.addString(orig[0] + sepPos, orig[1] + i, '│', sepStyle).dp(m);
            }
        }
        let chrToRender = clips.flatMap(clip => childBoundingTree.searchOverlaps(clip));
        const excluded = new Set(masks ? masks.map(c => childBoundingTree.searchForCovered(c).map(([, w]) => w)).flat() : []);
        chrToRender = chrToRender.filter(([, c]) => !excluded.has(c));
        for (let i = 0, l = chrToRender.length; i < l; i++) {
            const [idx, chr] = chrToRender[i];
            s.ft.renderChild(idx, chr, canvas, trans, clips, masks).dp(m);
        }
    })));
    r('init', new rx.Observable(() => {
        ft.setDirection('row').dp();
        ft.alignItems('stretch').dp();
        ft.justifyContent('stretch').dp();
        ft.setBorderSpacing(1).dp();
        ft.setBorderSeparator(FlexBorderSeparator.none).dp();
        ft.setBorderSeparatorStyle([]).dp();
        for (const a$ of [
            s.pt.setDirection, s.pt.setBorderSpacing,
            s.pt.alignItems, s.pt.justifyContent, s.pt.setBackground
        ]) {
            ft.addReflowAction(a$).dp();
        }
    }));
    listContainer.s = prependCtl;
    return listContainer;
}
function shrinkEachSize(individualPrefSizes, shrinkOfEach, availableSpace) {
    if (availableSpace < 0) {
        availableSpace = 0;
    }
    const prefSizeTotal = individualPrefSizes.reduce((prev, curr) => prev + curr);
    const spaceToShrink = prefSizeTotal - availableSpace;
    const numOfShrinkUnit = individualPrefSizes.reduce((prev, curr, i) => prev + (curr * shrinkOfEach[i]), 0);
    const shrinkUnit = spaceToShrink / numOfShrinkUnit;
    const chrSizes = [];
    let floatGap = 0;
    let i = 0;
    for (const preSize of individualPrefSizes) {
        const units = preSize * shrinkOfEach[i];
        const fSize = preSize - shrinkUnit * units;
        let size = Math.floor(fSize);
        floatGap += fSize - size;
        if (floatGap > 1) {
            size++;
            floatGap--;
        }
        chrSizes.push(size < 0 ? 0 : size);
        i++;
    }
    return chrSizes;
}
function stretchEachSize(prefSizes, growOfEach, shrinkOfEach, availableSpace) {
    const remaining = availableSpace - prefSizes.reduce((sum, size) => {
        sum += size;
        return sum;
    }, 0);
    if (remaining <= 0)
        return shrinkEachSize(prefSizes, shrinkOfEach, availableSpace);
    const totalGrow = growOfEach.reduce((total, grow) => {
        total += grow;
        return total;
    }, 0);
    if (totalGrow <= 0)
        return prefSizes;
    const growUnit = remaining / totalGrow;
    let floatGap = 0;
    return prefSizes.map((pref, i) => {
        const growSize = growUnit * growOfEach[i];
        let iGrowSize = Math.floor(growSize);
        floatGap += growSize - iGrowSize;
        if (floatGap > 1) {
            iGrowSize += 1;
            floatGap -= 1;
        }
        return iGrowSize + pref;
    });
}
//# sourceMappingURL=flex-container.js.map