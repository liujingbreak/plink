export enum Color {
  white = 0,
  gray,
  black
}

export class Vertex<T> {
  /** discovery time */
  d: number = Number.MAX_VALUE;
  /** finishing time, used to calculate "Strongly connected components" and "Topological sort" */
  f: number | undefined;
  /** parent vertices */
  p?: Vertex<T>[];

  constructor(public data: T, public color = Color.white) {
  }
}

export function getPathTo<T>(v: Vertex<T>, temp = [] as Vertex<T>[]) {
  if (v.p) {
    getPathTo(v.p[0], temp);
  }
  temp.push(v);
}

abstract class BaseGraph<T> {
  protected vertexMap = new Map<T, Vertex<T>>();

  visit(g: Iterable<T>) {
    for (const data of g) {
      const u = this.vertexOf(data);
      if (u.color === Color.white) {
        this.visitVertex(u);
      }
    }
  }

  protected abstract visitVertex(u: Vertex<T>): void;

  protected vertexOf(data: T) {
    if (this.vertexMap.has(data)) {
      return this.vertexMap.get(data)!;
    } else {
      const v = new Vertex(data);
      this.vertexMap.set(data, v);
      return v;
    }
  }
}

export class DFS<T> extends BaseGraph<T> {
  backEdges: [Vertex<T>, Vertex<T>][] = [];

  private time = 0;
  // private vertexMap = new Map<T, Vertex<T>>();

  constructor(private adjacencyOf: (u: T, vertex: Vertex<T>) => Iterable<T>, private onFinish?: (vertex: Vertex<T>) => any) {
    super();
  }

  visit(g: Iterable<T>) {
    this.time = 0;
    super.visit(g);
  }

  printCyclicBackEdge(edge: Vertex<T>, edgeTo: Vertex<T>): string[] {
    return [...this._printParentUntil(edge, edgeTo), edgeTo.data +''];
  }

  _printParentUntil(edge: Vertex<T>, edgeAncestor: Vertex<T>): string[] {
    if (edge == null) {
      return [];
    }
    if (edge === edgeAncestor) {
      return [edgeAncestor.data + ''];
    }
    if (edge.p)
      return [...this._printParentUntil(edge.p[0], edgeAncestor), edge.data + ''];
    else
      return ['? -> ', edge.data + ''];
  }

  protected visitVertex(u: Vertex<T>) {
    u.d = ++this.time;
    u.color = Color.gray;
    for (const vData of this.adjacencyOf(u.data, u)) {
      const v = this.vertexOf(vData);
      if (v.color === Color.white) {
        v.p = [u];
        this.visitVertex(v);
      } else if (v.color === Color.gray) {
        this.backEdges.push([u, v]);
      } else {
        if (v.p == null)
          v.p = [];
        v.p.push(u);
      }
    }
    u.color = Color.black;
    u.f = ++this.time;
    if (this.onFinish)
      this.onFinish(u);
  }
}

export class BFS<T> extends BaseGraph<T> {
  constructor(private adjacencyOf: (u: T, vertex: Vertex<T>) => Iterable<T>) {
    super();
  }

  protected visitVertex(s: Vertex<T>) {
    s.color = Color.gray;
    s.d = 0;
    const q: Vertex<T>[] = [s];
    while (q.length > 0) {
      const u = q.shift()!;
      for (const vData of this.adjacencyOf(u.data, u)) {
        const v = this.vertexOf(vData);
        if (v.color === Color.white) {
          v.color = Color.gray;
          v.d = u.d + 1;
          if (v.p == null)
            v.p = [];
          v.p.push(u);
          q.push(v);
        }
      }
      u.color = Color.black;
    }
  }
}
