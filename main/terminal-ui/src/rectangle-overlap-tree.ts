import {IntervalTree} from '@wfh/algorithms';
import type {Rectangle} from './terminal-canvas';

const EMPTY_ARR = [] as unknown[];

export class RectangleOverlapTree<C> {
  private xIntervalTree = new IntervalTree<C | C[]>();
  private yIntervalTree = new IntervalTree<C | C[]>();

  addContent([x, y, w, h]: Rectangle, content: C) {
    const node = this.xIntervalTree.insertInterval(x, x + w - 1);
    if (node.value == null)
      node.value = content;
    else if (Array.isArray(node.value))
      node.value.push(content);
    else
      node.value = [node.value, content];

    const nodeY = this.yIntervalTree.insertInterval(y, y + h - 1);
    if (nodeY.value == null)
      nodeY.value = content;
    else if (Array.isArray(nodeY.value))
      nodeY.value.push(content);
    else
      nodeY.value = [nodeY.value, content];
  }

  searchOverlaps([x, y, w, h]: Rectangle) {
    const foundX = this.xIntervalTree.searchMultipleOverlaps(x, x + w);
    const foundItemsOfX = new Set<C>((function*() {
      for (const [, , data] of foundX) {
        if (Array.isArray(data)) {
          for (const it of data)
            yield it;
        } else {
          yield data;
        }
      }
    })());
    const foundY = this.yIntervalTree.searchMultipleOverlaps(y, y + h);
    return [...foundY].flatMap(([, , data]) => {
      if (Array.isArray(data)) {
        return data.filter(it => foundItemsOfX.has(it));
      } else if (foundItemsOfX.has(data)) {
        return [data];
      } else {
        return EMPTY_ARR as C[];
      }
    });
  }
  updateContent([x, y, w, h]: Rectangle, content: C) {
    updateContentToTree(this.xIntervalTree, x, x + w - 1, content);
    updateContentToTree(this.yIntervalTree, y, y + h - 1, content);
  }

  clear() {
    this.xIntervalTree = new IntervalTree<C | C[]>();
    this.yIntervalTree = new IntervalTree<C | C[]>();
  }
}

function updateContentToTree<C>(tree: IntervalTree<C | C[]>, low: number, high: number, content: C) {
  const node = tree.searchIntervalNode(low, high);
  if (node == null)
    throw new Error(`Can not find component at range at ${low}, width: ${high - low + 1}`);
  if (node.value === content) {
    // delete entire node
    tree.deleteInterval(low, high);
  } else if (Array.isArray(node.value)) {
    const idx = node.value.findIndex(data => data === content);
    if (idx)
      node.value.splice(idx, 1);
  }
  const newNode = tree.insertInterval(low, high);
  if (newNode.value) {
    if (Array.isArray(newNode.value))
      newNode.value.push(content);
    else
      newNode.value = [newNode.value, content];
  } else {
    newNode.value = content;
  }
}
