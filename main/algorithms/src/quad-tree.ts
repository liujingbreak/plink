export type Rectangle = [minX: number, minY: number, maxX: number, maxY: number];

export class QuadTreeNode {
  capacity: number;
  rectangles: Rectangle[];
  divided: boolean;
  children: QuadTreeNode[];

  constructor(public boundary: Rectangle, public parent: QuadTreeNode, capacity = 4) {
    this.capacity = capacity;
    this.rectangles = [];
    this.divided = false;
    this.children = [];
  }

  // 判断矩形是否在当前节点范围内
  contains([minX, minY, maxX, maxY]: Rectangle): boolean {
    const [bMinX, bMinY, bMaxX, bMaxY] = this.boundary;
    return (
      minX >= bMinX &&
      maxX <= bMaxX &&
      minY >= bMinY &&
      maxY <= bMaxY
    );
  }

  // 判断当前节点是否与查询范围相交
  intersects([minX, minY, maxX, maxY]: Rectangle): boolean {
    const [bMinX, bMinY, bMaxX, bMaxY] = this.boundary;
    return !(
      maxX < bMinX ||
      minX > bMaxX ||
      maxY < bMinY ||
      minY > bMaxY
    );
  }

  // 插入矩形并动态平衡
  insert(rect: Rectangle): boolean {
    if (!this.contains(rect)) return false;

    if (this.rectangles.length < this.capacity) {
      this.rectangles.push(rect);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    for (const child of this.children) {
      if (child.insert(rect)) return true;
    }

    return false;
  }

  // 分裂节点为四个子节点
  private subdivide(): void {
    const [minX, minY, maxX, maxY] = this.boundary;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    this.children = [
      new QuadTreeNode(
        [minX, minY, midX, midY],
        this,
        this.capacity
      ),
      new QuadTreeNode(
        [midX, minY, maxX, midY],
        this,
        this.capacity
      ),
      new QuadTreeNode(
        [minX, midY, midX, maxY],
        this,
        this.capacity
      ),
      new QuadTreeNode(
        [midX, midY, maxX, maxY],
        this,
        this.capacity
      )
    ];

    // 将原矩形重新分配到子节点
    for (const rect of this.rectangles) {
      for (const child of this.children) {
        if (child.insert(rect)) break;
      }
    }

    this.rectangles = [];
    this.divided = true;
  }

  // 删除矩形并动态平衡
  delete(rect: Rectangle): boolean {
    if (!this.contains(rect)) return false;

    const index = this.rectangles.indexOf(rect);
    if (index !== -1) {
      this.rectangles.splice(index, 1);
      this.balance();
      return true;
    }

    if (this.divided) {
      for (const child of this.children) {
        if (child.delete(rect)) return true;
      }
    }

    return false;
  }

  // 平衡节点：合并子节点或清理空节点
  private balance(): void {
    if (!this.divided) {
      return;
    }
    // 尝试合并子节点
    const allEmpty = this.children.every(child => child.rectangles.length === 0);
    if (allEmpty) {
      this.children = [];
      this.divided = false;
    } else {
      // 合并子节点到当前节点
      this.rectangles.push(...this.children.map(c => c.rectangles).flat());
      this.children = [];
      this.divided = false;
    }
  }

  // 查询与范围重叠的矩形
  query(range: Rectangle, found: Rectangle[] = []): Rectangle[] {
    if (!this.intersects(range)) return found;

    for (const rect of this.rectangles) {
      if (this.isOverlap(rect, range)) {
        found.push(rect);
      }
    }

    if (this.divided) {
      for (const child of this.children) {
        child.query(range, found);
      }
    }

    return found;
  }

  // 查询被查询范围完全覆盖的矩形
  queryCovered(range: Rectangle, found: Rectangle[] = []): Rectangle[] {
    if (!this.intersects(range))
      return found;

    for (const rect of this.rectangles) {
      if (this.isCovered(rect, range)) {
        found.push(rect);
      }
    }

    if (this.divided) {
      for (const child of this.children) {
        child.queryCovered(range, found);
      }
    }

    return found;
  }

  // 判断矩形是否与查询范围重叠
  private isOverlap([minX, minY, maxX, maxY]: Rectangle, [rMinX, rMinY, rMaxX, rMaxY]: Rectangle): boolean {
    return (
      minX < rMaxX &&
      maxX > rMinX &&
      minY < rMaxY &&
      maxY > rMinY
    );
  }

  // 判断矩形是否被查询范围完全覆盖
  private isCovered(rect: Rectangle, range: Rectangle): boolean {
    return (
      rect.minX >= range.minX &&
      rect.maxX <= range.maxX &&
      rect.minY >= range.minY &&
      rect.maxY <= range.maxY
    );
  }
}

export class QuadTree {
  root: QuadTreeNode;

  constructor(boundary: Rectangle, capacity = 4) {
    this.root = new QuadTreeNode(boundary, capacity);
  }

  // 插入矩形
  insert(rect: Rectangle): boolean {
    return this.root.insert(rect);
  }

  // 删除矩形
  delete(rect: Rectangle): boolean {
    return this.root.delete(rect);
  }

  // 查询重叠矩形
  query(range: Rectangle): Rectangle[] {
    return this.root.query(range);
  }

  // 查询被完全覆盖的矩形
  queryCovered(range: Rectangle): Rectangle[] {
    return this.root.queryCovered(range);
  }
}
