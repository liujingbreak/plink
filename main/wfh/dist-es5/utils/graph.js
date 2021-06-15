"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BFS = exports.DFS = exports.getPathTo = exports.Vertex = exports.Color = void 0;
var Color;
(function (Color) {
    Color[Color["white"] = 0] = "white";
    Color[Color["gray"] = 1] = "gray";
    Color[Color["black"] = 2] = "black";
})(Color = exports.Color || (exports.Color = {}));
var Vertex = /** @class */ (function () {
    function Vertex(data, color) {
        if (color === void 0) { color = Color.white; }
        this.data = data;
        this.color = color;
        /** discovery time */
        this.d = Number.MAX_VALUE;
    }
    return Vertex;
}());
exports.Vertex = Vertex;
function getPathTo(v, temp) {
    if (temp === void 0) { temp = []; }
    if (v.p) {
        getPathTo(v.p[0], temp);
    }
    temp.push(v);
}
exports.getPathTo = getPathTo;
var BaseGraph = /** @class */ (function () {
    function BaseGraph() {
        this.vertexMap = new Map();
    }
    BaseGraph.prototype.visit = function (g) {
        var e_1, _a;
        try {
            for (var g_1 = __values(g), g_1_1 = g_1.next(); !g_1_1.done; g_1_1 = g_1.next()) {
                var data = g_1_1.value;
                var u = this.vertexOf(data);
                if (u.color === Color.white) {
                    this.visitVertex(u);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (g_1_1 && !g_1_1.done && (_a = g_1.return)) _a.call(g_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    BaseGraph.prototype.vertexOf = function (data) {
        if (this.vertexMap.has(data)) {
            return this.vertexMap.get(data);
        }
        else {
            var v = new Vertex(data);
            this.vertexMap.set(data, v);
            return v;
        }
    };
    return BaseGraph;
}());
var DFS = /** @class */ (function (_super) {
    __extends(DFS, _super);
    // private vertexMap = new Map<T, Vertex<T>>();
    function DFS(adjacencyOf, onFinish) {
        var _this = _super.call(this) || this;
        _this.adjacencyOf = adjacencyOf;
        _this.onFinish = onFinish;
        _this.backEdges = [];
        _this.time = 0;
        return _this;
    }
    DFS.prototype.visit = function (g) {
        this.time = 0;
        _super.prototype.visit.call(this, g);
    };
    DFS.prototype.printCyclicBackEdge = function (edge, edgeTo) {
        return __spread(this._printParentUntil(edge, edgeTo), [edgeTo.data + '']);
    };
    DFS.prototype._printParentUntil = function (edge, edgeAncestor) {
        if (edge == null) {
            return [];
        }
        if (edge === edgeAncestor) {
            return [edgeAncestor.data + ''];
        }
        if (edge.p)
            return __spread(this._printParentUntil(edge.p[0], edgeAncestor), [edge.data + '']);
        else
            return ['? -> ', edge.data + ''];
    };
    DFS.prototype.visitVertex = function (u) {
        var e_2, _a;
        u.d = ++this.time;
        u.color = Color.gray;
        try {
            for (var _b = __values(this.adjacencyOf(u.data)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var vData = _c.value;
                var v = this.vertexOf(vData);
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
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        u.color = Color.black;
        u.f = ++this.time;
        if (this.onFinish)
            this.onFinish(u);
    };
    return DFS;
}(BaseGraph));
exports.DFS = DFS;
var BFS = /** @class */ (function (_super) {
    __extends(BFS, _super);
    function BFS(adjacencyOf) {
        var _this = _super.call(this) || this;
        _this.adjacencyOf = adjacencyOf;
        return _this;
    }
    BFS.prototype.visitVertex = function (s) {
        var e_3, _a;
        s.color = Color.gray;
        s.d = 0;
        var q = [s];
        while (q.length > 0) {
            var u = q.shift();
            try {
                for (var _b = (e_3 = void 0, __values(this.adjacencyOf(u.data))), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var vData = _c.value;
                    var v = this.vertexOf(vData);
                    if (v.color === Color.white) {
                        v.color = Color.gray;
                        v.d = u.d + 1;
                        if (v.p == null)
                            v.p = [];
                        v.p.push(u);
                        q.push(v);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            u.color = Color.black;
        }
    };
    return BFS;
}(BaseGraph));
exports.BFS = BFS;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ncmFwaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQVksS0FJWDtBQUpELFdBQVksS0FBSztJQUNmLG1DQUFTLENBQUE7SUFDVCxpQ0FBSSxDQUFBO0lBQ0osbUNBQUssQ0FBQTtBQUNQLENBQUMsRUFKVyxLQUFLLEdBQUwsYUFBSyxLQUFMLGFBQUssUUFJaEI7QUFFRDtJQVFFLGdCQUFtQixJQUFPLEVBQVMsS0FBbUI7UUFBbkIsc0JBQUEsRUFBQSxRQUFRLEtBQUssQ0FBQyxLQUFLO1FBQW5DLFNBQUksR0FBSixJQUFJLENBQUc7UUFBUyxVQUFLLEdBQUwsS0FBSyxDQUFjO1FBUHRELHFCQUFxQjtRQUNyQixNQUFDLEdBQVcsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQU83QixDQUFDO0lBQ0gsYUFBQztBQUFELENBQUMsQUFWRCxJQVVDO0FBVlksd0JBQU07QUFZbkIsU0FBZ0IsU0FBUyxDQUFJLENBQVksRUFBRSxJQUF3QjtJQUF4QixxQkFBQSxFQUFBLE9BQU8sRUFBaUI7SUFDakUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ1AsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDekI7SUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2YsQ0FBQztBQUxELDhCQUtDO0FBRUQ7SUFBQTtRQUNZLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBZ0IsQ0FBQztJQXNCaEQsQ0FBQztJQXBCQyx5QkFBSyxHQUFMLFVBQU0sQ0FBYzs7O1lBQ2xCLEtBQW1CLElBQUEsTUFBQSxTQUFBLENBQUMsQ0FBQSxvQkFBQSxtQ0FBRTtnQkFBakIsSUFBTSxJQUFJLGNBQUE7Z0JBQ2IsSUFBTSxD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QUFBLGdCQUFBLDRCQUFFO29CQUF6QyxJQUFNLEtBQUssV0FBQTtvQkFDZCxJQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUMvQixJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLEtBQUssRUFBRTt3QkFDM0IsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO3dCQUNyQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJOzRCQUNiLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNaLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQ1g7aUJBQ0Y7Ozs7Ozs7OztZQUNELENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQztTQUN2QjtJQUNILENBQUM7SUFDSCxVQUFDO0FBQUQsQ0FBQyxBQXpCRCxDQUE0QixTQUFTLEdBeUJwQztBQXpCWSxrQkFBRyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBlbnVtIENvbG9yIHtcbiAgd2hpdGUgPSAwLFxuICBncmF5LFxuICBibGFja1xufVxuXG5leHBvcnQgY2xhc3MgVmVydGV4PFQ+IHtcbiAgLyoqIGRpc2NvdmVyeSB0aW1lICovXG4gIGQ6IG51bWJlciA9IE51bWJlci5NQVhfVkFMVUU7XG4gIC8qKiBmaW5pc2hpbmcgdGltZSwgdXNlZCB0byBjYWxjdWxhdGUgXCJTdHJvbmdseSBjb25uZWN0ZWQgY29tcG9uZW50c1wiIGFuZCBcIlRvcG9sb2dpY2FsIHNvcnRcIiAqL1xuICBmOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIC8qKiBwYXJlbnQgdmVydGljZXMgKi9cbiAgcD86IFZlcnRleDxUPltdO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBkYXRhOiBULCBwdWJsaWMgY29sb3IgPSBDb2xvci53aGl0ZSkge1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXRoVG88VD4odjogVmVydGV4PFQ+LCB0ZW1wID0gW10gYXMgVmVydGV4PFQ+W10pIHtcbiAgaWYgKHYucCkge1xuICAgIGdldFBhdGhUbyh2LnBbMF0sIHRlbXApO1xuICB9XG4gIHRlbXAucHVzaCh2KTtcbn1cblxuYWJzdHJhY3QgY2xhc3MgQmFzZUdyYXBoPFQ+IHtcbiAgcHJvdGVjdGVkIHZlcnRleE1hcCA9IG5ldyBNYXA8VCwgVmVydGV4PFQ+PigpO1xuXG4gIHZpc2l0KGc6IEl0ZXJhYmxlPFQ+KSB7XG4gICAgZm9yIChjb25zdCBkYXRhIG9mIGcpIHtcbiAgICAgIGNvbnN0IHUgPSB0aGlzLnZlcnRleE9mKGRhdGEpO1xuICAgICAgaWYgKHUuY29sb3IgPT09IENvbG9yLndoaXRlKSB7XG4gICAgICAgIHRoaXMudmlzaXRWZXJ0ZXgodSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGFic3RyYWN0IHZpc2l0VmVydGV4KHU6IFZlcnRleDxUPik6IHZvaWQ7XG5cbiAgcHJvdGVjdGVkIHZlcnRleE9mKGRhdGE6IFQpIHtcbiAgICBpZiAodGhpcy52ZXJ0ZXhNYXAuaGFzKGRhdGEpKSB7XG4gICAgICByZXR1cm4gdGhpcy52ZXJ0ZXhNYXAuZ2V0KGRhdGEpITtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdiA9IG5ldyBWZXJ0ZXgoZGF0YSk7XG4gICAgICB0aGlzLnZlcnRleE1hcC5zZXQoZGF0YSwgdik7XG4gICAgICByZXR1cm4gdjtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIERGUzxUPiBleHRlbmRzIEJhc2VHcmFwaDxUPiB7XG4gIGJhY2tFZGdlczogW1ZlcnRleDxUPiwgVmVydGV4PFQ+XVtdID0gW107XG5cbiAgcHJpdmF0ZSB0aW1lID0gMDtcbiAgLy8gcHJpdmF0ZSB2ZXJ0ZXhNYXAgPSBuZXcgTWFwPFQsIFZlcnRleDxUPj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGFkamFjZW5jeU9mOiAodTogVCkgPT4gSXRlcmFibGU8VD4sIHByaXZhdGUgb25GaW5pc2g/OiAodmVydGV4OiBWZXJ0ZXg8VD4pID0+IGFueSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICB2aXNpdChnOiBJdGVyYWJsZTxUPikge1xuICAgIHRoaXMudGltZSA9IDA7XG4gICAgc3VwZXIudmlzaXQoZyk7XG4gIH1cblxuICBwcmludEN5Y2xpY0JhY2tFZGdlKGVkZ2U6IFZlcnRleDxUPiwgZWRnZVRvOiBWZXJ0ZXg8VD4pOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLl9wcmludFBhcmVudFVudGlsKGVkZ2UsIGVkZ2VUbyksIGVkZ2VUby5kYXRhICsnJ107XG4gIH1cblxuICBfcHJpbnRQYXJlbnRVbnRpbChlZGdlOiBWZXJ0ZXg8VD4sIGVkZ2VBbmNlc3RvcjogVmVydGV4PFQ+KTogc3RyaW5nW10ge1xuICAgIGlmIChlZGdlID09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgaWYgKGVkZ2UgPT09IGVkZ2VBbmNlc3Rvcikge1xuICAgICAgcmV0dXJuIFtlZGdlQW5jZXN0b3IuZGF0YSArICcnXTtcbiAgICB9XG4gICAgaWYgKGVkZ2UucClcbiAgICAgIHJldHVybiBbLi4udGhpcy5fcHJpbnRQYXJlbnRVbnRpbChlZGdlLnBbMF0sIGVkZ2VBbmNlc3RvciksIGVkZ2UuZGF0YSArICcnXTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gWyc/IC0+ICcsIGVkZ2UuZGF0YSArICcnXTtcbiAgfVxuXG4gIHByb3RlY3RlZCB2aXNpdFZlcnRleCh1OiBWZXJ0ZXg8VD4pIHtcbiAgICB1LmQgPSArK3RoaXMudGltZTtcbiAgICB1LmNvbG9yID0gQ29sb3IuZ3JheTtcbiAgICBmb3IgKGNvbnN0IHZEYXRhIG9mIHRoaXMuYWRqYWNlbmN5T2YodS5kYXRhKSkge1xuICAgICAgY29uc3QgdiA9IHRoaXMudmVydGV4T2YodkRhdGEpO1xuICAgICAgaWYgKHYuY29sb3IgPT09IENvbG9yLndoaXRlKSB7XG4gICAgICAgIHYucCA9IFt1XTtcbiAgICAgICAgdGhpcy52aXNpdFZlcnRleCh2KTtcbiAgICAgIH0gZWxzZSBpZiAodi5jb2xvciA9PT0gQ29sb3IuZ3JheSkge1xuICAgICAgICB0aGlzLmJhY2tFZGdlcy5wdXNoKFt1LCB2XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodi5wID09IG51bGwpXG4gICAgICAgICAgdi5wID0gW107XG4gICAgICAgIHYucC5wdXNoKHUpO1xuICAgICAgfVxuICAgIH1cbiAgICB1LmNvbG9yID0gQ29sb3IuYmxhY2s7XG4gICAgdS5mID0gKyt0aGlzLnRpbWU7XG4gICAgaWYgKHRoaXMub25GaW5pc2gpXG4gICAgICB0aGlzLm9uRmluaXNoKHUpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBCRlM8VD4gZXh0ZW5kcyBCYXNlR3JhcGg8VD4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGFkamFjZW5jeU9mOiAodTogVCkgPT4gSXRlcmFibGU8VD4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHZpc2l0VmVydGV4KHM6IFZlcnRleDxUPikge1xuICAgIHMuY29sb3IgPSBDb2xvci5ncmF5O1xuICAgIHMuZCA9IDA7XG4gICAgY29uc3QgcTogVmVydGV4PFQ+W10gPSBbc107XG4gICAgd2hpbGUgKHEubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgdSA9IHEuc2hpZnQoKSE7XG4gICAgICBmb3IgKGNvbnN0IHZEYXRhIG9mIHRoaXMuYWRqYWNlbmN5T2YodS5kYXRhKSkge1xuICAgICAgICBjb25zdCB2ID0gdGhpcy52ZXJ0ZXhPZih2RGF0YSk7XG4gICAgICAgIGlmICh2LmNvbG9yID09PSBDb2xvci53aGl0ZSkge1xuICAgICAgICAgIHYuY29sb3IgPSBDb2xvci5ncmF5O1xuICAgICAgICAgIHYuZCA9IHUuZCArIDE7XG4gICAgICAgICAgaWYgKHYucCA9PSBudWxsKVxuICAgICAgICAgICAgdi5wID0gW107XG4gICAgICAgICAgdi5wLnB1c2godSk7XG4gICAgICAgICAgcS5wdXNoKHYpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB1LmNvbG9yID0gQ29sb3IuYmxhY2s7XG4gICAgfVxuICB9XG59XG4iXX0=