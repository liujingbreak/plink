"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createListContainer = createListContainer;
exports.createBorderContainer = createBorderContainer;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
// import {TerminalCanvas} from './terminal-canvas';
const terminal_widget_1 = require("./terminal-widget");
const tableForListContainer = ['setDirection', 'alignItems', 'justifyContent', 'setBorderSpacing'];
function createListContainer(opts = {}) {
    const base = (0, terminal_widget_1.createContainerBase)();
    const listContainer = base.config(Object.assign(Object.assign({ name: 'listContainer' }, opts), { tableFor: tableForListContainer }));
    let childrenPosition;
    // const childToIdx = new Map<unknown, number>();
    // intercept "renderChild"
    base.s.interceptor$.next(action$ => {
        const dispenser = reactivizer_1.ActionDispenser.ofAction$(action$);
        return rx.merge(dispenser.at.renderChild.pipe(rx.ignoreElements()), dispenser.ofOtherTypes());
    });
    const prependCtl = listContainer.s.prependController();
    const { r, table, s } = listContainer;
    const { ft } = s;
    r('querySizeOf -> prefHeightFor, preferredSize', listContainer.s.pt.querySizeOf.pipe(rx.withLatestFrom(table.l.allChildren, table.l.onChildPreferredSizeChange, table.l.justifyContent, table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing), rx.switchMap(([[m, w, h], [, children], [, chrPreferredSizes], [, _justifyContent], [, _alignItems], [, pWidth, pHeight], [, dir], [, marginWidth]]) => {
        let mainAxis = w;
        let crossAxis = h;
        let pMainAxis = pWidth;
        const pCrossAxis = pHeight;
        if (dir === 'col') {
            mainAxis = h;
            crossAxis = w;
            pMainAxis = pHeight;
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
                const childrenSizeOfMainAxis = calculateSizeOfEach(dir === 'row' ? chrPreferredSizes.map(([w]) => w) : chrPreferredSizes.map(([, h]) => h), mainAxis - marginWidth * (children.length - 1));
                return rx.merge(...children.map((chr, idx) => {
                    return dir === 'row' ?
                        chr.s.ft.querySizeOf(childrenSizeOfMainAxis[idx], null).re(m).od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h)) :
                        chr.s.ft.querySizeOf(null, childrenSizeOfMainAxis[idx]).re(m).od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w));
                })).pipe(rx.reduce((max, size) => {
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
                        ft.prefWidthFor(mainAxisPrefSize + marginWidth * (children.length - 1), crossAxis).dp(m);
                    }
                    else
                        ft.prefHeightFor(crossAxis, mainAxisPrefSize).dp(m);
                }));
            }
        }
        return rx.EMPTY;
    })));
    r('reflow, ... -> setLayoutValid, child.setSize, onChangeChildrenSize', listContainer.s.pt.reflow.pipe(rx.mergeMap(a => rx.combineLatest([
        table.l.setSize,
        table.l.allChildren, table.l.onChildPreferredSizeChange, table.l.justifyContent,
        table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing
    ]).pipe(rx.take(1), rx.map(b => [a, ...b]))), rx.switchMap(([[m], [, w, h], [, children], [, chrPrefSizes], [, justifyContent], [, alignItems], [, pWidth, pHeight], [, dir], [, marginWidth]]) => {
        ft.setLayoutValid(true).dp(m);
        childrenPosition = [];
        let mainAxis = w;
        let crossAxis = h;
        let pMainAxis = pWidth;
        let pCrossAxis = pHeight;
        const margin = dir === 'row' ? marginWidth : 0;
        if (dir === 'col') {
            mainAxis = h;
            crossAxis = w;
            pMainAxis = pHeight;
            pCrossAxis = pWidth;
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
            chrMainAxisSizes = calculateSizeOfEach(chrMainAxisPrefSizes, mainAxis - margin * (children.length - 1));
            calcChdSizes$ = rx.forkJoin(dir === 'row' ?
                children.map((chr, i) => chr.s.ft.querySizeOf(chrMainAxisSizes[i], null)
                    .re(m).od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h))) :
                children.map((chr, i) => chr.s.ft.querySizeOf(null, chrMainAxisSizes[i])
                    .re(m).od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w)))).pipe(rx.switchMap(values => values), rx.map((value, i) => {
                chrCrossAxisSizes[i] = value > crossAxis ? crossAxis : value;
            }));
        }
        else if (crossAxis < pCrossAxis) {
            chrMainAxisSizes = [];
            for (const v of chrCrossAxisPrefSizes) {
                chrCrossAxisSizes.push(Math.min(v, crossAxis));
            }
            calcChdSizes$ = rx.zip(dir === 'row' ?
                children.map((chr, i) => chr.s.ft.querySizeOf(null, chrCrossAxisSizes[i]).re(m)
                    .od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w))) :
                children.map((chr, i) => chr.s.ft.querySizeOf(chrCrossAxisSizes[i], null).re(m)
                    .od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h)))).pipe(rx.switchMap(values => values), rx.reduce((sum, value) => {
                chrMainAxisSizes.push(value);
                sum += value;
                return sum;
            }, 0), rx.map(sum => {
                if (sum > mainAxis) {
                    chrMainAxisSizes = calculateSizeOfEach(chrMainAxisSizes, mainAxis - margin * (children.length - 1));
                }
            }));
        }
        else {
            chrMainAxisSizes = [...chrMainAxisPrefSizes];
            chrCrossAxisSizes = [...chrCrossAxisPrefSizes];
            calcChdSizes$ = rx.EMPTY;
        }
        const setPositions$ = new rx.Observable(sub => {
            let space = mainAxis - (margin * (children.length - 1)) - chrMainAxisSizes.reduce((sum, v) => {
                sum += v;
                return sum;
            }, 0);
            let pos = justifyContent === 'start' ?
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
                    childrenPosition.push([pos, crossPos]);
                else
                    childrenPosition.push([crossPos, pos]);
                if (i !== l - 1) {
                    const fSpaceBetween = justifyContent === 'space-between' ? space / (l - 1 - i) : 0;
                    baseSpaceBetween = Math.floor(fSpaceBetween);
                    pos += chrMainAxisSizes[i];
                    pos += margin + baseSpaceBetween;
                    space -= baseSpaceBetween;
                }
                if (dir === 'row')
                    children[i].s.ft.setSize(chrMainAxisSizes[i], chrCrossAxisSizes[i]).dp(m);
                else
                    children[i].s.ft.setSize(chrCrossAxisSizes[i], chrMainAxisSizes[i]).dp(m);
            }
            sub.complete();
        });
        return rx.concat(calcChdSizes$.pipe(rx.finalize(() => s.ft.onChangeChildrenSize(chrMainAxisSizes, chrCrossAxisSizes).dp(m))), setPositions$).pipe(listContainer.catchErrorFor(m));
    })));
    r('onChildPreferredSizeChange,... -> preferredSize', rx.combineLatest([
        listContainer.s.pt.onChildPreferredSizeChange,
        table.l.setDirection, table.l.setBorderSpacing
    ]).pipe(rx.map(([[m, sizes], [, direction], [, marginWidth]]) => {
        if (direction === 'row') {
            const finalPreferredSize = sizes.reduce((preferred, [w, h]) => {
                preferred[0] += w;
                if (h > preferred[1])
                    preferred[1] = h;
                return preferred;
            }, [0, 0]);
            finalPreferredSize[0] += marginWidth * (sizes.length - 1);
            ft.preferredSize(finalPreferredSize[0], finalPreferredSize[1]).dp(m);
        }
        else if (direction === 'col') {
            const finalPreferredSize = sizes.reduce((preferred, [w, h]) => {
                preferred[1] += h;
                if (w > preferred[0])
                    preferred[0] = w;
                return preferred;
            }, [0, 0]);
            ft.preferredSize(finalPreferredSize[0], finalPreferredSize[1]).dp(m);
        }
    })));
    r('renderChild, "childrenPosition" -> child.render', prependCtl.pt.renderChild.pipe(rx.map(([m, index, chr, canvas, trans]) => {
        const pos = childrenPosition[index];
        const tranOfChild = gl_matrix_1.mat4.fromTranslation(gl_matrix_1.mat4.create(), [pos[0], pos[1], 0]);
        gl_matrix_1.mat4.mul(tranOfChild, trans, tranOfChild);
        chr.s.ft.render(canvas, tranOfChild).re(m).dp();
    })));
    r('init', s.pt.init.pipe(rx.map(([m]) => {
        ft.setDirection('row').dp(m);
        ft.alignItems('center').dp(m);
        ft.justifyContent('start').dp(m);
        ft.setBorderSpacing(1).dp(m);
        for (const a$ of [
            s.pt.setDirection, s.pt.setBorderSpacing,
            s.pt.alignItems, s.pt.justifyContent, s.pt.setBackground
        ]) {
            ft.addReflowAction(a$).dp(m);
        }
    })));
    return listContainer;
}
function calculateSizeOfEach(individualPrefSizes, totalSize) {
    const prefSizeTotal = individualPrefSizes.reduce((prev, curr) => prev + curr);
    const ratio = totalSize / prefSizeTotal;
    const chrSizes = [];
    let floatGap = 0;
    for (const preSize of individualPrefSizes) {
        const fSize = preSize * ratio;
        let size = Math.floor(fSize);
        floatGap += fSize - size;
        if (floatGap > 1) {
            size++;
            floatGap -= 1;
        }
        chrSizes.push(size);
    }
    return chrSizes;
}
const tableForBorderContainer = ['setBorder', 'setBorderStyle', 'setPadding'];
const BORDER_CHARS = ['╭─╮', '╰─╯', '│'];
function createBorderContainer(child) {
    const container = (0, terminal_widget_1.createContainerBase)();
    const service = container.config({
        name: 'borderContainer', tableFor: tableForBorderContainer
    });
    const { r, table, s } = service;
    const childPos = [0, 0];
    // intercept "renderChild"
    s.interceptor$.next(action$ => {
        const dispenser = reactivizer_1.ActionDispenser.ofAction$(action$);
        return rx.merge(dispenser.at.renderChild.pipe(rx.map(action => {
            const { p: [, child, canvas, trans] } = action;
            const pos = childPos;
            const tranOfChild = gl_matrix_1.mat4.fromTranslation(gl_matrix_1.mat4.create(), [pos[0], pos[1], 0]);
            gl_matrix_1.mat4.mul(tranOfChild, trans, tranOfChild);
            child.s.ft.render(canvas, tranOfChild).dp(action);
        }), rx.ignoreElements()), dispenser.ofOtherTypes());
    });
    r('querySizeOf -> prefWidthFor, prefHeightFor', s.pt.querySizeOf.pipe(rx.withLatestFrom(table.l.allChildren, table.l.setBorder, table.l.setPadding), rx.mergeMap(([[m, w, h], [, children], [, border], [, top, right, bottom, left]]) => {
        if (w == null && h != null) {
            return children[0].s.ft.querySizeOf(null, h - top - bottom - (border === 'line' ? 2 : 0)).re(m).od(children[0].s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, childWidth]) => {
                s.ft.prefWidthFor(childWidth + left + right + (border === 'line' ? 2 : 0), h).dp(m);
            }));
        }
        else if (h == null && w != null) {
            return children[0].s.ft.querySizeOf(w - left - right - (border === 'line' ? 2 : 0), null).re(m).od(children[0].s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , childHeight]) => {
                s.ft.prefHeightFor(w, childHeight + top + bottom + (border === 'line' ? 2 : 0)).dp(m);
            }));
        }
        return rx.EMPTY;
    })));
    r('onChildPreferredSizeChange,... -> preferredSize', rx.combineLatest([
        s.pt.onChildPreferredSizeChange,
        table.l.setBorder, table.l.setPadding
    ]).pipe(rx.map(([[m, sizes], [m2, border], [m3, top, right, bottom, left]]) => {
        const line = border === 'line' ? 2 : 0;
        s.ft.preferredSize(sizes[0][0] + line + right + left, sizes[0][1] + line + top + bottom).dp(m, m2, m3);
    })));
    r('reflow -> setSize, setLayoutValid', s.pt.reflow.pipe(rx.withLatestFrom(table.l.setSize, table.l.setBorder, table.l.setPadding, table.l.allChildren), rx.map(([[m], [, w, h], [, border], [, top, right, bottom, left], [, children]]) => {
        s.ft.setLayoutValid(true).dp(m);
        childPos[0] = childPos[1] = 0;
        let borderLine = 0;
        if (border === 'line') {
            childPos[0] = 1;
            childPos[1] = 1;
            borderLine = 2;
        }
        childPos[0] += left;
        childPos[1] += top;
        const cWidth = w - left - right - borderLine;
        const cHeight = h - top - bottom - borderLine;
        if (cWidth > 0 && cHeight > 0) {
            children[0].s.ft.setSize(cWidth, cHeight).dp(m);
        }
        // service.log('>>>>>>>>>>>>>>>>>>>>>>>>>>> childPos', childPos);
    })));
    r('renderSelf', s.pt.renderSelf.pipe(rx.withLatestFrom(table.l.setBorder, table.l.setBorderStyle, table.l.setSize), rx.map(([[m, canvas, trans], [, border], [, style], [, w, h]]) => {
        const pos = [0, 0];
        if (border === 'line' && w > 2 && h > 2) {
            gl_matrix_1.vec2.transformMat4(pos, pos, trans);
            canvas.s.ft.addString(pos[0], pos[1], BORDER_CHARS[0][0] + BORDER_CHARS[0][1].repeat(w - 2) + BORDER_CHARS[0][2], style).dp(m);
            for (let i = 1, l = h - 2; i <= l; i++) {
                const y = pos[1] + i;
                canvas.s.ft.addString(pos[0], y, BORDER_CHARS[2], style).dp(m);
                canvas.s.ft.addString(pos[0] + w - 1, y, BORDER_CHARS[2], style).dp(m);
            }
            canvas.s.ft.addString(pos[0], pos[1] + h - 1, BORDER_CHARS[1][0] + BORDER_CHARS[1][1].repeat(w - 2) + BORDER_CHARS[1][2], style).dp(m);
        }
    })));
    r('init', s.pt.init.pipe(rx.map(([m]) => {
        s.ft.addReflowAction(s.pt.setBorder).dp(m);
        s.ft.addReflowAction(s.pt.setPadding).dp(m);
        s.ft.addRerenderAction(s.pt.setBorderStyle).dp(m);
        s.ft.setPadding(0, 1, 0, 1).dp(m);
        s.ft.setBorder('line').dp(m);
        s.ft.addChild(child).dp(m);
        s.ft.setBorderStyle([]).dp(m);
    })));
    return service;
}
//# sourceMappingURL=terminal-featured-widget.js.map