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
exports.flexContainerFac = exports.FlexBorderSeparator = void 0;
exports.createFlexContainer = createFlexContainer;
exports.shrinkEachSize = shrinkEachSize;
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
const container_1 = require("./container");
const canvas_1 = require("./canvas");
const rbush_1 = require("./rbush");
var FlexBorderSeparator;
(function (FlexBorderSeparator) {
    FlexBorderSeparator[FlexBorderSeparator["none"] = 0] = "none";
    FlexBorderSeparator[FlexBorderSeparator["line"] = 1] = "line";
})(FlexBorderSeparator || (exports.FlexBorderSeparator = FlexBorderSeparator = {}));
const tableForFlexContainer = [
    'setDirection', 'alignItems', 'justifyContent', 'setBorderSpacing', 'setBorderSeparator',
    'setBorderSeparatorStyle'
];
exports.flexContainerFac = container_1.baseContainerFac.forExtend({
    name: 'flexContainer',
    tableFor: tableForFlexContainer
}).interceptorForBaseByType(ac => rx.merge(ac.at.onRender.pipe(rx.ignoreElements()), ac.at.findOverlaps.pipe(rx.ignoreElements()), ac.ofOtherTypes())).defineReactor((init, opts) => {
    const listContainer = init(opts);
    const childBoundingRTree$ = (0, rbush_1.createRtreeInstance)();
    const { r, table, pt, ft } = listContainer;
    const separatorPos = [];
    r('querySizeOf,... -> prefHeightFor, prefWidthFor', listContainer.pt.querySizeOf.pipe(rx.withLatestFrom(table.l.allDisplayChildren, table.l.onChildPreferredSizeChange, table.l.justifyContent, table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing, table.l.setBorderSeparator), rx.switchMap(([[m, w, h], [, children], [, chrPreferredSizes], [, _justifyContent], [, _alignItems], [, pWidth, pHeight], [, dir], [, marginWidth], [, borderSep]]) => {
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
                        chr.ft.querySizeOf(childrenSizeOfMainAxis[idx], null).re(m).od(chr.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h)) :
                        chr.ft.querySizeOf(null, childrenSizeOfMainAxis[idx]).re(m).od(chr.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w));
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
                        chr.ft.querySizeOf(null, crossAxis).re(m).od(chr.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w)) :
                        chr.ft.querySizeOf(crossAxis, null).re(m).od(chr.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h));
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
    r('reflow,onChildPositions... -> "childBoundingRTree$.insert..."', pt.reflow.pipe(rx.switchMap(([m]) => {
        return rx.combineLatest([
            childBoundingRTree$,
            pt.onChildPositions.pipe((0, reactivizer_1.actionRelatedToAction)(m)),
            table.l.allDisplayChildren
        ]).pipe(rx.take(1), rx.mergeMap(([cbt, [, pos], [, children]]) => {
            // listContainer.log('-- cbt clear');
            cbt.clear();
            return rx.from(children.map((chd) => [chd, pos.get(chd)])).pipe(rx.mergeMap(([chd, pos], idx) => chd.table.l.onSize.pipe(rx.take(1), rx.map(([, w, h]) => {
                const [x, y] = pos;
                // listContainer.log('-- cbt insert', x, y, w, h);
                cbt.insert([[x, y, w, h], [idx, chd]]);
            }))));
        }));
    })));
    r('reflow, ... -> onChildPositions, child.onSize, onChangeChildrenSize', listContainer.pt.reflow.pipe(rx.mergeMap(a => rx.combineLatest(reflowData).pipe(rx.take(1), rx.map(b => [a, ...b]))), rx.switchMap(([[m], [, w, h], [children, growOfEach, shrinkOfEach], [, chrPrefSizes], [, justifyContent], [, alignItems], [, pWidth, pHeight], [, dir], [, marginWidth], [, borderSep]]) => {
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
                    chd.ft.querySizeOf(null, chrCrossAxisPrefSizes[i] > crossAxis ? crossAxis : chrCrossAxisPrefSizes[i])
                        .re(m).od(chd.pt.prefWidthFor).pipe(rx.map(([, w]) => w)) :
                    chd.ft.querySizeOf(chrCrossAxisPrefSizes[i] > crossAxis ? crossAxis : chrCrossAxisPrefSizes[i], null)
                        .re(m).od(chd.pt.prefHeightFor).pipe(rx.map(([, , h]) => h)))).pipe(rx.take(1));
            }
            let remainSpace = mainAxis - margin * (children.length > 0 ? children.length - 1 : 0);
            if (remainSpace < 0)
                remainSpace = 0;
            calcChdSizes$ = chdPrefMainChanged$.pipe(rx.mergeMap(chdMainPrefSize => {
                chrMainAxisSizes = shrinkEachSize(chdMainPrefSize, shrinkOfEach, remainSpace);
                listContainer.log(':: chdMainPrefSize', chdMainPrefSize.join(), 'shrinkOfEach=', shrinkOfEach, 'remainSpace=', remainSpace, 'chrMainAxisSizes', chrMainAxisSizes);
                return rx.forkJoin(dir === 'row' ?
                    children.map((chr, i) => chr.ft.querySizeOf(chrMainAxisSizes[i], null)
                        .re(m).od(chr.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h))) :
                    children.map((chr, i) => chr.ft.querySizeOf(null, chrMainAxisSizes[i])
                        .re(m).od(chr.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w))));
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
                children.map((chr, i) => chr.ft.querySizeOf(null, chrCrossAxisSizes[i]).re(m)
                    .od(chr.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w))) :
                children.map((chr, i) => chr.ft.querySizeOf(chrCrossAxisSizes[i], null).re(m)
                    .od(chr.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h)))).pipe(rx.take(1), rx.switchMap(values => values), rx.reduce((sum, value) => {
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
            chrMainAxisSizes = stretchEachSize(chrMainAxisPrefSizes, growOfEach, shrinkOfEach, mainAxis - margin * (children.length - 1), (...text) => listContainer.log(...text));
            // listContainer.log('-- chrMainAxisSizes', chrMainAxisSizes);
            if (alignItems === 'stretch') {
                for (let i = 0, l = children.length; i < l; i++) {
                    chrCrossAxisSizes[i] = crossAxis;
                }
            }
            calcChdSizes$ = rx.EMPTY;
        }
        const setPositions$ = new rx.Observable(sub => {
            var _a, _b, _c, _d;
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
                    children[i].ft.onSize((_a = chrMainAxisSizes[i]) !== null && _a !== void 0 ? _a : 0, (_b = chrCrossAxisSizes[i]) !== null && _b !== void 0 ? _b : 0).dp(m);
                else
                    children[i].ft.onSize((_c = chrCrossAxisSizes[i]) !== null && _c !== void 0 ? _c : 0, (_d = chrMainAxisSizes[i]) !== null && _d !== void 0 ? _d : 0).dp(m);
            }
            // listContainer.log('childrenPosition:', ...childrenPosition.map(pos => '[' + pos.join(', ') + ']'));
            ft.onChildPositions(childrenPosition).dp(m);
            sub.complete();
        });
        return rx.concat(calcChdSizes$.pipe(rx.finalize(() => ft.onChangeChildrenSize(chrMainAxisSizes, chrCrossAxisSizes).dp(m))), setPositions$).pipe(listContainer.catchErrorFor(m));
    })));
    r('onChildPreferredSizeChange,... -> onContentSizeChange', rx.combineLatest([
        listContainer.pt.onChildPreferredSizeChange,
        table.l.setDirection, table.l.setBorderSpacing,
        table.l.setBorderSeparator
    ]).pipe(rx.map(([[m, sizes], [, direction], [, marginWidth], [, borderSeq]]) => {
        if (direction === 'row') {
            // eslint-disable-next-line prefer-const
            let [fw, fh] = sizes.reduce((preferred, [w, h]) => {
                preferred[0] += w;
                if (h > preferred[1])
                    preferred[1] = h;
                return preferred;
            }, [0, 0]);
            fw += (borderSeq === FlexBorderSeparator.line ? 2 + marginWidth + 1 : marginWidth) * (sizes.length - 1);
            ft.onContentSizeChange(fw, fh).dp(m);
        }
        else if (direction === 'col') {
            const [fw, fh] = sizes.reduce((preferred, [w, h]) => {
                preferred[1] += h;
                if (w > preferred[0])
                    preferred[0] = w;
                return preferred;
            }, [0, 0]);
            ft.onContentSizeChange(fw, fh).dp(m);
        }
    })));
    r('onRender -> renderSelf, renderChild', pt.onRender.pipe(rx.withLatestFrom(childBoundingRTree$, table.l.setDirection, table.l.onSize, table.l.setBorderSeparator, table.l.setBorderSeparatorStyle), rx.map(([[m, canvas, trans, renderSelf, clips, masks], cbt, [, dir], [, , h], [, borderSep], [, sepStyle]]) => {
        if (masks == null)
            masks = [];
        if (renderSelf) {
            ft.renderSelf(canvas, trans, clips, masks).dp(m);
        }
        if (dir === 'row' && borderSep === FlexBorderSeparator.line) {
            const orig = gl_matrix_1.vec2.create();
            gl_matrix_1.vec2.transformMat4(orig, orig, trans);
            for (const sepPos of separatorPos) {
                for (let i = 0; i < h; i++)
                    canvas.ft.addString(orig[0] + sepPos, orig[1] + i, '│', sepStyle).dp(m);
            }
        }
        listContainer.log('-- cbt searching clips', clips.join(), cbt.all().map(([, [, c]]) => c.s.logPrefix));
        let chrToRender = clips.flatMap(r => cbt.searchOverlaps(r)).map(([, c]) => c);
        // listContainer.log('-- cbt founds', chrToRender.map(([, c]) => c.s.logPrefix));
        // listContainer.log('-- masks', masks.join());
        const excluded = new Set(masks ?
            masks.flatMap(r => cbt.searchForCovered(r).map(([, [, c]]) => c)) :
            []);
        chrToRender = chrToRender.filter(([, c]) => !excluded.has(c));
        listContainer.log('-- chrToRender', chrToRender.map(([, c]) => c.s.logPrefix), clips.join());
        for (let i = 0, l = chrToRender.length; i < l; i++) {
            const [idx, chr] = chrToRender[i];
            ft.renderChild(idx, chr, canvas, trans, clips, masks).dp(m);
        }
    })));
    r('findOverlaps -> didFindOverlaps', pt.findOverlaps.pipe(rx.mergeMap(([m, ...rect]) => table.l.onBoundingBox.pipe(rx.take(1), rx.switchMap(([, [x, y, w, h]]) => {
        if (x == null) {
            ft.didFindOverlaps([]).dp(m);
            return rx.EMPTY;
        }
        const r = (0, canvas_1.rectIntersection)([x, y, w, h], rect);
        if (r == null) {
            ft.didFindOverlaps([]).dp(m);
            return rx.EMPTY;
        }
        return rx.of([r[0] - x, r[1] - y, r[2], r[3]]);
    }), rx.withLatestFrom(childBoundingRTree$), rx.mergeMap(([[x, y, w, h], cbt]) => {
        // listContainer.log('childBoundingTree', [...childBoundingTree.allRectangles()].map(([r, [[, w]]]) => `${r.join()}: ${w.s.logPrefix}`));
        const children = cbt.search({ minX: x, minY: y, maxX: x + w, maxY: y + h });
        return rx.from(children).pipe(rx.mergeMap(([, [, chd]]) => chd.table.l.isContainer.pipe(rx.take(1), rx.mergeMap(([, isContainer]) => isContainer ?
            chd.ft.findOverlaps(...rect)
                .re(m).od(chd.pt.didFindOverlaps).pipe(rx.map(([, chdOfChd]) => chdOfChd), rx.take(1), rx.endWith([chd])) :
            rx.of([chd])))), rx.reduce((acc, it) => {
            acc.push(...it);
            return acc;
        }, []), rx.map(found => ft.didFindOverlaps(found).dp(m)));
    })))));
    const reflowData = [
        table.l.onSize,
        table.l.allDisplayChildren.pipe(rx.switchMap(([, chdn]) => {
            return rx.combineLatest([
                rx.combineLatest(chdn.map(chd => chd.table.l.setFlexGrow.pipe(rx.map(([, v]) => v)))),
                rx.combineLatest(chdn.map(chd => chd.table.l.setFlexShrink.pipe(rx.map(([, v]) => v))))
            ]).pipe(rx.map(([grows, shrinks]) => [chdn, grows, shrinks]));
        })),
        table.l.onChildPreferredSizeChange, table.l.justifyContent, table.l.alignItems,
        table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing, table.l.setBorderSeparator
    ];
    r('allDisplayChildren,...-> requestReflow', pt.allDisplayChildren.pipe(rx.switchMap(([, chdn]) => {
        return rx.merge(...chdn.map(chd => rx.merge(chd.pt.setFlexGrow, chd.pt.setFlexShrink)));
    }), rx.map(([m]) => ft.requestReflow().dp(m))));
    r('init', new rx.Observable(() => {
        ft.setDirection('row').dp();
        ft.alignItems('stretch').dp();
        ft.justifyContent('stretch').dp();
        ft.setBorderSpacing(1).dp();
        ft.setBorderSeparator(FlexBorderSeparator.none).dp();
        ft.setBorderSeparatorStyle([]).dp();
        ft.requestReflowOn(pt.onSize, table.l.onChildPreferredSizeChange, table.l.justifyContent, table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing, table.l.setBorderSeparator).dp();
    }));
});
function createFlexContainer(opts = {}) {
    return exports.flexContainerFac.create(opts);
}
function shrinkEachSize(chdPrefSizes, shrinkOfEach, availableSpace) {
    if (chdPrefSizes.length === 0)
        return [];
    if (availableSpace < 0) {
        availableSpace = 0;
    }
    const prefSizeTotal = chdPrefSizes.reduce((prev, curr) => prev + curr, 0);
    const spaceToShrink = prefSizeTotal - availableSpace;
    const numOfShrinkUnit = chdPrefSizes.reduce((prev, curr, i) => prev + (curr * shrinkOfEach[i]), 0);
    const shrinkUnit = numOfShrinkUnit > 0 ? spaceToShrink / numOfShrinkUnit : 0;
    const chrSizes = [];
    let floatGap = 0;
    let i = 0;
    for (const preSize of chdPrefSizes) {
        const units = preSize * shrinkOfEach[i];
        const fSize = preSize - shrinkUnit * units;
        let size = Math.round(fSize);
        floatGap += fSize - size;
        if (floatGap > 0.5) {
            size++;
            floatGap--;
        }
        else if (floatGap < -0.5) {
            size--;
            floatGap++;
        }
        chrSizes.push(size < 0 ? 0 : size);
        i++;
    }
    return chrSizes;
}
function stretchEachSize(prefSizes, growOfEach, shrinkOfEach, availableSpace, log) {
    const remaining = availableSpace - prefSizes.reduce((sum, size) => {
        sum += size;
        return sum;
    }, 0);
    // if (log)
    //   log('--stretchEachSize remaining', remaining, shrinkOfEach, prefSizes, availableSpace);
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
        let iGrowSize = Math.round(growSize);
        floatGap += growSize - iGrowSize;
        if (floatGap > 0.5) {
            iGrowSize += 1;
            floatGap--;
        }
        else if (floatGap < -0.5) {
            iGrowSize -= 1;
            floatGap++;
        }
        return iGrowSize + pref;
    });
}
//# sourceMappingURL=flex-container.js.map