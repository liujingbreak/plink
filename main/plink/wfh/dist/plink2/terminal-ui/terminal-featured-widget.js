"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createListContainer = createListContainer;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
// import {TerminalCanvas} from './terminal-canvas';
const terminal_widget_1 = require("./terminal-widget");
const tableForListContainer = ['setDirection', 'alignItems', 'justifyContent', 'setMarginWidth', 'onChildPreferredSizeChange'];
function createListContainer(opts = {}) {
    const base = (0, terminal_widget_1.createContainerBase)();
    const listContainer = base.config(Object.assign(Object.assign({ name: 'listContainer' }, opts), { tableFor: tableForListContainer }));
    let childrenPosition;
    base.s.interceptor$.next(action$ => {
        const dispenser = reactivizer_1.ActionDispenser.ofAction$(action$);
        return rx.merge(dispenser.at.renderChild.pipe(rx.ignoreElements()), dispenser.ofOtherTypes());
    });
    const s = listContainer.s.prependController();
    const { r, table } = listContainer;
    r('addChild, removeChild, children.preferredSize -> onChildPreferredSizeChange', rx.merge(listContainer.s.pt.addChild, // it is important that we use "listContainer.s" instead of prepeneded controller, cuz' we need to handle actions after the original reactors finishes
    listContainer.s.pt.removeChild).pipe(rx.switchMap(() => table.l.allChildren.pipe(rx.switchMap(([, children]) => {
        return rx.combineLatest([...children].map(widget => {
            return widget.table.l.preferredSize;
        }));
    }), rx.map(preferredSizeOfChildren => {
        s.ft.onChildPreferredSizeChange(preferredSizeOfChildren.map(([, w, h]) => [w, h])).dp();
    })))));
    r('querySizeOf -> prefHeightFor, preferredSize', s.pt.querySizeOf.pipe(rx.withLatestFrom(table.l.allChildren, table.l.onChildPreferredSizeChange, table.l.justifyContent, table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setMarginWidth), rx.switchMap(([[m, w, h], [, children], [, chrPreferredSizes], [, _justifyContent], [, _alignItems], [, pWidth, pHeight], [, dir], [, marginWidth]]) => {
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
                    s.ft.prefHeightFor(mainAxis, pHeight).dp(m);
                else
                    s.ft.prefWidthFor(pWidth, mainAxis).dp(m);
                return rx.EMPTY;
            }
            else {
                const childrenSizeOfMainAxis = calculateSizeOfEach(dir === 'row' ? chrPreferredSizes.map(([w]) => w) : chrPreferredSizes.map(([, h]) => h), mainAxis);
                return rx.merge(...children.map((chr, idx) => {
                    return dir === 'row' ?
                        chr.s.ft.querySizeOf(childrenSizeOfMainAxis[idx], null).re(m).od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h)) :
                        chr.s.ft.querySizeOf(null, childrenSizeOfMainAxis[idx]).re(m).od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w));
                })).pipe(rx.reduce((max, size) => {
                    return Math.max(max, size);
                }, 0), rx.map(crossAxisMaxSize => {
                    if (dir === 'row')
                        s.ft.prefHeightFor(mainAxis, crossAxisMaxSize).dp(m);
                    else
                        s.ft.prefWidthFor(crossAxisMaxSize, mainAxis).dp(m);
                }));
            }
        }
        else if (crossAxis != null) {
            if (crossAxis > pCrossAxis) {
                if (dir === 'row')
                    s.ft.prefWidthFor(pWidth, crossAxis).dp(m);
                else
                    s.ft.prefHeightFor(crossAxis, pHeight).dp(m);
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
                        s.ft.prefWidthFor(mainAxisPrefSize + marginWidth * (children.length - 1), crossAxis).dp(m);
                    }
                    else
                        s.ft.prefHeightFor(crossAxis, mainAxisPrefSize).dp(m);
                }));
            }
        }
        return rx.EMPTY;
    })));
    // r('setSize -> reflow', table.l.setSize.pipe(
    //   rx.distinctUntilChanged(([, aw, ah], [, bw, bh]) => aw === bw && ah === bh),
    //   rx.map(([m]) => s.ft.reflow().dp(m))
    // ));
    r('reflow, ... -> setLayoutValid, child.setSize', s.pt.reflow.pipe(rx.mergeMap(a => rx.combineLatest([
        table.l.setSize,
        table.l.allChildren, table.l.onChildPreferredSizeChange, table.l.justifyContent,
        table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setMarginWidth
    ]).pipe(rx.take(1), rx.map(b => [a, ...b]))), rx.switchMap(([[m], [, w, h], [, children], [, chrPrefSizes], [, justifyContent], [, alignItems], [, pWidth, pHeight], [, dir], [, marginWidth]]) => {
        s.ft.setLayoutValid(true).dp(m);
        childrenPosition = [];
        let mainAxis = w;
        let crossAxis = h;
        let pMainAxis = pWidth;
        const margin = dir === 'row' ? marginWidth : 0;
        if (dir === 'col') {
            mainAxis = h;
            crossAxis = w;
            pMainAxis = pHeight;
        }
        let chrMainAxisSizes = [];
        const chrMainAxisPrefSizes = dir === 'row' ?
            chrPrefSizes.map(([w]) => w) :
            chrPrefSizes.map(([, h]) => h);
        const chrCrossAxisPrefSizes = dir === 'col' ?
            chrPrefSizes.map(([w]) => w) :
            chrPrefSizes.map(([, h]) => h);
        let calcChildrenPositionOfMainAxis$ = rx.EMPTY;
        if (mainAxis > pMainAxis) {
            // Case: actual space is bigger than preferred size, we need to consider "justifyContent".
            // set children widget postion on main axis
            const space = (mainAxis - pMainAxis) - (dir === 'row' ? marginWidth * (children.length - 1) : 0);
            let pos = justifyContent === 'start' ?
                0 :
                justifyContent === 'center' ?
                    space >> 1 :
                    space;
            for (let i = 0, l = children.length; i < l; i++) {
                if (dir === 'row')
                    childrenPosition.push([pos, 0]);
                else
                    childrenPosition.push([0, pos]);
                pos += chrMainAxisPrefSizes[i];
                pos += margin;
                chrMainAxisSizes.push(chrMainAxisPrefSizes[i]);
            }
        }
        else {
            // if space is smaller than preferred size, for each child, set its size to MIN(space-for-each, child preferred size)
            const totalMargin = margin * (children.length - 1);
            calcChildrenPositionOfMainAxis$ = rx.zip(children.map((chr, i) => {
                return chrCrossAxisPrefSizes[i] < crossAxis ?
                    rx.of(chrMainAxisPrefSizes[i]) :
                    dir === 'row' ?
                        chr.s.ft.querySizeOf(null, crossAxis).re(m).od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w)) :
                        chr.s.ft.querySizeOf(crossAxis, null).re(m).od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h));
            })).pipe(rx.take(1), rx.map(chrPrefMainAxisSizes => {
                var _a;
                chrMainAxisSizes = calculateSizeOfEach(chrPrefMainAxisSizes, mainAxis - totalMargin);
                let pos = 0;
                for (let i = 0, l = chrMainAxisSizes.length; i < l; i++) {
                    const childSize = chrMainAxisSizes[i];
                    if (dir === 'row')
                        childrenPosition.push([pos, 0]);
                    else
                        childrenPosition.push([0, pos]);
                    pos += childSize;
                    pos += margin;
                }
                (_a = listContainer.opts) === null || _a === void 0 ? void 0 : _a.log('done -- childrenPosition', childrenPosition, 'chrMainAxisSizes', chrMainAxisSizes);
                return childrenPosition;
            }));
        }
        return rx.concat(calcChildrenPositionOfMainAxis$, rx.defer(() => rx.forkJoin(children.map((chr, i) => {
            return dir === 'row' ?
                chr.s.ft.querySizeOf(chrMainAxisSizes[i], null).re(m).od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h)) :
                chr.s.ft.querySizeOf(null, chrMainAxisSizes[i]).re(m).od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w));
        })).pipe(
        // Let's calculate position and size of each child on cross-axis
        rx.map(contrainedChrCrossAxisPrefSizes => {
            for (let i = 0, l = childrenPosition.length; i < l; i++) {
                let chrCrossAxisSize = 0;
                const chrCrossExisPrefSize = contrainedChrCrossAxisPrefSizes[i];
                if (contrainedChrCrossAxisPrefSizes[i] < crossAxis) {
                    const space = crossAxis - chrCrossExisPrefSize;
                    const pos = alignItems === 'start' ? 0 : alignItems === 'center' ? space >> 1 : space;
                    if (dir === 'row')
                        childrenPosition[i][1] = pos;
                    else
                        childrenPosition[i][0] = pos;
                    chrCrossAxisSize = chrCrossExisPrefSize;
                }
                else {
                    chrCrossAxisSize = crossAxis;
                    // let childrenPosition remains 0
                }
                const childWidget = children[i];
                if (dir === 'row')
                    childWidget.s.ft.setSize(chrMainAxisSizes[i], chrCrossAxisSize).dp(m);
                else
                    childWidget.s.ft.setSize(chrCrossAxisSize, chrMainAxisSizes[i]).dp(m);
            }
        }))));
    })));
    r('onChildPreferredSizeChange,... -> preferredSize', rx.combineLatest([
        s.pt.onChildPreferredSizeChange,
        table.l.setDirection, table.l.setMarginWidth
    ]).pipe(rx.map(([[m, sizes], [, direction], [, marginWidth]]) => {
        if (direction === 'row') {
            const finalPreferredSize = sizes.reduce((preferred, [w, h]) => {
                preferred[0] += w;
                if (h > preferred[1])
                    preferred[1] = h;
                return preferred;
            }, [0, 0]);
            finalPreferredSize[0] += marginWidth * (sizes.length - 1);
            s.ft.preferredSize(finalPreferredSize[0], finalPreferredSize[1]).dp(m);
        }
        else if (direction === 'col') {
            const finalPreferredSize = sizes.reduce((preferred, [w, h]) => {
                preferred[1] += h;
                if (w > preferred[0])
                    preferred[0] = w;
                return preferred;
            }, [0, 0]);
            s.ft.preferredSize(finalPreferredSize[0], finalPreferredSize[1]).dp(m);
        }
    })));
    r('renderChild, "childrenPosition" -> child.render', s.pt.renderChild.pipe(rx.map(([m, index, chr, canvas, trans]) => {
        const pos = childrenPosition[index];
        const tranOfChild = gl_matrix_1.mat4.fromTranslation(gl_matrix_1.mat4.create(), [pos[0], pos[1], 0]);
        gl_matrix_1.mat4.mul(tranOfChild, trans, tranOfChild);
        chr.s.ft.render(canvas, tranOfChild).re(m).dp();
    })));
    s.ft.setDirection('row').dp();
    s.ft.alignItems('center').dp();
    s.ft.justifyContent('start').dp();
    s.ft.setMarginWidth(1).dp();
    for (const a$ of [
        table.l.onChildPreferredSizeChange, s.pt.setDirection, s.pt.setMarginWidth,
        s.pt.alignItems, s.pt.justifyContent
    ]) {
        s.ft.addReflowAction(a$).dp();
    }
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
//# sourceMappingURL=terminal-featured-widget.js.map