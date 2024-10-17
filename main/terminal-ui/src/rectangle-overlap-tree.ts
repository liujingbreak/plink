import {IntervalTree, stringifyIntervalTree, RbTreeNode, IntervalTreeNode} from '@wfh/algorithms';
import type {Rectangle} from './canvas';


export class RectangleOverlapTree<C> {
  xIntervalTree = new IntervalTree<IntervalTree<C[]>>();

  toString() {
    const buf = [] as string[];
    for (const [node] of this.xIntervalTree.allChildNodeInorder()) {
      if (node.highValuesTree) {
        buf.push('x key', node.key + '\n');
        node.highValuesTree.inorderWalk(
          xNode => buf.push(stringifyIntervalTree(xNode.value))
        );
      } else {
        buf.push('x key', node.key + '\n');
        buf.push(stringifyIntervalTree(node.value));
      }
      buf.push('\n');
    }
    return '\nxTree:\n' + stringifyIntervalTree(this.xIntervalTree, true)
      + '\n' + buf.join('');
  }

  addContent([x, y, w, h]: Rectangle, ...contents: C[]) {
    const node = this.xIntervalTree.insertInterval(x, x + w - 1);
    if (node.value == null)
      node.value = new IntervalTree<C[]>();
    const yNode = node.value.insertInterval(y, y + h - 1);
    if (yNode.value == null)
      yNode.value = [...contents];
    else
      yNode.value.push(...contents);
  }

  private * _searchOverlaps([x, y, w, h]: Rectangle,
    filterForX?: (low: number, high: number) => boolean,
    filterForY?: (low: number, high: number) => boolean
  ): Generator<readonly [xLow: number, xHigh: number, yLow: number, yHigh: number, C[]], void, unknown> {
    const foundX = this.xIntervalTree.searchMultipleOverlaps(x, x + w - 1);
    const yEnd = y + h - 1;
    // console.log('_searchOverlaps', x, y, x + w - 1, yEnd);
    for (const [xLow, xHigh, yTree] of foundX) {
      // console.log('FoundX', xLow, xHigh);
      if (filterForX && !filterForX(xLow, xHigh))
        continue;
      for (const [yLow, yHigh, values] of yTree.searchMultipleOverlaps(y, yEnd)) {
        // console.log('  FoundY', yLow, yHigh);
        if (filterForY && !filterForY(yLow, yHigh))
          continue;
        yield [
          xLow, xHigh, yLow, yHigh, values
        ] as const;
      }
    }
  }

  *searchOverlaps(r: Rectangle): Generator<readonly [Rectangle, C], void, unknown> {
    for (const [xl, xh, yl, yh, values] of this._searchOverlaps(r)) {
      const rect = [xl, xh - xl + 1, yl, yh - yl + 1] as Rectangle;
      for (const c of values)
        yield [rect, c] as const;
    }
  }
  deleteRectangle([x, y, w, h]: Rectangle) {
    const xH = x + w - 1;
    const yH = y + h - 1;
    const xNode = this.xIntervalTree.searchIntervalNode(x, xH);
    if (xNode) {
      const deleted = xNode.value.deleteInterval(y, yH);
      if (xNode.value.size() === 0) {
        this.xIntervalTree.deleteInterval(x, xH);
      }
      return deleted;
    }
    return false;
  }
  addOrUnionRectOnOverlap(rect: Rectangle, content: C) {
    const [x, y, w, h] = rect;
    const xOverlapNodes = [] as [number, number, RbTreeNode<number, IntervalTree<C[]>> | null, IntervalTreeNode<IntervalTree<C[]>>][];
    const yIntervalsToDel = [] as [IntervalTree<C[]>, number, number, number, number][];
    const toAdd = [] as C[];
    for (const [overlapXl, overlapXh, yTree, hvNode, node] of this.xIntervalTree.searchMultipleOverlaps(x, x + w - 1)) {
      const overlapYRes = yTree.searchMultipleOverlaps(y, y + h - 1);
      if (overlapYRes.length > 0)
        xOverlapNodes.push([overlapXl, overlapXh, hvNode, node]);
      for (const [overlapYl, overlapYh, eContents] of overlapYRes) {
        // Delete interval from both x and y tree,
        // add eContents along with parameter rect and content to new node
        // yTree.deleteInterval(overlapYl, overlapYh);
        yIntervalsToDel.push([yTree, overlapXl, overlapXh, overlapYl, overlapYh]);
        const overlapRect = [overlapXl, overlapYl, overlapXh - overlapXl + 1, overlapYh - overlapYl + 1] as Rectangle;
        rect = rectUnion(overlapRect, rect);
        toAdd.push(...eContents);
      }
    }
    for (const [tree, xl, xh, l, h] of yIntervalsToDel) {
      tree.deleteInterval(l, h);
      if (tree.size() === 0)
        this.xIntervalTree.deleteInterval(xl, xh);
    }

    this.addContent(rect, content, ...toAdd);
  }
  /** search for any rectangle from the tree that is being fully
   * covered by paramerter rectangle */
  searchForCovered(r: Rectangle): C[] {
    const [x, y, w, h] = r;
    const targetXHigh = x + w - 1;
    const targetYHigh = y + h - 1;
    return this._searchOverlaps(r,
      (l, h) => x <= l && targetXHigh >= h,
      (l, h) => y <= l && targetYHigh >= h)
      .map(([, , , , values]) => values)
      .reduce((list, it) => {
        list.push(...it);
        return list;
      }, [] as C[]);
  }
  updateContent([x, y, w, h]: Rectangle, content: C) {
    const xNode = this.xIntervalTree.searchIntervalNode(x, x + w - 1);
    if (xNode == null) {
      throw new Error(`Can not find rectangle at position [${x}, ${y}]`);
    }
    const yNode = xNode.value.searchIntervalNode(y, y + h - 1);
    if (yNode == null) {
      throw new Error(`Can not find rectangle at position [${x}, ${y}]`);
    }

    if (yNode.value) {
      const idx = yNode.value.findIndex(v => content === v);
      if (idx < 0) {
        throw new Error(`Can not find rectangle at position [${x}, ${y}]`);
      }
      yNode.value[idx] = content;
    }
  }

  *allRectangles() {
    for (const [xl, xh, yTree] of this.xIntervalTree.allIntervals()) {
      for (const [yl, yh, contents] of yTree.allIntervals()) {
        yield [[xl, yl, xh - xl + 1, yh - yl + 1] as Rectangle, contents] as const;
      }
    }
  }

  clear() {
    this.xIntervalTree = new IntervalTree<IntervalTree<C[]>>();
  }
}

export function rectUnion([x1, y1, w1, h1]: Rectangle, [x2, y2, w2, h2]: Rectangle) {
  const x = x1 < x2 ? x1 : x2;
  const y = y1 < y2 ? y1 : y2;
  const r1 = x1  + w1;
  const r2 = x2  + w2;
  const w = r1 > r2 ? r1 - x : r2 - x;
  const b1 = y1  + h1;
  const b2 = y2  + h2;
  const h = b1 > b2 ? b1 - y : b2 - y;
  return [x, y, w, h] as Rectangle;
}
