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
            // A duplicate low boundray
            node.multi = [
                [node.int[1], node.value],
                [high, data]
            ];
            node.int = undefined;
        }
        else if (node.multi) {
            if (node.multi.length >= 3) {
                node.highValuesTree = new RedBlackTree();
                for (const [h, v] of node.multi) {
                    node.highValuesTree.insert(h).value = v;
                }
                node.highValuesTree.insert(high).value = data;
                node.multi = undefined;
            }
            else {
                node.multi.push([high, data]);
            }
        }
        else if (node.highValuesTree) {
            node.highValuesTree.insert(high).value = data;
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
        else if (node.multi != null) {
            node.multi = node.multi.filter(it => it[0] !== high);
            if (node.multi.length === 1) {
                node.int = [node.key, node.multi[0][0]];
                node.value = node.multi[0][1];
                node.multi = undefined;
                node.maxHighOfMulti = node.int[1];
            }
            else {
                node.maxHighOfMulti = node.multi.reduce((max, curr) => Math.max(curr[0], max), Number.MIN_VALUE);
            }
        }
        else if (node.highValuesTree) {
            return node.highValuesTree.delete(high);
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
        const foundNodes = searchMultipleOverlaps(low, high, this.root);
        // const intervals = new Array<[number, number, V, IntervalTreeNode<V>]>(foundNodes.length);
        for (const node of foundNodes) {
            if (node.int) {
                yield [...node.int, node.value, node];
            }
            else if (node.multi) {
                for (const [h, data] of node.multi) {
                    if (doesIntervalOverlap([low, high], [node.key, h])) {
                        yield [node.key, h, data, node];
                    }
                }
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
function searchMultipleOverlaps(low, high, node) {
    const overlaps = [];
    if (node == null) {
        return overlaps;
    }
    if (doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
        overlaps.push(node);
    }
    if (node.left && low <= node.left.max) {
        const overlapsLeftChild = searchMultipleOverlaps(low, high, node.left);
        if (overlapsLeftChild.length > 0) {
            overlaps.push(...overlapsLeftChild);
            const overlapsRightChild = searchMultipleOverlaps(low, high, node.right);
            overlaps.push(...overlapsRightChild);
        }
        // Skip right child, as if zero left child overlaps, then
        // target interval's high value must be even smaller than all left children's low values,
        // meaning entire left child tree is greater than target interval, so right child tree does the same
    }
    else {
        const overlapsRightChild = searchMultipleOverlaps(low, high, node.right);
        overlaps.push(...overlapsRightChild);
    }
    return overlaps;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJ2YWwtdHJlZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL3NoYXJlL2FsZ29yaXRobXMvaW50ZXJ2YWwtdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQWEsWUFBWSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBbUJuRDs7Ozs7R0FLRztBQUNILE1BQU0sT0FBTyxZQUEwQixTQUFRLFlBQTRDO0lBQ3pGLGNBQWMsQ0FBQyxHQUFXLEVBQUUsSUFBWSxFQUFFLElBQU87O1FBQy9DLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDOUIsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1osMkJBQTJCO1lBQzNCLElBQUksQ0FBQyxLQUFLLEdBQUc7Z0JBQ1gsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFVLENBQUM7Z0JBQzlCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQzthQUNiLENBQUM7WUFDRixJQUFJLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQztTQUN0QjthQUFNLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNyQixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtnQkFDMUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLFlBQVksRUFBYSxDQUFDO2dCQUNwRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtvQkFDL0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztpQkFDekM7Z0JBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDOUMsSUFBSSxD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QmxhY2tUcmVlfSBmcm9tICcuL3JiLXRyZWUnO1xuXG4vKipcbiAqIEEgUmVkIGJsYWNrIHRyZWUgbm9kZSB0byBjb250YWlucyBtdWx0aXBsZSBpbnRlcnZhbHMgd2hpY2ggaGFzIHNhbWUgXCJsb3dcIiB2YWx1ZSxcbiAqIFwia2V5XCIgaXMgaW50ZXJ2YWwncyBsb3cgdmFsdWVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbnRlcnZhbFRyZWVOb2RlPFYgPSB1bmtub3duPiBleHRlbmRzIFJiVHJlZU5vZGU8bnVtYmVyLCBWLCBJbnRlcnZhbFRyZWVOb2RlPFY+PiB7XG4gIC8qKiBGb3Igbm8gZHVwbGljYXRlIHNpbmdsZSBpbnRlcnZhbCovXG4gIGludD86IFtsb3c6IG51bWJlciwgaGlnaDogbnVtYmVyXTtcbiAgLyoqIEZvciAyLTMgaW50ZXJ2YWxzIHdoaWNoIGhhcyBzYW1lIFwibG93XCIgdmFsdWUgYnV0IGRpZmZlcmVudCBcImhpZ2hcIiB2YWx1ZSAqL1xuICBtdWx0aT86IFtoaWdoOiBudW1iZXIsIGRhdGE6IFZdW107XG4gIC8qKiBGb3IgNCsgaW50ZXJ2YWxzLCBhIHRyZWUgdG8gc3RvcmUgZGlmZmVyZW50IFwiaGlnaFwiIHZhbHVlICovXG4gIGhpZ2hWYWx1ZXNUcmVlPzogUmVkQmxhY2tUcmVlPG51bWJlciwgVj47XG4gIC8qKiBNYXhpbXVtIFwiaGlnaFwiIHZhbHVlIG9mIG11bHRpIGludGVydmFscyB0aGF0IHRoaXMgbm9kZSBjb250YWlucyAqL1xuICBtYXhIaWdoT2ZNdWx0aT86IG51bWJlcjtcbiAgLyoqIE1heGltdW0gXCJoaWdoXCIgb2YgY2hpbGRyZW4gKi9cbiAgbWF4OiBudW1iZXI7XG59XG5cbi8qKlxuICogTWFpbnRhaW5pbmc6XG4gKiAgbm9kZS5tYXggPSBtYXgobm9kZS5pbnRbMV0sIG5vZGUubGVmdC5tYXgsIG5vZGUucmlnaHQubWF4KVxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnRlcnZhbFRyZWU8ViA9IHVua25vd24+IGV4dGVuZHMgUmVkQmxhY2tUcmVlPG51bWJlciwgViwgSW50ZXJ2YWxUcmVlTm9kZTxWPj4ge1xuICBpbnNlcnRJbnRlcnZhbChsb3c6IG51bWJlciwgaGlnaDogbnVtYmVyLCBkYXRhOiBWKSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMuaW5zZXJ0KGxvdyk7XG4gICAgaWYgKG5vZGUuaW50KSB7XG4gICAgICAvLyBBIGR1cGxpY2F0ZSBsb3cgYm91bmRyYXlcbiAgICAgIG5vZGUubXVsdGkgPSBbXG4gICAgICAgIFtub2RlLmludFsxXSwgbm9kZS52YWx1ZSBhcyBWXSxcbiAgICAgICAgW2hpZ2gsIGRhdGFdXG4gICAgICBdO1xuICAgICAgbm9kZS5pbnQgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIGlmIChub2RlLm11bHRpKSB7XG4gICAgICBpZiAobm9kZS5tdWx0aS5sZW5ndGggPj0gMykge1xuICAgICAgICBub2RlLmhpZ2hWYWx1ZXNUcmVlID0gbmV3IFJlZEJsYWNrVHJlZTxudW1iZXIsIFY+KCk7XG4gICAgICAgIGZvciAoY29uc3QgW2gsIHZdIG9mIG5vZGUubXVsdGkpIHtcbiAgICAgICAgICBub2RlLmhpZ2hWYWx1ZXNUcmVlLmluc2VydChoKS52YWx1ZSA9IHY7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZS5oaWdoVmFsdWVzVHJlZS5pbnNlcnQoaGlnaCkudmFsdWUgPSBkYXRhO1xuICAgICAgICBub2RlLm11bHRpID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZS5tdWx0aS5wdXNoKFtoaWdoLCBkYXRhXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2RlLmhpZ2hWYWx1ZXNUcmVlKSB7XG4gICAgICBub2RlLmhpZ2hWYWx1ZXNUcmVlLmluc2VydChoaWdoKS52YWx1ZSA9IGRhdGE7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuaW50ID0gW2xvdywgaGlnaF07XG4gICAgICBub2RlLnZhbHVlID0gZGF0YTtcbiAgICB9XG4gICAgaWYgKGhpZ2ggPiAobm9kZS5tYXhIaWdoT2ZNdWx0aSA/PyBOdW1iZXIuTUlOX1ZBTFVFKSkge1xuICAgICAgbm9kZS5tYXhIaWdoT2ZNdWx0aSA9IGhpZ2g7XG4gICAgfVxuICAgIG1haW50YWluTm9kZU1heFZhbHVlKG5vZGUpO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgZGVsZXRlSW50ZXJ2YWwobG93OiBudW1iZXIsIGhpZ2g6IG51bWJlcikge1xuICAgIGNvbnN0IG5vZGUgPSB0aGlzLnNlYXJjaChsb3cpO1xuICAgIGlmIChub2RlID09IG51bGwpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5vZGUuaW50ICYmIG5vZGUuaW50WzFdID09PSBoaWdoKSB7XG4gICAgICB0aGlzLmRlbGV0ZU5vZGUobm9kZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKG5vZGUubXVsdGkgIT0gbnVsbCkge1xuICAgICAgbm9kZS5tdWx0aSA9IG5vZGUubXVsdGkuZmlsdGVyKGl0ID0+IGl0WzBdICE9PSBoaWdoKTtcbiAgICAgIGlmIChub2RlLm11bHRpLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBub2RlLmludCA9IFtub2RlLmtleSwgbm9kZS5tdWx0aVswXVswXV07XG4gICAgICAgIG5vZGUudmFsdWUgPSBub2RlLm11bHRpWzBdWzFdO1xuICAgICAgICBub2RlLm11bHRpID0gdW5kZWZpbmVkO1xuICAgICAgICBub2RlLm1heEhpZ2hPZk11bHRpID0gbm9kZS5pbnRbMV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlLm1heEhpZ2hPZk11bHRpID0gbm9kZS5tdWx0aS5yZWR1Y2UoKG1heCwgY3VycikgPT4gTWF0aC5tYXgoY3VyclswXSwgbWF4KSwgTnVtYmVyLk1JTl9WQUxVRSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2RlLmhpZ2hWYWx1ZXNUcmVlKSB7XG4gICAgICByZXR1cm4gbm9kZS5oaWdoVmFsdWVzVHJlZS5kZWxldGUoaGlnaCk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHNlYXJjaFNpbmdsZU92ZXJsYXAobG93OiBudW1iZXIsIGhpZ2g6IG51bWJlcikge1xuICAgIGxldCBub2RlID0gdGhpcy5yb290O1xuICAgIHdoaWxlIChub2RlICYmICFkb2VzSW50ZXJ2YWxPdmVybGFwKFtub2RlLmtleSwgbm9kZS5tYXhIaWdoT2ZNdWx0aSFdLCBbbG93LCBoaWdoXSkpIHtcbiAgICAgIGlmIChub2RlLmxlZnQgJiYgbG93IDw9IG5vZGUubGVmdC5tYXgpIHtcbiAgICAgICAgbm9kZSA9IG5vZGUubGVmdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGUgPSBub2RlLnJpZ2h0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gICpzZWFyY2hNdWx0aXBsZU92ZXJsYXBzKGxvdzogbnVtYmVyLCBoaWdoOiBudW1iZXIpOiBHZW5lcmF0b3I8W2xvdzogbnVtYmVyLCBoaWdoOiBudW1iZXIsIGRhdGE6IFYsIG5vZGU6IEludGVydmFsVHJlZU5vZGU8Vj5dPiB7XG4gICAgY29uc3QgZm91bmROb2RlcyA9IHNlYXJjaE11bHRpcGxlT3ZlcmxhcHMobG93LCBoaWdoLCB0aGlzLnJvb3QpO1xuICAgIC8vIGNvbnN0IGludGVydmFscyA9IG5ldyBBcnJheTxbbnVtYmVyLCBudW1iZXIsIFYsIEludGVydmFsVHJlZU5vZGU8Vj5dPihmb3VuZE5vZGVzLmxlbmd0aCk7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIGZvdW5kTm9kZXMpIHtcbiAgICAgIGlmIChub2RlLmludCkge1xuICAgICAgICB5aWVsZCBbLi4ubm9kZS5pbnQsIG5vZGUudmFsdWUsIG5vZGVdO1xuICAgICAgfSBlbHNlIGlmIChub2RlLm11bHRpKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2gsIGRhdGFdIG9mIG5vZGUubXVsdGkpIHtcbiAgICAgICAgICBpZiAoZG9lc0ludGVydmFsT3ZlcmxhcChbbG93LCBoaWdoXSwgW25vZGUua2V5LCBoXSkpIHtcbiAgICAgICAgICAgIHlpZWxkIFtub2RlLmtleSwgaCwgZGF0YSwgbm9kZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG5vZGUuaGlnaFZhbHVlc1RyZWUpIHtcbiAgICAgICAgZm9yIChjb25zdCBoaWdoVHJlZU5vZGUgb2Ygbm9kZS5oaWdoVmFsdWVzVHJlZS5rZXlzU21hbGxlcmVyVGhhbihoaWdoKSkge1xuICAgICAgICAgIHlpZWxkIFtub2RlLmtleSwgaGlnaFRyZWVOb2RlLmtleSwgaGlnaFRyZWVOb2RlLnZhbHVlLCBub2RlXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKiBAT3ZlcnJpZGVcbiAgICovXG4gIHByb3RlY3RlZCBvbkxlZnRDaGlsZENoYW5nZShwYXJlbnQ6IEludGVydmFsVHJlZU5vZGU8Vj4sIGNoaWxkOiBJbnRlcnZhbFRyZWVOb2RlPFY+IHwgbnVsbCB8IHVuZGVmaW5lZCkge1xuICAgIG1haW50YWluTm9kZU1heFZhbHVlPFY+KHBhcmVudCk7XG4gIH1cbiAgLyoqIEBPdmVycmlkZVxuICAgKi9cbiAgcHJvdGVjdGVkIG9uUmlnaHRDaGlsZENoYW5nZShwYXJlbnQ6IEludGVydmFsVHJlZU5vZGU8Vj4sIGNoaWxkOiBJbnRlcnZhbFRyZWVOb2RlPFY+IHwgbnVsbCB8IHVuZGVmaW5lZCkge1xuICAgIG1haW50YWluTm9kZU1heFZhbHVlPFY+KHBhcmVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFpbnRhaW5Ob2RlTWF4VmFsdWU8Vj4obm9kZTogSW50ZXJ2YWxUcmVlTm9kZTxWPikge1xuICBsZXQgY3Vyck5vZGU6IEludGVydmFsVHJlZU5vZGU8Vj4gfCBudWxsID0gbm9kZTtcbiAgd2hpbGUgKGN1cnJOb2RlKSB7XG4gICAgaWYgKGN1cnJOb2RlLm1heEhpZ2hPZk11bHRpID09IG51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2N1cnJOb2RlLm1heEhpZ2hPZk11bHRpIHNob3VsZCBub3QgYmUgZW1wdHknKTtcbiAgICBjdXJyTm9kZS5tYXggPSBNYXRoLm1heChjdXJyTm9kZS5tYXhIaWdoT2ZNdWx0aSwgTWF0aC5tYXgoXG4gICAgICBjdXJyTm9kZS5sZWZ0Py5tYXggPz8gTnVtYmVyLk1JTl9WQUxVRSwgY3Vyck5vZGUucmlnaHQ/Lm1heCA/PyBOdW1iZXIuTUlOX1ZBTFVFXG4gICAgKSk7XG4gICAgY3Vyck5vZGUgPSBjdXJyTm9kZS5wO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRvZXNJbnRlcnZhbE92ZXJsYXAoaW50QTogW251bWJlciwgbnVtYmVyXSwgaW50QjogW251bWJlciwgbnVtYmVyXSkge1xuICAvLyBOb3QgaW4gY2FzZSBvZjogaW50QSBpcyBsZWZ0IHRvIGludEIgb3IgaW50QSBpcyByaWdodCB0byBpbnRCIGVudGlyZWx5XG4gIHJldHVybiAhKGludEFbMV0gPCBpbnRCWzBdIHx8IGludEJbMV0gPCBpbnRBWzBdKTtcbn1cblxuZnVuY3Rpb24gc2VhcmNoTXVsdGlwbGVPdmVybGFwczxWPihsb3c6IG51bWJlciwgaGlnaDogbnVtYmVyLCBub2RlOiBJbnRlcnZhbFRyZWVOb2RlPFY+IHwgbnVsbCB8IHVuZGVmaW5lZCk6IEludGVydmFsVHJlZU5vZGU8Vj5bXSB7XG4gIGNvbnN0IG92ZXJsYXBzID0gW10gYXMgSW50ZXJ2YWxUcmVlTm9kZTxWPltdO1xuICBpZiAobm9kZSA9PSBudWxsKSB7XG4gICAgcmV0dXJuIG92ZXJsYXBzO1xuICB9XG4gIGlmIChkb2VzSW50ZXJ2YWxPdmVybGFwKFtub2RlLmtleSwgbm9kZS5tYXhIaWdoT2ZNdWx0aSFdLCBbbG93LCBoaWdoXSkpIHtcbiAgICBvdmVybGFwcy5wdXNoKG5vZGUpO1xuICB9XG4gIGlmIChub2RlLmxlZnQgJiYgbG93IDw9IG5vZGUubGVmdC5tYXgpIHtcbiAgICBjb25zdCBvdmVybGFwc0xlZnRDaGlsZCA9IHNlYXJjaE11bHRpcGxlT3ZlcmxhcHMobG93LCBoaWdoLCBub2RlLmxlZnQpO1xuICAgIGlmIChvdmVybGFwc0xlZnRDaGlsZC5sZW5ndGggPiAwKSB7XG4gICAgICBvdmVybGFwcy5wdXNoKC4uLm92ZXJsYXBzTGVmdENoaWxkKTtcbiAgICAgIGNvbnN0IG92ZXJsYXBzUmlnaHRDaGlsZCA9IHNlYXJjaE11bHRpcGxlT3ZlcmxhcHMobG93LCBoaWdoLCBub2RlLnJpZ2h0KTtcbiAgICAgIG92ZXJsYXBzLnB1c2goLi4ub3ZlcmxhcHNSaWdodENoaWxkKTtcbiAgICB9XG4gICAgLy8gU2tpcCByaWdodCBjaGlsZCwgYXMgaWYgemVybyBsZWZ0IGNoaWxkIG92ZXJsYXBzLCB0aGVuXG4gICAgLy8gdGFyZ2V0IGludGVydmFsJ3MgaGlnaCB2YWx1ZSBtdXN0IGJlIGV2ZW4gc21hbGxlciB0aGFuIGFsbCBsZWZ0IGNoaWxkcmVuJ3MgbG93IHZhbHVlcyxcbiAgICAvLyBtZWFuaW5nIGVudGlyZSBsZWZ0IGNoaWxkIHRyZWUgaXMgZ3JlYXRlciB0aGFuIHRhcmdldCBpbnRlcnZhbCwgc28gcmlnaHQgY2hpbGQgdHJlZSBkb2VzIHRoZSBzYW1lXG4gIH0gZWxzZSB7XG4gICAgY29uc3Qgb3ZlcmxhcHNSaWdodENoaWxkID0gc2VhcmNoTXVsdGlwbGVPdmVybGFwcyhsb3csIGhpZ2gsIG5vZGUucmlnaHQpO1xuICAgIG92ZXJsYXBzLnB1c2goLi4ub3ZlcmxhcHNSaWdodENoaWxkKTtcbiAgfVxuICByZXR1cm4gb3ZlcmxhcHM7XG59XG4iXX0=