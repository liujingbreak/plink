import { RedBlackTree } from './rb-tree';
/**
 * Maintaining:
 *  node.max = max(node.int[1], node.left.max, node.right.max)
 *
 *
 */
export class IntervalTree extends RedBlackTree {
    insertInterval(low, high, data) {
        var _a;
        const node = this.insert(low);
        if (node.int) {
            if (node.int[1] === high) {
                // duplicate high boundray value
                node.value = data;
                return node;
            }
            // A duplicate low boundray
            node.highValuesTree = new RedBlackTree();
            node.highValuesTree.insert(node.int[1]).value = node.value;
            node.highValuesTree.insert(high).value = data;
            node.int = undefined;
            node.weight++;
        }
        if (node.highValuesTree) {
            node.highValuesTree.insert(high).value = data;
            node.weight = node.highValuesTree.size();
        }
        else {
            node.int = [low, high];
            node.value = data;
        }
        if (high > ((_a = node.maxHighOfMulti) !== null && _a !== void 0 ? _a : Number.MIN_VALUE)) {
            node.maxHighOfMulti = high;
        }
        maintainNodeMaxValue(node);
        return node;
    }
    deleteInterval(low, high) {
        const node = this.search(low);
        if (node == null)
            return false;
        if (node.int && node.int[1] === high) {
            this.deleteNode(node);
            return true;
        }
        else if (node.highValuesTree) {
            const origMaxHigh = node.maxHighOfMulti;
            const deleted = node.highValuesTree.delete(high);
            if (deleted) {
                node.weight--;
                if (node.highValuesTree.size() === 1) {
                    node.int = [node.key, node.highValuesTree.root.key];
                    node.value = node.highValuesTree.root.value;
                    node.highValuesTree = undefined;
                    node.maxHighOfMulti = node.int[1];
                    if (origMaxHigh !== node.maxHighOfMulti)
                        maintainNodeMaxValue(node);
                    return true;
                }
                else {
                    node.maxHighOfMulti = node.highValuesTree.maximum().key;
                    if (origMaxHigh !== node.maxHighOfMulti)
                        maintainNodeMaxValue(node);
                    return true;
                }
            }
        }
        return false;
    }
    searchSingleOverlap(low, high) {
        let node = this.root;
        while (node && !doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
            if (node.left && low <= node.left.max) {
                node = node.left;
            }
            else {
                node = node.right;
            }
        }
        return node;
    }
    *searchMultipleOverlaps(low, high) {
        const foundNodes = [];
        searchMultipleOverlaps(foundNodes, low, high, this.root);
        // const intervals = new Array<[number, number, V, IntervalTreeNode<V>]>(foundNodes.length);
        for (const node of foundNodes) {
            if (node.int) {
                yield [...node.int, node.value, node];
            }
            else if (node.highValuesTree) {
                for (const highTreeNode of node.highValuesTree.keysSmallererThan(high)) {
                    yield [node.key, highTreeNode.key, highTreeNode.value, node];
                }
            }
        }
    }
    /** @Override
     */
    onLeftChildChange(parent, child) {
        maintainNodeMaxValue(parent);
    }
    /** @Override
     */
    onRightChildChange(parent, child) {
        maintainNodeMaxValue(parent);
    }
}
function maintainNodeMaxValue(node) {
    var _a, _b, _c, _d;
    let currNode = node;
    while (currNode) {
        if (currNode.maxHighOfMulti == null)
            throw new Error('currNode.maxHighOfMulti should not be empty');
        currNode.max = Math.max(currNode.maxHighOfMulti, Math.max((_b = (_a = currNode.left) === null || _a === void 0 ? void 0 : _a.max) !== null && _b !== void 0 ? _b : Number.MIN_VALUE, (_d = (_c = currNode.right) === null || _c === void 0 ? void 0 : _c.max) !== null && _d !== void 0 ? _d : Number.MIN_VALUE));
        currNode = currNode.p;
    }
}
function doesIntervalOverlap(intA, intB) {
    // Not in case of: intA is left to intB or intA is right to intB entirely
    return !(intA[1] < intB[0] || intB[1] < intA[0]);
}
function searchMultipleOverlaps(overlaps, low, high, node) {
    if (node == null) {
        return 0;
    }
    let numOverlaps = 0;
    if (doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
        overlaps.push(node);
        numOverlaps = 1;
    }
    if (node.left && low <= node.left.max) {
        const numOverlapsLeft = searchMultipleOverlaps(overlaps, low, high, node.left);
        if (numOverlapsLeft > 0) {
            numOverlaps += numOverlapsLeft;
            numOverlaps += searchMultipleOverlaps(overlaps, low, high, node.right);
        }
        // Skip right child, as if zero left child overlaps, then
        // target interval's high value must be even smaller than all left children's low values,
        // meaning entire left child tree is greater than target interval, so right child tree does the same
    }
    else {
        numOverlaps += searchMultipleOverlaps(overlaps, low, high, node.right);
    }
    return numOverlaps;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJ2YWwtdHJlZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL3NoYXJlL2FsZ29yaXRobXMvaW50ZXJ2YWwtdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQWEsWUFBWSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBaUJuRDs7Ozs7R0FLRztBQUNILE1BQU0sT0FBTyxZQUEwQixTQUFRLFlBQTRDO0lBQ3pGLGNBQWMsQ0FBQyxHQUFXLEVBQUUsSUFBWSxFQUFFLElBQU87O1FBQy9DLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDOUIsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1osSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFDeEIsZ0NBQWdDO2dCQUNoQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDbEIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELDJCQUEyQjtZQUMzQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksWUFBWSxFQUFhLENBQUM7WUFDcEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQzNELElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7WUFFOUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUM7WUFDckIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ2Y7UUFBQyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztZQUM5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QVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvRSxJQUFJLGVBQWUsR0FBRyxDQUFDLEVBQUU7WUFDdkIsV0FBVyxJQUFJLGVBQWUsQ0FBQztZQUMvQixXQUFXLElBQUksc0JBQXNCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3hFO1FBQ0QseURBQXlEO1FBQ3pELHlGQUF5RjtRQUN6RixvR0FBb0c7S0FDckc7U0FBTTtRQUNMLFdBQVcsSUFBSSxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDeEU7SUFDRCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSYlRyZWVOb2RlLCBSZWRCbGFja1RyZWV9IGZyb20gJy4vcmItdHJlZSc7XG5cbi8qKlxuICogQSBSZWQgYmxhY2sgdHJlZSBub2RlIHRvIGNvbnRhaW5zIG11bHRpcGxlIGludGVydmFscyB3aGljaCBoYXMgc2FtZSBcImxvd1wiIHZhbHVlLFxuICogXCJrZXlcIiBpcyBpbnRlcnZhbCdzIGxvdyB2YWx1ZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEludGVydmFsVHJlZU5vZGU8ViA9IHVua25vd24+IGV4dGVuZHMgUmJUcmVlTm9kZTxudW1iZXIsIFYsIEludGVydmFsVHJlZU5vZGU8Vj4+IHtcbiAgLyoqIEZvciBubyBkdXBsaWNhdGUgc2luZ2xlIGludGVydmFsKi9cbiAgaW50PzogW2xvdzogbnVtYmVyLCBoaWdoOiBudW1iZXJdO1xuICAvKiogRm9yIDQrIGludGVydmFscywgYSB0cmVlIHRvIHN0b3JlIGRpZmZlcmVudCBcImhpZ2hcIiB2YWx1ZSAqL1xuICBoaWdoVmFsdWVzVHJlZT86IFJlZEJsYWNrVHJlZTxudW1iZXIsIFY+O1xuICAvKiogTWF4aW11bSBcImhpZ2hcIiB2YWx1ZSBvZiBtdWx0aSBpbnRlcnZhbHMgdGhhdCB0aGlzIG5vZGUgY29udGFpbnMgKi9cbiAgbWF4SGlnaE9mTXVsdGk/OiBudW1iZXI7XG4gIC8qKiBNYXhpbXVtIFwiaGlnaFwiIG9mIGNoaWxkcmVuICovXG4gIG1heDogbnVtYmVyO1xufVxuXG4vKipcbiAqIE1haW50YWluaW5nOlxuICogIG5vZGUubWF4ID0gbWF4KG5vZGUuaW50WzFdLCBub2RlLmxlZnQubWF4LCBub2RlLnJpZ2h0Lm1heClcbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgSW50ZXJ2YWxUcmVlPFYgPSB1bmtub3duPiBleHRlbmRzIFJlZEJsYWNrVHJlZTxudW1iZXIsIFYsIEludGVydmFsVHJlZU5vZGU8Vj4+IHtcbiAgaW5zZXJ0SW50ZXJ2YWwobG93OiBudW1iZXIsIGhpZ2g6IG51bWJlciwgZGF0YTogVikge1xuICAgIGNvbnN0IG5vZGUgPSB0aGlzLmluc2VydChsb3cpO1xuICAgIGlmIChub2RlLmludCkge1xuICAgICAgaWYgKG5vZGUuaW50WzFdID09PSBoaWdoKSB7XG4gICAgICAgIC8vIGR1cGxpY2F0ZSBoaWdoIGJvdW5kcmF5IHZhbHVlXG4gICAgICAgIG5vZGUudmFsdWUgPSBkYXRhO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgIH1cbiAgICAgIC8vIEEgZHVwbGljYXRlIGxvdyBib3VuZHJheVxuICAgICAgbm9kZS5oaWdoVmFsdWVzVHJlZSA9IG5ldyBSZWRCbGFja1RyZWU8bnVtYmVyLCBWPigpO1xuICAgICAgbm9kZS5oaWdoVmFsdWVzVHJlZS5pbnNlcnQobm9kZS5pbnRbMV0pLnZhbHVlID0gbm9kZS52YWx1ZTtcbiAgICAgIG5vZGUuaGlnaFZhbHVlc1RyZWUuaW5zZXJ0KGhpZ2gpLnZhbHVlID0gZGF0YTtcblxuICAgICAgbm9kZS5pbnQgPSB1bmRlZmluZWQ7XG4gICAgICBub2RlLndlaWdodCsrO1xuICAgIH0gaWYgKG5vZGUuaGlnaFZhbHVlc1RyZWUpIHtcbiAgICAgIG5vZGUuaGlnaFZhbHVlc1RyZWUuaW5zZXJ0KGhpZ2gpLnZhbHVlID0gZGF0YTtcbiAgICAgIG5vZGUud2VpZ2h0ID0gbm9kZS5oaWdoVmFsdWVzVHJlZS5zaXplKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuaW50ID0gW2xvdywgaGlnaF07XG4gICAgICBub2RlLnZhbHVlID0gZGF0YTtcbiAgICB9XG4gICAgaWYgKGhpZ2ggPiAobm9kZS5tYXhIaWdoT2ZNdWx0aSA/PyBOdW1iZXIuTUlOX1ZBTFVFKSkge1xuICAgICAgbm9kZS5tYXhIaWdoT2ZNdWx0aSA9IGhpZ2g7XG4gICAgfVxuICAgIG1haW50YWluTm9kZU1heFZhbHVlKG5vZGUpO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgZGVsZXRlSW50ZXJ2YWwobG93OiBudW1iZXIsIGhpZ2g6IG51bWJlcikge1xuICAgIGNvbnN0IG5vZGUgPSB0aGlzLnNlYXJjaChsb3cpO1xuICAgIGlmIChub2RlID09IG51bGwpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5vZGUuaW50ICYmIG5vZGUuaW50WzFdID09PSBoaWdoKSB7XG4gICAgICB0aGlzLmRlbGV0ZU5vZGUobm9kZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKG5vZGUuaGlnaFZhbHVlc1RyZWUpIHtcbiAgICAgIGNvbnN0IG9yaWdNYXhIaWdoID0gbm9kZS5tYXhIaWdoT2ZNdWx0aTtcbiAgICAgIGNvbnN0IGRlbGV0ZWQgPSBub2RlLmhpZ2hWYWx1ZXNUcmVlLmRlbGV0ZShoaWdoKTtcbiAgICAgIGlmIChkZWxldGVkKSB7XG4gICAgICAgIG5vZGUud2VpZ2h0LS07XG4gICAgICAgIGlmIChub2RlLmhpZ2hWYWx1ZXNUcmVlLnNpemUoKSA9PT0gMSkge1xuICAgICAgICAgIG5vZGUuaW50ID0gW25vZGUua2V5LCBub2RlLmhpZ2hWYWx1ZXNUcmVlLnJvb3QhLmtleV07XG4gICAgICAgICAgbm9kZS52YWx1ZSA9IG5vZGUuaGlnaFZhbHVlc1RyZWUucm9vdCEudmFsdWU7XG4gICAgICAgICAgbm9kZS5oaWdoVmFsdWVzVHJlZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBub2RlLm1heEhpZ2hPZk11bHRpID0gbm9kZS5pbnRbMV07XG4gICAgICAgICAgaWYgKG9yaWdNYXhIaWdoICE9PSBub2RlLm1heEhpZ2hPZk11bHRpKVxuICAgICAgICAgICAgbWFpbnRhaW5Ob2RlTWF4VmFsdWUobm9kZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbm9kZS5tYXhIaWdoT2ZNdWx0aSA9IG5vZGUuaGlnaFZhbHVlc1RyZWUubWF4aW11bSgpIS5rZXk7XG4gICAgICAgICAgaWYgKG9yaWdNYXhIaWdoICE9PSBub2RlLm1heEhpZ2hPZk11bHRpKVxuICAgICAgICAgICAgbWFpbnRhaW5Ob2RlTWF4VmFsdWUobm9kZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc2VhcmNoU2luZ2xlT3ZlcmxhcChsb3c6IG51bWJlciwgaGlnaDogbnVtYmVyKSB7XG4gICAgbGV0IG5vZGUgPSB0aGlzLnJvb3Q7XG4gICAgd2hpbGUgKG5vZGUgJiYgIWRvZXNJbnRlcnZhbE92ZXJsYXAoW25vZGUua2V5LCBub2RlLm1heEhpZ2hPZk11bHRpIV0sIFtsb3csIGhpZ2hdKSkge1xuICAgICAgaWYgKG5vZGUubGVmdCAmJiBsb3cgPD0gbm9kZS5sZWZ0Lm1heCkge1xuICAgICAgICBub2RlID0gbm9kZS5sZWZ0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZSA9IG5vZGUucmlnaHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgKnNlYXJjaE11bHRpcGxlT3ZlcmxhcHMobG93OiBudW1iZXIsIGhpZ2g6IG51bWJlcik6IEdlbmVyYXRvcjxbbG93OiBudW1iZXIsIGhpZ2g6IG51bWJlciwgZGF0YTogViwgbm9kZTogSW50ZXJ2YWxUcmVlTm9kZTxWPl0+IHtcbiAgICBjb25zdCBmb3VuZE5vZGVzID0gW10gYXMgSW50ZXJ2YWxUcmVlTm9kZTxWPltdO1xuICAgIHNlYXJjaE11bHRpcGxlT3ZlcmxhcHMoZm91bmROb2RlcywgbG93LCBoaWdoLCB0aGlzLnJvb3QpO1xuICAgIC8vIGNvbnN0IGludGVydmFscyA9IG5ldyBBcnJheTxbbnVtYmVyLCBudW1iZXIsIFYsIEludGVydmFsVHJlZU5vZGU8Vj5dPihmb3VuZE5vZGVzLmxlbmd0aCk7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIGZvdW5kTm9kZXMpIHtcbiAgICAgIGlmIChub2RlLmludCkge1xuICAgICAgICB5aWVsZCBbLi4ubm9kZS5pbnQsIG5vZGUudmFsdWUsIG5vZGVdO1xuICAgICAgfSBlbHNlIGlmIChub2RlLmhpZ2hWYWx1ZXNUcmVlKSB7XG4gICAgICAgIGZvciAoY29uc3QgaGlnaFRyZWVOb2RlIG9mIG5vZGUuaGlnaFZhbHVlc1RyZWUua2V5c1NtYWxsZXJlclRoYW4oaGlnaCkpIHtcbiAgICAgICAgICB5aWVsZCBbbm9kZS5rZXksIGhpZ2hUcmVlTm9kZS5rZXksIGhpZ2hUcmVlTm9kZS52YWx1ZSwgbm9kZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogQE92ZXJyaWRlXG4gICAqL1xuICBwcm90ZWN0ZWQgb25MZWZ0Q2hpbGRDaGFuZ2UocGFyZW50OiBJbnRlcnZhbFRyZWVOb2RlPFY+LCBjaGlsZDogSW50ZXJ2YWxUcmVlTm9kZTxWPiB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgICBtYWludGFpbk5vZGVNYXhWYWx1ZTxWPihwYXJlbnQpO1xuICB9XG4gIC8qKiBAT3ZlcnJpZGVcbiAgICovXG4gIHByb3RlY3RlZCBvblJpZ2h0Q2hpbGRDaGFuZ2UocGFyZW50OiBJbnRlcnZhbFRyZWVOb2RlPFY+LCBjaGlsZDogSW50ZXJ2YWxUcmVlTm9kZTxWPiB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgICBtYWludGFpbk5vZGVNYXhWYWx1ZTxWPihwYXJlbnQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1haW50YWluTm9kZU1heFZhbHVlPFY+KG5vZGU6IEludGVydmFsVHJlZU5vZGU8Vj4pIHtcbiAgbGV0IGN1cnJOb2RlOiBJbnRlcnZhbFRyZWVOb2RlPFY+IHwgbnVsbCA9IG5vZGU7XG4gIHdoaWxlIChjdXJyTm9kZSkge1xuICAgIGlmIChjdXJyTm9kZS5tYXhIaWdoT2ZNdWx0aSA9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjdXJyTm9kZS5tYXhIaWdoT2ZNdWx0aSBzaG91bGQgbm90IGJlIGVtcHR5Jyk7XG4gICAgY3Vyck5vZGUubWF4ID0gTWF0aC5tYXgoY3Vyck5vZGUubWF4SGlnaE9mTXVsdGksIE1hdGgubWF4KFxuICAgICAgY3Vyck5vZGUubGVmdD8ubWF4ID8/IE51bWJlci5NSU5fVkFMVUUsIGN1cnJOb2RlLnJpZ2h0Py5tYXggPz8gTnVtYmVyLk1JTl9WQUxVRVxuICAgICkpO1xuICAgIGN1cnJOb2RlID0gY3Vyck5vZGUucDtcbiAgfVxufVxuXG5mdW5jdGlvbiBkb2VzSW50ZXJ2YWxPdmVybGFwKGludEE6IFtudW1iZXIsIG51bWJlcl0sIGludEI6IFtudW1iZXIsIG51bWJlcl0pIHtcbiAgLy8gTm90IGluIGNhc2Ugb2Y6IGludEEgaXMgbGVmdCB0byBpbnRCIG9yIGludEEgaXMgcmlnaHQgdG8gaW50QiBlbnRpcmVseVxuICByZXR1cm4gIShpbnRBWzFdIDwgaW50QlswXSB8fCBpbnRCWzFdIDwgaW50QVswXSk7XG59XG5cbmZ1bmN0aW9uIHNlYXJjaE11bHRpcGxlT3ZlcmxhcHM8Vj4oXG4gIG92ZXJsYXBzOiBJbnRlcnZhbFRyZWVOb2RlPFY+W10sIGxvdzogbnVtYmVyLCBoaWdoOiBudW1iZXIsIG5vZGU6IEludGVydmFsVHJlZU5vZGU8Vj4gfCBudWxsIHwgdW5kZWZpbmVkXG4pOiBudW1iZXIge1xuICBpZiAobm9kZSA9PSBudWxsKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbiAgbGV0IG51bU92ZXJsYXBzID0gMDtcbiAgaWYgKGRvZXNJbnRlcnZhbE92ZXJsYXAoW25vZGUua2V5LCBub2RlLm1heEhpZ2hPZk11bHRpIV0sIFtsb3csIGhpZ2hdKSkge1xuICAgIG92ZXJsYXBzLnB1c2gobm9kZSk7XG4gICAgbnVtT3ZlcmxhcHMgPSAxO1xuICB9XG4gIGlmIChub2RlLmxlZnQgJiYgbG93IDw9IG5vZGUubGVmdC5tYXgpIHtcbiAgICBjb25zdCBudW1PdmVybGFwc0xlZnQgPSBzZWFyY2hNdWx0aXBsZU92ZXJsYXBzKG92ZXJsYXBzLCBsb3csIGhpZ2gsIG5vZGUubGVmdCk7XG4gICAgaWYgKG51bU92ZXJsYXBzTGVmdCA+IDApIHtcbiAgICAgIG51bU92ZXJsYXBzICs9IG51bU92ZXJsYXBzTGVmdDtcbiAgICAgIG51bU92ZXJsYXBzICs9IHNlYXJjaE11bHRpcGxlT3ZlcmxhcHMob3ZlcmxhcHMsIGxvdywgaGlnaCwgbm9kZS5yaWdodCk7XG4gICAgfVxuICAgIC8vIFNraXAgcmlnaHQgY2hpbGQsIGFzIGlmIHplcm8gbGVmdCBjaGlsZCBvdmVybGFwcywgdGhlblxuICAgIC8vIHRhcmdldCBpbnRlcnZhbCdzIGhpZ2ggdmFsdWUgbXVzdCBiZSBldmVuIHNtYWxsZXIgdGhhbiBhbGwgbGVmdCBjaGlsZHJlbidzIGxvdyB2YWx1ZXMsXG4gICAgLy8gbWVhbmluZyBlbnRpcmUgbGVmdCBjaGlsZCB0cmVlIGlzIGdyZWF0ZXIgdGhhbiB0YXJnZXQgaW50ZXJ2YWwsIHNvIHJpZ2h0IGNoaWxkIHRyZWUgZG9lcyB0aGUgc2FtZVxuICB9IGVsc2Uge1xuICAgIG51bU92ZXJsYXBzICs9IHNlYXJjaE11bHRpcGxlT3ZlcmxhcHMob3ZlcmxhcHMsIGxvdywgaGlnaCwgbm9kZS5yaWdodCk7XG4gIH1cbiAgcmV0dXJuIG51bU92ZXJsYXBzO1xufVxuIl19