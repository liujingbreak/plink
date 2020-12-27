export declare enum Color {
    white = 0,
    gray = 1,
    black = 2
}
export declare class Vertex<T> {
    color: Color;
    data: T;
    /** discovery time */
    d: number;
    /** finishing time */
    f: number;
    /** parent vertices */
    p?: Vertex<T>[];
    constructor(color: Color, data: T);
}
export declare function getPathTo<T>(v: Vertex<T>, temp?: Vertex<T>[]): void;
export declare class DFS<T> {
    adjacencyOf: (u: Vertex<T>) => Iterable<Vertex<T>>;
    private time;
    backEdges: [Vertex<T>, Vertex<T>][];
    constructor(adjacencyOf: (u: Vertex<T>) => Iterable<Vertex<T>>);
    visit(g: Iterable<Vertex<T>>): void;
    private visitVertex;
}
