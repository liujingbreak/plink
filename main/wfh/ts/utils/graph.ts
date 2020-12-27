export enum Color {
  white = 0,
  gray,
  black
}

export class Vertex<T> {
  /** discovery time */
  d: number;
  /** finishing time */
  f: number;
  /** parent vertices */
  p?: Vertex<T>[];

  constructor(public color = Color.white, public data: T) {}
}

export function getPathTo<T>(v: Vertex<T>, temp = [] as Vertex<T>[]) {
  if (v.p) {
    getPathTo(v.p[0], temp);
  }
  temp.push(v);
}

export class DFS<T> {
  private time = 0;

  backEdges: [Vertex<T>, Vertex<T>][];

  constructor(public adjacencyOf: (u: Vertex<T>) => Iterable<Vertex<T>>) {}

  visit(g: Iterable<Vertex<T>>) {
    this.time = 0;
    for (const u of g) {
      if (u.color === Color.white) {
        this.visitVertex(u);
      }
    }
  }

  private visitVertex(u: Vertex<T>) {
    u.d = ++this.time;
    u.color = Color.gray;
    for (const v of this.adjacencyOf(u)) {
      if (v.color === Color.white) {
        v.p = [u];
        this.visitVertex(v);
      } else if (v.color === Color.gray) {
        this.backEdges.push([u, v]);
      } else {
        v.p!.push(u);
      }
    }
    u.color = Color.black;
    u.f = ++this.time;
  }
}
