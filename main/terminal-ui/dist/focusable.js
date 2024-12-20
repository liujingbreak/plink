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
exports.rootFocusSvc = exports.focusServiceFac = exports.SearchDirection = void 0;
exports.createFocusService = createFocusService;
exports.createRootService = createRootService;
/**
 * User stories:
 * WHEN user press TAB or left, right,...key,
 *  and WHEN there is no existing "onFocus" component,
 *    THEN focus on the most left top (corresponding to the pressed key)
 *    focusable component in viewport.
 *  otherwise focus on "next" right focuable component.
 *
 * WHEN a focusable component is focused,
 *  onFocus event should be dispatched
 */
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const algorithms_1 = require("@wfh/algorithms");
// import {Scrollable} from './scrollable';
const keyEvent_1 = require("./keyEvent");
var SearchDirection;
(function (SearchDirection) {
    SearchDirection[SearchDirection["down"] = 0] = "down";
    SearchDirection[SearchDirection["up"] = 1] = "up";
    SearchDirection[SearchDirection["right"] = 2] = "right";
    SearchDirection[SearchDirection["left"] = 3] = "left";
})(SearchDirection || (exports.SearchDirection = SearchDirection = {}));
const tableFor = [
    'didFocus', 'handleKeyEvents',
    'rootService', 'controlHandleEvents'
];
exports.focusServiceFac = new reactivizer_1.BaseReactorFactory({
    name: 'focusSvc',
    tableFor
}).defineReactor((init, opts) => {
    const service = init(opts);
    const { s, r, table } = service;
    const rectByComponent = new Map();
    const xTree = new algorithms_1.RedBlackTree();
    const yTree = new algorithms_1.RedBlackTree();
    r('removeFocusable -> onRectRemoved', s.pt.removeFocusable.pipe(rx.map(([m, c]) => {
        const rect = rectByComponent.get(c);
        if (rect) {
            // service.log('>>> remove focusable for', c.s.logPrefix, rect);
            rectByComponent.delete(c);
            s.ft.onRectRemoved(rect, c).dp(m);
            const [oldCol, oldRow] = rect;
            const xNode = xTree.search(oldCol);
            if (xNode) {
                const yNode = xNode.value.search(oldRow);
                if (yNode) {
                    const i = yNode.value.findIndex(it => it === c);
                    if (i >= 0) {
                        yNode.value.splice(i, 1);
                        if (yNode.value.length === 0) {
                            xNode.value.deleteNode(yNode);
                            if (xNode.value.size() === 0) {
                                // service.log('>>> delete xTree node', xNode.key, 'for', c.s.logPrefix);
                                xTree.deleteNode(xNode);
                            }
                        }
                    }
                }
            }
            const yNode = yTree.search(oldRow);
            if (yNode) {
                const xNode = yNode.value.search(oldCol);
                if (xNode) {
                    const i = xNode.value.findIndex(it => it === c);
                    if (i >= 0) {
                        xNode.value.splice(i, 1);
                        if (xNode.value.length === 0) {
                            yNode.value.deleteNode(xNode);
                            if (yNode.value.size() === 0) {
                                // service.log('>>> delete yTree node', yNode.key, 'for', c.s.logPrefix);
                                yTree.deleteNode(yNode);
                            }
                        }
                    }
                }
            }
            // service.log('>>> count xTree', xTree.size(), 'yTree', yTree.size());
        }
    })));
    // maintain tree
    r('onRectChange -> "xTree", "yTree"', s.pt.onRectChange.pipe(rx.map(([, rect, c]) => {
        let oldCol;
        let oldRow;
        const ex = rectByComponent.get(c);
        if (ex) {
            if (ex[0] === rect[0] && ex[1] === rect[1]) {
                return;
            }
            oldCol = ex[0];
            oldRow = ex[1];
        }
        const newCol = rect[0];
        const newRow = rect[1];
        // remove old node from xTree and yTree
        if (oldCol != null && oldRow != null) {
            // service.log('>>> delete exiting rect for', c.s.logPrefix, oldCol, oldRow);
            const xNode = xTree.search(oldCol);
            if (xNode) {
                const yNode = xNode.value.search(oldRow);
                if (yNode) {
                    const idx = yNode.value.findIndex(it => it === c);
                    if (idx >= 0)
                        yNode.value.splice(idx, 1);
                    if (yNode.value.length === 0) {
                        xNode.value.deleteNode(yNode);
                        if (xNode.value.size() === 0) {
                            xTree.deleteNode(xNode);
                        }
                    }
                }
            }
            const yNode = yTree.search(oldRow);
            if (yNode) {
                const xNode = yNode.value.search(oldCol);
                if (xNode) {
                    const idx = xNode.value.findIndex(it => it === c);
                    if (idx >= 0)
                        xNode.value.splice(idx, 1);
                    if (xNode.value.length === 0) {
                        yNode.value.deleteNode(xNode);
                        if (yNode.value.size() === 0)
                            yTree.deleteNode(yNode);
                    }
                }
            }
        }
        // add new node to xTree and yTree
        // For x-coordinate first tree
        const newXNode = xTree.search(newCol);
        if (newXNode) {
            const newYNode = newXNode.value.search(newRow);
            if (newYNode) {
                newYNode.value.push(c);
            }
            else {
                const newYNode = newXNode.value.insert(newRow);
                newYNode.value = [c];
            }
        }
        else {
            const newXNode = xTree.insert(newCol);
            newXNode.value = new algorithms_1.RedBlackTree();
            const newYNode = newXNode.value.insert(newRow);
            newYNode.value = [c];
        }
        // for y-coordinate first tree
        const newYNode = yTree.search(newRow);
        if (newYNode) {
            const newXNode = newYNode.value.search(newCol);
            if (newXNode) {
                newXNode.value.push(c);
            }
            else {
                const newXNode = newYNode.value.insert(newCol);
                newXNode.value = [c];
            }
        }
        else {
            const newYNode = yTree.insert(newRow);
            newYNode.value = new algorithms_1.RedBlackTree();
            const newXNode = newYNode.value.insert(newCol);
            newXNode.value = [c];
        }
        // service.log('>>> add rect for', c.s.logPrefix, rect);
        rectByComponent.set(c, rect);
    })));
    // dispatch onFocus event according to didFocus result,
    // when the target component is a offsetParent,
    // designate it to handle key events
    r('focus,didFocus,handleKeyEvents... -> isDirtyForRender, root.onFocus, c.onFocus, c.focus.handleKeyEvents, controlHandleEvents', s.pt.focus.pipe(rx.switchMap(([m, dir, key, handleKeyAct]) => {
        return s.pt.didFocus.pipe((0, reactivizer_1.actionRelatedToAction)(m), rx.takeUntil(s.pt.didFocusEnd.pipe((0, reactivizer_1.actionRelatedToAction)(m))), rx.take(1), rx.mergeMap(([, rect, c]) => {
            if (rect != null && c) {
                return rx.merge(
                // -> root.onFocus
                c.table.l.setFocusable.pipe(rx.filter(([, f]) => f !== false), rx.mergeMap(() => {
                    c.s.ft.onFocus(dir).dp(m);
                    return table.l.rootService;
                }), rx.map(([, root]) => root.s.ft.onFocus(c.s.logPrefix, c, service).dp(m)), rx.take(1), service.labelError('handle "focusable" component is found')), 
                // pass keyEventService to child offsetParent's focus service,
                // wait for its returning,
                // and halt current key event handling process until child service
                // returns
                c.table.l.isOffsetParent.pipe(rx.take(1), rx.mergeMap(([, childOp]) => {
                    if (childOp) {
                        return table.l.handleKeyEvents.pipe(rx.take(1), rx.mergeMap(([m1, keySvc]) => {
                            s.ft.controlHandleEvents(true).dp(m, m1);
                            const c = childOp.focusService.s;
                            return c.ft.handleKeyEvents(keySvc, key).re(m, m1)
                                .od(c.pt.didFocusEnd);
                        }), rx.map(([, dir, origKey]) => {
                            s.ft.controlHandleEvents(false).dp(m);
                            s.ft.focus(dir, origKey, handleKeyAct).dp(m);
                        }), rx.take(1));
                    }
                    return rx.EMPTY;
                })));
            }
            return rx.EMPTY;
        }));
    })));
    r('focus,didFocus -> didFocus, didFocusEnd', s.pt.focus.pipe(rx.map(([m, dir, key, handleEventAct]) => {
        let [lastRect, lastComp] = table.getData().didFocus;
        if (dir === SearchDirection.down) {
            if (lastRect == null || lastComp == null) {
                const nodeY = yTree.minimum();
                if (nodeY == null) {
                    s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
                    return;
                }
                lastComp = nodeY.value.minimum().value[0];
                lastRect = rectByComponent.get(lastComp);
                if (lastRect == null) {
                    // service.log('All yTree nodes', [...yTree.allChildNodeInorder()].map(([n]) => n.key));
                    service.log('>>> yNode key:', nodeY);
                    throw new Error(`Inconsistent rectByComponent of missing entry for ${lastComp.s.logPrefix}`);
                }
                s.ft.didFocus(lastRect, lastComp).dp(m, handleEventAct);
                return;
            }
            const [col, row] = lastRect;
            // const col = rLeft;
            // const row = rTop;
            // check if there are more component with same rectangle
            const yNode = yTree.search(row);
            if (yNode) {
                const xNode = yNode.value.search(col);
                if (xNode) {
                    const idx = xNode.value.findIndex(it => it === lastComp);
                    if (idx >= 0 && idx < xNode.value.length - 1) {
                        const c = xNode.value[idx + 1];
                        s.ft.didFocus(rectByComponent.get(c), c).dp(m);
                        return;
                    }
                }
            }
            // move to next node vertically
            const nextNode = yTree.smallestNodeGreaterThanOrEqual(row + 1);
            if (nextNode == null) {
                s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
                return;
            }
            const toRight = nextNode.value.smallestNodeGreaterThanOrEqual(col);
            const toLeft = nextNode.value.greatestNodeSmallerThanOrEqual(col);
            const choosen = chooseClosestLeftOrRight(col, toLeft, toRight);
            if (choosen) {
                const nextComp = choosen.value[0];
                s.ft.didFocus(rectByComponent.get(nextComp), nextComp).dp(m);
                return;
            }
        }
        else if (dir === SearchDirection.up) {
            if (lastRect == null || lastComp == null) {
                const nodeY = yTree.maximum();
                if (nodeY == null) {
                    s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
                    return;
                }
                lastComp = nodeY.value.minimum().value[0];
                lastRect = rectByComponent.get(lastComp);
                if (lastRect == null) {
                    service.log('All yTree nodes', [...yTree.allChildNodeInorder()].map(([n]) => n.key));
                    throw new Error(`Inconsistent rectByComponent of missing entry for ${lastComp.s.logPrefix}`);
                }
                s.ft.didFocus(lastRect, lastComp).dp(m, handleEventAct);
                return;
            }
            const [col, row] = lastRect;
            // check if there are more component with same rectangle
            const yNode = yTree.search(row);
            if (yNode) {
                const xNode = yNode.value.search(col);
                if (xNode) {
                    const idx = xNode.value.findIndex(it => it === lastComp);
                    if (idx > 0) {
                        const c = xNode.value[idx - 1];
                        s.ft.didFocus(rectByComponent.get(c), c).dp(m);
                        return;
                    }
                }
            }
            // move to next node vertically
            const nextNode = yTree.greatestNodeSmallerThanOrEqual(row - 1);
            if (nextNode == null) {
                s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
                return;
            }
            const toRight = nextNode.value.smallestNodeGreaterThanOrEqual(col);
            const toLeft = nextNode.value.greatestNodeSmallerThanOrEqual(col);
            const choosen = chooseClosestLeftOrRight(col, toLeft, toRight);
            if (choosen) {
                const nextComp = choosen.value[0];
                s.ft.didFocus(rectByComponent.get(nextComp), nextComp).dp(m);
                return;
            }
        }
        else if (dir === SearchDirection.left) {
            if (lastRect == null || lastComp == null) {
                const nodeX = xTree.maximum();
                if (nodeX == null) {
                    s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
                    return;
                }
                lastComp = nodeX.value.minimum().value[0];
                lastRect = rectByComponent.get(lastComp);
                if (lastRect == null) {
                    service.log('All xTree nodes', [...xTree.allChildNodeInorder()].map(([n]) => n.key));
                    throw new Error(`Inconsistent rectByComponent of missing entry for ${lastComp.s.logPrefix}`);
                }
                s.ft.didFocus(lastRect, lastComp).dp(m, handleEventAct);
                return;
            }
            const [col, row] = lastRect;
            // check if there are more component of same rectangle
            const xNode = xTree.search(col);
            if (xNode) {
                const yNode = xNode.value.search(row);
                if (yNode) {
                    const idx = yNode.value.findIndex(it => it === lastComp);
                    if (idx > 0) {
                        const c = yNode.value[idx - 1];
                        s.ft.didFocus(rectByComponent.get(c), c).dp(m);
                        return;
                    }
                }
            }
            // move to next node horizontally
            const nextNode = xTree.greatestNodeSmallerThanOrEqual(col - 1);
            if (nextNode == null) {
                s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
                return;
            }
            const end0 = nextNode.value.smallestNodeGreaterThanOrEqual(row);
            const end1 = nextNode.value.greatestNodeSmallerThanOrEqual(row);
            const choosen = chooseClosestLeftOrRight(row, end0, end1);
            if (choosen) {
                const nextComp = choosen.value[0];
                s.ft.didFocus(rectByComponent.get(nextComp), nextComp).dp(m);
                return;
            }
        }
        else if (dir === SearchDirection.right) {
            if (lastRect == null || lastComp == null) {
                const nodeX = xTree.minimum();
                if (nodeX == null) {
                    s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
                    return;
                }
                lastComp = nodeX.value.minimum().value[0];
                lastRect = rectByComponent.get(lastComp);
                if (lastRect == null) {
                    service.log('All xTree nodes', [...xTree.allChildNodeInorder()].map(([n]) => n.key));
                    throw new Error(`Inconsistent rectByComponent of missing entry for ${lastComp.s.logPrefix}`);
                }
                s.ft.didFocus(lastRect, lastComp).dp(m, handleEventAct);
                return;
            }
            const [col, row] = lastRect;
            // check if there are more component of same rectangle
            const xNode = xTree.search(col);
            if (xNode) {
                const yNode = xNode.value.search(row);
                if (yNode) {
                    const idx = yNode.value.findIndex(it => it === lastComp);
                    if (idx > 0) {
                        const c = yNode.value[idx - 1];
                        s.ft.didFocus(rectByComponent.get(c), c).dp(m);
                        return;
                    }
                }
            }
            // move to next node horizontally
            const nextNode = xTree.smallestNodeGreaterThanOrEqual(col + 1);
            if (nextNode == null) {
                s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
                return;
            }
            const end0 = nextNode.value.smallestNodeGreaterThanOrEqual(row);
            const end1 = nextNode.value.greatestNodeSmallerThanOrEqual(row);
            const choosen = chooseClosestLeftOrRight(row, end0, end1);
            if (choosen) {
                const nextComp = choosen.value[0];
                s.ft.didFocus(rectByComponent.get(nextComp), nextComp).dp(m);
                return;
            }
        }
    })));
    r('handleKeyEvents... -> focus', s.pt.handleKeyEvents.pipe(rx.switchMap(([m, keySvc, currKey]) => rx.concat(currKey != null ? rx.of([m, currKey, 1]) : rx.EMPTY, keySvc.s.pt.onFocusChange).pipe(rx.windowToggle(table.l.controlHandleEvents.pipe(rx.filter(([, stop]) => !stop)), () => table.l.controlHandleEvents.pipe(rx.filter(([, stop]) => stop))), rx.switchMap(change$ => change$), rx.mergeMap(([m1, evt, count]) => {
        // TODO: "count": repeately events
        if (evt === keyEvent_1.KeyEventEnum.focusUp) {
            return rx.range(0, count).pipe(rx.map(() => s.ft.focus(SearchDirection.up, evt, m.i).dp(m, m1)));
        }
        else if (evt === keyEvent_1.KeyEventEnum.focusDown ||
            evt === keyEvent_1.KeyEventEnum.focusNext) {
            return rx.range(0, count).pipe(rx.map(() => s.ft.focus(SearchDirection.down, evt, m.i).dp(m, m1)));
        }
        else if (evt === keyEvent_1.KeyEventEnum.focusLeft) {
            return rx.range(0, count).pipe(rx.map(() => s.ft.focus(SearchDirection.left, evt, m.i).dp(m, m1)));
        }
        else if (evt === keyEvent_1.KeyEventEnum.focusRight) {
            return rx.range(0, count).pipe(rx.map(() => s.ft.focus(SearchDirection.right, evt, m.i).dp(m, m1)));
        }
        return rx.EMPTY;
    })))));
    // s.ft.isDirtyForRender(false).dp();
    s.ft.controlHandleEvents(false).dp();
    return service;
});
function createFocusService(opts) {
    return exports.focusServiceFac.create(opts);
}
const tableForRoot = ['forRootComp', 'onFocus', 'latestRenderedRect', '_canvas'];
exports.rootFocusSvc = exports.focusServiceFac.forExtend({
    name: 'rootFocusSvc',
    tableFor: tableForRoot
}).interceptorByType(ad => rx.merge(ad.at.onFocus.pipe(rx.distinctUntilChanged(({ p: [, c1] }, { p: [, c2] }) => c1 === c2)), ad.ofOtherTypes())).defineReactor((init, keyEventService, opts) => {
    const extended = init(opts);
    const { r, s, table } = extended;
    r('forRootComp -> isOffsetParent|destory$ -> dispose', s.pt.forRootComp.pipe(rx.switchMap(([m, root]) => {
        root.focusService = extended;
        root.s.ft.isOffsetParent(root).dp(m);
        s.ft.rootService(extended).dp(m);
        return rx.merge(root.destory$.pipe(rx.map(() => extended.dispose())));
    })));
    r('onFocus,c.onRender -> render', s.pt.onFocus.pipe(rx.distinctUntilChanged(([, , a], [, , b]) => a === b), rx.switchMap(([m, , c]) => {
        if (c) {
            return rx.merge(c.s.pt.onRender.pipe(rx.map(([m2, canvas]) => {
                s.ft.render(canvas, c).dp(m, m2);
            })), new rx.Observable(() => {
                c.s.ft.needRerender(true).dp(m);
            }));
        }
        else
            return rx.EMPTY;
    })));
    r('onFocus,latestRenderedRect -> needRerender', table.l.onFocus.pipe(rx.scan((prev, curr) => {
        const [, , pC] = prev;
        const [m] = curr;
        if (pC)
            pC.s.ft.needRerender(true).dp(m);
        return curr;
    })));
    r('render,setBounding -> latestRenderedRect,canvas.copyRect', s.pt.render.pipe(rx.exhaustMap(([m, can, c]) => {
        return c.table.l.onBoundingBox.pipe(rx.take(1), rx.mergeMap(([, rect]) => can.s.ft.copyRect(...rect).re(m)
            .od(can.s.pt.onCopyRect).pipe(rx.take(1), rx.mergeMap(([, lines]) => {
            for (const [l, , y, units, style] of lines) {
                const styleList = style.split(';').filter(tx => tx);
                if (!styleList.some(s => s === 'inverse'))
                    styleList.push('inverse');
                can.s.ft.addDisplayUnits(l + rect[0], y + rect[1], units, styleList).dp(m);
            }
            return c.s.ft.queryAbsBounding().re(m).od(c.s.pt.didQueryAbsBounding);
        }), rx.take(1))), rx.take(1), rx.map(([, r]) => s.ft.latestRenderedRect(r).dp(m)));
    })));
    s.ft.latestRenderedRect(null).dp();
    s.ft.onFocus('', null, null).dp();
    s.ft.handleKeyEvents(keyEventService, null).dp();
    return extended;
});
function createRootService(keyEventService, opts) {
    return exports.rootFocusSvc.create(keyEventService, opts);
}
function chooseClosestLeftOrRight(x, node1, node2) {
    if (node1 != null && node2 == null)
        return node1;
    else if (node1 == null && node2 != null)
        return node2;
    else if (node1 && node2) {
        return Math.abs(x - node1.key) > Math.abs(x - node2.key) ? node2 : node1;
    }
    return null;
}
//# sourceMappingURL=focusable.js.map