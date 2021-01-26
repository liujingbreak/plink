"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DFS = exports.getPathTo = exports.Vertex = exports.Color = void 0;
var Color;
(function (Color) {
    Color[Color["white"] = 0] = "white";
    Color[Color["gray"] = 1] = "gray";
    Color[Color["black"] = 2] = "black";
})(Color = exports.Color || (exports.Color = {}));
class Vertex {
    constructor(data, color = Color.white) {
        this.data = data;
        this.color = color;
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
class DFS {
    constructor(adjacencyOf) {
        this.adjacencyOf = adjacencyOf;
        this.backEdges = [];
        this.time = 0;
        this.vertexMap = new Map();
    }
    visit(g) {
        this.time = 0;
        for (const u of g) {
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
    printCyclicBackEdge(edge, edgeTo) {
        return this._printParentUntil(edge, edgeTo) + '->' + edgeTo.data;
    }
    _printParentUntil(edge, edgeAncestor) {
        if (edge == null) {
            return '';
        }
        if (edge === edgeAncestor) {
            return edgeAncestor.data + '';
        }
        if (edge.p)
            return this._printParentUntil(edge.p[0], edgeAncestor) + ' -> ' + edge.data;
        else
            return '? -> ' + edge.data;
    }
    visitVertex(u) {
        u.d = ++this.time;
        u.color = Color.gray;
        for (const v of this.adjacencyOf(u)) {
            if (v.color === Color.white) {
                v.p = [u];
                this.visitVertex(v);
            }
            else if (v.color === Color.gray) {
                this.backEdges.push([u, v]);
            }
            else {
                v.p.push(u);
            }
        }
        u.color = Color.black;
        u.f = ++this.time;
    }
}
exports.DFS = DFS;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ncmFwaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxJQUFZLEtBSVg7QUFKRCxXQUFZLEtBQUs7SUFDZixtQ0FBUyxDQUFBO0lBQ1QsaUNBQUksQ0FBQTtJQUNKLG1DQUFLLENBQUE7QUFDUCxDQUFDLEVBSlcsS0FBSyxHQUFMLGFBQUssS0FBTCxhQUFLLFFBSWhCO0FBRUQsTUFBYSxNQUFNO0lBUWpCLFlBQW1CLElBQU8sRUFBUyxRQUFRLEtBQUssQ0FBQyxLQUFLO1FBQW5DLFNBQUksR0FBSixJQUFJLENBQUc7UUFBUyxVQUFLLEdBQUwsS0FBSyxDQUFjO0lBQUcsQ0FBQztDQUMzRDtBQVRELHdCQVNDO0FBRUQsU0FBZ0IsU0FBUyxDQUFJLENBQVksRUFBRSxPQUFPLEVBQWlCO0lBQ2pFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNQLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3pCO0lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUM7QUFMRCw4QkFLQztBQUVELE1BQWEsR0FBRztJQU1kLFlBQW9CLFdBQWtEO1FBQWxELGdCQUFXLEdBQVgsV0FBVyxDQUF1QztRQUx0RSxjQUFTLEdBQTZCLEVBQUUsQ0FBQztRQUVqQyxTQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ1QsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFnQixDQUFDO0lBRTZCLENBQUM7SUFFMUUsS0FBSyxDQUFDLENBQXNCO1FBQzFCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDakIsSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxLQUFLLEVBQUU7Z0JBQzNCLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDckI7U0FDRjtJQUNILENBQUM7SUFFRCxRQUFRLENBQUMsSUFBTztRQUNkLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDNUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQztTQUNsQzthQUFNO1lBQ0wsTUFBTSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7SUFDSCxDQUFDO0lBRUQsbUJBQW1CLENBQUMsSUFBZSxFQUFFLE1BQWlCO1FBQ3BELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNuRSxDQUFDO0lBRUQsaUJBQWlCLENBQUMsSUFBZSxFQUFFLFlBQXVCO1FBQ3hELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtZQUNoQixPQUFPLEVBQUUsQ0FBQztTQUNYO1FBQ0QsSUFBSSxJQUFJLEtBQUssWUFBWSxFQUFFO1lBQ3pCLE9BQU8sWUFBWSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7U0FDL0I7UUFDRCxJQUFJLElBQUksQ0FBQyxDQUFDO1lBQ1IsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQzs7WUFFNUUsT0FBTyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUMvQixDQUFDO0lBRU8sV0FBVyxDQUFDLENBQVk7UUFDOUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDbEIsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3JCLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLEtBQUssRUFBRTtnQkFDM0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNWLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDckI7aUJBQU0sSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxJQUFJLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDN0I7aUJBQU07Z0JBQ0wsQ0FBQyxDQUFDLENBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDZDtTQUNGO1FBQ0QsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ3RCLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTVERCxrQkE0REMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZW51bSBDb2xvciB7XG4gIHdoaXRlID0gMCxcbiAgZ3JheSxcbiAgYmxhY2tcbn1cblxuZXhwb3J0IGNsYXNzIFZlcnRleDxUPiB7XG4gIC8qKiBkaXNjb3ZlcnkgdGltZSAqL1xuICBkOiBudW1iZXI7XG4gIC8qKiBmaW5pc2hpbmcgdGltZSAqL1xuICBmOiBudW1iZXI7XG4gIC8qKiBwYXJlbnQgdmVydGljZXMgKi9cbiAgcD86IFZlcnRleDxUPltdO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBkYXRhOiBULCBwdWJsaWMgY29sb3IgPSBDb2xvci53aGl0ZSkge31cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBhdGhUbzxUPih2OiBWZXJ0ZXg8VD4sIHRlbXAgPSBbXSBhcyBWZXJ0ZXg8VD5bXSkge1xuICBpZiAodi5wKSB7XG4gICAgZ2V0UGF0aFRvKHYucFswXSwgdGVtcCk7XG4gIH1cbiAgdGVtcC5wdXNoKHYpO1xufVxuXG5leHBvcnQgY2xhc3MgREZTPFQ+IHtcbiAgYmFja0VkZ2VzOiBbVmVydGV4PFQ+LCBWZXJ0ZXg8VD5dW10gPSBbXTtcblxuICBwcml2YXRlIHRpbWUgPSAwO1xuICBwcml2YXRlIHZlcnRleE1hcCA9IG5ldyBNYXA8VCwgVmVydGV4PFQ+PigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgYWRqYWNlbmN5T2Y6ICh1OiBWZXJ0ZXg8VD4pID0+IEl0ZXJhYmxlPFZlcnRleDxUPj4pIHt9XG5cbiAgdmlzaXQoZzogSXRlcmFibGU8VmVydGV4PFQ+Pikge1xuICAgIHRoaXMudGltZSA9IDA7XG4gICAgZm9yIChjb25zdCB1IG9mIGcpIHtcbiAgICAgIGlmICh1LmNvbG9yID09PSBDb2xvci53aGl0ZSkge1xuICAgICAgICB0aGlzLnZpc2l0VmVydGV4KHUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZlcnRleE9mKGRhdGE6IFQpIHtcbiAgICBpZiAodGhpcy52ZXJ0ZXhNYXAuaGFzKGRhdGEpKSB7XG4gICAgICByZXR1cm4gdGhpcy52ZXJ0ZXhNYXAuZ2V0KGRhdGEpITtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdiA9IG5ldyBWZXJ0ZXgoZGF0YSk7XG4gICAgICB0aGlzLnZlcnRleE1hcC5zZXQoZGF0YSwgdik7XG4gICAgICByZXR1cm4gdjtcbiAgICB9XG4gIH1cblxuICBwcmludEN5Y2xpY0JhY2tFZGdlKGVkZ2U6IFZlcnRleDxUPiwgZWRnZVRvOiBWZXJ0ZXg8VD4pOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9wcmludFBhcmVudFVudGlsKGVkZ2UsIGVkZ2VUbykgKyAnLT4nICsgZWRnZVRvLmRhdGE7XG4gIH1cblxuICBfcHJpbnRQYXJlbnRVbnRpbChlZGdlOiBWZXJ0ZXg8VD4sIGVkZ2VBbmNlc3RvcjogVmVydGV4PFQ+KTogc3RyaW5nIHtcbiAgICBpZiAoZWRnZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIGlmIChlZGdlID09PSBlZGdlQW5jZXN0b3IpIHtcbiAgICAgIHJldHVybiBlZGdlQW5jZXN0b3IuZGF0YSArICcnO1xuICAgIH1cbiAgICBpZiAoZWRnZS5wKVxuICAgICAgcmV0dXJuIHRoaXMuX3ByaW50UGFyZW50VW50aWwoZWRnZS5wWzBdLCBlZGdlQW5jZXN0b3IpICsgJyAtPiAnICsgZWRnZS5kYXRhO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiAnPyAtPiAnICsgZWRnZS5kYXRhO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFZlcnRleCh1OiBWZXJ0ZXg8VD4pIHtcbiAgICB1LmQgPSArK3RoaXMudGltZTtcbiAgICB1LmNvbG9yID0gQ29sb3IuZ3JheTtcbiAgICBmb3IgKGNvbnN0IHYgb2YgdGhpcy5hZGphY2VuY3lPZih1KSkge1xuICAgICAgaWYgKHYuY29sb3IgPT09IENvbG9yLndoaXRlKSB7XG4gICAgICAgIHYucCA9IFt1XTtcbiAgICAgICAgdGhpcy52aXNpdFZlcnRleCh2KTtcbiAgICAgIH0gZWxzZSBpZiAodi5jb2xvciA9PT0gQ29sb3IuZ3JheSkge1xuICAgICAgICB0aGlzLmJhY2tFZGdlcy5wdXNoKFt1LCB2XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2LnAhLnB1c2godSk7XG4gICAgICB9XG4gICAgfVxuICAgIHUuY29sb3IgPSBDb2xvci5ibGFjaztcbiAgICB1LmYgPSArK3RoaXMudGltZTtcbiAgfVxufVxuIl19