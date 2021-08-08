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
        _this.level = -1;
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
        this.level++;
        try {
            for (var _b = __values(this.adjacencyOf(u.data, u, this.level)), _c = _b.next(); !_c.done; _c = _b.next()) {
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
        this.level--;
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
                for (var _b = (e_3 = void 0, __values(this.adjacencyOf(u.data, u))), _c = _b.next(); !_c.done; _c = _b.next()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ncmFwaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQVksS0FJWDtBQUpELFdBQVksS0FBSztJQUNmLG1DQUFTLENBQUE7SUFDVCxpQ0FBSSxDQUFBO0lBQ0osbUNBQUssQ0FBQTtBQUNQLENBQUMsRUFKVyxLQUFLLEdBQUwsYUFBSyxLQUFMLGFBQUssUUFJaEI7QUFFRDtJQVFFLGdCQUFtQixJQUFPLEVBQVMsS0FBbUI7UUFBbkIsc0JBQUEsRUFBQSxRQUFRLEtBQUssQ0FBQyxLQUFLO1FBQW5DLFNBQUksR0FBSixJQUFJLENBQUc7UUFBUyxVQUFLLEdBQUwsS0FBSyxDQUFjO1FBUHRELHFCQUFxQjtRQUNyQixNQUFDLEdBQVcsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQU83QixDQUFDO0lBQ0gsYUFBQztBQUFELENBQUMsQUFWRCxJQVVDO0FBVlksd0JBQU07QUFZbkIsU0FBZ0IsU0FBUyxDQUFJLENBQVksRUFBRSxJQUF3QjtJQUF4QixxQkFBQSxFQUFBLE9BQU8sRUFBaUI7SUFDakUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ1AsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDekI7SUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2YsQ0FBQztBQUxELDhCQUtDO0FBRUQ7SUFBQTtRQUNZLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBZ0IsQ0FBQztJQXNCaEQsQ0FBQztJQXBCQyx5QkFBSyxHQUFMLFVBQU0sQ0FBYzs7O1lBQ2xCLEtBQW1CLElBQUEsTUFBQSxTQUFBLENBQUMsQ0FBQSxvQkFBQSxtQ0FBRTtnQkFBakIsSUFBTSxJQUFJLGNBQUE7Z0JBQ2IsSUFBTSxD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Q25CLElBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUcsQ0FBQzs7Z0JBQ3JCLEtBQW9CLElBQUEsb0JBQUEsU0FBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBNUMsSUFBTSxLQUFLLFdBQUE7b0JBQ2QsSUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDL0IsSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxLQUFLLEVBQUU7d0JBQzNCLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQzt3QkFDckIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSTs0QkFDYixDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDWixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNYO2lCQUNGOzs7Ozs7Ozs7WUFDRCxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7U0FDdkI7SUFDSCxDQUFDO0lBQ0gsVUFBQztBQUFELENBQUMsQUF6QkQsQ0FBNEIsU0FBUyxHQXlCcEM7QUF6Qlksa0JBQUciLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZW51bSBDb2xvciB7XG4gIHdoaXRlID0gMCxcbiAgZ3JheSxcbiAgYmxhY2tcbn1cblxuZXhwb3J0IGNsYXNzIFZlcnRleDxUPiB7XG4gIC8qKiBkaXNjb3ZlcnkgdGltZSAqL1xuICBkOiBudW1iZXIgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAvKiogZmluaXNoaW5nIHRpbWUsIHVzZWQgdG8gY2FsY3VsYXRlIFwiU3Ryb25nbHkgY29ubmVjdGVkIGNvbXBvbmVudHNcIiBhbmQgXCJUb3BvbG9naWNhbCBzb3J0XCIgKi9cbiAgZjogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAvKiogcGFyZW50IHZlcnRpY2VzICovXG4gIHA/OiBWZXJ0ZXg8VD5bXTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgZGF0YTogVCwgcHVibGljIGNvbG9yID0gQ29sb3Iud2hpdGUpIHtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGF0aFRvPFQ+KHY6IFZlcnRleDxUPiwgdGVtcCA9IFtdIGFzIFZlcnRleDxUPltdKSB7XG4gIGlmICh2LnApIHtcbiAgICBnZXRQYXRoVG8odi5wWzBdLCB0ZW1wKTtcbiAgfVxuICB0ZW1wLnB1c2godik7XG59XG5cbmFic3RyYWN0IGNsYXNzIEJhc2VHcmFwaDxUPiB7XG4gIHByb3RlY3RlZCB2ZXJ0ZXhNYXAgPSBuZXcgTWFwPFQsIFZlcnRleDxUPj4oKTtcblxuICB2aXNpdChnOiBJdGVyYWJsZTxUPikge1xuICAgIGZvciAoY29uc3QgZGF0YSBvZiBnKSB7XG4gICAgICBjb25zdCB1ID0gdGhpcy52ZXJ0ZXhPZihkYXRhKTtcbiAgICAgIGlmICh1LmNvbG9yID09PSBDb2xvci53aGl0ZSkge1xuICAgICAgICB0aGlzLnZpc2l0VmVydGV4KHUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBhYnN0cmFjdCB2aXNpdFZlcnRleCh1OiBWZXJ0ZXg8VD4pOiB2b2lkO1xuXG4gIHByb3RlY3RlZCB2ZXJ0ZXhPZihkYXRhOiBUKSB7XG4gICAgaWYgKHRoaXMudmVydGV4TWFwLmhhcyhkYXRhKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmVydGV4TWFwLmdldChkYXRhKSE7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHYgPSBuZXcgVmVydGV4KGRhdGEpO1xuICAgICAgdGhpcy52ZXJ0ZXhNYXAuc2V0KGRhdGEsIHYpO1xuICAgICAgcmV0dXJuIHY7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBERlM8VD4gZXh0ZW5kcyBCYXNlR3JhcGg8VD4ge1xuICBiYWNrRWRnZXM6IFtWZXJ0ZXg8VD4sIFZlcnRleDxUPl1bXSA9IFtdO1xuXG4gIHByaXZhdGUgdGltZSA9IDA7XG4gIHByaXZhdGUgbGV2ZWwgPSAtMTtcbiAgLy8gcHJpdmF0ZSB2ZXJ0ZXhNYXAgPSBuZXcgTWFwPFQsIFZlcnRleDxUPj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGFkamFjZW5jeU9mOiAodTogVCwgdmVydGV4OiBWZXJ0ZXg8VD4sIGxldmVsOiBudW1iZXIpID0+IEl0ZXJhYmxlPFQ+LCBwcml2YXRlIG9uRmluaXNoPzogKHZlcnRleDogVmVydGV4PFQ+KSA9PiBhbnkpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgdmlzaXQoZzogSXRlcmFibGU8VD4pIHtcbiAgICB0aGlzLnRpbWUgPSAwO1xuICAgIHN1cGVyLnZpc2l0KGcpO1xuICB9XG5cbiAgcHJpbnRDeWNsaWNCYWNrRWRnZShlZGdlOiBWZXJ0ZXg8VD4sIGVkZ2VUbzogVmVydGV4PFQ+KTogc3RyaW5nW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5fcHJpbnRQYXJlbnRVbnRpbChlZGdlLCBlZGdlVG8pLCBlZGdlVG8uZGF0YSArICcnXTtcbiAgfVxuXG4gIF9wcmludFBhcmVudFVudGlsKGVkZ2U6IFZlcnRleDxUPiwgZWRnZUFuY2VzdG9yOiBWZXJ0ZXg8VD4pOiBzdHJpbmdbXSB7XG4gICAgaWYgKGVkZ2UgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBpZiAoZWRnZSA9PT0gZWRnZUFuY2VzdG9yKSB7XG4gICAgICByZXR1cm4gW2VkZ2VBbmNlc3Rvci5kYXRhICsgJyddO1xuICAgIH1cbiAgICBpZiAoZWRnZS5wKVxuICAgICAgcmV0dXJuIFsuLi50aGlzLl9wcmludFBhcmVudFVudGlsKGVkZ2UucFswXSwgZWRnZUFuY2VzdG9yKSwgZWRnZS5kYXRhICsgJyddO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBbJz8gLT4gJywgZWRnZS5kYXRhICsgJyddO1xuICB9XG5cbiAgcHJvdGVjdGVkIHZpc2l0VmVydGV4KHU6IFZlcnRleDxUPikge1xuICAgIHUuZCA9ICsrdGhpcy50aW1lO1xuICAgIHUuY29sb3IgPSBDb2xvci5ncmF5O1xuICAgIHRoaXMubGV2ZWwrKztcbiAgICBmb3IgKGNvbnN0IHZEYXRhIG9mIHRoaXMuYWRqYWNlbmN5T2YodS5kYXRhLCB1LCB0aGlzLmxldmVsKSkge1xuICAgICAgY29uc3QgdiA9IHRoaXMudmVydGV4T2YodkRhdGEpO1xuICAgICAgaWYgKHYuY29sb3IgPT09IENvbG9yLndoaXRlKSB7XG4gICAgICAgIHYucCA9IFt1XTtcbiAgICAgICAgdGhpcy52aXNpdFZlcnRleCh2KTtcbiAgICAgIH0gZWxzZSBpZiAodi5jb2xvciA9PT0gQ29sb3IuZ3JheSkge1xuICAgICAgICB0aGlzLmJhY2tFZGdlcy5wdXNoKFt1LCB2XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodi5wID09IG51bGwpXG4gICAgICAgICAgdi5wID0gW107XG4gICAgICAgIHYucC5wdXNoKHUpO1xuICAgICAgfVxuICAgIH1cbiAgICB1LmNvbG9yID0gQ29sb3IuYmxhY2s7XG4gICAgdS5mID0gKyt0aGlzLnRpbWU7XG4gICAgdGhpcy5sZXZlbC0tO1xuICAgIGlmICh0aGlzLm9uRmluaXNoKVxuICAgICAgdGhpcy5vbkZpbmlzaCh1KTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQkZTPFQ+IGV4dGVuZHMgQmFzZUdyYXBoPFQ+IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBhZGphY2VuY3lPZjogKHU6IFQsIHZlcnRleDogVmVydGV4PFQ+KSA9PiBJdGVyYWJsZTxUPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgdmlzaXRWZXJ0ZXgoczogVmVydGV4PFQ+KSB7XG4gICAgcy5jb2xvciA9IENvbG9yLmdyYXk7XG4gICAgcy5kID0gMDtcbiAgICBjb25zdCBxOiBWZXJ0ZXg8VD5bXSA9IFtzXTtcbiAgICB3aGlsZSAocS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCB1ID0gcS5zaGlmdCgpITtcbiAgICAgIGZvciAoY29uc3QgdkRhdGEgb2YgdGhpcy5hZGphY2VuY3lPZih1LmRhdGEsIHUpKSB7XG4gICAgICAgIGNvbnN0IHYgPSB0aGlzLnZlcnRleE9mKHZEYXRhKTtcbiAgICAgICAgaWYgKHYuY29sb3IgPT09IENvbG9yLndoaXRlKSB7XG4gICAgICAgICAgdi5jb2xvciA9IENvbG9yLmdyYXk7XG4gICAgICAgICAgdi5kID0gdS5kICsgMTtcbiAgICAgICAgICBpZiAodi5wID09IG51bGwpXG4gICAgICAgICAgICB2LnAgPSBbXTtcbiAgICAgICAgICB2LnAucHVzaCh1KTtcbiAgICAgICAgICBxLnB1c2godik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHUuY29sb3IgPSBDb2xvci5ibGFjaztcbiAgICB9XG4gIH1cbn1cbiJdfQ==