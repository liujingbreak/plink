export enum Color {
  white = 0,
  gray,
  black
}

class Vertex<T> {
  /** discovery time */
  d: number;
  /** finishing time */
  f: number;
  /** parent vertices */
  p?: Vertex<T>[];

  constructor(public data: T, public color = Color.white) {}
}

export function getPathTo<T>(v: Vertex<T>, temp = [] as Vertex<T>[]) {
  if (v.p) {
    getPathTo(v.p[0], temp);
  }
  temp.push(v);
}

export class DFS<T> {
  backEdges: [Vertex<T>, Vertex<T>][] = [];

  private time = 0;
  private vertexMap = new Map<T, Vertex<T>>();

  constructor(private adjacencyOf: (u:T) => Iterable<T>) {}

  visit(g: Iterable<T>) {
    this.time = 0;
    for (const data of g) {
      const u = this.vertexOf(data);
      if (u.color === Color.white) {
        this.visitVertex(u);
      }
    }
  }

  vertexOf(data: T) {
    if (this.vertexMap.has(data)) {
      return this.vertexMap.get(data)!;
    } else {
      const v = new Vertex(data);
      this.vertexMap.set(data, v);
      return v;
    }
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

  private visitVertex(u: Vertex<T>) {
    u.d = ++this.time;
    u.color = Color.gray;
    for (const vData of this.adjacencyOf(u.data)) {
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
  }
}
