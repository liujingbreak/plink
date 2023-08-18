"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BFS = exports.DFS = exports.getPathTo = exports.Vertex = exports.Color = void 0;
var Color;
(function (Color) {
    /** unvisisted */
    Color[Color["white"] = 0] = "white";
    /** visiting */
    Color[Color["gray"] = 1] = "gray";
    /** visisted */
    Color[Color["black"] = 2] = "black";
})(Color || (exports.Color = Color = {}));
class Vertex {
    constructor(data, color = Color.white) {
        this.data = data;
        this.color = color;
        /** discovery time */
        this.d = Number.MAX_VALUE;
    }
}
exports.Vertex = Vertex;
function getPathTo(v, temp = []) {
    if (v.p) {
        getPathTo(v.p[0], temp);
    }
    temp.push(v);
}
exports.getPathTo = getPathTo;
class BaseGraph {
    constructor() {
        this.vertexMap = new Map();
    }
    visit(g) {
        for (const data of g) {
            const u = this.vertexOf(data);
            if (u.color === Color.white) {
                this.visitVertex(u);
            }
        }
    }
    vertexOf(data) {
        if (this.vertexMap.has(data)) {
            return this.vertexMap.get(data);
        }
        else {
            const v = new Vertex(data);
            this.vertexMap.set(data, v);
            return v;
        }
    }
}
class DFS extends BaseGraph {
    // private vertexMap = new Map<T, Vertex<T>>();
    constructor(adjacencyOf, onFinish) {
        super();
        this.adjacencyOf = adjacencyOf;
        this.onFinish = onFinish;
        this.backEdges = [];
        this.time = 0;
        this.level = -1;
    }
    visit(g) {
        this.time = 0;
        super.visit(g);
    }
    printCyclicBackEdge(edge, edgeTo) {
        return [...this._printParentUntil(edge, edgeTo), edgeTo.data + ''];
    }
    _printParentUntil(edge, edgeAncestor) {
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
    visitVertex(u) {
        u.d = ++this.time;
        u.color = Color.gray;
        this.level++;
        for (const vData of this.adjacencyOf(u.data, u, this.level)) {
            const v = this.vertexOf(vData);
            if (v.color === Color.white) {
                v.p = [u];
                this.visitVertex(v);
            }
            else if (v.color === Color.gray) {
                this.backEdges.push([u, v]);
            }
            else {
                if (v.p == null)
                    v.p = [];
                v.p.push(u);
            }
        }
        u.color = Color.black;
        u.f = ++this.time;
        this.level--;
        if (this.onFinish)
            this.onFinish(u, this.level);
    }
}
exports.DFS = DFS;
class BFS extends BaseGraph {
    constructor(adjacencyOf) {
        super();
        this.adjacencyOf = adjacencyOf;
    }
    visitVertex(s) {
        s.color = Color.gray;
        s.d = 0;
        const q = [s];
        while (q.length > 0) {
            const u = q.shift();
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
exports.BFS = BFS;
//# sourceMappingURL=graph.js.map