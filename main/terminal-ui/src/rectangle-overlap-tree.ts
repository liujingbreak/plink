import {IntervalTree, stringifyIntervalTree} from '@wfh/algorithms';
import type {Rectangle} from './canvas';


export class RectangleOverlapTree<C> {
  private xIntervalTree = new IntervalTree<IntervalTree<C[]>>();

  toString() {
    return '\nxTree:\n' + stringifyIntervalTree(this.xIntervalTree, true);
  }

  addContent([x, y, w, h]: Rectangle, content: C) {
    const node = this.xIntervalTree.insertInterval(x, x + w - 1);
    if (node.value == null)
      node.value = new IntervalTree<C[]>();
    const yNode = node.value.insertInterval(y, y + h - 1);
    if (yNode.value == null)
      yNode.value = [content];
    else
      yNode.value.push(content);
  }

  private _searchOverlaps([x, y, w, h]: Rectangle) {
    const foundX = this.xIntervalTree.searchMultipleOverlaps(x, x + w - 1);
    const yEnd = y + h - 1;
    const res = [] as [number, number, number, number, C[]][];
    for (const [xLow, xHigh, yTree] of foundX) {
      for (const [yLow, yHigh, values] of yTree.searchMultipleOverlaps(y, yEnd)) {
        res.push([xLow, xHigh, yLow, yHigh, values]);
      }
    }
    return res;
  }

  searchOverlaps(r: Rectangle) {
    return this._searchOverlaps(r).map(([, , , , values]) => values)
      .reduce((s, v) => {
        s.push(...v);
        return s;
      }, [] as C[]);
  }
  /** search for any rectangle from the tree that is being fully
   * covered by paramerter rectangle */
  searchForCovered(r: Rectangle): C[] {
    const targetXHigh = r[1] + r[0] - 1;
    const targetYHigh = r[2] + r[3] - 1;
    return this._searchOverlaps(r).filter(([xl, xh, yl, yh]) =>
      r[0] <= xl && targetXHigh >= xh && r[2] <= yl && targetYHigh >= yh)
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

  clear() {
    this.xIntervalTree = new IntervalTree<IntervalTree<C[]>>();
  }
}
